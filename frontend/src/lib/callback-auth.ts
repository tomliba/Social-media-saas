/**
 * Shared secret used to authenticate server-to-server callbacks to the
 * render-completion route (`/api/library/[id]/complete`). The route is
 * allow-listed in middleware (no user session), so this secret is what
 * actually prevents anyone who guesses a runId from spoofing render results.
 *
 * The secret must be set in BOTH:
 *   - the Next.js app env (so the route can verify), and
 *   - the Trigger.dev project env (so the task can send it).
 */

export const CALLBACK_SECRET_HEADER = "x-callback-secret";

/** Build headers for a server-to-server completion callback. */
export function callbackHeaders(
  extra?: Record<string, string>
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    [CALLBACK_SECRET_HEADER]: process.env.TRIGGER_CALLBACK_SECRET ?? "",
    ...extra,
  };
}

/**
 * POST a render-completion callback to `/api/library/[id]/complete` and throw if
 * the route does not accept it (any non-2xx response).
 *
 * Throwing is deliberate: it makes the calling Trigger.dev task fail loudly so
 * the run is retried, instead of `fetch` silently resolving on a 404/500 and
 * leaving the ContentItem stuck in "rendering" forever. `fetch` only rejects on
 * network errors, so without this check a failed callback goes unnoticed.
 */
export async function postCompletionCallback(
  appUrl: string,
  id: string,
  body: Record<string, unknown>
): Promise<void> {
  const res = await fetch(`${appUrl}/api/library/${id}/complete`, {
    method: "POST",
    headers: callbackHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Completion callback failed (${res.status}) for ${id}: ${text.slice(0, 300)}`
    );
  }
}

/**
 * Verify an incoming callback carries the correct secret.
 * Fails closed: if the secret is not configured on the server, all calls are
 * rejected (better to break renders loudly than to leave the route open).
 */
export function verifyCallbackSecret(req: Request): boolean {
  const expected = process.env.TRIGGER_CALLBACK_SECRET;
  if (!expected) return false;
  const provided = req.headers.get(CALLBACK_SECRET_HEADER);
  if (!provided) return false;
  // Constant-time-ish comparison
  if (provided.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}
