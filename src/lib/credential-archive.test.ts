import { describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { createCredentialArchive, safeArchiveSegment } from "./credential-archive";

describe("credential document archive", () => {
  it("removes traversal and control characters from archive names", () => {
    expect(safeArchiveSegment("../../Nurse / Badge\n123", "file")).toBe("..-..-Nurse-Badge-123");
    expect(safeArchiveSegment("///", "file")).toBe("file");
  });

  it("creates a readable archive with a manifest", () => {
    const archive = createCredentialArchive(
      [{ archiveName: "documents/test.txt", data: new TextEncoder().encode("document") }],
      { documentCount: 1 }
    );
    const files = unzipSync(archive);
    expect(strFromU8(files["documents/test.txt"]!)).toBe("document");
    expect(JSON.parse(strFromU8(files["manifest.json"]!))).toEqual({ documentCount: 1 });
  });
});
