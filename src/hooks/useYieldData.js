import { useEffect } from 'react';
import useStore from '../store/useStore';

const DATA_FILES = {
  stateYields: '/data/state_yields.json',
  countyYields: '/data/county_yields.json',
  anomalies: '/data/yield_anomalies.json',
  stateSummaries: '/data/state_summaries.json',
  plantingGuide: '/data/planting_guide.json',
  extremeEvents: '/data/extreme_events.json',
  monthlyNormals: '/data/monthly_normals.json',
  weatherByState: '/data/weather_by_state.json',
  weatherAnomalies: '/data/weather_anomalies.json',
};

export default function useYieldData() {
  const setData = useStore(s => s.setData);
  const stateYields = useStore(s => s.stateYields);

  useEffect(() => {
    if (stateYields) return; // already loaded

    Object.entries(DATA_FILES).forEach(([key, path]) => {
      fetch(path)
        .then(res => {
          if (!res.ok) throw new Error(`${res.status}`);
          return res.json();
        })
        .then(data => setData(key, data))
        .catch(() => {}); // silently skip missing files
    });
  }, [setData, stateYields]);
}
