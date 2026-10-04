export type CustomerExportRow = {
  fullName: string;
  phone: string;
  birthday: string | null;
  visitCount: number;
  lastVisit: string | null;
  whatsappOptIn: boolean;
};

const headers = ["name", "phone", "birthday", "visit_count", "last_visit", "whatsapp_opt_in"];

export function buildCustomerExportCsv(rows: CustomerExportRow[]): string {
  const lines = [headers.map((header) => csvCell(header)).join(",")];
  for (const row of rows) {
    lines.push([
      csvCell(row.fullName),
      csvCell(row.phone, false),
      csvCell(row.birthday ?? ""),
      csvCell(String(row.visitCount)),
      csvCell(row.lastVisit ?? ""),
      csvCell(String(row.whatsappOptIn)),
    ].join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
}

function csvCell(value: string, neutralizeFormula = true): string {
  const safe = neutralizeFormula && /^[\t\r\n ]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
