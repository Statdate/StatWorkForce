import { authenticateUser } from "@/lib/auth";
import { createMobileToken } from "@/lib/session";
import { corsJson, corsOptionsResponse } from "@/lib/cors";
import { LoginFormSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const validatedFields = LoginFormSchema.safeParse(body);

  if (!validatedFields.success) {
    return corsJson({ error: "Badge number and password are required." }, { status: 400 });
  }

  const { badgeNumber, password } = validatedFields.data;
  const user = await authenticateUser(badgeNumber, password);

  if (!user) {
    return corsJson({ error: "Invalid badge number or password." }, { status: 401 });
  }

  const token = await createMobileToken(user.id, user.accountType);

  return corsJson({
    token,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      accountType: user.accountType,
    },
  });
}

export async function OPTIONS() {
  return corsOptionsResponse();
}
