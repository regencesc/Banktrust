// ============================================================================
// state.js — AppState data model, multi-project CRUD, JSON export/import
// (SPEC-UPGRADE.md §3, Phase 2). Pure JS, no React, no storage side effects
// (persistence lives in persistence.js).
//
// Hard Rule 1: new projects start EMPTY — every user input is null until the
// user fills it in. The only prefills allowed are regulatory/official
// constants, exposed as opt-in presets below (Hard Rule 2), always editable.
// ============================================================================

export const APP_STATE_VERSION = 1;

export function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------
// Regulatory constants / presets (Hard Rule 2) — opt-in, editable, and the UI
// must show a "check the latest announcement" warning next to them.
// ---------------------------------------------------------------------------

export const VAT_DEFAULT = 0.07;

export const ENERGY_PRESETS = [
  {
    id: "mea-residential-2569",
    label: "บ้านอยู่อาศัย กฟน. 2569",
    warning: "อ้างอิงประกาศ กฟน. ที่ 58/2569 — โปรดตรวจสอบประกาศฉบับล่าสุดก่อนใช้",
    energy: { exportRate: 2.2, exportTermYears: 10, exportCapKw: 5 },
  },
];

/** Apply an energy preset onto a project (returns a new project). */
export function applyEnergyPreset(project, presetId) {
  const preset = ENERGY_PRESETS.find((p) => p.id === presetId);
  if (!preset) return project;
  return {
    ...project,
    energy: { ...project.energy, ...preset.energy },
  };
}

// ---------------------------------------------------------------------------
// Skeletons — single source of truth for the Project/AppState shape.
// normalize*(…) deep-merges saved data onto these, so states saved by older
// app versions gain new fields automatically.
// ---------------------------------------------------------------------------

export function createEmptyProject(name = "โครงการใหม่") {
  return {
    id: newId(),
    name,
    company: "",
    country: "",
    location: "",
    lat: null,
    lng: null,
    currency: "THB",
    projectLife: 25,
    gridEmissionFactor: null,
    notes: "",
    system: {
      panelWp: null,
      panelCount: null,
      inverterAcKw: null,
      panelAreaM2: null,
      roofAreaM2: null,
      batteryKwh: null,
      batteryDoD: null,
      batteryRTE: null,
    },
    energy: {
      mode: "annual",
      specificYield: null,
      availability: null,
      systemLosses: null,
      yieldIncludesLosses: true,
      degradation: null,
      loadYear1Kwh: null,
      loadGrowth: null,
      selfConsumptionPct: null,
      monthlyProfile: null,
      importRate: null,
      exportRate: null,
      tariffEscalation: null,
      exportTermYears: null,
      exportCapKw: null,
      demandChargeSavings: null,
    },
    costs: {
      vatRecoverable: false,
      capexItems: [],
      opexItems: [],
    },
    finance: {
      discountRate: null,
      generalInflation: null,
      taxMode: "corporate",
      corporateTaxRate: null,
      depreciationYears: null,
      depreciableBasisPct: null,
      personalTaxBracket: null,
      personalDeductionCap: null,
      decommissioningPct: null,
      otherIncomeY1: null,
      otherIncomeGrowth: null,
      loanEnabled: false,
      debtRatio: null,
      interestRate: null,
      loanTerm: null,
      gracePeriod: null,
      minDscrTarget: null,
    },
    variants: [],
  };
}

export function createAppState() {
  return {
    version: APP_STATE_VERSION,
    language: "th",
    activeProjectId: null,
    projects: [],
    priceList: [],
  };
}

function isObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Deep-merge raw onto skeleton: unknown keys kept, missing keys filled. */
function mergeOntoSkeleton(skeleton, raw) {
  if (!isObject(raw)) return skeleton;
  const out = { ...skeleton, ...raw };
  for (const key of Object.keys(skeleton)) {
    if (isObject(skeleton[key])) {
      out[key] = mergeOntoSkeleton(skeleton[key], raw[key]);
    }
  }
  return out;
}

/** Normalize one saved/imported project onto the current skeleton. */
export function normalizeProject(raw) {
  const skeleton = createEmptyProject();
  const project = mergeOntoSkeleton(skeleton, raw);
  if (!project.id) project.id = newId();
  if (!Array.isArray(project.variants)) project.variants = [];
  if (!Array.isArray(project.costs.capexItems)) project.costs.capexItems = [];
  if (!Array.isArray(project.costs.opexItems)) project.costs.opexItems = [];
  return project;
}

/**
 * Validate + migrate a raw persisted/imported AppState.
 * Returns a normalized state, or null when the payload is unusable
 * (wrong shape or a version newer than this app understands).
 */
export function migrateAppState(raw) {
  if (!isObject(raw)) return null;
  if (typeof raw.version !== "number" || raw.version > APP_STATE_VERSION) {
    return null;
  }
  const state = createAppState();
  state.language = raw.language === "en" ? "en" : "th";
  state.projects = Array.isArray(raw.projects)
    ? raw.projects.map(normalizeProject)
    : [];
  state.priceList = Array.isArray(raw.priceList) ? raw.priceList : [];
  state.activeProjectId = state.projects.some((p) => p.id === raw.activeProjectId)
    ? raw.activeProjectId
    : state.projects[0]?.id ?? null;
  return state;
}

// ---------------------------------------------------------------------------
// Multi-project CRUD — all pure: (state, …) → new state.
// ---------------------------------------------------------------------------

export function getActiveProject(state) {
  return state.projects.find((p) => p.id === state.activeProjectId) ?? null;
}

export function addProject(state, name) {
  const project = createEmptyProject(name);
  return {
    state: {
      ...state,
      projects: [...state.projects, project],
      activeProjectId: project.id,
    },
    project,
  };
}

export function duplicateProject(state, projectId) {
  const source = state.projects.find((p) => p.id === projectId);
  if (!source) return { state, project: null };
  const copy = structuredClone(source);
  copy.id = newId();
  copy.name = `${source.name} (สำเนา)`;
  const index = state.projects.findIndex((p) => p.id === projectId);
  const projects = [...state.projects];
  projects.splice(index + 1, 0, copy);
  return {
    state: { ...state, projects, activeProjectId: copy.id },
    project: copy,
  };
}

export function deleteProject(state, projectId) {
  const projects = state.projects.filter((p) => p.id !== projectId);
  const activeProjectId =
    state.activeProjectId === projectId
      ? projects[0]?.id ?? null
      : state.activeProjectId;
  return { ...state, projects, activeProjectId };
}

/** updater: (project) → new project. Unknown id returns state unchanged. */
export function updateProject(state, projectId, updater) {
  const index = state.projects.findIndex((p) => p.id === projectId);
  if (index === -1) return state;
  const projects = [...state.projects];
  projects[index] = { ...updater(projects[index]), id: projectId };
  return { ...state, projects };
}

export function setActiveProject(state, projectId) {
  if (!state.projects.some((p) => p.id === projectId)) return state;
  return { ...state, activeProjectId: projectId };
}

export function setLanguage(state, language) {
  return { ...state, language: language === "en" ? "en" : "th" };
}

// ---------------------------------------------------------------------------
// Shared price list (used across projects; full editing UI arrives Phase 4).
// ---------------------------------------------------------------------------

export function upsertPriceListItem(state, item) {
  const withId = item.id ? item : { ...item, id: newId() };
  const index = state.priceList.findIndex((i) => i.id === withId.id);
  const priceList = [...state.priceList];
  if (index === -1) priceList.push(withId);
  else priceList[index] = withId;
  return { ...state, priceList };
}

export function removePriceListItem(state, itemId) {
  return { ...state, priceList: state.priceList.filter((i) => i.id !== itemId) };
}

// ---------------------------------------------------------------------------
// Export / Import JSON (Hard Rule 7) — per project and whole portfolio.
// ---------------------------------------------------------------------------

const PROJECT_KIND = "solar-studio-project";
const PORTFOLIO_KIND = "solar-studio-portfolio";

export function exportProjectJson(state, projectId) {
  const project = state.projects.find((p) => p.id === projectId);
  if (!project) return null;
  return JSON.stringify(
    {
      kind: PROJECT_KIND,
      version: APP_STATE_VERSION,
      exportedAt: new Date().toISOString(),
      project,
    },
    null,
    2
  );
}

export function exportPortfolioJson(state) {
  return JSON.stringify(
    {
      kind: PORTFOLIO_KIND,
      version: APP_STATE_VERSION,
      exportedAt: new Date().toISOString(),
      state: {
        version: state.version,
        language: state.language,
        activeProjectId: state.activeProjectId,
        projects: state.projects,
        priceList: state.priceList,
      },
    },
    null,
    2
  );
}

/**
 * Import a JSON payload produced by the exporters above.
 *  - project payload  → appended to the current portfolio (fresh id on
 *    collision) and made active
 *  - portfolio payload → replaces the whole state (caller confirms in UI)
 * Returns { ok:true, state, imported } or { ok:false, error } with error one
 * of: 'invalid-json' | 'unknown-format' | 'unsupported-version'.
 */
export function importJson(state, text) {
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    return { ok: false, error: "invalid-json" };
  }
  if (!isObject(payload)) return { ok: false, error: "unknown-format" };
  if (typeof payload.version !== "number" || payload.version > APP_STATE_VERSION) {
    return { ok: false, error: "unsupported-version" };
  }

  if (payload.kind === PROJECT_KIND && isObject(payload.project)) {
    const project = normalizeProject(payload.project);
    if (state.projects.some((p) => p.id === project.id)) {
      project.id = newId();
    }
    return {
      ok: true,
      imported: "project",
      state: {
        ...state,
        projects: [...state.projects, project],
        activeProjectId: project.id,
      },
    };
  }

  if (payload.kind === PORTFOLIO_KIND && isObject(payload.state)) {
    const migrated = migrateAppState(payload.state);
    if (!migrated) return { ok: false, error: "unknown-format" };
    return { ok: true, imported: "portfolio", state: migrated };
  }

  return { ok: false, error: "unknown-format" };
}
