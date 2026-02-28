import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import useStore from '../../store/useStore';
import './CropEconomics.css';

// USDA NASS Marketing Year Average Prices ($/bushel)
// Source: https://quickstats.nass.usda.gov/ — "PRICE RECEIVED, MEASURED IN $ / BU"
const CORN_PRICES = {
  2010: 5.18, 2011: 6.22, 2012: 6.89, 2013: 4.46, 2014: 3.70,
  2015: 3.61, 2016: 3.36, 2017: 3.36, 2018: 3.61, 2019: 3.56,
  2020: 4.53, 2021: 5.45, 2022: 6.54, 2023: 4.65, 2024: 4.10,
};
const SOY_PRICES = {
  2010: 11.30, 2011: 12.50, 2012: 14.40, 2013: 13.00, 2014: 10.10,
  2015: 8.95, 2016: 9.47, 2017: 9.33, 2018: 8.48, 2019: 8.57,
  2020: 10.80, 2021: 13.30, 2022: 14.20, 2023: 12.50, 2024: 10.40,
};

// USDA ERS operating costs (fairly stable, slight annual variation)
const CORN_COST = 400;
const SOY_COST = 300;

// Average prices for the summary cards
const avgPrice = (prices, startYear) => {
  const years = Object.entries(prices).filter(([y]) => Number(y) >= startYear);
  return years.reduce((s, [, p]) => s + p, 0) / years.length;
};

export default function CropEconomics() {
  const stateYields = useStore(s => s.stateYields);
  const [search, setSearch] = useState('');

  // Use year-specific prices for each state's profit calculation
  const comparisonData = useMemo(() => {
    if (!stateYields) return [];

    const states = [];
    Object.entries(stateYields).forEach(([abbr, data]) => {
      const cornData = data.crops?.corn;
      const soyData = data.crops?.soybeans;
      if (!cornData || !soyData) return;

      const recentCorn = cornData.filter(y => y.year >= 2020);
      const recentSoy = soyData.filter(y => y.year >= 2020);
      if (recentCorn.length === 0 || recentSoy.length === 0) return;

      // Calculate profit using actual price for each year
      let cornProfitSum = 0, soyProfitSum = 0;
      let cornYieldSum = 0, soyYieldSum = 0;
      let cornRevSum = 0, soyRevSum = 0;

      for (const y of recentCorn) {
        const price = CORN_PRICES[y.year] || 4.50;
        cornYieldSum += y.avg_yield;
        cornRevSum += y.avg_yield * price;
        cornProfitSum += y.avg_yield * price - CORN_COST;
      }
      for (const y of recentSoy) {
        const price = SOY_PRICES[y.year] || 11.50;
        soyYieldSum += y.avg_yield;
        soyRevSum += y.avg_yield * price;
        soyProfitSum += y.avg_yield * price - SOY_COST;
      }

      const avgCornYield = cornYieldSum / recentCorn.length;
      const avgSoyYield = soyYieldSum / recentSoy.length;
      const avgCornRevenue = cornRevSum / recentCorn.length;
      const avgSoyRevenue = soyRevSum / recentSoy.length;
      const avgCornProfit = cornProfitSum / recentCorn.length;
      const avgSoyProfit = soyProfitSum / recentSoy.length;

      states.push({
        state: abbr,
        cornYield: Math.round(avgCornYield),
        soyYield: Math.round(avgSoyYield),
        cornRevenue: Math.round(avgCornRevenue),
        soyRevenue: Math.round(avgSoyRevenue),
        cornProfit: Math.round(avgCornProfit),
        soyProfit: Math.round(avgSoyProfit),
        advantage: avgSoyProfit > avgCornProfit ? 'soybeans' : 'corn',
      });
    });

    return states.sort((a, b) => b.cornProfit - a.cornProfit);
  }, [stateYields]);

  const filteredData = useMemo(() => {
    if (!search.trim()) return comparisonData;
    const q = search.trim().toLowerCase();
    return comparisonData.filter(d => d.state.toLowerCase().includes(q));
  }, [comparisonData, search]);

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

  const cornAvgPrice = avgPrice(CORN_PRICES, 2020).toFixed(2);
  const soyAvgPrice = avgPrice(SOY_PRICES, 2020).toFixed(2);

  return (
    <div className="econ-container">
      {/* Side-by-side comparison */}
      <div className="econ-comparison">
        <div className="econ-col corn">
          <div className="econ-col-header">
            <span className="econ-col-emoji">&#x1F33D;</span>
            <span className="econ-col-name">Corn</span>
          </div>
          <div className="econ-col-body">
            <div className="econ-row">
              <span className="econ-row-label">Avg yield</span>
              <span className="econ-row-value">{natAvg.cornYield} <small>bu/acre</small></span>
            </div>
            <div className="econ-row">
              <span className="econ-row-label">Avg price (2020-24)</span>
              <span className="econ-row-value">${cornAvgPrice} <small>/bushel</small></span>
            </div>
            <div className="econ-row">
              <span className="econ-row-label">Revenue</span>
              <span className="econ-row-value">${natAvg.cornRevenue} <small>/acre</small></span>
            </div>
            <div className="econ-row">
              <span className="econ-row-label">Operating cost</span>
              <span className="econ-row-value cost">-${CORN_COST} <small>/acre</small></span>
            </div>
            <div className="econ-row total">
              <span className="econ-row-label">Profit</span>
              <span className="econ-row-value profit">${natAvg.cornProfit} <small>/acre</small></span>
            </div>
          </div>
          <div className="econ-col-wins">
            Wins in <strong>{natAvg.cornAdvantageStates}</strong> states
          </div>
        </div>

        <div className="econ-divider">
          <span className="econ-divider-text">vs</span>
        </div>

        <div className="econ-col soy">
          <div className="econ-col-header">
            <span className="econ-col-emoji">&#x1FAD8;</span>
            <span className="econ-col-name">Soybeans</span>
          </div>
          <div className="econ-col-body">
            <div className="econ-row">
              <span className="econ-row-label">Avg yield</span>
              <span className="econ-row-value">{natAvg.soyYield} <small>bu/acre</small></span>
            </div>
            <div className="econ-row">
              <span className="econ-row-label">Avg price (2020-24)</span>
              <span className="econ-row-value">${soyAvgPrice} <small>/bushel</small></span>
            </div>
            <div className="econ-row">
              <span className="econ-row-label">Revenue</span>
              <span className="econ-row-value">${natAvg.soyRevenue} <small>/acre</small></span>
            </div>
            <div className="econ-row">
              <span className="econ-row-label">Operating cost</span>
              <span className="econ-row-value cost">-${SOY_COST} <small>/acre</small></span>
            </div>
            <div className="econ-row total">
              <span className="econ-row-label">Profit</span>
              <span className="econ-row-value profit">${natAvg.soyProfit} <small>/acre</small></span>
            </div>
          </div>
          <div className="econ-col-wins">
            Wins in <strong>{natAvg.soyAdvantageStates}</strong> states
          </div>
        </div>
      </div>

      <div className="econ-insight">
        <strong>Why the difference?</strong> Corn produces ~{natAvg.cornYield} bushels/acre vs ~{natAvg.soyYield} for soybeans,
        but soybeans sell at ~${soyAvgPrice}/bu (2x+ corn's ~${cornAvgPrice}/bu) and cost ~$100/acre less to grow.
        Soybeans are more profitable in {natAvg.soyAdvantageStates} of {comparisonData.length} states.
        Prices vary year to year — corn ranged from ${Math.min(...Object.values(CORN_PRICES)).toFixed(2)} to ${Math.max(...Object.values(CORN_PRICES)).toFixed(2)}/bu since 2010.
      </div>

      {/* Search + chart */}
      <div className="econ-chart-header">
        <h4 className="econ-chart-title">Profit per Acre by State (2020-2024, year-specific prices)</h4>
        <input
          className="econ-search"
          type="text"
          placeholder="Search states..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <BarChart
          data={filteredData}
          margin={{ top: 10, right: 10, bottom: 40, left: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="state"
            stroke="var(--text-muted)"
            fontSize={11}
            fontFamily="var(--font-mono)"
            tickLine={false}
            angle={-45}
            textAnchor="end"
            height={50}
          />
          <YAxis
            stroke="var(--text-muted)"
            fontSize={11}
            fontFamily="var(--font-mono)"
            tickLine={false}
            tickFormatter={(v) => `$${v}`}
            width={50}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-overlay)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '13px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-primary)',
            }}
            formatter={(value, name) => [`$${value}/acre`, name]}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', fontFamily: 'var(--font-mono)', paddingTop: '8px' }}
          />
          <ReferenceLine y={0} stroke="var(--text-muted)" strokeDasharray="3 3" />
          <Bar dataKey="cornProfit" name="Corn Profit" fill="var(--corn)" fillOpacity={0.85} radius={[4, 4, 0, 0]} barSize={12} />
          <Bar dataKey="soyProfit" name="Soybean Profit" fill="var(--soy)" fillOpacity={0.85} radius={[4, 4, 0, 0]} barSize={12} />
        </BarChart>
      </ResponsiveContainer>

      <div className="econ-sources">
        <strong>Data Sources</strong>
        <br />
        Prices: <a href="https://quickstats.nass.usda.gov/" target="_blank" rel="noopener">USDA NASS Quick Stats</a> — Marketing Year Average prices, year-by-year (2010-2024).
        Each state's profit uses the actual price for that year, not a flat average.
        <br />
        Costs: <a href="https://www.ers.usda.gov/data-products/commodity-costs-and-returns/" target="_blank" rel="noopener">USDA ERS Commodity Costs &amp; Returns</a> (2023).
        Operating costs include seed, fertilizer, chemicals, fuel, and machinery.
        Excludes land rent (~$150-250/acre) and labor.
        <br />
        Yields: USDA RMA County Yield data (2010-2024), non-irrigated, 32 states.
      </div>
    </div>
  );
}
