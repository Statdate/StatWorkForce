import type { Instrumentation } from "next";
import { buildServerErrorEvent } from "@/lib/telemetry";

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const event = buildServerErrorEvent(
    error,
    request,
    context,
    process.env.DEPLOYMENT_TIER,
    process.env.RENDER_GIT_COMMIT ?? process.env.RELEASE_SHA
  );
  console.error(JSON.stringify(event));
};
