import { getItem, setItem } from "@/lib/storage";

const ALARM_OFFSET_KEY = "swf_alarm_offset_minutes";
const DEFAULT_ALARM_OFFSET_MINUTES = 60;

export async function getAlarmOffsetMinutes(): Promise<number> {
  const stored = await getItem(ALARM_OFFSET_KEY);
  const parsed = stored ? Number(stored) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_ALARM_OFFSET_MINUTES;
}

export async function setAlarmOffsetMinutes(minutes: number): Promise<void> {
  await setItem(ALARM_OFFSET_KEY, String(Math.max(0, Math.round(minutes))));
}

export { DEFAULT_ALARM_OFFSET_MINUTES };
