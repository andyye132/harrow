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

        {/* Month buttons */}
        <div className="month-track">
          {MONTHS.map((month, i) => {
            const status = getSeasonStatus(chartCrop, i);
            return (
              <button
                key={i}
                className={`month-btn ${selectedMonth === i ? 'active' : ''} ${status}`}
                onClick={() => setSelectedMonth(i)}
                title={`${month} — ${status}`}
              >
                {month.slice(0, 3)}
              </button>
            );
          })}
        </div>

        {/* Season legend */}
        <div className="season-legend">
          <span className="legend-dot growing" /> Growing
          <span className="legend-dot harvest" /> Harvest
        </div>
      </div>
    </div>
  );
}
