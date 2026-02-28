import useStore from '../../store/useStore';
import { MONTHS } from '../../utils/colorScales';
import './MonthSelector.css';

export default function MonthSelector() {
  const selectedMonth = useStore(s => s.selectedMonth);
  const setSelectedMonth = useStore(s => s.setSelectedMonth);

  return (
    <div className="month-selector">
      <div className="month-track">
        {MONTHS.map((month, i) => (
          <button
            key={i}
            className={`month-btn ${selectedMonth === i ? 'active' : ''}`}
            onClick={() => setSelectedMonth(i)}
          >
            {month.slice(0, 3)}
          </button>
        ))}
      </div>
    </div>
  );
}
