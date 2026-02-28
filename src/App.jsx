import Header from './components/Header';
import MapCanvas from './components/map/MapCanvas';
import StateTooltip from './components/map/StateTooltip';
import StateDetail from './components/map/StateDetail';
import MonthSelector from './components/map/MonthSelector';
import PlantHelper from './components/helper/PlantHelper';
import ChartSection from './components/charts/ChartSection';
import useYieldData from './hooks/useYieldData';
import './styles/theme.css';
import './App.css';

export default function App() {
  useYieldData();

  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <div className="map-helper-row">
          <div className="map-container">
            <MapCanvas />
            <StateTooltip />
            <StateDetail />
            <MonthSelector />
          </div>
          <div className="helper-container">
            <PlantHelper />
          </div>
        </div>
        <ChartSection />
      </main>
    </div>
  );
}
