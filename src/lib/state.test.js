import { describe, it, expect } from "vitest";
import {
  APP_STATE_VERSION,
  createAppState,
  createEmptyProject,
  normalizeProject,
  migrateAppState,
  getActiveProject,
  addProject,
  duplicateProject,
  deleteProject,
  updateProject,
  setActiveProject,
  setLanguage,
  upsertPriceListItem,
  removePriceListItem,
  exportProjectJson,
  exportPortfolioJson,
  importJson,
  applyEnergyPreset,
  ENERGY_PRESETS,
} from "./state.js";
import { computeProject } from "./calculations.js";

describe("createEmptyProject — Hard Rule 1 (no fake data)", () => {
  const p = createEmptyProject("ทดสอบ");

  it("leaves every user input empty", () => {
    expect(p.system.panelWp).toBeNull();
    expect(p.system.panelCount).toBeNull();
    expect(p.energy.specificYield).toBeNull();
    expect(p.energy.importRate).toBeNull();
    expect(p.energy.exportRate).toBeNull();
    expect(p.finance.discountRate).toBeNull();
    expect(p.costs.capexItems).toEqual([]);
    expect(p.costs.opexItems).toEqual([]);
  });

  it("has a unique id and the given name", () => {
    expect(p.id).toBeTruthy();
    expect(p.name).toBe("ทดสอบ");
    expect(createEmptyProject().id).not.toBe(p.id);
  });

  it("an empty project runs through the engine without crashing", () => {
    const result = computeProject(p);
    expect(result.metrics.projectNpv).toBe(0);
    expect(result.metrics.projectIrr).toBeNull();
    expect(result.metrics.simplePayback).toBeNull();
    expect(result.rows).toHaveLength(26);
  });
});

describe("energy presets — Hard Rule 2 (regulatory constants, opt-in)", () => {
  it("MEA 2569 preset fills the official purchase terms only", () => {
    const p = createEmptyProject();
    const applied = applyEnergyPreset(p, "mea-residential-2569");
    expect(applied.energy.exportRate).toBe(2.2);
    expect(applied.energy.exportTermYears).toBe(10);
    expect(applied.energy.exportCapKw).toBe(5);
    // nothing else gets touched
    expect(applied.energy.importRate).toBeNull();
    expect(applied.energy.specificYield).toBeNull();
  });

  it("every preset carries a check-latest-announcement warning", () => {
    for (const preset of ENERGY_PRESETS) {
      expect(preset.warning).toBeTruthy();
    }
  });

  it("unknown preset id is a no-op", () => {
    const p = createEmptyProject();
    expect(applyEnergyPreset(p, "nope")).toBe(p);
  });
});

describe("multi-project CRUD", () => {
  it("addProject appends and activates", () => {
    const { state, project } = addProject(createAppState(), "โครงการ A");
    expect(state.projects).toHaveLength(1);
    expect(state.activeProjectId).toBe(project.id);
    expect(getActiveProject(state)).toEqual(project);
  });

  it("duplicateProject deep-copies with a new id and (สำเนา) suffix", () => {
    let { state, project } = addProject(createAppState(), "ต้นฉบับ");
    state = updateProject(state, project.id, (p) => ({
      ...p,
      system: { ...p.system, panelWp: 550 },
    }));
    const dup = duplicateProject(state, project.id);
    expect(dup.state.projects).toHaveLength(2);
    expect(dup.project.id).not.toBe(project.id);
    expect(dup.project.name).toBe("ต้นฉบับ (สำเนา)");
    expect(dup.project.system.panelWp).toBe(550);
    // deep copy — mutating the copy must not touch the original
    dup.project.system.panelWp = 600;
    expect(dup.state.projects[0].system.panelWp).toBe(550);
  });

  it("deleteProject moves the active pointer to a survivor", () => {
    let { state, project: a } = addProject(createAppState(), "A");
    const addedB = addProject(state, "B");
    state = addedB.state;
    state = setActiveProject(state, a.id);
    state = deleteProject(state, a.id);
    expect(state.projects).toHaveLength(1);
    expect(state.activeProjectId).toBe(addedB.project.id);
    state = deleteProject(state, addedB.project.id);
    expect(state.activeProjectId).toBeNull();
  });

  it("updateProject applies the updater immutably and keeps the id", () => {
    const { state, project } = addProject(createAppState(), "A");
    const next = updateProject(state, project.id, (p) => ({
      ...p,
      id: "hacked",
      name: "เปลี่ยนชื่อ",
    }));
    expect(next.projects[0].name).toBe("เปลี่ยนชื่อ");
    expect(next.projects[0].id).toBe(project.id); // id is immutable
    expect(state.projects[0].name).toBe("A"); // original untouched
  });

  it("setActiveProject ignores unknown ids", () => {
    const { state } = addProject(createAppState(), "A");
    expect(setActiveProject(state, "missing")).toBe(state);
  });

  it("setLanguage accepts only th/en", () => {
    const state = createAppState();
    expect(setLanguage(state, "en").language).toBe("en");
    expect(setLanguage(state, "fr").language).toBe("th");
  });
});

describe("price list", () => {
  it("upserts and removes items", () => {
    let state = upsertPriceListItem(createAppState(), {
      name: "แผง 550W",
      unitPrice: 4500,
    });
    expect(state.priceList).toHaveLength(1);
    const id = state.priceList[0].id;
    expect(id).toBeTruthy();
    state = upsertPriceListItem(state, { id, name: "แผง 550W", unitPrice: 4200 });
    expect(state.priceList).toHaveLength(1);
    expect(state.priceList[0].unitPrice).toBe(4200);
    state = removePriceListItem(state, id);
    expect(state.priceList).toEqual([]);
  });
});

describe("normalize / migrate", () => {
  it("fills fields missing from older saves", () => {
    const p = normalizeProject({ id: "x", name: "เก่า", system: { panelWp: 500 } });
    expect(p.system.panelWp).toBe(500);
    expect(p.energy.mode).toBe("annual");
    expect(p.costs.capexItems).toEqual([]);
    expect(p.finance.loanEnabled).toBe(false);
  });

  it("migrates a valid v1 state and fixes a dangling activeProjectId", () => {
    const raw = {
      version: 1,
      language: "en",
      activeProjectId: "gone",
      projects: [{ id: "p1", name: "A" }],
      priceList: [],
    };
    const state = migrateAppState(raw);
    expect(state.language).toBe("en");
    expect(state.activeProjectId).toBe("p1");
    expect(state.projects[0].energy.mode).toBe("annual");
  });

  it("rejects junk and newer versions", () => {
    expect(migrateAppState(null)).toBeNull();
    expect(migrateAppState("nope")).toBeNull();
    expect(migrateAppState({ projects: [] })).toBeNull(); // no version
    expect(migrateAppState({ version: APP_STATE_VERSION + 1 })).toBeNull();
  });
});

describe("export / import JSON — Hard Rule 7", () => {
  function seededState() {
    let { state, project } = addProject(createAppState(), "โครงการหลัก");
    state = updateProject(state, project.id, (p) => ({
      ...p,
      system: { ...p.system, panelWp: 550, panelCount: 20 },
    }));
    state = upsertPriceListItem(state, { name: "inverter", unitPrice: 40000 });
    return { state, project };
  }

  it("round-trips a single project", () => {
    const { state, project } = seededState();
    const json = exportProjectJson(state, project.id);
    const target = createAppState();
    const result = importJson(target, json);
    expect(result.ok).toBe(true);
    expect(result.imported).toBe("project");
    expect(result.state.projects).toHaveLength(1);
    expect(result.state.projects[0].system.panelWp).toBe(550);
    expect(result.state.activeProjectId).toBe(result.state.projects[0].id);
  });

  it("regenerates the id when importing a project that already exists", () => {
    const { state, project } = seededState();
    const json = exportProjectJson(state, project.id);
    const result = importJson(state, json); // import into the same portfolio
    expect(result.ok).toBe(true);
    expect(result.state.projects).toHaveLength(2);
    expect(result.state.projects[1].id).not.toBe(project.id);
  });

  it("round-trips the whole portfolio (projects + price list + language)", () => {
    const { state } = seededState();
    const withLang = setLanguage(state, "en");
    const json = exportPortfolioJson(withLang);
    const result = importJson(createAppState(), json);
    expect(result.ok).toBe(true);
    expect(result.imported).toBe("portfolio");
    expect(result.state.projects).toHaveLength(1);
    expect(result.state.priceList).toHaveLength(1);
    expect(result.state.language).toBe("en");
  });

  it("reports invalid payloads with error codes", () => {
    const state = createAppState();
    expect(importJson(state, "{broken").error).toBe("invalid-json");
    expect(importJson(state, '"just a string"').error).toBe("unknown-format");
    expect(importJson(state, JSON.stringify({ kind: "other", version: 1 })).error).toBe(
      "unknown-format"
    );
    expect(
      importJson(
        state,
        JSON.stringify({ kind: "solar-studio-project", version: 99, project: {} })
      ).error
    ).toBe("unsupported-version");
  });

  it("exportProjectJson returns null for an unknown project", () => {
    expect(exportProjectJson(createAppState(), "missing")).toBeNull();
  });
});
