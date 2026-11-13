-- Manual RLS smoke test. Run in the SQL editor after creating two users (replace the UUIDs).
-- Expect: user B sees 0 of user A's papers and 0 notes, until A shares a collection with B,
-- after which B sees the paper rows but still 0 paper_notes rows.
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","email":"b@example.com"}';
select count(*) as papers_visible_to_b from public.papers;          -- only B's own + shared
select count(*) as notes_visible_to_b from public.paper_notes;      -- only B's own
select count(*) as subs_visible_to_b from public.subscriptions;     -- 1 (own)
rollback;
