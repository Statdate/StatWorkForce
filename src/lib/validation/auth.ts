import * as z from "zod";

export const LoginFormSchema = z.object({
  organizationCode: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { error: "Organization code is required." })
    .max(64, { error: "Organization code is too long." })
    .regex(/^[a-z0-9-]+$/, { error: "Use the organization code provided by your hospital." }),
  badgeNumber: z
    .string()
    .trim()
    .min(1, { error: "Badge number is required." }),
  password: z.string().min(1, { error: "Password is required." }),
});

export type LoginFormState =
  | {
      errors?: {
        organizationCode?: string[];
        badgeNumber?: string[];
        password?: string[];
      };
      message?: string;
    }
  | undefined;
