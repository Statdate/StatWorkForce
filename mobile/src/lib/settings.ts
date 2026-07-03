import { getItem, setItem, deleteItem } from "@/lib/storage";

const ALARM_OFFSET_KEY = "swf_alarm_offset_minutes";
const DEFAULT_ALARM_OFFSET_MINUTES = 60;
const CALENDAR_SELECTION_KEY = "swf_sync_calendar_selection";

export type CalendarSelection = { id: string; label: string };

export async function getAlarmOffsetMinutes(): Promise<number> {
  const stored = await getItem(ALARM_OFFSET_KEY);
  const parsed = stored ? Number(stored) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_ALARM_OFFSET_MINUTES;
}

export async function setAlarmOffsetMinutes(minutes: number): Promise<void> {
  await setItem(ALARM_OFFSET_KEY, String(Math.max(0, Math.round(minutes))));
}

export async function getSelectedCalendar(): Promise<CalendarSelection | null> {
  const raw = await getItem(CALENDAR_SELECTION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed?.id === "string" && typeof parsed?.label === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export async function setSelectedCalendar(selection: CalendarSelection | null): Promise<void> {
  if (selection) {
    await setItem(CALENDAR_SELECTION_KEY, JSON.stringify(selection));
  } else {
    await deleteItem(CALENDAR_SELECTION_KEY);
  }
}

export { DEFAULT_ALARM_OFFSET_MINUTES };
