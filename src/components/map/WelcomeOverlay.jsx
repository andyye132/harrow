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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.span
            className="welcome-cta"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            click a state to begin
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
