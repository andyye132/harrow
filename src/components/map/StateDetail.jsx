import { useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useStore from '../../store/useStore';
import { FIPS_TO_ABBR, STATE_NAMES } from '../../utils/geoToShape';
import { CROP_COLORS, MONTHS } from '../../utils/colorScales';
import { CROP_GROWING_STATS, cToF, getSeasonStatus } from '../../utils/cropStats';
import './StateDetail.css';

/**
 * Compute the percentage change vs N years ago from time series data.
 * Returns { pct, arrow, label } or null if not enough data.
 */
function computeYieldTrend(cropTimeSeries, yearsBack = 5) {
  if (!cropTimeSeries || cropTimeSeries.length < 2) return null;
  const sorted = [...cropTimeSeries].sort((a, b) => a.year - b.year);
  const latest = sorted[sorted.length - 1];
  // Find the entry closest to N years ago
  const targetYear = latest.year - yearsBack;
  const past = sorted.reduce((best, entry) => {
    if (!best) return entry;
    return Math.abs(entry.year - targetYear) < Math.abs(best.year - targetYear)
      ? entry
      : best;
  }, null);
  if (!past || past.year === latest.year) return null;
  const actualGap = latest.year - past.year;
  const pctChange = ((latest.avg_yield - past.avg_yield) / past.avg_yield) * 100;
  return {
    pct: Math.round(pctChange),
    arrow: pctChange >= 0 ? '\u2191' : '\u2193',
    direction: pctChange >= 0 ? 'up' : 'down',
    label: `${actualGap}yr`,
  };
}

export default function StateDetail() {
  const selectedState = useStore(s => s.selectedState);
  const stateSummaries = useStore(s => s.stateSummaries);
  const stateYields = useStore(s => s.stateYields);
  const countyYields = useStore(s => s.countyYields);
  const monthlyNormals = useStore(s => s.monthlyNormals);
  const weatherByState = useStore(s => s.weatherByState);
  const selectedMonth = useStore(s => s.selectedMonth);
  const setSelectedState = useStore(s => s.setSelectedState);

  // ESC to close
  const handleClose = useCallback(() => setSelectedState(null), [setSelectedState]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose]);

  const abbr = selectedState ? FIPS_TO_ABBR[selectedState] : null;
  const stateName = abbr ? STATE_NAMES[abbr] : null;
  const summary = abbr ? stateSummaries?.[abbr] : null;
  const yields = abbr ? stateYields?.[abbr] : null;

  // Monthly weather for this state
  const stateNormals = abbr && monthlyNormals ? monthlyNormals[abbr] : null;
  const currentMonthWeather = stateNormals ? stateNormals[String(selectedMonth + 1)] : null;

  // Growing season weather from weatherByState (yearly data)
  const latestWeather = useMemo(() => {
    if (!weatherByState || !abbr) return null;
    const entries = weatherByState[abbr];
    if (!entries || entries.length === 0) return null;
    // Get the most recent year
    const sorted = [...entries].sort((a, b) => b.year - a.year);
    return sorted[0];
  }, [weatherByState, abbr]);

  // Get counties for this state
  const stateCounties = countyYields && abbr
    ? Object.entries(countyYields).filter(([fips, data]) => data.state_abbr === abbr)
    : [];

  // Sort crops so best_crop comes first
  const sortedCrops = useMemo(() => {
    if (!summary) return [];
    return Object.entries(summary.crops).sort(([a], [b]) => {
      if (a === summary.best_crop) return -1;
      if (b === summary.best_crop) return 1;
      return 0;
    });
  }, [summary]);

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
            <button className="detail-close" onClick={handleClose} title="Close (Esc)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span className="close-hint">ESC</span>
            </button>
          </div>

          {/* Best crop highlight banner */}
          {summary && summary.best_crop && (
            <div className="best-crop-banner">
              <span className="best-crop-emoji">{CROP_GROWING_STATS[summary.best_crop]?.emoji}</span>
              <div className="best-crop-info">
                <span className="best-crop-label">Top Crop</span>
                <span className="best-crop-name">{summary.best_crop}</span>
              </div>
              <div className="best-crop-yield">
                <span className="best-crop-value">
                  {summary.crops[summary.best_crop].recent_avg}
                </span>
                <span className="best-crop-unit">bu/acre recent</span>
              </div>
            </div>
          )}

          {/* Growing season conditions from weatherByState */}
          {latestWeather && (
            <div className="growing-conditions-banner">
              <div className="growing-conditions-title">
                {latestWeather.year} Growing Season Conditions
              </div>
              <div className="growing-conditions-grid">
                <div className="gc-stat">
                  <span className="gc-val">{cToF(latestWeather.growing_season_avg_temp)}&deg;F</span>
                  <span className="gc-label">Avg Temp</span>
                </div>
                <div className="gc-stat">
                  <span className={`gc-val ${latestWeather.heat_stress_days > 5 ? 'gc-warn' : ''}`}>
                    {Math.round(latestWeather.heat_stress_days)}d
                  </span>
                  <span className="gc-label">Heat Stress</span>
                </div>
                <div className="gc-stat">
                  <span className={`gc-val ${latestWeather.max_dry_spell_days > 15 ? 'gc-warn' : ''}`}>
                    {Math.round(latestWeather.max_dry_spell_days)}d
                  </span>
                  <span className="gc-label">Max Dry Spell</span>
                </div>
                <div className="gc-stat">
                  <span className="gc-val">
                    {(latestWeather.growing_season_precip_mm / 25.4).toFixed(1)}&quot;
                  </span>
                  <span className="gc-label">Rainfall</span>
                </div>
              </div>
            </div>
          )}

          {/* Current month weather banner */}
          {currentMonthWeather && (
            <div className="month-weather-banner">
              <div className="month-weather-title">
                {MONTHS[selectedMonth]} Weather (historical avg)
              </div>
              <div className="month-weather-grid">
                <div className="mw-stat">
                  <span className="mw-val">{cToF(currentMonthWeather.avg_high)}&deg;F</span>
                  <span className="mw-label">Avg High</span>
                </div>
                <div className="mw-stat">
                  <span className="mw-val">{cToF(currentMonthWeather.avg_low)}&deg;F</span>
                  <span className="mw-label">Avg Low</span>
                </div>
                <div className="mw-stat">
                  <span className="mw-val">{cToF(currentMonthWeather.avg_temp)}&deg;F</span>
                  <span className="mw-label">Avg Temp</span>
                </div>
                <div className="mw-stat">
                  <span className="mw-val">{(currentMonthWeather.avg_precip_mm / 25.4).toFixed(1)}&quot;</span>
                  <span className="mw-label">Rainfall</span>
                </div>
              </div>
              {/* Season status per crop */}
              <div className="month-season-tags">
                {['corn', 'soybeans'].map(crop => {
                  const status = getSeasonStatus(crop, selectedMonth);
                  return (
                    <span key={crop} className={`season-tag ${status}`}>
                      {CROP_GROWING_STATS[crop].emoji} {status === 'growing' ? 'Growing' : status === 'harvest' ? 'Harvest' : 'Dormant'}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {summary && (
            <div className="detail-body">
              {sortedCrops.map(([crop, data]) => {
                const growingStats = CROP_GROWING_STATS[crop];
                const isBest = crop === summary.best_crop;
                // Check if current month temp is in ideal range
                const tempInRange = currentMonthWeather
                  ? currentMonthWeather.avg_temp >= growingStats.idealTempC.min &&
                    currentMonthWeather.avg_temp <= growingStats.idealTempC.max
                  : null;

                // Compute yield trend vs 5 years ago
                const cropTimeSeries = yields?.crops?.[crop];
                const trend5yr = computeYieldTrend(cropTimeSeries, 5);

                return (
                  <div key={crop} className={`detail-crop-card ${isBest ? 'detail-crop-card--best' : ''}`}>
                    <div className="crop-card-header">
                      <span className="crop-emoji">{growingStats?.emoji}</span>
                      <span className="crop-card-name">{crop}</span>
                      {isBest && (
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
                        <span className="stat-value-lg">
                          ${Math.round(data.recent_avg * growingStats.pricePerBushel)}
                        </span>
                        <span className="stat-unit">revenue/acre</span>
                      </div>
                    </div>

                    {/* Yield trend vs 5 years ago */}
                    {trend5yr && (
                      <div className={`yield-trend-row yield-trend--${trend5yr.direction}`}>
                        <span className="yield-trend-arrow">{trend5yr.arrow}</span>
                        <span className="yield-trend-pct">
                          {trend5yr.pct >= 0 ? '+' : ''}{trend5yr.pct}% vs {trend5yr.label} ago
                        </span>
                        <span className="yield-trend-desc">
                          {trend5yr.direction === 'up' ? 'Yield trending upward' : 'Yield trending downward'}
                        </span>
                      </div>
                    )}

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
                    {cropTimeSeries && (
                      <div className="sparkline-container">
                        <Sparkline data={cropTimeSeries} color={CROP_COLORS[crop]} />
                      </div>
                    )}

                    {/* Growing stats */}
                    {growingStats && (
                      <div className="growing-stats">
                        <div className="growing-stats-header">
                          Growing Requirements
                          {currentMonthWeather && tempInRange !== null && (
                            <span className={`temp-indicator ${tempInRange ? 'good' : 'bad'}`}>
                              {tempInRange ? '\u2713 In range this month' : '\u2717 Outside range this month'}
                            </span>
                          )}
                        </div>
                        {growingStats.stats.map((stat, i) => (
                          <div key={i} className="growing-stat-row">
                            <span className="growing-check">{'\u2713'}</span>
                            <span className="growing-label">{stat.label}:</span>
                            <span className="growing-value">{stat.value}</span>
                            {stat.note && <span className="growing-note">({stat.note})</span>}
                          </div>
                        ))}
                        <div className="growing-stat-row">
                          <span className="growing-check">{'\u2713'}</span>
                          <span className="growing-label">Plant:</span>
                          <span className="growing-value">{growingStats.plantingMonths}</span>
                        </div>
                        <div className="growing-stat-row">
                          <span className="growing-check">{'\u2713'}</span>
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
                      .sort((a, b) => getLatestYield(b[1]) - getLatestYield(a[1]))
                      .slice(0, 15)
                      .map(([fips, data]) => (
                        <div key={fips} className="county-row">
                          <span className="county-name">{data.county_name}</span>
                          <div className="county-crops">
                            {Object.entries(data.crops).map(([crop, years]) => {
                              const latest = years[years.length - 1];
                              return (
                                <span key={crop} className="county-crop-val">
                                  <span className="county-crop-emoji">{CROP_GROWING_STATS[crop]?.emoji}</span>
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

          <button className="detail-back-btn" onClick={handleClose}>
            &#8592; Back to map
          </button>
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
        <text x="0" y={padY + 3} fontSize="9" fill="var(--text-muted)" fontFamily="var(--font-mono)">
          {Math.round(max)}
        </text>
        <text x="0" y={h - padY + 3} fontSize="9" fill="var(--text-muted)" fontFamily="var(--font-mono)">
          {Math.round(min)}
        </text>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
          strokeLinejoin="round"
        />
        {values.length > 0 && (
          <circle
            cx={w}
            cy={padY + (h - 2 * padY) - ((values[values.length - 1] - min) / range) * (h - 2 * padY)}
            r="3.5"
            fill={color}
          />
        )}
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
