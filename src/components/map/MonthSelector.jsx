import useStore from '../../store/useStore';
import { MONTHS } from '../../utils/colorScales';
import { getSeasonStatus, CROP_GROWING_STATS } from '../../utils/cropStats';
import './MonthSelector.css';

export default function MonthSelector() {
  const selectedMonth = useStore(s => s.selectedMonth);
  const setSelectedMonth = useStore(s => s.setSelectedMonth);
  const chartCrop = useStore(s => s.chartCrop);
  const setChartCrop = useStore(s => s.setChartCrop);

  return (
    <div className="month-selector">
      <div className="month-selector-inner">
        {/* Crop toggle */}
        <div className="month-crop-toggle">
          {['corn', 'soybeans'].map(crop => (
            <button
              key={crop}
              className={`crop-toggle-btn ${chartCrop === crop ? 'active' : ''}`}
              onClick={() => setChartCrop(crop)}
            >
              {CROP_GROWING_STATS[crop].emoji}
            </button>
          ))}
        </div>

        {/* Month slider */}
        <div className="month-slider-wrap">
          <div className="month-slider-labels">
            {MONTHS.map((month, i) => {
              const status = getSeasonStatus(chartCrop, i);
              return (
                <span
                  key={i}
                  className={`month-label ${selectedMonth === i ? 'active' : ''} ${status}`}
                >
                  {month.slice(0, 3)}
                </span>
              );
            })}
          </div>
          <div className="month-slider-track-wrap">
            {/* Season color segments behind the slider */}
            <div className="month-slider-seasons">
              {MONTHS.map((_, i) => {
                const status = getSeasonStatus(chartCrop, i);
                return <span key={i} className={`season-seg ${status}`} />;
              })}
            </div>
            <input
              type="range"
              className="month-slider"
              min={0}
              max={11}
              step={1}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Season legend */}
        <div className="season-legend">
          <span className="legend-dot growing" /> Growing
          <span className="legend-dot harvest" /> Harvest
          <span className="yield-legend-sep">|</span>
          <span className="yield-legend-label">Yield:</span>
          <span className="yield-gradient" />
          <span className="yield-legend-range">Low → High</span>
        </div>
      </div>
    </div>
  );
}
