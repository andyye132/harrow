import * as THREE from 'three';
import { geoAlbersUsa } from 'd3-geo';

const projection = geoAlbersUsa().scale(1300).translate([487.5, 305]);

// FIPS code to state abbreviation mapping
export const FIPS_TO_ABBR = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA',
  '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL',
  '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN',
  '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME',
  '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS',
  '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND',
  '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
  '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
  '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI',
  '56': 'WY',
};

export const ABBR_TO_FIPS = Object.fromEntries(
  Object.entries(FIPS_TO_ABBR).map(([k, v]) => [v, k])
);

export const STATE_NAMES = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
  'DC': 'District of Columbia', 'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii',
  'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine',
  'MD': 'Maryland', 'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota',
  'MS': 'Mississippi', 'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska',
  'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico',
  'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island',
  'SC': 'South Carolina', 'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas',
  'UT': 'Utah', 'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington',
  'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
};

/**
 * Convert a GeoJSON feature to an array of THREE.Shape objects.
 */
export function geoFeatureToShapes(feature) {
  const shapes = [];
  const coordinates = feature.geometry.type === 'MultiPolygon'
    ? feature.geometry.coordinates
    : [feature.geometry.coordinates];

  for (const polygon of coordinates) {
    const outerRing = polygon[0];
    const projected = outerRing
      .map(coord => projection(coord))
      .filter(p => p != null);

    if (projected.length < 3) continue;

    const shape = new THREE.Shape();
    projected.forEach((p, i) => {
      const x = (p[0] - 487.5) * 0.01;
      const y = -(p[1] - 305) * 0.01;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });

    // Handle holes
    for (let h = 1; h < polygon.length; h++) {
      const holeProjected = polygon[h]
        .map(coord => projection(coord))
        .filter(p => p != null);
      if (holeProjected.length < 3) continue;

      const holePath = new THREE.Path();
      holeProjected.forEach((p, i) => {
        const x = (p[0] - 487.5) * 0.01;
        const y = -(p[1] - 305) * 0.01;
        if (i === 0) holePath.moveTo(x, y);
        else holePath.lineTo(x, y);
      });
      shape.holes.push(holePath);
    }

    shapes.push(shape);
  }
  return shapes;
}

/**
 * Get the centroid of a state feature in Three.js coordinates.
 */
export function getStateCentroid(feature) {
  const coords = feature.geometry.type === 'MultiPolygon'
    ? feature.geometry.coordinates[0][0]
    : feature.geometry.coordinates[0];

  let sumX = 0, sumY = 0, count = 0;
  for (const coord of coords) {
    const p = projection(coord);
    if (p) {
      sumX += (p[0] - 487.5) * 0.01;
      sumY += -(p[1] - 305) * 0.01;
      count++;
    }
  }
  return [sumX / count, sumY / count];
}
