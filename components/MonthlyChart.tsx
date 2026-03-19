"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Dot,
} from "recharts";

type DataPoint = { month: string; balance: number };

type Props = {
  data: DataPoint[];
  color?: string;
};

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

export function MonthlyChart({ data, color = "#4F46E5" }: Props) {
  return (
    <div className="w-full h-52">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={fmt}
            width={44}
          />
          <Tooltip
            formatter={(v) =>
              new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v))
            }
            labelFormatter={(l) => `Balance – ${l}`}
            contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
          />
          <Line
            type="monotone"
            dataKey="balance"
            stroke={color}
            strokeWidth={2.5}
            dot={<Dot r={4} fill={color} stroke="#fff" strokeWidth={2} />}
            activeDot={{ r: 6, fill: color, stroke: "#fff", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
