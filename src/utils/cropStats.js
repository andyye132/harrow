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
    // Growing requirements in metric for comparison with weather data
    idealTempC: { min: 24, max: 30 },
    nightTempMaxC: 21, // ~70°F
    topStates: ['Iowa', 'Illinois', 'Nebraska', 'Minnesota', 'Indiana'],
    plantingMonths: 'April - May',
    harvestMonths: 'September - November',
    // Growing season months (0-indexed)
    growingSeasonStart: 3, // April
    growingSeasonEnd: 8,   // September
    harvestStart: 8,       // September
    harvestEnd: 10,        // November
    unit: 'bushels per acre (bu/acre)',
    pricePerBushel: 4.50,  // approx 2024 avg
    costPerAcre: 400,      // typical production cost
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
    idealTempC: { min: 21, max: 29 },
    nightTempMaxC: 21,
    topStates: ['Illinois', 'Iowa', 'Minnesota', 'Nebraska', 'Indiana'],
    plantingMonths: 'May - June',
    harvestMonths: 'September - October',
    growingSeasonStart: 4, // May
    growingSeasonEnd: 8,   // September
    harvestStart: 8,       // September
    harvestEnd: 9,         // October
    unit: 'bushels per acre (bu/acre)',
    pricePerBushel: 11.50, // approx 2024 avg
    costPerAcre: 300,      // typical production cost
  },
};

/**
 * Convert Celsius to Fahrenheit
 */
export function cToF(c) {
  return Math.round(c * 9 / 5 + 32);
}

/**
 * Format yield trend with proper units.
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

/**
 * Determine if a month is in a crop's growing/harvest season.
 * month is 0-indexed.
 */
export function getSeasonStatus(crop, month) {
  const stats = CROP_GROWING_STATS[crop];
  if (!stats) return 'dormant';
  if (month >= stats.harvestStart && month <= stats.harvestEnd) return 'harvest';
  if (month >= stats.growingSeasonStart && month <= stats.growingSeasonEnd) return 'growing';
  return 'dormant';
}
