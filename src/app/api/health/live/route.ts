export const dynamic = "force-dynamic";

/** Process liveness only. Readiness remains /api/health because it verifies
 * the database dependency before a load balancer sends application traffic. */
export async function GET() {
  return Response.json(
    { status: "alive" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
