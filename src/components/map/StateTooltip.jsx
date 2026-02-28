import { AnimatePresence, motion } from 'framer-motion';
import useStore from '../../store/useStore';
import { FIPS_TO_ABBR, STATE_NAMES } from '../../utils/geoToShape';
import { formatYield, formatTrend } from '../../utils/cropStats';
import './StateTooltip.css';

export default function StateTooltip() {
  const hoveredState = useStore(s => s.hoveredState);
  const selectedState = useStore(s => s.selectedState);
  const pointerPosition = useStore(s => s.pointerPosition);
  const stateSummaries = useStore(s => s.stateSummaries);

  const stateId = hoveredState;
  const abbr = stateId ? FIPS_TO_ABBR[stateId] : null;
  const stateName = abbr ? STATE_NAMES[abbr] : null;
  const summary = abbr ? stateSummaries?.[abbr] : null;

  if (selectedState) return null;

  return (
    <AnimatePresence>
      {hoveredState && stateName && (
        <motion.div
          className="state-tooltip"
          style={{
            left: Math.min(pointerPosition.x + 16, window.innerWidth - 300),
            top: Math.min(pointerPosition.y + 16, window.innerHeight - 200),
          }}
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.97 }}
          transition={{ duration: 0.15 }}
        >
          <div className="tooltip-header">
            <span className="tooltip-abbr">{abbr}</span>
            <h3 className="tooltip-name">{stateName}</h3>
          </div>

          {summary ? (
            <div className="tooltip-body">
              <div className="tooltip-row">
                <span className="tooltip-label">Top crop</span>
                <span className="tooltip-value crop-tag">{summary.best_crop}</span>
              </div>
              {Object.entries(summary.crops).map(([crop, data]) => (
                <div key={crop} className="tooltip-crop">
                  <span className="crop-name">{crop === 'corn' ? '🌽' : '🫘'} {crop}</span>
                  <span className="crop-yield">{formatYield(data.avg_yield)}</span>
                  <span className={`crop-trend ${data.trend_per_year >= 0 ? 'up' : 'down'}`}>
                    {data.trend_per_year >= 0 ? '↑' : '↓'} {Math.abs(data.trend_per_year)} bu/yr
                  </span>
                </div>
              ))}
              <div className="tooltip-hint">Click to explore details</div>
            </div>
          ) : (
            <div className="tooltip-body">
              <span className="tooltip-no-data">No crop yield data in this dataset</span>
              <span className="tooltip-no-data-sub">Data covers 32 states with corn &amp; soybean production</span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
