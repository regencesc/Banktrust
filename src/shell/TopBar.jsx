import { useRef, useState } from "react";
import { useApp, useActiveProject } from "../state/AppContext.jsx";
import {
  createEmptyProject,
  exportProjectJson,
  exportPortfolioJson,
  importJson,
} from "../lib/state.js";

function downloadJson(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const statusStyle = {
  saved: "text-ok",
  saving: "text-ink/40",
  error: "text-danger",
};

const btn =
  "rounded-lg border border-line bg-white hover:bg-surface text-xs font-medium " +
  "text-ink/70 px-3 py-1.5 transition-colors disabled:opacity-40 disabled:pointer-events-none";

export default function TopBar() {
  const { state, apply, saveStatus, strings } = useApp();
  const { project, update } = useActiveProject();
  const fileRef = useRef(null);
  const [message, setMessage] = useState(null);
  const t = strings.topbar;

  const flash = (text, tone = "ok") => {
    setMessage({ text, tone });
    setTimeout(() => setMessage(null), 4000);
  };

  const onExportProject = () => {
    const json = exportProjectJson(state, project.id);
    if (json) downloadJson(`${project.name || "project"}.solar-project.json`, json);
  };

  const onExportAll = () => {
    downloadJson("solar-studio-portfolio.json", exportPortfolioJson(state));
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-importing the same file
    if (!file) return;
    const text = await file.text();
    const result = importJson(state, text);
    if (!result.ok) {
      flash(t.importErrors[result.error], "danger");
      return;
    }
    if (result.imported === "portfolio" && state.projects.length > 0) {
      if (!window.confirm(t.importPortfolioConfirm)) return;
    }
    apply(result.state);
    flash(result.imported === "project" ? t.importedProject : t.importedPortfolio);
  };

  const onReset = () => {
    if (!window.confirm(t.resetConfirm)) return;
    update((p) => ({ ...createEmptyProject(p.name), id: p.id }));
  };

  return (
    <header className="h-14 shrink-0 bg-white border-b border-line flex items-center justify-between px-5 gap-4">
      <div className="min-w-0 flex items-center gap-3">
        <h1 className="font-display text-sm font-medium text-ink truncate">
          {project ? project.name : strings.app.tagline}
        </h1>
        {project?.location && (
          <span className="text-xs text-ink/40 truncate">{project.location}</span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {message && (
          <span
            className={`text-xs ${message.tone === "danger" ? "text-danger" : "text-ok"}`}
          >
            {message.text}
          </span>
        )}
        <span
          className={`text-[11px] flex items-center gap-1.5 mr-1 ${statusStyle[saveStatus]}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {t[saveStatus === "error" ? "saveError" : saveStatus]}
        </span>

        <button type="button" className={btn} disabled={!project} onClick={onExportProject}>
          {t.exportProject}
        </button>
        <button type="button" className={btn} onClick={onExportAll}>
          {t.exportAll}
        </button>
        <button type="button" className={btn} onClick={() => fileRef.current?.click()}>
          {t.import}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={onImportFile}
        />
        <button
          type="button"
          disabled={!project}
          onClick={onReset}
          className="rounded-lg border border-red-200 bg-white hover:bg-red-50 text-xs font-medium text-danger px-3 py-1.5 transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          {t.reset}
        </button>
      </div>
    </header>
  );
}
