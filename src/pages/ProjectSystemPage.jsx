import { useNavigate } from "react-router-dom";
import { useApp, useActiveProject } from "../state/AppContext.jsx";
import { addProject } from "../lib/state.js";
import { deriveSystem, specificYieldToCf } from "../lib/energy.js";
import { formatNumber, formatPercent } from "../lib/formatters.js";
import Panel from "../ui/Panel.jsx";
import Field from "../ui/Field.jsx";
import { NumberInput, TextInput, TextArea, ComputedValue } from "../ui/inputs.jsx";
import EmptyState, { SunIcon } from "../shell/EmptyState.jsx";

export default function ProjectSystemPage() {
  const { apply, strings } = useApp();
  const { project, patchTop, patchSection } = useActiveProject();
  const navigate = useNavigate();
  const t = strings.projectPage;
  const u = strings.units;

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

  const sys = project.system;
  const derived = deriveSystem(sys);
  const cf =
    project.energy.specificYield > 0
      ? specificYieldToCf(project.energy.specificYield)
      : null;

  return (
    <div className="max-w-4xl space-y-5">
      <h1 className="font-display text-xl font-semibold text-ink">{t.title}</h1>

      {/* ---------- project info ---------- */}
      <Panel title={t.infoPanel}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label={t.name}>
            <TextInput
              value={project.name}
              onChange={(v) => patchTop({ name: v })}
              ariaLabel={t.name}
            />
          </Field>
          <Field label={t.company}>
            <TextInput
              value={project.company}
              onChange={(v) => patchTop({ company: v })}
              ariaLabel={t.company}
            />
          </Field>
          <Field label={t.location}>
            <TextInput
              value={project.location}
              onChange={(v) => patchTop({ location: v })}
              ariaLabel={t.location}
            />
          </Field>
          <Field label={t.country}>
            <TextInput
              value={project.country}
              onChange={(v) => patchTop({ country: v })}
              ariaLabel={t.country}
            />
          </Field>
          <Field label={t.lat}>
            <NumberInput
              value={project.lat}
              onChange={(v) => patchTop({ lat: v })}
              step={0.0001}
              ariaLabel={t.lat}
            />
          </Field>
          <Field label={t.lng}>
            <NumberInput
              value={project.lng}
              onChange={(v) => patchTop({ lng: v })}
              step={0.0001}
              ariaLabel={t.lng}
            />
          </Field>
          <Field label={t.currency}>
            <TextInput
              value={project.currency}
              onChange={(v) => patchTop({ currency: v })}
              ariaLabel={t.currency}
            />
          </Field>
          <Field label={t.projectLife}>
            <NumberInput
              value={project.projectLife}
              onChange={(v) => patchTop({ projectLife: v })}
              unit={u.years}
              min={1}
              max={40}
              ariaLabel={t.projectLife}
            />
          </Field>
          <Field label={t.gridEmissionFactor}>
            <NumberInput
              value={project.gridEmissionFactor}
              onChange={(v) => patchTop({ gridEmissionFactor: v })}
              unit={u.kgCo2PerKwh}
              step={0.001}
              ariaLabel={t.gridEmissionFactor}
            />
          </Field>
          <Field label={t.notes} className="sm:col-span-2 lg:col-span-3">
            <TextArea
              value={project.notes}
              onChange={(v) => patchTop({ notes: v })}
            />
          </Field>
        </div>
      </Panel>

      {/* ---------- PV system ---------- */}
      <Panel title={t.systemPanel}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label={t.panelWp}>
            <NumberInput
              value={sys.panelWp}
              onChange={(v) => patchSection("system", { panelWp: v })}
              unit={u.wp}
              min={0}
              ariaLabel={t.panelWp}
            />
          </Field>
          <Field label={t.panelCount}>
            <NumberInput
              value={sys.panelCount}
              onChange={(v) => patchSection("system", { panelCount: v })}
              unit={u.pieces}
              min={0}
              ariaLabel={t.panelCount}
            />
          </Field>
          <Field label={t.inverterAcKw}>
            <NumberInput
              value={sys.inverterAcKw}
              onChange={(v) => patchSection("system", { inverterAcKw: v })}
              unit={u.kw}
              min={0}
              step={0.1}
              ariaLabel={t.inverterAcKw}
            />
          </Field>
          <Field label={t.panelAreaM2}>
            <NumberInput
              value={sys.panelAreaM2}
              onChange={(v) => patchSection("system", { panelAreaM2: v })}
              unit={u.m2PerPanel}
              min={0}
              step={0.1}
              ariaLabel={t.panelAreaM2}
            />
          </Field>
          <Field label={t.roofAreaM2}>
            <NumberInput
              value={sys.roofAreaM2}
              onChange={(v) => patchSection("system", { roofAreaM2: v })}
              unit={u.m2}
              min={0}
              ariaLabel={t.roofAreaM2}
            />
          </Field>
        </div>

        {/* computed, read-only (§5.2) */}
        <div className="mt-4 pt-4 border-t border-line">
          <div className="text-[11px] font-medium text-ink/40 mb-2">{t.computed}</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label={t.dcKwp}>
              <ComputedValue
                value={derived.dcKwp > 0 ? formatNumber(derived.dcKwp, 2) : null}
                unit={u.kwp}
              />
            </Field>
            <Field label={t.totalPanelArea}>
              <ComputedValue
                value={
                  derived.totalPanelAreaM2 > 0
                    ? formatNumber(derived.totalPanelAreaM2, 1)
                    : null
                }
                unit={u.m2}
              />
            </Field>
            <Field label={t.dcAcRatio}>
              <ComputedValue
                value={
                  derived.dcAcRatio !== null ? formatNumber(derived.dcAcRatio, 2) : null
                }
              />
            </Field>
          </div>
        </div>
      </Panel>

      {/* ---------- battery ---------- */}
      <Panel title={t.batteryPanel}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label={t.batteryKwh}>
            <NumberInput
              value={sys.batteryKwh}
              onChange={(v) => patchSection("system", { batteryKwh: v })}
              unit={u.kwh}
              min={0}
              ariaLabel={t.batteryKwh}
            />
          </Field>
          <Field label={t.batteryDoD}>
            <NumberInput
              value={sys.batteryDoD}
              onChange={(v) => patchSection("system", { batteryDoD: v })}
              percent
              unit={u.percent}
              min={0}
              max={100}
              ariaLabel={t.batteryDoD}
            />
          </Field>
          <Field label={t.batteryRTE}>
            <NumberInput
              value={sys.batteryRTE}
              onChange={(v) => patchSection("system", { batteryRTE: v })}
              percent
              unit={u.percent}
              min={0}
              max={100}
              ariaLabel={t.batteryRTE}
            />
          </Field>
        </div>
      </Panel>

      {/* ---------- summary strip (§5.2) ---------- */}
      <div className="rounded-2xl border border-line bg-white px-5 py-4 grid grid-cols-3 gap-4">
        <SummaryItem
          label={t.summaryInstalled}
          value={derived.dcKwp > 0 ? `${formatNumber(derived.dcKwp, 2)} ${u.kwp}` : "-"}
        />
        <SummaryItem
          label={t.summaryAreaUsed}
          value={
            derived.areaUsedPct !== null ? formatPercent(derived.areaUsedPct) : "-"
          }
        />
        <SummaryItem
          label={t.summaryCf}
          value={cf !== null ? formatPercent(cf) : "-"}
          hint={cf === null ? t.cfHint : null}
        />
      </div>
    </div>
  );
}

function SummaryItem({ label, value, hint }) {
  return (
    <div>
      <div className="text-[11px] text-ink/40">{label}</div>
      <div className="font-display text-lg font-semibold text-ink tabular-nums mt-0.5">
        {value}
      </div>
      {hint && <div className="text-[10px] text-ink/30 mt-0.5">{hint}</div>}
    </div>
  );
}
