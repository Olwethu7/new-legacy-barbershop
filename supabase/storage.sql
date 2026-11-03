-- New Legacy Barbershop - Storage setup for product & gallery images
-- Run in the Supabase SQL Editor. Safe to re-run.

-- Public bucket: anyone can view images, max 5 MB, images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Only signed-in admins can upload, replace or delete files in it.
drop policy if exists "Admin upload media" on storage.objects;
drop policy if exists "Admin update media" on storage.objects;
drop policy if exists "Admin delete media" on storage.objects;

create policy "Admin upload media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media');

create policy "Admin update media" on storage.objects
  for update to authenticated
  using (bucket_id = 'media')
  with check (bucket_id = 'media');

create policy "Admin delete media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media');
