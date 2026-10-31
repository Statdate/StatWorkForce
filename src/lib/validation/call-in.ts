import { z } from "zod";

const CallInResolutionSchema = z.object({
  status: z.enum(["COVERED", "UNRESOLVED"]),
  notes: z.string().trim().max(500, "Notes must be 500 characters or fewer").optional(),
});

export function parseCallInResolution(input: { status: unknown; notes: unknown }) {
  const result = CallInResolutionSchema.safeParse({
    status: input.status,
    notes: typeof input.notes === "string" && input.notes.trim() ? input.notes : undefined,
  });
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Invalid call-in resolution");
  return { status: result.data.status, notes: result.data.notes ?? null };
}
