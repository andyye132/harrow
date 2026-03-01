import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are an expert agricultural advisor called "Crop Advisor" built into the Harrow platform. You have deep knowledge of US crop production, weather patterns, and farming economics.

Key facts you know:
- Corn: ~170 bu/acre national avg, $4.50/bu (USDA NASS 2020-24), ~$400/acre operating cost
- Soybeans: ~50 bu/acre national avg, $11.50/bu (USDA NASS 2020-24), ~$300/acre operating cost
- Operating costs include seed, fertilizer, chemicals, fuel, machinery (from USDA ERS 2023)
- Heat stress days (>95°F) are the #1 yield predictor
- Growing season: corn Apr-Sep, soybeans May-Sep

Be concise, practical, and friendly. Use numbers and data. Format with **bold** for key terms. Keep responses under 200 words unless the question requires more detail.`;

app.post('/api/plant-helper', async (req, res) => {
  const { state, stateAbbr, crop, plantDate, historicalData, chatHistory, userMessage } = req.body;

  const historicalContext = historicalData
    ? `\n\nHistorical yield data for ${state}:\n${JSON.stringify(historicalData, null, 2)}`
    : '';

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    let result;

    if (chatHistory && chatHistory.length > 0) {
      // Build Gemini history — convert 'assistant' → 'model'
      const allMessages = [...chatHistory];
      if (allMessages.length > 0 && allMessages[0].role === 'user') {
        allMessages[0] = {
          ...allMessages[0],
          content: `[Context: User is looking at ${state || 'the US map'}.${historicalContext}]\n\n${allMessages[0].content}`,
        };
      }

      const geminiHistory = [];
      for (const msg of allMessages) {
        const role = msg.role === 'assistant' ? 'model' : 'user';
        if (geminiHistory.length > 0 && geminiHistory[geminiHistory.length - 1].role === role) {
          geminiHistory[geminiHistory.length - 1].parts[0].text += '\n' + msg.content;
        } else {
          geminiHistory.push({ role, parts: [{ text: msg.content }] });
        }
      }
      if (geminiHistory.length > 0 && geminiHistory[0].role !== 'user') {
        geminiHistory.shift();
      }

      const chat = model.startChat({ history: geminiHistory });
      result = await chat.sendMessage(userMessage || '');
    } else {
      result = await model.generateContent(
        `A farmer in ${state} (${stateAbbr}) wants to plant ${crop} around ${plantDate}.
${historicalContext}

Please provide:
1. VIABILITY: Is this a good idea? Rate the decision and explain why.
2. HISTORICAL PERFORMANCE: Summarize how ${crop} has performed in ${state}.
3. WEATHER RISKS: Key weather risks for planting ${crop} around ${plantDate}.
4. PRACTICAL ADVICE: 2-3 actionable tips for maximizing yield.`
      );
    }

    res.json({ response: result.response.text() });
  } catch (err) {
    console.error('Gemini API error:', err);
    res.status(500).json({ error: 'Failed to get insights', details: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Harrow API server running on port ${PORT}`);
});
