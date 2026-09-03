"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectTarget } from "@/lib/redirect";

const DEFAULT_LIST_NAME = "My Watchlist";

/** Gets the user's first (oldest) watchlist, creating one if they have
 * none yet. Used by the quick one-click WatchlistButton everywhere
 * except the Watchlist page itself, which manages named lists directly. */
async function getOrCreateDefaultList(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<number> {
  const { data: existing } = await supabase
    .from("watchlists")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id as number;

  const { data: created, error } = await supabase
    .from("watchlists")
    .insert({ user_id: userId, name: DEFAULT_LIST_NAME })
    .select("id")
    .single();
  if (error || !created) throw new Error(`Failed to create default watchlist: ${error?.message}`);
  return created.id as number;
}

/** The quick "WATCHLIST" button's add — saves to the user's default (first) list. */
export async function addToDefaultWatchlistAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const titleId = Number(formData.get("titleId"));
  const redirectTo = safeRedirectTarget(formData);
  if (!titleId) redirect(redirectTo);

  const watchlistId = await getOrCreateDefaultList(supabase, user.id);
  const { error } = await supabase
    .from("watchlist_items")
    .upsert(
      { watchlist_id: watchlistId, user_id: user.id, title_id: titleId },
      { onConflict: "watchlist_id,title_id" }
    );
  if (error) throw new Error(`Failed to add to watchlist: ${error.message}`);

  revalidatePath(redirectTo);
  redirect(redirectTo);
}

/** The picker's add — saves to a specific list the user chose (shown
 * when they have more than one — see WatchlistButton). */
export async function addToListAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const titleId = Number(formData.get("titleId"));
  const watchlistId = Number(formData.get("watchlistId"));
  const redirectTo = safeRedirectTarget(formData);
  if (!titleId || !watchlistId) redirect(redirectTo);

  // Confirm this list is actually the current user's before writing to
  // it — watchlist_items' RLS check only constrains the row's own
  // user_id column (set correctly below), not that watchlist_id itself
  // belongs to that same user, so skipping this would let someone add a
  // title into an arbitrary list by id.
  const { data: ownedList } = await supabase
    .from("watchlists")
    .select("id")
    .eq("id", watchlistId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!ownedList) redirect(redirectTo);

  const { error } = await supabase
    .from("watchlist_items")
    .upsert(
      { watchlist_id: watchlistId, user_id: user.id, title_id: titleId },
      { onConflict: "watchlist_id,title_id" }
    );
  if (error) throw new Error(`Failed to add to watchlist: ${error.message}`);

  revalidatePath(redirectTo);
  redirect(redirectTo);
}

/** The quick button's remove — clears the title from every one of the
 * user's lists, not just the default one, so "ON WATCHLIST — REMOVE"
 * actually clears the state it's showing regardless of which list(s)
 * the title ended up on via the Watchlist page's own management. */
export async function removeFromAllWatchlistsAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const titleId = Number(formData.get("titleId"));
  const redirectTo = safeRedirectTarget(formData);
  if (!titleId) redirect(redirectTo);

  const { error } = await supabase.from("watchlist_items").delete().eq("user_id", user.id).eq("title_id", titleId);
  if (error) throw new Error(`Failed to remove from watchlist: ${error.message}`);

  revalidatePath(redirectTo);
  redirect(redirectTo);
}

/** Creates a new named list from the Watchlist page. */
export async function createWatchlistAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/watchlist");

  const { error } = await supabase.from("watchlists").insert({ user_id: user.id, name });
  if (error) throw new Error(`Failed to create watchlist: ${error.message}`);

  revalidatePath("/watchlist");
  redirect("/watchlist");
}

/** Deletes a whole list (its items go with it via cascade). */
export async function deleteWatchlistAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const watchlistId = Number(formData.get("watchlistId"));
  if (!watchlistId) redirect("/watchlist");

  const { error } = await supabase.from("watchlists").delete().eq("user_id", user.id).eq("id", watchlistId);
  if (error) throw new Error(`Failed to delete watchlist: ${error.message}`);

  revalidatePath("/watchlist");
  redirect("/watchlist");
}

/** Removes one title from one specific list, from the Watchlist page. */
export async function removeFromListAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const watchlistId = Number(formData.get("watchlistId"));
  const titleId = Number(formData.get("titleId"));
  if (!watchlistId || !titleId) redirect("/watchlist");

  const { error } = await supabase
    .from("watchlist_items")
    .delete()
    .eq("user_id", user.id)
    .eq("watchlist_id", watchlistId)
    .eq("title_id", titleId);
  if (error) throw new Error(`Failed to remove title from list: ${error.message}`);

  revalidatePath("/watchlist");
  redirect("/watchlist");
}
