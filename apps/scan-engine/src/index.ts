import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import threatRouter from './routes/threats';
import scanRouter from './routes/scan';
import infraRouter from './routes/infra';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '2mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

app.use('/api/threats', threatRouter);
app.use('/api/scan', scanRouter);
app.use('/api/infra', infraRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Only listen when run directly (local dev / container). When imported by a
// serverless host (e.g. Vercel @vercel/node) the exported app is used instead.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Scan Engine running on http://localhost:${PORT}`);
  });
}

export default app;
