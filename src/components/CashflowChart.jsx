import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import Card from "./Card.jsx";
import { formatTHB } from "../lib/formatters.js";

export default function CashflowChart({ metrics, assumptions }) {
  const data = metrics.rows.map((r) => ({
    year: r.year,
    cumulative: Math.round(r.cumulativeEquityCF),
  }));

  return (
    <Card
      title="กระแสเงินสดสะสม"
      subtitle={assumptions.loanEnabled ? "มุมมองส่วนทุน (Equity)" : "จ่ายเงินสด 100%"}
    >
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cfGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0F5C5B" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#0F5C5B" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E7E2D3" vertical={false} />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 12, fill: "#7A8783" }}
              label={{ value: "ปี", position: "insideBottom", offset: -2, fontSize: 12 }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#7A8783" }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value) => [formatTHB(value), "สะสม"]}
              labelFormatter={(label) => `ปีที่ ${label}`}
            />
            <ReferenceLine y={0} stroke="#B0A98E" strokeWidth={1} />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke="#0F5C5B"
              strokeWidth={2}
              fill="url(#cfGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
