import { describe, it, expect } from "vitest";
import { computeProject } from "./calculations.js";
import { buildRiskChecks } from "./riskChecks.js";

// Complete, profitable reference project (annual screening mode).
function baseProject(overrides = {}) {
  return {
    projectLife: 25,
    system: {
      panelWp: 500,
      panelCount: 10,
      inverterAcKw: 4,
      batteryKwh: 0,
      ...overrides.system,
    },
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
      monthlyProfile: null,
      importRate: 4.4,
      exportRate: 2.2,
      tariffEscalation: 0,
      exportTermYears: 10,
      exportCapKw: 5,
      demandChargeSavings: 0,
      ...overrides.energy,
    },
    costs: {
      capexItems: [{ qty: 1, unitPrice: 150000, vatPct: 0 }],
      opexItems: [{ costPerOccurrence: 3000, startYear: 1, endYear: 25 }],
      ...overrides.costs,
    },
    finance: {
      discountRate: 0.07,
      taxMode: "personal",
      personalTaxBracket: 0.15,
      personalDeductionCap: 200000,
      loanEnabled: false,
      ...overrides.finance,
    },
  };
}

const checksFor = (project) => buildRiskChecks(project, computeProject(project));
const ids = (checks) => checks.map((c) => c.id);

describe("buildRiskChecks", () => {
  it("complete healthy project reports only the screening-mode note", () => {
    const checks = checksFor(baseProject());
    expect(ids(checks)).toEqual(["screeningMode"]);
    expect(checks[0].level).toBe("info");
  });

  it("flags incomplete data with the missing check ids", () => {
    const project = baseProject();
    project.energy.importRate = null;
    project.costs.capexItems = [];
    const checks = checksFor(project);
    const item = checks.find((c) => c.id === "dataIncomplete");
    expect(item.params[0]).toBe(2);
    expect(item.missingIds).toEqual(["tariff", "costs"]);
  });

  it("flags a missing discount rate", () => {
    const project = baseProject({ finance: { discountRate: null } });
    expect(ids(checksFor(project))).toContain("discountRateMissing");
  });

  it("flags DSCR below target as danger, sorted first", () => {
    // tiny savings + big loan -> weak coverage
    const project = baseProject({
      energy: { selfConsumptionPct: 0.1, exportRate: 0.5 },
      finance: {
        loanEnabled: true,
        debtRatio: 0.8,
        interestRate: 0.07,
        loanTerm: 5,
        gracePeriod: 0,
        minDscrTarget: 1.3,
      },
    });
    const checks = checksFor(project);
    expect(ids(checks)).toContain("dscrBelowTarget");
    expect(checks[0].level).toBe("danger");
  });

  it("does not flag DSCR when the loan is disabled", () => {
    expect(ids(checksFor(baseProject()))).not.toContain("dscrBelowTarget");
  });

  it("flags an unusual DC/AC ratio (5 kWp on a 2 kW inverter = 2.5)", () => {
    const project = baseProject({ system: { inverterAcKw: 2 } });
    const item = checksFor(project).find((c) => c.id === "dcAcRatio");
    expect(item).toBeTruthy();
    expect(item.params[0]).toBeCloseTo(2.5, 6);
  });

  it("clears the screening note when a 12-month profile is in use", () => {
    const project = baseProject({
      energy: {
        mode: "interval",
        monthlyProfile: Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          loadKwh: 1000,
          pvKwh: 620,
        })),
      },
    });
    expect(ids(checksFor(project))).not.toContain("screeningMode");
  });

  it("flags curtailment when the export cap binds", () => {
    const project = baseProject({
      system: { panelWp: 500, panelCount: 40, inverterAcKw: 16 }, // 20 kWp
      energy: { selfConsumptionPct: 0.1, loadYear1Kwh: null },
    });
    const item = checksFor(project).find((c) => c.id === "curtailment");
    expect(item).toBeTruthy();
    expect(item.params[0]).toBeGreaterThan(0);
  });

  it("flags a project that never pays back as danger", () => {
    const project = baseProject({
      costs: { capexItems: [{ qty: 1, unitPrice: 5000000, vatPct: 0 }] },
    });
    expect(ids(checksFor(project))).toContain("neverPaysBack");
  });
});
