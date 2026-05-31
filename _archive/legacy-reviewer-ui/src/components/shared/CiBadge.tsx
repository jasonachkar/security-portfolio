import { Badge } from './Badge';
import { GITHUB_STATS } from '../../data/generated/githubStats';

const STATUS_CONFIG = {
  success: { tone: 'green', label: 'CI passing' },
  failure: { tone: 'rose', label: 'CI failing' },
  cancelled: { tone: 'amber', label: 'CI cancelled' },
  skipped: { tone: 'slate', label: 'CI skipped' },
  timed_out: { tone: 'amber', label: 'CI timed out' },
  action_required: { tone: 'amber', label: 'CI action required' },
  neutral: { tone: 'slate', label: 'CI neutral' },
  unknown: { tone: 'slate', label: 'CI unknown' },
} as const;

export function CiBadge() {
  const status = GITHUB_STATS.lastCiStatus ?? 'unknown';
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.unknown;

  return (
    <Badge tone={config.tone} uppercase>
      <span className="ci-dot" aria-hidden />
      {config.label}
    </Badge>
  );
}
