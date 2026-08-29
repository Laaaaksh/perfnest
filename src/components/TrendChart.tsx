"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface TrendPoint {
  date: string;
  value: number | null;
}

export function TrendChart({
  data,
  label,
  unit,
  budget,
  color = "#6ee7b7",
}: {
  data: TrendPoint[];
  label: string;
  unit: string;
  budget?: number | null;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-[var(--text)]">{label}</h3>
        <span className="text-xs text-[var(--text-dim)]">{unit}</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#262b38" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" stroke="#8b93a7" fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis stroke="#8b93a7" fontSize={11} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            contentStyle={{ background: "#191d27", border: "1px solid #262b38", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#8b93a7" }}
          />
          {typeof budget === "number" ? (
            <ReferenceLine y={budget} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "budget", fill: "#ef4444", fontSize: 10 }} />
          ) : null}
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
