-- ============================================================================
-- Fynko — Migration 0003: regras de segurança do Storage (anexos + avatar)
-- ----------------------------------------------------------------------------
-- Os buckets 'avatars' (público) e 'attachments' (privado) já existem. Estas
-- políticas garantem que cada usuário só envie/leia/apague arquivos DENTRO da
-- sua própria pasta (o nome do arquivo começa com o id do usuário).
--
-- Como aplicar: cole no SQL Editor do Supabase e Run. Seguro rodar uma vez.
-- ============================================================================

-- avatars: leitura pública (o bucket é público); escrita só na própria pasta.
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_update_own" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_delete_own" on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- attachments: privado — todas as operações restritas à própria pasta.
create policy "attachments_own" on storage.objects
  for all
  using (
    bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Fim da migration 0003.
