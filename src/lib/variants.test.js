import { describe, it, expect } from "vitest";
import {
  createVariant,
  variantToProject,
  isVariantReady,
  evaluateVariant,
  compareVariants,
} from "./variants.js";
import { computeProject } from "./calculations.js";

// Base project supplying energy/finance assumptions (reference case).
const baseProject = {
  projectLife: 25,
  name: "โครงการหลัก",
  system: { panelWp: 500, panelCount: 10, batteryKwh: null, batteryDoD: null, batteryRTE: null },
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
    monthlyProfile: null,
    usePvFromProfile: true,
    importRate: 4.4,
    exportRate: 2.2,
    tariffEscalation: 0,
    exportTermYears: 10,
    exportCapKw: 5,
    demandChargeSavings: 0,
  },
  costs: {
    vatRecoverable: false,
    capexItems: [{ qty: 1, unitPrice: 150000, vatPct: 0 }],
    opexItems: [{ costPerOccurrence: 3000, startYear: 1, endYear: 25 }],
  },
  finance: {
    discountRate: 0.07,
    taxMode: "personal",
    personalTaxBracket: 0.15,
    personalDeductionCap: 200000,
    loanEnabled: false,
  },
  variants: [],
};

function readyVariant(overrides = {}) {
  return {
    ...createVariant(),
    name: "แพ็กเกจ A",
    pvKw: 5,
    quotedPrice: 150000,
    opexPerYear: 3000,
    replacementYear: 12,
    replacementPct: 0.15,
    ...overrides,
  };
}

describe("variantToProject", () => {
  it("sizes the system from pvKw (fractional sizes included)", () => {
    const p = variantToProject(baseProject, readyVariant({ pvKw: 5.5 }));
    expect((p.system.panelWp * p.system.panelCount) / 1000).toBeCloseTo(5.5, 10);
  });

  it("maps the quote into a single CAPEX item and yearly OPEX", () => {
    const p = variantToProject(baseProject, readyVariant());
    expect(p.costs.capexItems).toHaveLength(1);
    expect(p.costs.capexItems[0].unitPrice).toBe(150000);
    expect(p.costs.capexItems[0].replacementYear).toBe(12);
    expect(p.costs.opexItems[0].costPerOccurrence).toBe(3000);
  });

  it("does not mutate the base project and strips nested variants", () => {
    const before = JSON.stringify(baseProject);
    const p = variantToProject(baseProject, readyVariant());
    expect(JSON.stringify(baseProject)).toBe(before);
    expect(p.variants).toEqual([]);
  });

  it("forces parametric PV so interval profiles scale with package size", () => {
    const p = variantToProject(baseProject, readyVariant());
    expect(p.energy.usePvFromProfile).toBe(false);
  });
});

describe("evaluateVariant", () => {
  it("a package identical to the reference case reproduces its metrics", () => {
    const e = evaluateVariant(baseProject, readyVariant());
    // same size/price/opex/replacement as the legacy reference project
    expect(e.metrics.projectNpv).toBeCloseTo(166601, -1);
    expect(e.metrics.projectIrr).toBeCloseTo(0.201, 3);
    expect(e.pricePerKw).toBeCloseTo(30000, 6);
    expect(e.valueYear1).toBeGreaterThan(0);
    expect(e.score.total).toBeGreaterThanOrEqual(0);
  });

  it("battery in a package uses sensible DoD/RTE defaults", () => {
    const p = variantToProject(
      baseProject,
      readyVariant({ batteryKwh: 10 })
    );
    expect(p.system.batteryDoD).toBe(0.9);
    expect(p.system.batteryRTE).toBe(0.9);
    expect(computeProject(p).metrics.projectNpv).not.toBeNaN();
  });
});

describe("compareVariants", () => {
  it("skips unready packages", () => {
    const { evaluated } = compareVariants(baseProject, [
      createVariant(), // empty
      readyVariant({ pvKw: null }), // no size
      readyVariant(),
    ]);
    expect(evaluated).toHaveLength(1);
  });

  it("flags best NPV and fastest payback", () => {
    const cheap = readyVariant({ id: "cheap", name: "ถูก", quotedPrice: 120000 });
    const expensive = readyVariant({
      id: "big",
      name: "ใหญ่",
      pvKw: 10,
      quotedPrice: 320000,
    });
    const { evaluated, bestNpvId, fastestId } = compareVariants(baseProject, [
      cheap,
      expensive,
    ]);
    expect(evaluated).toHaveLength(2);
    // cheaper same-size package pays back faster
    expect(fastestId).toBe("cheap");
    expect(bestNpvId).not.toBeNull();
    const best = evaluated.find((e) => e.variant.id === bestNpvId);
    for (const e of evaluated) {
      expect(best.metrics.equityNpv).toBeGreaterThanOrEqual(e.metrics.equityNpv);
    }
  });

  it("isVariantReady requires both size and price", () => {
    expect(isVariantReady(readyVariant())).toBe(true);
    expect(isVariantReady(createVariant())).toBe(false);
  });
});
