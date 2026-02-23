import { createSeededRng } from './utils.js';
import { nitroBalanceForTier } from './gameplayBalance.js';
export const seededNitroPattern = (seed, count, tier) => {
    const rng = createSeededRng(seed);
    const balance = nitroBalanceForTier(tier);
    const out = [];
    for (let i = 0; i < count; i += 1) {
        const lane = Math.floor(rng() * 3);
        const kindRoll = rng();
        if (kindRoll < 0.62) {
            out.push({
                id: `h-${i}`,
                lane,
                x: 110 + i * (6 + Math.floor(rng() * 3)),
                type: balance.hazardTypes[Math.floor(rng() * balance.hazardTypes.length)],
                kind: 'hazard'
            });
        }
        else if (kindRoll < 0.84) {
            out.push({
                id: `p-${i}`,
                lane,
                x: 110 + i * (6 + Math.floor(rng() * 3)),
                type: balance.powerupTypes[Math.floor(rng() * balance.powerupTypes.length)],
                kind: 'powerup'
            });
        }
        else {
            out.push({
                id: `c-${i}`,
                lane,
                x: 110 + i * (6 + Math.floor(rng() * 3)),
                type: 'coin',
                kind: 'coin'
            });
        }
    }
    return out;
};
export const applyNitroPickup = (state, pickupType) => {
    if (pickupType === 'shield')
        return { ...state, shield: Math.min(2, state.shield + 1) };
    if (pickupType === 'magnet')
        return { ...state, magnetMs: Math.max(1800, state.magnetMs + 1200) };
    if (pickupType === 'nitro')
        return { ...state, boostMeter: Math.min(100, state.boostMeter + 45) };
    if (pickupType === 'repair')
        return { ...state, speedPenaltyMs: Math.max(0, state.speedPenaltyMs - 700) };
    return state;
};
export const nitroBoostGain = (correct, responseMs, streak, tier) => {
    if (!correct)
        return 0;
    const balance = nitroBalanceForTier(tier);
    const speedBonus = Math.max(0, (2200 - responseMs) / 110);
    const streakBonus = Math.min(14, streak * 1.35);
    return Math.max(10, Math.round(balance.boostGain * 0.4 + speedBonus + streakBonus));
};
export const fairNitroSeed = (roomSeed, mode) => {
    return mode === 'fair' ? roomSeed : roomSeed ^ 0x5f3759df;
};
