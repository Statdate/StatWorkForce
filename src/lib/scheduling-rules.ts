export type TimeRange = { startTime: Date; endTime: Date };

export function intervalsOverlap(left: TimeRange, right: TimeRange) {
  return left.startTime < right.endTime && right.startTime < left.endTime;
}

export function durationHours(range: TimeRange) {
  return Math.max(0, range.endTime.getTime() - range.startTime.getTime()) / 3_600_000;
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

function localMidnightToUtc(year: number, month: number, day: number, timeZone: string) {
  return localPartsToUtc(year, month, day, 0, 0, timeZone);
}

function localPartsToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
) {
  const target = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = target;
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const actual = zonedParts(new Date(guess), timeZone);
    const represented = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second
    );
    guess += target - represented;
  }
  return new Date(guess);
}

export function localDateTimeToUtc(value: string, timeZone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Enter a valid local date and time");
  const [, year, month, day, hour, minute] = match.map(Number);
  const utc = localPartsToUtc(year, month, day, hour, minute, timeZone);
  const roundTrip = zonedParts(utc, timeZone);
  if (
    roundTrip.year !== year ||
    roundTrip.month !== month ||
    roundTrip.day !== day ||
    roundTrip.hour !== hour ||
    roundTrip.minute !== minute
  ) {
    throw new Error("That local time does not exist in the hospital time zone");
  }
  return utc;
}

export function formatDateTimeLocal(date: Date, timeZone: string) {
  const parts = zonedParts(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

export function addDaysToLocalDate(value: string, days: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Enter a valid date");
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

/** Hospital-local payroll week converted to exact UTC boundaries. This is a
 * workload signal; union contracts and payroll systems remain authoritative. */
export function workWeek(date: Date, timeZone: string, weekStartsOn: number) {
  const local = zonedParts(date, timeZone);
  const localDate = new Date(Date.UTC(local.year, local.month - 1, local.day));
  const daysSinceStart = (localDate.getUTCDay() - weekStartsOn + 7) % 7;
  localDate.setUTCDate(localDate.getUTCDate() - daysSinceStart);
  const start = localMidnightToUtc(
    localDate.getUTCFullYear(),
    localDate.getUTCMonth() + 1,
    localDate.getUTCDate(),
    timeZone
  );
  localDate.setUTCDate(localDate.getUTCDate() + 7);
  const end = localMidnightToUtc(
    localDate.getUTCFullYear(),
    localDate.getUTCMonth() + 1,
    localDate.getUTCDate(),
    timeZone
  );
  return { start, end };
}

export function utcWorkWeek(date: Date) {
  return workWeek(date, "UTC", 1);
}

export function scheduledHoursInWindow(ranges: TimeRange[], window: { start: Date; end: Date }) {
  return ranges.reduce((total, range) => {
    const start = Math.max(range.startTime.getTime(), window.start.getTime());
    const end = Math.min(range.endTime.getTime(), window.end.getTime());
    return total + Math.max(0, end - start) / 3_600_000;
  }, 0);
}
