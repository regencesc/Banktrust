// ============================================================================
// scoring.js — Screening Score 0-100 + verdict badge (SPEC-UPGRADE.md §4.5)
// Weights: IRR vs hurdle 30 · payback vs project life 25 · NPV>0 20 ·
// MinDSCR vs target 15 · data completeness 10.
// The exact criteria below are surfaced on the "วิธีคำนวณ" page (Phase 6).
// ============================================================================

import { deriveSystem } from "./energy.js";

const clamp01 = (x) => Math.max(0, Math.min(1, x));

/**
 * Screening score for one computed project.
 * @param project the Project input (§3)
 * @param result  output of computeProject(project)
 */
export function computeScreeningScore(project, result) {
  const m = result.metrics;
  const f = project.finance || {};
  const life = project.projectLife || 25;

  // IRR (30): 0 at IRR ≤ 0, full marks at 2× the hurdle rate, linear between.
  const hurdle = f.discountRate > 0 ? f.discountRate : 0.07;
  const irrScore =
    m.equityIrr != null ? 30 * clamp01(m.equityIrr / (2 * hurdle)) : 0;

  // Payback (25): full marks at instant payback, 0 when never pays back
  // within the project life.
  const paybackScore =
    m.simplePayback != null ? 25 * clamp01(1 - m.simplePayback / life) : 0;

  // NPV (20): binary — the project either creates value or it doesn't.
  const npvScore = m.equityNpv > 0 ? 20 : 0;

  // DSCR (15): full marks with no debt (no coverage risk). With debt,
  // 0 at DSCR ≤ 1, full marks at the target (default 1.2).
  const target = f.minDscrTarget || 1.2;
  let dscrScore;
  if (!f.loanEnabled || m.minDscr === null) {
    dscrScore = f.loanEnabled ? 0 : 15;
  } else {
    dscrScore = 15 * clamp01((m.minDscr - 1) / (target - 1));
  }

  // Completeness (10): 2 points per filled-in fundamental.
  const checks = dataChecks(project);
  const completenessScore =
    (10 * checks.filter((c) => c.ok).length) / checks.length;

  const total = Math.round(
    irrScore + paybackScore + npvScore + dscrScore + completenessScore
  );

  return {
    total,
    verdict: verdictFor(total),
    breakdown: {
      irr: irrScore,
      payback: paybackScore,
      npv: npvScore,
      dscr: dscrScore,
      completeness: completenessScore,
    },
    checks,
  };
}

/** Verdict bands per spec §4.5. */
export function verdictFor(total) {
  if (total >= 80) return { level: "good", label: "น่าสนใจสำหรับศึกษาต่อ" };
  if (total >= 50) return { level: "fair", label: "พอไปได้ ควรปรับสมมติฐาน" };
  return { level: "poor", label: "ยังไม่คุ้มตามข้อมูลปัจจุบัน" };
}

/**
 * The five completeness checks (each worth 2 points).
 */
export function dataChecks(project) {
  const { dcKwp } = deriveSystem(project.system || {});
  const e = project.energy || {};
  const hasProfile =
    Array.isArray(e.monthlyProfile) && e.monthlyProfile.length > 0;
  return [
    { id: "system", ok: dcKwp > 0, label: "กำหนดขนาดระบบแล้ว" },
    {
      id: "yield",
      ok: e.specificYield > 0 || hasProfile,
      label: "กำหนดผลผลิตพลังงานแล้ว",
    },
    { id: "tariff", ok: e.importRate > 0, label: "กำหนดค่าไฟแล้ว" },
    {
      id: "costs",
      ok: (project.costs?.capexItems?.length || 0) > 0,
      label: "มีรายการต้นทุนแล้ว",
    },
    {
      id: "load",
      ok: Number.isFinite(e.loadYear1Kwh) || hasProfile,
      label: "กำหนดโหลดการใช้ไฟแล้ว",
    },
  ];
}
