import { describe, it, expect } from "vitest";
import {
  createCapexItem,
  createOpexItem,
  capexToOpex,
  opexToCapex,
  parseCapexAoa,
  parseOpexAoa,
  parseProfileAoa,
  serializeCapexAoa,
  serializeOpexAoa,
  serializeProfileAoa,
  emptyMonthlyProfile,
  CAPEX_HEADERS,
  OPEX_HEADERS,
} from "./costItems.js";
import { capexItemNet } from "./costs.js";

describe("factories", () => {
  it("create empty items with unique ids (Hard Rule 1)", () => {
    const a = createCapexItem();
    const b = createCapexItem();
    expect(a.id).not.toBe(b.id);
    expect(a.qty).toBeNull();
    expect(a.unitPrice).toBeNull();
    expect(a.kind).toBe("capex");
    expect(createOpexItem().costPerOccurrence).toBeNull();
  });
});

describe("CAPEX <-> OPEX conversion", () => {
  it("capexToOpex carries the net (pre-VAT) price as cost per occurrence", () => {
    const capex = {
      ...createCapexItem(),
      category: "บำรุงรักษา",
      name: "ล้างแผง",
      qty: 4,
      unitPrice: 1000,
      discountPct: 0.1,
      vatPct: 0.07,
    };
    const opex = capexToOpex(capex);
    expect(opex.name).toBe("ล้างแผง");
    expect(opex.costPerOccurrence).toBeCloseTo(3600, 6); // 4×1000×0.9, no VAT
    expect(opex.startYear).toBe(1);
    expect(opex.id).not.toBe(capex.id);
  });

  it("opexToCapex becomes qty 1 at the occurrence cost", () => {
    const opex = { ...createOpexItem(), name: "ประกันภัย", costPerOccurrence: 5000 };
    const capex = opexToCapex(opex);
    expect(capex.qty).toBe(1);
    expect(capex.unitPrice).toBe(5000);
    expect(capex.kind).toBe("capex");
  });

  it("handles empty items without inventing numbers", () => {
    expect(capexToOpex(createCapexItem()).costPerOccurrence).toBeNull();
    expect(opexToCapex(createOpexItem()).qty).toBeNull();
  });
});

describe("CAPEX spreadsheet round-trip", () => {
  const items = [
    {
      ...createCapexItem(),
      category: "อุปกรณ์หลัก",
      name: "แผง 550W",
      spec: "mono PERC",
      qty: 20,
      unit: "แผง",
      unitPrice: 4500,
      discountPct: 0.05,
      vatPct: 0.07,
      replacementYear: null,
      replacementCycles: null,
      replacementPct: null,
    },
    {
      ...createCapexItem(),
      category: "อุปกรณ์หลัก",
      name: "Inverter 8kW",
      qty: 1,
      unitPrice: 40000,
      vatPct: 0.07,
      replacementYear: 12,
      replacementCycles: 1,
      replacementPct: 0.8,
    },
  ];

  it("serializes with human-facing percents and parses back to fractions", () => {
    const aoa = serializeCapexAoa(items);
    expect(aoa[0]).toEqual(CAPEX_HEADERS);
    expect(aoa[1][6]).toBe(5); // 0.05 -> 5
    expect(aoa[2][10]).toBe(80); // 0.8 -> 80

    const parsed = parseCapexAoa(aoa);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].discountPct).toBeCloseTo(0.05, 10);
    expect(parsed[0].qty).toBe(20);
    expect(parsed[1].replacementYear).toBe(12);
    expect(parsed[1].replacementPct).toBeCloseTo(0.8, 10);
    // engine math survives the round-trip
    expect(capexItemNet(parsed[0])).toBeCloseTo(capexItemNet(items[0]), 6);
  });

  it("skips blank and junk rows and rows with no name/price", () => {
    const aoa = [
      CAPEX_HEADERS,
      [],
      ["", "", "", "", "", "", "", "", "", "", ""],
      ["หมวด", "ค่าแรง", "", "abc", "", "xyz", "", "", "", "", ""], // bad numbers -> null
      ["", "", "", 5, "", "", "", "", "", "", ""], // qty only, no name/price -> dropped
    ];
    const parsed = parseCapexAoa(aoa);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe("ค่าแรง");
    expect(parsed[0].qty).toBeNull();
    expect(parsed[0].unitPrice).toBeNull();
  });
});

describe("OPEX spreadsheet round-trip", () => {
  it("round-trips window and escalation fields", () => {
    const items = [
      {
        ...createOpexItem(),
        category: "O&M",
        name: "สัญญาบำรุงรักษา",
        costPerOccurrence: 12000,
        escalationPct: 0.03,
        startYear: 1,
        endYear: 25,
        everyNYears: 1,
      },
    ];
    const aoa = serializeOpexAoa(items);
    expect(aoa[0]).toEqual(OPEX_HEADERS);
    expect(aoa[1][3]).toBeCloseTo(3, 10);
    const parsed = parseOpexAoa(aoa);
    expect(parsed[0].escalationPct).toBeCloseTo(0.03, 10);
    expect(parsed[0].endYear).toBe(25);
  });
});

describe("monthly profile spreadsheet", () => {
  it("emptyMonthlyProfile gives 12 blank months", () => {
    const p = emptyMonthlyProfile();
    expect(p).toHaveLength(12);
    expect(p[0]).toEqual({ month: 1, loadKwh: null, pvKwh: null });
    expect(p[11].month).toBe(12);
  });

  it("round-trips and caps at 12 rows", () => {
    const profile = emptyMonthlyProfile().map((m) => ({
      ...m,
      loadKwh: 1000 + m.month,
      pvKwh: 900,
    }));
    const aoa = serializeProfileAoa(profile);
    const parsed = parseProfileAoa([...aoa, [13, 1, 1], [14, 1, 1]]);
    expect(parsed).toHaveLength(12);
    expect(parsed[3]).toEqual({ month: 4, loadKwh: 1004, pvKwh: 900 });
  });

  it("fills missing month numbers by position", () => {
    const parsed = parseProfileAoa([PROFILE_HEADERS_LIKE, ["", 500, 400]]);
    expect(parsed[0].month).toBe(1);
    expect(parsed[0].loadKwh).toBe(500);
  });
});

const PROFILE_HEADERS_LIKE = ["เดือน", "โหลด", "PV"];
