import "server-only";
import { redirect } from "next/navigation";

/**
 * Server Actions bound to a plain <form action={fn}> have no return value the
 * form can read — a thrown error becomes an unhandled exception and blows
 * away the whole page (now caught by src/app/error.tsx, but that still loses
 * the rest of the page's state). Redirecting back to the same page with the
 * message in a query param keeps everything else on the page intact and
 * gives the user an actual reason, matching how login already surfaces
 * validation errors via useActionState.
 */
export function redirectWithError(path: string, error: unknown): never {
  const message = error instanceof Error ? error.message : "Something went wrong. Try again.";
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}
