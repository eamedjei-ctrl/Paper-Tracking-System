-- Admin panel: admin membership, account blocking, and an audit trail of admin actions.
-- Admin tables have NO client policies: only the server (service role) reads/writes them.

create table public.admins (
  user_id uuid primary key references auth.users on delete cascade,
  role text not null default 'admin' check (role in ('admin','owner')),
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

alter table public.profiles
  add column blocked_at timestamptz,
  add column blocked_reason text check (char_length(blocked_reason) <= 500),
  add column last_seen_at timestamptz;

-- Users must not be able to unblock themselves via the "own profile" policy.
create or replace function public.protect_block_columns() returns trigger language plpgsql as $$
begin
  if current_setting('request.jwt.claim.role', true) is distinct from 'service_role'
     and (new.blocked_at is distinct from old.blocked_at or new.blocked_reason is distinct from old.blocked_reason) then
    raise exception 'Not allowed';
  end if;
  return new;
end $$;
create trigger profiles_protect_block before update on public.profiles for each row execute function public.protect_block_columns();

create table public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users on delete set null,
  admin_email text not null,
  action text not null check (action in ('block','unblock','view_user')),
  target_user_id uuid,
  target_email text,
  reason text,
  at timestamptz not null default now()
);
alter table public.admin_audit enable row level security;

-- Make someone an admin (run once in the SQL editor):
--   insert into public.admins (user_id, role) select id, 'owner' from auth.users where email = 'you@example.com';
