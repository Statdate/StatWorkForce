/** Encodes a value as a quoted CSV cell and neutralizes spreadsheet formula
 * prefixes to prevent CSV injection when exports are opened interactively. */
export function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}
