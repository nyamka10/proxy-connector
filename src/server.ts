import express from 'express';
import { apiKeyAuth } from './middleware/auth.js';
import { v1Router } from './routes/v1.js';

const PORT = parseInt(process.env.PORT ?? '3100', 10);
const API_KEY = process.env.API_KEY ?? '';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, version: '1.0.0' });
});

app.use('/v1', apiKeyAuth(API_KEY), v1Router);

app.listen(PORT, () => {
  console.log(`proxy-connector listening on port ${PORT}`);
});
