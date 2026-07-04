"use client";

import { useState } from "react";

export function CredentialPreviewButton({
  credentialId,
  fileMimeType,
  fileName,
}: {
  credentialId: string;
  fileMimeType: string;
  fileName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const fileUrl = `/api/credentials/${credentialId}/file`;
  const isImage = fileMimeType.startsWith("image/");

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="font-medium text-slate-900 underline underline-offset-2 hover:text-slate-600"
      >
        Preview
      </button>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="flex max-h-full w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <p className="truncate text-sm font-medium text-slate-900">{fileName}</p>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="ml-4 shrink-0 text-sm font-medium text-slate-500 hover:text-slate-900"
              >
                Close
              </button>
            </div>
            <div className="min-h-[60vh] flex-1 overflow-auto bg-slate-100 p-2">
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fileUrl} alt={fileName} className="mx-auto max-h-[70vh] object-contain" />
              ) : (
                <iframe src={fileUrl} title={fileName} className="h-[70vh] w-full rounded" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
