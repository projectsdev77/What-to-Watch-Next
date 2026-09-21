-- Tracks *when* a title was actually watched, separate from the
-- liked/disliked judgment itself — lets "watched and liked" titles
-- resurface later as a rewatch suggestion instead of being excluded
-- from recommendations forever (see recommendations.ts's
-- REWATCH_COOLDOWN_DAYS). Nullable: most feedback rows (a plain quiz
-- rating, "Don't like it", "Another time") were never actually watched
-- through the app, so this stays unset for them.
alter table user_title_feedback add column if not exists watched_at timestamptz;

-- Replaces record_title_feedback (migration 0007) to also accept an
-- optional watched-at timestamp. Uses coalesce on the conflict branch
-- so a call that doesn't pass one (the normal Don't-like-it/Another-time
-- path) never erases a watched_at a previous call already set.
--
-- Dropped and recreated (rather than CREATE OR REPLACE) since this adds
-- a new parameter — a clean way to avoid any ambiguity about whether
-- Postgres treats the extended signature as the same function, and
-- removes the old 6-argument overload instead of leaving it dangling.
drop function if exists record_title_feedback(uuid, bigint, text, integer[], numeric, numeric);

create function record_title_feedback(
  p_user_id uuid,
  p_title_id bigint,
  p_status text,
  p_genre_ids integer[],
  p_delta numeric,
  p_max numeric,
  p_watched_at timestamptz default null
) returns void
language plpgsql
as $$
declare
  v_old_status text;
  v_genre_id integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_user_id::text), p_title_id::integer);

  select status into v_old_status
  from user_title_feedback
  where user_id = p_user_id and title_id = p_title_id;

  insert into user_title_feedback (user_id, title_id, status, watched_at, updated_at)
  values (p_user_id, p_title_id, p_status, p_watched_at, now())
  on conflict (user_id, title_id)
  do update set
    status = excluded.status,
    watched_at = coalesce(excluded.watched_at, user_title_feedback.watched_at),
    updated_at = excluded.updated_at;

  if p_delta <> 0 and (v_old_status is distinct from p_status) then
    insert into user_taste_profile (user_id, genre_weights, updated_at)
    values (p_user_id, '{}'::jsonb, now())
    on conflict (user_id) do nothing;

    foreach v_genre_id in array p_genre_ids loop
      update user_taste_profile
      set genre_weights = jsonb_set(
            coalesce(genre_weights, '{}'::jsonb),
            array[v_genre_id::text],
            to_jsonb(
              greatest(
                -p_max,
                least(p_max, coalesce((genre_weights ->> v_genre_id::text)::numeric, 0) + p_delta)
              )
            ),
            true
          ),
          updated_at = now()
      where user_id = p_user_id;
    end loop;
  end if;
end;
$$;

grant execute on function record_title_feedback(uuid, bigint, text, integer[], numeric, numeric, timestamptz) to authenticated;
