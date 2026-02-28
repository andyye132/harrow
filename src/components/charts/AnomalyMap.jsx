import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../../store/useStore';
import { CROP_GROWING_STATS, cToF } from '../../utils/cropStats';
import './AnomalyMap.css';

/**
 * Weather-based anomalies: cases where yield defied weather conditions.
 * E.g., extreme heat but high yield = overperformer.
 * E.g., ideal weather but low yield = underperformer.
 */
export default function AnomalyMap() {
  const [weatherAnomalies, setWeatherAnomalies] = useState(null);
  const [weatherByState, setWeatherByState] = useState(null);
  const chartCrop = useStore(s => s.chartCrop);

  useEffect(() => {
    fetch('/data/weather_anomalies.json')
      .then(r => r.ok ? r.json() : [])
      .then(setWeatherAnomalies)
      .catch(() => setWeatherAnomalies([]));
    fetch('/data/weather_by_state.json')
      .then(r => r.ok ? r.json() : {})
      .then(setWeatherByState)
      .catch(() => setWeatherByState({}));
  }, []);

  const anomalies = useMemo(() => {
    if (!weatherAnomalies) return [];
    return weatherAnomalies
      .filter(a => a.crop === chartCrop)
      .sort((a, b) => Math.abs(b.residual) - Math.abs(a.residual))
      .slice(0, 8)
      .map(a => {
        // Get weather context for this state-year
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

          weatherContext = `${tempF}°F avg, ${Math.round(heatDays)} heat stress days, ${precipIn}" rain, ${Math.round(drySpell)}-day dry spell`;

          if (a.type === 'overperformed') {
            if (heatDays > 10) {
              whyAnomaly = `Despite ${Math.round(heatDays)} heat stress days (>95°F), yield was ${Math.round(a.residual)} bu/acre above prediction. Possible factors: drought-tolerant variety, irrigation, favorable timing.`;
            } else if (drySpell > 15) {
              whyAnomaly = `Despite a ${Math.round(drySpell)}-day dry spell, yield beat prediction by ${Math.round(a.residual)} bu/acre. Good soil moisture reserves or late-season rain recovery likely.`;
            } else {
              whyAnomaly = `Yield was ${Math.round(a.residual)} bu/acre above what weather conditions predicted. Likely strong agronomic practices or favorable micro-climate.`;
            }
          } else {
            if (avgTemp >= cropStats.idealTempC.min && avgTemp <= cropStats.idealTempC.max && precip > 400) {
              whyAnomaly = `Weather was near-ideal (${tempF}°F, ${precipIn}" rain), yet yield fell ${Math.round(Math.abs(a.residual))} bu/acre below prediction. Possible pest, disease, or localized weather event not captured in state averages.`;
            } else if (heatDays > 15) {
              whyAnomaly = `${Math.round(heatDays)} heat stress days caused yield to drop ${Math.round(Math.abs(a.residual))} bu/acre below prediction. Heat during ${chartCrop === 'corn' ? 'tasseling/silking' : 'pod fill'} is especially damaging.`;
            } else {
              whyAnomaly = `Yield fell ${Math.round(Math.abs(a.residual))} bu/acre short of prediction. Weather alone doesn't fully explain the gap — localized conditions likely contributed.`;
            }
          }
        }

        return { ...a, weatherContext, whyAnomaly };
      });
  }, [weatherAnomalies, weatherByState, chartCrop]);

  if (!weatherAnomalies) {
    return <div className="anomaly-loading">Loading anomaly data...</div>;
  }

  if (anomalies.length === 0) {
    return <div className="anomaly-loading">No weather-adjusted anomalies found. Run <code>python3 scripts/analyze.py</code> to generate.</div>;
  }

  return (
    <div className="anomaly-container">
      <div className="anomaly-intro">
        These are cases where actual yield <strong>defied</strong> what weather conditions predicted.
        The model uses temperature, precipitation, heat stress, and dry spells to predict expected yield —
        these entries had the largest gap between prediction and reality.
      </div>

      <div className="anomaly-cards">
        {anomalies.map((a, i) => (
          <motion.div
            key={`${a.state}-${a.year}-${a.crop}`}
            className={`anomaly-card ${a.type}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="anomaly-card-header">
              <div className="anomaly-card-location">
                <span className="anomaly-state">{a.state}</span>
                <span className="anomaly-year">{a.year}</span>
              </div>
              <span className={`anomaly-badge ${a.type}`}>
                {a.type === 'overperformed' ? 'Overperformed' : 'Underperformed'}
              </span>
            </div>

            <div className="anomaly-card-yields">
              <div className="yield-col">
                <span className="yield-num">{a.actual}</span>
                <span className="yield-label">Actual (bu/acre)</span>
              </div>
              <div className="yield-arrow">
                {a.type === 'overperformed' ? '▲' : '▼'}
              </div>
              <div className="yield-col">
                <span className="yield-num predicted">{a.predicted}</span>
                <span className="yield-label">Predicted (bu/acre)</span>
              </div>
              <div className="yield-col residual">
                <span className={`yield-num ${a.type}`}>
                  {a.residual > 0 ? '+' : ''}{a.residual}
                </span>
                <span className="yield-label">Difference</span>
              </div>
            </div>

            {a.weatherContext && (
              <div className="anomaly-weather">
                <span className="weather-label">Weather that season:</span>
                <span className="weather-val">{a.weatherContext}</span>
              </div>
            )}

            {a.whyAnomaly && (
              <div className="anomaly-explanation">
                {a.whyAnomaly}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
