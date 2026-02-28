import { useMemo, useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList
} from 'recharts';
import useStore from '../../store/useStore';

const FEATURE_LABELS = {
  'growing_season_avg_temp': 'Avg Temp',
  'growing_season_max_temp': 'Max Temp',
  'growing_season_precip_mm': 'Rainfall',
  'heat_stress_days': 'Heat Stress',
  'max_dry_spell_days': 'Dry Spells',
  'heavy_rain_days': 'Heavy Rain',
};

const FEATURE_DESCRIPTIONS = {
  'growing_season_avg_temp': 'Average temperature during the growing season (Apr-Sep)',
  'growing_season_max_temp': 'Peak temperatures during the growing season',
  'growing_season_precip_mm': 'Total rainfall during the growing season',
  'heat_stress_days': 'Number of days above 95°F in summer (Jun-Aug)',
  'max_dry_spell_days': 'Longest streak of consecutive days without rain',
  'heavy_rain_days': 'Days with more than 2 inches of rain',
};

export default function CorrelationChart() {
  const [correlations, setCorrelations] = useState(null);
  const [featureImportance, setFeatureImportance] = useState(null);
  const chartCrop = useStore(s => s.chartCrop);

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    fetch(`${base}data/correlations.json`)
      .then(r => r.json())
      .then(setCorrelations)
      .catch(() => {});
    fetch(`${base}data/feature_importance.json`)
      .then(r => r.json())
      .then(setFeatureImportance)
      .catch(() => {});
  }, []);

  const { positive, negative } = useMemo(() => {
    if (!correlations?.[chartCrop]) return { positive: [], negative: [] };
    const all = Object.entries(correlations[chartCrop])
      .map(([feature, data]) => ({
        feature,
        name: FEATURE_LABELS[feature] || feature,
        desc: FEATURE_DESCRIPTIONS[feature] || '',
        correlation: data.r,
        significant: data.significant,
        importance: featureImportance?.[chartCrop]?.importances?.[feature] || 0,
        // Show as "how much it matters" on a 0-100 scale
        impact: Math.round((featureImportance?.[chartCrop]?.importances?.[feature] || 0) * 100),
      }));

    return {
      positive: all.filter(d => d.correlation > 0).sort((a, b) => b.importance - a.importance),
      negative: all.filter(d => d.correlation <= 0).sort((a, b) => b.importance - a.importance),
    };
  }, [correlations, featureImportance, chartCrop]);

  if (!correlations) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        Run <code>python3 scripts/analyze.py</code> to generate correlation data
      </div>
    );
  }

  const chartProps = {
    margin: { top: 20, right: 10, bottom: 5, left: 10 },
  };

  const xAxisProps = {
    dataKey: 'name',
    stroke: 'var(--text-muted)',
    fontSize: 11,
    fontFamily: 'var(--font-mono)',
    tickLine: false,
    angle: 0,
    textAnchor: 'middle',
    height: 30,
  };

  const yAxisProps = {
    stroke: 'var(--text-muted)',
    fontSize: 10,
    fontFamily: 'var(--font-mono)',
    tickLine: false,
    width: 30,
    domain: [0, 'auto'],
  };

  return (
    <div className="corr-chart-container">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Positive — helps yield */}
        <div>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--success)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>&#9650;</span> Boosts Yield
          </h4>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
            More of this = higher yield. Taller bar = bigger effect.
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={positive} {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis {...xAxisProps} />
              <YAxis {...yAxisProps} hide />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="impact" radius={[6, 6, 0, 0]} barSize={40}>
                <LabelList dataKey="impact" position="top" fontSize={11} fontFamily="var(--font-mono)" fontWeight={700} formatter={(v) => `${v}%`} fill="var(--text-secondary)" />
                {positive.map((entry, i) => (
                  <Cell key={i} fill="var(--success)" fillOpacity={entry.significant ? 0.85 : 0.35} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Negative — hurts yield */}
        <div>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--danger)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>&#9660;</span> Hurts Yield
          </h4>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
            More of this = lower yield. Taller bar = bigger effect.
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={negative} {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis {...xAxisProps} />
              <YAxis {...yAxisProps} hide />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="impact" radius={[6, 6, 0, 0]} barSize={40}>
                <LabelList dataKey="impact" position="top" fontSize={11} fontFamily="var(--font-mono)" fontWeight={700} formatter={(v) => `${v}%`} fill="var(--text-secondary)" />
                {negative.map((entry, i) => (
                  <Cell key={i} fill="var(--danger)" fillOpacity={entry.significant ? 0.85 : 0.35} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 8, padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
        <strong style={{ color: 'var(--text-secondary)' }}>How to read this:</strong> The percentage shows how much our prediction model relies on each weather factor.
        For example, if heat stress shows 30%, that means extreme heat is responsible for ~30% of the yield variation the model detects.
        Based on a linear regression across {chartCrop === 'corn' ? '403' : '377'} state-year observations in 32 states (2010-2024).
        Faded bars = not statistically significant.
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div style={{
      background: 'var(--bg-overlay)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 13,
      color: 'var(--text-primary)',
      backdropFilter: 'blur(8px)',
      maxWidth: 280,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.name}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{d.desc}</div>
      <div style={{ fontSize: 13 }}>
        <strong style={{ color: d.correlation > 0 ? 'var(--success)' : 'var(--danger)' }}>
          {d.impact}% of model weight
        </strong>
        <span style={{ color: 'var(--text-muted)' }}> — {d.correlation > 0 ? 'more' : 'more'} {d.name.toLowerCase()} {d.correlation > 0 ? 'tends to boost' : 'tends to reduce'} yield</span>
      </div>
      {!d.significant && (
        <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>
          Weak statistical link — treat with caution
        </div>
      )}
    </div>
  );
}
