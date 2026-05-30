import { useMemo, useState } from 'react';
import { Badge } from '../shared/Badge';
import { CAPABILITY_MATRIX, STATUS_TONE, type CapabilityStatus } from '../../data/projectFacts';

type Filter = 'all' | CapabilityStatus;

const FILTERS: Filter[] = ['all', 'Real', 'Real (local lab)', 'Cloud-demo', 'Demo data', 'Planned'];

export function CapabilityMap() {
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(
    () => CAPABILITY_MATRIX.filter((row) => filter === 'all' || row.status === filter),
    [filter],
  );

  return (
    <div className="capability-map">
      <div className="filter-bar" aria-label="Capability status filters">
        {FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            className={`filter-btn${filter === item ? ' filter-btn--active' : ''}`}
            onClick={() => setFilter(item)}
          >
            {item === 'all' ? `All (${CAPABILITY_MATRIX.length})` : item}
          </button>
        ))}
      </div>

      <div className="capability-list">
        {filtered.map((row, index) => (
          <div key={row.capability} className="capability-row" style={{ animationDelay: `${index * 35}ms` }}>
            <div className="capability-row__status">
              <Badge tone={STATUS_TONE[row.status]} uppercase>
                {row.status}
              </Badge>
            </div>
            <div className="capability-row__content">
              <span className="capability-row__name">{row.capability}</span>
              <span className="capability-row__note">{row.note}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
