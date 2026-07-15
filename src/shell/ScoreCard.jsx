import { useApp, useActiveProject, useProjectResult } from "../state/AppContext.jsx";
import { computeScreeningScore } from "../lib/scoring.js";
import Badge from "../ui/Badge.jsx";

const verdictTone = { good: "ok", fair: "warn", poor: "danger" };

/** Sidebar screening-score card (§5 layout). */
export default function ScoreCard() {
  const { strings } = useApp();
  const { project } = useActiveProject();
  const result = useProjectResult();
  if (!project || !result) return null;

  const score = computeScreeningScore(project, result);
  const missing = score.checks.filter((c) => !c.ok).length;

  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="text-[11px] font-medium text-ink/50 mb-1.5">
        {strings.sidebar.score}
      </div>
      {missing > 0 ? (
        <p className="text-xs text-ink/60 leading-relaxed">
          {strings.sidebar.scoreIncomplete(missing)}
        </p>
      ) : (
        <>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-2xl font-semibold text-ink tabular-nums">
              {score.total}
            </span>
            <span className="text-xs text-ink/40">/100</span>
          </div>
          <div className="h-1.5 rounded-full bg-line mt-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-500"
              style={{ width: `${score.total}%` }}
            />
          </div>
          <Badge tone={verdictTone[score.verdict.level]} className="mt-2">
            {score.verdict.label}
          </Badge>
        </>
      )}
    </div>
  );
}
