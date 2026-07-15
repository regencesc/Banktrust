// ============================================================================
// persistence.js — localStorage load/save + debounced autosaver
// (SPEC-UPGRADE.md §3 + Hard Rule 6, Phase 2). Pure JS, no React.
//
// The storage backend is injectable so the module is testable in Node and
// resilient in environments without localStorage (SSR, privacy modes).
// ============================================================================

import { migrateAppState } from "./state.js";

/** Single storage key per spec §3. */
export const STORAGE_KEY = "solar-studio-state-v1";

function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // Accessing localStorage can throw in privacy modes / sandboxed iframes.
    return null;
  }
}

/**
 * Load and migrate the persisted AppState.
 * Returns null when nothing usable is stored (first run, corrupt JSON,
 * unsupported version, or storage unavailable) — caller starts fresh.
 */
export function loadState(storage = defaultStorage()) {
  if (!storage) return null;
  let text;
  try {
    text = storage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!text) return null;
  try {
    return migrateAppState(JSON.parse(text));
  } catch {
    return null;
  }
}

/**
 * Persist the AppState. Returns true on success, false when storage is
 * unavailable or full (quota) — callers surface this on the autosave
 * indicator instead of crashing.
 */
export function saveState(state, storage = defaultStorage()) {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearState(storage = defaultStorage()) {
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Debounced autosaver: schedule(state) keeps only the latest state and
 * writes it once the user pauses for `delay` ms. flush() writes immediately
 * (page hide / manual save). onSaved(ok) feeds the autosave indicator.
 */
export function createAutosaver({
  delay = 800,
  storage = defaultStorage(),
  onSaved = () => {},
} = {}) {
  let timer = null;
  let pendingState = null;

  const write = () => {
    timer = null;
    if (pendingState === null) return;
    const ok = saveState(pendingState, storage);
    pendingState = null;
    onSaved(ok);
  };

  return {
    schedule(state) {
      pendingState = state;
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(write, delay);
    },
    flush() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      write();
    },
    get pending() {
      return pendingState !== null;
    },
  };
}
