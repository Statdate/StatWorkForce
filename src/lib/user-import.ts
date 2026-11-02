export const USER_IMPORT_HEADERS = ["firstName", "lastName", "badgeNumber", "email", "accountType", "jobType", "units"] as const;

export function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (char !== "\r") cell += char;
  }
  if (quoted) throw new Error("CSV contains an unterminated quoted field");
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((values) => values.some((value) => value.trim()));
}

export function readUserImportCsv(text: string) {
  const rows = parseCsvRows(text);
  if (rows.length === 0) throw new Error("CSV is empty");
  const headers = rows[0].map((value) => value.trim());
  if (headers.join(",") !== USER_IMPORT_HEADERS.join(",")) {
    throw new Error(`CSV headers must be exactly: ${USER_IMPORT_HEADERS.join(",")}`);
  }
  return rows.slice(1).map((values, index) => ({
    rowNumber: index + 2,
    firstName: values[0]?.trim() ?? "",
    lastName: values[1]?.trim() ?? "",
    badgeNumber: values[2]?.trim() ?? "",
    email: values[3]?.trim().toLowerCase() ?? "",
    accountType: values[4]?.trim().toUpperCase() ?? "",
    jobType: values[5]?.trim() ?? "",
    units: (values[6] ?? "").split("|").map((value) => value.trim()).filter(Boolean),
    extraColumns: values.length > USER_IMPORT_HEADERS.length,
  }));
}
