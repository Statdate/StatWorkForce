"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-slate-50 px-4 text-center">
      <h1 className="text-xl font-semibold text-slate-900">Something went wrong</h1>
      <p className="text-sm text-slate-500">
        That didn&apos;t work. Try again, or head back to your dashboard.
      </p>
      <div className="mt-4 flex items-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="text-sm font-medium text-slate-900 underline"
        >
          Try again
        </button>
        <Link href="/" className="text-sm font-medium text-slate-900 underline">
          Back to my dashboard
        </Link>
      </div>
    </div>
  );
}
