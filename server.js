import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import OpenAI from 'openai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(helmet({
  // Inline styles/scripts are avoided; the app uses separate CSS and JS files.
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"]
    }
  }
}));
app.use(express.json({ limit: '30kb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/', rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false }));

const systemInstructions = `You are StudySpark, a friendly and accurate AI study assistant for college and university students. Explain concepts clearly in beginner-friendly language, use headings and examples when useful, and help learners understand rather than merely memorize. If asked for a quiz, create questions and wait for the student's answers unless they request the answer key. If a question is ambiguous, ask a concise clarifying question. Be honest when uncertain. Use the user's selected study mode as extra guidance, not as a reason to ignore the question.`;

app.get('/api/health', (_req, res) => res.json({ ok: true, configured: Boolean(process.env.OPENAI_API_KEY) }));

app.post('/api/chat', async (req, res) => {
  const { messages, mode = 'Explain a topic' } = req.body ?? {};
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'AI is not configured yet. Add your API key to the .env file, then restart the server.' });
  }
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 24) {
    return res.status(400).json({ error: 'Please send between 1 and 24 recent messages.' });
  }
  const cleanMessages = [];
  for (const item of messages) {
    if (!item || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string') {
      return res.status(400).json({ error: 'The message format is invalid.' });
    }
    const content = item.content.trim();
    if (!content || content.length > 6000) {
      return res.status(400).json({ error: 'Each message must be between 1 and 6000 characters.' });
    }
    cleanMessages.push({ role: item.role, content });
  }
  if (cleanMessages.at(-1)?.role !== 'user') {
    return res.status(400).json({ error: 'The last message must be from the student.' });
  }
  const modes = {
    'Explain a topic': 'Explain the concept step by step and include a simple example.',
    'Exam preparation': 'Give an exam-focused answer with key points and a concise summary.',
    'Quiz me': 'Act as a tutor. Ask one question at a time and let the student answer before revealing the answer.',
    'Summarize notes': 'Summarize the material into clear headings and concise bullet points. Do not invent details that are not provided.',
    'Coding help': 'Teach programming step by step. Explain the purpose of code and help the student learn, not just copy.'
  };
  const modeInstruction = modes[mode] || modes['Explain a topic'];

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      instructions: `${systemInstructions}\nCurrent study mode: ${modeInstruction}`,
      input: cleanMessages.map((m) => ({ role: m.role, content: m.content }))
    });
    const answer = response.output_text?.trim();
    if (!answer) throw new Error('The AI returned an empty response. Please try again.');
    res.json({ answer });
  } catch (error) {
    console.error('AI request failed:', error?.status || error?.message || 'Unknown error');
    if (error?.status === 401) return res.status(502).json({ error: 'The API key was rejected. Check OPENAI_API_KEY in your .env file.' });
    if (error?.status === 429) return res.status(429).json({ error: 'The AI service is busy or your API quota is unavailable. Check your API account and try again.' });
    return res.status(502).json({ error: 'The AI could not respond right now. Check your connection and API settings, then try again.' });
  }
});

app.listen(port, () => {
  console.log(`StudySpark is running at http://localhost:${port}`);
  if (!process.env.OPENAI_API_KEY) console.log('Setup needed: add OPENAI_API_KEY to your .env file.');
});
