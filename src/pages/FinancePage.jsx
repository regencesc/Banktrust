import { useApp, useActiveProject, useProjectResult } from "../state/AppContext.jsx";
import { addProject } from "../lib/state.js";
import { formatTHB, formatPercent, formatNumber } from "../lib/formatters.js";
import Panel from "../ui/Panel.jsx";
import Field from "../ui/Field.jsx";
import { NumberInput, ComputedValue } from "../ui/inputs.jsx";
import Segmented from "../ui/Segmented.jsx";
import Badge from "../ui/Badge.jsx";
import Disclaimer from "../ui/Disclaimer.jsx";
import EmptyState, { SunIcon } from "../shell/EmptyState.jsx";

export default function FinancePage() {
  const { apply, strings } = useApp();
  const { project, patchSection } = useActiveProject();
  const result = useProjectResult();
  const t = strings.financePage;
  const u = strings.units;

  if (!project || !result) {
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

  const f = project.finance;
  const patch = (p) => patchSection("finance", p);
  const m = result.metrics;

  return (
    <div className="max-w-4xl space-y-5">
      <h1 className="font-display text-xl font-semibold text-ink">{t.title}</h1>

      {/* ---------- result cards (§5.5) ---------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ResultCard label={t.projectIrr} value={formatPercent(m.projectIrr)} raw={m.projectIrr} />
        <ResultCard label={t.equityIrr} value={formatPercent(m.equityIrr)} raw={m.equityIrr} />
        <ResultCard label={t.projectNpv} value={formatTHB(m.projectNpv)} raw={m.projectNpv} />
        <ResultCard label={t.equityNpv} value={formatTHB(m.equityNpv)} raw={m.equityNpv} />
      </div>

      {/* ---------- economic assumptions ---------- */}
      <Panel title={t.econPanel}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label={t.discountRate}>
            <NumberInput
              value={f.discountRate}
              onChange={(v) => patch({ discountRate: v })}
              percent
              unit={u.percent}
              step={0.1}
              ariaLabel={t.discountRate}
            />
          </Field>
          <Field label={t.generalInflation}>
            <NumberInput
              value={f.generalInflation}
              onChange={(v) => patch({ generalInflation: v })}
              percent
              unit={u.percent}
              step={0.1}
              ariaLabel={t.generalInflation}
            />
          </Field>
          <Field label={t.taxMode}>
            <Segmented
              ariaLabel={t.taxMode}
              value={f.taxMode}
              onChange={(v) => patch({ taxMode: v })}
              options={[
                { value: "corporate", label: t.taxCorporate },
                { value: "personal", label: t.taxPersonal },
              ]}
            />
          </Field>

          {f.taxMode === "corporate" ? (
            <>
              <Field label={t.corporateTaxRate}>
                <NumberInput
                  value={f.corporateTaxRate}
                  onChange={(v) => patch({ corporateTaxRate: v })}
                  percent
                  unit={u.percent}
                  ariaLabel={t.corporateTaxRate}
                />
              </Field>
              <Field label={t.depreciationYears}>
                <NumberInput
                  value={f.depreciationYears}
                  onChange={(v) => patch({ depreciationYears: v })}
                  unit={u.years}
                  min={0}
                  ariaLabel={t.depreciationYears}
                />
              </Field>
              <Field label={t.depreciableBasisPct}>
                <NumberInput
                  value={f.depreciableBasisPct}
                  onChange={(v) => patch({ depreciableBasisPct: v })}
                  percent
                  unit={u.percent}
                  ariaLabel={t.depreciableBasisPct}
                />
              </Field>
            </>
          ) : (
            <>
              <Field label={t.personalTaxBracket}>
                <NumberInput
                  value={f.personalTaxBracket}
                  onChange={(v) => patch({ personalTaxBracket: v })}
                  percent
                  unit={u.percent}
                  ariaLabel={t.personalTaxBracket}
                />
              </Field>
              <Field label={t.personalDeductionCap}>
                <NumberInput
                  value={f.personalDeductionCap}
                  onChange={(v) => patch({ personalDeductionCap: v })}
                  unit={u.baht}
                  min={0}
                  ariaLabel={t.personalDeductionCap}
                />
              </Field>
            </>
          )}

          <Field label={t.decommissioningPct}>
            <NumberInput
              value={f.decommissioningPct}
              onChange={(v) => patch({ decommissioningPct: v })}
              percent
              unit={u.percent}
              ariaLabel={t.decommissioningPct}
            />
          </Field>
          <Field label={t.otherIncomeY1}>
            <NumberInput
              value={f.otherIncomeY1}
              onChange={(v) => patch({ otherIncomeY1: v })}
              unit={u.bahtPerYear}
              ariaLabel={t.otherIncomeY1}
            />
          </Field>
          <Field label={t.otherIncomeGrowth}>
            <NumberInput
              value={f.otherIncomeGrowth}
              onChange={(v) => patch({ otherIncomeGrowth: v })}
              percent
              unit={u.percent}
              ariaLabel={t.otherIncomeGrowth}
            />
          </Field>
        </div>
      </Panel>

      {/* ---------- debt financing ---------- */}
      <Panel
        title={t.debtPanel}
        badge={
          m.minDscr !== null ? (
            <Badge tone={dscrTone(m.minDscr, f.minDscrTarget)}>
              {t.minDscr}: {formatNumber(m.minDscr, 2)}
            </Badge>
          ) : null
        }
      >
        <div className="mb-4">
          <Segmented
            ariaLabel={t.debtPanel}
            value={f.loanEnabled}
            onChange={(v) => patch({ loanEnabled: v })}
            options={[
              { value: false, label: t.cashOnly },
              { value: true, label: t.useLoan },
            ]}
          />
        </div>

        {f.loanEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label={t.debtRatio}>
              <NumberInput
                value={f.debtRatio}
                onChange={(v) => patch({ debtRatio: v })}
                percent
                unit={u.percent}
                min={0}
                max={100}
                ariaLabel={t.debtRatio}
              />
            </Field>
            <Field label={t.interestRate}>
              <NumberInput
                value={f.interestRate}
                onChange={(v) => patch({ interestRate: v })}
                percent
                unit={u.percent}
                step={0.1}
                ariaLabel={t.interestRate}
              />
            </Field>
            <Field label={t.loanTerm}>
              <NumberInput
                value={f.loanTerm}
                onChange={(v) => patch({ loanTerm: v })}
                unit={u.years}
                min={1}
                ariaLabel={t.loanTerm}
              />
            </Field>
            <Field label={t.gracePeriod}>
              <NumberInput
                value={f.gracePeriod}
                onChange={(v) => patch({ gracePeriod: v })}
                unit={u.years}
                min={0}
                ariaLabel={t.gracePeriod}
              />
            </Field>
            <Field label={t.minDscrTarget}>
              <NumberInput
                value={f.minDscrTarget}
                onChange={(v) => patch({ minDscrTarget: v })}
                unit={u.times}
                step={0.05}
                ariaLabel={t.minDscrTarget}
              />
            </Field>
            <Field label={t.debtAmount} hint={t.debtAmountHint}>
              <ComputedValue
                value={result.debt > 0 ? formatTHB(result.debt) : null}
              />
            </Field>
          </div>
        )}

        {/* ---------- debt schedule (§5.5) ---------- */}
        <div className="mt-5">
          <div className="text-xs font-medium text-ink/50 mb-2">{t.scheduleTitle}</div>
          {result.debtSchedule.length === 0 ? (
            <p className="text-xs text-ink/40 bg-surface rounded-lg px-3 py-3">
              {t.scheduleEmpty}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs tabular-nums">
                <thead>
                  <tr className="text-ink/40 border-b border-line">
                    <Th>{t.colYear}</Th>
                    <Th right>{t.colOpening}</Th>
                    <Th right>{t.colInterest}</Th>
                    <Th right>{t.colPrincipal}</Th>
                    <Th right>{t.colPayment}</Th>
                    <Th right>{t.colClosing}</Th>
                    <Th right>{t.colDscr}</Th>
                  </tr>
                </thead>
                <tbody>
                  {result.debtSchedule.map((row) => {
                    const dscr = result.rows[row.year]?.dscr ?? null;
                    return (
                      <tr key={row.year} className="border-b border-line/60">
                        <Td>{row.year}</Td>
                        <Td right>{formatNumber(row.opening)}</Td>
                        <Td right>{formatNumber(row.interest)}</Td>
                        <Td right>{formatNumber(row.principalPaid)}</Td>
                        <Td right>{formatNumber(row.payment)}</Td>
                        <Td right>{formatNumber(row.closing)}</Td>
                        <Td right>
                          {dscr === null ? (
                            "-"
                          ) : (
                            <Badge tone={dscrTone(dscr, f.minDscrTarget)}>
                              {formatNumber(dscr, 2)}
                            </Badge>
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Panel>

      <Disclaimer />
    </div>
  );
}

function dscrTone(dscr, target) {
  const goal = target || 1.2;
  if (dscr >= goal) return "ok";
  if (dscr >= 1) return "warn";
  return "danger";
}

function ResultCard({ label, value, raw }) {
  const tone =
    raw === null || raw === undefined
      ? "text-ink/30"
      : raw >= 0
        ? "text-ok"
        : "text-danger";
  return (
    <div className="bg-white rounded-2xl border border-line p-4">
      <div className="text-[11px] text-ink/40">{label}</div>
      <div className={`font-display text-lg font-semibold tabular-nums mt-1 ${tone}`}>
        {value}
      </div>
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

function Td({ children, right }) {
  return (
    <td className={`py-1.5 px-2 ${right ? "text-right" : "text-left"}`}>{children}</td>
  );
}
