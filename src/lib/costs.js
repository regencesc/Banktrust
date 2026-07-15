// ============================================================================
// costs.js — CAPEX/OPEX line-item aggregation (SPEC-UPGRADE.md §4.2)
// Pure JS, no React. Consumes Project.costs (§3 data model).
// ============================================================================

/**
 * Net cost of a single CAPEX line item.
 * VAT is added only when it cannot be reclaimed (costs.vatRecoverable=false,
 * the default — households and non-VAT-registered buyers bear VAT as cost).
 */
export function capexItemNet(item, { includeVat = true } = {}) {
  const base =
    (item.qty || 0) * (item.unitPrice || 0) * (1 - (item.discountPct || 0));
  return includeVat ? base * (1 + (item.vatPct || 0)) : base;
}

/** Sum of all CAPEX line items. */
export function grossCapex(capexItems = [], opts) {
  return capexItems.reduce((acc, item) => acc + capexItemNet(item, opts), 0);
}

/**
 * Replacement cost falling in year t.
 * Occurrences are at k × replacementYear for k = 1..replacementCycles
 * (e.g. inverter with replacementYear=12, cycles=2 → years 12 and 24),
 * each costing replacementPct × the item's net cost (default: full cost).
 */
export function replacementsInYear(t, capexItems = [], opts) {
  let total = 0;
  for (const item of capexItems) {
    const firstYear = item.replacementYear;
    if (!firstYear || firstYear <= 0) continue;
    const cycles = item.replacementCycles ?? 1;
    const pct = item.replacementPct ?? 1;
    if (t % firstYear === 0 && t / firstYear <= cycles) {
      total += capexItemNet(item, opts) * pct;
    }
  }
  return total;
}

/**
 * OPEX falling in year t.
 * An item is active when startYear ≤ t ≤ endYear and (t − startYear) is a
 * multiple of everyNYears. Escalation compounds from year 1 (§4.2 formula).
 */
export function opexInYear(t, opexItems = []) {
  let total = 0;
  for (const item of opexItems) {
    const start = item.startYear ?? 1;
    const end = item.endYear ?? Infinity;
    const everyN = item.everyNYears ?? 1;
    if (t < start || t > end) continue;
    if ((t - start) % everyN !== 0) continue;
    total +=
      (item.costPerOccurrence || 0) *
      Math.pow(1 + (item.escalationPct || 0), t - 1);
  }
  return total;
}

/**
 * Full cost series for years 1..projectLife plus the CAPEX total.
 */
export function buildCostSeries(costs = {}, projectLife) {
  const opts = { includeVat: !(costs.vatRecoverable ?? false) };
  const capexItems = costs.capexItems || [];
  const opexItems = costs.opexItems || [];
  const years = [];
  for (let t = 1; t <= projectLife; t++) {
    years.push({
      year: t,
      opex: opexInYear(t, opexItems),
      replacement: replacementsInYear(t, capexItems, opts),
    });
  }
  return { grossCapex: grossCapex(capexItems, opts), years };
}
