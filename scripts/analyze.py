#!/usr/bin/env python3
"""
Analyze weather-yield correlations, build prediction model, detect anomalies.
Requires: process_yields.py and process_weather.py to have been run first.
"""

import pandas as pd
import numpy as np
import json
import os
from scipy import stats
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')

# ============================================================
# 1. Load processed data
# ============================================================
print("Loading processed data...")

with open(os.path.join(DATA_DIR, 'state_yields.json')) as f:
    state_yields = json.load(f)

weather_file = os.path.join(DATA_DIR, 'weather_features.json')
if not os.path.exists(weather_file):
    print("ERROR: weather_features.json not found. Run process_weather.py first.")
    exit(1)

with open(weather_file) as f:
    weather_features = json.load(f)

weather_df = pd.DataFrame(weather_features)

# STATE_ABBR_TO_FIPS for mapping
STATE_FIPS_TO_ABBR = {
    '01': 'AL', '05': 'AR', '08': 'CO', '10': 'DE', '17': 'IL',
    '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA',
    '24': 'MD', '26': 'MI', '27': 'MN', '28': 'MS', '29': 'MO',
    '31': 'NE', '34': 'NJ', '36': 'NY', '37': 'NC', '38': 'ND',
    '39': 'OH', '40': 'OK', '42': 'PA', '45': 'SC', '46': 'SD',
    '47': 'TN', '48': 'TX', '50': 'VT', '51': 'VA', '54': 'WV',
    '55': 'WI', '56': 'WY',
}

# Build yield dataframe
yield_records = []
for abbr, data in state_yields.items():
    for crop, years in data['crops'].items():
        for year_data in years:
            yield_records.append({
                'state': abbr,
                'crop': crop,
                'year': year_data['year'],
                'avg_yield': year_data['avg_yield'],
            })

yield_df = pd.DataFrame(yield_records)

# ============================================================
# 2. Join weather and yield data
# ============================================================
print("Joining weather and yield data...")

merged = yield_df.merge(weather_df, on=['state', 'year'], how='inner')
print(f"Merged records: {len(merged)}")

WEATHER_COLS = [
    'growing_season_avg_temp', 'growing_season_max_temp',
    'growing_season_precip_mm', 'heat_stress_days',
    'max_dry_spell_days', 'heavy_rain_days'
]

# Filter to columns that exist
available_cols = [c for c in WEATHER_COLS if c in merged.columns]
print(f"Available weather features: {available_cols}")

# ============================================================
# 3. Correlation analysis
# ============================================================
print("\nRunning correlation analysis...")

correlations = {}
for crop in ['corn', 'soybeans']:
    crop_data = merged[merged['crop'] == crop].dropna(subset=available_cols + ['avg_yield'])
    crop_corr = {}
    for col in available_cols:
        r, p = stats.pearsonr(crop_data[col], crop_data['avg_yield'])
        crop_corr[col] = {
            'r': round(r, 3),
            'p_value': round(p, 4),
            'significant': p < 0.05,
            'direction': 'positive' if r > 0 else 'negative',
            'strength': 'strong' if abs(r) > 0.5 else 'moderate' if abs(r) > 0.3 else 'weak',
        }
    correlations[crop] = crop_corr

with open(os.path.join(DATA_DIR, 'correlations.json'), 'w') as f:
    json.dump(correlations, f, indent=2)
print("  correlations.json written")

# Print summary
for crop, corrs in correlations.items():
    print(f"\n  {crop}:")
    for feat, data in sorted(corrs.items(), key=lambda x: abs(x[1]['r']), reverse=True):
        sig = '*' if data['significant'] else ' '
        print(f"    {feat:35s} r={data['r']:+.3f} {sig} ({data['strength']})")

# ============================================================
# 4. Feature importance via Random Forest
# ============================================================
print("\nTraining Random Forest models...")

feature_importance = {}
model_predictions = {}

for crop in ['corn', 'soybeans']:
    crop_data = merged[merged['crop'] == crop].dropna(subset=available_cols + ['avg_yield'])

    if len(crop_data) < 20:
        print(f"  Skipping {crop} - not enough data ({len(crop_data)} rows)")
        continue

    X = crop_data[available_cols].values
    y = crop_data['avg_yield'].values
    states = crop_data['state'].values
    years = crop_data['year'].values

    # Train/test split: train on 2010-2022, test on 2023-2024
    train_mask = crop_data['year'] <= 2022
    test_mask = crop_data['year'] >= 2023

    X_train, X_test = X[train_mask], X[test_mask]
    y_train, y_test = y[train_mask], y[test_mask]

    if len(X_test) == 0 or len(X_train) < 10:
        # Fallback to random split
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        train_states = states
        test_states = states[len(X_train):]
        train_years = years
        test_years = years[len(X_train):]
    else:
        test_states = states[test_mask]
        test_years = years[test_mask]

    rf = RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)

    y_pred = rf.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)

    print(f"\n  {crop}: R²={r2:.3f}, MAE={mae:.1f} bu/acre")

    # Feature importances
    importances = dict(zip(available_cols, rf.feature_importances_.round(3).tolist()))
    feature_importance[crop] = {
        'importances': importances,
        'r2': round(r2, 3),
        'mae': round(mae, 1),
        'n_train': int(len(X_train)),
        'n_test': int(len(X_test)),
    }

    print(f"  Feature importances:")
    for feat, imp in sorted(importances.items(), key=lambda x: x[1], reverse=True):
        print(f"    {feat:35s} {imp:.3f}")

    # Predictions for visualization
    all_pred = rf.predict(X)
    residuals = y - all_pred

    preds = []
    for i in range(len(crop_data)):
        row = crop_data.iloc[i]
        preds.append({
            'state': row['state'],
            'year': int(row['year']),
            'actual': round(float(y[i]), 1),
            'predicted': round(float(all_pred[i]), 1),
            'residual': round(float(residuals[i]), 1),
            'is_anomaly': abs(residuals[i]) > 2 * residuals.std(),
        })
    model_predictions[crop] = preds

with open(os.path.join(DATA_DIR, 'feature_importance.json'), 'w') as f:
    json.dump(feature_importance, f, indent=2)
print("\n  feature_importance.json written")

with open(os.path.join(DATA_DIR, 'model_predictions.json'), 'w') as f:
    json.dump(model_predictions, f)
print("  model_predictions.json written")

# ============================================================
# 5. Weather-adjusted anomalies
# ============================================================
print("\nIdentifying weather-adjusted anomalies...")

weather_anomalies = []
for crop, preds in model_predictions.items():
    residuals = [p['residual'] for p in preds]
    std = np.std(residuals)
    for p in preds:
        if abs(p['residual']) > 1.5 * std:
            weather_anomalies.append({
                'crop': crop,
                'state': p['state'],
                'year': p['year'],
                'actual': p['actual'],
                'predicted': p['predicted'],
                'residual': p['residual'],
                'type': 'overperformed' if p['residual'] > 0 else 'underperformed',
                'description': f"{p['state']} {crop} in {p['year']}: yielded {p['actual']} bu/acre vs {p['predicted']} predicted ({p['residual']:+.1f} deviation)"
            })

weather_anomalies.sort(key=lambda x: abs(x['residual']), reverse=True)

with open(os.path.join(DATA_DIR, 'weather_anomalies.json'), 'w') as f:
    json.dump(weather_anomalies, f, indent=2)
print(f"  weather_anomalies.json: {len(weather_anomalies)} anomalies")

print("\nAnalysis complete!")
