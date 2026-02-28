import { useMemo, useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine
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

  const chartData = useMemo(() => {
    if (!correlations?.[chartCrop]) return [];
    return Object.entries(correlations[chartCrop])
      .map(([feature, data]) => ({
        feature,
        name: FEATURE_LABELS[feature] || feature,
        desc: FEATURE_DESCRIPTIONS[feature] || '',
        correlation: data.r,
        significant: data.significant,
        importance: featureImportance?.[chartCrop]?.importances?.[feature] || 0,
        impPct: ((featureImportance?.[chartCrop]?.importances?.[feature] || 0) * 100).toFixed(1),
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

      {/* Vertical bar chart — sorted by RF importance */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 50, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="var(--text-muted)"
            fontSize={12}
            fontFamily="var(--font-mono)"
            tickLine={false}
            angle={-30}
            textAnchor="end"
            height={60}
          />
          <YAxis
            stroke="var(--text-muted)"
            fontSize={11}
            fontFamily="var(--font-mono)"
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
            width={45}
            label={{
              value: 'Feature Importance',
              angle: -90,
              position: 'insideLeft',
              fontSize: 12,
              fill: 'var(--text-secondary)',
              fontFamily: 'var(--font-display)',
              offset: -2,
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="importance"
            radius={[6, 6, 0, 0]}
            barSize={40}
          >
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
