import { describe, it, expect } from "vitest";
import { computeProject } from "./calculations.js";
import { computeScreeningScore, verdictFor, dataChecks } from "./scoring.js";

// Strong project: the legacy reference case (IRR ~20%, payback ~4.6y, NPV > 0)
const goodProject = {
  projectLife: 25,
  system: { panelWp: 500, panelCount: 10, batteryKwh: 0 },
  energy: {
    mode: "annual",
    specificYield: 1489.2,
    availability: 1,
    systemLosses: 0,
    yieldIncludesLosses: true,
    degradation: 0.005,
    loadYear1Kwh: 12000,
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

// Weak project: same system but wildly overpriced → negative NPV, no payback
function badProject() {
  const p = structuredClone(goodProject);
  p.costs.capexItems[0].unitPrice = 2000000;
  return p;
}

describe("computeScreeningScore", () => {
  it("scores a strong project ≥ 80 with the 'good' verdict", () => {
    const result = computeProject(goodProject);
    const score = computeScreeningScore(goodProject, result);
    expect(score.total).toBeGreaterThanOrEqual(80);
    expect(score.verdict.level).toBe("good");
  });

  it("scores an unprofitable project < 50 with the 'poor' verdict", () => {
    const p = badProject();
    const result = computeProject(p);
    const score = computeScreeningScore(p, result);
    expect(score.total).toBeLessThan(50);
    expect(score.verdict.level).toBe("poor");
    expect(score.breakdown.npv).toBe(0);
    expect(score.breakdown.payback).toBe(0);
  });

  it("gives full DSCR marks without debt, scales with minDscr under debt", () => {
    const cash = computeScreeningScore(goodProject, computeProject(goodProject));
    expect(cash.breakdown.dscr).toBe(15);

    const loan = structuredClone(goodProject);
    loan.finance.loanEnabled = true;
    loan.finance.debtRatio = 0.5;
    loan.finance.interestRate = 0.03;
    loan.finance.loanTerm = 3;
    loan.finance.gracePeriod = 1;
    loan.finance.minDscrTarget = 1.2;
    const loanScore = computeScreeningScore(loan, computeProject(loan));
    expect(loanScore.breakdown.dscr).toBeGreaterThanOrEqual(0);
    expect(loanScore.breakdown.dscr).toBeLessThanOrEqual(15);
  });

  it("completeness reflects missing fundamentals", () => {
    const bare = {
      projectLife: 25,
      system: {},
      energy: {},
      costs: { capexItems: [], opexItems: [] },
      finance: { discountRate: 0.07, taxMode: "personal" },
    };
    const score = computeScreeningScore(bare, computeProject(bare));
    expect(score.breakdown.completeness).toBe(0);

    const full = computeScreeningScore(goodProject, computeProject(goodProject));
    expect(full.breakdown.completeness).toBe(10);
  });
});

describe("verdictFor bands", () => {
  it("maps totals to the three spec verdicts", () => {
    expect(verdictFor(80).level).toBe("good");
    expect(verdictFor(79).level).toBe("fair");
    expect(verdictFor(50).level).toBe("fair");
    expect(verdictFor(49).level).toBe("poor");
  });
});

describe("dataChecks", () => {
  it("passes all five checks on a fully specified project", () => {
    const checks = dataChecks(goodProject);
    expect(checks).toHaveLength(5);
    expect(checks.every((c) => c.ok)).toBe(true);
  });

  it("accepts an interval profile in place of specificYield and load", () => {
    const p = structuredClone(goodProject);
    p.energy.specificYield = null;
    p.energy.loadYear1Kwh = null;
    p.energy.monthlyProfile = [{ month: 1, loadKwh: 1000, pvKwh: 1200 }];
    const byId = Object.fromEntries(dataChecks(p).map((c) => [c.id, c.ok]));
    expect(byId.yield).toBe(true);
    expect(byId.load).toBe(true);
  });
});
