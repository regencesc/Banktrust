// ============================================================================
// sheet.js — browser-side file I/O for CSV/XLSX via SheetJS (Phase 4).
// All row logic lives in costItems.js; this module only encodes/decodes
// files, so it is the single place that touches the xlsx dependency.
// SheetJS is loaded lazily — it only ships to the browser when the user
// actually imports/exports a file, keeping it out of the initial bundle.
// ============================================================================

const loadXlsx = () => import("xlsx");

/** Read the first sheet of a CSV/XLSX file into an array-of-arrays. */
export async function readSheetAoa(file) {
  const XLSX = await loadXlsx();
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
}

export async function downloadXlsx(filename, aoa, sheetName = "Sheet1") {
  const XLSX = await loadXlsx();
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(aoa), sheetName);
  XLSX.writeFile(workbook, filename);
}

export function downloadCsv(filename, aoa) {
  const escape = (cell) => {
    const s = cell === null || cell === undefined ? "" : String(cell);
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const csv = aoa.map((row) => row.map(escape).join(",")).join("\r\n");
  const BOM = String.fromCharCode(0xfeff);
  // BOM so Excel opens Thai text as UTF-8
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
