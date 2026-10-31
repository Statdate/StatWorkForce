import { describe, expect, it } from "vitest";
import { parseCallInResolution } from "./call-in";

describe("call-in resolution validation", () => {
  it("accepts covered and trims optional notes", () => {
    expect(parseCallInResolution({ status: "COVERED", notes: "  Filled by float pool  " })).toEqual({
      status: "COVERED",
      notes: "Filled by float pool",
    });
  });

  it("accepts unresolved without notes", () => {
    expect(parseCallInResolution({ status: "UNRESOLVED", notes: "" })).toEqual({
      status: "UNRESOLVED",
      notes: null,
    });
  });

  it("rejects reopening or unbounded notes", () => {
    expect(() => parseCallInResolution({ status: "OPEN", notes: "" })).toThrow();
    expect(() => parseCallInResolution({ status: "COVERED", notes: "x".repeat(501) })).toThrow(
      "500 characters"
    );
  });
});
