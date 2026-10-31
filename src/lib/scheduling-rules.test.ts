import { describe, expect, it } from "vitest";
import {
  durationHours,
  intervalsOverlap,
  scheduledHoursInWindow,
  utcWorkWeek,
  workWeek,
  localDateTimeToUtc,
  addDaysToLocalDate,
  formatDateTimeLocal,
} from "./scheduling-rules";

const at = (value: string) => new Date(value);

describe("scheduling rules", () => {
  it("detects overlap but permits back-to-back shifts", () => {
    const shift = { startTime: at("2026-10-30T07:00:00Z"), endTime: at("2026-10-30T15:00:00Z") };
    expect(intervalsOverlap(shift, { startTime: at("2026-10-30T14:00:00Z"), endTime: at("2026-10-30T22:00:00Z") })).toBe(true);
    expect(intervalsOverlap(shift, { startTime: at("2026-10-30T15:00:00Z"), endTime: at("2026-10-30T23:00:00Z") })).toBe(false);
  });

  it("never reports a negative duration", () => {
    expect(durationHours({ startTime: at("2026-10-30T07:00:00Z"), endTime: at("2026-10-30T15:00:00Z") })).toBe(8);
    expect(durationHours({ startTime: at("2026-10-30T15:00:00Z"), endTime: at("2026-10-30T07:00:00Z") })).toBe(0);
  });

  it("uses a stable Monday UTC work week", () => {
    const week = utcWorkWeek(at("2026-11-01T18:00:00Z"));
    expect(week.start.toISOString()).toBe("2026-10-26T00:00:00.000Z");
    expect(week.end.toISOString()).toBe("2026-11-02T00:00:00.000Z");
  });

  it("uses hospital-local boundaries across daylight-saving changes", () => {
    const week = workWeek(at("2026-11-01T18:00:00Z"), "America/Los_Angeles", 1);
    expect(week.start.toISOString()).toBe("2026-10-26T07:00:00.000Z");
    expect(week.end.toISOString()).toBe("2026-11-02T08:00:00.000Z");
  });

  it("clips scheduled hours at the reporting window", () => {
    const window = { start: at("2026-10-26T00:00:00Z"), end: at("2026-11-02T00:00:00Z") };
    expect(scheduledHoursInWindow([
      { startTime: at("2026-10-25T20:00:00Z"), endTime: at("2026-10-26T04:00:00Z") },
      { startTime: at("2026-10-30T07:00:00Z"), endTime: at("2026-10-30T15:00:00Z") },
    ], window)).toBe(12);
  });

  it("converts hospital-local shift times to UTC", () => {
    expect(localDateTimeToUtc("2026-10-30T07:00", "America/Los_Angeles").toISOString()).toBe(
      "2026-10-30T14:00:00.000Z"
    );
    expect(addDaysToLocalDate("2026-10-30", 42)).toBe("2026-12-11");
    expect(formatDateTimeLocal(at("2026-10-30T14:00:00Z"), "America/Los_Angeles")).toBe(
      "2026-10-30T07:00"
    );
  });

  it("rejects nonexistent daylight-saving local times", () => {
    expect(() => localDateTimeToUtc("2026-03-08T02:30", "America/Los_Angeles")).toThrow(
      "does not exist"
    );
  });
});
