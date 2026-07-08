import Card from "./Card.jsx";
import SunGauge from "./SunGauge.jsx";
import { formatTHB, formatPercent, formatNumber } from "../lib/formatters.js";

function Row({ label, value, muted }) {
  return (
    <div className="flex justify-between items-baseline py-1.5">
      <span className={`text-sm ${muted ? "text-ink/45" : "text-ink/65"}`}>{label}</span>
      <span className="text-sm font-medium text-ink tabular-nums">{value}</span>
    </div>
  );
}

export default function ResultsSummary({ metrics, assumptions }) {
  const equityView = assumptions.loanEnabled;

  return (
    <div className="bg-white rounded-2xl border border-ink/10 overflow-hidden">
      <div className="bg-sky-900 px-6 pt-6 pb-2">
        <p className="text-sun-300 text-xs tracking-[0.15em] uppercase mb-1">ผลตอบแทนโดยประมาณ</p>
        <p className="text-sky-100 text-xs">
          {equityView ? "มุมมองส่วนทุน หลังหักภาระสินเชื่อ" : "จ่ายเงินสด 100% ไม่มีภาระหนี้"}
        </p>
      </div>

      <div className="bg-sky-900 pb-6 flex justify-center">
        <SunGauge years={metrics.paybackYears} />
      </div>

      <div className="px-6 py-5">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-paper rounded-xl p-3">
            <p className="text-xs text-ink/45 mb-1">IRR</p>
            <p className="font-display text-xl font-semibold text-ink">
              {formatPercent(equityView ? metrics.equityIrr : metrics.projectIrr)}
            </p>
          </div>
          <div className="bg-paper rounded-xl p-3">
            <p className="text-xs text-ink/45 mb-1">{equityView ? "Equity NPV" : "NPV"}</p>
            <p className="font-display text-xl font-semibold text-ink">
              {formatTHB(equityView ? metrics.equityNpv : metrics.projectNpv)}
            </p>
          </div>
        </div>

        {assumptions.loanEnabled && (
          <div
            className={`rounded-xl p-3 mb-4 border ${
              metrics.minDscr !== null && metrics.minDscr < 1
                ? "bg-clay-500/10 border-clay-500/30"
                : "bg-leaf-500/10 border-leaf-500/30"
            }`}
          >
            <p className="text-xs text-ink/70">
              Minimum DSCR:{" "}
              <span className="font-semibold text-ink">
                {metrics.minDscr !== null ? `${metrics.minDscr.toFixed(2)}x` : "No Loan"}
              </span>
              {metrics.minDscr !== null && metrics.minDscr < 1 &&
                " — บางปีรายได้ไม่พอจ่ายค่างวด ต้องเติมเงินจากแหล่งอื่น"}
            </p>
          </div>
        )}

        <div className="border-t border-dashed border-ink/15 pt-3">
          <Row label="เงินลงทุนทั้งหมด" value={formatTHB(metrics.installCost)} />
          <Row label="LCOE (ต้นทุนไฟต่อหน่วยที่ผลิตเอง)" value={`${metrics.lcoe?.toFixed(2) ?? "-"} ฿`} />
          {assumptions.loanEnabled && (
            <>
              <Row label="วงเงินกู้" value={formatTHB(metrics.loanAmount)} muted />
              <Row label="เงินสดที่ต้องจ่ายเอง" value={formatTHB(metrics.netEquity)} muted />
            </>
          )}
          {metrics.totalCurtailed > 1 && (
            <Row
              label="ไฟที่ผลิตได้แต่ขายไม่ได้ (เกินเพดาน 5kW)"
              value={`${formatNumber(metrics.totalCurtailed)} kWh`}
              muted
            />
          )}
        </div>
      </div>
    </div>
  );
}
