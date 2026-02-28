import { motion } from 'framer-motion';
import './Header.css';

export default function Header() {
  return (
    <header className="header">
      <motion.h1
        className="header-title"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        harrow
      </motion.h1>
      <motion.p
        className="header-tagline"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        weather-to-yield intelligence
      </motion.p>
    </header>
  );
}
