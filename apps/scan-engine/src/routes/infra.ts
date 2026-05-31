import { Router } from 'express';
import {
  validateInfraGraph,
  generateTerraform,
  type InfraGraph,
} from '../services/infraValidator';

const router = Router();

router.post('/validate', (req, res) => {
  const graph: InfraGraph = req.body;

  if (!graph?.nodes || !Array.isArray(graph.nodes)) {
    return res.status(400).json({ error: 'Invalid graph: nodes array required' });
  }

  try {
    const findings = validateInfraGraph(graph);
    res.json({
      success: true,
      findings,
      summary: {
        total: findings.length,
        critical: findings.filter((f) => f.severity === 'CRITICAL').length,
        high: findings.filter((f) => f.severity === 'HIGH').length,
        medium: findings.filter((f) => f.severity === 'MEDIUM').length,
        low: findings.filter((f) => f.severity === 'LOW').length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/terraform', (req, res) => {
  const graph: InfraGraph = req.body;

  if (!graph?.nodes || !Array.isArray(graph.nodes)) {
    return res.status(400).json({ error: 'Invalid graph: nodes array required' });
  }

  try {
    const hcl = generateTerraform(graph);
    res.json({ success: true, terraform: hcl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
