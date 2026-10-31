import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Load-balancer readiness check. It exposes no tenant or infrastructure
 * details: only whether the process can execute a database round trip. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json(
      { status: "ok" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
