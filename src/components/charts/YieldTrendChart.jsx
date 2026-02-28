import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Area, ComposedChart
} from 'recharts';
import useStore from '../../store/useStore';
import { CROP_COLORS } from '../../utils/colorScales';

const HIGHLIGHT_STATES = ['IA', 'IL', 'IN', 'OH', 'MN', 'NE', 'SD', 'ND'];

export default function YieldTrendChart() {
  const stateYields = useStore(s => s.stateYields);
  const chartCrop = useStore(s => s.chartCrop);

  const chartData = useMemo(() => {
    if (!stateYields) return [];

    const yearMap = {};
    let stateCount = 0;

    Object.entries(stateYields).forEach(([abbr, data]) => {
      const cropData = data.crops?.[chartCrop];
      if (!cropData) return;
      stateCount++;
      cropData.forEach(({ year, avg_yield }) => {
        if (!yearMap[year]) yearMap[year] = { year, total: 0, count: 0, values: [] };
        yearMap[year].total += avg_yield;
        yearMap[year].count += 1;
        yearMap[year].values.push(avg_yield);

        // Add highlight states as individual series
        if (HIGHLIGHT_STATES.includes(abbr)) {
          yearMap[year][abbr] = avg_yield;
        }
      });
    });

    return Object.values(yearMap)
      .map(d => ({
        ...d,
        avg: Math.round((d.total / d.count) * 10) / 10,
        min: Math.round(Math.min(...d.values) * 10) / 10,
        max: Math.round(Math.max(...d.values) * 10) / 10,
      }))
      .sort((a, b) => a.year - b.year);
  }, [stateYields, chartCrop]);

  const cropColor = CROP_COLORS[chartCrop] || '#8b5cf6';

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={cropColor} stopOpacity={0.15} />
            <stop offset="95%" stopColor={cropColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
        <XAxis
          dataKey="year"
          stroke="#555"
          fontSize={11}
          fontFamily="var(--font-mono)"
          tickLine={false}
        />
        <YAxis
          stroke="#555"
          fontSize={11}
          fontFamily="var(--font-mono)"
          tickLine={false}
          label={{ value: 'bu/acre', angle: -90, position: 'insideLeft', fill: '#555', fontSize: 11 }}
        />
        <Tooltip
          contentStyle={{
            background: 'rgba(14,14,14,0.95)',
            border: '1px solid #2a2a2a',
            borderRadius: '8px',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
          }}
          labelStyle={{ color: '#f5f5f5', fontWeight: 600 }}
          itemStyle={{ color: '#a0a0a0' }}
        />
        <Area
          type="monotone"
          dataKey="max"
          stroke="none"
          fill="url(#areaGrad)"
        />
        <Line
          type="monotone"
          dataKey="avg"
          stroke={cropColor}
          strokeWidth={2.5}
          dot={{ r: 3, fill: cropColor }}
          activeDot={{ r: 5, stroke: cropColor, strokeWidth: 2, fill: '#0a0a0a' }}
          name={`National Avg (${chartCrop})`}
        />
        <Line
          type="monotone"
          dataKey="min"
          stroke="#ef4444"
          strokeWidth={1}
          strokeDasharray="4 4"
          dot={false}
          name="Lowest State"
        />
        <Line
          type="monotone"
          dataKey="max"
          stroke="#22c55e"
          strokeWidth={1}
          strokeDasharray="4 4"
          dot={false}
          name="Highest State"
        />
        <Legend
          wrapperStyle={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
