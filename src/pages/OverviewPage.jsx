import { Link, useNavigate } from "react-router-dom";
import { useApp, useActiveProject } from "../state/AppContext.jsx";
import { addProject } from "../lib/state.js";
import { dataChecks } from "../lib/scoring.js";
import Panel from "../ui/Panel.jsx";
import Badge from "../ui/Badge.jsx";
import EmptyState, { SunIcon } from "../shell/EmptyState.jsx";

export default function OverviewPage() {
  const { apply, strings } = useApp();
  const { project } = useActiveProject();
  const navigate = useNavigate();
  const t = strings.overview;

  if (!project) {
    return (
      <div className="max-w-3xl">
        <h1 className="font-display text-xl font-semibold text-ink mb-5">{t.title}</h1>
        <EmptyState
          icon={<SunIcon />}
          title={strings.empty.noProjectTitle}
          body={strings.empty.noProjectBody}
          actionLabel={strings.empty.createProject}
          onAction={() => {
            apply((s) => addProject(s, strings.sidebar.newProjectName).state);
            navigate("/project");
          }}
        />
      </div>
    );
  }

  const checks = dataChecks(project);

  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="font-display text-xl font-semibold text-ink">{t.title}</h1>

      <Panel title={t.checklistTitle} subtitle={t.checklistHint}>
        <ul className="divide-y divide-line">
          {checks.map((c) => {
            const meta = strings.checks[c.id];
            return (
              <li key={c.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5">
                  <span
                    className={
                      "w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold " +
                      (c.ok ? "bg-green-50 text-ok" : "bg-surface text-ink/30")
                    }
                  >
                    {c.ok ? "✓" : "•"}
                  </span>
                  <span className={`text-sm ${c.ok ? "text-ink" : "text-ink/50"}`}>
                    {meta.label}
                  </span>
                </div>
                {!c.ok && (
                  <Link
                    to={meta.page}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    {t.goFill} →
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>

      <div className="flex items-start gap-2 text-xs text-ink/40">
        <Badge tone="neutral">P5</Badge>
        <p>{t.dashboardNote}</p>
      </div>
    </div>
  );
}
