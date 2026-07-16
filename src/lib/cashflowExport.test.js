import { describe, it, expect } from "vitest";
import { computeProject } from "./calculations.js";
import {
  mergeCashflowRows,
  paybackYearOf,
  buildCashflowAoa,
  CASHFLOW_HEADERS,
} from "./cashflowExport.js";

// Legacy reference project: NPV≈166,601 / payback ≈ 4.58 years.
const project = {
  projectLife: 25,
  system: { panelWp: 500, panelCount: 10, batteryKwh: 0 },
  energy: {
    mode: "annual",
    specificYield: 1489.2,
    availability: 1,
    systemLosses: 0,
    yieldIncludesLosses: true,
    degradation: 0.005,
    loadYear1Kwh: null,
    loadGrowth: 0,
    selfConsumptionPct: 0.9,
    importRate: 4.4,
    exportRate: 2.2,
    tariffEscalation: 0,
    exportTermYears: 10,
    exportCapKw: 5,
    demandChargeSavings: 0,
  },
  costs: {
    capexItems: [
      { qty: 1, unitPrice: 150000, vatPct: 0, replacementYear: 12, replacementPct: 0.15 },
    ],
    opexItems: [{ costPerOccurrence: 3000, startYear: 1, endYear: 25 }],
  },
  finance: {
    discountRate: 0.07,
    taxMode: "personal",
    personalTaxBracket: 0.15,
    personalDeductionCap: 200000,
    loanEnabled: false,
  },
};

const result = computeProject(project);

describe("mergeCashflowRows", () => {
  const rows = mergeCashflowRows(result);

  it("produces year 0..life with energy columns joined", () => {
    expect(rows).toHaveLength(26);
    expect(rows[0]).toMatchObject({
      year: 0,
      grossYield: 0,
      equityCF: -150000,
      cumulative: -150000,
    });
    expect(rows[1].grossYield).toBeCloseTo(7446, 6);
    expect(rows[1].selfUse).toBeCloseTo(7446 * 0.9, 6);
    expect(rows[1].opex).toBeCloseTo(3000, 6);
  });

  it("keeps replacement and tax in their years", () => {
    expect(rows[12].replacement).toBeCloseTo(22500, 6);
    expect(rows[1].tax).toBeCloseTo(-22500, 6); // personal benefit as negative tax
  });
});

describe("paybackYearOf", () => {
  it("finds the year cumulative flips non-negative", () => {
    const rows = mergeCashflowRows(result);
    expect(paybackYearOf(rows)).toBe(5); // payback ≈ 4.58 -> flips during year 5
    expect(rows[5].cumulative).toBeGreaterThanOrEqual(0);
    expect(rows[4].cumulative).toBeLessThan(0);
  });

  it("returns null when it never pays back", () => {
    const dead = computeProject({
      ...project,
      costs: { ...project.costs, capexItems: [{ qty: 1, unitPrice: 9e6, vatPct: 0 }] },
    });
    expect(paybackYearOf(mergeCashflowRows(dead))).toBeNull();
  });
});

describe("buildCashflowAoa", () => {
  const aoa = buildCashflowAoa(result);

  it("has the header plus one row per year", () => {
    expect(aoa).toHaveLength(27);
    expect(aoa[0]).toEqual(CASHFLOW_HEADERS);
    expect(aoa[0]).toHaveLength(14);
    expect(aoa[1][0]).toBe(0);
    expect(aoa[26][0]).toBe(25);
  });

  it("rounds numbers and blanks null DSCR", () => {
    expect(aoa[1][12]).toBe(-150000); // cumulative year 0
    expect(aoa[2][13]).toBe(""); // no debt -> DSCR blank
    // every numeric cell has at most 2 decimals
    const decimals = (v) =>
      typeof v === "number" && !Number.isInteger(v)
        ? String(v).split(".")[1].length
        : 0;
    for (const row of aoa.slice(1)) {
      for (const cell of row) expect(decimals(cell)).toBeLessThanOrEqual(2);
    }
  });
});
