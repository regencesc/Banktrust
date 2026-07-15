import { describe, it, expect } from "vitest";
import { buildDebtSchedule, npvAt, solveIrr } from "./finance.js";
import { computeProject } from "./calculations.js";

// ---------------------------------------------------------------------------
// Legacy parity project: maps the old defaultAssumptions reference case
// (systemSize=5, selfConsumptionRatio=0.9, capexPerKw=30000, retailRate=4.4,
// projectDiscountRate=0.07) onto the new Project data model. Must reproduce
// the Excel-validated numbers: NPV≈166,601 / IRR≈20.1% / LCOE≈2.34.
// ---------------------------------------------------------------------------
function legacyReferenceProject(overrides = {}) {
  return {
    projectLife: 25,
    system: {
      panelWp: 500,
      panelCount: 10, // -> 5 kWp
      batteryKwh: 0,
    },
    energy: {
      mode: "annual",
      specificYield: 0.17 * 8760, // capacityFactor 0.17
      availability: 1,
      systemLosses: 0,
      yieldIncludesLosses: true,
      degradation: 0.005,
      loadYear1Kwh: null, // legacy model had no load concept
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
      vatRecoverable: false,
      capexItems: [
        {
          name: "ระบบโซลาร์ครบชุด",
          qty: 1,
          unitPrice: 150000, // 5 kW × 30,000
          discountPct: 0,
          vatPct: 0,
          replacementYear: 12,
          replacementCycles: 1,
          replacementPct: 0.15, // inverter share of CAPEX
        },
      ],
      opexItems: [
        {
          name: "O&M",
          costPerOccurrence: 3000, // 2% of CAPEX
          escalationPct: 0,
          startYear: 1,
          endYear: 25,
          everyNYears: 1,
        },
      ],
    },
    finance: {
      discountRate: 0.07,
      taxMode: "personal",
      personalTaxBracket: 0.15,
      personalDeductionCap: 200000,
      decommissioningPct: 0,
      otherIncomeY1: 0,
      otherIncomeGrowth: 0,
      loanEnabled: false,
      debtRatio: 0.5,
      interestRate: 0.03,
      loanTerm: 3,
      gracePeriod: 1,
      ...overrides.finance,
    },
    ...Object.fromEntries(
      Object.entries(overrides).filter(([k]) => k !== "finance")
    ),
  };
}

describe("legacy parity — personal mode reproduces the Excel reference", () => {
  const result = computeProject(legacyReferenceProject());

  it("projectNpv ≈ 166,601", () => {
    expect(result.metrics.projectNpv).toBeCloseTo(166601, -1);
  });

  it("projectIrr ≈ 20.1%", () => {
    expect(result.metrics.projectIrr).toBeCloseTo(0.201, 3);
  });

  it("lcoe ≈ 2.34", () => {
    expect(result.metrics.lcoe).toBeCloseTo(2.34, 2);
  });

  it("cash-only: minDscr is null and equity CF equals project CF", () => {
    expect(result.metrics.minDscr).toBeNull();
    for (const r of result.rows) {
      expect(r.equityCF).toBeCloseTo(r.projectCF, 6);
    }
  });
});

describe("buildDebtSchedule", () => {
  it("charges interest only during grace, then a level annuity", () => {
    const rows = buildDebtSchedule({
      principal: 100000,
      interestRate: 0.05,
      loanTerm: 5,
      gracePeriod: 2,
    });
    expect(rows).toHaveLength(5);
    // grace years: interest only, principal untouched
    expect(rows[0].payment).toBeCloseTo(5000, 6);
    expect(rows[0].principalPaid).toBe(0);
    expect(rows[1].closing).toBe(100000);
    // repayment years: equal payments
    expect(rows[2].payment).toBeCloseTo(rows[3].payment, 6);
    expect(rows[3].payment).toBeCloseTo(rows[4].payment, 6);
    // fully amortized at the end
    expect(rows[4].closing).toBeCloseTo(0, 6);
  });

  it("splits principal evenly at zero interest", () => {
    const rows = buildDebtSchedule({
      principal: 90000,
      interestRate: 0,
      loanTerm: 3,
      gracePeriod: 0,
    });
    expect(rows.map((r) => r.principalPaid)).toEqual([30000, 30000, 30000]);
  });

  it("returns empty schedule without principal", () => {
    expect(buildDebtSchedule({ principal: 0, loanTerm: 3 })).toEqual([]);
  });
});

describe("loan financing", () => {
  const project = legacyReferenceProject({
    finance: { loanEnabled: true },
  });
  const result = computeProject(project);

  it("splits CAPEX into debt and equity", () => {
    expect(result.debt).toBeCloseTo(75000, 6);
    expect(result.equity).toBeCloseTo(75000, 6);
    expect(result.rows[0].equityCF).toBeCloseTo(-75000, 6);
    expect(result.rows[0].projectCF).toBeCloseTo(-150000, 6);
  });

  it("produces DSCR only in debt-service years", () => {
    expect(result.rows[1].dscr).not.toBeNull();
    expect(result.rows[3].dscr).not.toBeNull();
    expect(result.rows[4].dscr).toBeNull();
    expect(result.metrics.minDscr).not.toBeNull();
  });

  it("project CF is unaffected by financing", () => {
    const cash = computeProject(legacyReferenceProject());
    for (let t = 0; t < result.rows.length; t++) {
      expect(result.rows[t].projectCF).toBeCloseTo(cash.rows[t].projectCF, 6);
    }
  });
});

describe("corporate tax mode", () => {
  function corporateProject(overrides = {}) {
    return legacyReferenceProject({
      finance: {
        taxMode: "corporate",
        corporateTaxRate: 0.2,
        depreciationYears: 5,
        depreciableBasisPct: 1,
        decommissioningPct: 0,
        ...overrides,
      },
    });
  }

  it("depreciates straight-line over depreciationYears", () => {
    const r = computeProject(corporateProject());
    expect(r.rows[1].depreciation).toBeCloseTo(30000, 6); // 150k / 5
    expect(r.rows[5].depreciation).toBeCloseTo(30000, 6);
    expect(r.rows[6].depreciation).toBe(0);
  });

  it("pays no tax while depreciation shelters income (no carry-forward)", () => {
    const r = computeProject(corporateProject());
    // years 1-5: EBITDA ≈ 28,124 < dep 30,000 → fully sheltered, zero tax
    for (let t = 1; t <= 5; t++) expect(r.rows[t].tax).toBe(0);
    // after depreciation ends, tax = EBITDA × 20%
    const y6 = r.rows[6];
    expect(y6.tax).toBeCloseTo(y6.ebitda * 0.2, 6);
  });

  it("interest shield: taxed equity CF benefits from deductible interest", () => {
    // spread depreciation over 10y so year-1 income is taxable (dep 15,000)
    const noLoan = computeProject(corporateProject({ depreciationYears: 10 }));
    const withLoan = computeProject(
      corporateProject({ depreciationYears: 10, loanEnabled: true })
    );
    expect(noLoan.rows[1].tax).toBeGreaterThan(0);
    // during debt years, taxable income is lower with the loan
    expect(withLoan.rows[1].tax).toBeLessThan(noLoan.rows[1].tax);
    // but project-level CF ignores the interest shield entirely
    expect(withLoan.rows[1].projectCF).toBeCloseTo(noLoan.rows[1].projectCF, 6);
  });

  it("deducts decommissioning in the final year only", () => {
    const r = computeProject(corporateProject({ decommissioningPct: 0.05 }));
    const base = computeProject(corporateProject());
    expect(r.rows[25].decommissioning).toBeCloseTo(7500, 6);
    expect(r.rows[25].projectCF).toBeCloseTo(base.rows[25].projectCF - 7500, 6);
    expect(r.rows[24].decommissioning).toBe(0);
  });

  it("adds other income with its own growth", () => {
    const r = computeProject(
      corporateProject({ otherIncomeY1: 1000, otherIncomeGrowth: 0.1 })
    );
    const base = computeProject(corporateProject());
    expect(r.rows[1].ebitda - base.rows[1].ebitda).toBeCloseTo(1000, 6);
    expect(r.rows[3].ebitda - base.rows[3].ebitda).toBeCloseTo(1210, 4);
  });
});

describe("payback metrics", () => {
  const result = computeProject(legacyReferenceProject());

  it("simple payback matches the cumulative crossover row", () => {
    const pb = result.metrics.simplePayback;
    const yr = Math.floor(pb);
    expect(result.rows[yr].cumulativeEquityCF).toBeLessThan(0);
    expect(result.rows[yr + 1].cumulativeEquityCF).toBeGreaterThanOrEqual(0);
  });

  it("discounted payback is longer than simple payback", () => {
    expect(result.metrics.discountedPayback).toBeGreaterThan(
      result.metrics.simplePayback
    );
  });
});

describe("battery neutrality end-to-end", () => {
  it("batteryKwh=0 yields metrics identical to no battery field", () => {
    const withZero = computeProject(legacyReferenceProject());
    const project = legacyReferenceProject();
    delete project.system.batteryKwh;
    const without = computeProject(project);
    expect(withZero.metrics).toEqual(without.metrics);
    expect(withZero.rows).toEqual(without.rows);
  });
});

describe("npvAt / solveIrr sanity", () => {
  it("npv of a simple stream", () => {
    expect(npvAt(0.1, [-100, 110])).toBeCloseTo(0, 10);
  });

  it("irr of a known stream", () => {
    expect(solveIrr([-100, 0, 121])).toBeCloseTo(0.1, 4);
  });

  it("no sign change -> null", () => {
    expect(solveIrr([100, 10, 10])).toBeNull();
  });

  it("all-zero stream -> null (empty-project regression)", () => {
    expect(solveIrr([0, 0, 0])).toBeNull();
    expect(solveIrr([-100, 0, 0])).toBeNull();
  });
});
