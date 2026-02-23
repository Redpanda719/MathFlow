import { create } from 'zustand';
import { DEFAULT_SETTINGS } from '@shared/constants';
import { createDefaultProfile, loadProfile, saveProfile } from '@shared/storage';
import { SHOP_BY_ID } from '@shared/shop';
import { factKey } from '@shared/utils';
import type { AchievementId, DifficultyConfig, LibraryGameId, Profile, Settings } from '@shared/types';

interface ProfileState {
  profile: Profile;
  hydrated: boolean;
  hydrate: () => void;
  updateProfile: (data: Partial<Pick<Profile, 'name' | 'avatarColor'>>) => void;
  updateSettings: (data: Partial<Settings>) => void;
  setDifficulty: (difficulty: DifficultyConfig) => void;
  recordAnswer: (a: number, b: number, correct: boolean, responseMs: number) => void;
  recordGameRound: (
    gameId: LibraryGameId,
    data: { score: number; accuracy: number; bestStreak: number; averageMs: number; correct?: number; wrong?: number; won?: boolean; wasLan?: boolean }
  ) => void;
  unlockAchievement: (achievementId: AchievementId) => void;
  evaluateAchievements: () => void;
  purchaseItem: (itemId: string) => { ok: boolean; reason?: string };
  equipItem: (itemId: string) => { ok: boolean; reason?: string };
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: createDefaultProfile(),
  hydrated: false,
  hydrate: () => {
    const profile = loadProfile();
    set({ profile, hydrated: true });
  },
  updateProfile: (data) => {
    const profile = { ...get().profile, ...data };
    saveProfile(profile);
    set({ profile });
  },
  updateSettings: (data) => {
    const profile = {
      ...get().profile,
      settings: {
        ...DEFAULT_SETTINGS,
        ...get().profile.settings,
        ...data
      }
    };
    saveProfile(profile);
    set({ profile });
  },
  setDifficulty: (difficulty) => {
    const profile = {
      ...get().profile,
      settings: {
        ...get().profile.settings,
        difficulty
      }
    };
    saveProfile(profile);
    set({ profile });
  },
  recordAnswer: (a, b, correct, responseMs) => {
    const profile = { ...get().profile };
    const key = factKey(a, b);
    const existing = profile.stats.facts[key] ?? {
      attempts: 0,
      correct: 0,
      averageMs: 0,
      lastSeen: 0
    };
    const attempts = existing.attempts + 1;
    profile.stats.facts[key] = {
      attempts,
      correct: existing.correct + (correct ? 1 : 0),
      averageMs: (existing.averageMs * existing.attempts + responseMs) / attempts,
      lastSeen: Date.now()
    };
    profile.stats.totalCorrect += correct ? 1 : 0;
    profile.stats.totalWrong += correct ? 0 : 1;
    if (correct) profile.stats.coins += 1;
    profile.stats.lastPlayedAt = Date.now();
    saveProfile(profile);
    set({ profile });
  },
  recordGameRound: (gameId, data) => {
    const profile = { ...get().profile };
    const existing = profile.stats.gameStats[gameId];
    const playedAt = Date.now();
    const dayKey = new Date(playedAt).toISOString().slice(0, 10);
    if (!profile.stats.playedDays.includes(dayKey)) {
      profile.stats.playedDays = [...profile.stats.playedDays.slice(-10), dayKey];
    }

    profile.stats.gameStats[gameId] = {
      ...existing,
      plays: existing.plays + 1,
      bestScore: Math.max(existing.bestScore, data.score),
      bestAccuracy: Math.max(existing.bestAccuracy, data.accuracy),
      bestStreak: Math.max(existing.bestStreak, data.bestStreak),
      bestSpeedMs: existing.bestSpeedMs > 0 ? Math.min(existing.bestSpeedMs, data.averageMs) : data.averageMs,
      lastPlayedAt: playedAt
    };

    if (data.won && gameId === 'math-nitro') profile.stats.nitroWins += 1;
    if (data.won && data.wasLan) profile.stats.lanWins += 1;
    profile.stats.bestStreak = Math.max(profile.stats.bestStreak, data.bestStreak);
    const earn = Math.max(
      8,
      Math.round(data.score * 0.05 + data.accuracy * 0.35 + (data.bestStreak >= 10 ? 8 : 0) + (data.won ? 20 : 0))
    );
    profile.stats.coins += earn;

    saveProfile(profile);
    set({ profile });
    get().evaluateAchievements();
  },
  unlockAchievement: (achievementId) => {
    const profile = { ...get().profile };
    const current = profile.stats.achievements[achievementId];
    if (current.unlocked) return;
    profile.stats.achievements[achievementId] = { unlocked: true, unlockedAt: Date.now() };
    saveProfile(profile);
    set({ profile });
  },
  evaluateAchievements: () => {
    const { profile } = get();
    const facts = Object.values(profile.stats.facts);
    const allMastered =
      facts.length >= 144 &&
      facts.every((fact) => fact.attempts > 0 && fact.correct / Math.max(1, fact.attempts) >= 0.9);
    if (allMastered) get().unlockAchievement('multiplication-master');
    if (profile.stats.nitroWins >= 10) get().unlockAchievement('nitro-champion');
    if (profile.stats.bestStreak >= 20) get().unlockAchievement('unstoppable-streak');
    if (profile.stats.lanWins >= 1) get().unlockAchievement('lan-legend');
    if (profile.stats.playedDays.length >= 5) get().unlockAchievement('daily-driver');
    if (profile.stats.gameStats['math-io-serpents'].bestScore >= 250) get().unlockAchievement('serpent-slayer');
    if (
      profile.stats.gameStats['math-io-serpents'].bestAccuracy >= 95 &&
      profile.stats.gameStats['math-io-serpents'].bestStreak >= 15
    ) {
      get().unlockAchievement('perfect-predator');
    }
    if (profile.stats.gameStats['math-tower-defense'].bestScore >= 2000) get().unlockAchievement('tower-commander');
  },
  purchaseItem: (itemId) => {
    const item = SHOP_BY_ID[itemId];
    if (!item) return { ok: false, reason: 'Item not found.' };
    const profile = { ...get().profile };
    const owned = item.type === 'car' ? profile.stats.inventory.cars : profile.stats.inventory.skins;
    if (owned.includes(itemId)) return { ok: false, reason: 'Already owned.' };
    if (profile.stats.coins < item.price) return { ok: false, reason: 'Not enough coins.' };

    profile.stats.coins -= item.price;
    if (item.type === 'car') profile.stats.inventory.cars = [...profile.stats.inventory.cars, itemId];
    if (item.type === 'skin') profile.stats.inventory.skins = [...profile.stats.inventory.skins, itemId];
    saveProfile(profile);
    set({ profile });
    return { ok: true };
  },
  equipItem: (itemId) => {
    const item = SHOP_BY_ID[itemId];
    if (!item) return { ok: false, reason: 'Item not found.' };
    const profile = { ...get().profile };
    if (item.type === 'car' && !profile.stats.inventory.cars.includes(itemId)) return { ok: false, reason: 'Car locked.' };
    if (item.type === 'skin' && !profile.stats.inventory.skins.includes(itemId)) return { ok: false, reason: 'Skin locked.' };

    if (item.type === 'car') profile.stats.inventory.equippedCar = itemId;
    if (item.type === 'skin') profile.stats.inventory.equippedSkin = itemId;
    saveProfile(profile);
    set({ profile });
    return { ok: true };
  }
}));
