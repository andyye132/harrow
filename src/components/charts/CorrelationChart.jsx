import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
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

function buildCropData(correlations, featureImportance, crop) {
  if (!correlations?.[crop]) return { positive: [], negative: [] };
  const all = Object.entries(correlations[crop])
    .map(([feature, data]) => ({
      feature,
      name: FEATURE_LABELS[feature] || feature,
      desc: FEATURE_DESCRIPTIONS[feature] || '',
      correlation: data.r,
      significant: data.significant,
      importance: featureImportance?.[crop]?.importances?.[feature] || 0,
      impact: Math.round((featureImportance?.[crop]?.importances?.[feature] || 0) * 100),
    }));

  return {
    positive: all.filter(d => d.correlation > 0).sort((a, b) => b.importance - a.importance),
    negative: all.filter(d => d.correlation <= 0).sort((a, b) => b.importance - a.importance),
  };
}

export default function CorrelationChart() {
  const [correlations, setCorrelations] = useState(null);
  const [featureImportance, setFeatureImportance] = useState(null);

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

  const corn = useMemo(() => buildCropData(correlations, featureImportance, 'corn'), [correlations, featureImportance]);
  const soy = useMemo(() => buildCropData(correlations, featureImportance, 'soybeans'), [correlations, featureImportance]);

  if (!correlations) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        Run <code>python3 scripts/analyze.py</code> to generate correlation data
      </div>
    );
  }

  const cornR2 = featureImportance?.corn?.r2;
  const soyR2 = featureImportance?.soybeans?.r2;

  return (
    <div className="corr-chart-container">
      {/* Side-by-side: Corn vs Soybeans */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        <CropColumn label="Corn" data={corn} r2={cornR2} nObs={403} />
        <CropColumn label="Soybeans" data={soy} r2={soyR2} nObs={377} />
      </div>

      {/* Key insights */}
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          What stands out
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <InsightCard
            title="Heat stress is the #1 soybean killer"
            text="Days above 95°F account for 30% of the soybean model — more than any other factor. Soybeans are especially vulnerable during flowering and pod-fill in August."
            color="var(--danger)"
          />
          <InsightCard
            title="Temperature dominates corn"
            text="Avg temp + max temp + heat stress = 71% of the corn model. Corn's pollination window in July is extremely heat-sensitive — pollen dies above 95°F."
            color="var(--warning, #f59e0b)"
          />
          <InsightCard
            title="Soybeans are more weather-dependent"
            text={`Weather explains ~${Math.round((soyR2 || 0.4) * 100)}% of soybean yield variation vs ~${Math.round((cornR2 || 0.15) * 100)}% for corn. Soybeans have fewer tools to compensate when conditions turn bad.`}
            color="var(--accent)"
          />
          <InsightCard
            title="Corn is harder to predict from weather"
            text="Only ~15% of corn yield variation comes from weather. The rest is soil quality, irrigation access, seed genetics, and management — factors not in our weather data."
            color="var(--text-muted)"
          />
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 12, padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
        <strong style={{ color: 'var(--text-secondary)' }}>How to read this:</strong> Each bar shows how much our linear regression model relies on that weather factor.
        If heat stress shows 30%, extreme heat is responsible for ~30% of the yield variation the model detects.
        Faded bars = not statistically significant. Based on 32 states, 2010–2024.
      </div>
    </div>
  );
}

/** Hook: observe element, return 0→1 progress as it scrolls into view */
function useGrowIn(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

/** Lerp data values from 0 → actual over time */
function useAnimatedData(data, visible, duration = 900) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, duration]);

  return data.map(d => ({ ...d, impact: Math.round(d.impact * progress) }));
}

function CropColumn({ label, data, r2, nObs }) {
  const chartProps = { margin: { top: 20, right: 10, bottom: 5, left: 10 } };
  const xAxisProps = {
    dataKey: 'name', stroke: 'var(--text-muted)', fontSize: 11,
    fontFamily: 'var(--font-mono)', tickLine: false, angle: 0,
    textAnchor: 'middle', height: 30,
  };

  const { ref, visible } = useGrowIn(0.2);
  const animPos = useAnimatedData(data.positive, visible, 1000);
  const animNeg = useAnimatedData(data.negative, visible, 1200);

  // Keep Y domain fixed to actual max so bars grow into stable axes
  const maxVal = Math.max(
    ...data.positive.map(d => d.impact),
    ...data.negative.map(d => d.impact),
    10
  );

  return (
    <div ref={ref}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <h4 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{label}</h4>
        {r2 != null && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            R²={r2.toFixed(2)} · {nObs} obs
          </span>
        )}
      </div>

      {/* Boosts */}
      <div style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--success)', margin: '8px 0 4px' }}>
          &#9650; Boosts yield
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={animPos} {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis {...xAxisProps} />
            <YAxis hide domain={[0, maxVal * 1.15]} />
            <Tooltip content={<CustomTooltip data={data.positive} />} />
            <Bar dataKey="impact" radius={[6, 6, 0, 0]} barSize={36} isAnimationActive={false}>
              <LabelList dataKey="impact" position="top" fontSize={11} fontFamily="var(--font-mono)" fontWeight={700} formatter={(v) => v > 0 ? `${v}%` : ''} fill="var(--text-secondary)" />
              {data.positive.map((entry, i) => (
                <Cell key={i} fill="var(--success)" fillOpacity={entry.significant ? 0.85 : 0.35} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Hurts */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--danger)', margin: '0 0 4px' }}>
          &#9660; Hurts yield
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={animNeg} {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis {...xAxisProps} />
            <YAxis hide domain={[0, maxVal * 1.15]} />
            <Tooltip content={<CustomTooltip data={data.negative} />} />
            <Bar dataKey="impact" radius={[6, 6, 0, 0]} barSize={36} isAnimationActive={false}>
              <LabelList dataKey="impact" position="top" fontSize={11} fontFamily="var(--font-mono)" fontWeight={700} formatter={(v) => v > 0 ? `${v}%` : ''} fill="var(--text-secondary)" />
              {data.negative.map((entry, i) => (
                <Cell key={i} fill="var(--danger)" fillOpacity={entry.significant ? 0.85 : 0.35} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function InsightCard({ title, text, color }) {
  return (
    <div style={{
      padding: '12px 14px',
      background: 'var(--bg-tertiary)',
      borderLeft: `3px solid ${color}`,
      borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
      border: '1px solid var(--border)',
      borderLeftWidth: 3,
      borderLeftColor: color,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{text}</div>
    </div>
  );
}

function CustomTooltip({ active, payload, data }) {
  if (!active || !payload?.length) return null;
  const animated = payload[0]?.payload;
  if (!animated) return null;
  // Show real values, not animated ones
  const d = data?.find(r => r.name === animated.name) || animated;

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
        <span style={{ color: 'var(--text-muted)' }}> — more {d.name.toLowerCase()} {d.correlation > 0 ? 'tends to boost' : 'tends to reduce'} yield</span>
      </div>
      {!d.significant && (
        <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>
          Weak statistical link — treat with caution
        </div>
      )}
    </div>
  );
}
