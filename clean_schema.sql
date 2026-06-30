-- 1. Tabelas Base
create table agencies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null unique,
  slug        text not null unique,
  logo_url    text,
  plan        text default 'trial',
  status      text default 'active',
  created_at  timestamptz default now()
);

create table clients (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid references agencies(id) on delete cascade,
  name        text not null,
  slug        text not null,
  phone       text,
  email       text,
  created_at  timestamptz default now(),
  unique(agency_id, slug)
);

create table projects (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references clients(id) on delete cascade,
  title       text not null,
  status      text default 'active',
  created_at  timestamptz default now()
);

create table videos (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references projects(id) on delete cascade,
  title         text not null,
  youtube_url   text,
  drive_url     text,
  duration      text,
  orientation   text default 'vertical',
  status        text default 'pending',
  approved_by_client boolean default false,
  approved_at   timestamptz,
  created_at    timestamptz default now()
);

create table revisions (
  id          uuid primary key default gen_random_uuid(),
  video_id    uuid references videos(id) on delete cascade,
  client_id   uuid references clients(id) on delete cascade,
  description text not null,
  status      text default 'open',
  created_at  timestamptz default now()
);

create table agency_members (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid references agencies(id) on delete cascade,
  user_id     uuid not null unique,
  name        text,
  email       text,
  role        text not null default 'editor' check (role in ('owner','editor','viewer')),
  created_at  timestamptz default now()
);

create table demands (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid references agencies(id) on delete cascade,
  client_id   uuid references clients(id) on delete cascade,
  title       text not null,
  total       int not null default 0,
  deadline    date,
  created_at  timestamptz default now()
);

create table admin_users (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  name       text,
  created_at timestamptz default now()
);

create table admin_logs (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,
  message     text not null,
  agency_id   uuid references agencies(id) on delete set null,
  agency_name text,
  created_at  timestamptz default now()
);

-- 2. Funções Auxiliares
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

-- 3. RLS
alter table agencies  enable row level security;
alter table clients   enable row level security;
alter table projects  enable row level security;
alter table videos    enable row level security;
alter table revisions enable row level security;
alter table agency_members enable row level security;
alter table demands enable row level security;

-- Public Access (Anon) for Portal
create policy "portal_agencies_read" on agencies for select to anon using (true);
create policy "portal_clients_read" on clients for select to anon using (true);
create policy "portal_projects_read" on projects for select to anon using (true);
create policy "portal_videos_read" on videos for select to anon using (true);
create policy "portal_revisions_read" on revisions for select to anon using (true);

-- Agency/Admin Policies
create policy "agency_own" on agencies for all to authenticated
  using (id = agency_of(auth.uid()))
  with check (id = auth.uid());

create policy "clients_agency" on clients for all to authenticated
  using (agency_id = agency_of(auth.uid()))
  with check (agency_id = agency_of(auth.uid()));

create policy "projects_agency" on projects for all to authenticated
  using (client_id in (select id from clients where agency_id = agency_of(auth.uid())))
  with check (client_id in (select id from clients where agency_id = agency_of(auth.uid())));

create policy "videos_agency" on videos for all to authenticated
  using (project_id in (
    select p.id from projects p join clients c on c.id = p.client_id
    where c.agency_id = agency_of(auth.uid())))
  with check (project_id in (
    select p.id from projects p join clients c on c.id = p.client_id
    where c.agency_id = agency_of(auth.uid())));

create policy "revisions_agency" on revisions for all to authenticated
  using (client_id in (select id from clients where agency_id = agency_of(auth.uid())))
  with check (client_id in (select id from clients where agency_id = agency_of(auth.uid())));

create policy "members_read" on agency_members for select to authenticated
  using (agency_id = agency_of(auth.uid()));

create policy "members_owner_write" on agency_members for all to authenticated
  using (agency_id = auth.uid())
  with check (agency_id = auth.uid());

create policy "demands_agency" on demands for all to authenticated
  using (agency_id = agency_of(auth.uid()))
  with check (agency_id = agency_of(auth.uid()));

-- 4. Seed Data
insert into admin_users (email, name) values
  ('vhbdavic@gmail.com', 'Victor — FLIP'),
  ('victor.hugo8481@gmail.com', 'Victor Hugo')
on conflict (email) do nothing;

insert into agencies (id, name, email, slug, plan, status)
values (
  'b408c58d-6465-47ab-9e38-56d8bf99f4b5',
  'Medias MTH',
  'victor.hugo8481@gmail.com',
  'medias-mth',
  'pro',
  'active'
) on conflict (id) do update set name = 'Medias MTH', slug = 'medias-mth';
