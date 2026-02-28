import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../../store/useStore';
import { CROP_GROWING_STATS, cToF } from '../../utils/cropStats';
import { STATE_NAMES } from '../../utils/geoToShape';
import './AnomalyMap.css';

/**
 * Weather-based anomalies: 2-column layout with timeline.
 * Left: overperformed (yield beat weather prediction)
 * Right: underperformed (yield fell below weather prediction)
 */
export default function AnomalyMap() {
  const [weatherAnomalies, setWeatherAnomalies] = useState(null);
  const [weatherByState, setWeatherByState] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null); // null = all years
  const chartCrop = useStore(s => s.chartCrop);

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    fetch(`${base}data/weather_anomalies.json`)
      .then(r => r.ok ? r.json() : [])
      .then(setWeatherAnomalies)
      .catch(() => setWeatherAnomalies([]));
    fetch(`${base}data/weather_by_state.json`)
      .then(r => r.ok ? r.json() : {})
      .then(setWeatherByState)
      .catch(() => setWeatherByState({}));
  }, []);

  // Get all unique years for the timeline
  const years = useMemo(() => {
    if (!weatherAnomalies) return [];
    const yrs = [...new Set(
      weatherAnomalies.filter(a => a.crop === chartCrop).map(a => a.year)
    )].sort();
    return yrs;
  }, [weatherAnomalies, chartCrop]);

  const enriched = useMemo(() => {
    if (!weatherAnomalies) return [];
    return weatherAnomalies
      .filter(a => a.crop === chartCrop)
      .filter(a => selectedYear === null || a.year === selectedYear)
      .map(a => {
        const stateWeather = weatherByState?.[a.state]?.find(w => w.year === a.year);
        const cropStats = CROP_GROWING_STATS[chartCrop];
        let weatherContext = '';
        let whyAnomaly = '';

        if (stateWeather) {
          const avgTemp = stateWeather.growing_season_avg_temp;
          const heatDays = stateWeather.heat_stress_days;
          const precip = stateWeather.growing_season_precip_mm;
          const drySpell = stateWeather.max_dry_spell_days;
          const tempF = cToF(avgTemp);
          const precipIn = (precip / 25.4).toFixed(1);

          weatherContext = `${tempF}°F avg | ${Math.round(heatDays)} heat days | ${precipIn}" rain | ${Math.round(drySpell)}-day dry`;

          if (a.type === 'overperformed') {
            if (heatDays > 10) {
              whyAnomaly = `Despite ${Math.round(heatDays)} heat stress days (>95°F), yield was +${Math.round(a.residual)} bu/acre above prediction.`;
            } else if (drySpell > 15) {
              whyAnomaly = `Despite a ${Math.round(drySpell)}-day dry spell, yield beat prediction by +${Math.round(a.residual)} bu/acre.`;
            } else {
              whyAnomaly = `Yield was +${Math.round(a.residual)} bu/acre above what weather predicted. Strong practices or micro-climate.`;
            }
          } else {
            if (avgTemp >= cropStats.idealTempC.min && avgTemp <= cropStats.idealTempC.max && precip > 400) {
              whyAnomaly = `Near-ideal weather, yet yield fell ${Math.round(Math.abs(a.residual))} bu/acre below prediction. Possible pest/disease.`;
            } else if (heatDays > 15) {
              whyAnomaly = `${Math.round(heatDays)} heat stress days dropped yield ${Math.round(Math.abs(a.residual))} bu/acre below prediction.`;
            } else {
              whyAnomaly = `Yield fell ${Math.round(Math.abs(a.residual))} bu/acre short of prediction. Localized conditions likely contributed.`;
            }
          }
        }

        return { ...a, weatherContext, whyAnomaly };
      });
  }, [weatherAnomalies, weatherByState, chartCrop, selectedYear]);

  // Split into two columns
  const overperformed = useMemo(() =>
    enriched.filter(a => a.type === 'overperformed')
      .sort((a, b) => b.residual - a.residual),
    [enriched]
  );

  const underperformed = useMemo(() =>
    enriched.filter(a => a.type === 'underperformed')
      .sort((a, b) => a.residual - b.residual),
    [enriched]
  );

  if (!weatherAnomalies) {
    return <div className="anomaly-loading">Loading anomaly data...</div>;
  }

  if (enriched.length === 0 && selectedYear === null) {
    return <div className="anomaly-loading">No weather-adjusted anomalies found. Run <code>python3 scripts/analyze.py</code> to generate.</div>;
  }

  return (
    <div className="anomaly-container">
      <div className="anomaly-intro">
        Cases where actual yield <strong>defied</strong> weather predictions.
        Left: yields that <strong>beat</strong> expectations. Right: yields that <strong>fell short</strong>.
      </div>

      {/* Year timeline */}
      <div className="anomaly-timeline">
        <button
          className={`timeline-btn ${selectedYear === null ? 'active' : ''}`}
          onClick={() => setSelectedYear(null)}
        >
          All
        </button>
        {years.map(yr => (
          <button
            key={yr}
            className={`timeline-btn ${selectedYear === yr ? 'active' : ''}`}
            onClick={() => setSelectedYear(yr)}
          >
            {yr}
          </button>
        ))}
      </div>

      {/* 2-column layout */}
      <div className="anomaly-columns">
        <div className="anomaly-column over">
          <div className="column-header over">
            <span className="column-arrow">&#9650;</span> Overperformed
            <span className="column-count">{overperformed.length}</span>
          </div>
          <div className="column-cards">
            <AnimatePresence mode="popLayout">
              {overperformed.map((a, i) => (
                <AnomalyCard key={`${a.state}-${a.year}`} a={a} i={i} />
              ))}
            </AnimatePresence>
            {overperformed.length === 0 && (
              <div className="column-empty">No overperformers {selectedYear ? `in ${selectedYear}` : ''}</div>
            )}
          </div>
        </div>

        <div className="anomaly-column under">
          <div className="column-header under">
            <span className="column-arrow">&#9660;</span> Underperformed
            <span className="column-count">{underperformed.length}</span>
          </div>
          <div className="column-cards">
            <AnimatePresence mode="popLayout">
              {underperformed.map((a, i) => (
                <AnomalyCard key={`${a.state}-${a.year}`} a={a} i={i} />
              ))}
            </AnimatePresence>
            {underperformed.length === 0 && (
              <div className="column-empty">No underperformers {selectedYear ? `in ${selectedYear}` : ''}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnomalyCard({ a, i }) {
  return (
    <motion.div
      className={`anomaly-card ${a.type}`}
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: i * 0.03 }}
    >
      <div className="anomaly-card-top">
        <div className="anomaly-card-location">
          <span className="anomaly-state">{STATE_NAMES[a.state] || a.state}</span>
          <span className="anomaly-year">{a.year}</span>
        </div>
        <span className={`anomaly-residual ${a.type}`}>
          {a.residual > 0 ? '+' : ''}{a.residual} bu/acre
        </span>
      </div>

      <div className="anomaly-card-yields">
        <div className="yield-col">
          <span className="yield-num">{a.actual}</span>
          <span className="yield-label">Actual</span>
        </div>
        <span className="yield-vs">vs</span>
        <div className="yield-col">
          <span className="yield-num predicted">{a.predicted}</span>
          <span className="yield-label">Predicted</span>
        </div>
      </div>

      {a.weatherContext && (
        <div className="anomaly-weather">{a.weatherContext}</div>
      )}

      {a.whyAnomaly && (
        <div className="anomaly-explanation">{a.whyAnomaly}</div>
      )}
    </motion.div>
  );
}
