-- ============================================================
-- DELIVER — Schema Supabase
-- ============================================================

-- AGENCIES (quem usa o sistema — as agências)
create table agencies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null unique,
  slug        text not null unique,         -- ex: agencia-flip
  logo_url    text,
  created_at  timestamptz default now()
);

-- CLIENTS (clientes de cada agência)
create table clients (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid references agencies(id) on delete cascade,
  name        text not null,
  slug        text not null,               -- ex: republica-da-barba
  phone       text,                        -- whatsapp para notificação
  email       text,
  created_at  timestamptz default now(),
  unique(agency_id, slug)
);

-- PROJECTS (cada campanha / entrega)
create table projects (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references clients(id) on delete cascade,
  title       text not null,               -- ex: Campanha Maio — Reels
  status      text default 'active',       -- active | closed
  created_at  timestamptz default now()
);

-- VIDEOS (cada vídeo dentro de um projeto)
create table videos (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references projects(id) on delete cascade,
  title         text not null,             -- ex: Reel 01 — Promoção
  youtube_url   text,                      -- link não listado
  drive_url     text,                      -- link do Drive 4K
  duration      text,                      -- ex: 00:28
  orientation   text default 'vertical',   -- vertical | horizontal
  status        text default 'pending',    -- pending | approved
  created_at    timestamptz default now()
);

-- REVISIONS (pedidos de alteração do cliente)
create table revisions (
  id          uuid primary key default gen_random_uuid(),
  video_id    uuid references videos(id) on delete cascade,
  client_id   uuid references clients(id) on delete cascade,
  description text not null,
  status      text default 'open',         -- open | in_progress | done
  created_at  timestamptz default now()
);

-- ============================================================
-- RLS — cada agência só vê os próprios dados
-- ============================================================

alter table agencies  enable row level security;
alter table clients   enable row level security;
alter table projects  enable row level security;
alter table videos    enable row level security;
alter table revisions enable row level security;

-- agencies: só o próprio registro
create policy "agency_own" on agencies
  for all using (id = auth.uid()::uuid);

-- clients: só da agência logada
create policy "clients_agency" on clients
  for all using (
    agency_id = auth.uid()::uuid
  );

-- projects: via client da agência
create policy "projects_agency" on projects
  for all using (
    client_id in (
      select id from clients where agency_id = auth.uid()::uuid
    )
  );

-- videos: via project > client > agência
create policy "videos_agency" on videos
  for all using (
    project_id in (
      select p.id from projects p
      join clients c on c.id = p.client_id
      where c.agency_id = auth.uid()::uuid
    )
  );

-- revisions: via video > project > client > agência
create policy "revisions_agency" on revisions
  for all using (
    video_id in (
      select v.id from videos v
      join projects p on p.id = v.project_id
      join clients c on c.id = p.client_id
      where c.agency_id = auth.uid()::uuid
    )
  );

-- ============================================================
-- ACESSO PÚBLICO — tela do cliente via slug (sem login)
-- ============================================================

-- Cliente acessa pelo link: /c/[agency-slug]/[client-slug]
-- Lê projeto, vídeos e pode criar revision
-- Usamos uma função pública para isso

create or replace function get_client_portal(
  p_agency_slug text,
  p_client_slug text
)
returns json
language plpgsql security definer
as $$
declare
  v_client clients;
  v_result json;
begin
  select * into v_client
  from clients c
  join agencies a on a.id = c.agency_id
  where a.slug = p_agency_slug and c.slug = p_client_slug
  limit 1;

  if not found then
    return json_build_object('error', 'not_found');
  end if;

  select json_build_object(
    'client', row_to_json(v_client),
    'projects', (
      select json_agg(
        json_build_object(
          'id', p.id,
          'title', p.title,
          'status', p.status,
          'videos', (
            select json_agg(row_to_json(v))
            from videos v where v.project_id = p.id
          )
        )
      )
      from projects p where p.client_id = v_client.id
    ),
    'revisions', (
      select json_agg(row_to_json(r))
      from revisions r where r.client_id = v_client.id
    )
  ) into v_result;

  return v_result;
end;
$$;
-- ============================================================
-- DELIVER — Equipe / controle de acesso (Dono • Editor • Visualização)
-- Rode este arquivo no SQL Editor do Supabase.
-- ============================================================

-- Membros adicionais de cada agência (além do dono).
create table if not exists agency_members (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid references agencies(id) on delete cascade,
  user_id     uuid not null unique,          -- id da conta auth do membro
  name        text,
  email       text,
  role        text not null default 'editor' check (role in ('owner','editor','viewer')),
  created_at  timestamptz default now()
);

-- ------------------------------------------------------------
-- Função: qual agência o usuário atual acessa?
-- (membro -> agência vinculada; senão -> a própria agência do dono)
-- security definer evita recursão de RLS ao consultar agency_members.
-- ------------------------------------------------------------
create or replace function agency_of(uid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select agency_id from agency_members where user_id = uid limit 1),
    (select id from agencies where id = uid limit 1)
  );
$$;

create or replace function is_agency_owner(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from agencies where id = uid); $$;

-- ------------------------------------------------------------
-- RLS de agency_members
-- ------------------------------------------------------------
alter table agency_members enable row level security;

drop policy if exists "members_read" on agency_members;
create policy "members_read" on agency_members for select
  using (agency_id = agency_of(auth.uid()));

drop policy if exists "members_owner_write" on agency_members;
create policy "members_owner_write" on agency_members for all
  using (agency_id = auth.uid())          -- só o dono (uid == agencies.id)
  with check (agency_id = auth.uid());

-- ------------------------------------------------------------
-- Recria as policies das tabelas de dados para que MEMBROS
-- (editor/visualização) também enxerguem os dados da agência.
-- ------------------------------------------------------------

-- agencies: dono e membros leem o registro da agência
drop policy if exists "agency_own" on agencies;
create policy "agency_own" on agencies for all
  using (id = agency_of(auth.uid()))
  with check (id = auth.uid());           -- só o dono altera os dados da agência

-- clients
drop policy if exists "clients_agency" on clients;
create policy "clients_agency" on clients for all
  using (agency_id = agency_of(auth.uid()))
  with check (agency_id = agency_of(auth.uid()));

-- projects
drop policy if exists "projects_agency" on projects;
create policy "projects_agency" on projects for all
  using (client_id in (select id from clients where agency_id = agency_of(auth.uid())))
  with check (client_id in (select id from clients where agency_id = agency_of(auth.uid())));

-- videos
drop policy if exists "videos_agency" on videos;
create policy "videos_agency" on videos for all
  using (project_id in (
    select p.id from projects p join clients c on c.id = p.client_id
    where c.agency_id = agency_of(auth.uid())))
  with check (project_id in (
    select p.id from projects p join clients c on c.id = p.client_id
    where c.agency_id = agency_of(auth.uid())));

-- revisions
drop policy if exists "revisions_agency" on revisions;
create policy "revisions_agency" on revisions for all
  using (client_id in (select id from clients where agency_id = agency_of(auth.uid())))
  with check (client_id in (select id from clients where agency_id = agency_of(auth.uid())));

-- demands (ativa RLS e restringe à agência)
alter table demands enable row level security;
drop policy if exists "demands_agency" on demands;
create policy "demands_agency" on demands for all
  using (agency_id = agency_of(auth.uid()))
  with check (agency_id = agency_of(auth.uid()));
-- Tabela de demandas mensais
create table if not exists demands (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid references agencies(id) on delete cascade,
  client_id   uuid references clients(id) on delete cascade,
  title       text not null,
  total       int not null default 0,
  deadline    date,
  created_at  timestamptz default now()
);

-- Campo de aprovação do cliente nos vídeos (se não existir)
alter table videos add column if not exists approved_by_client boolean default false;
alter table videos add column if not exists approved_at timestamptz;

-- Tabela de admins (gerenciável pelo painel)
create table if not exists admin_users (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  name       text,
  created_at timestamptz default now()
);

insert into admin_users (email, name) values
  ('vhbdavic@gmail.com', 'Victor — FLIP'),
  ('victor.hugo8481@gmail.com', 'Victor Hugo')
on conflict (email) do nothing;

-- Agência Medias MTH
insert into agencies (id, name, email, slug, plan, status)
values (
  'b408c58d-6465-47ab-9e38-56d8bf99f4b5',
  'Medias MTH',
  'victor.hugo8481@gmail.com',
  'medias-mth',
  'pro',
  'active'
) on conflict (id) do update set name = 'Medias MTH', slug = 'medias-mth';
-- ============================================================
-- 1. ADICIONAR CAMPOS NOVOS NAS TABELAS EXISTENTES
-- ============================================================

alter table agencies add column if not exists plan text default 'trial';
alter table agencies add column if not exists status text default 'active';

-- ============================================================
-- 2. TABELA DE LOGS DO ADMIN
-- ============================================================

create table if not exists admin_logs (
  id          uuid primary key default gen_random_uuid(),
  type        text not null, -- login | add | block | system
  message     text not null,
  agency_id   uuid references agencies(id) on delete set null,
  agency_name text,
  created_at  timestamptz default now()
);

-- ============================================================
-- 3. DADOS FICTÍCIOS PARA TESTE
-- ============================================================

-- Agência 1 já existe (Agência Flip) — atualiza o plano
update agencies set plan = 'pro', status = 'active' where slug = 'agencia-flip';

-- Insere clientes fictícios para a Agência Flip
do $$
declare
  v_agency_id uuid;
  v_client_id uuid;
  v_project_id uuid;
begin
  select id into v_agency_id from agencies where slug = 'agencia-flip';

  -- Cliente 1
  insert into clients (agency_id, name, slug, phone, email)
  values (v_agency_id, 'Buzzi Odontologia', 'buzzi-odontologia', '41999001001', 'buzzi@odonto.com')
  on conflict (agency_id, slug) do nothing
  returning id into v_client_id;

  if v_client_id is not null then
    insert into projects (client_id, title, status) values (v_client_id, 'Campanha Maio — Reels', 'active') returning id into v_project_id;
    insert into videos (project_id, title, youtube_url, drive_url, duration, orientation, status)
    values
      (v_project_id, 'Reel 01 — Sorriso Perfeito', 'https://youtube.com/watch?v=exemplo1', 'https://drive.google.com/file/d/exemplo1/view', '00:28', 'vertical', 'approved'),
      (v_project_id, 'Reel 02 — Depoimento Paciente', 'https://youtube.com/watch?v=exemplo2', 'https://drive.google.com/file/d/exemplo2/view', '00:45', 'vertical', 'pending'),
      (v_project_id, 'Reel 03 — Clareamento Dental', 'https://youtube.com/watch?v=exemplo3', 'https://drive.google.com/file/d/exemplo3/view', '00:32', 'vertical', 'pending');
    insert into revisions (video_id, client_id, description, status)
    select v.id, v_client_id, 'Aumentar a fonte do texto no início', 'open'
    from videos v where v.project_id = v_project_id limit 1;
  end if;

  -- Cliente 2
  select id into v_client_id from clients where agency_id = v_agency_id and slug = 'buzzi-odontologia';

  insert into clients (agency_id, name, slug, phone, email)
  values (v_agency_id, 'Old School Barbearia', 'old-school-barbearia', '41999002002', 'contato@oldschool.com')
  on conflict (agency_id, slug) do nothing
  returning id into v_client_id;

  if v_client_id is not null then
    insert into projects (client_id, title, status) values (v_client_id, 'Campanha Junho — Stories', 'active') returning id into v_project_id;
    insert into videos (project_id, title, youtube_url, drive_url, duration, orientation, status)
    values
      (v_project_id, 'Story 01 — Promoção Barba', 'https://youtube.com/watch?v=exemplo4', 'https://drive.google.com/file/d/exemplo4/view', '00:15', 'vertical', 'approved'),
      (v_project_id, 'Story 02 — Ambiente da Barbearia', 'https://youtube.com/watch?v=exemplo5', 'https://drive.google.com/file/d/exemplo5/view', '00:15', 'vertical', 'approved');
  end if;

  -- Cliente 3
  insert into clients (agency_id, name, slug, phone, email)
  values (v_agency_id, 'DD Radiadores', 'dd-radiadores', '41999003003', 'dd@radiadores.com')
  on conflict (agency_id, slug) do nothing
  returning id into v_client_id;

  if v_client_id is not null then
    insert into projects (client_id, title, status) values (v_client_id, 'Institucional — Apresentação', 'active') returning id into v_project_id;
    insert into videos (project_id, title, youtube_url, drive_url, duration, orientation, status)
    values
      (v_project_id, 'Vídeo Institucional DD', 'https://youtube.com/watch?v=exemplo6', 'https://drive.google.com/file/d/exemplo6/view', '01:30', 'horizontal', 'pending');
    insert into revisions (video_id, client_id, description, status)
    select v.id, v_client_id, 'Mudar a música de fundo para algo mais agitado', 'open'
    from videos v where v.project_id = v_project_id limit 1;
  end if;

  -- Cliente 4
  insert into clients (agency_id, name, slug, phone, email)
  values (v_agency_id, 'República da Barba', 'republica-da-barba', '41999004004', 'contato@republicadabarba.com')
  on conflict (agency_id, slug) do nothing
  returning id into v_client_id;

  if v_client_id is not null then
    insert into projects (client_id, title, status) values (v_client_id, 'Campanha Julho — Reels', 'active') returning id into v_project_id;
    insert into videos (project_id, title, youtube_url, drive_url, duration, orientation, status)
    values
      (v_project_id, 'Reel 01 — Corte Degradê', 'https://youtube.com/watch?v=exemplo7', 'https://drive.google.com/file/d/exemplo7/view', '00:30', 'vertical', 'pending'),
      (v_project_id, 'Reel 02 — Barba Modelada', 'https://youtube.com/watch?v=exemplo8', 'https://drive.google.com/file/d/exemplo8/view', '00:25', 'vertical', 'pending'),
      (v_project_id, 'Reel 03 — Antes e Depois', 'https://youtube.com/watch?v=exemplo9', 'https://drive.google.com/file/d/exemplo9/view', '00:20', 'vertical', 'pending');
  end if;

end $$;

-- ============================================================
-- 4. LOGS FICTÍCIOS
-- ============================================================

insert into admin_logs (type, message, agency_name) values
  ('login', 'Agência Flip realizou login', 'Agência Flip'),
  ('add', 'Agência Flip criou cliente: República da Barba', 'Agência Flip'),
  ('add', 'Agência Flip adicionou 3 vídeos para República da Barba', 'Agência Flip'),
  ('add', 'Agência Flip criou cliente: DD Radiadores', 'Agência Flip'),
  ('system', 'Plataforma iniciada com sucesso', 'Sistema'),
  ('login', 'Agência Flip realizou login', 'Agência Flip');
