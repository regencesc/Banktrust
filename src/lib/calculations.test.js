import { describe, it, expect } from "vitest";
import { defaultAssumptions, buildCashflow, computeMetrics, estimateSystemSize } from "./calculations.js";

describe("computeMetrics — reference case vs Excel workbook", () => {
  // ค่าอ้างอิงจาก CLAUDE.md: systemSize=5, selfConsumptionRatio=0.9, capexPerKw=30000,
  // retailRate=4.4, projectDiscountRate=0.07 (ค่าอื่นใช้ default) ต้องตรงกับชีต Outputs เดิม
  const a = { ...defaultAssumptions, selfConsumptionRatio: 0.9 };
  const m = computeMetrics(a);

  it("matches reference projectNpv", () => {
    expect(m.projectNpv).toBeCloseTo(166601, -1);
  });

  it("matches reference projectIrr", () => {
    expect(m.projectIrr).toBeCloseTo(0.201, 3);
  });

  it("matches reference lcoe", () => {
    expect(m.lcoe).toBeCloseTo(2.34, 2);
  });
});

describe("export cap (5kW hard cap per meter)", () => {
  it("does not curtail when uncapped export stays within the cap", () => {
    const a = { ...defaultAssumptions, systemSize: 5, selfConsumptionRatio: 0.4 };
    const { rows } = buildCashflow(a);
    expect(rows[1].curtailedEnergy).toBe(0);
  });

  it("curtails export energy above the cap once systemSize exceeds exportCapKw", () => {
    const a = { ...defaultAssumptions, systemSize: 10, selfConsumptionRatio: 0 };
    const { rows } = buildCashflow(a);
    const yieldPerKw = a.capacityFactor * 365 * 24;
    const exportCapEnergy = a.exportCapKw * yieldPerKw;

    expect(rows[1].curtailedEnergy).toBeGreaterThan(0);
    expect(rows[1].generation - rows[1].curtailedEnergy).toBeCloseTo(exportCapEnergy, 6);
    // revenue is earned only on the capped (non-curtailed) export energy
    expect(rows[1].exportRevenue).toBeCloseTo(exportCapEnergy * a.fitRate, 6);
  });
});

describe("FiT term cutoff", () => {
  it("pays export revenue through fitTerm and stops the year after", () => {
    const { rows } = buildCashflow(defaultAssumptions);
    expect(rows[defaultAssumptions.fitTerm].exportRevenue).toBeGreaterThan(0);
    expect(rows[defaultAssumptions.fitTerm + 1].exportRevenue).toBe(0);
  });
});

describe("cash-only financing (loanEnabled=false)", () => {
  const m = computeMetrics({ ...defaultAssumptions, loanEnabled: false });

  it("has no DSCR (no debt service to service)", () => {
    expect(m.minDscr).toBeNull();
    expect(m.rows.every((r) => r.dscr === null)).toBe(true);
  });

  it("has no debt service and equity CF equals project CF", () => {
    expect(m.rows.every((r) => r.debtService === 0)).toBe(true);
    expect(m.rows.every((r) => r.equityCF === r.projectCF)).toBe(true);
  });
});

describe("loan financing (loanEnabled=true)", () => {
  const a = { ...defaultAssumptions, loanEnabled: true };
  const m = computeMetrics(a);

  it("produces a finite minDscr across the debt service period", () => {
    expect(m.minDscr).not.toBeNull();
    expect(Number.isFinite(m.minDscr)).toBe(true);
  });

  it("charges debt service only during the loan tenor, not after", () => {
    const { rows } = buildCashflow(a);
    expect(rows[1].debtService).toBeGreaterThan(0);
    expect(rows[a.loanTenor].debtService).toBeGreaterThan(0);
    expect(rows[a.loanTenor + 1].debtService).toBe(0);
  });
});

describe("payback period", () => {
  it("lands where cumulative equity cashflow crosses from negative to non-negative", () => {
    const a = { ...defaultAssumptions, selfConsumptionRatio: 0.9 };
    const m = computeMetrics(a);
    const yr = Math.floor(m.paybackYears);
    expect(m.rows[yr].cumulativeEquityCF).toBeLessThan(0);
    expect(m.rows[yr + 1].cumulativeEquityCF).toBeGreaterThanOrEqual(0);
  });
});

describe("degradation and one-off costs", () => {
  it("generation declines year over year per the degradation rate", () => {
    const { rows } = buildCashflow(defaultAssumptions);
    expect(rows[2].generation).toBeLessThan(rows[1].generation);
    expect(rows[2].generation).toBeCloseTo(
      rows[1].generation * (1 - defaultAssumptions.degradation),
      6
    );
  });

  it("applies inverter replacement cost only in inverterReplacementYear", () => {
    const a = defaultAssumptions;
    const { rows, installCost } = buildCashflow(a);
    expect(rows[a.inverterReplacementYear].inverter).toBeCloseTo(
      installCost * a.inverterReplacementPct,
      6
    );
    expect(rows[a.inverterReplacementYear - 1].inverter).toBe(0);
    expect(rows[a.inverterReplacementYear + 1].inverter).toBe(0);
  });

  it("applies the tax deduction benefit only in year 1, capped at taxDeductionCap", () => {
    const a = { ...defaultAssumptions, capexPerKw: 1_000_000 }; // force installCost above cap
    const { rows, installCost } = buildCashflow(a);
    expect(installCost).toBeGreaterThan(a.taxDeductionCap);
    expect(rows[1].taxBenefit).toBeCloseTo(a.taxDeductionCap * a.taxBracket, 6);
    expect(rows[2].taxBenefit).toBe(0);
  });
});

describe("estimateSystemSize", () => {
  it("returns null for missing/zero usage", () => {
    expect(estimateSystemSize(0)).toBeNull();
    expect(estimateSystemSize(null)).toBeNull();
  });

  it("suggests a larger system for higher monthly usage", () => {
    const small = estimateSystemSize(200);
    const large = estimateSystemSize(800);
    expect(large).toBeGreaterThan(small);
  });

  it("rounds to the nearest 0.5 kW with a 1 kW minimum", () => {
    const size = estimateSystemSize(50);
    expect(size).toBeGreaterThanOrEqual(1);
    expect((size * 2) % 1).toBe(0); // multiple of 0.5
  });
});
