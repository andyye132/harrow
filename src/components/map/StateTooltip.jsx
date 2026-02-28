import { AnimatePresence, motion } from 'framer-motion';
import useStore from '../../store/useStore';
import { FIPS_TO_ABBR, STATE_NAMES } from '../../utils/geoToShape';
import './StateTooltip.css';

export default function StateTooltip() {
  const hoveredState = useStore(s => s.hoveredState);
  const selectedState = useStore(s => s.selectedState);
  const pointerPosition = useStore(s => s.pointerPosition);
  const stateSummaries = useStore(s => s.stateSummaries);
  const stateYields = useStore(s => s.stateYields);

  const stateId = hoveredState;
  const abbr = stateId ? FIPS_TO_ABBR[stateId] : null;
  const stateName = abbr ? STATE_NAMES[abbr] : null;
  const summary = abbr ? stateSummaries?.[abbr] : null;
  const yields = abbr ? stateYields?.[abbr] : null;

  // Don't show tooltip if state is selected (detailed view instead)
  if (selectedState) return null;

  return (
    <AnimatePresence>
      {hoveredState && stateName && (
        <motion.div
          className="state-tooltip"
          style={{
            left: pointerPosition.x + 16,
            top: pointerPosition.y + 16,
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
                <span className="tooltip-label">Best crop</span>
                <span className="tooltip-value crop-tag">{summary.best_crop}</span>
              </div>
              {Object.entries(summary.crops).map(([crop, data]) => (
                <div key={crop} className="tooltip-crop">
                  <span className="crop-name">{crop}</span>
                  <span className="crop-yield">{data.avg_yield} bu/acre avg</span>
                  <span className={`crop-trend ${data.trend_per_year >= 0 ? 'up' : 'down'}`}>
                    {data.trend_per_year >= 0 ? '↑' : '↓'} {Math.abs(data.trend_per_year)}/yr
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="tooltip-body">
              <span className="tooltip-no-data">No crop data available</span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
