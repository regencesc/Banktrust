// ============================================================================
// AppContext.jsx — React glue over the pure state/persistence libs.
// Loads AppState from localStorage once, autosaves (debounced) on every
// change, and exposes { state, apply, saveStatus } plus per-project helpers.
// ============================================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createAppState, getActiveProject, updateProject } from "../lib/state.js";
import { createAutosaver, loadState } from "../lib/persistence.js";
import { computeProject } from "../lib/calculations.js";
import { th } from "../locale/th.js";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, setState] = useState(() => loadState() ?? createAppState());
  const [saveStatus, setSaveStatus] = useState("saved"); // saved | saving | error

  const saverRef = useRef(null);
  if (saverRef.current === null) {
    saverRef.current = createAutosaver({
      onSaved: (ok) => setSaveStatus(ok ? "saved" : "error"),
    });
  }

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSaveStatus("saving");
    saverRef.current.schedule(state);
  }, [state]);

  // Never lose the debounce window on tab close / refresh.
  useEffect(() => {
    const flush = () => saverRef.current.flush();
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  /** apply(nextState | (prev) => nextState) — the single write path. */
  const apply = useCallback((updater) => {
    setState((prev) => (typeof updater === "function" ? updater(prev) : updater));
  }, []);

  const value = useMemo(
    () => ({ state, apply, saveStatus, strings: th }),
    [state, apply, saveStatus]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

/** Active project + immutable patch helpers scoped to it. */
export function useActiveProject() {
  const { state, apply } = useApp();
  const project = getActiveProject(state);
  const projectId = project?.id;

  const update = useCallback(
    (updater) => {
      if (!projectId) return;
      apply((s) => updateProject(s, projectId, updater));
    },
    [apply, projectId]
  );

  const patchTop = useCallback(
    (patch) => update((p) => ({ ...p, ...patch })),
    [update]
  );

  const patchSection = useCallback(
    (section, patch) =>
      update((p) => ({ ...p, [section]: { ...p[section], ...patch } })),
    [update]
  );

  return { project, update, patchTop, patchSection };
}

/** Engine result for the active project (memoized on the project object). */
export function useProjectResult() {
  const { project } = useActiveProject();
  return useMemo(() => (project ? computeProject(project) : null), [project]);
}
