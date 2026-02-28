import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.post('/api/plant-helper', async (req, res) => {
  const { state, stateAbbr, crop, plantDate, historicalData } = req.body;

  const systemPrompt = `You are an expert agricultural advisor with deep knowledge of US crop production. You provide specific, data-backed advice using the historical yield data provided. Be concise, practical, and format your response with clear sections. Use numbers and comparisons. Keep your response under 300 words.`;

  const historicalContext = historicalData
    ? `Historical yield data for ${crop} in ${state}:
- Average yield: ${historicalData.historical_avg} bu/acre
- Standard deviation: ${historicalData.historical_std} bu/acre
- Trend: ${historicalData.trend > 0 ? '+' : ''}${historicalData.trend} bu/acre per year
- Best recent years: ${historicalData.best_recent_years?.map(y => `${y.year}: ${y.avg_yield} bu/acre`).join(', ')}
- Worst recent years: ${historicalData.worst_recent_years?.map(y => `${y.year}: ${y.avg_yield} bu/acre`).join(', ')}`
    : 'No historical data available for this state and crop combination.';

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `A farmer in ${state} (${stateAbbr}) wants to plant ${crop} around ${plantDate}.

${historicalContext}

Please provide:
1. VIABILITY: Is this a good idea? Rate the decision and explain why.
2. HISTORICAL PERFORMANCE: Summarize how ${crop} has performed in ${state} - best/worst years, trends.
3. WEATHER RISKS: Key weather risks for planting ${crop} around ${plantDate} in ${state}.
4. PRACTICAL ADVICE: 2-3 actionable tips for maximizing yield.`
      }],
    });

    res.json({ response: message.content[0].text });
  } catch (err) {
    console.error('Claude API error:', err);
    res.status(500).json({ error: 'Failed to get insights', details: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Harrow API server running on port ${PORT}`);
});
