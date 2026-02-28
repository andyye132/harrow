#!/usr/bin/env python3
"""
Process GHCN-Daily weather data into county-level seasonal aggregates.
Maps stations to counties, then aggregates daily weather to growing-season metrics.
"""

import pandas as pd
import numpy as np
import json
import os
import glob

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'Data')
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')
os.makedirs(OUT_DIR, exist_ok=True)

# States we care about (from yield data)
TARGET_STATES = {
    'AL', 'AR', 'CO', 'DE', 'IA', 'IL', 'IN', 'KS', 'KY', 'LA',
    'MD', 'MI', 'MN', 'MO', 'MS', 'NC', 'ND', 'NE', 'NJ', 'NY',
    'OH', 'OK', 'PA', 'SC', 'SD', 'TN', 'TX', 'VA', 'VT', 'WI',
    'WV', 'WY'
}

# State FIPS mapping
STATE_ABBR_TO_FIPS = {
    'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06',
    'CO': '08', 'CT': '09', 'DE': '10', 'FL': '12', 'GA': '13',
    'HI': '15', 'ID': '16', 'IL': '17', 'IN': '18', 'IA': '19',
    'KS': '20', 'KY': '21', 'LA': '22', 'ME': '23', 'MD': '24',
    'MA': '25', 'MI': '26', 'MN': '27', 'MS': '28', 'MO': '29',
    'MT': '30', 'NE': '31', 'NV': '32', 'NH': '33', 'NJ': '34',
    'NM': '35', 'NY': '36', 'NC': '37', 'ND': '38', 'OH': '39',
    'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44', 'SC': '45',
    'SD': '46', 'TN': '47', 'TX': '48', 'UT': '49', 'VT': '50',
    'VA': '51', 'WA': '53', 'WV': '54', 'WI': '55', 'WY': '56',
}

# ============================================================
# 1. Parse station metadata and filter to US stations
# ============================================================
print("Loading station metadata...")
stations_file = os.path.join(DATA_DIR, 'ghcnd-stations.txt')

# Fixed-width format: ID(0:11), LAT(12:20), LON(21:30), ELEV(31:37), STATE(38:40), NAME(41:71)
stations = []
with open(stations_file, 'r') as f:
    for line in f:
        station_id = line[0:11].strip()
        # Only US stations (start with 'US')
        if not station_id.startswith('US'):
            continue
        lat = float(line[12:20].strip())
        lon = float(line[21:30].strip())
        state = line[38:40].strip()
        name = line[41:71].strip()
        if state in TARGET_STATES:
            stations.append({
                'station_id': station_id,
                'lat': lat,
                'lon': lon,
                'state': state,
                'name': name,
            })

stations_df = pd.DataFrame(stations)
print(f"Found {len(stations_df)} US stations in target states")

# For simplicity, we map stations to states (not counties) since county-level
# FIPS mapping would require a shapefile spatial join. State-level is sufficient
# for our analysis since yield data aggregates to state level anyway.
stations_df['state_fips'] = stations_df['state'].map(STATE_ABBR_TO_FIPS)

# Create station lookup set for fast filtering
station_set = set(stations_df['station_id'].values)
station_state_map = dict(zip(stations_df['station_id'], stations_df['state']))

# ============================================================
# 2. Process yearly GHCN files
# ============================================================
print("\nProcessing GHCN daily files...")

# GHCN daily CSV columns: STATION, DATE, ELEMENT, DATA_VALUE, M_FLAG, Q_FLAG, S_FLAG, OBS_TIME
# DATA_VALUE units: PRCP in tenths of mm, TMAX/TMIN in tenths of degrees C

ELEMENTS = {'PRCP', 'TMAX', 'TMIN'}

all_records = []
ghcn_dir = os.path.join(DATA_DIR, 'ghcn_by_year')

for year in range(2010, 2025):
    filepath = os.path.join(ghcn_dir, f'{year}.csv')
    if not os.path.exists(filepath):
        print(f"  Skipping {year} - file not found")
        continue

    print(f"  Processing {year}...", end='', flush=True)

    # Read in chunks to manage memory
    chunks = pd.read_csv(
        filepath,
        header=None,
        names=['station', 'date', 'element', 'value', 'm_flag', 'q_flag', 's_flag', 'obs_time'],
        dtype={'station': str, 'date': str, 'element': str, 'value': float},
        usecols=['station', 'date', 'element', 'value', 'q_flag'],
        chunksize=2_000_000,
    )

    year_records = []
    rows_processed = 0

    for chunk in chunks:
        rows_processed += len(chunk)
        # Filter to our stations and elements
        mask = (
            chunk['station'].isin(station_set) &
            chunk['element'].isin(ELEMENTS) &
            (chunk['q_flag'].isna() | (chunk['q_flag'] == ''))  # quality check passed
        )
        filtered = chunk[mask].copy()

        if len(filtered) > 0:
            filtered['state'] = filtered['station'].map(station_state_map)
            filtered['date'] = pd.to_datetime(filtered['date'], format='%Y%m%d')
            filtered['month'] = filtered['date'].dt.month
            year_records.append(filtered[['station', 'state', 'date', 'month', 'element', 'value']])

    if year_records:
        year_df = pd.concat(year_records, ignore_index=True)
        all_records.append(year_df)
        print(f" {len(year_df):,} records from {rows_processed:,} rows")
    else:
        print(f" no matching records")

if not all_records:
    print("No weather data found! Exiting.")
    exit(1)

weather_df = pd.concat(all_records, ignore_index=True)
print(f"\nTotal weather records: {len(weather_df):,}")

# ============================================================
# 3. Pivot elements to columns and convert units
# ============================================================
print("\nPivoting and converting units...")

# Pivot: one row per (station, state, date) with PRCP, TMAX, TMIN columns
pivoted = weather_df.pivot_table(
    index=['station', 'state', 'date', 'month'],
    columns='element',
    values='value',
    aggfunc='mean'  # handle rare duplicates
).reset_index()

# Convert units
if 'PRCP' in pivoted.columns:
    pivoted['PRCP'] = pivoted['PRCP'] / 10.0  # tenths of mm → mm
if 'TMAX' in pivoted.columns:
    pivoted['TMAX'] = pivoted['TMAX'] / 10.0  # tenths of °C → °C
if 'TMIN' in pivoted.columns:
    pivoted['TMIN'] = pivoted['TMIN'] / 10.0

pivoted['year'] = pivoted['date'].dt.year

print(f"Pivoted: {len(pivoted):,} daily station records")

# ============================================================
# 4. Aggregate to state-level growing season metrics
# ============================================================
print("\nComputing state-level growing season metrics...")

# Growing season: April (4) through September (9)
growing = pivoted[(pivoted['month'] >= 4) & (pivoted['month'] <= 9)].copy()

# Summer months for heat stress: June (6) through August (8)
summer = pivoted[(pivoted['month'] >= 6) & (pivoted['month'] <= 8)].copy()

state_year_metrics = []

for (state, year), group in growing.groupby(['state', 'year']):
    metrics = {
        'state': state,
        'state_fips': STATE_ABBR_TO_FIPS.get(state, ''),
        'year': int(year),
    }

    # Average temperature during growing season
    if 'TMAX' in group.columns and 'TMIN' in group.columns:
        tmax_vals = group['TMAX'].dropna()
        tmin_vals = group['TMIN'].dropna()
        if len(tmax_vals) > 0 and len(tmin_vals) > 0:
            metrics['growing_season_avg_temp'] = round(((tmax_vals.mean() + tmin_vals.mean()) / 2), 1)
            metrics['growing_season_max_temp'] = round(tmax_vals.max(), 1)
            metrics['growing_season_min_temp'] = round(tmin_vals.min(), 1)

    # Total precipitation during growing season (state average)
    if 'PRCP' in group.columns:
        # Sum per station, then average across stations
        station_precip = group.groupby('station')['PRCP'].sum()
        metrics['growing_season_precip_mm'] = round(station_precip.mean(), 1)
        metrics['growing_season_precip_std'] = round(station_precip.std(), 1) if len(station_precip) > 1 else 0

    # Heat stress days: days with TMAX > 35°C (95°F)
    if 'TMAX' in group.columns:
        summer_group = summer[(summer['state'] == state) & (summer['year'] == year)]
        if len(summer_group) > 0:
            heat_days = summer_group.groupby('station')['TMAX'].apply(lambda x: (x > 35).sum())
            metrics['heat_stress_days'] = round(heat_days.mean(), 1)

    # Drought proxy: longest dry spell (consecutive days with PRCP < 1mm) per station average
    if 'PRCP' in group.columns:
        dry_spells = []
        for station, sgroup in group.groupby('station'):
            prcp = sgroup.sort_values('date')['PRCP'].values
            max_spell = 0
            current = 0
            for p in prcp:
                if p < 1.0:
                    current += 1
                    max_spell = max(max_spell, current)
                else:
                    current = 0
            dry_spells.append(max_spell)
        metrics['max_dry_spell_days'] = round(np.mean(dry_spells), 1) if dry_spells else 0

    # Heavy rain events: days with PRCP > 50mm
    if 'PRCP' in group.columns:
        heavy_rain = group.groupby('station')['PRCP'].apply(lambda x: (x > 50).sum())
        metrics['heavy_rain_days'] = round(heavy_rain.mean(), 1)

    state_year_metrics.append(metrics)

weather_features_df = pd.DataFrame(state_year_metrics)
print(f"Generated {len(weather_features_df)} state-year weather records")

# ============================================================
# 5. Monthly normals per state (for month selector on map)
# ============================================================
print("\nComputing monthly normals...")

monthly_normals = {}
for (state, month), group in pivoted.groupby(['state', 'month']):
    normals = {}
    if 'TMAX' in group.columns:
        normals['avg_high'] = round(group['TMAX'].mean(), 1)
    if 'TMIN' in group.columns:
        normals['avg_low'] = round(group['TMIN'].mean(), 1)
    if 'PRCP' in group.columns:
        # Average daily precip × ~30 for monthly total
        normals['avg_precip_mm'] = round(group['PRCP'].mean() * 30, 1)
    if 'TMAX' in group.columns and 'TMIN' in group.columns:
        normals['avg_temp'] = round((group['TMAX'].mean() + group['TMIN'].mean()) / 2, 1)

    if state not in monthly_normals:
        monthly_normals[state] = {}
    monthly_normals[state][int(month)] = normals

# ============================================================
# 6. Export JSON files
# ============================================================
print("\nExporting JSON files...")

# Weather features (state-year level)
with open(os.path.join(OUT_DIR, 'weather_features.json'), 'w') as f:
    json.dump(weather_features_df.to_dict(orient='records'), f)
print(f"  weather_features.json: {len(weather_features_df)} records")

# Monthly normals
with open(os.path.join(OUT_DIR, 'monthly_normals.json'), 'w') as f:
    json.dump(monthly_normals, f)
print(f"  monthly_normals.json: {len(monthly_normals)} states")

# State-year data as nested dict for easy frontend lookup
weather_by_state = {}
for _, row in weather_features_df.iterrows():
    state = row['state']
    if state not in weather_by_state:
        weather_by_state[state] = []
    weather_by_state[state].append({k: v for k, v in row.items() if k not in ['state', 'state_fips'] and pd.notna(v)})

with open(os.path.join(OUT_DIR, 'weather_by_state.json'), 'w') as f:
    json.dump(weather_by_state, f)
print(f"  weather_by_state.json: {len(weather_by_state)} states")

print("\nWeather processing complete!")
