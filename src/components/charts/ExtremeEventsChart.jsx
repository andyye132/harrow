import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import useStore from '../../store/useStore';
import { STATE_NAMES } from '../../utils/geoToShape';
import { cToF } from '../../utils/cropStats';
import './ExtremeEventsChart.css';

// Historical context for each event
const EVENT_CONTEXT = {
  'Midwest Drought_2012': {
    weather: 'Summer 2012 brought the worst drought since the 1930s Dust Bowl. Temperatures exceeded 100°F for weeks across the Corn Belt. Many states saw less than 50% of normal rainfall from June through August, with topsoil moisture ratings plummeting to "very short" across 80% of farmland.',
    why: 'The drought struck during the critical pollination window for corn (July) and pod-fill for soybeans (August). Extreme heat during tasseling causes pollen death, and prolonged dry conditions prevent kernel fill, leading to massive yield losses across the entire Midwest.',
  },
  'Midwest Flooding_2019': {
    weather: 'Historic flooding began in March 2019 when a "bomb cyclone" hit the central US. Rivers across Nebraska, Iowa, and Missouri exceeded record flood levels. Persistent rains through spring delayed planting by weeks — by June, 40% of corn acres were still unplanted, the latest on record.',
    why: 'Late planting pushes corn growth into shorter days and hotter temperatures, reducing yield potential. Many flooded fields couldn\'t be planted at all, and fields that did get planted had waterlogged soils with poor root development and nitrogen leaching.',
  },
  'Western Drought / Heat Dome_2021': {
    weather: 'An unprecedented heat dome parked over the Pacific Northwest in late June 2021, shattering all-time temperature records. Portland hit 116°F. The western US experienced exceptional drought conditions, with reservoir levels at historic lows.',
    why: 'While the heat dome\'s epicenter was the Pacific Northwest (not the Corn Belt), the broader drought pattern affected western corn and soybean states. States like the Dakotas and Montana saw significant heat stress during critical growth stages.',
  },
  'Southern Plains Drought_2022': {
    weather: 'Persistent La Niña conditions brought extreme drought to Texas, Oklahoma, and Kansas. Texas experienced its driest January-August period on record. Temperatures consistently exceeded 100°F through the summer, with some areas receiving less than 25% of normal rainfall.',
    why: 'The Southern Plains drought hit dryland (non-irrigated) corn especially hard. Without irrigation, crops in these states had no buffer against the relentless heat and dryness. Oklahoma and Texas corn yields dropped to near-total losses in many counties.',
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
      .sort((a, b) => a.deviation_pct - b.deviation_pct)
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

        return { ...e, context, avgWeather };
      });
  }, [extremeEvents, chartCrop, weatherByState]);

  if (!events.length) {
    return <div className="extreme-empty">No extreme events found for this crop.</div>;
  }

  return (
    <div className="extreme-cards">
      {events.map((e, i) => {
        const isNeg = e.deviation_pct < 0;
        return (
          <motion.div
            key={`${e.event}-${e.year}`}
            className={`extreme-card ${isNeg ? 'negative' : 'positive'}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <div className="extreme-card-header">
              <div>
                <span className="extreme-event-name">{e.event}</span>
                <span className="extreme-event-crop">{chartCrop === 'corn' ? ' \uD83C\uDF3D' : ' \uD83E\uDED8'}</span>
              </div>
              <span className="extreme-event-year">{e.year}</span>
            </div>

            {/* Stats row */}
            <div className="extreme-stat-row">
              <div className="extreme-stat">
                <span className={`extreme-stat-val ${isNeg ? 'neg' : 'pos'}`}>
                  {isNeg ? '' : '+'}{e.deviation_pct.toFixed(1)}%
                </span>
                <span className="extreme-stat-label">Yield Impact</span>
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
                  width: `${Math.min(100, Math.abs(e.deviation_pct) * 3)}%`,
                  marginLeft: isNeg ? 'auto' : 0,
                  marginRight: isNeg ? 0 : 'auto',
                }}
              />
            </div>

            {/* Rich description */}
            {e.context.weather && (
              <div className="extreme-context">
                <p className="extreme-weather-desc">{e.context.weather}</p>
                <p className="extreme-why-desc">{e.context.why}</p>
              </div>
            )}

            {/* Most affected states */}
            {e.most_affected?.length > 0 && (
              <div className="extreme-affected">
                <span className="extreme-affected-label">Hardest hit:</span>
                {e.most_affected.slice(0, 3).map(s => (
                  <span key={s.state} className="extreme-affected-state">
                    {STATE_NAMES[s.state] || s.state}
                    <span className={isNeg ? 'neg' : 'pos'}> {s.deviation_pct > 0 ? '+' : ''}{s.deviation_pct.toFixed(0)}%</span>
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
