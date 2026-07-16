import { useApp, useActiveProject, useProjectResult } from "../state/AppContext.jsx";
import { addProject } from "../lib/state.js";
import {
  mergeCashflowRows,
  paybackYearOf,
  buildCashflowAoa,
} from "../lib/cashflowExport.js";
import { downloadCsv } from "../lib/sheet.js";
import { formatNumber } from "../lib/formatters.js";
import Panel from "../ui/Panel.jsx";
import Badge from "../ui/Badge.jsx";
import EmptyState, { SunIcon } from "../shell/EmptyState.jsx";

export default function CashflowPage() {
  const { apply, strings } = useApp();
  const { project } = useActiveProject();
  const result = useProjectResult();
  const t = strings.cashflowPage;

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

  const rows = mergeCashflowRows(result);
  const paybackYear = paybackYearOf(rows);
  const hasData = result.grossCapex > 0 || result.energySeries[0].grossYield > 0;

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">{t.title}</h1>
          <p className="text-xs text-ink/40 mt-0.5">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {paybackYear !== null && (
            <Badge tone="ok">{t.paybackBadge(paybackYear)}</Badge>
          )}
          {hasData && (
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  `${project.name || "project"}-cashflow.csv`,
                  buildCashflowAoa(result)
                )
              }
              className="rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium px-3 py-1.5"
            >
              {t.exportCsv}
            </button>
          )}
        </div>
      </div>

      <Panel>
        {!hasData ? (
          <p className="text-xs text-ink/40 bg-surface rounded-lg px-3 py-4 text-center">
            {t.empty}
          </p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs tabular-nums whitespace-nowrap">
              <thead>
                <tr className="text-ink/40 border-b border-line">
                  <Th>{t.colYear}</Th>
                  <Th right>{t.colGen}</Th>
                  <Th right>{t.colSelfUse}</Th>
                  <Th right>{t.colExport}</Th>
                  <Th right>{t.colSavings}</Th>
                  <Th right>{t.colExportRev}</Th>
                  <Th right>{t.colOpex}</Th>
                  <Th right>{t.colReplacement}</Th>
                  <Th right>{t.colInterest}</Th>
                  <Th right>{t.colPrincipal}</Th>
                  <Th right>{t.colTax}</Th>
                  <Th right>{t.colEquityCf}</Th>
                  <Th right>{t.colCumulative}</Th>
                  <Th right>{t.colDscr}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isPaybackYear = r.year === paybackYear;
                  return (
                    <tr
                      key={r.year}
                      className={
                        "border-b border-line/60 " +
                        (isPaybackYear ? "bg-brand-50" : "")
                      }
                    >
                      <Td className={isPaybackYear ? "font-semibold text-brand-700" : "text-ink/50"}>
                        {r.year}
                      </Td>
                      <Td right>{fmt(r.grossYield)}</Td>
                      <Td right>{fmt(r.selfUse)}</Td>
                      <Td right>{fmt(r.exportEnergy)}</Td>
                      <Td right>{fmt(r.savings)}</Td>
                      <Td right>{fmt(r.exportRevenue)}</Td>
                      <Td right>{fmt(r.opex)}</Td>
                      <Td right>{fmt(r.replacement)}</Td>
                      <Td right>{fmt(r.interest)}</Td>
                      <Td right>{fmt(r.principalPaid)}</Td>
                      <Td right>{fmt(r.tax)}</Td>
                      <Td right>{fmt(r.equityCF)}</Td>
                      <Td
                        right
                        className={
                          r.cumulative < 0
                            ? "text-danger font-medium"
                            : "text-ok font-medium"
                        }
                      >
                        {fmt(r.cumulative)}
                      </Td>
                      <Td right>{r.dscr === null ? "-" : formatNumber(r.dscr, 2)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

const fmt = (v) => (v === 0 ? "0" : formatNumber(v));

function Th({ children, right }) {
  return (
    <th className={`py-2 px-2 font-medium ${right ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

function Td({ children, right, className = "" }) {
  return (
    <td className={`py-1.5 px-2 ${right ? "text-right" : "text-left"} ${className}`}>
      {children}
    </td>
  );
}
