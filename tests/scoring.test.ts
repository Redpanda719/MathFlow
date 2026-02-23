import { describe, expect, it } from 'vitest';
import { calculateAnswerPoints, summarizeRound } from '@shared/scoring';
import { DEFAULT_SETTINGS } from '@shared/constants';

describe('scoring', () => {
  it('awards more points for speed and streak', () => {
    const fast = calculateAnswerPoints(true, 900, 5, DEFAULT_SETTINGS, 3);
    const slow = calculateAnswerPoints(true, 2500, 1, DEFAULT_SETTINGS, 3);
    expect(fast).toBeGreaterThan(slow);
  });

  it('applies wrong-answer penalty', () => {
    const penalty = calculateAnswerPoints(false, 1400, 0, DEFAULT_SETTINGS, 6);
    expect(penalty).toBe(-6);
  });

  it('summarizes round metrics correctly', () => {
    const summary = summarizeRound(
      [
        { questionId: 'a', value: 4, responseMs: 1200, submittedAt: 1, correct: true },
        { questionId: 'b', value: 9, responseMs: 800, submittedAt: 2, correct: false },
        { questionId: 'c', value: 6, responseMs: 600, submittedAt: 3, correct: true }
      ],
      2,
      140
    );
    expect(summary.correct).toBe(2);
    expect(summary.wrong).toBe(1);
    expect(summary.accuracy).toBeCloseTo(66.666, 1);
    expect(summary.bestStreak).toBe(2);
    expect(summary.score).toBe(140);
  });
});
