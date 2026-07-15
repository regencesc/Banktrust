import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  STORAGE_KEY,
  loadState,
  saveState,
  clearState,
  createAutosaver,
} from "./persistence.js";
import { createAppState, addProject } from "./state.js";

/** Minimal in-memory localStorage stand-in. */
function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    _map: map,
  };
}

describe("saveState / loadState", () => {
  it("round-trips an AppState through storage", () => {
    const storage = memoryStorage();
    const { state } = addProject(createAppState(), "โครงการ A");
    expect(saveState(state, storage)).toBe(true);
    const loaded = loadState(storage);
    expect(loaded.projects).toHaveLength(1);
    expect(loaded.projects[0].name).toBe("โครงการ A");
    expect(loaded.activeProjectId).toBe(state.activeProjectId);
  });

  it("returns null on first run, corrupt JSON, or unsupported version", () => {
    const storage = memoryStorage();
    expect(loadState(storage)).toBeNull(); // nothing stored
    storage.setItem(STORAGE_KEY, "{corrupt");
    expect(loadState(storage)).toBeNull();
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 999 }));
    expect(loadState(storage)).toBeNull();
  });

  it("survives an unavailable or throwing storage backend", () => {
    expect(loadState(null)).toBeNull();
    expect(saveState(createAppState(), null)).toBe(false);
    const quotaFull = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {},
    };
    expect(saveState(createAppState(), quotaFull)).toBe(false);
    expect(() => clearState(null)).not.toThrow();
  });

  it("clearState removes the stored state", () => {
    const storage = memoryStorage();
    saveState(createAppState(), storage);
    clearState(storage);
    expect(loadState(storage)).toBeNull();
  });
});

describe("createAutosaver (debounced)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("writes once after the delay, keeping only the latest state", () => {
    const storage = memoryStorage();
    const onSaved = vi.fn();
    const saver = createAutosaver({ delay: 800, storage, onSaved });

    const s1 = addProject(createAppState(), "ครั้งที่ 1").state;
    const s2 = addProject(s1, "ครั้งที่ 2").state;
    saver.schedule(s1);
    vi.advanceTimersByTime(400);
    saver.schedule(s2); // supersedes s1, restarts the debounce
    vi.advanceTimersByTime(799);
    expect(loadState(storage)).toBeNull(); // not yet written
    vi.advanceTimersByTime(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledWith(true);
    expect(loadState(storage).projects).toHaveLength(2); // latest state won
  });

  it("flush() writes immediately", () => {
    const storage = memoryStorage();
    const saver = createAutosaver({ delay: 800, storage });
    saver.schedule(addProject(createAppState(), "ด่วน").state);
    expect(saver.pending).toBe(true);
    saver.flush();
    expect(saver.pending).toBe(false);
    expect(loadState(storage).projects).toHaveLength(1);
  });

  it("flush() with nothing pending is a no-op", () => {
    const storage = memoryStorage();
    const onSaved = vi.fn();
    const saver = createAutosaver({ storage, onSaved });
    saver.flush();
    expect(onSaved).not.toHaveBeenCalled();
    expect(loadState(storage)).toBeNull();
  });

  it("reports save failure through onSaved(false)", () => {
    const onSaved = vi.fn();
    const saver = createAutosaver({ delay: 100, storage: null, onSaved });
    saver.schedule(createAppState());
    vi.advanceTimersByTime(100);
    expect(onSaved).toHaveBeenCalledWith(false);
  });
});
