// ============================================================================
// finance.js — debt schedule, tax, cashflows and headline metrics
// (SPEC-UPGRADE.md §4.3). Pure JS, no React.
// ============================================================================

/** NPV with cashflows[0] = year 0 (undiscounted). */
export function npvAt(rate, cashflows) {
  return cashflows.reduce((acc, cf, i) => acc + cf / Math.pow(1 + rate, i), 0);
}

/** IRR via bisection; null when no sign change in [-90%, +500%]. */
export function solveIrr(cashflows) {
  let lo = -0.9;
  let hi = 5;
  let flo = npvAt(lo, cashflows);
  const fhi = npvAt(hi, cashflows);
  if (!isFinite(flo) || !isFinite(fhi) || flo * fhi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fmid = npvAt(mid, cashflows);
    if (Math.abs(fmid) < 1e-6) return mid;
    if (flo * fmid < 0) {
      hi = mid;
    } else {
      lo = mid;
      flo = fmid;
    }
  }
  return (lo + hi) / 2;
}

/**
 * Annual debt schedule: interest-only through the grace period, then a level
 * annuity over the remaining term (§4.3).
 */
export function buildDebtSchedule({
  principal,
  interestRate = 0,
  loanTerm = 0,
  gracePeriod = 0,
}) {
  if (!(principal > 0) || loanTerm <= 0) return [];
  const repayYears = Math.max(1, loanTerm - gracePeriod);
  const r = interestRate;
  const annuity =
    r === 0
      ? principal / repayYears
      : (principal * r) / (1 - Math.pow(1 + r, -repayYears));

  const rows = [];
  let opening = principal;
  for (let t = 1; t <= loanTerm; t++) {
    const interest = opening * r;
    let payment;
    let principalPaid = 0;
    if (t <= gracePeriod) {
      payment = interest;
    } else {
      payment = annuity;
      principalPaid = Math.min(opening, payment - interest);
    }
    const closing = opening - principalPaid;
    rows.push({ year: t, opening, interest, principalPaid, payment, closing });
    opening = closing;
  }
  return rows;
}

/** First fractional year where a running cumulative series crosses ≥ 0. */
function paybackFrom(cashflows) {
  let cumulative = cashflows[0];
  for (let t = 1; t < cashflows.length; t++) {
    const next = cumulative + cashflows[t];
    if (cumulative < 0 && next >= 0) {
      return t - 1 + Math.abs(cumulative) / cashflows[t];
    }
    cumulative = next;
  }
  return null;
}

/**
 * Year-by-year cashflow rows + headline metrics from precomputed
 * energy and cost series. Tax modes:
 *  - corporate: straight-line depreciation, deductible interest, no loss
 *    carry-forward; project-level tax excludes the interest shield.
 *  - personal: legacy model — one-off deduction benefit in year 1, no tax
 *    on savings (they are avoided costs, not income).
 */
export function computeFinance(project, energySeries, costSeries) {
  const f = project.finance || {};
  const life = project.projectLife;
  const grossCapex = costSeries.grossCapex;

  const debt = f.loanEnabled ? grossCapex * (f.debtRatio || 0) : 0;
  const equity = grossCapex - debt;
  const debtSchedule = buildDebtSchedule({
    principal: debt,
    interestRate: f.interestRate || 0,
    loanTerm: f.loanTerm || 0,
    gracePeriod: f.gracePeriod || 0,
  });

  const isCorporate = f.taxMode === "corporate";
  const depYears = f.depreciationYears || 0;
  const annualDep =
    isCorporate && depYears > 0
      ? (grossCapex * (f.depreciableBasisPct ?? 1)) / depYears
      : 0;

  const rows = [
    {
      year: 0,
      ebitda: 0,
      depreciation: 0,
      interest: 0,
      principalPaid: 0,
      tax: 0,
      replacement: 0,
      opex: 0,
      decommissioning: 0,
      projectCF: -grossCapex,
      equityCF: -equity,
      cumulativeEquityCF: -equity,
      dscr: null,
    },
  ];

  let cumulative = -equity;
  for (let t = 1; t <= life; t++) {
    const e = energySeries[t - 1];
    const c = costSeries.years[t - 1];
    const otherIncome =
      (f.otherIncomeY1 || 0) * Math.pow(1 + (f.otherIncomeGrowth || 0), t - 1);
    const ebitda = e.savings + e.exportRevenue + otherIncome - c.opex;

    const sched = debtSchedule[t - 1];
    const interest = sched ? sched.interest : 0;
    const principalPaid = sched ? sched.principalPaid : 0;
    const debtService = sched ? sched.payment : 0;

    let depreciation = 0;
    let taxEquity = 0; // tax actually paid (with interest shield)
    let taxProject = 0; // tax at project level (no financing effects)
    if (isCorporate) {
      depreciation = t <= depYears ? annualDep : 0;
      const rate = f.corporateTaxRate || 0;
      taxProject = Math.max(0, ebitda - depreciation) * rate;
      taxEquity = Math.max(0, ebitda - depreciation - interest) * rate;
    } else if (t === 1) {
      // legacy personal mode: one-off deduction benefit, modelled as negative tax
      const benefit =
        Math.min(grossCapex, f.personalDeductionCap || 0) *
        (f.personalTaxBracket || 0);
      taxProject = -benefit;
      taxEquity = -benefit;
    }

    const decommissioning =
      t === life ? grossCapex * (f.decommissioningPct || 0) : 0;

    const projectCF = ebitda - c.replacement - taxProject - decommissioning;
    const equityCF =
      ebitda - c.replacement - interest - principalPaid - taxEquity - decommissioning;
    cumulative += equityCF;

    // DSCR uses tax actually paid; the year-1 personal benefit is a one-off
    // windfall, not operating cash, so it is excluded from debt coverage.
    const dscr =
      debtService > 0 ? (ebitda - Math.max(0, taxEquity)) / debtService : null;

    rows.push({
      year: t,
      ebitda,
      depreciation,
      interest,
      principalPaid,
      tax: taxEquity,
      replacement: c.replacement,
      opex: c.opex,
      decommissioning,
      projectCF,
      equityCF,
      cumulativeEquityCF: cumulative,
      dscr,
    });
  }

  const rate = f.discountRate || 0;
  const projectCFs = rows.map((r) => r.projectCF);
  const equityCFs = rows.map((r) => r.equityCF);

  const discountedEquityCFs = equityCFs.map(
    (cf, i) => cf / Math.pow(1 + rate, i)
  );

  const dscrValues = rows
    .map((r) => r.dscr)
    .filter((v) => v !== null && isFinite(v));

  // LCOE = (CAPEX + PV(OPEX + Replacement)) / PV(gross generation) (§4.3)
  let pvCost = grossCapex;
  let pvEnergy = 0;
  for (let t = 1; t <= life; t++) {
    const disc = Math.pow(1 + rate, t);
    pvCost += (rows[t].opex + rows[t].replacement) / disc;
    pvEnergy += energySeries[t - 1].grossYield / disc;
  }

  return {
    rows,
    debtSchedule,
    grossCapex,
    debt,
    equity,
    metrics: {
      projectNpv: npvAt(rate, projectCFs),
      equityNpv: npvAt(rate, equityCFs),
      projectIrr: solveIrr(projectCFs),
      equityIrr: solveIrr(equityCFs),
      simplePayback: paybackFrom(equityCFs),
      discountedPayback: paybackFrom(discountedEquityCFs),
      minDscr: dscrValues.length > 0 ? Math.min(...dscrValues) : null,
      lcoe: pvEnergy > 0 ? pvCost / pvEnergy : null,
    },
  };
}
