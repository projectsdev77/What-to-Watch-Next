-- Two fixes to how reactions move genre weights:
--
-- 1. Switching reactions now replaces the old effect instead of stacking
--    on top of it. Before, going watched (+1) -> disliked applied only the
--    -0.5, leaving the genre net +0.5. Now the change applied is
--    weight(new status) - weight(old status).
--
-- 2. "watched" (set by Watch Now) no longer counts as a like. It now means
--    "opened it, opinion pending" and carries no weight; Tonight's Pick
--    asks the user how it was, and their answer (liked/disliked) is what
--    moves their taste profile.
--
-- The per-status weights live in genre_weight_for_status() so both
-- functions below share one table. It mirrors GENRE_WEIGHT_DELTA in
-- src/lib/taste-profile.ts — keep the two in sync.

create or replace function genre_weight_for_status(p_status text) returns numeric
language sql
immutable
as $$
  select case p_status
    when 'liked' then 1
    when 'disliked' then -0.5
    else 0
  end::numeric;
$$;

grant execute on function genre_weight_for_status(text) to authenticated;

-- Same signature as migration 0009 so the app works whether or not this
-- migration has been applied yet. p_delta is now ignored: the change is
-- computed here, from the old and new status, under the advisory lock.
create or replace function record_title_feedback(
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
  v_delta numeric;
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

  v_delta := genre_weight_for_status(p_status) - genre_weight_for_status(v_old_status);

  if v_delta <> 0 then
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
                least(p_max, coalesce((genre_weights ->> v_genre_id::text)::numeric, 0) + v_delta)
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

create or replace function undo_title_feedback(
  p_user_id uuid,
  p_title_id bigint,
  p_genre_ids integer[],
  p_max numeric
) returns void
language plpgsql
as $$
declare
  v_old_status text;
  v_delta numeric;
  v_genre_id integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_user_id::text), p_title_id::integer);

  select status into v_old_status
  from user_title_feedback
  where user_id = p_user_id and title_id = p_title_id;

  if v_old_status is null then
    return; -- nothing to undo
  end if;

  delete from user_title_feedback
  where user_id = p_user_id and title_id = p_title_id;

  v_delta := genre_weight_for_status(v_old_status);

  if v_delta <> 0 then
    foreach v_genre_id in array p_genre_ids loop
      update user_taste_profile
      set genre_weights = jsonb_set(
            coalesce(genre_weights, '{}'::jsonb),
            array[v_genre_id::text],
            to_jsonb(
              greatest(
                -p_max,
                least(p_max, coalesce((genre_weights ->> v_genre_id::text)::numeric, 0) - v_delta)
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
