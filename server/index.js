// index.js — Express entry point. Serves the API and the static frontend.
// Environment variables (NODE_ENV, JWT_SECRET, etc.) are loaded via .env file
// on the server (systemd EnvironmentFile directive) or set manually before npm start.
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initSchema, seed } from './db.js';
import api from './routes/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');
const PORT = process.env.PORT || 3000;

// Ensure tables exist, and seed demo data on a fresh DB.
initSchema();
seed();

const app = express();
app.use(express.json());

// Parse cookies for refresh token in httpOnly cookie
app.use((req, res, next) => {
  const cookies = {};
  (req.get('cookie') || '').split(/;\s*/).forEach(c => {
    const [k, v] = c.split('=');
    if (k) cookies[k] = decodeURIComponent(v || '');
  });
  req.cookies = cookies;
  next();
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api', api);

app.use(express.static(PUBLIC_DIR));

// Basic error handler so a thrown route doesn't crash the process silently.
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`SAMS running → http://localhost:${PORT}`);
});
