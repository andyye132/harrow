import { useMemo, useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import useStore from '../../store/useStore';

const FEATURE_LABELS = {
  'growing_season_avg_temp': 'Avg Temperature',
  'growing_season_max_temp': 'Max Temperature',
  'growing_season_precip_mm': 'Precipitation',
  'heat_stress_days': 'Heat Stress Days',
  'max_dry_spell_days': 'Longest Dry Spell',
  'heavy_rain_days': 'Heavy Rain Days',
};

export default function CorrelationChart() {
  const [correlations, setCorrelations] = useState(null);
  const [featureImportance, setFeatureImportance] = useState(null);
  const chartCrop = useStore(s => s.chartCrop);

  useEffect(() => {
    fetch('/data/correlations.json')
      .then(r => r.json())
      .then(setCorrelations)
      .catch(() => {});
    fetch('/data/feature_importance.json')
      .then(r => r.json())
      .then(setFeatureImportance)
      .catch(() => {});
  }, []);

  const chartData = useMemo(() => {
    if (!correlations?.[chartCrop]) return [];
    return Object.entries(correlations[chartCrop])
      .map(([feature, data]) => ({
        feature: FEATURE_LABELS[feature] || feature,
        correlation: data.r,
        significant: data.significant,
        strength: data.strength,
        importance: featureImportance?.[chartCrop]?.importances?.[feature] || 0,
      }))
      .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }, [correlations, featureImportance, chartCrop]);

  const modelStats = featureImportance?.[chartCrop];

  if (!correlations) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        Run <code>python3 scripts/analyze.py</code> to generate correlation data
      </div>
    );
  }

  return (
    <div>
      {modelStats && (
        <div className="model-stats-bar">
          <span>Random Forest Model:</span>
          <span className="model-stat">R² = {modelStats.r2}</span>
          <span className="model-stat">MAE = {modelStats.mae} bu/acre</span>
          <span className="model-stat">{modelStats.n_train} train / {modelStats.n_test} test samples</span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 120 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            type="number"
            domain={[-1, 1]}
            stroke="var(--text-muted)"
            fontSize={11}
            fontFamily="var(--font-mono)"
            tickLine={false}
          />
          <YAxis
            dataKey="feature"
            type="category"
            stroke="var(--text-muted)"
            fontSize={12}
            fontFamily="var(--font-display)"
            tickLine={false}
            width={115}
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
            formatter={(value, name) => [
              `r = ${value > 0 ? '+' : ''}${value.toFixed(3)}`,
              'Correlation with yield'
            ]}
          />
          <ReferenceLine x={0} stroke="var(--text-muted)" strokeWidth={1} />
          <Bar dataKey="correlation" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.correlation > 0 ? 'var(--success)' : 'var(--danger)'}
                fillOpacity={entry.significant ? 0.85 : 0.35}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="correlation-legend">
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: 'var(--success)', opacity: 0.85 }} />
          Positive (more → higher yield)
        </span>
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: 'var(--danger)', opacity: 0.85 }} />
          Negative (more → lower yield)
        </span>
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: 'var(--text-muted)', opacity: 0.35 }} />
          Not statistically significant
        </span>
      </div>
    </div>
  );
}
