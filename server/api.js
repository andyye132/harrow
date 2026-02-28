import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.post('/api/plant-helper', async (req, res) => {
  const { state, stateAbbr, crop, plantDate, historicalData, chatHistory, userMessage } = req.body;

  const systemPrompt = `You are an expert agricultural advisor called "Crop Advisor" built into the Harrow platform. You have deep knowledge of US crop production, weather patterns, and farming economics.

Key facts you know:
- Corn: ~170 bu/acre national avg, $4.50/bu (USDA NASS 2020-24), ~$400/acre operating cost
- Soybeans: ~50 bu/acre national avg, $11.50/bu (USDA NASS 2020-24), ~$300/acre operating cost
- Operating costs include seed, fertilizer, chemicals, fuel, machinery (from USDA ERS 2023)
- Heat stress days (>95°F) are the #1 yield predictor
- Growing season: corn Apr-Sep, soybeans May-Sep

Be concise, practical, and friendly. Use numbers and data. Format with **bold** for key terms. Keep responses under 200 words unless the question requires more detail.`;

  const historicalContext = historicalData
    ? `\n\nHistorical yield data for ${state}:
${JSON.stringify(historicalData, null, 2)}`
    : '';

  try {
    // Build messages array — support chat history
    let messages;
    if (chatHistory && chatHistory.length > 0) {
      // Use chat history, injecting context into the first user message
      messages = chatHistory.map((msg, i) => ({
        role: msg.role,
        content: i === 0 && msg.role === 'user'
          ? `[Context: User is looking at ${state || 'the US map'}.${historicalContext}]\n\n${msg.content}`
          : msg.content,
      }));
      // Add the latest user message
      if (userMessage) {
        messages.push({ role: 'user', content: userMessage });
      }
    } else {
      // Legacy single-shot mode
      messages = [{
        role: 'user',
        content: `A farmer in ${state} (${stateAbbr}) wants to plant ${crop} around ${plantDate}.
${historicalContext}

Please provide:
1. VIABILITY: Is this a good idea? Rate the decision and explain why.
2. HISTORICAL PERFORMANCE: Summarize how ${crop} has performed in ${state}.
3. WEATHER RISKS: Key weather risks for planting ${crop} around ${plantDate}.
4. PRACTICAL ADVICE: 2-3 actionable tips for maximizing yield.`
      }];
    }

    // Ensure messages alternate correctly (Claude requires user/assistant alternation)
    const cleanMessages = [];
    for (const msg of messages) {
      if (cleanMessages.length > 0 && cleanMessages[cleanMessages.length - 1].role === msg.role) {
        // Merge consecutive same-role messages
        cleanMessages[cleanMessages.length - 1].content += '\n' + msg.content;
      } else {
        cleanMessages.push({ ...msg });
      }
    }

    // Ensure first message is from user
    if (cleanMessages.length > 0 && cleanMessages[0].role !== 'user') {
      cleanMessages.shift();
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: cleanMessages,
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
