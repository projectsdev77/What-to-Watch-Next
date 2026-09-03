"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ingestTitle } from "@/lib/catalog";
import { tmdbTitleUrl, type MediaType } from "@/lib/tmdb";

/**
 * Pulls a title TMDB knows about but our catalog doesn't yet have into
 * titles/title_availability, then sends the user straight to its detail
 * page — the "search finds something we haven't cached before" path.
 * Falls back to TMDB's own page directly if ingestion fails (TMDB down,
 * etc.) rather than a dead end.
 */
export async function ingestAndViewAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const mediaType = String(formData.get("mediaType"));
  const tmdbId = Number(formData.get("tmdbId"));
  if (!tmdbId || (mediaType !== "movie" && mediaType !== "tv")) redirect("/search");

  const id = await ingestTitle(mediaType as MediaType, tmdbId);
  if (id === null) redirect(tmdbTitleUrl(mediaType as MediaType, tmdbId));

  redirect(`/title/${id}`);
}
