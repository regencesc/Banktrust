import { lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp, useActiveProject, useProjectResult } from "../state/AppContext.jsx";
import { addProject } from "../lib/state.js";
import { buildRiskChecks } from "../lib/riskChecks.js";
import { formatTHB, formatPercent, formatYears, formatNumber } from "../lib/formatters.js";
import Panel from "../ui/Panel.jsx";
import EmptyState, { SunIcon } from "../shell/EmptyState.jsx";

const CumulativeChart = lazy(() =>
  import("../components/charts/DashboardCharts.jsx").then((m) => ({
    default: m.CumulativeCashflowChart,
  }))
);
const LoadPvChart = lazy(() =>
  import("../components/charts/DashboardCharts.jsx").then((m) => ({
    default: m.LoadPvChart,
  }))
);

export default function OverviewPage() {
  const { apply, strings } = useApp();
  const { project } = useActiveProject();
  const result = useProjectResult();
  const navigate = useNavigate();
  const t = strings.overview;

  if (!project || !result) {
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

  const m = result.metrics;
  const f = project.finance;
  const e = project.energy;
  const year1 = result.energySeries[0];
  const hasChartData = result.grossCapex > 0 || year1.grossYield > 0;
  const risks = buildRiskChecks(project, result);

  // one-off year-1 tax benefit in personal mode, shown as an incentive line
  const taxBenefit =
    f.taxMode === "personal" && result.rows[1] && result.rows[1].tax < 0
      ? -result.rows[1].tax
      : 0;

  return (
    <div className="max-w-6xl space-y-5">
      <h1 className="font-display text-xl font-semibold text-ink">{t.title}</h1>

      {/* ---------- KPI cards (§5.1: 6 cards with context sub-text) ---------- */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi
          label={t.kpiEquityNpv}
          value={formatTHB(m.equityNpv)}
          tone={toneOf(m.equityNpv)}
          sub={f.discountRate != null ? t.kpiEquityNpvSub(formatPercent(f.discountRate)) : null}
        />
        <Kpi
          label={t.kpiEquityIrr}
          value={formatPercent(m.equityIrr)}
          tone={toneOf(m.equityIrr)}
          sub={f.discountRate != null ? t.kpiEquityIrrSub(formatPercent(f.discountRate)) : null}
        />
        <Kpi
          label={t.kpiPayback}
          value={formatYears(m.simplePayback)}
          tone={m.simplePayback === null ? "danger" : "ink"}
          sub={m.discountedPayback != null ? t.kpiPaybackSub(formatYears(m.discountedPayback)) : null}
        />
        <Kpi
          label={t.kpiLcoe}
          value={m.lcoe != null ? `${formatNumber(m.lcoe, 2)} ${t.kpiLcoeUnit}` : "-"}
          tone="ink"
          sub={e.importRate != null ? t.kpiLcoeSub(formatNumber(e.importRate, 2)) : null}
        />
        <Kpi
          label={t.kpiGen}
          value={year1.grossYield > 0 ? `${formatNumber(year1.grossYield)} kWh` : "-"}
          tone="ink"
          sub={e.specificYield != null ? t.kpiGenSub(formatNumber(e.specificYield)) : null}
        />
        <Kpi
          label={t.kpiDscr}
          value={m.minDscr != null ? formatNumber(m.minDscr, 2) : "-"}
          tone={
            m.minDscr == null
              ? "ink"
              : m.minDscr >= (f.minDscrTarget || 1.2)
                ? "ok"
                : "danger"
          }
          sub={
            f.loanEnabled
              ? t.kpiDscrSub(formatNumber(f.minDscrTarget || 1.2, 2))
              : t.kpiDscrNoLoan
          }
        />
      </div>

      {/* ---------- cumulative cashflow + investment summary ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Panel title={t.cumulativeChart} className="lg:col-span-2">
          {hasChartData ? (
            <Suspense fallback={<ChartFallback text={t.chartLoading} />}>
              <CumulativeChart rows={result.rows} label={t.seriesCumulative} />
            </Suspense>
          ) : (
            <ChartFallback text={t.chartEmpty} />
          )}
        </Panel>

        <Panel title={t.investmentSummary}>
          {result.grossCapex > 0 ? (
            <div className="space-y-3">
              <MoneyRow label={t.grossCapexLabel} value={formatTHB(result.grossCapex)} bold />
              <div className="h-2.5 rounded-full overflow-hidden flex bg-line">
                {result.equity > 0 && (
                  <div
                    className="bg-brand-500"
                    style={{ width: `${(result.equity / result.grossCapex) * 100}%` }}
                  />
                )}
                {result.debt > 0 && (
                  <div
                    className="bg-sky-500"
                    style={{ width: `${(result.debt / result.grossCapex) * 100}%` }}
                  />
                )}
              </div>
              <MoneyRow
                label={`● ${t.equityLabel}`}
                labelClass="text-brand-600"
                value={`${formatTHB(result.equity)} (${formatPercent(result.equity / result.grossCapex, 0)})`}
              />
              {result.debt > 0 && (
                <MoneyRow
                  label={`● ${t.debtLabel}`}
                  labelClass="text-sky-500"
                  value={`${formatTHB(result.debt)} (${formatPercent(result.debt / result.grossCapex, 0)})`}
                />
              )}
              {taxBenefit > 0 && (
                <MoneyRow label={t.taxIncentiveLabel} value={formatTHB(taxBenefit)} />
              )}
            </div>
          ) : (
            <p className="text-xs text-ink/40 bg-surface rounded-lg px-3 py-4 text-center">
              {t.investmentEmpty}{" "}
              <Link to="/costs" className="text-brand-600 font-medium">
                {t.goFill} →
              </Link>
            </p>
          )}
        </Panel>
      </div>

      {/* ---------- load vs pv + risk checks ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Panel title={t.loadPvChart} className="lg:col-span-2">
          {year1.grossYield > 0 ? (
            <Suspense fallback={<ChartFallback text={t.chartLoading} />}>
              <LoadPvChart
                energySeries={result.energySeries}
                labels={{ pv: t.seriesPv, load: t.seriesLoad }}
              />
            </Suspense>
          ) : (
            <ChartFallback text={t.chartEmpty} />
          )}
        </Panel>

        <Panel title={t.riskTitle}>
          {risks.length === 0 ? (
            <p className="text-xs text-ok bg-green-50 rounded-lg px-3 py-3">
              ✓ {t.riskAllClear}
            </p>
          ) : (
            <ul className="space-y-2.5">
              {risks.map((r) => (
                <RiskItem key={r.id} risk={r} strings={strings} />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const kpiTone = { ok: "text-ok", danger: "text-danger", ink: "text-ink" };
const toneOf = (v) => (v == null ? "ink" : v >= 0 ? "ok" : "danger");

function Kpi({ label, value, sub, tone = "ink" }) {
  return (
    <div className="bg-white rounded-2xl border border-line p-3.5">
      <div className="text-[11px] text-ink/40 truncate">{label}</div>
      <div
        className={`font-display text-base xl:text-lg font-semibold tabular-nums mt-0.5 truncate ${kpiTone[tone]}`}
      >
        {value}
      </div>
      <div className="text-[10px] text-ink/35 mt-0.5 truncate">{sub ?? " "}</div>
    </div>
  );
}

function MoneyRow({ label, value, bold = false, labelClass = "" }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs">
      <span className={`${labelClass || "text-ink/50"}`}>{label}</span>
      <span className={`tabular-nums ${bold ? "font-display text-base font-semibold text-ink" : "text-ink/80"}`}>
        {value}
      </span>
    </div>
  );
}

const riskDot = {
  danger: "bg-danger",
  warn: "bg-amber-500",
  info: "bg-ink/30",
};

function RiskItem({ risk, strings }) {
  const builder = strings.risk[risk.id];
  const message =
    typeof builder === "function"
      ? builder(...risk.params.map((p) => (typeof p === "number" ? formatNumber(p, 2) : p)))
      : builder;
  return (
    <li className="flex gap-2 text-xs text-ink/70 leading-relaxed">
      <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${riskDot[risk.level]}`} />
      <div>
        {message}
        {risk.missingIds && (
          <span className="block mt-0.5 space-x-2">
            {risk.missingIds.map((id) => (
              <Link
                key={id}
                to={strings.checks[id].page}
                className="text-brand-600 font-medium"
              >
                {strings.checks[id].label} →
              </Link>
            ))}
          </span>
        )}
      </div>
    </li>
  );
}

function ChartFallback({ text }) {
  return (
    <div className="h-[240px] flex items-center justify-center text-xs text-ink/35 bg-surface rounded-xl">
      {text}
    </div>
  );
}
