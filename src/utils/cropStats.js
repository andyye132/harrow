/**
 * Growing statistics for crops — sourced from USDA/extension service data.
 * Units: temperature in F, rainfall in inches.
 */
export const CROP_GROWING_STATS = {
  corn: {
    name: 'Corn',
    emoji: '🌽',
    stats: [
      { label: 'Day Temperature', value: '75-86°F (24-30°C)', note: null },
      { label: 'Night Temperature', value: '60-65°F', note: 'yield loss begins >70°F' },
      { label: 'Relative Humidity', value: '50-60% RH', note: 'critical during tasseling/silking' },
      { label: 'Seasonal Rainfall', value: '20-30 inches', note: 'per growing season' },
      { label: 'Frost-Free Period', value: '120-140 consecutive days', note: null },
    ],
    topStates: ['Iowa', 'Illinois', 'Nebraska', 'Minnesota', 'Indiana'],
    plantingMonths: 'April - May',
    harvestMonths: 'September - November',
    unit: 'bushels per acre (bu/acre)',
  },
  soybeans: {
    name: 'Soybeans',
    emoji: '🫘',
    stats: [
      { label: 'Day Temperature', value: '75-86°F (21-29°C)', note: null },
      { label: 'Night Temperature', value: '60-65°F', note: 'yield loss begins >70°F' },
      { label: 'Relative Humidity', value: '50-60% RH', note: 'critical during pod fill' },
      { label: 'Seasonal Rainfall', value: '20-30 inches', note: 'per growing season' },
      { label: 'Frost-Free Period', value: '120-140 consecutive days', note: null },
    ],
    topStates: ['Illinois', 'Iowa', 'Minnesota', 'Nebraska', 'Indiana'],
    plantingMonths: 'May - June',
    harvestMonths: 'September - October',
    unit: 'bushels per acre (bu/acre)',
  },
};

/**
 * Format yield trend with proper units.
 * Example: "+1.35 bu/acre per year"
 */
export function formatTrend(trend) {
  const sign = trend >= 0 ? '+' : '';
  return `${sign}${trend} bu/acre per year`;
}

/**
 * Format yield value with units.
 */
export function formatYield(value) {
  return `${value} bu/acre`;
}
