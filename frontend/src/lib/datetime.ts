/**
 * <input type="datetime-local"> works in "wall clock, no timezone" strings
 * ("YYYY-MM-DDTHH:mm") — the browser and the person filling it in both assume
 * it means their own local time. The backend stores real timestamps, so
 * converting between the two must go through a real Date object (whose
 * local-component getters/constructor use the BROWSER's timezone) rather
 * than passing the raw string straight through — otherwise the "no timezone"
 * string gets parsed with the wrong assumption of whose "local" it is (the
 * server's, not the browser's), silently shifting the time by the
 * server/browser offset (e.g. exactly 5 hours for Tashkent/UTC+5).
 */

/** A stored ISO timestamp (UTC) -> the "YYYY-MM-DDTHH:mm" a datetime-local input expects, in
 * the browser's own local time. */
export function isoToLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** A datetime-local input's raw value ("YYYY-MM-DDTHH:mm", implicitly the browser's local time)
 * -> a real ISO timestamp (UTC) safe to send to the backend. */
export function localInputToISO(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}
