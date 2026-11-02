import { describe, expect, it } from "vitest";
import { csvCell } from "./csv";

describe("csvCell", () => {
  it("quotes and escapes CSV values", () => {
    expect(csvCell('Allen, "Angela"')).toBe('"Allen, ""Angela"""');
  });

  it.each(["=1+1", "+cmd", "-2+3", "@SUM(A1:A2)"])(
    "neutralizes spreadsheet formula input %s",
    (value) => {
      expect(csvCell(value)).toBe(`"'${value}"`);
    }
  );

  it("keeps ordinary values unchanged inside quotes", () => {
    expect(csvCell("USER_DEACTIVATED")).toBe('"USER_DEACTIVATED"');
  });
});
