import { describe, expect, it } from 'vitest';
import { applyNitroPickup, fairNitroSeed, nitroBoostGain, seededNitroPattern } from '@shared/gameplayLogic';

describe('nitro spawn patterns', () => {
  it('is deterministic for same seed and tier', () => {
    const a = seededNitroPattern(1337, 24, 'medium');
    const b = seededNitroPattern(1337, 24, 'medium');
    expect(a).toEqual(b);
  });

  it('contains hazards and powerups in a run', () => {
    const run = seededNitroPattern(8888, 40, 'hard');
    expect(run.some((x) => x.kind === 'hazard')).toBe(true);
    expect(run.some((x) => x.kind === 'powerup')).toBe(true);
  });
});

describe('nitro powerup effects', () => {
  it('applies shield and nitro pickups', () => {
    let state = { lane: 1, boostMeter: 10, shield: 0, magnetMs: 0, coins: 0, speedPenaltyMs: 400 };
    state = applyNitroPickup(state, 'shield');
    state = applyNitroPickup(state, 'nitro');
    expect(state.shield).toBe(1);
    expect(state.boostMeter).toBeGreaterThan(10);
  });

  it('boost gain rewards speed and streak', () => {
    const slow = nitroBoostGain(true, 1700, 1, 'medium');
    const fast = nitroBoostGain(true, 650, 6, 'medium');
    expect(fast).toBeGreaterThan(slow);
  });
});

describe('LAN fairness seed', () => {
  it('keeps same seed in fair mode', () => {
    expect(fairNitroSeed(987654, 'fair')).toBe(987654);
  });

  it('changes seed in arcade mode', () => {
    expect(fairNitroSeed(987654, 'arcade')).not.toBe(987654);
  });
});
