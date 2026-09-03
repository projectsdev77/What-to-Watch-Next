// Thin wrapper around Google's Gemini API — the external AI this app uses
// to choose and explain Tonight's Pick, per the client's explicit call
// ("we are not building our own AI"). Free tier via a Google AI Studio key.
//
// Grounding is the whole point here: the model is given a short, real,
// already-scored shortlist (see rankCandidatesForTonight in
// recommendations.ts) and can ONLY respond with one of those ids —
// enforced both by a JSON response schema enum and, belt-and-suspenders,
// by rejecting the response server-side if it names anything else. It
// never gets to invent a title. If anything here fails or times out,
// callers fall back to the plain scoring-based pick — same as if
// GEMINI_API_KEY were never set.

import type { MediaType } from "@/lib/tmdb";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const REQUEST_TIMEOUT_MS = 6000;
const MAX_WHY_LENGTH = 240;

export interface ShortlistTitle {
  id: number;
  title: string;
  mediaType: MediaType;
  genres: string[];
  overview: string | null;
  voteAverage: number | null;
}

export interface TasteContext {
  likedGenres: string[];
  avoidGenres: string[];
}

export interface GeminiPick {
  titleId: number;
  why: string;
}

function buildPrompt(shortlist: ShortlistTitle[], context: TasteContext): string {
  const lines = shortlist.map((t) => {
    const kind = t.mediaType === "movie" ? "movie" : "TV show";
    const genres = t.genres.length > 0 ? t.genres.join(", ") : "unknown genre";
    const rating = t.voteAverage != null ? t.voteAverage.toFixed(1) : "n/a";
    const synopsis = t.overview ? t.overview.slice(0, 200) : "no synopsis available";
    return `- id ${t.id}: "${t.title}" (${kind}, genres: ${genres}, rating: ${rating}) — ${synopsis}`;
  });

  return [
    "You are picking tonight's one recommended title for a movie/TV app.",
    "Choose EXACTLY ONE title from this list. Never suggest anything not on it:",
    ...lines,
    context.likedGenres.length > 0 ? `This user tends to like: ${context.likedGenres.join(", ")}.` : "",
    context.avoidGenres.length > 0
      ? `They just disliked something in: ${context.avoidGenres.join(", ")} — lean away from that if a good alternative exists.`
      : "",
    "Reply with the id of your pick and one short, specific, friendly sentence (under 20 words) saying why THIS title is worth watching tonight — reference something concrete from its genre or synopsis, not generic praise.",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Asks Gemini to choose Tonight's Pick from an already-scored shortlist
 * and explain why. Returns null (never throws) on a missing key, an
 * empty shortlist, a network/timeout failure, or a response that doesn't
 * name one of the given ids — every case the caller should treat as
 * "fall back to the deterministic scoring pick."
 */
export async function chooseTonightsPick(shortlist: ShortlistTitle[], context: TasteContext): Promise<GeminiPick | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || shortlist.length === 0) return null;

  const idEnum = shortlist.map((t) => String(t.id));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(shortlist, context) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              titleId: { type: "STRING", enum: idEnum },
              why: { type: "STRING" },
            },
            required: ["titleId", "why"],
          },
        },
      }),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") return null;

    const parsed = JSON.parse(text) as { titleId?: string; why?: string };
    if (!parsed.titleId || !idEnum.includes(parsed.titleId)) return null; // grounding check

    const why = parsed.why?.trim();
    if (!why) return null;

    return { titleId: Number(parsed.titleId), why: why.slice(0, MAX_WHY_LENGTH) };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
