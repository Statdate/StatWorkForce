import "server-only";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type AuditClient = Pick<PrismaClient, "auditLog"> | Prisma.TransactionClient;

export type AuditEvent = {
  hospitalId: string;
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  outcome?: "SUCCESS" | "DENIED" | "FAILED";
  metadata?: Prisma.InputJsonValue;
};

/** Writes an append-only tenant audit event. Pass a transaction client when
 * the event must commit atomically with the state change it describes. */
export async function recordAuditEvent(event: AuditEvent, client: AuditClient = prisma) {
  return client.auditLog.create({
    data: {
      hospitalId: event.hospitalId,
      actorId: event.actorId ?? null,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId ?? null,
      outcome: event.outcome ?? "SUCCESS",
      metadata: event.metadata,
    },
  });
}
