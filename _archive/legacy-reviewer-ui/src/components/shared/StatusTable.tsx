import type { ReactNode } from 'react';

interface StatusTableProps {
  head: string[];
  rows: ReactNode[][];
  /** Minimum table width before the wrapper scrolls horizontally. */
  minWidth?: number;
  caption?: string;
}

/**
 * A readable table whose overflow is contained inside its own scroll wrapper,
 * so wide tables never push the page body into horizontal scroll.
 */
export function StatusTable({ head, rows, minWidth = 560, caption }: StatusTableProps) {
  return (
    <div className="table-scroll" role="region" aria-label={caption ?? 'Data table'} tabIndex={0}>
      <table className="status-table" style={{ minWidth }}>
        {caption ? <caption className="status-table__caption">{caption}</caption> : null}
        <thead>
          <tr>
            {head.map((label) => (
              <th key={label}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
