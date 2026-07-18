import { describe, it, expect } from "vitest";
import { th } from "./th.js";
import { en } from "./en.js";
import { verdictFor } from "../lib/scoring.js";

/** Collect every leaf path with its type ("string" | "function" | ...). */
function shapeOf(obj, prefix = "") {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, shapeOf(value, path));
    } else if (Array.isArray(value)) {
      out[path] = `array:${value.length}`;
    } else {
      out[path] = typeof value;
    }
  }
  return out;
}

describe("locale structural parity (Hard Rule 5)", () => {
  it("en.js mirrors th.js key-for-key with matching types", () => {
    const thShape = shapeOf(th);
    const enShape = shapeOf(en);
    const missing = Object.keys(thShape).filter((k) => !(k in enShape));
    const extra = Object.keys(enShape).filter((k) => !(k in thShape));
    expect(missing, `missing in en.js: ${missing.join(", ")}`).toEqual([]);
    expect(extra, `extra in en.js: ${extra.join(", ")}`).toEqual([]);
    for (const key of Object.keys(thShape)) {
      // arrays may differ in length (methodology prose) but must stay arrays
      const a = String(thShape[key]).split(":")[0];
      const b = String(enShape[key]).split(":")[0];
      expect(b, `type mismatch at ${key}`).toBe(a);
    }
  });

  it("param-taking string functions behave in both locales", () => {
    expect(th.sidebar.scoreIncomplete(2)).toContain("2");
    expect(en.sidebar.scoreIncomplete(2)).toContain("2");
    expect(th.risk.dscrBelowTarget("1.05", "1.20")).toContain("1.05");
    expect(en.risk.dscrBelowTarget("1.05", "1.20")).toContain("1.20");
    expect(th.cashflowPage.paybackBadge(5)).toContain("5");
    expect(en.cashflowPage.paybackBadge(5)).toContain("5");
  });

  it("thai verdict labels stay in sync with scoring.js", () => {
    expect(th.verdicts.good).toBe(verdictFor(85).label);
    expect(th.verdicts.fair).toBe(verdictFor(60).label);
    expect(th.verdicts.poor).toBe(verdictFor(20).label);
  });
});
