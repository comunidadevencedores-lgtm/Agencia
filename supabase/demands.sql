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
