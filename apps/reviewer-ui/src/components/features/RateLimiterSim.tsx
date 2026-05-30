import { useCallback, useRef, useState } from 'react';
import { Ban, Zap } from 'lucide-react';
import { GITHUB_STATS } from '../../data/generated/githubStats';

const SIM_LIMIT = 12;
const ACTUAL_LIMIT = GITHUB_STATS.gateway.rateLimitMax;
const ACTUAL_WINDOW_SECONDS = Math.round(GITHUB_STATS.gateway.rateLimitWindowMs / 1000);
const WINDOW_MS = 10_000;
const REQUESTS_PER_CLICK = Math.max(1, Math.round(ACTUAL_LIMIT / SIM_LIMIT));

interface RequestEntry {
  id: number;
  status: 200 | 429;
  ts: number;
}

export function RateLimiterSim() {
  const [entries, setEntries] = useState<RequestEntry[]>([]);
  const counter = useRef(0);

  const countInWindow = useCallback((items: RequestEntry[]) => {
    const now = Date.now();
    return items.filter((entry) => now - entry.ts < WINDOW_MS && entry.status === 200).length;
  }, []);

  const sendRequest = useCallback(() => {
    const id = ++counter.current;
    const now = Date.now();

    setEntries((previous) => {
      const windowCount = countInWindow(previous);
      const status: 200 | 429 = windowCount >= SIM_LIMIT ? 429 : 200;
      return [{ id, status, ts: now }, ...previous].slice(0, 20);
    });
  }, [countInWindow]);

  const reset = () => setEntries([]);

  const windowHits = countInWindow(entries);
  const pct = Math.min(100, (windowHits / SIM_LIMIT) * 100);
  const blocked = entries.filter((entry) => entry.status === 429).length;

  return (
    <div className="rate-sim">
      <div className="rate-sim__header">
        <div>
          <span className="rate-sim__rule">
            Gateway policy: {ACTUAL_LIMIT} req / {ACTUAL_WINDOW_SECONDS}s per IP
          </span>
          <span className="rate-sim__scale">Simulator scale: one click represents about {REQUESTS_PER_CLICK} requests.</span>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={reset}>
          Reset
        </button>
      </div>

      <div className="rate-sim__gauge">
        <div className="rate-sim__gauge-track">
          <div
            className={`rate-sim__gauge-fill${pct >= 100 ? ' rate-sim__gauge-fill--full' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="rate-sim__gauge-labels">
          <span>
            {windowHits} / {SIM_LIMIT} simulated hits in window
          </span>
          {pct >= 100 ? <span className="text-rose">Rate limited</span> : null}
        </div>
      </div>

      <button
        type="button"
        className={`btn rate-sim__fire-btn${pct >= 100 ? ' btn--danger' : ' btn--primary'}`}
        onClick={sendRequest}
      >
        {pct >= 100 ? <Ban size={16} aria-hidden /> : <Zap size={16} aria-hidden />}
        {pct >= 100 ? 'Send request, expect 429' : 'Send request'}
      </button>

      <div className="rate-sim__log" aria-label="Rate limiter request log">
        {entries.length > 0 ? (
          entries.map((entry) => (
            <div key={entry.id} className={`rate-sim__entry rate-sim__entry--${entry.status}`}>
              <code>GET /api/scans</code>
              <span className={entry.status === 429 ? 'text-rose' : 'text-success'}>
                {entry.status === 429 ? '429 Too Many Requests' : '200 OK'}
              </span>
            </div>
          ))
        ) : (
          <p className="rate-sim__empty">Click Send request to simulate traffic through the limiter.</p>
        )}
      </div>

      {blocked > 0 ? (
        <div className="limitation-callout limitation-callout--info">
          <span className="limitation-callout__text">
            {blocked} request{blocked > 1 ? 's' : ''} blocked by the simulated limiter. The gateway emits a
            rate-limit audit event when the real bucket is exceeded.
          </span>
        </div>
      ) : null}
    </div>
  );
}
