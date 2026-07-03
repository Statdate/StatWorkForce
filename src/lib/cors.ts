/**
 * Permissive CORS for the mobile-facing API. Safe to leave wildcarded since
 * these endpoints are Bearer-token authenticated (not cookie/session based),
 * so there's no ambient credential a cross-origin page could ride on.
 */
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function corsJson(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: { ...CORS_HEADERS, ...init?.headers },
  });
}

export function corsOptionsResponse() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
