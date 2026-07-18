// ============================================================================
// calculations.js — engine entry point / orchestrator
//
// computeProject() chains the modular engine (energy.js -> costs.js ->
// finance.js) over the Project data model (SPEC-UPGRADE.md §3).
// sensitivity.js and scoring.js build on top of computeProject.
//
// The pre-Studio single-assumptions engine was removed after Phase 7; its
// Excel-validated reference numbers (NPV≈166,601 / IRR≈20.1% / LCOE≈2.34 on
// the 5 kWp personal-mode case) are locked in by the legacy-parity tests in
// finance.test.js, which run the SAME case through this engine.
// ============================================================================

import { deriveSystem, buildEnergySeries } from "./energy.js";
import { buildCostSeries } from "./costs.js";
import { computeFinance } from "./finance.js";

/**
 * Full evaluation of one Project (§3 data model):
 * derived system → energy series → cost series → cashflows and metrics.
 */
export function computeProject(project) {
  const life = project.projectLife;
  const derived = deriveSystem(project.system);
  const energySeries = buildEnergySeries(project, life);
  const costSeries = buildCostSeries(project.costs, life);
  const finance = computeFinance(project, energySeries, costSeries);

  const ef = project.gridEmissionFactor || 0;
  const co2AvoidedYear1Kg = ef > 0 ? energySeries[0].grossYield * ef : null;
  const co2AvoidedLifetimeKg =
    ef > 0 ? energySeries.reduce((acc, r) => acc + r.grossYield, 0) * ef : null;

  return {
    derived,
    energySeries,
    costSeries,
    ...finance,
    co2AvoidedYear1Kg,
    co2AvoidedLifetimeKg,
  };
}
