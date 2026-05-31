import { create } from 'zustand';

export interface InfraNodeState {
  id: string;
  type: string;
  label?: string;
  position?: { x: number; y: number };
  data?: Record<string, unknown>;
}

export interface InfraEdgeState {
  id: string;
  source: string;
  target: string;
}

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
  infraNodes: InfraNodeState[];
  infraEdges: InfraEdgeState[];
  infraFindings: Finding[];
  setInfraNodes: (nodes: InfraNodeState[]) => void;
  setInfraEdges: (edges: InfraEdgeState[]) => void;
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
