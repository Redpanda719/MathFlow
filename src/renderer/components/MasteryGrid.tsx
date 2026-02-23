import type { FC } from 'react';
import type { FactStatsMap } from '@shared/types';
import { factKey } from '@shared/utils';

interface Props {
  stats: FactStatsMap;
}

const cellClass = (attempts: number, correct: number): string => {
  if (attempts === 0) return 'mastery-cell none';
  const accuracy = correct / attempts;
  if (accuracy > 0.9) return 'mastery-cell strong';
  if (accuracy > 0.75) return 'mastery-cell good';
  if (accuracy > 0.5) return 'mastery-cell warm';
  return 'mastery-cell weak';
};

export const MasteryGrid: FC<Props> = ({ stats }) => (
  <div className="card mastery">
    <h3>Mastery Heatmap</h3>
    <div className="mastery-grid">
      {Array.from({ length: 9 }).map((_, ia) =>
        Array.from({ length: 9 }).map((_, ib) => {
          const a = ia + 1;
          const b = ib + 1;
          const fact = stats[factKey(a, b)] ?? { attempts: 0, correct: 0, averageMs: 0, lastSeen: 0 };
          return (
            <div key={`${a}-${b}`} className={cellClass(fact.attempts, fact.correct)} title={`${a}x${b}`}>
              {a}x{b}
            </div>
          );
        })
      )}
    </div>
  </div>
);
