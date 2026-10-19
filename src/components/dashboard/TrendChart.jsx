import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

function Tick({ payload, label, colors, nerd }) {
  if (!nerd) return <span>{label}</span>;
  return <span fill={colors.axis}>{label}</span>;
}

function Tip({ active, payload, label, colors }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-xl">
      <p className="font-bold text-foreground">{label}</p>
      <p className="text-emerald-500 dark:text-emerald-400">BUS: {d.bus}</p>
      <p className="text-red-500 dark:text-red-400">SUS: {d.sus}</p>
      {d.avgScore !== null && <p style={{ color: colors.avg }}>avg score: {d.avgScore}</p>}
    </div>
  );
}

export default function TrendChart({ days, colors, mode }) {
  const nerd = mode === 'nerd';
  const showAvg = mode !== 'simple';
  const label = (iso) =>
    new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={days} margin={{ top: 8, right: 8, bottom: 0, left: nerd ? 0 : -30 }}>
          {nerd && <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" vertical={false} />}
          <XAxis
            dataKey="date"
            tickFormatter={label}
            tick={<Tick colors={colors} nerd={nerd} />}
            tickLine={false}
            axisLine={{ stroke: colors.grid }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis hide={!nerd} stroke={colors.axis} allowDecimals={false} width={36} />
          <Tooltip content={<Tip colors={colors} />} />
          <Bar dataKey="bus" stackId="v" name="BUS" fill={colors.bus} radius={[0, 0, 0, 0]} />
          <Bar dataKey="sus" stackId="v" name="SUS" fill={colors.sus} />
          {showAvg && (
            <Line
              type="monotone"
              dataKey="avgScore"
              stroke={colors.avg}
              strokeWidth={2}
              dot={false}
              connectNulls
              name="avg score"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}