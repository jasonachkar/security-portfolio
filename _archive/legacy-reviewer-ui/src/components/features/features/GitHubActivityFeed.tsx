import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, GitCommitHorizontal, Loader2, XCircle } from 'lucide-react';
import { GITHUB_STATS } from '../../data/generated/githubStats';
import { RECENT_COMMITS } from '../../data/generated/recentCommits';

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

interface WorkflowRun {
  id: number;
  name: string;
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out' | null;
  updatedAt: string;
  url: string;
}

const BASE = 'https://api.github.com/repos/jasonachkar/security-portfolio';

function fallbackRuns(): WorkflowRun[] {
  return GITHUB_STATS.lastCiRunAt
    ? [
        {
          id: 0,
          name: 'Latest CI run',
          conclusion: GITHUB_STATS.lastCiStatus as WorkflowRun['conclusion'],
          updatedAt: GITHUB_STATS.lastCiRunAt,
          url: 'https://github.com/jasonachkar/security-portfolio/actions',
        },
      ]
    : [];
}

function toDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export function GitHubActivityFeed() {
  const [commits, setCommits] = useState<Commit[]>(RECENT_COMMITS);
  const [runs, setRuns] = useState<WorkflowRun[]>(fallbackRuns);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'runtime' | 'build-time'>('build-time');

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch(`${BASE}/commits?per_page=8`).then((response) => {
        if (!response.ok) throw new Error(`commits:${response.status}`);
        return response.json();
      }),
      fetch(`${BASE}/actions/runs?per_page=6`).then((response) => {
        if (!response.ok) throw new Error(`runs:${response.status}`);
        return response.json();
      }),
    ])
      .then(([rawCommits, rawRuns]) => {
        if (cancelled) return;
        setCommits(
          (Array.isArray(rawCommits) ? rawCommits : []).map((commit: any) => ({
            sha: String(commit.sha ?? '').slice(0, 7),
            message: String(commit.commit?.message ?? 'commit').split('\n')[0].slice(0, 72),
            author: String(commit.commit?.author?.name ?? 'unknown'),
            date: String(commit.commit?.author?.date ?? new Date().toISOString()),
            url: String(commit.html_url ?? '#'),
          })),
        );
        setRuns(
          (rawRuns?.workflow_runs ?? []).map((run: any) => ({
            id: Number(run.id),
            name: String(run.name ?? 'Workflow'),
            conclusion: run.conclusion ?? null,
            updatedAt: String(run.updated_at ?? new Date().toISOString()),
            url: String(run.html_url ?? '#'),
          })),
        );
        setSource('runtime');
      })
      .catch(() => {
        if (!cancelled) {
          setSource('build-time');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const empty = useMemo(() => commits.length === 0 && runs.length === 0, [commits.length, runs.length]);

  if (loading && commits.length === 0) {
    return (
      <div className="activity-feed activity-feed--loading" aria-label="Loading GitHub activity">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="activity-skeleton"
            style={{ width: `${58 + index * 8}%` }}
          />
        ))}
      </div>
    );
  }

  if (empty) {
    return (
      <div className="activity-feed activity-feed--empty">
        <span>No GitHub activity was available from the runtime API or build-time fallback.</span>
      </div>
    );
  }

  return (
    <div className="activity-feed" aria-label="Runtime GitHub activity feed">
      <div className="activity-feed__head">
        <span>GitHub activity</span>
        <span className="activity-feed__source">
          {loading ? <Loader2 size={13} className="spin" aria-hidden /> : null}
          {source === 'runtime' ? 'Runtime GitHub API' : 'Build-time fallback'}
        </span>
      </div>

      <div className="activity-feed__ci-strip" aria-label="Recent workflow runs">
        {runs.length > 0 ? (
          runs.map((run) => (
            <a
              key={`${run.id}:${run.updatedAt}`}
              href={run.url}
              target="_blank"
              rel="noreferrer"
              className={`ci-pill ci-pill--${run.conclusion ?? 'pending'}`}
              title={`${run.name}: ${run.conclusion ?? 'in progress'} on ${toDate(run.updatedAt)}`}
            >
              {run.conclusion === 'success' ? (
                <CheckCircle2 size={12} aria-hidden />
              ) : run.conclusion === 'failure' ? (
                <XCircle size={12} aria-hidden />
              ) : (
                <span className="ci-pill__dot" aria-hidden />
              )}
              <span>{run.name}</span>
            </a>
          ))
        ) : (
          <span className="activity-feed__muted">No workflow runs returned.</span>
        )}
      </div>

      <div className="activity-feed__log" aria-label="Recent commits">
        {commits.map((commit, index) => (
          <a
            key={`${commit.sha}:${index}`}
            href={commit.url}
            target="_blank"
            rel="noreferrer"
            className="activity-commit-row"
            style={{ animationDelay: `${index * 35}ms` }}
          >
            <GitCommitHorizontal size={14} className="activity-commit-row__icon" aria-hidden />
            <code className="activity-commit-row__sha">{commit.sha}</code>
            <span className="activity-commit-row__message">{commit.message}</span>
            <span className="activity-commit-row__meta">
              {commit.author} / {toDate(commit.date)}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
