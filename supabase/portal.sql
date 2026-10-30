-- ============================================================
-- DELIVER — Portal público do cliente
-- Rode este arquivo no SQL Editor do Supabase (uma vez).
--
-- Cobre 3 coisas que faltavam:
--   1. leitura anônima do portal (link enviado por WhatsApp)
--   2. bucket de logos usado em Clientes / Configurações
--   3. ações do cliente: pedir alteração e aprovar vídeo
-- ============================================================

-- ------------------------------------------------------------
-- 1) LEITURA PÚBLICA (apenas SELECT, nada de escrita direta)
-- ------------------------------------------------------------
drop policy if exists "portal_agencies_read" on agencies;
create policy "portal_agencies_read" on agencies for select to anon using (true);

drop policy if exists "portal_clients_read" on clients;
create policy "portal_clients_read" on clients for select to anon using (true);

drop policy if exists "portal_projects_read" on projects;
create policy "portal_projects_read" on projects for select to anon using (true);

drop policy if exists "portal_videos_read" on videos;
create policy "portal_videos_read" on videos for select to anon using (true);

drop policy if exists "portal_revisions_read" on revisions;
create policy "portal_revisions_read" on revisions for select to anon using (true);

-- ------------------------------------------------------------
-- 2) BUCKET DE LOGOS (usado em /agency/clients e /agency/settings)
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
-- 3) AÇÕES DO CLIENTE (validadas por slug, sem expor escrita)
-- ------------------------------------------------------------

-- Cliente pede alteração em um vídeo
create or replace function create_revision(
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
create or replace function approve_video(
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

grant execute on function create_revision(text, text, uuid, text) to anon, authenticated;
grant execute on function approve_video(text, text, uuid) to anon, authenticated;
