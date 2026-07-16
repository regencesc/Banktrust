import { NavLink, useNavigate } from "react-router-dom";
import { useApp } from "../state/AppContext.jsx";
import {
  addProject,
  duplicateProject,
  deleteProject,
  setActiveProject,
} from "../lib/state.js";
import ScoreCard from "./ScoreCard.jsx";
import { SunIcon } from "./EmptyState.jsx";

// Menu order per SPEC-UPGRADE.md §5. `phase` marks pages arriving later —
// they stay navigable and show a coming-soon empty state.
const MENU = [
  { to: "/", key: "overview" },
  { to: "/comparison", key: "comparison", phase: 6 },
  { to: "/portfolio", key: "portfolio", phase: 6 },
  { to: "/project", key: "projectSystem" },
  { to: "/costs", key: "costs" },
  { to: "/energy", key: "energy" },
  { to: "/finance", key: "finance" },
  { to: "/sensitivity", key: "sensitivity", phase: 6 },
  { to: "/cashflow", key: "cashflow" },
  { to: "/methodology", key: "methodology", phase: 6 },
];

export default function Sidebar() {
  const { state, apply, strings } = useApp();
  const navigate = useNavigate();

  const onAdd = () => {
    apply((s) => addProject(s, strings.sidebar.newProjectName).state);
    navigate("/project");
  };

  const onDelete = (id) => {
    if (!window.confirm(strings.sidebar.deleteConfirm)) return;
    apply((s) => deleteProject(s, id));
  };

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-line flex flex-col min-h-screen">
      {/* logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-line">
        <div className="w-8 h-8 rounded-lg bg-brand-500 text-white flex items-center justify-center">
          <SunIcon size={18} />
        </div>
        <div className="font-display font-semibold text-sm text-ink leading-tight">
          {strings.app.name}
        </div>
      </div>

      {/* project list */}
      <div className="px-3 pt-4">
        <div className="flex items-center justify-between px-1 mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink/40">
            {strings.sidebar.projects}
          </span>
          <button
            type="button"
            onClick={onAdd}
            title={strings.sidebar.addProject}
            aria-label={strings.sidebar.addProject}
            className="w-5 h-5 rounded-md bg-brand-50 text-brand-600 hover:bg-brand-100 text-sm leading-none font-semibold"
          >
            +
          </button>
        </div>

        {state.projects.length === 0 ? (
          <p className="px-1 text-xs text-ink/40">{strings.sidebar.noProjects}</p>
        ) : (
          <ul className="space-y-0.5 max-h-44 overflow-y-auto">
            {state.projects.map((p) => {
              const active = p.id === state.activeProjectId;
              return (
                <li key={p.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => apply((s) => setActiveProject(s, p.id))}
                    className={
                      "flex-1 min-w-0 text-left text-xs rounded-lg px-2.5 py-1.5 truncate transition-colors " +
                      (active
                        ? "bg-brand-50 text-brand-700 font-medium"
                        : "text-ink/70 hover:bg-surface")
                    }
                  >
                    {p.name || strings.sidebar.newProjectName}
                  </button>
                  <button
                    type="button"
                    title={strings.sidebar.duplicate}
                    aria-label={`${strings.sidebar.duplicate}: ${p.name}`}
                    onClick={() => apply((s) => duplicateProject(s, p.id).state)}
                    className="opacity-0 group-hover:opacity-100 text-ink/30 hover:text-brand-600 text-xs px-0.5"
                  >
                    ⧉
                  </button>
                  <button
                    type="button"
                    title={strings.sidebar.delete}
                    aria-label={`${strings.sidebar.delete}: ${p.name}`}
                    onClick={() => onDelete(p.id)}
                    className="opacity-0 group-hover:opacity-100 text-ink/30 hover:text-danger text-xs px-0.5"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* menu */}
      <nav className="px-3 pt-5 flex-1">
        <ul className="space-y-0.5">
          {MENU.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  "flex items-center justify-between text-[13px] rounded-lg px-2.5 py-1.5 transition-colors " +
                  (isActive
                    ? "bg-brand-50 text-brand-700 font-medium"
                    : "text-ink/70 hover:bg-surface")
                }
              >
                <span>{strings.nav[item.key]}</span>
                {item.phase && (
                  <span className="text-[10px] text-ink/30">P{item.phase}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* score + reminder */}
      <div className="px-3 pb-4 space-y-3">
        <ScoreCard />
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="text-[11px] font-semibold text-amber-800 mb-1">
            {strings.sidebar.reminderTitle}
          </div>
          <p className="text-[11px] text-amber-800/80 leading-relaxed">
            {strings.sidebar.reminderBody}
          </p>
        </div>
      </div>
    </aside>
  );
}
