import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import userRoutes from './routes/user-routes';
import subscriptionRoutes from './routes/subscription-routes';
import analysisRoutes from './routes/analysis-routes';
import webhookRoutes from './routes/webhook-routes';
import { refreshCreditsIfNeeded } from './middleware/credit-refresh';

const app = express();

/* ── Global Middleware ── */

app.use(cors({
  origin: [
    'http://localhost:5173',   // Vite dev server
    'http://localhost:4173',   // Vite preview
    // Add production domain here when deployed:
    // 'https://propel-web.vercel.app',
  ],
  credentials: true,
}));

app.use(express.json());

/* ── Routes ── */

// Credit refresh runs on every authenticated /api request
// (it's a no-op for unauthenticated routes and non-subscribers)
app.use('/api', refreshCreditsIfNeeded);

app.use('/api/users', userRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/webhooks', webhookRoutes);

/* ── Health Check ── */

app.get('/health', (_req, res) => {
  res.status(200).send('Propel Backend is Alive');
});

/* ── Start Server ── */

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`-----------------------------------------`);
  console.log(`  PROPEL ENGINE STARTED SUCCESSFULLY`);
  console.log(`  Listening on: http://localhost:${PORT}`);
  console.log(`-----------------------------------------`);
});
