-- ============================================================
-- DELIVER — Setup completo e idempotente
-- Rode este arquivo no SQL Editor do Supabase.
-- Pode rodar quantas vezes quiser: não duplica dados nem policies.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- TABELAS
-- ------------------------------------------------------------

create table if not exists public.agencies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null unique,
  slug        text not null unique,
  logo_url    text,
  plan        text default 'trial',
  status      text default 'active',
  created_at  timestamptz default now()
);

create table if not exists public.clients (
  id              uuid primary key default gen_random_uuid(),
  agency_id       uuid references public.agencies(id) on delete cascade,
  name            text not null,
  slug            text not null,
  phone           text,
  email           text,
  monthly_revenue numeric,
  logo_url        text,
  created_at      timestamptz default now(),
  unique (agency_id, slug)
);

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references public.clients(id) on delete cascade,
  title       text not null,
  status      text default 'active',
  created_at  timestamptz default now()
);

create table if not exists public.videos (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid references public.projects(id) on delete cascade,
  title              text not null,
  youtube_url        text,
  drive_url          text,
  duration           text,
  orientation        text default 'vertical',
  status             text default 'pending',
  approved_by_client boolean default false,
  approved_at        timestamptz,
  created_at         timestamptz default now()
);

create table if not exists public.revisions (
  id          uuid primary key default gen_random_uuid(),
  video_id    uuid references public.videos(id) on delete cascade,
  client_id   uuid references public.clients(id) on delete cascade,
  description text not null,
  status      text default 'open',
  created_at  timestamptz default now()
);

create table if not exists public.demands (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid references public.agencies(id) on delete cascade,
  client_id   uuid references public.clients(id) on delete cascade,
  title       text not null,
  total       int not null default 0,
  deadline    date,
  created_at  timestamptz default now()
);

create table if not exists public.agency_members (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid references public.agencies(id) on delete cascade,
  user_id     uuid not null unique,
  name        text,
  email       text,
  role        text not null default 'editor' check (role in ('owner','editor','viewer')),
  created_at  timestamptz default now()
);

create table if not exists public.admin_users (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  name        text,
  created_at  timestamptz default now()
);

create table if not exists public.admin_logs (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,
  message     text not null,
  agency_id   uuid references public.agencies(id) on delete set null,
  agency_name text,
  created_at  timestamptz default now()
);

-- ------------------------------------------------------------
-- COLUNAS ADICIONADAS DEPOIS (bases antigas)
-- ------------------------------------------------------------
alter table public.agencies add column if not exists plan   text default 'trial';
alter table public.agencies add column if not exists status text default 'active';

alter table public.clients  add column if not exists monthly_revenue numeric;
alter table public.clients  add column if not exists logo_url text;

alter table public.videos   add column if not exists approved_by_client boolean default false;
alter table public.videos   add column if not exists approved_at timestamptz;

-- ------------------------------------------------------------
-- ÍNDICES
-- ------------------------------------------------------------
create index if not exists clients_agency_idx        on public.clients (agency_id);
create index if not exists projects_client_idx       on public.projects (client_id);
create index if not exists videos_project_idx        on public.videos (project_id);
create index if not exists revisions_client_idx      on public.revisions (client_id);
create index if not exists revisions_video_idx       on public.revisions (video_id);
create index if not exists demands_agency_idx        on public.demands (agency_id);
create index if not exists members_agency_idx        on public.agency_members (agency_id);

-- ------------------------------------------------------------
-- FUNÇÕES
-- ------------------------------------------------------------

-- Qual agência o usuário acessa? (membro -> vínculo; senão -> própria agência)
create or replace function public.agency_of(uid uuid)
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

create or replace function public.is_agency_owner(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from agencies where id = uid);
$$;

-- Portal público: única porta de leitura do anon.
-- Devolve SOMENTE colunas seguras (sem e-mail, telefone ou faturamento).
create or replace function public.get_client_portal(
  p_agency_slug text,
  p_client_slug text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client clients;
  v_result json;
begin
  select c.* into v_client
  from clients c
  join agencies a on a.id = c.agency_id
  where a.slug = p_agency_slug and c.slug = p_client_slug
  limit 1;

  if not found then
    return json_build_object('error', 'not_found');
  end if;

  select json_build_object(
    'agency', (
      select json_build_object(
        'id', a.id,
        'name', a.name,
        'slug', a.slug,
        'logo_url', a.logo_url
      )
      from agencies a where a.id = v_client.agency_id
    ),
    'client', json_build_object(
      'id', v_client.id,
      'agency_id', v_client.agency_id,
      'name', v_client.name,
      'slug', v_client.slug,
      'logo_url', v_client.logo_url
    ),
    'projects', coalesce((
      select json_agg(json_build_object(
        'id', p.id,
        'title', p.title,
        'status', p.status,
        'videos', coalesce((
          select json_agg(json_build_object(
            'id', v.id,
            'title', v.title,
            'youtube_url', v.youtube_url,
            'drive_url', v.drive_url,
            'duration', v.duration,
            'orientation', v.orientation,
            'status', v.status,
            'approved_by_client', v.approved_by_client,
            'approved_at', v.approved_at,
            'created_at', v.created_at
          ) order by v.created_at)
          from videos v where v.project_id = p.id
        ), '[]'::json)
      ) order by p.created_at)
      from projects p where p.client_id = v_client.id
    ), '[]'::json),
    'revisions', coalesce((
      select json_agg(json_build_object(
        'id', r.id,
        'video_id', r.video_id,
        'description', r.description,
        'status', r.status,
        'created_at', r.created_at
      ) order by r.created_at desc)
      from revisions r where r.client_id = v_client.id
    ), '[]'::json)
  ) into v_result;

  return v_result;
end;
$$;

-- Cliente pede alteração em um vídeo
create or replace function public.create_revision(
  p_agency_slug text,
  p_client_slug text,
  p_video_id    uuid,
  p_description text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
  v_description text := btrim(coalesce(p_description, ''));
begin
  if length(v_description) < 5 then
    return json_build_object('ok', false, 'error', 'description_too_short');
  end if;

  select c.id into v_client_id
  from clients c
  join agencies a on a.id = c.agency_id
  join projects p on p.client_id = c.id
  join videos   v on v.project_id = p.id
  where a.slug = p_agency_slug
    and c.slug = p_client_slug
    and v.id   = p_video_id
  limit 1;

  if v_client_id is null then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  insert into revisions (video_id, client_id, description, status)
  values (p_video_id, v_client_id, v_description, 'open');

  return json_build_object('ok', true);
end;
$$;

-- Cliente aprova o vídeo entregue
create or replace function public.approve_video(
  p_agency_slug text,
  p_client_slug text,
  p_video_id    uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_found boolean;
begin
  select true into v_found
  from videos v
  join projects p on p.id = v.project_id
  join clients  c on c.id = p.client_id
  join agencies a on a.id = c.agency_id
  where v.id = p_video_id
    and a.slug = p_agency_slug
    and c.slug = p_client_slug
  limit 1;

  if v_found is null then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  update videos
     set status = 'approved',
         approved_by_client = true,
         approved_at = now()
   where id = p_video_id;

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.get_client_portal(text, text)      to anon, authenticated;
grant execute on function public.create_revision(text, text, uuid, text) to anon, authenticated;
grant execute on function public.approve_video(text, text, uuid)   to anon, authenticated;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.agencies       enable row level security;
alter table public.clients        enable row level security;
alter table public.projects       enable row level security;
alter table public.videos         enable row level security;
alter table public.revisions      enable row level security;
alter table public.demands        enable row level security;
alter table public.agency_members enable row level security;
alter table public.admin_users    enable row level security;
alter table public.admin_logs     enable row level security;

-- agencies: dono e membros leem; só o dono altera
drop policy if exists "agency_own" on public.agencies;
create policy "agency_own" on public.agencies for all
  using (id = public.agency_of(auth.uid()))
  with check (id = auth.uid());

-- clients
drop policy if exists "clients_agency" on public.clients;
create policy "clients_agency" on public.clients for all
  using (agency_id = public.agency_of(auth.uid()))
  with check (agency_id = public.agency_of(auth.uid()));

-- projects
drop policy if exists "projects_agency" on public.projects;
create policy "projects_agency" on public.projects for all
  using (client_id in (select id from public.clients where agency_id = public.agency_of(auth.uid())))
  with check (client_id in (select id from public.clients where agency_id = public.agency_of(auth.uid())));

-- videos
drop policy if exists "videos_agency" on public.videos;
create policy "videos_agency" on public.videos for all
  using (project_id in (
    select p.id from public.projects p join public.clients c on c.id = p.client_id
    where c.agency_id = public.agency_of(auth.uid())))
  with check (project_id in (
    select p.id from public.projects p join public.clients c on c.id = p.client_id
    where c.agency_id = public.agency_of(auth.uid())));

-- revisions
drop policy if exists "revisions_agency" on public.revisions;
create policy "revisions_agency" on public.revisions for all
  using (client_id in (select id from public.clients where agency_id = public.agency_of(auth.uid())))
  with check (client_id in (select id from public.clients where agency_id = public.agency_of(auth.uid())));

-- demands
drop policy if exists "demands_agency" on public.demands;
create policy "demands_agency" on public.demands for all
  using (agency_id = public.agency_of(auth.uid()))
  with check (agency_id = public.agency_of(auth.uid()));

-- equipe: todos leem; só o dono escreve
drop policy if exists "members_read" on public.agency_members;
create policy "members_read" on public.agency_members for select
  using (agency_id = public.agency_of(auth.uid()));

drop policy if exists "members_owner_write" on public.agency_members;
create policy "members_owner_write" on public.agency_members for all
  using (agency_id = auth.uid())
  with check (agency_id = auth.uid());

-- ------------------------------------------------------------
-- ADMIN DO SISTEMA
-- ------------------------------------------------------------

-- Quem é admin? (comparação pelo e-mail do JWT — evita recursão de RLS)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from admin_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- admin_users: admin vê/gerencia todos; usuário comum vê só a própria linha
drop policy if exists "admin_users_read" on public.admin_users;
create policy "admin_users_read" on public.admin_users for select to authenticated
  using (public.is_admin() or lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

drop policy if exists "admin_users_write" on public.admin_users;
create policy "admin_users_write" on public.admin_users for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- admin_logs: só admin lê e escreve
drop policy if exists "admin_logs_read" on public.admin_logs;
create policy "admin_logs_read" on public.admin_logs for select to authenticated
  using (public.is_admin());

drop policy if exists "admin_logs_write" on public.admin_logs;
create policy "admin_logs_write" on public.admin_logs for insert to authenticated
  with check (public.is_admin());

-- agências: admin gerencia qualquer agência (além do dono em agency_own)
drop policy if exists "agencies_admin" on public.agencies;
create policy "agencies_admin" on public.agencies for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- equipe: admin gerencia a equipe de qualquer agência
drop policy if exists "members_admin" on public.agency_members;
create policy "members_admin" on public.agency_members for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- PORTAL PÚBLICO (anon)
-- O anon NÃO lê tabelas: todo acesso passa por get_client_portal,
-- create_revision e approve_video (security definer, validadas por slug).
-- Isso evita enumerar clientes/vídeos e vazar e-mail/telefone/faturamento.
-- ------------------------------------------------------------

drop policy if exists "portal_agencies_read" on public.agencies;
drop policy if exists "portal_clients_read"  on public.clients;
drop policy if exists "portal_projects_read" on public.projects;
drop policy if exists "portal_videos_read"   on public.videos;
drop policy if exists "portal_revisions_read" on public.revisions;

revoke all on public.agencies  from anon;
revoke all on public.clients   from anon;
revoke all on public.projects  from anon;
revoke all on public.videos    from anon;
revoke all on public.revisions from anon;

-- ------------------------------------------------------------
-- STORAGE (logos de agência e cliente)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('client-logos', 'client-logos', true)
on conflict (id) do update set public = true;

drop policy if exists "client_logos_read" on storage.objects;
create policy "client_logos_read" on storage.objects for select
  using (bucket_id = 'client-logos');

drop policy if exists "client_logos_write" on storage.objects;
create policy "client_logos_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'client-logos');

drop policy if exists "client_logos_update" on storage.objects;
create policy "client_logos_update" on storage.objects for update to authenticated
  using (bucket_id = 'client-logos');

drop policy if exists "client_logos_delete" on storage.objects;
create policy "client_logos_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'client-logos');

-- ------------------------------------------------------------
-- ADMINS INICIAIS
-- ------------------------------------------------------------
insert into public.admin_users (email, name) values
  ('vhbdavic@gmail.com', 'Victor — FLIP'),
  ('victor.hugo8481@gmail.com', 'Victor Hugo')
on conflict (email) do nothing;
