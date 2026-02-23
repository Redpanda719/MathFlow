export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const factKey = (a, b) => `${Math.min(a, b)}x${Math.max(a, b)}`;
export const randomPick = (items) => items[Math.floor(Math.random() * items.length)];
export const weightedRandom = (items) => {
    const total = items.reduce((sum, x) => sum + x.weight, 0);
    let roll = Math.random() * total;
    for (const x of items) {
        roll -= x.weight;
        if (roll <= 0)
            return x.item;
    }
    return items[items.length - 1].item;
};
export const createSeededRng = (seed) => {
    let state = seed >>> 0;
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 4294967296;
    };
};
export const randomPickWith = (items, rng = Math.random) => items[Math.floor(rng() * items.length)];
export const weightedRandomWith = (items, rng = Math.random) => {
    const total = items.reduce((sum, x) => sum + x.weight, 0);
    let roll = rng() * total;
    for (const x of items) {
        roll -= x.weight;
        if (roll <= 0)
            return x.item;
    }
    return items[items.length - 1].item;
};
