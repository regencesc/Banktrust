// ============================================================================
// DashboardCharts.jsx — recharts visuals for the dashboard (§5.1).
// Loaded via React.lazy so recharts stays out of the initial bundle.
// ============================================================================

import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from "recharts";
import { formatTHB, formatNumber } from "../../lib/formatters.js";

const BRAND = "#F97316";
const GRAY = "#94A3B8";
const LINE = "#E9ECF0";

const compact = (v) => {
  if (Math.abs(v) >= 1_000_000) return `${Math.round(v / 100_000) / 10}M`;
  if (Math.abs(v) >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(v);
};

const axisStyle = { fontSize: 11, fill: "#6B7280" };

/** Cumulative equity cashflow: area + line with a dashed zero line. */
export function CumulativeCashflowChart({ rows, label }) {
  const data = rows.map((r) => ({
    year: r.year,
    cumulative: Math.round(r.cumulativeEquityCF),
  }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
        <CartesianGrid stroke={LINE} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="year" tick={axisStyle} tickLine={false} axisLine={{ stroke: LINE }} />
        <YAxis tickFormatter={compact} tick={axisStyle} tickLine={false} axisLine={false} width={44} />
        <Tooltip
          formatter={(v) => [formatTHB(v), label]}
          labelFormatter={(y) => `ปีที่ ${y}`}
          contentStyle={{ fontSize: 12, borderRadius: 10, border: `1px solid ${LINE}` }}
        />
        <ReferenceLine y={0} stroke={GRAY} strokeDasharray="4 4" />
        <Area
          type="monotone"
          dataKey="cumulative"
          stroke={BRAND}
          strokeWidth={2}
          fill={BRAND}
          fillOpacity={0.12}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Load vs PV generation per year across the project life. */
export function LoadPvChart({ energySeries, labels }) {
  const hasLoad = energySeries.some((e) => e.load !== null && e.load > 0);
  const data = energySeries.map((e) => ({
    year: e.year,
    pv: Math.round(e.grossYield),
    load: e.load === null ? null : Math.round(e.load),
  }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }} barGap={0}>
        <CartesianGrid stroke={LINE} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="year" tick={axisStyle} tickLine={false} axisLine={{ stroke: LINE }} />
        <YAxis tickFormatter={compact} tick={axisStyle} tickLine={false} axisLine={false} width={44} />
        <Tooltip
          formatter={(v, name) => [
            `${formatNumber(v)} kWh`,
            name === "pv" ? labels.pv : labels.load,
          ]}
          labelFormatter={(y) => `ปีที่ ${y}`}
          contentStyle={{ fontSize: 12, borderRadius: 10, border: `1px solid ${LINE}` }}
        />
        <Legend
          formatter={(name) => (
            <span style={{ fontSize: 11, color: "#6B7280" }}>
              {name === "pv" ? labels.pv : labels.load}
            </span>
          )}
        />
        <Bar dataKey="pv" fill={BRAND} radius={[2, 2, 0, 0]} />
        {hasLoad && <Bar dataKey="load" fill={GRAY} radius={[2, 2, 0, 0]} />}
      </BarChart>
    </ResponsiveContainer>
  );
}
