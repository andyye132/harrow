import { motion } from 'framer-motion';
import useStore from '../../store/useStore';
import YieldTrendChart from './YieldTrendChart';
import AnomalyMap from './AnomalyMap';
import ExtremeEventsChart from './ExtremeEventsChart';
import FilterControls from './FilterControls';
import './ChartSection.css';

const sectionVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

export default function ChartSection() {
  const stateYields = useStore(s => s.stateYields);

  if (!stateYields) return null;

  return (
    <section className="chart-section">
      <motion.div
        className="section-header"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={sectionVariants}
        transition={{ duration: 0.5 }}
      >
        <h2 className="section-title">Data Intelligence</h2>
        <p className="section-subtitle">
          Yield trends, anomalies, and extreme event analysis across 32 states
        </p>
      </motion.div>

      <FilterControls />

      <div className="charts-grid">
        <motion.div
          className="chart-card full-width"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={sectionVariants}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h3 className="chart-title">Yield Trends Over Time</h3>
          <p className="chart-desc">Average yield by state and crop, 2010-2024</p>
          <YieldTrendChart />
        </motion.div>

        <motion.div
          className="chart-card"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={sectionVariants}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h3 className="chart-title">Yield Anomalies</h3>
          <p className="chart-desc">Counties with unusual yield deviations</p>
          <AnomalyMap />
        </motion.div>

        <motion.div
          className="chart-card"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={sectionVariants}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h3 className="chart-title">Extreme Weather Events</h3>
          <p className="chart-desc">Yield impact during droughts, floods, and heat waves</p>
          <ExtremeEventsChart />
        </motion.div>
      </div>
    </section>
  );
}
