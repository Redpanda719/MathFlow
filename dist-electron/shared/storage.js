import { DEFAULT_SETTINGS } from './constants.js';
const PROFILE_KEY = 'mathflow.profile.v1';
const GAME_IDS = [
    'math-nitro',
    'math-tower-defense',
    'math-io-serpents'
];
const ACHIEVEMENT_IDS = [
    'multiplication-master',
    'nitro-champion',
    'unstoppable-streak',
    'lan-legend',
    'daily-driver',
    'serpent-slayer',
    'perfect-predator',
    'tower-commander'
];
const blankGameStats = () => ({
    plays: 0,
    bestScore: 0,
    bestAccuracy: 0,
    bestStreak: 0,
    bestSpeedMs: 0,
    lastPlayedAt: 0
});
const defaultGameStats = () => Object.fromEntries(GAME_IDS.map((id) => [id, blankGameStats()]));
const defaultAchievements = () => Object.fromEntries(ACHIEVEMENT_IDS.map((id) => [id, { unlocked: false }]));
export const createDefaultProfile = () => ({
    id: `local-${Date.now()}`,
    name: 'Player',
    avatarColor: '#3a8dde',
    settings: DEFAULT_SETTINGS,
    stats: {
        facts: {},
        bestStreak: 0,
        totalCorrect: 0,
        totalWrong: 0,
        lastPlayedAt: Date.now(),
        gameStats: defaultGameStats(),
        achievements: defaultAchievements(),
        playedDays: [],
        lanWins: 0,
        nitroWins: 0,
        coins: 0,
        inventory: {
            cars: ['car-red'],
            skins: ['skin-default'],
            equippedCar: 'car-red',
            equippedSkin: 'skin-default'
        }
    }
});
export const loadProfile = () => {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw)
        return createDefaultProfile();
    try {
        const parsed = JSON.parse(raw);
        const settingsMerged = {
            ...DEFAULT_SETTINGS,
            ...parsed.settings
        };
        const sanitizedTables = [...new Set((settingsMerged.difficulty?.tables ?? []).filter((n) => n >= 1 && n <= 12))];
        settingsMerged.difficulty = {
            ...DEFAULT_SETTINGS.difficulty,
            ...settingsMerged.difficulty,
            tables: sanitizedTables.length ? sanitizedTables : [...DEFAULT_SETTINGS.difficulty.tables]
        };
        return {
            ...createDefaultProfile(),
            ...parsed,
            stats: {
                ...createDefaultProfile().stats,
                ...parsed.stats,
                gameStats: {
                    ...defaultGameStats(),
                    ...(parsed.stats?.gameStats ?? {}),
                    'math-tower-defense': parsed.stats?.gameStats?.['math-tower-defense'] ??
                        parsed.stats?.gameStats?.['math-defender'] ??
                        blankGameStats(),
                    'math-io-serpents': parsed.stats?.gameStats?.['math-io-serpents'] ??
                        parsed.stats?.gameStats?.['math-snake'] ??
                        blankGameStats()
                },
                achievements: {
                    ...defaultAchievements(),
                    ...(parsed.stats?.achievements ?? {})
                },
                playedDays: parsed.stats?.playedDays ?? [],
                lanWins: parsed.stats?.lanWins ?? 0,
                nitroWins: parsed.stats?.nitroWins ?? 0,
                coins: Math.max(0, parsed.stats?.coins ?? 0),
                inventory: {
                    cars: [...new Set(['car-red', ...(parsed.stats?.inventory?.cars ?? [])])],
                    skins: [...new Set(['skin-default', ...(parsed.stats?.inventory?.skins ?? [])])],
                    equippedCar: parsed.stats?.inventory?.equippedCar && [...new Set(['car-red', ...(parsed.stats?.inventory?.cars ?? [])])].includes(parsed.stats.inventory.equippedCar)
                        ? parsed.stats.inventory.equippedCar
                        : 'car-red',
                    equippedSkin: parsed.stats?.inventory?.equippedSkin &&
                        [...new Set(['skin-default', ...(parsed.stats?.inventory?.skins ?? [])])].includes(parsed.stats.inventory.equippedSkin)
                        ? parsed.stats.inventory.equippedSkin
                        : 'skin-default'
                }
            },
            settings: {
                ...settingsMerged
            }
        };
    }
    catch {
        return createDefaultProfile();
    }
};
export const saveProfile = (profile) => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};
export const updateSettings = (settings) => {
    const profile = loadProfile();
    const next = {
        ...profile,
        settings: {
            ...profile.settings,
            ...settings
        }
    };
    saveProfile(next);
    return next;
};
