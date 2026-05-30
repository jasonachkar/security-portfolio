import { useMemo, useState } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SCAN_SUMMARY, type ScanSeverity } from '../../data/generated/scanSummary';

const SEVERITY_COLORS: Record<ScanSeverity, string> = {
  critical: 'var(--rose)',
  high: 'var(--rose)',
  medium: 'var(--amber)',
  low: 'var(--indigo)',
  info: 'var(--slate)',
};

function shortFile(path?: string) {
  if (!path) {
    return '-';
  }
  return path.split(/[\\/]/).slice(-2).join('/');
}

export function ScanDashboard() {
  const [activeTool, setActiveTool] = useState('all');

  const tools = useMemo(() => ['all', ...Object.keys(SCAN_SUMMARY.byTool)], []);
  const chartData = useMemo(
    () =>
      Object.entries(SCAN_SUMMARY.bySeverity)
        .filter(([, count]) => count > 0)
        .map(([severity, count]) => ({ severity: severity as ScanSeverity, count })),
    [],
  );
  const findings = useMemo(
    () =>
      activeTool === 'all'
        ? SCAN_SUMMARY.topFindings
        : SCAN_SUMMARY.topFindings.filter((finding) => finding.tool === activeTool),
    [activeTool],
  );

  return (
    <div className="scan-dashboard">
      <div className="scan-dashboard__stats">
        <div className="scan-stat">
          <span className="scan-stat__value">{SCAN_SUMMARY.totalFindings}</span>
          <span className="scan-stat__label">Total findings</span>
        </div>
        {Object.entries(SCAN_SUMMARY.byTool).map(([tool, count]) => (
          <div key={tool} className="scan-stat">
            <span className="scan-stat__value">{count}</span>
            <span className="scan-stat__label">{tool}</span>
          </div>
        ))}
      </div>

      <div className="scan-dashboard__chart" aria-label="Severity bar chart">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 6, right: 16, bottom: 6, left: 8 }}>
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-mute)' }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="severity"
                tick={{ fontSize: 11, fill: 'var(--text-mute)' }}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(19, 25, 36, 0.98)',
                  border: '1px solid rgba(148, 167, 196, 0.26)',
                  borderRadius: 10,
                  color: 'var(--text)',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" radius={[0, 5, 5, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.severity} fill={SEVERITY_COLORS[entry.severity]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="scan-dashboard__empty">No findings in the committed scanner summary.</div>
        )}
      </div>

      <div className="filter-bar" aria-label="Finding tool filters">
        {tools.map((tool) => (
          <button
            key={tool}
            type="button"
            className={`filter-btn${activeTool === tool ? ' filter-btn--active' : ''}`}
            onClick={() => setActiveTool(tool)}
          >
            {tool}
            {tool !== 'all' ? ` (${SCAN_SUMMARY.byTool[tool] ?? 0})` : ''}
          </button>
        ))}
      </div>

      <div className="findings-table">
        {findings.length > 0 ? (
          findings.map((finding, index) => (
            <div key={`${finding.tool}:${finding.title}:${index}`} className="finding-row">
              <span className={`finding-row__sev finding-row__sev--${finding.severity}`}>{finding.severity}</span>
              <code className="finding-row__tool">{finding.tool}</code>
              <span className="finding-row__title">{finding.title}</span>
              <span className="finding-row__file">{shortFile(finding.file)}</span>
              {finding.cwe ? <span className="finding-row__cwe">{finding.cwe}</span> : <span />}
            </div>
          ))
        ) : (
          <p className="findings-table__empty">No findings for this tool in the top finding set.</p>
        )}
      </div>

      <p className="scan-dashboard__footer muted">
        Last summary: {new Date(SCAN_SUMMARY.generatedAt).toLocaleString()} / Source: {SCAN_SUMMARY.sourceDirectory}.
      </p>
    </div>
  );
}
