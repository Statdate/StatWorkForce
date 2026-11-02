import * as z from "zod";

export const StrongPasswordSchema = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(128, "Password is too long")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number")
  .regex(/[^A-Za-z0-9]/, "Include a symbol");

export const CreateHospitalUserSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  badgeNumber: z.string().trim().min(1).max(64),
  email: z.union([z.literal(""), z.email()]).transform((value) => value || null),
  accountType: z.enum(["WORKER", "MANAGER"]),
  jobTypeId: z.union([z.string().min(1), z.literal("")]).transform((value) => value || null),
  temporaryPassword: StrongPasswordSchema,
  unitIds: z.array(z.string().min(1)).min(1, "Select at least one unit"),
}).superRefine((value, context) => {
  if (value.accountType === "WORKER" && !value.jobTypeId) {
    context.addIssue({ code: "custom", path: ["jobTypeId"], message: "Select a job type for workers" });
  }
});

export const UpdateHospitalUserAccessSchema = z.object({
  accountType: z.enum(["WORKER", "MANAGER"]),
  jobTypeId: z.union([z.string().min(1), z.literal("")]).transform((value) => value || null),
  unitIds: z.array(z.string().min(1)).min(1, "Select at least one unit"),
}).superRefine((value, context) => {
  if (value.accountType === "WORKER" && !value.jobTypeId) {
    context.addIssue({ code: "custom", path: ["jobTypeId"], message: "Select a job type for workers" });
  }
});

export const InitialPasswordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter the temporary password"),
    newPassword: StrongPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    path: ["newPassword"],
    message: "Choose a password different from the temporary password",
  });
