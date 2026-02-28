import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import useStore from '../../store/useStore';

export default function ExtremeEventsChart() {
  const extremeEvents = useStore(s => s.extremeEvents);
  const chartCrop = useStore(s => s.chartCrop);

  const chartData = useMemo(() => {
    if (!extremeEvents) return [];
    return extremeEvents
      .filter(e => e.crop === chartCrop)
      .map(e => ({
        name: `${e.event} (${e.year})`,
        year: e.year,
        deviation: e.deviation_pct,
        avgYield: e.avg_yield,
        overallAvg: e.overall_avg,
      }));
  }, [extremeEvents, chartCrop]);

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 40, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
        <XAxis
          dataKey="name"
          stroke="#555"
          fontSize={10}
          fontFamily="var(--font-mono)"
          angle={-20}
          textAnchor="end"
          tickLine={false}
          height={60}
        />
        <YAxis
          stroke="#555"
          fontSize={11}
          fontFamily="var(--font-mono)"
          tickLine={false}
          label={{ value: '% deviation', angle: -90, position: 'insideLeft', fill: '#555', fontSize: 11 }}
        />
        <Tooltip
          contentStyle={{
            background: 'rgba(14,14,14,0.95)',
            border: '1px solid #2a2a2a',
            borderRadius: '8px',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
          }}
          formatter={(value) => [`${value > 0 ? '+' : ''}${value.toFixed(1)}%`, 'Deviation']}
        />
        <ReferenceLine y={0} stroke="#555" strokeWidth={1} />
        <Bar dataKey="deviation" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.deviation < 0 ? '#ef4444' : '#22c55e'}
              fillOpacity={0.8}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
