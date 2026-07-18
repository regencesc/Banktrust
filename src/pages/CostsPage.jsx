import { useRef, useState } from "react";
import { useApp, useActiveProject } from "../state/AppContext.jsx";
import { addProject, upsertPriceListItem, newId } from "../lib/state.js";
import {
  createCapexItem,
  createOpexItem,
  capexToOpex,
  opexToCapex,
  parseCapexAoa,
  parseOpexAoa,
  serializeCapexAoa,
  serializeOpexAoa,
  CAPEX_HEADERS,
  OPEX_HEADERS,
} from "../lib/costItems.js";
import { capexItemNet, grossCapex } from "../lib/costs.js";
import { readSheetAoa, downloadXlsx } from "../lib/sheet.js";
import { formatTHB } from "../lib/formatters.js";
import Panel from "../ui/Panel.jsx";
import Badge from "../ui/Badge.jsx";
import Segmented from "../ui/Segmented.jsx";
import EmptyState, { SunIcon } from "../shell/EmptyState.jsx";

const cellInput =
  "w-full bg-transparent border border-transparent hover:border-line focus:border-brand-500 " +
  "focus:outline-none rounded px-1.5 py-1 text-xs tabular-nums";

const iconBtn =
  "text-[11px] font-medium px-1.5 py-0.5 rounded transition-colors whitespace-nowrap";

export default function CostsPage() {
  const { state, apply, strings } = useApp();
  const { project, patchSection } = useActiveProject();
  const t = strings.costsPage;
  const [message, setMessage] = useState(null);

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

  const costs = project.costs;
  const vatOpts = { includeVat: !costs.vatRecoverable };
  const flash = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 3500);
  };

  const patchCosts = (patch) => patchSection("costs", patch);
  const setCapex = (items) => patchCosts({ capexItems: items });
  const setOpex = (items) => patchCosts({ opexItems: items });

  const updateItem = (list, setList) => (id, patch) =>
    setList(list.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const removeItem = (list, setList) => (id) =>
    setList(list.filter((i) => i.id !== id));

  const moveToOpex = (item) => {
    patchCosts({
      capexItems: costs.capexItems.filter((i) => i.id !== item.id),
      opexItems: [...costs.opexItems, capexToOpex(item)],
    });
  };
  const moveToCapex = (item) => {
    patchCosts({
      opexItems: costs.opexItems.filter((i) => i.id !== item.id),
      capexItems: [...costs.capexItems, opexToCapex(item)],
    });
  };

  const saveToPriceList = (item) => {
    apply((s) => upsertPriceListItem(s, { ...item, id: newId() }));
    flash(t.savedPL);
  };

  const insertFromPriceList = (id) => {
    const src = state.priceList.find((i) => i.id === id);
    if (!src) return;
    setCapex([...costs.capexItems, { ...createCapexItem(), ...src, id: newId() }]);
  };

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-display text-xl font-semibold text-ink">{t.title}</h1>
        <div className="flex items-center gap-3">
          {message && <span className="text-xs text-ok">{message}</span>}
          <Badge tone="brand">{t.priceListBadge(state.priceList.length)}</Badge>
          <label className="flex items-center gap-2 text-xs text-ink/60">
            <input
              type="checkbox"
              checked={costs.vatRecoverable}
              onChange={(e) => patchCosts({ vatRecoverable: e.target.checked })}
              className="accent-brand-500"
            />
            {t.vatToggle}
          </label>
        </div>
      </div>

      {/* ================= CAPEX ================= */}
      <CostTablePanel
        title={t.capexPanel}
        t={t}
        items={costs.capexItems}
        emptyText={t.capexEmpty}
        headers={[
          t.colCategory,
          t.colName,
          t.colSpec,
          t.colQty,
          t.colUnit,
          t.colUnitPrice,
          `${t.colDiscount} %`,
          `${t.colVat} %`,
          t.colReplYear,
          t.colReplCycles,
          t.colReplPct,
          t.colNet,
          "",
        ]}
        onAdd={() => setCapex([...costs.capexItems, createCapexItem()])}
        onTemplate={() => downloadXlsx("capex-template.xlsx", [CAPEX_HEADERS], "CAPEX")}
        onImport={async (file, mode) => {
          const items = parseCapexAoa(await readSheetAoa(file));
          if (items.length === 0) return flash(t.importEmpty);
          setCapex(mode === "replace" ? items : [...costs.capexItems, ...items]);
          flash(t.imported(items.length));
        }}
        onExport={() =>
          downloadXlsx("capex.xlsx", serializeCapexAoa(costs.capexItems), "CAPEX")
        }
        extraToolbar={
          state.priceList.length > 0 && (
            <select
              className="rounded-lg border border-line bg-white text-xs px-2 py-1.5 text-ink/70"
              value=""
              onChange={(e) => e.target.value && insertFromPriceList(e.target.value)}
              aria-label={t.addFromPriceList}
            >
              <option value="">{t.addFromPriceList}</option>
              {state.priceList.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} {i.unitPrice != null ? `(${formatTHB(i.unitPrice)})` : ""}
                </option>
              ))}
            </select>
          )
        }
        renderRow={(item) => {
          const up = (patch) =>
            updateItem(costs.capexItems, setCapex)(item.id, patch);
          return (
            <>
              <Td w="w-24">
                <CellText value={item.category} onChange={(v) => up({ category: v })} ariaLabel={t.colCategory} />
              </Td>
              <Td w="w-40">
                <CellText value={item.name} onChange={(v) => up({ name: v })} ariaLabel={t.colName} />
              </Td>
              <Td w="w-28">
                <CellText value={item.spec} onChange={(v) => up({ spec: v })} ariaLabel={t.colSpec} />
              </Td>
              <Td w="w-16">
                <CellNum value={item.qty} onChange={(v) => up({ qty: v })} ariaLabel={t.colQty} />
              </Td>
              <Td w="w-16">
                <CellText value={item.unit} onChange={(v) => up({ unit: v })} ariaLabel={t.colUnit} />
              </Td>
              <Td w="w-24">
                <CellNum value={item.unitPrice} onChange={(v) => up({ unitPrice: v })} ariaLabel={t.colUnitPrice} />
              </Td>
              <Td w="w-16">
                <CellNum
                  value={item.discountPct}
                  onChange={(v) => up({ discountPct: v })}
                  percent
                  ariaLabel={t.colDiscount}
                />
              </Td>
              <Td w="w-16">
                <CellNum value={item.vatPct} onChange={(v) => up({ vatPct: v })} percent ariaLabel={t.colVat} />
              </Td>
              <Td w="w-16">
                <CellNum
                  value={item.replacementYear}
                  onChange={(v) => up({ replacementYear: v })}
                  ariaLabel={t.colReplYear}
                />
              </Td>
              <Td w="w-14">
                <CellNum
                  value={item.replacementCycles}
                  onChange={(v) => up({ replacementCycles: v })}
                  ariaLabel={t.colReplCycles}
                />
              </Td>
              <Td w="w-16">
                <CellNum
                  value={item.replacementPct}
                  onChange={(v) => up({ replacementPct: v })}
                  percent
                  ariaLabel={t.colReplPct}
                />
              </Td>
              <Td w="w-24" className="text-right font-medium">
                {formatTHB(capexItemNet(item, vatOpts))}
              </Td>
              <Td w="w-36">
                <RowActions>
                  <button
                    type="button"
                    title={t.savePLTitle}
                    onClick={() => saveToPriceList(item)}
                    className={`${iconBtn} text-brand-600 hover:bg-brand-50`}
                  >
                    {t.savePL}
                  </button>
                  <button
                    type="button"
                    onClick={() => moveToOpex(item)}
                    className={`${iconBtn} text-ink/50 hover:bg-surface`}
                  >
                    {t.moveToOpex}
                  </button>
                  <button
                    type="button"
                    title={t.deleteItem}
                    aria-label={`${t.deleteItem}: ${item.name || "-"}`}
                    onClick={() => removeItem(costs.capexItems, setCapex)(item.id)}
                    className={`${iconBtn} text-danger hover:bg-red-50`}
                  >
                    ✕
                  </button>
                </RowActions>
              </Td>
            </>
          );
        }}
        footer={
          costs.capexItems.length > 0 && (
            <div className="flex justify-end items-baseline gap-3 pt-3 border-t border-line mt-1">
              <span className="text-xs text-ink/50">{t.grossCapex}</span>
              <span className="font-display text-lg font-semibold text-ink tabular-nums">
                {formatTHB(grossCapex(costs.capexItems, vatOpts))}
              </span>
            </div>
          )
        }
      />

      {/* ================= OPEX ================= */}
      <CostTablePanel
        title={t.opexPanel}
        t={t}
        items={costs.opexItems}
        emptyText={t.opexEmpty}
        headers={[
          t.colCategory,
          t.colName,
          t.colCost,
          t.colEscalation,
          t.colStartYear,
          t.colEndYear,
          t.colEveryN,
          "",
        ]}
        onAdd={() => setOpex([...costs.opexItems, createOpexItem()])}
        onTemplate={() => downloadXlsx("opex-template.xlsx", [OPEX_HEADERS], "OPEX")}
        onImport={async (file, mode) => {
          const items = parseOpexAoa(await readSheetAoa(file));
          if (items.length === 0) return flash(t.importEmpty);
          setOpex(mode === "replace" ? items : [...costs.opexItems, ...items]);
          flash(t.imported(items.length));
        }}
        onExport={() =>
          downloadXlsx("opex.xlsx", serializeOpexAoa(costs.opexItems), "OPEX")
        }
        renderRow={(item) => {
          const up = (patch) => updateItem(costs.opexItems, setOpex)(item.id, patch);
          return (
            <>
              <Td w="w-28">
                <CellText value={item.category} onChange={(v) => up({ category: v })} ariaLabel={t.colCategory} />
              </Td>
              <Td w="w-48">
                <CellText value={item.name} onChange={(v) => up({ name: v })} ariaLabel={t.colName} />
              </Td>
              <Td w="w-28">
                <CellNum
                  value={item.costPerOccurrence}
                  onChange={(v) => up({ costPerOccurrence: v })}
                  ariaLabel={t.colCost}
                />
              </Td>
              <Td w="w-20">
                <CellNum
                  value={item.escalationPct}
                  onChange={(v) => up({ escalationPct: v })}
                  percent
                  ariaLabel={t.colEscalation}
                />
              </Td>
              <Td w="w-16">
                <CellNum value={item.startYear} onChange={(v) => up({ startYear: v })} ariaLabel={t.colStartYear} />
              </Td>
              <Td w="w-16">
                <CellNum value={item.endYear} onChange={(v) => up({ endYear: v })} ariaLabel={t.colEndYear} />
              </Td>
              <Td w="w-16">
                <CellNum
                  value={item.everyNYears}
                  onChange={(v) => up({ everyNYears: v })}
                  ariaLabel={t.colEveryN}
                />
              </Td>
              <Td w="w-32">
                <RowActions>
                  <button
                    type="button"
                    onClick={() => moveToCapex(item)}
                    className={`${iconBtn} text-ink/50 hover:bg-surface`}
                  >
                    {t.moveToCapex}
                  </button>
                  <button
                    type="button"
                    title={t.deleteItem}
                    aria-label={`${t.deleteItem}: ${item.name || "-"}`}
                    onClick={() => removeItem(costs.opexItems, setOpex)(item.id)}
                    className={`${iconBtn} text-danger hover:bg-red-50`}
                  >
                    ✕
                  </button>
                </RowActions>
              </Td>
            </>
          );
        }}
      />
    </div>
  );
}

/* ---------- shared table panel with toolbar (add / template / import) ---------- */

function CostTablePanel({
  title,
  t,
  items,
  headers,
  emptyText,
  renderRow,
  onAdd,
  onTemplate,
  onImport,
  onExport,
  extraToolbar,
  footer,
}) {
  const fileRef = useRef(null);
  const [importMode, setImportMode] = useState("append");

  return (
    <Panel
      title={title}
      badge={
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {extraToolbar}
          <span className="flex items-center gap-1 text-[11px] text-ink/40">
            {t.importMode}
            <Segmented
              ariaLabel={t.importMode}
              value={importMode}
              onChange={setImportMode}
              options={[
                { value: "append", label: t.importAppend },
                { value: "replace", label: t.importReplace },
              ]}
            />
          </span>
          <ToolbarBtn onClick={onTemplate}>{t.template}</ToolbarBtn>
          <ToolbarBtn onClick={() => fileRef.current?.click()}>{t.upload}</ToolbarBtn>
          {items.length > 0 && <ToolbarBtn onClick={onExport}>Export</ToolbarBtn>}
          <button
            type="button"
            onClick={onAdd}
            className="rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium px-3 py-1.5"
          >
            + {t.addItem}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) await onImport(file, importMode);
            }}
          />
        </div>
      }
    >
      {items.length === 0 ? (
        <p className="text-xs text-ink/40 bg-surface rounded-lg px-3 py-4 text-center">
          {emptyText}
        </p>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-ink/40 border-b border-line text-left">
                {headers.map((h, i) => (
                  <th
                    key={i}
                    scope="col"
                    className="py-2 px-1.5 font-medium whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-line/60 align-middle">
                  {renderRow(item)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {footer}
    </Panel>
  );
}

function ToolbarBtn({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-line bg-white hover:bg-surface text-xs font-medium text-ink/70 px-2.5 py-1.5"
    >
      {children}
    </button>
  );
}

function Td({ children, w = "", className = "" }) {
  return <td className={`py-1 px-1.5 ${w} ${className}`}>{children}</td>;
}

function RowActions({ children }) {
  return <div className="flex items-center gap-0.5 justify-end">{children}</div>;
}

function CellText({ value, onChange, ariaLabel }) {
  return (
    <input
      type="text"
      className={cellInput}
      value={value ?? ""}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function CellNum({ value, onChange, percent = false, ariaLabel }) {
  const display =
    value === null || value === undefined
      ? ""
      : percent
        ? Math.round(value * 100 * 1e8) / 1e8
        : value;
  return (
    <input
      type="number"
      className={`${cellInput} text-right`}
      value={display}
      aria-label={ariaLabel}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "") return onChange(null);
        const n = Number(raw);
        if (!Number.isFinite(n)) return;
        onChange(percent ? n / 100 : n);
      }}
    />
  );
}
