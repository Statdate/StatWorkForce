import * as z from "zod";

export const LoginFormSchema = z.object({
  badgeNumber: z
    .string()
    .trim()
    .min(1, { error: "Badge number is required." }),
  password: z.string().min(1, { error: "Password is required." }),
});

export type LoginFormState =
  | {
      errors?: {
        badgeNumber?: string[];
        password?: string[];
      };
      message?: string;
    }
  | undefined;
