import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../state/AppContext.jsx";
import { setActiveProject } from "../lib/state.js";
import { computeProject } from "../lib/calculations.js";
import { computeScreeningScore } from "../lib/scoring.js";
import { deriveSystem } from "../lib/energy.js";
import { formatTHB, formatPercent, formatYears, formatNumber } from "../lib/formatters.js";
import Panel from "../ui/Panel.jsx";
import Badge from "../ui/Badge.jsx";
import EmptyState, { SunIcon } from "../shell/EmptyState.jsx";

const verdictTone = { good: "ok", fair: "warn", poor: "danger" };

export default function PortfolioPage() {
  const { state, apply, strings } = useApp();
  const navigate = useNavigate();
  const t = strings.portfolioPage;

  const rows = useMemo(
    () =>
      state.projects.map((project) => {
        const result = computeProject(project);
        return {
          project,
          kwp: deriveSystem(project.system).dcKwp,
          metrics: result.metrics,
          grossCapex: result.grossCapex,
          score: computeScreeningScore(project, result),
        };
      }),
    [state.projects]
  );

  if (rows.length === 0) {
    return (
      <div className="max-w-4xl">
        <h1 className="font-display text-xl font-semibold text-ink mb-5">{t.title}</h1>
        <EmptyState
          icon={<SunIcon />}
          title={t.empty}
          body={strings.empty.noProjectBody}
        />
      </div>
    );
  }

  const totals = rows.reduce(
    (acc, r) => ({
      kwp: acc.kwp + (r.kwp || 0),
      capex: acc.capex + r.grossCapex,
      npv: acc.npv + (r.metrics.equityNpv || 0),
    }),
    { kwp: 0, capex: 0, npv: 0 }
  );
  const mixedCurrency = new Set(rows.map((r) => r.project.currency || "THB")).size > 1;

  const openProject = (id) => {
    apply((s) => setActiveProject(s, id));
    navigate("/");
  };

  return (
    <div className="max-w-6xl space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink">{t.title}</h1>
        <p className="text-xs text-ink/40 mt-0.5">{t.subtitle}</p>
      </div>

      <Panel>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs tabular-nums whitespace-nowrap">
            <thead>
              <tr className="text-ink/40 border-b border-line">
                <Th>{t.colName}</Th>
                <Th>{t.colLocation}</Th>
                <Th right>{t.colKwp}</Th>
                <Th right>{t.colCapex}</Th>
                <Th right>{t.colNpv}</Th>
                <Th right>{t.colIrr}</Th>
                <Th right>{t.colPayback}</Th>
                <Th right>{t.colLcoe}</Th>
                <Th right>{t.colDscr}</Th>
                <Th right>{t.colScore}</Th>
                <Th>{t.colVerdict}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const active = r.project.id === state.activeProjectId;
                return (
                  <tr
                    key={r.project.id}
                    className={
                      "border-b border-line/60 " + (active ? "bg-brand-50/50" : "")
                    }
                  >
                    <Td>
                      <button
                        type="button"
                        onClick={() => openProject(r.project.id)}
                        className="text-brand-600 hover:text-brand-700 font-medium"
                      >
                        {r.project.name || "-"}
                      </button>
                    </Td>
                    <Td className="text-ink/50">{r.project.location || "-"}</Td>
                    <Td right>{r.kwp > 0 ? formatNumber(r.kwp, 2) : "-"}</Td>
                    <Td right>{r.grossCapex > 0 ? formatNumber(r.grossCapex) : "-"}</Td>
                    <Td
                      right
                      className={
                        r.metrics.equityNpv > 0
                          ? "text-ok font-medium"
                          : r.metrics.equityNpv < 0
                            ? "text-danger font-medium"
                            : ""
                      }
                    >
                      {r.grossCapex > 0 ? formatNumber(r.metrics.equityNpv) : "-"}
                    </Td>
                    <Td right>{formatPercent(r.metrics.equityIrr)}</Td>
                    <Td right>
                      {r.metrics.simplePayback !== null
                        ? formatYears(r.metrics.simplePayback)
                        : "-"}
                    </Td>
                    <Td right>
                      {r.metrics.lcoe !== null ? formatNumber(r.metrics.lcoe, 2) : "-"}
                    </Td>
                    <Td right>
                      {r.metrics.minDscr !== null
                        ? formatNumber(r.metrics.minDscr, 2)
                        : "-"}
                    </Td>
                    <Td right>{r.score.total}</Td>
                    <Td>
                      <Badge tone={verdictTone[r.score.verdict.level]}>
                        {r.score.verdict.label}
                      </Badge>
                    </Td>
                  </tr>
                );
              })}
              {/* totals row (§5.9) */}
              <tr className="font-semibold text-ink">
                <Td>{t.totalRow}</Td>
                <Td />
                <Td right>{totals.kwp > 0 ? formatNumber(totals.kwp, 2) : "-"}</Td>
                <Td right>{totals.capex > 0 ? formatNumber(totals.capex) : "-"}</Td>
                <Td right className={totals.npv >= 0 ? "text-ok" : "text-danger"}>
                  {totals.capex > 0 ? formatNumber(totals.npv) : "-"}
                </Td>
                <Td />
                <Td />
                <Td />
                <Td />
                <Td />
                <Td />
              </tr>
            </tbody>
          </table>
        </div>
        {mixedCurrency && (
          <p className="mt-3 text-[11px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            {t.currencyNote}
          </p>
        )}
      </Panel>
    </div>
  );
}

function Th({ children, right }) {
  return (
    <th className={`py-2 px-2 font-medium ${right ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

function Td({ children, right, className = "" }) {
  return (
    <td className={`py-2 px-2 ${right ? "text-right" : "text-left"} ${className}`}>
      {children}
    </td>
  );
}
