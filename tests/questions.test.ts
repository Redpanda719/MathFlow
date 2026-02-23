import { describe, expect, it } from 'vitest';
import { generateQuestion } from '@shared/questions';
import type { DifficultyConfig } from '@shared/types';

const config: DifficultyConfig = {
  tier: 'custom',
  tables: [6, 7, 8, 9],
  hintsEnabled: false,
  wrongPenalty: 4,
  rounds: 1,
  adaptive: true,
  timerSeconds: 60,
  perQuestionSeconds: 5
};

describe('question generator', () => {
  it('respects configured table focus', () => {
    for (let i = 0; i < 30; i += 1) {
      const q = generateQuestion({
        config,
        weakFacts: {},
        recentQuestionIds: [],
        mode: 'focus'
      });
      expect(config.tables).toContain(q.a);
      expect(q.answer).toBe(q.a * q.b);
    }
  });

  it('avoids recent repeated pairs when possible', () => {
    const q = generateQuestion({
      config,
      weakFacts: {},
      recentQuestionIds: ['6x1', '6x2', '6x3', '6x4', '6x5', '6x6', '6x7', '6x8'],
      mode: 'mixed'
    });
    expect(['6x1', '6x2', '6x3', '6x4', '6x5', '6x6', '6x7', '6x8']).not.toContain(`${q.a}x${q.b}`);
  });
});
