-- Replaces recordTitleFeedback's previous JS-side "read genre_weights,
-- add delta, write it back" with a single atomic function — the old
-- pattern was a classic double-submit race: two near-simultaneous
-- reactions (a fast double-click, a retried request) could both read
-- the same pre-update weight and each add their own delta, double-
-- counting a single click.
--
-- An advisory lock scoped to (user_id, title_id) serializes concurrent
-- calls for the same pair even before any row exists yet (a plain row
-- lock can't help with that case, since there's no row to lock). The
-- weight delta is only applied when the status is actually new or
-- different from what was already stored, so resubmitting the exact
-- same reaction twice is a no-op past the first time.
--
-- No SECURITY DEFINER here on purpose: this function runs as whichever
-- role calls it (the authenticated user, via the normal RLS-respecting
-- client), so the existing row-level security policies on
-- user_title_feedback/user_taste_profile ("auth.uid() = user_id") keep
-- enforcing themselves automatically — a caller can't pass someone
-- else's p_user_id and have it silently succeed.
create or replace function record_title_feedback(
  p_user_id uuid,
  p_title_id bigint,
  p_status text,
  p_genre_ids integer[],
  p_delta numeric,
  p_max numeric
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

  insert into user_title_feedback (user_id, title_id, status, updated_at)
  values (p_user_id, p_title_id, p_status, now())
  on conflict (user_id, title_id)
  do update set status = excluded.status, updated_at = excluded.updated_at;

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

-- RLS is enforced by the calling role (see above), not by this grant —
-- this just allows authenticated users to call the function at all.
grant execute on function record_title_feedback(uuid, bigint, text, integer[], numeric, numeric) to authenticated;
