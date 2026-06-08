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
