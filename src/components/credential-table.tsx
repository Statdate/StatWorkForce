import type { CredentialType } from "@/generated/prisma/client";
import { credentialDisplayName, credentialStatus } from "@/lib/credential-types";
import { CredentialPreviewButton } from "@/components/credential-preview-button";

export type CredentialRow = {
  id: string;
  type: CredentialType;
  customName: string | null;
  issuingBody: string | null;
  credentialNumber: string | null;
  expirationDate: Date;
  fileName: string | null;
  fileMimeType: string | null;
  user: { id: string; firstName: string; lastName: string; badgeNumber: string };
  unitNames?: string[];
};

/** Shared manager/admin compiled credential list — flat, soonest expiration
 * first, so "what needs attention" reads top to bottom. Print-friendly: the
 * Document column collapses to Yes/No on paper (a link is useless printed). */
export function CredentialTable({
  rows,
  showUnits = false,
}: {
  rows: CredentialRow[];
  showUnits?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm print:border-0 print:shadow-none">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Worker</th>
            {showUnits && <th className="px-4 py-3">Unit</th>}
            <th className="px-4 py-3">Credential</th>
            <th className="px-4 py-3">Issuing body</th>
            <th className="px-4 py-3">Number</th>
            <th className="px-4 py-3">Expires</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Document</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const status = credentialStatus(row.expirationDate);
            return (
              <tr key={row.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">
                  <span className="font-medium text-slate-900">
                    {row.user.firstName} {row.user.lastName}
                  </span>
                  <span className="ml-1 text-xs text-slate-400">#{row.user.badgeNumber}</span>
                </td>
                {showUnits && (
                  <td className="px-4 py-3 text-slate-600">
                    {row.unitNames?.join(", ") || "—"}
                  </td>
                )}
                <td className="px-4 py-3 text-slate-900">{credentialDisplayName(row)}</td>
                <td className="px-4 py-3 text-slate-600">{row.issuingBody ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{row.credentialNumber ?? "—"}</td>
                <td className="px-4 py-3 text-slate-900">
                  {row.expirationDate.toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
                  >
                    {status.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {row.fileName ? (
                    <>
                      <span className="print:hidden">
                        {row.fileMimeType && (
                          <>
                            <CredentialPreviewButton
                              credentialId={row.id}
                              fileMimeType={row.fileMimeType}
                              fileName={row.fileName}
                            />{" "}
                          </>
                        )}
                        <a
                          href={`/api/credentials/${row.id}/file`}
                          target="_blank"
                          className="text-slate-500 underline underline-offset-2 hover:text-slate-700"
                        >
                          Download
                        </a>
                      </span>
                      <span className="hidden print:inline">Yes</span>
                    </>
                  ) : (
                    <span className="text-slate-400">
                      <span className="print:hidden">—</span>
                      <span className="hidden print:inline">No</span>
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={showUnits ? 8 : 7} className="px-4 py-6 text-center text-slate-500">
                No credentials on file for anyone yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
