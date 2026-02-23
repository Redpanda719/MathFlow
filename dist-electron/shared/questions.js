import { createSeededRng, factKey, randomPickWith, weightedRandomWith } from './utils.js';
const sanitizeTables = (tables) => {
    const normalized = [...new Set(tables.filter((n) => Number.isFinite(n) && n >= 1 && n <= 12))].sort((a, b) => a - b);
    return normalized.length ? normalized : [1, 2, 3, 4, 5, 6, 7, 8, 9];
};
const allPairs = (tables) => {
    const set = new Set(sanitizeTables(tables));
    const values = [...set].sort((a, b) => a - b);
    const maxFactor = Math.max(1, ...values);
    const pairs = [];
    for (const a of values) {
        for (let b = 1; b <= maxFactor; b += 1)
            pairs.push([a, b]);
    }
    return pairs;
};
const pairWeight = (a, b, weakFacts) => {
    const key = factKey(a, b);
    const stat = weakFacts[key];
    if (!stat || stat.attempts === 0)
        return 1;
    const accuracy = stat.correct / stat.attempts;
    const speedFactor = Math.min(stat.averageMs / 5000, 2);
    return 1 + (1 - accuracy) * 4 + speedFactor;
};
export const generateQuestion = ({ config, weakFacts, recentQuestionIds, mode, rng = Math.random }) => {
    const pairs = allPairs(config.tables);
    const recent = new Set(recentQuestionIds.slice(-8));
    const candidatePairs = pairs.filter(([a, b]) => !recent.has(`${a}x${b}`));
    const selectionPool = candidatePairs.length > 0 ? candidatePairs : pairs;
    let pair;
    if (mode === 'adaptive' || config.adaptive) {
        pair = weightedRandomWith(selectionPool.map(([a, b]) => ({
            item: [a, b],
            weight: pairWeight(a, b, weakFacts)
        })), rng);
    }
    else {
        pair = randomPickWith(selectionPool, rng);
    }
    const [a, b] = pair;
    return {
        id: `${Date.now()}-${Math.round(Math.random() * 100000)}-${a}-${b}`,
        a,
        b,
        answer: a * b,
        createdAt: Date.now()
    };
};
export const questionHint = (a, b) => ({
    repeatedAddition: `${a} + ${a} + ${a} ... (${b} times)`,
    groups: `${b} groups of ${a}`
});
export const generatePrompt = (pool, difficulty, rng = Math.random, index = 0) => {
    if (pool === 'multiplication') {
        const q = generateQuestion({ config: difficulty, weakFacts: {}, recentQuestionIds: [], mode: 'mixed', rng });
        return {
            id: `${pool}-${index}-${q.id}`,
            prompt: `${q.a} x ${q.b}`,
            answer: q.answer,
            meta: { a: q.a, b: q.b }
        };
    }
    if (pool === 'division') {
        const max = Math.max(9, ...sanitizeTables(difficulty.tables));
        const divisor = Math.floor(rng() * max) + 1;
        const quotient = Math.floor(rng() * max) + 1;
        const dividend = divisor * quotient;
        return {
            id: `${pool}-${index}-${dividend}-${divisor}`,
            prompt: `${dividend} ÷ ${divisor}`,
            answer: quotient
        };
    }
    if (pool === 'fractions') {
        const denominator = Math.floor(rng() * 6) + 3;
        const n1 = Math.floor(rng() * (denominator - 1)) + 1;
        const n2 = Math.floor(rng() * (denominator - 1)) + 1;
        return {
            id: `${pool}-${index}-${n1}-${n2}-${denominator}`,
            prompt: `${n1}/${denominator} + ${n2}/${denominator} = ?/${denominator}`,
            answer: n1 + n2
        };
    }
    if (pool === 'sequence') {
        const start = Math.floor(rng() * 12) + 2;
        const step = Math.floor(rng() * 8) + 2;
        const next = start + step * 3;
        return {
            id: `${pool}-${index}-${start}-${step}`,
            prompt: `${start}, ${start + step}, ${start + step * 2}, ?`,
            answer: next
        };
    }
    const side = Math.floor(rng() * 9) + 2;
    return {
        id: `${pool}-${index}-${side}`,
        prompt: `Area of square with side ${side}?`,
        answer: side * side
    };
};
export const buildSeededPromptStream = (seed, count, pool, difficulty) => {
    const rng = createSeededRng(seed);
    const prompts = [];
    for (let i = 0; i < count; i += 1)
        prompts.push(generatePrompt(pool, difficulty, rng, i));
    return prompts;
};
