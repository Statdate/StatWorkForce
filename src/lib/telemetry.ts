type ErrorContext = {
  routePath: string;
  routeType: string;
  routerKind: string;
};

function safeIdentifier(value: unknown, fallback: string) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9._/-]{1,200}$/.test(value)) return fallback;
  return value;
}

/** Builds a deliberately data-minimized event. Request paths, query strings,
 * headers, error messages, stacks, user IDs, and tenant IDs are excluded. */
export function buildServerErrorEvent(
  error: unknown,
  request: { method: string },
  context: ErrorContext,
  environment?: string,
  release?: string
) {
  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? safeIdentifier(error.digest, "unavailable")
      : "unavailable";
  const errorName = error instanceof Error ? safeIdentifier(error.name, "Error") : "UnknownError";

  return {
    event: "server_request_error",
    timestamp: new Date().toISOString(),
    environment: safeIdentifier(environment, "unknown"),
    release: safeIdentifier(release, "unknown"),
    errorName,
    digest,
    method: safeIdentifier(request.method, "UNKNOWN"),
    routePath: safeIdentifier(context.routePath, "unknown"),
    routeType: safeIdentifier(context.routeType, "unknown"),
    routerKind: safeIdentifier(context.routerKind, "unknown"),
  };
}
