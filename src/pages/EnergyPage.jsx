import { useRef, useState } from "react";
import { useApp, useActiveProject } from "../state/AppContext.jsx";
import { addProject, applyEnergyPreset, ENERGY_PRESETS } from "../lib/state.js";
import { computeEnergyYear } from "../lib/energy.js";
import {
  emptyMonthlyProfile,
  parseProfileAoa,
  serializeProfileAoa,
  PROFILE_HEADERS,
} from "../lib/costItems.js";
import { readSheetAoa, downloadXlsx } from "../lib/sheet.js";
import { formatNumber, formatTHB } from "../lib/formatters.js";
import Panel from "../ui/Panel.jsx";
import Field from "../ui/Field.jsx";
import { NumberInput } from "../ui/inputs.jsx";
import Segmented from "../ui/Segmented.jsx";
import EmptyState, { SunIcon } from "../shell/EmptyState.jsx";

export default function EnergyPage() {
  const { apply, strings } = useApp();
  const { project, patchSection, update } = useActiveProject();
  const t = strings.energyPage;
  const u = strings.units;
  const fileRef = useRef(null);
  const [presetNote, setPresetNote] = useState(false);

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

  const e = project.energy;
  const patch = (p) => patchSection("energy", p);
  const year1 = computeEnergyYear(1, project);
  const preset = ENERGY_PRESETS[0];

  const profile = e.monthlyProfile ?? emptyMonthlyProfile();
  const patchMonth = (index, field, value) => {
    const next = profile.map((m, i) => (i === index ? { ...m, [field]: value } : m));
    patch({ monthlyProfile: next });
  };

  return (
    <div className="max-w-4xl space-y-5">
      <h1 className="font-display text-xl font-semibold text-ink">{t.title}</h1>

      {/* ---------- summary strip (§5.4, soft orange) ---------- */}
      <div className="rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4 grid grid-cols-3 gap-4">
        <SummaryItem
          label={t.summaryYear1}
          value={
            year1.grossYield > 0
              ? `${formatNumber(year1.grossYield)} ${u.kwh}`
              : "-"
          }
        />
        <SummaryItem
          label={t.summarySelfUse}
          value={
            year1.selfUse > 0 ? `${formatNumber(year1.selfUse)} ${u.kwh}` : "-"
          }
        />
        <SummaryItem
          label={t.summaryValue}
          value={
            year1.savings + year1.exportRevenue > 0
              ? formatTHB(year1.savings + year1.exportRevenue)
              : "-"
          }
        />
      </div>

      {/* ---------- yield ---------- */}
      <Panel title={t.yieldPanel}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label={t.specificYield}>
            <NumberInput
              value={e.specificYield}
              onChange={(v) => patch({ specificYield: v })}
              unit={t.kwhPerKwpYear}
              min={0}
              ariaLabel={t.specificYield}
            />
          </Field>
          <Field label={t.availability}>
            <NumberInput
              value={e.availability}
              onChange={(v) => patch({ availability: v })}
              percent
              unit={u.percent}
              min={0}
              max={100}
              ariaLabel={t.availability}
            />
          </Field>
          <Field label={t.systemLosses}>
            <div className="flex gap-2">
              <NumberInput
                value={e.systemLosses}
                onChange={(v) => patch({ systemLosses: v })}
                percent
                unit={u.percent}
                min={0}
                max={100}
                ariaLabel={t.systemLosses}
              />
            </div>
          </Field>
          <Field label={t.lossesMode}>
            <Segmented
              ariaLabel={t.lossesMode}
              value={e.yieldIncludesLosses}
              onChange={(v) => patch({ yieldIncludesLosses: v })}
              options={[
                { value: true, label: t.lossesIncluded },
                { value: false, label: t.lossesSeparate },
              ]}
            />
          </Field>
          <Field label={t.degradation}>
            <NumberInput
              value={e.degradation}
              onChange={(v) => patch({ degradation: v })}
              percent
              unit={u.percent}
              step={0.1}
              ariaLabel={t.degradation}
            />
          </Field>
        </div>
      </Panel>

      {/* ---------- load + mode ---------- */}
      <Panel
        title={t.loadPanel}
        badge={
          <Segmented
            ariaLabel={t.loadPanel}
            value={e.mode}
            onChange={(v) => patch({ mode: v })}
            options={[
              { value: "annual", label: t.modeAnnual },
              { value: "interval", label: t.modeInterval },
            ]}
          />
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label={t.loadYear1}>
            <NumberInput
              value={e.loadYear1Kwh}
              onChange={(v) => patch({ loadYear1Kwh: v })}
              unit={t.kwhPerYear}
              min={0}
              ariaLabel={t.loadYear1}
            />
          </Field>
          <Field label={t.loadGrowth}>
            <NumberInput
              value={e.loadGrowth}
              onChange={(v) => patch({ loadGrowth: v })}
              percent
              unit={u.percent}
              step={0.1}
              ariaLabel={t.loadGrowth}
            />
          </Field>
          {e.mode === "annual" && (
            <Field label={t.selfConsumptionPct} hint={t.selfConsumptionHint}>
              <NumberInput
                value={e.selfConsumptionPct}
                onChange={(v) => patch({ selfConsumptionPct: v })}
                percent
                unit={u.percent}
                min={0}
                max={100}
                ariaLabel={t.selfConsumptionPct}
              />
            </Field>
          )}
        </div>

        {/* ---------- 12-month profile (interval mode) ---------- */}
        {e.mode === "interval" && (
          <div className="mt-5 pt-4 border-t border-line">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <span className="text-xs font-medium text-ink/50">{t.profileTable}</span>
              <div className="flex items-center gap-2">
                <Segmented
                  ariaLabel={t.usePvFromProfile}
                  value={e.usePvFromProfile !== false}
                  onChange={(v) => patch({ usePvFromProfile: v })}
                  options={[
                    { value: true, label: t.usePvFromProfile },
                    { value: false, label: t.usePvParametric },
                  ]}
                />
                <button
                  type="button"
                  onClick={() =>
                    downloadXlsx("load-pv-template.xlsx", serializeProfileAoa(null), "Profile")
                  }
                  className="rounded-lg border border-line bg-white hover:bg-surface text-xs font-medium text-ink/70 px-2.5 py-1.5"
                >
                  {strings.costsPage.template}
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="rounded-lg border border-line bg-white hover:bg-surface text-xs font-medium text-ink/70 px-2.5 py-1.5"
                >
                  {strings.costsPage.upload}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={async (ev) => {
                    const file = ev.target.files?.[0];
                    ev.target.value = "";
                    if (!file) return;
                    const rows = parseProfileAoa(await readSheetAoa(file));
                    if (rows.length > 0) patch({ monthlyProfile: rows });
                  }}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="text-xs tabular-nums">
                <thead>
                  <tr className="text-ink/40 border-b border-line">
                    {PROFILE_HEADERS.map((h) => (
                      <th key={h} className="py-1.5 px-2 text-left font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {profile.map((m, i) => (
                    <tr key={m.month} className="border-b border-line/60">
                      <td className="py-1 px-2 w-14 text-ink/50">{m.month}</td>
                      <td className="py-1 px-2 w-32">
                        <ProfileCell
                          value={m.loadKwh}
                          onChange={(v) => patchMonth(i, "loadKwh", v)}
                          disabled={false}
                          ariaLabel={`${t.colLoad} ${t.colMonth} ${m.month}`}
                        />
                      </td>
                      <td className="py-1 px-2 w-32">
                        <ProfileCell
                          value={m.pvKwh}
                          onChange={(v) => patchMonth(i, "pvKwh", v)}
                          disabled={e.usePvFromProfile === false}
                          ariaLabel={`${t.colPv} ${t.colMonth} ${m.month}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Panel>

      {/* ---------- tariffs ---------- */}
      <Panel
        title={t.tariffPanel}
        badge={
          <button
            type="button"
            onClick={() => {
              update((p) => applyEnergyPreset(p, preset.id));
              setPresetNote(true);
              setTimeout(() => setPresetNote(false), 5000);
            }}
            className="rounded-lg border border-brand-200 bg-brand-50 hover:bg-brand-100 text-xs font-medium text-brand-700 px-3 py-1.5"
          >
            {t.presetApply}
          </button>
        }
      >
        <div className="rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 px-3 py-2 mb-4">
          {presetNote ? t.presetApplied + " — " : ""}
          {preset.warning}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label={t.importRate}>
            <NumberInput
              value={e.importRate}
              onChange={(v) => patch({ importRate: v })}
              unit={t.bahtPerKwh}
              step={0.01}
              min={0}
              ariaLabel={t.importRate}
            />
          </Field>
          <Field label={t.exportRate}>
            <NumberInput
              value={e.exportRate}
              onChange={(v) => patch({ exportRate: v })}
              unit={t.bahtPerKwh}
              step={0.01}
              min={0}
              ariaLabel={t.exportRate}
            />
          </Field>
          <Field label={t.tariffEscalation}>
            <NumberInput
              value={e.tariffEscalation}
              onChange={(v) => patch({ tariffEscalation: v })}
              percent
              unit={u.percent}
              step={0.1}
              ariaLabel={t.tariffEscalation}
            />
          </Field>
          <Field label={t.exportTermYears}>
            <NumberInput
              value={e.exportTermYears}
              onChange={(v) => patch({ exportTermYears: v })}
              unit={u.years}
              min={0}
              ariaLabel={t.exportTermYears}
            />
          </Field>
          <Field label={t.exportCapKw}>
            <NumberInput
              value={e.exportCapKw}
              onChange={(v) => patch({ exportCapKw: v })}
              unit={u.kw}
              min={0}
              ariaLabel={t.exportCapKw}
            />
          </Field>
          <Field label={t.demandChargeSavings}>
            <NumberInput
              value={e.demandChargeSavings}
              onChange={(v) => patch({ demandChargeSavings: v })}
              unit={u.bahtPerYear}
              min={0}
              ariaLabel={t.demandChargeSavings}
            />
          </Field>
        </div>
      </Panel>
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div>
      <div className="text-[11px] text-brand-700/70">{label}</div>
      <div className="font-display text-lg font-semibold text-brand-700 tabular-nums mt-0.5">
        {value}
      </div>
    </div>
  );
}

function ProfileCell({ value, onChange, disabled, ariaLabel }) {
  return (
    <input
      type="number"
      aria-label={ariaLabel}
      className={
        "w-full rounded border px-1.5 py-1 text-xs tabular-nums text-right " +
        (disabled
          ? "bg-surface border-transparent text-ink/30"
          : "bg-transparent border-transparent hover:border-line focus:border-brand-500 focus:outline-none")
      }
      value={value ?? ""}
      disabled={disabled}
      onChange={(ev) => {
        const raw = ev.target.value;
        if (raw === "") return onChange(null);
        const n = Number(raw);
        if (Number.isFinite(n)) onChange(n);
      }}
    />
  );
}
