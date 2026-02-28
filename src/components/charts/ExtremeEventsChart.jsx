import { useMemo } from 'react';
import { motion } from 'framer-motion';
import useStore from '../../store/useStore';
import './ExtremeEventsChart.css';

export default function ExtremeEventsChart() {
  const extremeEvents = useStore(s => s.extremeEvents);
  const chartCrop = useStore(s => s.chartCrop);

  const events = useMemo(() => {
    if (!extremeEvents) return [];
    return extremeEvents
      .filter(e => e.crop === chartCrop)
      .sort((a, b) => a.deviation_pct - b.deviation_pct);
  }, [extremeEvents, chartCrop]);

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
              <span className="extreme-event-name">{e.event}</span>
              <span className="extreme-event-year">{e.year}</span>
            </div>

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
                <span className="extreme-stat-label">bu/acre 15yr avg</span>
              </div>
            </div>

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

            <p className="extreme-desc">
              {isNeg
                ? `Average yield dropped to ${e.avg_yield} bu/acre, ${Math.abs(e.deviation_pct).toFixed(1)}% below the 15-year average of ${e.overall_avg} bu/acre.`
                : `Average yield rose to ${e.avg_yield} bu/acre, ${e.deviation_pct.toFixed(1)}% above the 15-year average of ${e.overall_avg} bu/acre.`
              }
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
