// ============================================================================
// costItems.js — cost line-item factories, CAPEX<->OPEX conversion, and
// spreadsheet row (de)serialization for the Cost Database page (Phase 4).
// Pure JS: works on arrays-of-arrays; file encoding/decoding via SheetJS
// lives in sheet.js so this module stays testable in Node.
// ============================================================================

import { newId } from "./state.js";

export function createCapexItem() {
  return {
    id: newId(),
    kind: "capex",
    category: "",
    name: "",
    spec: "",
    qty: null,
    unit: "",
    unitPrice: null,
    discountPct: null,
    vatPct: null,
    replacementYear: null,
    replacementCycles: null,
    replacementPct: null,
  };
}

export function createOpexItem() {
  return {
    id: newId(),
    category: "",
    name: "",
    costPerOccurrence: null,
    escalationPct: null,
    startYear: null,
    endYear: null,
    everyNYears: null,
  };
}

/**
 * Move a CAPEX line to OPEX: one occurrence per year at the item's net
 * price (before VAT — recurring items are costed per occurrence).
 */
export function capexToOpex(item) {
  return {
    ...createOpexItem(),
    category: item.category || "",
    name: item.name || "",
    costPerOccurrence:
      item.qty != null && item.unitPrice != null
        ? item.qty * item.unitPrice * (1 - (item.discountPct || 0))
        : null,
    startYear: 1,
  };
}

/** Move an OPEX line to CAPEX as a single unit at the occurrence cost. */
export function opexToCapex(item) {
  return {
    ...createCapexItem(),
    category: item.category || "",
    name: item.name || "",
    qty: item.costPerOccurrence != null ? 1 : null,
    unitPrice: item.costPerOccurrence,
  };
}

// ---------------------------------------------------------------------------
// Spreadsheet templates. Parsing is positional (row 0 = header) so users can
// rename headers freely; percent columns are humans-facing (7 = 7%).
// ---------------------------------------------------------------------------

export const CAPEX_HEADERS = [
  "หมวด",
  "รายการ",
  "สเปก",
  "จำนวน",
  "หน่วย",
  "ราคาต่อหน่วย",
  "ส่วนลด (%)",
  "VAT (%)",
  "ปีเปลี่ยนอุปกรณ์",
  "รอบซ้ำ",
  "ค่าเปลี่ยน (%)",
];

export const OPEX_HEADERS = [
  "หมวด",
  "รายการ",
  "ค่าใช้จ่ายต่อครั้ง",
  "เพิ่มขึ้น (%/ปี)",
  "ปีเริ่ม",
  "ปีสิ้นสุด",
  "ทุกๆ N ปี",
];

export const PROFILE_HEADERS = ["เดือน", "โหลด (kWh)", "PV (kWh)"];

const num = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const pct = (v) => {
  const n = num(v);
  return n === null ? null : n / 100;
};
const str = (v) => (v === null || v === undefined ? "" : String(v).trim());
const isEmptyRow = (row) =>
  !row || row.every((c) => c === null || c === undefined || String(c).trim() === "");

/** rows (incl. header row) -> CAPEX items; blank/garbage rows are skipped. */
export function parseCapexAoa(aoa) {
  return aoa
    .slice(1)
    .filter((row) => !isEmptyRow(row))
    .map((row) => ({
      ...createCapexItem(),
      category: str(row[0]),
      name: str(row[1]),
      spec: str(row[2]),
      qty: num(row[3]),
      unit: str(row[4]),
      unitPrice: num(row[5]),
      discountPct: pct(row[6]),
      vatPct: pct(row[7]),
      replacementYear: num(row[8]),
      replacementCycles: num(row[9]),
      replacementPct: pct(row[10]),
    }))
    .filter((item) => item.name !== "" || item.unitPrice !== null);
}

export function parseOpexAoa(aoa) {
  return aoa
    .slice(1)
    .filter((row) => !isEmptyRow(row))
    .map((row) => ({
      ...createOpexItem(),
      category: str(row[0]),
      name: str(row[1]),
      costPerOccurrence: num(row[2]),
      escalationPct: pct(row[3]),
      startYear: num(row[4]),
      endYear: num(row[5]),
      everyNYears: num(row[6]),
    }))
    .filter((item) => item.name !== "" || item.costPerOccurrence !== null);
}

/** rows -> 12-month profile; months clamped to 1..12, extra rows dropped. */
export function parseProfileAoa(aoa) {
  const rows = aoa
    .slice(1)
    .filter((row) => !isEmptyRow(row))
    .slice(0, 12);
  return rows.map((row, i) => ({
    month: num(row[0]) ?? i + 1,
    loadKwh: num(row[1]),
    pvKwh: num(row[2]),
  }));
}

const out = (v) => (v === null || v === undefined ? "" : v);
const outPct = (v) => (v === null || v === undefined ? "" : v * 100);

export function serializeCapexAoa(items) {
  return [
    CAPEX_HEADERS,
    ...items.map((i) => [
      out(i.category),
      out(i.name),
      out(i.spec),
      out(i.qty),
      out(i.unit),
      out(i.unitPrice),
      outPct(i.discountPct),
      outPct(i.vatPct),
      out(i.replacementYear),
      out(i.replacementCycles),
      outPct(i.replacementPct),
    ]),
  ];
}

export function serializeOpexAoa(items) {
  return [
    OPEX_HEADERS,
    ...items.map((i) => [
      out(i.category),
      out(i.name),
      out(i.costPerOccurrence),
      outPct(i.escalationPct),
      out(i.startYear),
      out(i.endYear),
      out(i.everyNYears),
    ]),
  ];
}

export function serializeProfileAoa(profile) {
  const rows = profile ?? emptyMonthlyProfile();
  return [
    PROFILE_HEADERS,
    ...rows.map((m) => [m.month, out(m.loadKwh), out(m.pvKwh)]),
  ];
}

export function emptyMonthlyProfile() {
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    loadKwh: null,
    pvKwh: null,
  }));
}
