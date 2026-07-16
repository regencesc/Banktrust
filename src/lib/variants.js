// ============================================================================
// variants.js — quote-package (Variant) evaluation for the Comparison page
// (SPEC-UPGRADE.md §5.8). Each package runs through the exact same engine
// as the main project: the base project supplies energy/finance assumptions,
// the variant supplies size, battery and price. Pure JS.
// ============================================================================

import { newId } from "./state.js";
import { computeProject } from "./calculations.js";
import { computeScreeningScore } from "./scoring.js";

export function createVariant() {
  return {
    id: newId(),
    name: "",
    pvKw: null,
    batteryKwh: null,
    quotedPrice: null,
    opexPerYear: null,
    replacementYear: null,
    replacementPct: null,
  };
}

/**
 * Derive a full Project from base assumptions + one quote package.
 * - system size comes from pvKw (1000 Wp panels so panelCount = kW works
 *   for fractional sizes)
 * - interval profiles switch to parametric PV so the yield actually scales
 *   with the package size instead of replaying the base project's file
 */
export function variantToProject(baseProject, v) {
  const base = structuredClone(baseProject);
  return {
    ...base,
    name: v.name || base.name,
    system: {
      ...base.system,
      panelWp: 1000,
      panelCount: v.pvKw ?? 0,
      inverterAcKw: null,
      batteryKwh: v.batteryKwh ?? 0,
      batteryDoD: base.system.batteryDoD ?? 0.9,
      batteryRTE: base.system.batteryRTE ?? 0.9,
    },
    energy: { ...base.energy, usePvFromProfile: false },
    costs: {
      vatRecoverable: base.costs?.vatRecoverable ?? false,
      capexItems: [
        {
          id: `${v.id}-capex`,
          kind: "capex",
          name: v.name || "แพ็กเกจ",
          qty: 1,
          unitPrice: v.quotedPrice ?? 0,
          discountPct: null,
          vatPct: null,
          replacementYear: v.replacementYear,
          replacementCycles: v.replacementYear ? 1 : null,
          replacementPct: v.replacementPct,
        },
      ],
      opexItems:
        v.opexPerYear != null
          ? [
              {
                id: `${v.id}-opex`,
                name: "OPEX",
                costPerOccurrence: v.opexPerYear,
                escalationPct: null,
                startYear: 1,
                endYear: null,
                everyNYears: 1,
              },
            ]
          : [],
    },
    variants: [],
  };
}

/** A variant is comparable once it has a size and a quoted price. */
export function isVariantReady(v) {
  return v.pvKw > 0 && v.quotedPrice > 0;
}

export function evaluateVariant(baseProject, variant) {
  const project = variantToProject(baseProject, variant);
  const result = computeProject(project);
  const year1 = result.energySeries[0];
  return {
    variant,
    metrics: result.metrics,
    pricePerKw: isVariantReady(variant) ? variant.quotedPrice / variant.pvKw : null,
    valueYear1: year1.savings + year1.exportRevenue,
    score: computeScreeningScore(project, result),
  };
}

/**
 * Evaluate every ready package and flag the best-NPV and fastest-payback
 * winners (§5.8 ribbon + tag).
 */
export function compareVariants(baseProject, variants = []) {
  const evaluated = variants.filter(isVariantReady).map((v) =>
    evaluateVariant(baseProject, v)
  );

  let bestNpvId = null;
  let fastestId = null;
  for (const e of evaluated) {
    if (
      e.metrics.equityNpv !== null &&
      (bestNpvId === null ||
        e.metrics.equityNpv >
          evaluated.find((x) => x.variant.id === bestNpvId).metrics.equityNpv)
    ) {
      bestNpvId = e.variant.id;
    }
    if (
      e.metrics.simplePayback !== null &&
      (fastestId === null ||
        e.metrics.simplePayback <
          evaluated.find((x) => x.variant.id === fastestId).metrics.simplePayback)
    ) {
      fastestId = e.variant.id;
    }
  }
  return { evaluated, bestNpvId, fastestId };
}
