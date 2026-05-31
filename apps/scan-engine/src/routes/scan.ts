import { Router, Request, Response } from 'express';
import { runNmap, runTrivy, runCheckov } from '../services/scannerService';

const router = Router();

// SSE helper
function sendSSE(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

router.post('/nmap', async (req: Request, res: Response) => {
  const { target, flags } = req.body;
  if (!target) return res.status(400).json({ error: 'target is required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sendSSE(res, 'status', { message: `Starting nmap scan on ${target}...` });

  try {
    sendSSE(res, 'status', { message: 'Running port discovery...' });
    const result = await runNmap(target, flags);
    if (result.simulated) {
      sendSSE(res, 'status', {
        message: 'nmap binary not present — returning simulated output.',
      });
    }
    sendSSE(res, 'result', result);
    sendSSE(res, 'done', { message: 'Scan complete' });
  } catch (err: any) {
    sendSSE(res, 'error', { message: err.message });
  }

  res.end();
});

router.post('/trivy', async (req: Request, res: Response) => {
  const { target } = req.body;
  if (!target) return res.status(400).json({ error: 'target is required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sendSSE(res, 'status', { message: `Pulling image ${target} for analysis...` });
  sendSSE(res, 'status', {
    message: 'Scanning for CVEs in OS packages and libraries...',
  });

  try {
    const result = await runTrivy(target);
    if (result.simulated) {
      sendSSE(res, 'status', {
        message: 'trivy binary not present — returning simulated output.',
      });
    }
    sendSSE(res, 'result', result);
    sendSSE(res, 'done', { message: 'Scan complete' });
  } catch (err: any) {
    sendSSE(res, 'error', { message: err.message });
  }

  res.end();
});

router.post('/checkov', async (req: Request, res: Response) => {
  const { hcl } = req.body;
  if (!hcl) return res.status(400).json({ error: 'hcl content is required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sendSSE(res, 'status', { message: 'Parsing Terraform HCL...' });
  sendSSE(res, 'status', {
    message: 'Running Checkov security checks against CIS AWS Benchmark...',
  });

  try {
    const result = await runCheckov(hcl);
    if (result.simulated) {
      sendSSE(res, 'status', {
        message: 'checkov binary not present — returning simulated output.',
      });
    }
    sendSSE(res, 'result', result);
    sendSSE(res, 'done', { message: 'IaC scan complete' });
  } catch (err: any) {
    sendSSE(res, 'error', { message: err.message });
  }

  res.end();
});

export default router;
