export const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export const factKey = (a: number, b: number): string => `${Math.min(a, b)}x${Math.max(a, b)}`;

export const randomPick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

export const weightedRandom = <T>(items: Array<{ item: T; weight: number }>): T => {
  const total = items.reduce((sum, x) => sum + x.weight, 0);
  let roll = Math.random() * total;
  for (const x of items) {
    roll -= x.weight;
    if (roll <= 0) return x.item;
  }
  return items[items.length - 1].item;
};

export type RNG = () => number;

export const createSeededRng = (seed: number): RNG => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

export const randomPickWith = <T>(items: T[], rng: RNG = Math.random): T => items[Math.floor(rng() * items.length)];

export const weightedRandomWith = <T>(items: Array<{ item: T; weight: number }>, rng: RNG = Math.random): T => {
  const total = items.reduce((sum, x) => sum + x.weight, 0);
  let roll = rng() * total;
  for (const x of items) {
    roll -= x.weight;
    if (roll <= 0) return x.item;
  }
  return items[items.length - 1].item;
};
