import { useMemo, useState, useEffect } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ZAxis, Cell, ReferenceLine
} from 'recharts';
import useStore from '../../store/useStore';

const FEATURE_LABELS = {
  'growing_season_avg_temp': 'Avg Temp',
  'growing_season_max_temp': 'Max Temp',
  'growing_season_precip_mm': 'Precipitation',
  'heat_stress_days': 'Heat Stress Days',
  'max_dry_spell_days': 'Longest Dry Spell',
  'heavy_rain_days': 'Heavy Rain Days',
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

  const chartData = useMemo(() => {
    if (!correlations?.[chartCrop]) return [];
    return Object.entries(correlations[chartCrop])
      .map(([feature, data]) => ({
        feature,
        name: FEATURE_LABELS[feature] || feature,
        desc: FEATURE_DESCRIPTIONS[feature] || '',
        correlation: data.r,
        significant: data.significant,
        strength: data.strength,
        importance: featureImportance?.[chartCrop]?.importances?.[feature] || 0,
        // For scatter: x = correlation, y = importance, z = bubble size
        x: data.r,
        y: (featureImportance?.[chartCrop]?.importances?.[feature] || 0) * 100,
        z: Math.abs(data.r) * 400 + 100,
      }))
      .sort((a, b) => b.importance - a.importance);
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

      {/* Scatter: X = correlation, Y = RF importance, bubble = |correlation| */}
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            type="number"
            dataKey="x"
            domain={[-0.6, 0.4]}
            name="Correlation"
            stroke="var(--text-muted)"
            fontSize={11}
            fontFamily="var(--font-mono)"
            tickLine={false}
            label={{
              value: 'Correlation with Yield (r)',
              position: 'bottom',
              fontSize: 12,
              fill: 'var(--text-secondary)',
              fontFamily: 'var(--font-display)',
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="RF Importance"
            stroke="var(--text-muted)"
            fontSize={11}
            fontFamily="var(--font-mono)"
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
            label={{
              value: 'RF Feature Importance (%)',
              angle: -90,
              position: 'insideLeft',
              fontSize: 12,
              fill: 'var(--text-secondary)',
              fontFamily: 'var(--font-display)',
              offset: -5,
            }}
          />
          <ZAxis type="number" dataKey="z" range={[200, 800]} />
          <ReferenceLine x={0} stroke="var(--text-muted)" strokeDasharray="3 3" />
          <Tooltip
            content={<CustomTooltip />}
          />
          <Scatter data={chartData}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.correlation > 0 ? 'var(--success)' : 'var(--danger)'}
                fillOpacity={entry.significant ? 0.8 : 0.3}
                stroke={entry.correlation > 0 ? 'var(--success)' : 'var(--danger)'}
                strokeWidth={1}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {/* Feature legend / table below */}
      <div className="corr-feature-table">
        {chartData.map((d, i) => (
          <div key={d.feature} className="corr-feature-row">
            <span className="corr-feature-rank">{i + 1}</span>
            <span
              className="corr-feature-dot"
              style={{
                background: d.correlation > 0 ? 'var(--success)' : 'var(--danger)',
                opacity: d.significant ? 1 : 0.4,
              }}
            />
            <div className="corr-feature-info">
              <span className="corr-feature-name">{d.name}</span>
              <span className="corr-feature-desc">{d.desc}</span>
            </div>
            <div className="corr-feature-stats">
              <span className="corr-feature-r" style={{ color: d.correlation > 0 ? 'var(--success)' : 'var(--danger)' }}>
                r = {d.correlation > 0 ? '+' : ''}{d.correlation.toFixed(3)}
              </span>
              <span className="corr-feature-imp">
                {(d.importance * 100).toFixed(1)}% importance
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="correlation-legend">
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: 'var(--success)', opacity: 0.85 }} />
          Positive (more &#8594; higher yield)
        </span>
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: 'var(--danger)', opacity: 0.85 }} />
          Negative (more &#8594; lower yield)
        </span>
        <span className="legend-item">
          Bubble size = |correlation|, Y-axis = Random Forest importance
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
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.name}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{d.desc}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
        <span style={{ color: d.correlation > 0 ? 'var(--success)' : 'var(--danger)' }}>
          r = {d.correlation > 0 ? '+' : ''}{d.correlation.toFixed(3)}
        </span>
        {' '}&middot;{' '}
        RF importance: {(d.importance * 100).toFixed(1)}%
        {!d.significant && (
          <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
            Not statistically significant (p &gt; 0.05)
          </div>
        )}
      </div>
    </div>
  );
}
