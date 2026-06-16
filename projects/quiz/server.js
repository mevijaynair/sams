// Annual Day Quiz — multi-round team-based quiz with live scoring
// PORT=3001, reverse proxied via Caddy at quiz.fmss.ae

import express from 'express';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(import.meta.url).replace(/\/[^/]*$/, '');
const PORT = process.env.PORT || 3001;

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Mock data — replace with real DB (SQLite/Postgres)
const quizzes = [
  {
    id: '2025-annual-day',
    title: '2025 Annual Day Quiz',
    rounds: [
      { id: 'r1', name: 'Round 1: General Knowledge', questions: [] },
      { id: 'r2', name: 'Round 2: Sports', questions: [] },
      { id: 'r3', name: 'Round 3: Visuals & Guess', questions: [] }
    ],
    teams: []
  }
];

const scores = {}; // { teamId: { r1: 10, r2: 15, r3: 20 } }

// ─── API Routes ───────────────────────────────────────────────────────────
app.get('/api/quizzes', (req, res) => {
  res.json(quizzes);
});

app.post('/api/quizzes/:quizId/teams', (req, res) => {
  const { quizId } = req.params;
  const { teamName } = req.body;
  const quiz = quizzes.find(q => q.id === quizId);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  const team = { id: `team-${Date.now()}`, name: teamName, createdAt: new Date() };
  quiz.teams.push(team);
  scores[team.id] = {};
  res.status(201).json(team);
});

app.post('/api/quizzes/:quizId/score', (req, res) => {
  const { quizId } = req.params;
  const { teamId, round, points } = req.body;
  const quiz = quizzes.find(q => q.id === quizId);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  if (!scores[teamId]) scores[teamId] = {};
  scores[teamId][round] = (scores[teamId][round] || 0) + points;
  res.json({ teamId, round, points, total: Object.values(scores[teamId]).reduce((a, b) => a + b, 0) });
});

app.get('/api/quizzes/:quizId/leaderboard', (req, res) => {
  const { quizId } = req.params;
  const quiz = quizzes.find(q => q.id === quizId);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  const board = quiz.teams.map(t => ({
    rank: 0,
    teamName: t.name,
    score: Object.values(scores[t.id] || {}).reduce((a, b) => a + b, 0),
    rounds: scores[t.id] || {}
  })).sort((a, b) => b.score - a.score).map((t, i) => ({ ...t, rank: i + 1 }));
  res.json(board);
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, app: 'quiz', version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`📊 Annual Day Quiz running on port ${PORT}`);
  console.log(`   → https://quiz.fmss.ae (via Caddy)`);
});
