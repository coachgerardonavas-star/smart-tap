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
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push([
      row.fullName,
      row.phone,
      row.birthday ?? "",
      String(row.visitCount),
      row.lastVisit ?? "",
      String(row.whatsappOptIn),
    ].map(csvCell).join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
}

function csvCell(value: string): string {
  const safe = /^[\t\r\n ]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
