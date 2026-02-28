import useStore from '../../store/useStore';
import { CROP_COLORS } from '../../utils/colorScales';
import './FilterControls.css';

export default function FilterControls() {
  const chartCrop = useStore(s => s.chartCrop);
  const setChartCrop = useStore(s => s.setChartCrop);

  return (
    <div className="filter-controls">
      <div className="filter-group">
        <span className="filter-label">Crop</span>
        <div className="filter-buttons">
          {['corn', 'soybeans'].map(crop => (
            <button
              key={crop}
              className={`filter-btn ${chartCrop === crop ? 'active' : ''}`}
              onClick={() => setChartCrop(crop)}
              style={chartCrop === crop ? { borderColor: CROP_COLORS[crop], color: CROP_COLORS[crop] } : {}}
            >
              {crop}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
