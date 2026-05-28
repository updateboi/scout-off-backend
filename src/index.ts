import express from 'express';
import cors from 'cors';
import config from './config';
import authRoutes from './routes/auth';
import playerRoutes from './routes/player';
import scoutRoutes from './routes/scout';
import validatorRoutes from './routes/validator';
import adminRoutes from './routes/admin';
import { errorHandler } from './middleware/errorHandler';
import { indexEvents } from './services/indexer';
import { checkHealth } from './services/ipfs';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

/**
 * Readiness probe — checks liveness of service dependencies.
 * Returns 200 when all dependencies are reachable; 503 when any are down.
 * Currently checks: IPFS (Pinata) storage connectivity.
 */
app.get('/ready', async (_req, res) => {
  try {
    await checkHealth();
    res.json({ status: 'ok', services: { ipfs: 'ok' } });
  } catch {
    res.status(503).json({ status: 'degraded', services: { ipfs: 'unavailable' } });
  }
});

app.use('/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/scouts', scoutRoutes);
app.use('/api/validators', validatorRoutes);
app.use('/api/admin', adminRoutes);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`ScoutOff backend running on port ${config.port} [${config.network}]`);

  // Poll for new contract events every 5 seconds
  const poll = async () => {
    try {
      await indexEvents();
    } catch (err) {
      console.error('Indexer error:', (err as Error).message);
    }
  };

  poll();
  setInterval(poll, 5_000);
});

export default app;
