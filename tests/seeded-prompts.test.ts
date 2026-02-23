import { describe, expect, it } from 'vitest';
import { buildSeededPromptStream } from '@shared/questions';
import { DEFAULT_DIFFICULTIES } from '@shared/constants';

describe('seeded prompt stream', () => {
  it('is deterministic for a given seed', () => {
    const a = buildSeededPromptStream(42, 8, 'multiplication', DEFAULT_DIFFICULTIES.medium);
    const b = buildSeededPromptStream(42, 8, 'multiplication', DEFAULT_DIFFICULTIES.medium);
    expect(a.map((x) => x.prompt)).toEqual(b.map((x) => x.prompt));
    expect(a.map((x) => x.answer)).toEqual(b.map((x) => x.answer));
  });
});
