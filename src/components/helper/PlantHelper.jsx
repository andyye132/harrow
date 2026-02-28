import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../../store/useStore';
import { FIPS_TO_ABBR, STATE_NAMES, ABBR_TO_FIPS } from '../../utils/geoToShape';
import './PlantHelper.css';

const ALL_STATES = Object.entries(STATE_NAMES).sort((a, b) => a[1].localeCompare(b[1]));
const CROPS = ['corn', 'soybeans'];

export default function PlantHelper() {
  const helperState = useStore(s => s.helperState);
  const helperCrop = useStore(s => s.helperCrop);
  const helperPlantDate = useStore(s => s.helperPlantDate);
  const claudeResponse = useStore(s => s.claudeResponse);
  const claudeLoading = useStore(s => s.claudeLoading);
  const setHelperState = useStore(s => s.setHelperState);
  const setHelperCrop = useStore(s => s.setHelperCrop);
  const setHelperPlantDate = useStore(s => s.setHelperPlantDate);
  const setClaudeResponse = useStore(s => s.setClaudeResponse);
  const setClaudeLoading = useStore(s => s.setClaudeLoading);
  const plantingGuide = useStore(s => s.plantingGuide);

  // Convert FIPS to abbr for display
  const selectedAbbr = helperState ? FIPS_TO_ABBR[helperState] : null;

  const handleStateChange = (e) => {
    const abbr = e.target.value;
    const fips = ABBR_TO_FIPS[abbr];
    setHelperState(fips || null);
    setClaudeResponse(null);
  };

  const handleCropSelect = (crop) => {
    setHelperCrop(crop);
    setClaudeResponse(null);
  };

  const setDateOffset = (months) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    setHelperPlantDate(d.toISOString().split('T')[0]);
    setClaudeResponse(null);
  };

  const handleSubmit = async () => {
    if (!selectedAbbr || !helperCrop || !helperPlantDate) return;

    setClaudeLoading(true);
    setClaudeResponse(null);

    const guideData = plantingGuide?.[selectedAbbr]?.crops?.[helperCrop];

    try {
      const res = await fetch('/api/plant-helper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: STATE_NAMES[selectedAbbr],
          stateAbbr: selectedAbbr,
          crop: helperCrop,
          plantDate: helperPlantDate,
          historicalData: guideData,
        }),
      });
      const data = await res.json();
      setClaudeResponse(data.response);
    } catch (err) {
      setClaudeResponse('Unable to get insights right now. Please try again.');
    } finally {
      setClaudeLoading(false);
    }
  };

  const step = !selectedAbbr ? 1 : !helperCrop ? 2 : !helperPlantDate ? 3 : 4;

  return (
    <div className="plant-helper">
      <div className="helper-header">
        <span className="helper-icon">🌱</span>
        <h2 className="helper-title">Plant Helper</h2>
      </div>

      <div className="helper-steps">
        {/* Step 1: State */}
        <div className="step">
          <label className="step-label">
            <span className="step-num">01</span>
            What state are you in?
          </label>
          <select
            className="step-select"
            value={selectedAbbr || ''}
            onChange={handleStateChange}
          >
            <option value="">Select a state...</option>
            {ALL_STATES.map(([abbr, name]) => (
              <option key={abbr} value={abbr}>{name}</option>
            ))}
          </select>
        </div>

        {/* Step 2: Crop */}
        <AnimatePresence>
          {step >= 2 && (
            <motion.div
              className="step"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <label className="step-label">
                <span className="step-num">02</span>
                What crop are you planting?
              </label>
              <div className="crop-buttons">
                {CROPS.map(crop => (
                  <button
                    key={crop}
                    className={`crop-btn ${helperCrop === crop ? 'active' : ''}`}
                    onClick={() => handleCropSelect(crop)}
                  >
                    {crop === 'corn' ? '🌽' : '🫘'} {crop}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 3: Date */}
        <AnimatePresence>
          {step >= 3 && (
            <motion.div
              className="step"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <label className="step-label">
                <span className="step-num">03</span>
                When do you plan on planting?
              </label>
              <div className="date-buttons">
                <button className="date-btn" onClick={() => setDateOffset(0)}>Now</button>
                <button className="date-btn" onClick={() => setDateOffset(2)}>+2 months</button>
                <button className="date-btn" onClick={() => setDateOffset(4)}>+4 months</button>
              </div>
              <input
                type="date"
                className="date-input"
                value={helperPlantDate || ''}
                onChange={(e) => {
                  setHelperPlantDate(e.target.value);
                  setClaudeResponse(null);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 4: Submit */}
        <AnimatePresence>
          {step >= 4 && (
            <motion.div
              className="step"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <button
                className="submit-btn"
                onClick={handleSubmit}
                disabled={claudeLoading}
              >
                {claudeLoading ? (
                  <span className="loading-dots">Analyzing<span>...</span></span>
                ) : (
                  'Get Insights'
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Response */}
        <AnimatePresence>
          {claudeResponse && (
            <motion.div
              className="insights"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="insights-header">
                <span className="insights-icon">✦</span>
                <span>AI Insights</span>
              </div>
              <div className="insights-content">
                {claudeResponse.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
