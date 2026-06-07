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
