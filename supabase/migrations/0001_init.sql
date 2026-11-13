-- PaperTrail schema. Run with `supabase db push` or paste into the Supabase SQL editor.
create extension if not exists pgcrypto;

-- ---------- Profiles ----------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '' check (char_length(name) <= 120),
  role text check (role in ('student','researcher','lecturer','team','other')),
  interests text[] not null default '{}',
  onboarded boolean not null default false,
  weekly_goal int not null default 3 check (weekly_goal between 1 and 100),
  theme text not null default 'light' check (theme in ('system','light','dark')),
  reduce_motion boolean not null default false,
  notify_reminders boolean not null default true,
  notify_comments boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name) values (new.id, coalesce(left(new.raw_user_meta_data->>'name', 120), ''));
  insert into public.subscriptions (user_id) values (new.id);
  return new;
end $$;

-- ---------- Subscriptions (written only by service role via verified Stripe webhooks) ----------
create table public.subscriptions (
  user_id uuid primary key references auth.users on delete cascade,
  plan text not null default 'standard' check (plan in ('standard','premium')),
  status text not null default 'none' check (status in ('none','trialing','active','past_due','canceled')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- Papers ----------
create table public.papers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade default auth.uid(),
  title text not null check (char_length(title) between 1 and 500),
  authors jsonb not null default '[]'::jsonb,           -- [{given, family}] for reliable citation formatting
  year int check (year between 1000 and 2100),
  venue text not null default '',
  abstract text not null default '',
  doi text not null default '',
  url text not null default '',
  status text not null default 'unread' check (status in ('unread','in_progress','read','revisit')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  progress int not null default 0 check (progress between 0 and 100),
  metadata_source text not null default 'manual' check (metadata_source in ('manual','crossref','bibtex','ris','sample')),
  pdf_path text, pdf_name text, pdf_size bigint,
  assigned_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index papers_owner_idx on public.papers (owner_id, created_at desc);
create index papers_doi_idx on public.papers (owner_id, lower(doi)) where doi <> '';

-- Private per-paper notes. Never readable by collaborators.
create table public.paper_notes (
  paper_id uuid primary key references public.papers on delete cascade,
  owner_id uuid not null references auth.users on delete cascade default auth.uid(),
  summary text not null default '',
  notes text not null default '',
  takeaways text[] not null default '{}',
  questions text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid not null references public.papers on delete cascade,
  owner_id uuid not null references auth.users on delete cascade default auth.uid(),
  text text not null check (char_length(text) <= 500),
  done boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade default auth.uid(),
  name text not null check (char_length(name) between 1 and 40),
  unique (owner_id, name)
);
create table public.paper_tags (
  paper_id uuid not null references public.papers on delete cascade,
  tag_id uuid not null references public.tags on delete cascade,
  primary key (paper_id, tag_id)
);

-- ---------- Collections / projects ----------
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade default auth.uid(),
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  color text not null default '#3048d6' check (color ~ '^#[0-9a-fA-F]{6}$'),
  goal int check (goal between 1 and 1000),
  shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.collection_papers (
  collection_id uuid not null references public.collections on delete cascade,
  paper_id uuid not null references public.papers on delete cascade,  -- deleting a collection never deletes papers
  position int not null default 0,
  added_at timestamptz not null default now(),
  primary key (collection_id, paper_id)
);
create table public.collection_members (
  collection_id uuid not null references public.collections on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null check (role in ('owner','editor','viewer')),
  created_at timestamptz not null default now(),
  primary key (collection_id, user_id)
);
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections on delete cascade,
  email text not null check (char_length(email) <= 320),
  role text not null check (role in ('editor','viewer')),
  invited_by uuid not null references auth.users on delete cascade default auth.uid(),
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  unique (collection_id, email)
);
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid not null references public.papers on delete cascade,
  collection_id uuid not null references public.collections on delete cascade,
  author_id uuid not null references auth.users on delete cascade default auth.uid(),
  author_name text not null default '',
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

-- ---------- Personal productivity ----------
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade default auth.uid(),
  paper_id uuid references public.papers on delete cascade,
  text text not null check (char_length(text) <= 300),
  due timestamptz not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.saved_views (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade default auth.uid(),
  name text not null check (char_length(name) <= 80),
  query text not null default '',
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade default auth.uid(),
  paper_id uuid references public.papers on delete set null,
  kind text not null,
  message text not null check (char_length(message) <= 600),
  at timestamptz not null default now()
);
create index activity_owner_idx on public.activity_events (owner_id, at desc);

-- ---------- Membership helpers (security definer avoids RLS recursion) ----------
create or replace function public.collection_role(cid uuid) returns text language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from collections c where c.id = cid and c.owner_id = auth.uid()) then 'owner'
    else (select m.role from collection_members m join collections c on c.id = m.collection_id where m.collection_id = cid and m.user_id = auth.uid() and c.shared)
  end
$$;
create or replace function public.can_view_paper(pid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from papers p where p.id = pid and p.owner_id = auth.uid())
      or exists (select 1 from collection_papers cp where cp.paper_id = pid and public.collection_role(cp.collection_id) is not null)
$$;

create or replace function public.accept_invitation(inv uuid, accept boolean) returns void language plpgsql security definer set search_path = public as $$
declare i invitations;
begin
  select * into i from invitations where id = inv and lower(email) = lower(auth.jwt()->>'email') and status = 'pending';
  if not found then raise exception 'Invitation not found'; end if;
  update invitations set status = case when accept then 'accepted' else 'declined' end where id = inv;
  if accept then
    insert into collection_members (collection_id, user_id, role) values (i.collection_id, auth.uid(), i.role) on conflict do nothing;
  end if;
end $$;

-- ---------- Row level security ----------
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.papers enable row level security;
alter table public.paper_notes enable row level security;
alter table public.tasks enable row level security;
alter table public.tags enable row level security;
alter table public.paper_tags enable row level security;
alter table public.collections enable row level security;
alter table public.collection_papers enable row level security;
alter table public.collection_members enable row level security;
alter table public.invitations enable row level security;
alter table public.comments enable row level security;
alter table public.reminders enable row level security;
alter table public.saved_views enable row level security;
alter table public.activity_events enable row level security;

create policy "own profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "read own subscription" on public.subscriptions for select using (user_id = auth.uid());
-- no insert/update/delete policy on subscriptions: only the service role (webhook) writes.

create policy "owner manages papers" on public.papers for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "members read shared papers" on public.papers for select using (public.can_view_paper(id));

create policy "owner only notes" on public.paper_notes for all using (owner_id = auth.uid()) with check (owner_id = auth.uid() and exists (select 1 from papers p where p.id = paper_id and p.owner_id = auth.uid()));
create policy "owner only tasks" on public.tasks for all using (owner_id = auth.uid()) with check (owner_id = auth.uid() and exists (select 1 from papers p where p.id = paper_id and p.owner_id = auth.uid()));
create policy "owner tags" on public.tags for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "paper tags via paper" on public.paper_tags for all
  using (exists (select 1 from papers p where p.id = paper_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from papers p where p.id = paper_id and p.owner_id = auth.uid()) and exists (select 1 from tags t where t.id = tag_id and t.owner_id = auth.uid()));

create policy "owner manages collections" on public.collections for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "members read collections" on public.collections for select using (public.collection_role(id) is not null);

create policy "read collection papers" on public.collection_papers for select using (public.collection_role(collection_id) is not null);
create policy "edit collection papers" on public.collection_papers for insert with check (public.collection_role(collection_id) in ('owner','editor') and public.can_view_paper(paper_id) and exists (select 1 from papers p where p.id = paper_id and p.owner_id = auth.uid()));
create policy "remove collection papers" on public.collection_papers for delete using (public.collection_role(collection_id) in ('owner','editor'));

create policy "read members" on public.collection_members for select using (public.collection_role(collection_id) is not null);
create policy "owner manages members" on public.collection_members for all using (public.collection_role(collection_id) = 'owner') with check (public.collection_role(collection_id) = 'owner');

create policy "owner creates invites" on public.invitations for insert with check (public.collection_role(collection_id) = 'owner' and invited_by = auth.uid());
create policy "see relevant invites" on public.invitations for select using (invited_by = auth.uid() or lower(email) = lower(auth.jwt()->>'email') or public.collection_role(collection_id) is not null);
create policy "owner deletes invites" on public.invitations for delete using (public.collection_role(collection_id) = 'owner');

create policy "members read comments" on public.comments for select using (public.collection_role(collection_id) is not null);
create policy "members write comments" on public.comments for insert with check (author_id = auth.uid() and public.collection_role(collection_id) is not null and exists (select 1 from collection_papers cp where cp.collection_id = comments.collection_id and cp.paper_id = comments.paper_id));
create policy "authors delete comments" on public.comments for delete using (author_id = auth.uid());

create policy "own reminders" on public.reminders for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own views" on public.saved_views for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own activity" on public.activity_events for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---------- Storage: private PDFs at papers/<user_id>/<paper_id>.pdf ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('papers', 'papers', false, 52428800, array['application/pdf'])
on conflict (id) do nothing;

create policy "own pdfs read" on storage.objects for select using (bucket_id = 'papers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own pdfs write" on storage.objects for insert with check (bucket_id = 'papers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own pdfs update" on storage.objects for update using (bucket_id = 'papers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own pdfs delete" on storage.objects for delete using (bucket_id = 'papers' and (storage.foldername(name))[1] = auth.uid()::text);
