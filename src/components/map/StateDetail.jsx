import { AnimatePresence, motion } from 'framer-motion';
import useStore from '../../store/useStore';
import { FIPS_TO_ABBR, STATE_NAMES } from '../../utils/geoToShape';
import { CROP_COLORS } from '../../utils/colorScales';
import './StateDetail.css';

export default function StateDetail() {
  const selectedState = useStore(s => s.selectedState);
  const stateSummaries = useStore(s => s.stateSummaries);
  const stateYields = useStore(s => s.stateYields);
  const setSelectedState = useStore(s => s.setSelectedState);

  const abbr = selectedState ? FIPS_TO_ABBR[selectedState] : null;
  const stateName = abbr ? STATE_NAMES[abbr] : null;
  const summary = abbr ? stateSummaries?.[abbr] : null;
  const yields = abbr ? stateYields?.[abbr] : null;

  return (
    <AnimatePresence>
      {selectedState && stateName && (
        <motion.div
          className="state-detail"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="detail-header">
            <div>
              <span className="detail-abbr">{abbr}</span>
              <h2 className="detail-name">{stateName}</h2>
            </div>
            <button className="detail-close" onClick={() => setSelectedState(null)}>
              &times;
            </button>
          </div>

          {summary && (
            <div className="detail-body">
              {Object.entries(summary.crops).map(([crop, data]) => (
                <div key={crop} className="detail-crop-card">
                  <div className="crop-card-header">
                    <span
                      className="crop-dot"
                      style={{ background: CROP_COLORS[crop] || '#888' }}
                    />
                    <span className="crop-card-name">{crop}</span>
                    {crop === summary.best_crop && (
                      <span className="best-badge">Best</span>
                    )}
                  </div>
                  <div className="crop-stats">
                    <div className="stat">
                      <span className="stat-value">{data.avg_yield}</span>
                      <span className="stat-label">Avg bu/acre</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">{data.recent_avg}</span>
                      <span className="stat-label">Recent avg</span>
                    </div>
                    <div className="stat">
                      <span className={`stat-value ${data.trend_per_year >= 0 ? 'trend-up' : 'trend-down'}`}>
                        {data.trend_per_year >= 0 ? '+' : ''}{data.trend_per_year}
                      </span>
                      <span className="stat-label">Trend/yr</span>
                    </div>
                  </div>
                  <div className="crop-extremes">
                    <span className="extreme best">
                      Best: {data.best_yield} ({data.best_year})
                    </span>
                    <span className="extreme worst">
                      Worst: {data.worst_yield} ({data.worst_year})
                    </span>
                  </div>

                  {/* Mini sparkline */}
                  {yields?.crops?.[crop] && (
                    <div className="sparkline-container">
                      <Sparkline data={yields.crops[crop]} color={CROP_COLORS[crop]} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!summary && (
            <div className="detail-body">
              <p className="detail-no-data">No crop yield data available for this state.</p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Sparkline({ data, color }) {
  const values = data.map(d => d.avg_yield);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 220;
  const h = 40;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} className="sparkline">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        points={points}
      />
      {/* Dot on last point */}
      {values.length > 0 && (
        <circle
          cx={(values.length - 1) / (values.length - 1) * w}
          cy={h - ((values[values.length - 1] - min) / range) * h}
          r="3"
          fill={color}
        />
      )}
    </svg>
  );
}
