
create policy "Members upload to own folder" on storage.objects for insert to authenticated
with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Members read own uploads" on storage.objects for select to authenticated
using (bucket_id = 'uploads' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(),'admin')));
create policy "Members delete own uploads" on storage.objects for delete to authenticated
using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
