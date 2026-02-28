import { motion } from 'framer-motion';
import useStore from '../../store/useStore';
import YieldTrendChart from './YieldTrendChart';
import CorrelationChart from './CorrelationChart';
import CropEconomics from './CropEconomics';
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
          Yield trends, weather correlations, and anomaly analysis across 32 states (2010-2024). All yields measured in <strong>bushels per acre</strong> (bu/acre).
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
          <p className="chart-desc">
            Average yield (bu/acre) by crop, 2010-2024. Line shows national average; dashed lines show highest and lowest state averages.
          </p>
          <YieldTrendChart />
        </motion.div>

        <motion.div
          className="chart-card full-width"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={sectionVariants}
          transition={{ duration: 0.5, delay: 0.12 }}
        >
          <h3 className="chart-title">Corn vs Soybeans: Economic Comparison</h3>
          <p className="chart-desc">
            Corn yields ~3x more bushels, but soybeans fetch ~2.5x the price per bushel. Which is more profitable per acre?
            Based on USDA cost data and CME commodity prices.
          </p>
          <CropEconomics />
        </motion.div>

        <motion.div
          className="chart-card full-width"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={sectionVariants}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <h3 className="chart-title">Weather-Yield Correlations</h3>
          <p className="chart-desc">
            How strongly each weather feature correlates with yield. Negative means that feature <em>reduces</em> yield. Based on 480 state-year observations with 76 million daily weather records.
          </p>
          <CorrelationChart />
        </motion.div>

        <motion.div
          className="chart-card full-width"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={sectionVariants}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h3 className="chart-title">Weather-Defying Anomalies</h3>
          <p className="chart-desc">
            Cases where actual yield significantly defied what weather conditions predicted.
            If conditions were terrible but yield was high (or vice versa), something interesting happened.
          </p>
          <AnomalyMap />
        </motion.div>

        <motion.div
          className="chart-card full-width"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={sectionVariants}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h3 className="chart-title">Extreme Weather Events</h3>
          <p className="chart-desc">
            How droughts, floods, and heat waves impacted average yields. Bars show % deviation from the 15-year average.
          </p>
          <ExtremeEventsChart />
        </motion.div>
      </div>
    </section>
  );
}
