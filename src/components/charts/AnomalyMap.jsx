import { useMemo, useState } from 'react';
import useStore from '../../store/useStore';
import './AnomalyMap.css';

const YEARS = Array.from({ length: 15 }, (_, i) => 2010 + i);

export default function AnomalyMap() {
  const anomalies = useStore(s => s.anomalies);
  const chartCrop = useStore(s => s.chartCrop);
  const [selectedYear, setSelectedYear] = useState(2024);

  const filtered = useMemo(() => {
    if (!anomalies) return [];
    return anomalies
      .filter(a => a.crop === chartCrop && a.year === selectedYear)
      .sort((a, b) => a.z_score - b.z_score);
  }, [anomalies, chartCrop, selectedYear]);

  const topLow = filtered.filter(a => a.type === 'low').slice(0, 10);
  const topHigh = filtered.filter(a => a.type === 'high').slice(-10).reverse();

  return (
    <div className="anomaly-container">
      <div className="anomaly-year-selector">
        {YEARS.map(y => (
          <button
            key={y}
            className={`anomaly-year-btn ${selectedYear === y ? 'active' : ''}`}
            onClick={() => setSelectedYear(y)}
          >
            {String(y).slice(2)}
          </button>
        ))}
      </div>

      <div className="anomaly-summary">
        <span className="anomaly-count">{filtered.length}</span> anomalies in {selectedYear}
      </div>

      <div className="anomaly-lists">
        <div className="anomaly-list">
          <h4 className="list-header low">Lowest Yields</h4>
          {topLow.length === 0 && <p className="no-data">No anomalies</p>}
          {topLow.map((a, i) => (
            <div key={i} className="anomaly-item">
              <div className="anomaly-item-main">
                <span className="anomaly-county">{a.county}, {a.state_abbr}</span>
                <span className="anomaly-z low">{a.z_score.toFixed(1)}σ</span>
              </div>
              <div className="anomaly-item-sub">
                {a.yield} vs {a.mean_yield} avg
              </div>
            </div>
          ))}
        </div>

        <div className="anomaly-list">
          <h4 className="list-header high">Highest Yields</h4>
          {topHigh.length === 0 && <p className="no-data">No anomalies</p>}
          {topHigh.map((a, i) => (
            <div key={i} className="anomaly-item">
              <div className="anomaly-item-main">
                <span className="anomaly-county">{a.county}, {a.state_abbr}</span>
                <span className="anomaly-z high">+{a.z_score.toFixed(1)}σ</span>
              </div>
              <div className="anomaly-item-sub">
                {a.yield} vs {a.mean_yield} avg
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
