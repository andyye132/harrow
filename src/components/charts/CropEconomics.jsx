import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import useStore from '../../store/useStore';
import './CropEconomics.css';

/**
 * Corn vs Soybeans economic comparison.
 *
 * Key insight: Corn yields more bushels (~170 vs ~50) but soybeans fetch
 * ~2.5x the price per bushel ($11-12 vs $4-5). Production costs also differ.
 *
 * Sources:
 * - USDA ERS commodity costs/returns: corn ~$400/acre, soybeans ~$300/acre
 * - CME Group average prices 2020-2024: corn ~$4.50/bu, soybeans ~$11.50/bu
 */

const CORN_PRICE = 4.50;
const SOY_PRICE = 11.50;
const CORN_COST = 400;
const SOY_COST = 300;

export default function CropEconomics() {
  const stateYields = useStore(s => s.stateYields);

  const comparisonData = useMemo(() => {
    if (!stateYields) return [];

    const states = [];
    Object.entries(stateYields).forEach(([abbr, data]) => {
      const cornData = data.crops?.corn;
      const soyData = data.crops?.soybeans;
      if (!cornData || !soyData) return;

      // Use recent years (2020-2024)
      const recentCorn = cornData.filter(y => y.year >= 2020);
      const recentSoy = soyData.filter(y => y.year >= 2020);
      if (recentCorn.length === 0 || recentSoy.length === 0) return;

      const avgCornYield = recentCorn.reduce((s, y) => s + y.avg_yield, 0) / recentCorn.length;
      const avgSoyYield = recentSoy.reduce((s, y) => s + y.avg_yield, 0) / recentSoy.length;

      const cornRevenue = avgCornYield * CORN_PRICE;
      const soyRevenue = avgSoyYield * SOY_PRICE;
      const cornProfit = cornRevenue - CORN_COST;
      const soyProfit = soyRevenue - SOY_COST;

      states.push({
        state: abbr,
        cornYield: Math.round(avgCornYield),
        soyYield: Math.round(avgSoyYield),
        cornRevenue: Math.round(cornRevenue),
        soyRevenue: Math.round(soyRevenue),
        cornProfit: Math.round(cornProfit),
        soyProfit: Math.round(soyProfit),
        advantage: soyProfit > cornProfit ? 'soybeans' : 'corn',
      });
    });

    return states.sort((a, b) => (b.soyProfit - b.cornProfit) - (a.soyProfit - a.cornProfit));
  }, [stateYields]);

  // National averages
  const natAvg = useMemo(() => {
    if (comparisonData.length === 0) return null;
    const avg = (arr, key) => Math.round(arr.reduce((s, d) => s + d[key], 0) / arr.length);
    return {
      cornYield: avg(comparisonData, 'cornYield'),
      soyYield: avg(comparisonData, 'soyYield'),
      cornRevenue: avg(comparisonData, 'cornRevenue'),
      soyRevenue: avg(comparisonData, 'soyRevenue'),
      cornProfit: avg(comparisonData, 'cornProfit'),
      soyProfit: avg(comparisonData, 'soyProfit'),
      soyAdvantageStates: comparisonData.filter(d => d.advantage === 'soybeans').length,
      cornAdvantageStates: comparisonData.filter(d => d.advantage === 'corn').length,
    };
  }, [comparisonData]);

  if (!natAvg) return null;

  return (
    <div className="econ-container">
      {/* Summary cards */}
      <div className="econ-summary">
        <div className="econ-crop-card corn-card">
          <div className="econ-crop-header">
            <span>🌽</span>
            <span>Corn</span>
          </div>
          <div className="econ-metrics">
            <div className="econ-metric">
              <span className="econ-val">{natAvg.cornYield}</span>
              <span className="econ-label">bu/acre avg</span>
            </div>
            <div className="econ-metric">
              <span className="econ-val">${CORN_PRICE.toFixed(2)}</span>
              <span className="econ-label">per bushel</span>
            </div>
            <div className="econ-metric">
              <span className="econ-val">${natAvg.cornRevenue}</span>
              <span className="econ-label">revenue/acre</span>
            </div>
            <div className="econ-metric">
              <span className="econ-val">-${CORN_COST}</span>
              <span className="econ-label">cost/acre</span>
            </div>
            <div className="econ-metric profit">
              <span className="econ-val">${natAvg.cornProfit}</span>
              <span className="econ-label">profit/acre</span>
            </div>
          </div>
        </div>

        <div className="econ-vs">vs</div>

        <div className="econ-crop-card soy-card">
          <div className="econ-crop-header">
            <span>🫘</span>
            <span>Soybeans</span>
          </div>
          <div className="econ-metrics">
            <div className="econ-metric">
              <span className="econ-val">{natAvg.soyYield}</span>
              <span className="econ-label">bu/acre avg</span>
            </div>
            <div className="econ-metric">
              <span className="econ-val">${SOY_PRICE.toFixed(2)}</span>
              <span className="econ-label">per bushel</span>
            </div>
            <div className="econ-metric">
              <span className="econ-val">${natAvg.soyRevenue}</span>
              <span className="econ-label">revenue/acre</span>
            </div>
            <div className="econ-metric">
              <span className="econ-val">-${SOY_COST}</span>
              <span className="econ-label">cost/acre</span>
            </div>
            <div className="econ-metric profit">
              <span className="econ-val">${natAvg.soyProfit}</span>
              <span className="econ-label">profit/acre</span>
            </div>
          </div>
        </div>
      </div>

      <div className="econ-insight">
        <strong>Key insight:</strong> Soybeans yield fewer bushels ({natAvg.soyYield} vs {natAvg.cornYield}) but at ~2.5x the price
        (${SOY_PRICE}/bu vs ${CORN_PRICE}/bu) and ~25% lower production costs.
        Soybeans are more profitable in <strong>{natAvg.soyAdvantageStates} of {comparisonData.length}</strong> states,
        while corn wins in <strong>{natAvg.cornAdvantageStates}</strong>.
      </div>

      {/* Per-state profit comparison */}
      <ResponsiveContainer width="100%" height={Math.max(250, comparisonData.length * 22)}>
        <BarChart
          data={comparisonData.slice(0, 20)}
          layout="vertical"
          margin={{ top: 5, right: 30, bottom: 5, left: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            type="number"
            stroke="var(--text-muted)"
            fontSize={11}
            fontFamily="var(--font-mono)"
            tickLine={false}
            tickFormatter={(v) => `$${v}`}
          />
          <YAxis
            dataKey="state"
            type="category"
            stroke="var(--text-muted)"
            fontSize={12}
            fontFamily="var(--font-mono)"
            tickLine={false}
            width={35}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-overlay)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-primary)',
            }}
            formatter={(value, name) => [`$${value}/acre`, name]}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}
          />
          <Bar dataKey="cornProfit" name="Corn Profit" fill="var(--corn)" fillOpacity={0.7} radius={[0, 3, 3, 0]} />
          <Bar dataKey="soyProfit" name="Soybean Profit" fill="var(--soy)" fillOpacity={0.7} radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="econ-sources">
        Prices: CME Group 2020-2024 averages. Costs: USDA ERS Commodity Costs and Returns (2023).
        Profit = (yield × price) - production cost. Does not include government subsidies, insurance, or land costs.
      </div>
    </div>
  );
}
