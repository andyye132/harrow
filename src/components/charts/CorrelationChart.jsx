import { useMemo, useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import useStore from '../../store/useStore';

const FEATURE_LABELS = {
  'growing_season_avg_temp': 'Avg Temp',
  'growing_season_max_temp': 'Max Temp',
  'growing_season_precip_mm': 'Precipitation',
  'heat_stress_days': 'Heat Stress',
  'max_dry_spell_days': 'Dry Spell',
  'heavy_rain_days': 'Heavy Rain',
};

const FEATURE_DESCRIPTIONS = {
  'growing_season_avg_temp': 'Apr-Sep average temperature',
  'growing_season_max_temp': 'Growing season max temperature',
  'growing_season_precip_mm': 'Total growing season rainfall',
  'heat_stress_days': 'Days above 95°F in Jun-Aug',
  'max_dry_spell_days': 'Longest consecutive dry streak',
  'heavy_rain_days': 'Days with >2 inches of rain',
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
        impPct: ((featureImportance?.[chartCrop]?.importances?.[feature] || 0) * 100).toFixed(1),
      }));

    return {
      positive: all.filter(d => d.correlation > 0).sort((a, b) => b.importance - a.importance),
      negative: all.filter(d => d.correlation <= 0).sort((a, b) => b.importance - a.importance),
    };
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
    <div className="corr-chart-container">
      {modelStats && (
        <div className="model-stats-bar">
          <span>Random Forest Model:</span>
          <span className="model-stat">R&sup2; = {modelStats.r2}</span>
          <span className="model-stat">MAE = {modelStats.mae} bu/acre</span>
          <span className="model-stat">{modelStats.n_train} train / {modelStats.n_test} test</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Positive — helps yield */}
        <div>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--success)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>&#9650;</span> Helps Yield
          </h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={positive} margin={{ top: 5, right: 10, bottom: 40, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="var(--text-muted)"
                fontSize={11}
                fontFamily="var(--font-mono)"
                tickLine={false}
                angle={-25}
                textAnchor="end"
                height={45}
              />
              <YAxis
                stroke="var(--text-muted)"
                fontSize={10}
                fontFamily="var(--font-mono)"
                tickLine={false}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="importance" radius={[6, 6, 0, 0]} barSize={36}>
                {positive.map((entry, i) => (
                  <Cell
                    key={i}
                    fill="var(--success)"
                    fillOpacity={entry.significant ? 0.85 : 0.35}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Negative — hurts yield */}
        <div>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--danger)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>&#9660;</span> Hurts Yield
          </h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={negative} margin={{ top: 5, right: 10, bottom: 40, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="var(--text-muted)"
                fontSize={11}
                fontFamily="var(--font-mono)"
                tickLine={false}
                angle={-25}
                textAnchor="end"
                height={45}
              />
              <YAxis
                stroke="var(--text-muted)"
                fontSize={10}
                fontFamily="var(--font-mono)"
                tickLine={false}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="importance" radius={[6, 6, 0, 0]} barSize={36}>
                {negative.map((entry, i) => (
                  <Cell
                    key={i}
                    fill="var(--danger)"
                    fillOpacity={entry.significant ? 0.85 : 0.35}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="correlation-legend">
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: 'var(--success)', opacity: 0.85 }} />
          Positive correlation (more &#8594; higher yield)
        </span>
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: 'var(--danger)', opacity: 0.85 }} />
          Negative correlation (more &#8594; lower yield)
        </span>
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: 'var(--text-muted)', opacity: 0.35 }} />
          Not statistically significant
        </span>
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
      maxWidth: 260,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 2 }}>{d.name}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{d.desc}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
        <span style={{ color: d.correlation > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
          r = {d.correlation > 0 ? '+' : ''}{d.correlation.toFixed(3)}
        </span>
        {' | '}
        RF importance: <strong>{d.impPct}%</strong>
        {!d.significant && (
          <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>
            Not statistically significant (p &gt; 0.05)
          </div>
        )}
      </div>
    </div>
  );
}
