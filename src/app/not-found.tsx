import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-slate-50 px-4 text-center">
      <h1 className="text-xl font-semibold text-slate-900">Page not found</h1>
      <p className="text-sm text-slate-500">
        That page doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Link href="/" className="mt-4 text-sm font-medium text-slate-900 underline">
        Back to my dashboard
      </Link>
    </div>
  );
}
