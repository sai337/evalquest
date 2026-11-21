-- EvalQuest optional scoreboard: one row per signed-in (GitHub) player.
-- Stores only: GitHub username + avatar (from the login), XP, per-challenge best scores, leaderboard opt-in.

create table public.players (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  username text not null default '',
  avatar_url text,
  xp integer not null default 0 check (xp between 0 and 100000),
  solved jsonb not null default '{}'::jsonb check (jsonb_typeof(solved) = 'object'),
  solved_count integer not null default 0,
  show_on_leaderboard boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Server-side integrity: username/avatar come from the GitHub login (no impersonation),
-- solved_count and updated_at are computed here, oversized payloads are rejected.
create or replace function public.players_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare meta jsonb;
begin
  select raw_user_meta_data into meta from auth.users where id = new.user_id;
  new.username := coalesce(meta ->> 'user_name', meta ->> 'preferred_username', 'player');
  new.avatar_url := meta ->> 'avatar_url';
  if (select count(*) from jsonb_object_keys(new.solved)) > 2000 then
    raise exception 'too many solved entries';
  end if;
  new.solved_count := (select count(*) from jsonb_each(new.solved) e
                       where jsonb_typeof(e.value) = 'object' and (e.value ->> 'score')::numeric >= 1);
  new.updated_at := now();
  return new;
end $$;

create trigger players_before_write
before insert or update on public.players
for each row execute function public.players_before_write();

alter table public.players enable row level security;

create policy "read own row" on public.players for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own row" on public.players for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own row" on public.players for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own row" on public.players for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.players from anon;
grant select, insert, update, delete on public.players to authenticated;
revoke execute on function public.players_before_write() from public, anon, authenticated;

-- Public leaderboard exposes only username, avatar, XP and solved count (never the solved map).
create or replace function public.get_leaderboard(max_rows integer default 50)
returns table (username text, avatar_url text, xp integer, solved_count integer, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.username, p.avatar_url, p.xp, p.solved_count, p.updated_at
  from public.players p
  where p.show_on_leaderboard
  order by p.xp desc, p.updated_at asc
  limit least(greatest(max_rows, 1), 100);
$$;

revoke execute on function public.get_leaderboard(integer) from public;
grant execute on function public.get_leaderboard(integer) to anon, authenticated;
