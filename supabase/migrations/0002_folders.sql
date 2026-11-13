-- Project folders: a private way to group collections. Deleting a folder keeps its collections.
create table public.folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade default auth.uid(),
  name text not null check (char_length(name) between 1 and 80),
  color text not null default '#3048d6' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now()
);
alter table public.folders enable row level security;
create policy "own folders" on public.folders for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table public.collections add column folder_id uuid references public.folders on delete set null;

-- A collection may only be placed in one of the owner's own folders.
create or replace function public.check_collection_folder() returns trigger language plpgsql as $$
begin
  if new.folder_id is not null and not exists (select 1 from folders f where f.id = new.folder_id and f.owner_id = new.owner_id) then
    raise exception 'Folder not found';
  end if;
  return new;
end $$;
create trigger collections_folder_owner before insert or update of folder_id on public.collections for each row execute function public.check_collection_folder();
