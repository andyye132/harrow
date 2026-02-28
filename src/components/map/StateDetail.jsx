import { AnimatePresence, motion } from 'framer-motion';
import useStore from '../../store/useStore';
import { FIPS_TO_ABBR, STATE_NAMES } from '../../utils/geoToShape';
import { CROP_COLORS } from '../../utils/colorScales';
import { CROP_GROWING_STATS, formatYield, formatTrend } from '../../utils/cropStats';
import './StateDetail.css';

export default function StateDetail() {
  const selectedState = useStore(s => s.selectedState);
  const stateSummaries = useStore(s => s.stateSummaries);
  const stateYields = useStore(s => s.stateYields);
  const countyYields = useStore(s => s.countyYields);
  const setSelectedState = useStore(s => s.setSelectedState);
  const drillDownState = useStore(s => s.drillDownState);
  const setDrillDownState = useStore(s => s.setDrillDownState);

  const abbr = selectedState ? FIPS_TO_ABBR[selectedState] : null;
  const stateName = abbr ? STATE_NAMES[abbr] : null;
  const summary = abbr ? stateSummaries?.[abbr] : null;
  const yields = abbr ? stateYields?.[abbr] : null;

  // Get counties for this state
  const stateCounties = countyYields && abbr
    ? Object.entries(countyYields).filter(([fips, data]) => data.state_abbr === abbr)
    : [];

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
              <span className="detail-counties">{stateCounties.length} counties with data</span>
            </div>
            <button className="detail-close" onClick={() => setSelectedState(null)}>
              &times;
            </button>
          </div>

          {summary && (
            <div className="detail-body">
              {Object.entries(summary.crops).map(([crop, data]) => {
                const growingStats = CROP_GROWING_STATS[crop];
                return (
                  <div key={crop} className="detail-crop-card">
                    <div className="crop-card-header">
                      <span className="crop-emoji">{growingStats?.emoji}</span>
                      <span className="crop-card-name">{crop}</span>
                      {crop === summary.best_crop && (
                        <span className="best-badge">Top crop</span>
                      )}
                    </div>

                    {/* Key stats with clear units */}
                    <div className="crop-stats-grid">
                      <div className="stat-box">
                        <span className="stat-value-lg">{data.avg_yield}</span>
                        <span className="stat-unit">bu/acre avg</span>
                      </div>
                      <div className="stat-box">
                        <span className="stat-value-lg">{data.recent_avg}</span>
                        <span className="stat-unit">bu/acre (2020-24)</span>
                      </div>
                      <div className="stat-box">
                        <span className={`stat-value-lg ${data.trend_per_year >= 0 ? 'trend-up' : 'trend-down'}`}>
                          {data.trend_per_year >= 0 ? '+' : ''}{data.trend_per_year}
                        </span>
                        <span className="stat-unit">bu/acre per year</span>
                      </div>
                      <div className="stat-box">
                        <span className="stat-value-lg">{data.variability}</span>
                        <span className="stat-unit">std deviation</span>
                      </div>
                    </div>

                    {/* Best/Worst */}
                    <div className="crop-extremes">
                      <div className="extreme-row best">
                        <span className="extreme-label">Best year</span>
                        <span className="extreme-val">{data.best_yield} bu/acre ({data.best_year})</span>
                      </div>
                      <div className="extreme-row worst">
                        <span className="extreme-label">Worst year</span>
                        <span className="extreme-val">{data.worst_yield} bu/acre ({data.worst_year})</span>
                      </div>
                    </div>

                    {/* Sparkline */}
                    {yields?.crops?.[crop] && (
                      <div className="sparkline-container">
                        <Sparkline data={yields.crops[crop]} color={CROP_COLORS[crop]} />
                      </div>
                    )}

                    {/* Growing stats from reference images */}
                    {growingStats && (
                      <div className="growing-stats">
                        <div className="growing-stats-header">Growing Requirements</div>
                        {growingStats.stats.map((stat, i) => (
                          <div key={i} className="growing-stat-row">
                            <span className="growing-check">✓</span>
                            <span className="growing-label">{stat.label}:</span>
                            <span className="growing-value">{stat.value}</span>
                            {stat.note && <span className="growing-note">({stat.note})</span>}
                          </div>
                        ))}
                        <div className="growing-stat-row">
                          <span className="growing-check">✓</span>
                          <span className="growing-label">Plant:</span>
                          <span className="growing-value">{growingStats.plantingMonths}</span>
                        </div>
                        <div className="growing-stat-row">
                          <span className="growing-check">✓</span>
                          <span className="growing-label">Harvest:</span>
                          <span className="growing-value">{growingStats.harvestMonths}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* County breakdown */}
              {stateCounties.length > 0 && (
                <div className="county-section">
                  <div className="county-header">
                    <span>County Breakdown</span>
                    <span className="county-count">{stateCounties.length}</span>
                  </div>
                  <div className="county-list">
                    {stateCounties
                      .sort((a, b) => {
                        const aYield = getLatestYield(a[1]);
                        const bYield = getLatestYield(b[1]);
                        return bYield - aYield;
                      })
                      .slice(0, 15)
                      .map(([fips, data]) => (
                        <div key={fips} className="county-row">
                          <span className="county-name">{data.county_name}</span>
                          <div className="county-crops">
                            {Object.entries(data.crops).map(([crop, years]) => {
                              const latest = years[years.length - 1];
                              const avg = years.reduce((s, y) => s + y.yield, 0) / years.length;
                              return (
                                <span key={crop} className="county-crop-val">
                                  <span className="county-crop-emoji">{crop === 'corn' ? '🌽' : '🫘'}</span>
                                  <span className="county-yield">{latest.yield}</span>
                                  <span className="county-yield-unit">bu/acre</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    {stateCounties.length > 15 && (
                      <div className="county-more">
                        +{stateCounties.length - 15} more counties
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {!summary && (
            <div className="detail-body">
              <p className="detail-no-data">
                No crop yield data available for {stateName}.
                <br />
                <span className="detail-no-data-sub">
                  This dataset covers corn and soybean yields across 32 US states.
                </span>
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function getLatestYield(countyData) {
  const crops = Object.values(countyData.crops);
  if (crops.length === 0) return 0;
  const latest = crops[0][crops[0].length - 1];
  return latest?.yield || 0;
}

function Sparkline({ data, color }) {
  const values = data.map(d => d.avg_yield);
  const years = data.map(d => d.year);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 240;
  const h = 50;
  const padY = 5;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = padY + (h - 2 * padY) - ((v - min) / range) * (h - 2 * padY);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="sparkline-wrap">
      <svg width={w} height={h + 20} className="sparkline">
        {/* Y axis labels */}
        <text x="0" y={padY + 3} fontSize="9" fill="var(--text-muted)" fontFamily="var(--font-mono)">
          {Math.round(max)}
        </text>
        <text x="0" y={h - padY + 3} fontSize="9" fill="var(--text-muted)" fontFamily="var(--font-mono)">
          {Math.round(min)}
        </text>
        {/* Line */}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
          strokeLinejoin="round"
        />
        {/* Last point dot */}
        {values.length > 0 && (
          <circle
            cx={w}
            cy={padY + (h - 2 * padY) - ((values[values.length - 1] - min) / range) * (h - 2 * padY)}
            r="3.5"
            fill={color}
          />
        )}
        {/* Year labels */}
        <text x="0" y={h + 14} fontSize="9" fill="var(--text-muted)" fontFamily="var(--font-mono)">
          {years[0]}
        </text>
        <text x={w} y={h + 14} fontSize="9" fill="var(--text-muted)" fontFamily="var(--font-mono)" textAnchor="end">
          {years[years.length - 1]}
        </text>
      </svg>
    </div>
  );
}
