import { useMemo, useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Area, ComposedChart
} from 'recharts';
import useStore from '../../store/useStore';
import { CROP_COLORS } from '../../utils/colorScales';

function useReveal(threshold = 0.2) {
  const ref = useRef(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let triggered = false;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered) {
          triggered = true;
          obs.disconnect();
          const start = performance.now();
          const duration = 1200;
          const tick = (now) => {
            const t = Math.min(1, (now - start) / duration);
            setProgress(1 - Math.pow(1 - t, 3)); // ease-out cubic
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, progress };
}

export default function YieldTrendChart() {
  const stateYields = useStore(s => s.stateYields);
  const chartCrop = useStore(s => s.chartCrop);
  const { ref, progress } = useReveal(0.2);

  const chartData = useMemo(() => {
    if (!stateYields) return [];

    const yearMap = {};

    Object.entries(stateYields).forEach(([abbr, data]) => {
      const cropData = data.crops?.[chartCrop];
      if (!cropData) return;
      cropData.forEach(({ year, avg_yield }) => {
        if (!yearMap[year]) yearMap[year] = { year, total: 0, count: 0, values: [] };
        yearMap[year].total += avg_yield;
        yearMap[year].count += 1;
        yearMap[year].values.push(avg_yield);
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
    <div ref={ref} style={{ overflow: 'hidden' }}>
      <div style={{ width: `${Math.max(progress * 100, 1)}%`, transition: 'none', overflow: 'visible' }}>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={cropColor} stopOpacity={0.12} />
                <stop offset="95%" stopColor={cropColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="year"
              stroke="var(--text-muted)"
              fontSize={11}
              fontFamily="var(--font-mono)"
              tickLine={false}
            />
            <YAxis
              stroke="var(--text-muted)"
              fontSize={11}
              fontFamily="var(--font-mono)"
              tickLine={false}
              label={{ value: 'bu/acre', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-overlay)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-primary)',
              }}
              labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
              formatter={(value, name) => [`${value} bu/acre`, name]}
            />
            <Area
              type="monotone"
              dataKey="max"
              stroke="none"
              fill="url(#areaGrad)"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="avg"
              stroke={cropColor}
              strokeWidth={2.5}
              dot={{ r: 3, fill: cropColor }}
              activeDot={{ r: 5, stroke: cropColor, strokeWidth: 2, fill: 'var(--bg-card)' }}
              name="National Avg"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="min"
              stroke="var(--danger)"
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
              name="Lowest State Avg"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="max"
              stroke="var(--success)"
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
              name="Highest State Avg"
              isAnimationActive={false}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
