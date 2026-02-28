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
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.5 }}
        >
          <motion.h2
            className="welcome-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
          >
            harrow
          </motion.h2>
          <motion.p
            className="welcome-subtitle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            weather-to-yield intelligence
          </motion.p>
          <motion.p
            className="welcome-desc"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            15 years of crop data across 32 states, analyzed against
            76 million daily weather records to reveal what drives yield.
          </motion.p>
          <motion.span
            className="welcome-cta"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            Click a state to begin
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
