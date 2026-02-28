#!/usr/bin/env python3
"""Process RMA county yield data into JSON files for the frontend."""

import pandas as pd
import numpy as np
import json
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'Data')
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')
os.makedirs(OUT_DIR, exist_ok=True)

# Load yield data
df = pd.read_csv(
    os.path.join(DATA_DIR, 'RMACountyYieldsReport-399.csv'),
    skipinitialspace=True
)

# Clean column names
df.columns = df.columns.str.strip()

# Build FIPS codes
df['State Code'] = df['State Code'].astype(str).str.zfill(2)
df['County Code'] = df['County Code'].astype(str).str.zfill(3)
df['FIPS'] = df['State Code'] + df['County Code']

# Normalize commodity names
df['Commodity Name'] = df['Commodity Name'].str.strip().str.lower()

# ============================================================
# 1. State Yields (per state, per crop, per year)
# ============================================================
state_yields = (
    df.groupby(['State Abbreviation', 'State Name', 'Commodity Name', 'Yield Year'])
    ['Yield Amount'].agg(['mean', 'std', 'min', 'max', 'count'])
    .reset_index()
)
state_yields.columns = ['state_abbr', 'state_name', 'crop', 'year', 'avg_yield', 'std_yield', 'min_yield', 'max_yield', 'county_count']
state_yields = state_yields.round(2)

# Convert to nested dict: { state_abbr: { crop: [ {year, avg_yield, ...} ] } }
state_yields_dict = {}
for _, row in state_yields.iterrows():
    abbr = row['state_abbr']
    crop = row['crop']
    if abbr not in state_yields_dict:
        state_yields_dict[abbr] = {'state_name': row['state_name'], 'crops': {}}
    if crop not in state_yields_dict[abbr]['crops']:
        state_yields_dict[abbr]['crops'][crop] = []
    state_yields_dict[abbr]['crops'][crop].append({
        'year': int(row['year']),
        'avg_yield': row['avg_yield'],
        'std_yield': row['std_yield'] if not np.isnan(row['std_yield']) else 0,
        'min_yield': row['min_yield'],
        'max_yield': row['max_yield'],
        'county_count': int(row['county_count'])
    })

with open(os.path.join(OUT_DIR, 'state_yields.json'), 'w') as f:
    json.dump(state_yields_dict, f)

print(f"state_yields.json: {len(state_yields_dict)} states")

# ============================================================
# 2. County Yields (per county, per crop, time series)
# ============================================================
county_yields_dict = {}
for (fips, crop), group in df.groupby(['FIPS', 'Commodity Name']):
    if fips not in county_yields_dict:
        row = group.iloc[0]
        county_yields_dict[fips] = {
            'state_abbr': row['State Abbreviation'],
            'state_name': row['State Name'].strip(),
            'county_name': row['County Name'].strip(),
            'crops': {}
        }
    series = group[['Yield Year', 'Yield Amount']].sort_values('Yield Year')
    county_yields_dict[fips]['crops'][crop] = [
        {'year': int(r['Yield Year']), 'yield': round(r['Yield Amount'], 2)}
        for _, r in series.iterrows()
    ]

with open(os.path.join(OUT_DIR, 'county_yields.json'), 'w') as f:
    json.dump(county_yields_dict, f)

print(f"county_yields.json: {len(county_yields_dict)} counties")

# ============================================================
# 3. Yield Anomalies (z-score per county-year)
# ============================================================
anomalies = []
for (fips, crop), group in df.groupby(['FIPS', 'Commodity Name']):
    mean_yield = group['Yield Amount'].mean()
    std_yield = group['Yield Amount'].std()
    if std_yield == 0 or np.isnan(std_yield):
        continue
    for _, row in group.iterrows():
        z = (row['Yield Amount'] - mean_yield) / std_yield
        if abs(z) > 1.5:  # flag notable anomalies
            anomalies.append({
                'fips': fips,
                'state_abbr': row['State Abbreviation'],
                'county': row['County Name'].strip(),
                'crop': crop,
                'year': int(row['Yield Year']),
                'yield': round(row['Yield Amount'], 2),
                'mean_yield': round(mean_yield, 2),
                'z_score': round(z, 2),
                'type': 'high' if z > 0 else 'low'
            })

# Sort by absolute z-score descending
anomalies.sort(key=lambda x: abs(x['z_score']), reverse=True)

with open(os.path.join(OUT_DIR, 'yield_anomalies.json'), 'w') as f:
    json.dump(anomalies, f)

print(f"yield_anomalies.json: {len(anomalies)} anomalies flagged")

# ============================================================
# 4. State Summaries (for tooltips and helper)
# ============================================================
state_summaries = {}
for abbr, state_data in state_yields_dict.items():
    summary = {
        'state_name': state_data['state_name'],
        'crops': {}
    }
    best_crop = None
    best_yield = 0

    for crop, years in state_data['crops'].items():
        yields = [y['avg_yield'] for y in years]
        recent = [y['avg_yield'] for y in years if y['year'] >= 2020]
        trend = np.polyfit([y['year'] for y in years], yields, 1)[0] if len(years) > 2 else 0

        crop_summary = {
            'avg_yield': round(np.mean(yields), 1),
            'recent_avg': round(np.mean(recent), 1) if recent else round(np.mean(yields), 1),
            'best_year': years[np.argmax(yields)]['year'],
            'worst_year': years[np.argmin(yields)]['year'],
            'best_yield': round(max(yields), 1),
            'worst_yield': round(min(yields), 1),
            'trend_per_year': round(trend, 2),
            'variability': round(np.std(yields), 1)
        }
        summary['crops'][crop] = crop_summary

        if np.mean(yields) > best_yield:
            best_yield = np.mean(yields)
            best_crop = crop

    summary['best_crop'] = best_crop
    # Determine worst crop
    worst_crop = min(summary['crops'].keys(),
                     key=lambda c: summary['crops'][c]['avg_yield'])
    summary['worst_crop'] = worst_crop

    state_summaries[abbr] = summary

with open(os.path.join(OUT_DIR, 'state_summaries.json'), 'w') as f:
    json.dump(state_summaries, f)

print(f"state_summaries.json: {len(state_summaries)} states")

# ============================================================
# 5. Planting Guide (for plant helper context)
# ============================================================
planting_guide = {}
for abbr, state_data in state_yields_dict.items():
    planting_guide[abbr] = {
        'state_name': state_data['state_name'],
        'crops': {}
    }
    for crop, years in state_data['crops'].items():
        yields = [y['avg_yield'] for y in years]
        planting_guide[abbr]['crops'][crop] = {
            'historical_avg': round(np.mean(yields), 1),
            'historical_std': round(np.std(yields), 1),
            'trend': round(np.polyfit([y['year'] for y in years], yields, 1)[0], 2) if len(years) > 2 else 0,
            'best_recent_years': sorted(
                [y for y in years if y['year'] >= 2018],
                key=lambda y: y['avg_yield'], reverse=True
            )[:3],
            'worst_recent_years': sorted(
                [y for y in years if y['year'] >= 2018],
                key=lambda y: y['avg_yield']
            )[:3],
            'year_data': years
        }

with open(os.path.join(OUT_DIR, 'planting_guide.json'), 'w') as f:
    json.dump(planting_guide, f)

print(f"planting_guide.json: {len(planting_guide)} states")

# ============================================================
# 6. Extreme Events Summary
# ============================================================
# Known extreme weather years for US agriculture
extreme_years = {
    2012: 'Midwest Drought',
    2019: 'Midwest Flooding',
    2021: 'Western Drought / Heat Dome',
    2022: 'Southern Plains Drought',
}

extreme_events = []
for year, event_name in extreme_years.items():
    year_data = df[df['Yield Year'] == year]
    all_data = df.copy()

    for crop in df['Commodity Name'].unique():
        crop_year = year_data[year_data['Commodity Name'] == crop]
        crop_all = all_data[all_data['Commodity Name'] == crop]

        if len(crop_year) == 0:
            continue

        # Compare this year's avg to overall avg
        year_avg = crop_year['Yield Amount'].mean()
        overall_avg = crop_all.groupby('Yield Year')['Yield Amount'].mean().mean()
        deviation_pct = ((year_avg - overall_avg) / overall_avg) * 100

        # Find most affected states
        state_impacts = []
        for state, state_group in crop_year.groupby('State Abbreviation'):
            state_all = crop_all[crop_all['State Abbreviation'] == state]
            state_avg = state_all['Yield Amount'].mean()
            state_year_avg = state_group['Yield Amount'].mean()
            state_dev = ((state_year_avg - state_avg) / state_avg) * 100 if state_avg > 0 else 0
            state_impacts.append({
                'state': state,
                'deviation_pct': round(state_dev, 1),
                'yield': round(state_year_avg, 1)
            })

        state_impacts.sort(key=lambda x: x['deviation_pct'])

        extreme_events.append({
            'year': year,
            'event': event_name,
            'crop': crop,
            'avg_yield': round(year_avg, 1),
            'overall_avg': round(overall_avg, 1),
            'deviation_pct': round(deviation_pct, 1),
            'most_affected': state_impacts[:5],
            'least_affected': state_impacts[-3:]
        })

with open(os.path.join(OUT_DIR, 'extreme_events.json'), 'w') as f:
    json.dump(extreme_events, f)

print(f"extreme_events.json: {len(extreme_events)} event-crop combos")
print("\nDone! All JSON files written to public/data/")
