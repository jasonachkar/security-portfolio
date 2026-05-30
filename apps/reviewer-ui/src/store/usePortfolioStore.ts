import { create } from 'zustand';
import type { Node, Edge } from 'reactflow';

export interface CVE {
  id: string;
  description: string;
  cvssScore: number | null;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  publishedDate: string;
}

export interface ScanLog {
  timestamp: string;
  type: 'status' | 'result' | 'error' | 'done';
  message: string;
  data?: unknown;
}

export interface Finding {
  id: string;
  nodeId: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  description: string;
  remediation: string;
  framework: string;
}

interface PortfolioStore {
  // Threat data
  cves: CVE[];
  setCVEs: (cves: CVE[]) => void;

  // Infra designer
  infraNodes: Node[];
  infraEdges: Edge[];
  infraFindings: Finding[];
  setInfraNodes: (nodes: Node[]) => void;
  setInfraEdges: (edges: Edge[]) => void;
  setInfraFindings: (findings: Finding[]) => void;

  // Scanner
  activeTool: string | null;
  scanLogs: ScanLog[];
  setActiveTool: (tool: string | null) => void;
  appendScanLog: (log: ScanLog) => void;
  clearScanLogs: () => void;
}

export const usePortfolioStore = create<PortfolioStore>((set) => ({
  cves: [],
  setCVEs: (cves) => set({ cves }),

  infraNodes: [],
  infraEdges: [],
  infraFindings: [],
  setInfraNodes: (infraNodes) => set({ infraNodes }),
  setInfraEdges: (infraEdges) => set({ infraEdges }),
  setInfraFindings: (infraFindings) => set({ infraFindings }),

  activeTool: null,
  scanLogs: [],
  setActiveTool: (activeTool) => set({ activeTool }),
  appendScanLog: (log) => set((s) => ({ scanLogs: [...s.scanLogs, log] })),
  clearScanLogs: () => set({ scanLogs: [] }),
}));
