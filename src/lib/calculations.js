// ============================================================================
// Solar Rooftop Financial Model — calculation entry point
//
// New engine (SPEC-UPGRADE.md Phase 1): computeProject() orchestrates the
// modular engine in energy.js / costs.js / finance.js against the Project
// data model (§3). sensitivity.js and scoring.js build on computeProject.
//
// Legacy engine (defaultAssumptions / buildCashflow / computeMetrics) is kept
// below untouched — the current UI still consumes it until Phase 3, and its
// numbers are locked to the validated Excel workbook.
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

export const defaultAssumptions = {
  // --- Technical ---
  systemSize: 5, // kW
  capacityFactor: 0.17, // fraction
  degradation: 0.005, // per year
  projectLife: 25, // years

  // --- Regulatory (MEA Announcement 58/2569) ---
  fitRate: 2.2, // THB/kWh
  fitTerm: 10, // years
  selfConsumptionRatio: 0.4, // fraction — default set conservatively for public use
  exportCapKw: 5, // kW, hard cap per meter regardless of system size

  // --- Financial / Market ---
  capexPerKw: 30000, // THB/kW -> installCost = systemSize * capexPerKw
  omRate: 0.02, // fraction of CAPEX per year
  inverterReplacementPct: 0.15, // fraction of CAPEX
  inverterReplacementYear: 12,
  retailRate: 4.4, // THB/kWh
  retailEscalation: 0.0, // per year
  generalInflation: 0.0, // per year (applied to O&M)

  // --- Tax ---
  taxDeductionCap: 200000, // THB
  taxBracket: 0.15, // marginal rate

  // --- Financing ---
  loanEnabled: false,
  loanToCostRatio: 0.5,
  interestRate: 0.03,
  loanTenor: 3, // years, includes grace period
  gracePeriod: 1, // years, interest-only

  // --- Discount rates ---
  projectDiscountRate: 0.07,
  equityDiscountRate: 0.1,
};

/**
 * Rough sizing recommendation from monthly electricity usage.
 * Not part of the financial model itself — just a helper to suggest a
 * starting system size before the user fine-tunes with the slider.
 *
 * coverageTarget = fraction of monthly usage the system is sized to cover.
 * Kept conservative (70%) since only the daytime portion of usage is
 * realistically offset without a battery, and oversizing runs into the
 * 5kW export cap sooner.
 */
export function estimateSystemSize(monthlyUsageKwh, capacityFactor = defaultAssumptions.capacityFactor, coverageTarget = 0.7) {
  const yieldPerKw = capacityFactor * 365 * 24;
  const monthlyYieldPerKw = yieldPerKw / 12;
  if (!monthlyUsageKwh || monthlyYieldPerKw <= 0) return null;
  const raw = (monthlyUsageKwh * coverageTarget) / monthlyYieldPerKw;
  return Math.max(1, Math.round(raw * 2) / 2); // nearest 0.5 kW, minimum 1 kW
}

function pmtAmount(periodicRate, nPeriods, principal) {
  if (nPeriods <= 0) return 0;
  if (periodicRate === 0) return principal / nPeriods;
  return (principal * periodicRate) / (1 - Math.pow(1 + periodicRate, -nPeriods));
}

function npvAt(rate, cashflows) {
  // cashflows[0] = year 0 (undiscounted), cashflows[i] discounted to period i
  return cashflows.reduce((acc, cf, i) => acc + cf / Math.pow(1 + rate, i), 0);
}

function solveIrr(cashflows) {
  let lo = -0.9;
  let hi = 5;
  let flo = npvAt(lo, cashflows);
  let fhi = npvAt(hi, cashflows);
  if (!isFinite(flo) || !isFinite(fhi) || flo * fhi > 0) return null; // no sign change -> no real root in range
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fmid = npvAt(mid, cashflows);
    if (Math.abs(fmid) < 1e-6) return mid;
    if (flo * fmid < 0) {
      hi = mid;
      fhi = fmid;
    } else {
      lo = mid;
      flo = fmid;
    }
  }
  return (lo + hi) / 2;
}

/**
 * Builds the full year-by-year cashflow table (Year 0..projectLife).
 * Mirrors the "Cashflow" sheet columns in the Excel workbook.
 */
export function buildCashflow(a) {
  const installCost = a.systemSize * a.capexPerKw;
  const yieldPerKw = a.capacityFactor * 365 * 24; // kWh/kW/yr
  const loanAmount = a.loanEnabled ? installCost * a.loanToCostRatio : 0;
  const netEquity = installCost - loanAmount;
  const repayPeriods = Math.max(1, a.loanTenor - a.gracePeriod) * 12;
  const monthlyPayment =
    loanAmount > 0 ? pmtAmount(a.interestRate / 12, repayPeriods, loanAmount) : 0;

  const rows = [];

  // Year 0
  rows.push({
    year: 0,
    generation: 0,
    scSavings: 0,
    exportRevenue: 0,
    curtailedEnergy: 0,
    om: 0,
    inverter: 0,
    taxBenefit: 0,
    operatingCF: 0,
    projectCF: -installCost,
    debtService: 0,
    equityCF: -netEquity,
    cumulativeEquityCF: -netEquity,
    dscr: null,
  });

  let cumulative = -netEquity;

  for (let t = 1; t <= a.projectLife; t++) {
    const degradeFactor = Math.pow(1 - a.degradation, t - 1);
    const generation = a.systemSize * yieldPerKw * degradeFactor;

    const scSavings =
      generation * a.selfConsumptionRatio * a.retailRate * Math.pow(1 + a.retailEscalation, t - 1);

    const exportUncapped = generation * (1 - a.selfConsumptionRatio);
    const exportCapEnergy = a.exportCapKw * yieldPerKw * degradeFactor;
    const exportEnergy = Math.min(exportUncapped, exportCapEnergy);
    const curtailedEnergy = Math.max(0, exportUncapped - exportCapEnergy);
    const exportRevenue = t <= a.fitTerm ? exportEnergy * a.fitRate : 0;

    const om = installCost * a.omRate * Math.pow(1 + a.generalInflation, t - 1);
    const inverter = t === a.inverterReplacementYear ? installCost * a.inverterReplacementPct : 0;
    const taxBenefit =
      t === 1 ? Math.min(installCost, a.taxDeductionCap) * a.taxBracket : 0;

    const operatingCF = scSavings + exportRevenue - om;
    const projectCF = operatingCF - inverter + taxBenefit;

    let debtService = 0;
    if (a.loanEnabled) {
      if (t <= a.gracePeriod) debtService = loanAmount * a.interestRate;
      else if (t <= a.loanTenor) debtService = monthlyPayment * 12;
    }
    const equityCF = projectCF - debtService;
    cumulative += equityCF;

    rows.push({
      year: t,
      generation,
      scSavings,
      exportRevenue,
      curtailedEnergy,
      om,
      inverter,
      taxBenefit,
      operatingCF,
      projectCF,
      debtService,
      equityCF,
      cumulativeEquityCF: cumulative,
      dscr: debtService > 0 ? operatingCF / debtService : null,
    });
  }

  return { rows, installCost, loanAmount, netEquity, monthlyPayment };
}

/**
 * Computes headline metrics from a cashflow table.
 * Mirrors the "Outputs" sheet in the Excel workbook.
 */
export function computeMetrics(a) {
  const { rows, installCost, loanAmount, netEquity, monthlyPayment } = buildCashflow(a);

  const projectCFs = rows.map((r) => r.projectCF);
  const equityCFs = rows.map((r) => r.equityCF);

  const projectNpv = npvAt(a.projectDiscountRate, projectCFs);
  const equityNpv = npvAt(a.equityDiscountRate, equityCFs);
  const projectIrr = solveIrr(projectCFs);
  const equityIrr = solveIrr(equityCFs);

  // Payback: first year cumulative equity CF crosses from negative to >=0
  let paybackYears = null;
  for (let t = 1; t < rows.length; t++) {
    if (rows[t].cumulativeEquityCF >= 0 && rows[t - 1].cumulativeEquityCF < 0) {
      paybackYears = t - 1 + Math.abs(rows[t - 1].cumulativeEquityCF) / rows[t].equityCF;
      break;
    }
  }

  // Minimum DSCR across years with actual debt service
  const dscrValues = rows.map((r) => r.dscr).filter((v) => v !== null && isFinite(v));
  const minDscr = dscrValues.length > 0 ? Math.min(...dscrValues) : null;

  // LCOE = (CAPEX + PV(O&M) + PV(inverter capex)) / PV(generation), discounted at project rate
  let pvCost = installCost;
  let pvEnergy = 0;
  for (let t = 1; t < rows.length; t++) {
    const disc = Math.pow(1 + a.projectDiscountRate, t);
    pvCost += (rows[t].om + rows[t].inverter) / disc;
    pvEnergy += rows[t].generation / disc;
  }
  const lcoe = pvEnergy > 0 ? pvCost / pvEnergy : null;

  const totalCurtailed = rows.reduce((acc, r) => acc + (r.curtailedEnergy || 0), 0);

  return {
    rows,
    installCost,
    loanAmount,
    netEquity,
    monthlyPayment,
    projectNpv,
    equityNpv,
    projectIrr,
    equityIrr,
    paybackYears,
    minDscr,
    lcoe,
    totalCurtailed,
    year1: rows[1],
  };
}
