import Header from './components/Header';
import MapCanvas from './components/map/MapCanvas';
import StateTooltip from './components/map/StateTooltip';
import StateDetail from './components/map/StateDetail';
import WelcomeOverlay from './components/map/WelcomeOverlay';
import MonthSelector from './components/map/MonthSelector';
import ChatDrawer from './components/chat/ChatDrawer';
import ChartSection from './components/charts/ChartSection';
import useYieldData from './hooks/useYieldData';
import useStore from './store/useStore';
import './styles/theme.css';
import './App.css';

export default function App() {
  useYieldData();
  const chatOpen = useStore(s => s.chatOpen);

  return (
    <div className="app">
      <Header />
      <main className={`main-content ${chatOpen ? 'chat-open' : ''}`}>
        <div className="map-row">
          <div className="map-container">
            <MapCanvas />
            <StateTooltip />
            <WelcomeOverlay />
            <StateDetail />
            <MonthSelector />
          </div>
        </div>
        <ChartSection />
      </main>
      <ChatDrawer />
    </div>
  );
}
