// ============================================================================
// energy.js — annual energy model (SPEC-UPGRADE.md §4.1)
// Pure JS, no React. Consumes Project.system + Project.energy (§3 data model).
// ============================================================================

/**
 * Derived system quantities shown as read-only fields in the UI (§5.2).
 */
export function deriveSystem(system = {}) {
  const panelWp = system.panelWp || 0;
  const panelCount = system.panelCount || 0;
  const dcKwp = (panelWp * panelCount) / 1000;
  const dcAcRatio = system.inverterAcKw > 0 ? dcKwp / system.inverterAcKw : null;
  const totalPanelAreaM2 = (system.panelAreaM2 || 0) * panelCount;
  const areaUsedPct = system.roofAreaM2 > 0 ? totalPanelAreaM2 / system.roofAreaM2 : null;
  return { dcKwp, dcAcRatio, totalPanelAreaM2, areaUsedPct };
}

/** specific yield (kWh/kWp/yr) <-> capacity factor, both directions (§2). */
export function cfToSpecificYield(capacityFactor) {
  return capacityFactor * 8760;
}
export function specificYieldToCf(specificYield) {
  return specificYield / 8760;
}

/**
 * One project year of the energy balance.
 *
 * Order of operations per spec: self-consumption first, battery shifts
 * surplus into remaining load next, export cap (curtailment) last — so the
 * battery absorbs energy that would otherwise be curtailed.
 *
 * Battery is the simple annual-throughput model: shiftable energy is capped
 * at batteryKwh × DoD × RTE × 365 and can never push self-use above load
 * (it only replaces electricity that would have been imported).
 */
export function computeEnergyYear(t, { system = {}, energy = {} }) {
  const { dcKwp } = deriveSystem(system);
  const degrade = Math.pow(1 - (energy.degradation || 0), t - 1);
  const lossFactor = energy.yieldIncludesLosses ? 1 : 1 - (energy.systemLosses || 0);
  const availability = energy.availability ?? 1;
  const growth = Math.pow(1 + (energy.loadGrowth || 0), t - 1);

  const hasProfile =
    energy.mode === "interval" &&
    Array.isArray(energy.monthlyProfile) &&
    energy.monthlyProfile.length > 0;

  let grossYield;
  let load; // null = unknown/unlimited (annual screening without load data)
  let selfUse;

  if (hasProfile) {
    // Interval mode: month-by-month min(pv, load), scaled by degradation/growth.
    // Monthly PV comes from measured/simulated data, so availability and
    // loss factors are assumed to be already included.
    grossYield = 0;
    load = 0;
    selfUse = 0;
    for (const m of energy.monthlyProfile) {
      const pv = (m.pvKwh || 0) * degrade;
      const ld = (m.loadKwh || 0) * growth;
      grossYield += pv;
      load += ld;
      selfUse += Math.min(pv, ld);
    }
  } else {
    grossYield =
      dcKwp * (energy.specificYield || 0) * availability * lossFactor * degrade;
    load = Number.isFinite(energy.loadYear1Kwh)
      ? energy.loadYear1Kwh * growth
      : null;
    const target = grossYield * (energy.selfConsumptionPct || 0);
    selfUse = load === null ? target : Math.min(target, load);
  }

  let exportEnergy = Math.max(0, grossYield - selfUse);

  let batteryShifted = 0;
  if (system.batteryKwh > 0) {
    const throughputCap =
      system.batteryKwh * (system.batteryDoD ?? 1) * (system.batteryRTE ?? 1) * 365;
    const unmetLoad = load === null ? Infinity : Math.max(0, load - selfUse);
    batteryShifted = Math.min(exportEnergy, throughputCap, unmetLoad);
    selfUse += batteryShifted;
    exportEnergy -= batteryShifted;
  }

  // Export cap (§4.1): cap energy derived from exportCapKw at the same
  // parametric yield; excess is curtailed (reported, never paid).
  let curtailed = 0;
  if (energy.exportCapKw != null && energy.specificYield > 0) {
    const capEnergy =
      energy.exportCapKw * energy.specificYield * availability * degrade;
    if (exportEnergy > capEnergy) {
      curtailed = exportEnergy - capEnergy;
      exportEnergy = capEnergy;
    }
  }

  const escalation = Math.pow(1 + (energy.tariffEscalation || 0), t - 1);
  const savings =
    selfUse * (energy.importRate || 0) * escalation +
    (energy.demandChargeSavings || 0);
  const exportRevenue =
    t <= (energy.exportTermYears || 0) ? exportEnergy * (energy.exportRate || 0) : 0;

  return {
    year: t,
    grossYield,
    load,
    selfUse,
    exportEnergy,
    curtailed,
    batteryShifted,
    savings,
    exportRevenue,
  };
}

/**
 * Full energy series for years 1..projectLife.
 */
export function buildEnergySeries(project, projectLife) {
  const rows = [];
  for (let t = 1; t <= projectLife; t++) {
    rows.push(computeEnergyYear(t, project));
  }
  return rows;
}
