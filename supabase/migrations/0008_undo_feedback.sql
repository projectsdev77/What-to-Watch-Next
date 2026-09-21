-- Undoes a reaction: deletes the user_title_feedback row and reverses
-- whatever genre-weight delta it originally applied, atomically. Liked/
-- disliked/watched were previously permanent with no way back — a
-- misclick meant losing that title from recommendations for good.
--
-- The delta-per-status table here intentionally mirrors
-- GENRE_WEIGHT_DELTA in src/lib/taste-profile.ts — keep them in sync if
-- that ever changes. It's duplicated (rather than passed in from JS)
-- so the whole "what was the status, what do I need to reverse" lookup
-- happens atomically under the advisory lock, with no gap between a
-- JS-side read and the lock being taken.
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

  v_delta := case v_old_status
    when 'liked' then 1
    when 'disliked' then -0.5
    when 'watched' then 1
    else 0
  end;

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

grant execute on function undo_title_feedback(uuid, bigint, integer[], numeric) to authenticated;
