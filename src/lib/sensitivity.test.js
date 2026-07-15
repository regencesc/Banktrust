import { describe, it, expect } from "vitest";
import { computeProject } from "./calculations.js";
import {
  applyShock,
  buildSensitivityGrid,
  findBreakEvens,
  buildScenarios,
} from "./sensitivity.js";

// Profitable base project (same shape as the legacy reference case).
const baseProject = {
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

describe("applyShock", () => {
  it("does not mutate the original project", () => {
    const before = JSON.stringify(baseProject);
    applyShock(baseProject, { yieldMult: 0.5, capexMult: 2, tariffMult: 1.3 });
    expect(JSON.stringify(baseProject)).toBe(before);
  });

  it("scales monthly profile pv in interval mode", () => {
    const project = structuredClone(baseProject);
    project.energy.mode = "interval";
    project.energy.monthlyProfile = [{ month: 1, loadKwh: 100, pvKwh: 200 }];
    const shocked = applyShock(project, { yieldMult: 1.1 });
    expect(shocked.energy.monthlyProfile[0].pvKwh).toBeCloseTo(220, 6);
    expect(shocked.energy.monthlyProfile[0].loadKwh).toBe(100);
  });
});

describe("buildSensitivityGrid", () => {
  const grid = buildSensitivityGrid(baseProject);

  it("is 5×5 with the base case at the center", () => {
    expect(grid).toHaveLength(5);
    expect(grid[2].cells).toHaveLength(5);
    const base = computeProject(baseProject).metrics.equityNpv;
    expect(grid[2].cells[2].equityNpv).toBeCloseTo(base, 4);
  });

  it("NPV rises with yield and falls with CAPEX", () => {
    // fix capex column, walk yield rows
    for (let i = 1; i < 5; i++) {
      expect(grid[i].cells[2].equityNpv).toBeGreaterThan(
        grid[i - 1].cells[2].equityNpv
      );
    }
    // fix yield row, walk capex columns
    for (let j = 1; j < 5; j++) {
      expect(grid[2].cells[j].equityNpv).toBeLessThan(
        grid[2].cells[j - 1].equityNpv
      );
    }
  });
});

describe("findBreakEvens", () => {
  const be = findBreakEvens(baseProject);

  it("break-even tariff multiplier drives NPV to ~0", () => {
    expect(be.tariffMultiplier).not.toBeNull();
    expect(be.tariffMultiplier).toBeLessThan(1); // profitable base → below 1
    const shocked = applyShock(baseProject, { tariffMult: be.tariffMultiplier });
    expect(
      Math.abs(computeProject(shocked).metrics.equityNpv)
    ).toBeLessThan(1);
  });

  it("break-even import rate is below the current rate for a profitable project", () => {
    expect(be.importRate).not.toBeNull();
    expect(be.importRate).toBeLessThan(4.4);
    const shocked = applyShock(baseProject, { importRate: be.importRate });
    expect(
      Math.abs(computeProject(shocked).metrics.equityNpv)
    ).toBeLessThan(1);
  });

  it("max CAPEX multiplier is above 1 for a profitable project", () => {
    expect(be.maxCapexMultiplier).not.toBeNull();
    expect(be.maxCapexMultiplier).toBeGreaterThan(1);
    const shocked = applyShock(baseProject, { capexMult: be.maxCapexMultiplier });
    expect(
      Math.abs(computeProject(shocked).metrics.equityNpv)
    ).toBeLessThan(1);
  });

  it("returns null when there is no break-even in range", () => {
    // a project with zero revenue can never reach NPV 0 via capex changes
    const dead = structuredClone(baseProject);
    dead.energy.importRate = 0;
    dead.energy.exportRate = 0;
    const result = findBreakEvens(dead);
    expect(result.maxCapexMultiplier).toBeNull();
  });
});

describe("buildScenarios", () => {
  it("orders downside ≤ base ≤ upside on equity NPV", () => {
    const [down, base, up] = buildScenarios(baseProject);
    expect(down.name).toBe("downside");
    expect(up.name).toBe("upside");
    expect(down.equityNpv).toBeLessThan(base.equityNpv);
    expect(base.equityNpv).toBeLessThan(up.equityNpv);
  });

  it("base scenario equals the unshocked project", () => {
    const [, base] = buildScenarios(baseProject);
    expect(base.equityNpv).toBeCloseTo(
      computeProject(baseProject).metrics.equityNpv,
      6
    );
  });
});
