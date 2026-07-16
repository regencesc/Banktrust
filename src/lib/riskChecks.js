// ============================================================================
// riskChecks.js — automatic Data & Risk Checks for the dashboard
// (SPEC-UPGRADE.md §5.1). Pure JS: returns {id, level, params} entries;
// the UI maps ids to localized messages so en support stays possible.
// Levels: danger > warn > info. Output is sorted most severe first.
// ============================================================================

import { deriveSystem } from "./energy.js";
import { dataChecks } from "./scoring.js";

const LEVEL_ORDER = { danger: 0, warn: 1, info: 2 };

export function buildRiskChecks(project, result) {
  const checks = [];
  const f = project.finance || {};
  const e = project.energy || {};
  const m = result.metrics;

  // 1. incomplete fundamentals
  const missing = dataChecks(project).filter((c) => !c.ok);
  if (missing.length > 0) {
    checks.push({
      id: "dataIncomplete",
      level: "warn",
      params: [missing.length],
      missingIds: missing.map((c) => c.id),
    });
  }

  // 2. discounting is meaningless without a rate
  if (!(f.discountRate > 0)) {
    checks.push({ id: "discountRateMissing", level: "warn", params: [] });
  }

  // 3. DSCR below target (only when there is debt service at all)
  const target = f.minDscrTarget || 1.2;
  if (f.loanEnabled && m.minDscr !== null && m.minDscr < target) {
    checks.push({
      id: "dscrBelowTarget",
      level: "danger",
      params: [m.minDscr, target],
    });
  }

  // 4. unusual DC/AC ratio
  const { dcAcRatio } = deriveSystem(project.system || {});
  if (dcAcRatio !== null && (dcAcRatio < 0.9 || dcAcRatio > 1.5)) {
    checks.push({ id: "dcAcRatio", level: "warn", params: [dcAcRatio] });
  }

  // 5. screening-grade self-consumption assumption
  const hasProfile =
    Array.isArray(e.monthlyProfile) && e.monthlyProfile.length > 0;
  if (e.mode !== "interval" || !hasProfile) {
    checks.push({ id: "screeningMode", level: "info", params: [] });
  }

  // 6. curtailment from the export cap
  const totalCurtailed = result.energySeries.reduce(
    (acc, r) => acc + (r.curtailed || 0),
    0
  );
  if (totalCurtailed > 0) {
    checks.push({ id: "curtailment", level: "warn", params: [totalCurtailed] });
  }

  // 7. never pays back (only meaningful once real money is in the model)
  if (result.grossCapex > 0 && m.simplePayback === null) {
    checks.push({ id: "neverPaysBack", level: "danger", params: [] });
  }

  return checks.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}
