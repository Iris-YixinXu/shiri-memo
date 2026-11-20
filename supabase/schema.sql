create table if not exists public.shiri_notebooks (
  owner_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  state jsonb not null check (
    jsonb_typeof(state) = 'object'
    and coalesce(jsonb_typeof(state->'records') = 'array', false)
    and coalesce(jsonb_typeof(state->'focus') = 'object', false)
    and coalesce(jsonb_typeof(state->'limit') = 'number', false)
  ),
  version bigint not null default 1 check (version > 0)
);

alter table public.shiri_notebooks enable row level security;
revoke all on public.shiri_notebooks from anon, authenticated;
grant select, insert, update on public.shiri_notebooks to authenticated;

drop policy if exists "Read own notebook" on public.shiri_notebooks;
create policy "Read own notebook" on public.shiri_notebooks for select to authenticated
  using ((select auth.uid()) = owner_id);
drop policy if exists "Create own notebook" on public.shiri_notebooks;
create policy "Create own notebook" on public.shiri_notebooks for insert to authenticated
  with check ((select auth.uid()) = owner_id);
drop policy if exists "Update own notebook" on public.shiri_notebooks;
create policy "Update own notebook" on public.shiri_notebooks for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shiri-private-photos', 'shiri-private-photos', false, 10485760, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Read own Shiri photos" on storage.objects;
create policy "Read own Shiri photos" on storage.objects for select to authenticated
  using (bucket_id = 'shiri-private-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Upload own Shiri photos" on storage.objects;
create policy "Upload own Shiri photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'shiri-private-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Delete own Shiri photos" on storage.objects;
create policy "Delete own Shiri photos" on storage.objects for delete to authenticated
  using (bucket_id = 'shiri-private-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
