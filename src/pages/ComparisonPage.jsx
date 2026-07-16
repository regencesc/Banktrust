import { useMemo } from "react";
import { useApp, useActiveProject } from "../state/AppContext.jsx";
import { addProject } from "../lib/state.js";
import { createVariant, compareVariants, isVariantReady } from "../lib/variants.js";
import { formatTHB, formatPercent, formatNumber } from "../lib/formatters.js";
import Panel from "../ui/Panel.jsx";
import Field from "../ui/Field.jsx";
import { NumberInput, TextInput } from "../ui/inputs.jsx";
import Badge from "../ui/Badge.jsx";
import EmptyState, { SunIcon } from "../shell/EmptyState.jsx";

const verdictTone = { good: "ok", fair: "warn", poor: "danger" };

export default function ComparisonPage() {
  const { apply, strings } = useApp();
  const { project, update } = useActiveProject();
  const t = strings.comparisonPage;
  const u = strings.units;

  const variants = project?.variants ?? [];
  const comparison = useMemo(
    () => (project ? compareVariants(project, variants) : null),
    [project, variants]
  );

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

  // functional updates against the CURRENT project state — immune to rapid
  // successive events reading a stale `variants` snapshot
  const mutateVariants = (fn) =>
    update((p) => ({ ...p, variants: fn(p.variants ?? []) }));
  const addVariant = () => mutateVariants((vs) => [...vs, createVariant()]);
  const updateVariant = (id, patch) =>
    mutateVariants((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  const removeVariant = (id) =>
    mutateVariants((vs) => vs.filter((v) => v.id !== id));

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">{t.title}</h1>
          <p className="text-xs text-ink/40 mt-0.5">{t.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={addVariant}
          className="rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium px-3 py-1.5"
        >
          + {t.addPackage}
        </button>
      </div>

      <p className="text-[11px] text-ink/40">{t.baseAssumptionsNote}</p>

      {/* ---------- package input cards ---------- */}
      {variants.length === 0 ? (
        <EmptyState icon={<SunIcon />} title={t.emptyPackages} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {variants.map((v) => (
            <Panel
              key={v.id}
              title={v.name || t.packagesTitle}
              badge={
                <button
                  type="button"
                  title={t.deletePackage}
                  onClick={() => removeVariant(v.id)}
                  className="text-danger hover:bg-red-50 text-xs font-medium px-1.5 py-0.5 rounded"
                >
                  ✕
                </button>
              }
            >
              <div className="grid grid-cols-2 gap-3">
                <Field label={t.fieldName} className="col-span-2">
                  <TextInput
                    value={v.name}
                    onChange={(val) => updateVariant(v.id, { name: val })}
                    ariaLabel={t.fieldName}
                  />
                </Field>
                <Field label={t.fieldPvKw}>
                  <NumberInput
                    value={v.pvKw}
                    onChange={(val) => updateVariant(v.id, { pvKw: val })}
                    unit={u.kw}
                    min={0}
                    step={0.5}
                    ariaLabel={`${t.fieldPvKw} ${v.name}`}
                  />
                </Field>
                <Field label={t.fieldBattery}>
                  <NumberInput
                    value={v.batteryKwh}
                    onChange={(val) => updateVariant(v.id, { batteryKwh: val })}
                    unit={u.kwh}
                    min={0}
                    ariaLabel={`${t.fieldBattery} ${v.name}`}
                  />
                </Field>
                <Field label={t.fieldPrice}>
                  <NumberInput
                    value={v.quotedPrice}
                    onChange={(val) => updateVariant(v.id, { quotedPrice: val })}
                    unit={u.baht}
                    min={0}
                    ariaLabel={`${t.fieldPrice} ${v.name}`}
                  />
                </Field>
                <Field label={t.fieldOpex}>
                  <NumberInput
                    value={v.opexPerYear}
                    onChange={(val) => updateVariant(v.id, { opexPerYear: val })}
                    unit={u.bahtPerYear}
                    min={0}
                    ariaLabel={`${t.fieldOpex} ${v.name}`}
                  />
                </Field>
                <Field label={t.fieldReplYear}>
                  <NumberInput
                    value={v.replacementYear}
                    onChange={(val) => updateVariant(v.id, { replacementYear: val })}
                    unit={u.years}
                    min={0}
                    ariaLabel={`${t.fieldReplYear} ${v.name}`}
                  />
                </Field>
                <Field label={t.fieldReplPct}>
                  <NumberInput
                    value={v.replacementPct}
                    onChange={(val) => updateVariant(v.id, { replacementPct: val })}
                    percent
                    unit={u.percent}
                    min={0}
                    ariaLabel={`${t.fieldReplPct} ${v.name}`}
                  />
                </Field>
              </div>
              {!isVariantReady(v) && (
                <p className="mt-3 text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5">
                  {t.notReady}
                </p>
              )}
            </Panel>
          ))}
        </div>
      )}

      {/* ---------- results (§5.8) ---------- */}
      {comparison && comparison.evaluated.length > 0 && (
        <>
          <h2 className="font-display text-base font-semibold text-ink pt-2">
            {t.resultsTitle}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {comparison.evaluated.map((e) => (
              <ResultCard
                key={e.variant.id}
                evaluated={e}
                isBest={e.variant.id === comparison.bestNpvId}
                isFastest={e.variant.id === comparison.fastestId}
                t={t}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ResultCard({ evaluated: e, isBest, isFastest, t }) {
  const m = e.metrics;
  return (
    <div
      className={
        "relative bg-white rounded-2xl border p-5 " +
        (isBest ? "border-brand-500 ring-1 ring-brand-500" : "border-line")
      }
    >
      {isBest && (
        <span className="absolute -top-2.5 left-4 bg-brand-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
          ★ {t.bestNpv}
        </span>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="font-display text-sm font-semibold text-ink truncate">
          {e.variant.name || "-"}
        </div>
        <div className="flex gap-1">
          {isFastest && <Badge tone="brand">⚡ {t.fastest}</Badge>}
          <Badge tone={verdictTone[e.score.verdict.level]}>{e.score.verdict.label}</Badge>
        </div>
      </div>

      {/* big payback number (§5.8) */}
      <div className="mt-3">
        <div className="text-[11px] text-ink/40">{t.payback}</div>
        <div
          className={
            "font-display text-3xl font-semibold tabular-nums " +
            (m.simplePayback === null ? "text-danger text-xl" : "text-ink")
          }
        >
          {m.simplePayback === null
            ? t.neverPayback
            : `${formatNumber(m.simplePayback, 1)} ปี`}
        </div>
      </div>

      <dl className="mt-3 pt-3 border-t border-line space-y-1.5 text-xs">
        <Row label={t.npv}>
          <span className={m.equityNpv >= 0 ? "text-ok" : "text-danger"}>
            {formatTHB(m.equityNpv)}
          </span>
        </Row>
        <Row label={t.irr}>{formatPercent(m.equityIrr)}</Row>
        <Row label={t.valueYear1}>{formatTHB(e.valueYear1)}</Row>
        <Row label={t.pricePerKw}>
          {e.pricePerKw !== null ? `${formatTHB(e.pricePerKw)}/kW` : "-"}
        </Row>
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
