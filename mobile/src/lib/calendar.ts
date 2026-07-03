import { Platform } from "react-native";
import * as Calendar from "expo-calendar";
import { getItem, setItem } from "@/lib/storage";
import type { ScheduleAssignment } from "@/lib/api";

const SYNCED_MAP_KEY = "swf_synced_shift_events";

// expo-calendar has no web support at all (not even Expo Go) — see the SDK
// docs. Guard every entry point rather than letting the native module throw.
export const CALENDAR_SYNC_SUPPORTED = Platform.OS !== "web";

async function getSyncedMap(): Promise<Record<string, string>> {
  const raw = await getItem(SYNCED_MAP_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveSyncedMap(map: Record<string, string>) {
  await setItem(SYNCED_MAP_KEY, JSON.stringify(map));
}

async function requestFullCalendarAccess() {
  // Must request full (non-write-only) access — we call getCalendars() below
  // to find a writable calendar, and write-only access explicitly does not
  // grant permission to read/list calendars (see expo-calendar docs). The
  // app.json config plugin is set up for full access (no writeOnlyAccess
  // flag), which adds NSCalendarsFullAccessUsageDescription to Info.plist.
  const { status } = await Calendar.requestCalendarPermissions();
  if (status !== "granted") {
    throw new Error("Calendar permission was denied.");
  }
}

export type PickableCalendar = {
  id: string;
  title: string;
  sourceName: string;
};

/** Calendars the user could plausibly want to sync shifts into. */
export async function listWritableCalendars(): Promise<PickableCalendar[]> {
  await requestFullCalendarAccess();
  const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  return calendars
    .filter((c) => c.allowsModifications)
    .map((c) => ({ id: c.id, title: c.title, sourceName: c.source?.name ?? 'Unknown' }));
}

async function getWritableCalendar(preferredCalendarId: string | null) {
  await requestFullCalendarAccess();

  const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  const preferred = preferredCalendarId
    ? calendars.find((c) => c.id === preferredCalendarId && c.allowsModifications)
    : undefined;
  const writable =
    preferred ??
    calendars.find((c) => c.isPrimary && c.allowsModifications) ??
    calendars.find((c) => c.allowsModifications);

  if (!writable) {
    throw new Error("No writable calendar found on this device.");
  }

  return writable;
}

export type SyncResult = {
  syncedCount: number;
  skippedCount: number;
  errorCount: number;
};

/** Only PUBLISHED (or period-less) shifts sync — matches the spec's "once a
 * schedule is fully published" trigger. Already-synced shifts are skipped via
 * a local shiftId->eventId map, so repeat taps don't create duplicate
 * calendar entries. */
export async function syncAssignmentsToCalendar(
  assignments: ScheduleAssignment[],
  alarmOffsetMinutes: number,
  preferredCalendarId: string | null = null
): Promise<SyncResult> {
  if (!CALENDAR_SYNC_SUPPORTED) {
    throw new Error("Calendar sync isn't available in the web preview — try the native app.");
  }

  const calendar = await getWritableCalendar(preferredCalendarId);
  const syncedMap = await getSyncedMap();

  const syncable = assignments.filter(
    (a) => a.shift.schedulePeriod === null || a.shift.schedulePeriod.status === "PUBLISHED"
  );
  const notYetPublishedCount = assignments.length - syncable.length;

  let syncedCount = 0;
  let alreadySyncedCount = 0;
  let errorCount = 0;

  for (const assignment of syncable) {
    if (syncedMap[assignment.shiftId]) {
      alreadySyncedCount += 1;
      continue;
    }

    try {
      const event = await calendar.createEvent({
        title: `${assignment.shift.jobType.name} shift — ${assignment.shift.unit.name}`,
        startDate: new Date(assignment.shift.startTime),
        endDate: new Date(assignment.shift.endTime),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        alarms: alarmOffsetMinutes > 0 ? [{ relativeOffset: -alarmOffsetMinutes }] : [],
      });
      syncedMap[assignment.shiftId] = typeof event === "string" ? event : event.id;
      syncedCount += 1;
    } catch {
      errorCount += 1;
    }
  }

  await saveSyncedMap(syncedMap);

  return {
    syncedCount,
    skippedCount: alreadySyncedCount + notYetPublishedCount,
    errorCount,
  };
}
