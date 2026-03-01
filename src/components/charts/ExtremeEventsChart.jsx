import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import useStore from '../../store/useStore';
import { STATE_NAMES } from '../../utils/geoToShape';
import { cToF } from '../../utils/cropStats';
import './ExtremeEventsChart.css';

// Historical context for each event
const EVENT_CONTEXT = {
  'Midwest Drought_2012': {
    weather: 'The worst drought since the 1930s Dust Bowl. Temperatures exceeded 100°F for weeks across the Corn Belt, with less than 50% of normal rainfall June–August.',
    why: 'Hit during corn\'s critical pollination window (July) and soybean pod-fill (August). Extreme heat kills pollen during tasseling, and dry conditions prevent kernel fill — a devastating one-two punch.',
    insight: 'Nebraska and irrigated areas of Kansas held up better than expected — access to the Ogallala Aquifer provided a buffer that dryland states like Indiana and Ohio didn\'t have. This event showed that irrigation infrastructure, not just weather, determines drought resilience.',
  },
  'Midwest Flooding_2019': {
    weather: 'A "bomb cyclone" in March triggered historic flooding across Nebraska, Iowa, and Missouri. By June, 40% of corn acres were still unplanted — the latest on record.',
    why: 'Late planting pushes corn growth into shorter days and hotter temps, cutting yield potential. Many flooded fields couldn\'t be planted at all; those that were had waterlogged soils with poor root development.',
    insight: 'Illinois and Indiana — further from the worst flooding — actually posted decent yields. The event was highly localized along river corridors. States with better drainage infrastructure and higher-elevation fields recovered faster, highlighting how topography matters as much as raw precipitation.',
  },
  'Western Drought / Heat Dome_2021': {
    weather: 'An unprecedented heat dome shattered records in the Pacific Northwest — Portland hit 116°F. Exceptional drought spread across the western US with reservoir levels at historic lows.',
    why: 'The heat dome\'s epicenter missed the Corn Belt, but the broader drought pattern hit the Dakotas and Montana hard during critical growth stages.',
    insight: 'This event is interesting because the national average barely moved, masking severe regional damage. North Dakota corn dropped sharply while Iowa and Illinois were largely unaffected — showing how "national" stats can hide localized disasters. States with deep-rooted soil moisture from prior wet years fared better.',
  },
  'Southern Plains Drought_2022': {
    weather: 'Persistent La Niña brought extreme drought to Texas, Oklahoma, and Kansas. Texas saw its driest Jan–Aug on record, with temps consistently above 100°F and some areas getting less than 25% of normal rain.',
    why: 'Dryland (non-irrigated) corn was devastated. Without irrigation, there was zero buffer against relentless heat. Oklahoma and Texas saw near-total losses in many counties.',
    insight: 'Kansas tells a split story — western Kansas (irrigated from the Ogallala) held steady while eastern Kansas (rainfed) cratered. This drought also explains why Texas is gradually shifting acreage from corn to more drought-tolerant sorghum. The economic incentive to switch crops grows with each drought year.',
  },
};

export default function ExtremeEventsChart() {
  const extremeEvents = useStore(s => s.extremeEvents);
  const chartCrop = useStore(s => s.chartCrop);
  const [weatherByState, setWeatherByState] = useState(null);

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    fetch(`${base}data/weather_by_state.json`)
      .then(r => r.ok ? r.json() : {})
      .then(setWeatherByState)
      .catch(() => setWeatherByState({}));
  }, []);

  const events = useMemo(() => {
    if (!extremeEvents) return [];
    return extremeEvents
      .filter(e => e.crop === chartCrop)
      .map(e => {
        const key = `${e.event}_${e.year}`;
        const context = EVENT_CONTEXT[key] || {};

        // Get average weather across most-affected states for this year
        let avgWeather = null;
        if (weatherByState && e.most_affected?.length > 0) {
          const weatherPoints = e.most_affected
            .map(s => weatherByState[s.state]?.find(w => w.year === e.year))
            .filter(Boolean);

          if (weatherPoints.length > 0) {
            const avg = (key) => weatherPoints.reduce((s, w) => s + (w[key] || 0), 0) / weatherPoints.length;
            avgWeather = {
              temp: cToF(avg('growing_season_avg_temp')),
              heatDays: Math.round(avg('heat_stress_days')),
              precipIn: (avg('growing_season_precip_mm') / 25.4).toFixed(1),
              drySpell: Math.round(avg('max_dry_spell_days')),
            };
          }
        }

        // Calculate regional average yield impact from the most-affected states
        let regionalAvg = e.deviation_pct; // fallback to national if no state data
        if (e.most_affected?.length > 0) {
          const sum = e.most_affected.reduce((acc, s) => acc + s.deviation_pct, 0);
          regionalAvg = sum / e.most_affected.length;
        }

        return { ...e, context, avgWeather, regionalAvg };
      })
      .sort((a, b) => a.regionalAvg - b.regionalAvg);
  }, [extremeEvents, chartCrop, weatherByState]);

  if (!events.length) {
    return <div className="extreme-empty">No extreme events found for this crop.</div>;
  }

  return (
    <div className="extreme-cards">
      {events.map((e, i) => {
        const isNeg = e.regionalAvg < 0;
        return (
          <motion.div
            key={`${e.event}-${e.year}`}
            className={`extreme-card ${isNeg ? 'negative' : 'positive'}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <div className="extreme-card-header">
              <span className="extreme-event-name">{e.event}</span>
              <span className="extreme-event-year">{e.year}</span>
            </div>

            {/* Stats row */}
            <div className="extreme-stat-row">
              <div className="extreme-stat">
                <span className={`extreme-stat-val ${isNeg ? 'neg' : 'pos'}`}>
                  {isNeg ? '' : '+'}{e.regionalAvg.toFixed(1)}%
                </span>
                <span className="extreme-stat-label">Regional Yield Impact</span>
                <span className="extreme-stat-label" style={{ fontSize: '0.7rem', opacity: 0.7 }}>
                  National avg: {e.deviation_pct >= 0 ? '+' : ''}{e.deviation_pct.toFixed(1)}%
                </span>
              </div>
              <div className="extreme-stat">
                <span className="extreme-stat-val">{e.avg_yield}</span>
                <span className="extreme-stat-label">bu/acre that year</span>
              </div>
              <div className="extreme-stat">
                <span className="extreme-stat-val muted">{e.overall_avg}</span>
                <span className="extreme-stat-label">15yr average</span>
              </div>
            </div>

            {/* Weather data for affected states */}
            {e.avgWeather && (
              <div className="extreme-weather-row">
                <span className="extreme-weather-chip">{e.avgWeather.temp}°F avg</span>
                <span className="extreme-weather-chip">{e.avgWeather.heatDays} heat days</span>
                <span className="extreme-weather-chip">{e.avgWeather.precipIn}" rain</span>
                <span className="extreme-weather-chip">{e.avgWeather.drySpell}-day dry spell</span>
              </div>
            )}

            <div className="extreme-bar-track">
              <div
                className={`extreme-bar-fill ${isNeg ? 'neg' : 'pos'}`}
                style={{
                  width: `${Math.min(100, Math.abs(e.regionalAvg) * 3)}%`,
                  marginLeft: isNeg ? 'auto' : 0,
                  marginRight: isNeg ? 0 : 'auto',
                }}
              />
            </div>

            {/* Rich description */}
            {e.context.weather && (
              <div className="extreme-context">
                <div className="extreme-context-block">
                  <span className="extreme-context-label">What happened</span>
                  <p className="extreme-weather-desc">{e.context.weather}</p>
                </div>
                <div className="extreme-context-block">
                  <span className="extreme-context-label">Why it mattered</span>
                  <p className="extreme-why-desc">{e.context.why}</p>
                </div>
                {e.context.insight && (
                  <div className="extreme-context-block">
                    <span className="extreme-context-label">What stands out</span>
                    <p className="extreme-insight-desc">{e.context.insight}</p>
                  </div>
                )}
              </div>
            )}

            {/* Most affected states */}
            {e.most_affected?.length > 0 && (
              <div className="extreme-affected">
                <span className="extreme-affected-label">Hardest hit:</span>
                {e.most_affected.slice(0, 3).map(s => (
                  <span key={s.state} className="extreme-affected-state">
                    {STATE_NAMES[s.state] || s.state}
                    <span className={s.deviation_pct < 0 ? 'neg' : 'pos'}> {s.deviation_pct > 0 ? '+' : ''}{s.deviation_pct.toFixed(0)}%</span>
                    <span className="extreme-affected-yield"> ({s.yield} bu/acre)</span>
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
