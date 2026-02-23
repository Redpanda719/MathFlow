const tierScale = (tier) => {
    if (tier === 'easy')
        return 0.82;
    if (tier === 'hard')
        return 1.3;
    if (tier === 'custom')
        return 1.1;
    return 1;
};
export const nitroBalanceForTier = (tier) => {
    const scale = tierScale(tier);
    return {
        hazardTypes: ['oil', 'cone', 'pothole', 'slow-zone', 'barrier'],
        powerupTypes: ['shield', 'magnet', 'nitro', 'repair'],
        baseSpeed: 0.4 * scale,
        spawnMs: Math.max(520, 1050 / scale),
        boostGain: 24 * scale,
        wrongPenaltySpeedMs: Math.round(800 * scale)
    };
};
export const GAME_BALANCE = {
    'math-tower-defense': {
        levels: 10,
        hazards: ['armored-bot', 'swarm', 'jammer', 'boss'],
        powerups: ['bomb-strike', 'time-slow', 'repair'],
        intensity: 1
    },
    'math-io-serpents': {
        levels: 6,
        hazards: ['enemy-body', 'fog-wall', 'poison-orb'],
        powerups: ['boost', 'shield', 'magnet'],
        intensity: 1
    }
};
export const withDifficultyIntensity = (balance, tier) => {
    const scale = tierScale(tier);
    return {
        ...balance,
        intensity: balance.intensity * scale
    };
};
