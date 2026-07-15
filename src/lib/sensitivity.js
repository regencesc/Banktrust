// ============================================================================
// sensitivity.js — 2D sensitivity grid, break-even solvers, scenarios
// (SPEC-UPGRADE.md §4.4). Pure JS, no React.
// ============================================================================

import { computeProject } from "./calculations.js";

/**
 * Returns a deep-adjusted copy of the project with multiplicative shocks
 * applied. Used by the grid, break-even solvers and scenarios so every
 * analysis runs through the exact same engine.
 */
export function applyShock(project, { yieldMult = 1, capexMult = 1, tariffMult = 1, importRate } = {}) {
  const shocked = structuredClone(project);

  if (yieldMult !== 1) {
    if (shocked.energy.specificYield != null) {
      shocked.energy.specificYield *= yieldMult;
    }
    if (Array.isArray(shocked.energy.monthlyProfile)) {
      for (const m of shocked.energy.monthlyProfile) m.pvKwh *= yieldMult;
    }
  }

  if (capexMult !== 1 && shocked.costs?.capexItems) {
    for (const item of shocked.costs.capexItems) item.unitPrice *= capexMult;
  }

  if (tariffMult !== 1) {
    shocked.energy.importRate *= tariffMult;
    shocked.energy.exportRate *= tariffMult;
  }

  if (importRate != null) {
    shocked.energy.importRate = importRate;
  }

  return shocked;
}

export const DEFAULT_STEPS = [-0.2, -0.1, 0, 0.1, 0.2];

/**
 * 5×5 grid: yield shock (rows) × CAPEX shock (columns) → Equity NPV.
 */
export function buildSensitivityGrid(project, steps = DEFAULT_STEPS) {
  return steps.map((dy) => ({
    yieldDelta: dy,
    cells: steps.map((dc) => {
      const r = computeProject(
        applyShock(project, { yieldMult: 1 + dy, capexMult: 1 + dc })
      );
      return { capexDelta: dc, equityNpv: r.metrics.equityNpv };
    }),
  }));
}

/** Generic bisection: find x in [lo, hi] where f(x) = 0. Null if no sign change. */
function bisect(f, lo, hi, iterations = 80, tolerance = 1e-4) {
  let flo = f(lo);
  let fhi = f(hi);
  if (!isFinite(flo) || !isFinite(fhi) || flo * fhi > 0) return null;
  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hi) / 2;
    const fmid = f(mid);
    if (Math.abs(fmid) < tolerance) return mid;
    if (flo * fmid < 0) {
      hi = mid;
    } else {
      lo = mid;
      flo = fmid;
    }
  }
  return (lo + hi) / 2;
}

const equityNpvOf = (project, shock) =>
  computeProject(applyShock(project, shock)).metrics.equityNpv;

/**
 * Break-even indicators (§4.4), each solved on the full engine:
 *  - tariffMultiplier: multiplier on both import/export rates where NPV = 0
 *  - importRate: absolute ฿/kWh import rate where NPV = 0
 *  - maxCapexMultiplier: CAPEX multiplier where NPV = 0
 * Any of them is null when no break-even exists in the searched range.
 */
export function findBreakEvens(project) {
  const baseImport = project.energy?.importRate || 0;
  return {
    tariffMultiplier: bisect(
      (m) => equityNpvOf(project, { tariffMult: m }),
      0.01,
      5
    ),
    importRate: bisect(
      (rate) => equityNpvOf(project, { importRate: rate }),
      0,
      Math.max(50, baseImport * 5)
    ),
    maxCapexMultiplier: bisect(
      (m) => equityNpvOf(project, { capexMult: m }),
      0.01,
      5
    ),
  };
}

/**
 * Downside / Base / Upside scenarios (§4.4).
 */
export function buildScenarios(project) {
  const make = (name, shock) => {
    const { metrics } = computeProject(applyShock(project, shock));
    return {
      name,
      equityNpv: metrics.equityNpv,
      equityIrr: metrics.equityIrr,
      simplePayback: metrics.simplePayback,
    };
  };
  return [
    make("downside", { yieldMult: 0.8, capexMult: 1.2 }),
    make("base", {}),
    make("upside", { yieldMult: 1.2, capexMult: 0.8 }),
  ];
}
