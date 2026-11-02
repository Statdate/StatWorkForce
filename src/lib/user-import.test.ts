import { describe, expect, it } from "vitest";
import { readUserImportCsv } from "./user-import";

describe("user import CSV", () => {
  it("parses quoted names and pipe-separated units", () => {
    const rows = readUserImportCsv('firstName,lastName,badgeNumber,email,accountType,jobType,units\n"Ana, Maria",Lee,42,ANA@EXAMPLE.COM,worker,RN,ICU|ED\n');
    expect(rows[0]).toMatchObject({ firstName: "Ana, Maria", email: "ana@example.com", accountType: "WORKER", units: ["ICU", "ED"] });
  });
  it("rejects unexpected headers and unterminated quotes", () => {
    expect(() => readUserImportCsv("name,badge\nA,1")).toThrow("headers");
    expect(() => readUserImportCsv('firstName,lastName,badgeNumber,email,accountType,jobType,units\n"A,B,1,,WORKER,RN,ICU')).toThrow("unterminated");
  });
});
