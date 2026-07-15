import { describe, it, expect } from "vitest";
import {
  deriveSystem,
  cfToSpecificYield,
  specificYieldToCf,
  computeEnergyYear,
  buildEnergySeries,
} from "./energy.js";

// A realistic mid-size project used across tests: 10 kWp, load bigger than
// self-consumed PV so a battery has both surplus energy and unmet load to work with.
const baseSystem = {
  panelWp: 500,
  panelCount: 20, // -> 10 kWp
  inverterAcKw: 8,
  panelAreaM2: 2.2,
  roofAreaM2: 100,
  batteryKwh: 0,
  batteryDoD: 0.9,
  batteryRTE: 0.9,
};

const baseEnergy = {
  mode: "annual",
  specificYield: 1400,
  availability: 1,
  systemLosses: 0.1,
  yieldIncludesLosses: true,
  degradation: 0.005,
  loadYear1Kwh: 12000,
  loadGrowth: 0.02,
  selfConsumptionPct: 0.5,
  monthlyProfile: null,
  importRate: 4.4,
  exportRate: 2.2,
  tariffEscalation: 0.01,
  exportTermYears: 10,
  exportCapKw: null,
  demandChargeSavings: 0,
};

describe("deriveSystem", () => {
  it("computes dcKwp, dcAcRatio and roof area usage", () => {
    const d = deriveSystem(baseSystem);
    expect(d.dcKwp).toBe(10);
    expect(d.dcAcRatio).toBeCloseTo(10 / 8, 6);
    expect(d.totalPanelAreaM2).toBeCloseTo(44, 6);
    expect(d.areaUsedPct).toBeCloseTo(0.44, 6);
  });

  it("returns null ratios when inverter/roof size is missing", () => {
    const d = deriveSystem({ panelWp: 500, panelCount: 10 });
    expect(d.dcKwp).toBe(5);
    expect(d.dcAcRatio).toBeNull();
    expect(d.areaUsedPct).toBeNull();
  });
});

describe("specific yield <-> capacity factor conversion", () => {
  it("round-trips and matches the legacy CF convention", () => {
    expect(cfToSpecificYield(0.17)).toBeCloseTo(1489.2, 6);
    expect(specificYieldToCf(cfToSpecificYield(0.17))).toBeCloseTo(0.17, 10);
  });
});

describe("annual mode — gross yield and self-consumption", () => {
  it("applies system losses only when yieldIncludesLosses=false", () => {
    const withIncluded = computeEnergyYear(1, {
      system: baseSystem,
      energy: baseEnergy,
    });
    const withSeparate = computeEnergyYear(1, {
      system: baseSystem,
      energy: { ...baseEnergy, yieldIncludesLosses: false },
    });
    expect(withIncluded.grossYield).toBeCloseTo(10 * 1400, 6);
    expect(withSeparate.grossYield).toBeCloseTo(10 * 1400 * 0.9, 6);
  });

  it("caps self-use at the load when load is known", () => {
    const e = computeEnergyYear(1, {
      system: baseSystem,
      energy: { ...baseEnergy, loadYear1Kwh: 3000, selfConsumptionPct: 0.5 },
    });
    // target = 14000*0.5 = 7000 but load is only 3000
    expect(e.selfUse).toBe(3000);
    expect(e.exportEnergy).toBeCloseTo(14000 - 3000, 6);
  });

  it("treats missing load as unlimited (screening use)", () => {
    const e = computeEnergyYear(1, {
      system: baseSystem,
      energy: { ...baseEnergy, loadYear1Kwh: null },
    });
    expect(e.load).toBeNull();
    expect(e.selfUse).toBeCloseTo(14000 * 0.5, 6);
  });

  it("degrades yield and grows load year over year", () => {
    const y1 = computeEnergyYear(1, { system: baseSystem, energy: baseEnergy });
    const y2 = computeEnergyYear(2, { system: baseSystem, energy: baseEnergy });
    expect(y2.grossYield).toBeCloseTo(y1.grossYield * 0.995, 6);
    expect(y2.load).toBeCloseTo(y1.load * 1.02, 6);
  });
});

describe("interval mode — 12-month profile", () => {
  const profile = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    loadKwh: 1000,
    pvKwh: i < 6 ? 1200 : 800, // half the months have PV surplus, half deficit
  }));
  const energy = { ...baseEnergy, mode: "interval", monthlyProfile: profile };

  it("sums monthly min(pv, load) instead of using a flat percentage", () => {
    const e = computeEnergyYear(1, { system: baseSystem, energy });
    // 6 months: min(1200,1000)=1000 ; 6 months: min(800,1000)=800
    expect(e.selfUse).toBeCloseTo(6 * 1000 + 6 * 800, 6);
    expect(e.grossYield).toBeCloseTo(6 * 1200 + 6 * 800, 6);
    expect(e.exportEnergy).toBeCloseTo(6 * 200, 6);
  });

  it("scales monthly pv by degradation and load by growth in later years", () => {
    const y3 = computeEnergyYear(3, { system: baseSystem, energy });
    const deg = Math.pow(0.995, 2);
    const grow = Math.pow(1.02, 2);
    expect(y3.grossYield).toBeCloseTo((6 * 1200 + 6 * 800) * deg, 6);
    expect(y3.load).toBeCloseTo(12000 * grow, 6);
  });
});

describe("battery — simple annual shift model", () => {
  const energy = { ...baseEnergy, loadYear1Kwh: 12000, selfConsumptionPct: 0.5 };
  // year 1: gross 14000, selfUse 7000, export 7000, unmet load 5000

  it("battery=0 gives results identical to no battery at all (spec pass criterion)", () => {
    const zero = buildEnergySeries(
      { system: { ...baseSystem, batteryKwh: 0 }, energy },
      25
    );
    const absent = buildEnergySeries(
      { system: { ...baseSystem, batteryKwh: undefined }, energy },
      25
    );
    expect(zero).toEqual(absent);
    expect(zero.every((r) => r.batteryShifted === 0)).toBe(true);
  });

  it("shifts surplus into unmet load, capped by annual throughput", () => {
    const system = { ...baseSystem, batteryKwh: 10, batteryDoD: 0.9, batteryRTE: 0.9 };
    const e = computeEnergyYear(1, { system, energy });
    const throughput = 10 * 0.9 * 0.9 * 365; // 2956.5
    expect(e.batteryShifted).toBeCloseTo(throughput, 6);
    expect(e.selfUse).toBeCloseTo(7000 + throughput, 6);
    expect(e.exportEnergy).toBeCloseTo(7000 - throughput, 6);
  });

  it("never pushes self-use above the load (shift limited by unmet load)", () => {
    const system = { ...baseSystem, batteryKwh: 100 }; // huge battery
    const e = computeEnergyYear(1, { system, energy });
    expect(e.selfUse).toBeCloseTo(12000, 6); // = load, not more
    expect(e.batteryShifted).toBeCloseTo(5000, 6); // only the unmet load
  });

  it("conserves energy: selfUse + export + curtailed = grossYield", () => {
    const system = { ...baseSystem, batteryKwh: 10 };
    const e = computeEnergyYear(1, {
      system,
      energy: { ...energy, exportCapKw: 2 },
    });
    expect(e.selfUse + e.exportEnergy + e.curtailed).toBeCloseTo(e.grossYield, 6);
  });

  it("a real battery actually changes the result (guard against no-op)", () => {
    const withBatt = computeEnergyYear(1, {
      system: { ...baseSystem, batteryKwh: 10 },
      energy,
    });
    const without = computeEnergyYear(1, { system: baseSystem, energy });
    expect(withBatt.selfUse).toBeGreaterThan(without.selfUse);
  });
});

describe("export cap and curtailment", () => {
  it("curtails export beyond exportCapKw-equivalent energy", () => {
    const energy = {
      ...baseEnergy,
      loadYear1Kwh: null,
      selfConsumptionPct: 0.1,
      exportCapKw: 5,
    };
    const e = computeEnergyYear(1, { system: baseSystem, energy });
    const capEnergy = 5 * 1400; // 7000
    expect(e.exportEnergy).toBeCloseTo(capEnergy, 6);
    expect(e.curtailed).toBeCloseTo(14000 * 0.9 - capEnergy, 6);
  });

  it("does not curtail when the cap is not binding or not set", () => {
    const capped = computeEnergyYear(1, {
      system: baseSystem,
      energy: { ...baseEnergy, exportCapKw: 20 },
    });
    const uncapped = computeEnergyYear(1, {
      system: baseSystem,
      energy: { ...baseEnergy, exportCapKw: null },
    });
    expect(capped.curtailed).toBe(0);
    expect(capped.exportEnergy).toBeCloseTo(uncapped.exportEnergy, 6);
  });
});

describe("money lines", () => {
  it("escalates import savings but keeps export rate flat within the term", () => {
    const energy = { ...baseEnergy, tariffEscalation: 0.03, degradation: 0 };
    const y1 = computeEnergyYear(1, { system: baseSystem, energy });
    const y2 = computeEnergyYear(2, { system: baseSystem, energy });
    // load grows 2%/yr and selfUse is load-capped? No: target 7000 < load 12000,
    // so selfUse identical across years (degradation=0) — savings differ by escalation only.
    expect(y2.savings).toBeCloseTo(y1.savings * 1.03, 6);
    expect(y2.exportRevenue).toBeCloseTo(y1.exportRevenue, 6);
  });

  it("stops export revenue after exportTermYears", () => {
    const series = buildEnergySeries(
      { system: baseSystem, energy: baseEnergy },
      15
    );
    expect(series[9].exportRevenue).toBeGreaterThan(0); // year 10
    expect(series[10].exportRevenue).toBe(0); // year 11
  });

  it("adds flat demand charge savings", () => {
    const withDc = computeEnergyYear(1, {
      system: baseSystem,
      energy: { ...baseEnergy, demandChargeSavings: 5000 },
    });
    const without = computeEnergyYear(1, { system: baseSystem, energy: baseEnergy });
    expect(withDc.savings - without.savings).toBeCloseTo(5000, 6);
  });
});
