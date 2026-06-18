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
