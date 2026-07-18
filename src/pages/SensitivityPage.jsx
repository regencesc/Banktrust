import { useMemo } from "react";
import { useApp, useActiveProject, useProjectResult } from "../state/AppContext.jsx";
import { addProject } from "../lib/state.js";
import {
  buildSensitivityGrid,
  findBreakEvens,
  buildScenarios,
  DEFAULT_STEPS,
} from "../lib/sensitivity.js";
import { formatTHB, formatPercent, formatYears, formatNumber } from "../lib/formatters.js";
import Panel from "../ui/Panel.jsx";
import Disclaimer from "../ui/Disclaimer.jsx";
import EmptyState, { SunIcon } from "../shell/EmptyState.jsx";

export default function SensitivityPage() {
  const { apply, strings } = useApp();
  const { project } = useActiveProject();
  const result = useProjectResult();
  const t = strings.sensitivityPage;

  const hasData =
    project && result && result.grossCapex > 0 && result.energySeries[0].grossYield > 0;

  // 25 grid runs + 3 bisections + 3 scenarios — all pure engine calls,
  // memoized on the project object.
  const analysis = useMemo(() => {
    if (!hasData) return null;
    return {
      grid: buildSensitivityGrid(project),
      breakEvens: findBreakEvens(project),
      scenarios: buildScenarios(project),
    };
  }, [project, hasData]);

  if (!project) {
    return (
      <div className="max-w-3xl">
        <h1 className="font-display text-xl font-semibold text-ink mb-5">{t.title}</h1>
        <EmptyState
          icon={<SunIcon />}
          title={strings.empty.noProjectTitle}
          body={strings.empty.noProjectBody}
          actionLabel={strings.empty.createProject}
          onAction={() =>
            apply((s) => addProject(s, strings.sidebar.newProjectName).state)
          }
        />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="max-w-4xl space-y-5">
        <h1 className="font-display text-xl font-semibold text-ink">{t.title}</h1>
        <EmptyState icon={<SunIcon />} title={t.empty} />
      </div>
    );
  }

  const { grid, breakEvens, scenarios } = analysis;
  const maxAbs = Math.max(
    1,
    ...grid.flatMap((row) => row.cells.map((c) => Math.abs(c.equityNpv)))
  );

  const [down, base, up] = scenarios;
  const e = project.energy;
  const yearLabels = {
    unit: strings.units.years,
    never: strings.common.neverPayback,
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink">{t.title}</h1>
        <p className="text-xs text-ink/40 mt-0.5">{t.subtitle}</p>
      </div>

      {/* ---------- heatmap (§5.7) ---------- */}
      <Panel title={t.heatmapTitle}>
        <div className="overflow-x-auto">
          <table className="text-xs tabular-nums border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="text-left text-[10px] text-ink/40 font-medium px-2">
                  {t.yieldAxis} ↓ / {t.capexAxis} →
                </th>
                {DEFAULT_STEPS.map((dc) => (
                  <th key={dc} className="text-[10px] text-ink/40 font-medium px-2 text-center">
                    {dc > 0 ? "+" : ""}
                    {Math.round(dc * 100)}%
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((row) => (
                <tr key={row.yieldDelta}>
                  <td className="text-[10px] text-ink/40 font-medium px-2 whitespace-nowrap">
                    {row.yieldDelta > 0 ? "+" : ""}
                    {Math.round(row.yieldDelta * 100)}%
                  </td>
                  {row.cells.map((cell) => (
                    <HeatCell
                      key={cell.capexDelta}
                      value={cell.equityNpv}
                      maxAbs={maxAbs}
                      isBase={row.yieldDelta === 0 && cell.capexDelta === 0}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ---------- break-even cards ---------- */}
      <Panel title={t.breakEvenTitle}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <BreakEvenCard
            label={t.beTariff}
            hint={t.beTariffHint}
            value={
              breakEvens.tariffMultiplier !== null
                ? `× ${formatNumber(breakEvens.tariffMultiplier, 2)}`
                : t.beNone
            }
          />
          <BreakEvenCard
            label={t.beImportRate}
            hint={t.beImportRateHint}
            value={
              breakEvens.importRate !== null
                ? `${formatNumber(breakEvens.importRate, 2)} ฿/kWh`
                : t.beNone
            }
            compare={
              e.importRate != null
                ? `ปัจจุบัน ${formatNumber(e.importRate, 2)} ฿/kWh`
                : null
            }
          />
          <BreakEvenCard
            label={t.beCapex}
            hint={t.beCapexHint}
            value={
              breakEvens.maxCapexMultiplier !== null
                ? `× ${formatNumber(breakEvens.maxCapexMultiplier, 2)}`
                : t.beNone
            }
            compare={`= ${formatTHB(
              (breakEvens.maxCapexMultiplier ?? 0) * result.grossCapex
            )}`}
          />
        </div>
      </Panel>

      {/* ---------- scenarios ---------- */}
      <Panel title={t.scenarioTitle}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ScenarioCard
            name={t.scenarioDownside}
            hint={t.scenarioDownsideHint}
            data={down}
            tone="danger"
            yearLabels={yearLabels}
          />
          <ScenarioCard
            name={t.scenarioBase}
            hint={t.scenarioBaseHint}
            data={base}
            tone="ink"
            yearLabels={yearLabels}
          />
          <ScenarioCard
            name={t.scenarioUpside}
            hint={t.scenarioUpsideHint}
            data={up}
            tone="ok"
            yearLabels={yearLabels}
          />
        </div>
      </Panel>

      <Disclaimer />
    </div>
  );
}

function HeatCell({ value, maxAbs, isBase }) {
  const intensity = Math.min(1, Math.abs(value) / maxAbs);
  const background =
    value >= 0
      ? `rgba(22, 163, 74, ${0.08 + intensity * 0.45})`
      : `rgba(220, 38, 38, ${0.08 + intensity * 0.45})`;
  return (
    <td
      className={
        "px-2.5 py-2 rounded-md text-center whitespace-nowrap " +
        (isBase ? "ring-2 ring-brand-500 font-semibold" : "")
      }
      style={{ background }}
      title={formatTHB(value)}
    >
      {compactTHB(value)}
    </td>
  );
}

function compactTHB(v) {
  if (Math.abs(v) >= 1_000_000) return `${formatNumber(v / 1_000_000, 2)}M`;
  return `${formatNumber(v / 1000, 0)}k`;
}

function BreakEvenCard({ label, hint, value, compare }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="text-[11px] text-ink/50">{label}</div>
      <div className="font-display text-xl font-semibold text-ink tabular-nums mt-1">
        {value}
      </div>
      {compare && <div className="text-[11px] text-ink/40 mt-0.5">{compare}</div>}
      <div className="text-[10px] text-ink/35 mt-1.5 leading-relaxed">{hint}</div>
    </div>
  );
}

const scenarioTone = {
  danger: "border-red-200 bg-red-50/50",
  ink: "border-line bg-surface",
  ok: "border-green-200 bg-green-50/50",
};

function ScenarioCard({ name, hint, data, tone, yearLabels }) {
  return (
    <div className={`rounded-xl border p-4 ${scenarioTone[tone]}`}>
      <div className="flex items-baseline justify-between">
        <span className="font-display text-sm font-semibold text-ink">{name}</span>
        <span className="text-[10px] text-ink/40">{hint}</span>
      </div>
      <dl className="mt-3 space-y-1.5 text-xs">
        <Row label="Equity NPV">
          <span className={data.equityNpv >= 0 ? "text-ok" : "text-danger"}>
            {formatTHB(data.equityNpv)}
          </span>
        </Row>
        <Row label="Equity IRR">{formatPercent(data.equityIrr)}</Row>
        <Row label="Payback">{formatYears(data.simplePayback, 1, yearLabels)}</Row>
      </dl>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-ink/50">{label}</dt>
      <dd className="tabular-nums font-medium text-ink">{children}</dd>
    </div>
  );
}
