import { Router } from 'express';
import { getRecentCVEs } from '../services/nvdService';
import { getNoisyIPs } from '../services/greynoiseService';
import { getInternetDBInfo } from '../services/shodanService';

const router = Router();

router.get('/cves', async (_req, res) => {
  try {
    const cves = await getRecentCVEs(30);
    res.json({
      success: true,
      data: cves,
      count: cves.length,
      sample: cves.some((c) => c.sample),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/noise', async (_req, res) => {
  try {
    const ips = await getNoisyIPs(100);
    res.json({
      success: true,
      data: ips,
      count: ips.length,
      sample: ips.some((i) => i.sample),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/host/:ip', async (req, res) => {
  const { ip } = req.params;
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) {
    return res.status(400).json({ success: false, error: 'Invalid IP format' });
  }
  try {
    const info = await getInternetDBInfo(ip);
    res.json({ success: true, data: info });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
