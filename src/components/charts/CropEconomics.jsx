import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import useStore from '../../store/useStore';
import './CropEconomics.css';

const CORN_PRICE = 4.50;
const SOY_PRICE = 11.50;
const CORN_COST = 400;
const SOY_COST = 300;

export default function CropEconomics() {
  const stateYields = useStore(s => s.stateYields);
  const [search, setSearch] = useState('');

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

    return states.sort((a, b) => b.cornProfit - a.cornProfit);
  }, [stateYields]);

  // Filter by search
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
              <span className="econ-row-label">Price</span>
              <span className="econ-row-value">${CORN_PRICE.toFixed(2)} <small>/bushel</small></span>
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
              <span className="econ-row-label">Price</span>
              <span className="econ-row-value">${SOY_PRICE.toFixed(2)} <small>/bushel</small></span>
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
        but soybeans sell at ${SOY_PRICE}/bu (2.5x corn's ${CORN_PRICE}/bu) and cost ~$100/acre less to grow.
        The result: soybeans are more profitable in {natAvg.soyAdvantageStates} of {comparisonData.length} states.
      </div>

      {/* Search + chart */}
      <div className="econ-chart-header">
        <h4 className="econ-chart-title">Profit per Acre by State (2020-2024 avg)</h4>
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
        <strong>Sources:</strong> Prices from USDA NASS Marketing Year Averages (2020-2024).
        Operating costs from USDA ERS Commodity Costs &amp; Returns (2023).
        Operating costs include seed, fertilizer, chemicals, fuel, and machinery — they exclude
        land rent (~$150-250/acre) and labor, which apply equally to both crops.
      </div>
    </div>
  );
}
