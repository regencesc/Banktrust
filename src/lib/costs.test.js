import { describe, it, expect } from "vitest";
import {
  capexItemNet,
  grossCapex,
  replacementsInYear,
  opexInYear,
  buildCostSeries,
} from "./costs.js";

describe("capexItemNet", () => {
  it("applies qty × unitPrice × (1−discount) then VAT", () => {
    const item = { qty: 20, unitPrice: 5000, discountPct: 0.1, vatPct: 0.07 };
    expect(capexItemNet(item)).toBeCloseTo(20 * 5000 * 0.9 * 1.07, 6);
  });

  it("skips VAT when it is recoverable", () => {
    const item = { qty: 1, unitPrice: 100000, discountPct: 0, vatPct: 0.07 };
    expect(capexItemNet(item, { includeVat: false })).toBe(100000);
  });

  it("treats missing fields as zero", () => {
    expect(capexItemNet({})).toBe(0);
  });
});

describe("grossCapex", () => {
  it("sums all line items", () => {
    const items = [
      { qty: 1, unitPrice: 100000, vatPct: 0 },
      { qty: 2, unitPrice: 25000, vatPct: 0 },
    ];
    expect(grossCapex(items)).toBe(150000);
  });
});

describe("replacementsInYear", () => {
  const inverter = {
    qty: 1,
    unitPrice: 40000,
    vatPct: 0,
    replacementYear: 12,
    replacementCycles: 2,
    replacementPct: 0.8,
  };

  it("charges replacementPct × item cost at each cycle year", () => {
    expect(replacementsInYear(12, [inverter])).toBeCloseTo(32000, 6);
    expect(replacementsInYear(24, [inverter])).toBeCloseTo(32000, 6);
  });

  it("is zero outside the cycle years and beyond replacementCycles", () => {
    expect(replacementsInYear(11, [inverter])).toBe(0);
    expect(replacementsInYear(36, [inverter])).toBe(0); // cycle 3 > cycles=2
  });

  it("defaults to a single full-cost replacement when pct/cycles unset", () => {
    const item = { qty: 1, unitPrice: 10000, vatPct: 0, replacementYear: 10 };
    expect(replacementsInYear(10, [item])).toBe(10000);
    expect(replacementsInYear(20, [item])).toBe(0);
  });

  it("ignores items without replacementYear", () => {
    expect(replacementsInYear(12, [{ qty: 1, unitPrice: 5000 }])).toBe(0);
  });
});

describe("opexInYear", () => {
  it("escalates from year 1", () => {
    const om = { costPerOccurrence: 3000, escalationPct: 0.02, startYear: 1 };
    expect(opexInYear(1, [om])).toBeCloseTo(3000, 6);
    expect(opexInYear(5, [om])).toBeCloseTo(3000 * Math.pow(1.02, 4), 6);
  });

  it("respects the start/end window", () => {
    const item = { costPerOccurrence: 1000, startYear: 3, endYear: 5 };
    expect(opexInYear(2, [item])).toBe(0);
    expect(opexInYear(3, [item])).toBe(1000);
    expect(opexInYear(5, [item])).toBe(1000);
    expect(opexInYear(6, [item])).toBe(0);
  });

  it("fires only every N years", () => {
    const item = { costPerOccurrence: 2000, startYear: 2, everyNYears: 3 };
    expect(opexInYear(2, [item])).toBe(2000);
    expect(opexInYear(3, [item])).toBe(0);
    expect(opexInYear(5, [item])).toBe(2000);
  });
});

describe("buildCostSeries", () => {
  it("assembles gross CAPEX and per-year opex/replacement", () => {
    const costs = {
      vatRecoverable: false,
      capexItems: [
        { qty: 1, unitPrice: 150000, vatPct: 0, replacementYear: 12, replacementPct: 0.15 },
      ],
      opexItems: [{ costPerOccurrence: 3000, startYear: 1 }],
    };
    const s = buildCostSeries(costs, 25);
    expect(s.grossCapex).toBe(150000);
    expect(s.years).toHaveLength(25);
    expect(s.years[0]).toEqual({ year: 1, opex: 3000, replacement: 0 });
    expect(s.years[11]).toEqual({ year: 12, opex: 3000, replacement: 22500 });
  });

  it("vatRecoverable toggle changes gross CAPEX", () => {
    const capexItems = [{ qty: 1, unitPrice: 100000, vatPct: 0.07 }];
    const withVat = buildCostSeries({ capexItems, vatRecoverable: false }, 1);
    const noVat = buildCostSeries({ capexItems, vatRecoverable: true }, 1);
    expect(withVat.grossCapex).toBeCloseTo(107000, 6);
    expect(noVat.grossCapex).toBe(100000);
  });
});
