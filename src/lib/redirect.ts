// Server Functions are reachable via direct POST requests, not just
// through our own UI (see Next.js's mutating-data docs) — never trust
// a redirect target from form input without validating it's a local
// path, or this becomes an open redirect.
export function safeRedirectTarget(formData: FormData): string {
  const target = String(formData.get("redirectTo") ?? "/");
  return target.startsWith("/") && !target.startsWith("//") ? target : "/";
}
