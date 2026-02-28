import { scaleSequential, scaleLinear } from 'd3-scale';

// Yield color scale: low (red) → mid (amber) → high (green)
export function yieldColorScale(value, min = 30, max = 250) {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  if (t < 0.5) {
    // Red to amber
    const r = 239 + (245 - 239) * (t * 2);
    const g = 68 + (158 - 68) * (t * 2);
    const b = 68 + (11 - 68) * (t * 2);
    return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
  } else {
    // Amber to green
    const t2 = (t - 0.5) * 2;
    const r = 245 + (34 - 245) * t2;
    const g = 158 + (197 - 158) * t2;
    const b = 11 + (94 - 11) * t2;
    return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
  }
}

// Anomaly color scale: blue (high yield) ↔ red (low yield)
export function anomalyColorScale(zScore) {
  const t = Math.max(-3, Math.min(3, zScore));
  if (t < 0) {
    // Red for low yield anomaly
    const intensity = Math.abs(t) / 3;
    return `rgb(${Math.round(239 * intensity + 40)}, ${Math.round(40 + 28 * (1 - intensity))}, ${Math.round(40 + 28 * (1 - intensity))})`;
  } else {
    // Blue/violet for high yield anomaly
    const intensity = t / 3;
    return `rgb(${Math.round(40 + 99 * intensity)}, ${Math.round(40 + 52 * intensity)}, ${Math.round(40 + 206 * intensity)})`;
  }
}

// Three.js color for states based on yield
export function stateColor(avgYield, hasData) {
  if (!hasData) return '#1e1e1e';
  const t = Math.max(0, Math.min(1, (avgYield - 30) / 220));
  // Dark green to bright green
  const r = Math.round(20 + t * 40);
  const g = Math.round(60 + t * 140);
  const b = Math.round(30 + t * 50);
  return `rgb(${r},${g},${b})`;
}

// Month names
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Crop colors
export const CROP_COLORS = {
  corn: '#f59e0b',
  soybeans: '#22c55e',
};
