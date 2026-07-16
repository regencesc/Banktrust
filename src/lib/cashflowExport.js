// ============================================================================
// cashflowExport.js — merge finance rows with the energy series into the
// full Cash Flow table (SPEC-UPGRADE.md §5.6) and serialize it for CSV
// export (Hard Rule 7). Pure JS.
// ============================================================================

/**
 * One merged row per project year (year 0..life) with every column the
 * Cash Flow page shows. Cumulative uses equity cashflow.
 */
export function mergeCashflowRows(result) {
  return result.rows.map((r) => {
    const e = r.year >= 1 ? result.energySeries[r.year - 1] : null;
    return {
      year: r.year,
      grossYield: e?.grossYield ?? 0,
      selfUse: e?.selfUse ?? 0,
      exportEnergy: e?.exportEnergy ?? 0,
      savings: e?.savings ?? 0,
      exportRevenue: e?.exportRevenue ?? 0,
      opex: r.opex,
      replacement: r.replacement,
      interest: r.interest,
      principalPaid: r.principalPaid,
      tax: r.tax,
      equityCF: r.equityCF,
      cumulative: r.cumulativeEquityCF,
      dscr: r.dscr,
    };
  });
}

/** Year whose cumulative equity CF first turns non-negative (payback year). */
export function paybackYearOf(rows) {
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].cumulative >= 0 && rows[i - 1].cumulative < 0) {
      return rows[i].year;
    }
  }
  return null;
}

export const CASHFLOW_HEADERS = [
  "ปี",
  "ผลิตไฟฟ้า (kWh)",
  "ใช้เอง (kWh)",
  "ส่งออก (kWh)",
  "ประหยัดค่าไฟ (฿)",
  "รายได้ขายไฟ (฿)",
  "OPEX (฿)",
  "เปลี่ยนอุปกรณ์ (฿)",
  "ดอกเบี้ย (฿)",
  "เงินต้น (฿)",
  "ภาษี (฿)",
  "Equity CF (฿)",
  "สะสม (฿)",
  "DSCR",
];

const round2 = (v) => Math.round(v * 100) / 100;

/** Full table as array-of-arrays for CSV download. */
export function buildCashflowAoa(result) {
  const rows = mergeCashflowRows(result);
  return [
    CASHFLOW_HEADERS,
    ...rows.map((r) => [
      r.year,
      round2(r.grossYield),
      round2(r.selfUse),
      round2(r.exportEnergy),
      round2(r.savings),
      round2(r.exportRevenue),
      round2(r.opex),
      round2(r.replacement),
      round2(r.interest),
      round2(r.principalPaid),
      round2(r.tax),
      round2(r.equityCF),
      round2(r.cumulative),
      r.dscr === null ? "" : round2(r.dscr),
    ]),
  ];
}
