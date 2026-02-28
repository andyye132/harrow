import { AnimatePresence, motion } from 'framer-motion';
import useStore from '../../store/useStore';
import './WelcomeOverlay.css';

export default function WelcomeOverlay() {
  const selectedState = useStore(s => s.selectedState);

  return (
    <AnimatePresence>
      {!selectedState && (
        <motion.div
          className="welcome-overlay"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="welcome-title">Welcome to Harrow</h2>
          <p className="welcome-desc">
            Explore weather-to-yield intelligence across 32 US states.
            <br />
            Corn, soybeans, 15 years of data, 76 million weather records.
          </p>
          <span className="welcome-cta">Click a state to begin</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
