// Yield color scale: low (red) → mid (amber) → high (green)
export function yieldColorScale(value, min = 30, max = 250) {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  if (t < 0.5) {
    const r = 239 + (245 - 239) * (t * 2);
    const g = 68 + (158 - 68) * (t * 2);
    const b = 68 + (11 - 68) * (t * 2);
    return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
  } else {
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
    const intensity = Math.abs(t) / 3;
    return `rgb(${Math.round(239 * intensity + 40)}, ${Math.round(40 + 28 * (1 - intensity))}, ${Math.round(40 + 28 * (1 - intensity))})`;
  } else {
    const intensity = t / 3;
    return `rgb(${Math.round(40 + 99 * intensity)}, ${Math.round(40 + 52 * intensity)}, ${Math.round(40 + 206 * intensity)})`;
  }
}

// Three.js color for states based on yield — same bright colors for both themes
export function stateColor(avgYield, hasData, theme = 'light') {
  if (!hasData) return theme === 'light' ? '#d4d4d4' : '#2a2a2a';
  const t = Math.max(0, Math.min(1, (avgYield - 30) / 220));
  // Earthy tones: light tan → forest green (same for both themes)
  const r = Math.round(180 - t * 120);
  const g = Math.round(160 + t * 60);
  const b = Math.round(100 - t * 50);
  return `rgb(${r},${g},${b})`;
}

// Month names
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Crop colors
export const CROP_COLORS = {
  corn: '#d97706',
  soybeans: '#16a34a',
};
