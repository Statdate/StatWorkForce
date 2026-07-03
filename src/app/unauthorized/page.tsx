import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-slate-50 px-4 text-center">
      <h1 className="text-xl font-semibold text-slate-900">Not authorized</h1>
      <p className="text-sm text-slate-500">
        You don&apos;t have access to view this page.
      </p>
      <Link href="/" className="mt-4 text-sm font-medium text-slate-900 underline">
        Back to my dashboard
      </Link>
    </div>
  );
}
