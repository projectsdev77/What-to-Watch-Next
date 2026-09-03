import { NextResponse } from "next/server";
import { syncCatalogBatch } from "@/lib/catalog";

// Give this comfortably more room than the default serverless timeout —
// see PAGES_PER_RUN below for why it should still finish well inside it.
export const maxDuration = 60;

// TMDB /discover pages (20 titles each) to pull per media type, per
// invocation — kept small so one run comfortably finishes inside a
// serverless function's time limit. The *schedule* (see vercel.json) is
// what grows the catalog over time, not the size of any single run; raise
// this only if your deployment allows longer function durations.
const PAGES_PER_RUN = 2;

/**
 * The scheduled half of "the catalog shouldn't run out" (see
 * src/lib/catalog.ts's syncCatalogBatch for the actual paging/ingestion
 * logic). Requires CRON_SECRET to be set — fails closed rather than
 * running unprotected if it's missing, since this triggers real writes
 * via the service-role client. Vercel Cron automatically sends
 * `Authorization: Bearer $CRON_SECRET` on scheduled invocations once
 * that env var is set on the project; hitting this manually (e.g. to
 * test) needs the same header.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [movies, shows] = await Promise.all([
    syncCatalogBatch("movie", PAGES_PER_RUN),
    syncCatalogBatch("tv", PAGES_PER_RUN),
  ]);

  return NextResponse.json({ movies, shows });
}
