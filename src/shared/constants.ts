import type { DifficultyConfig, Settings } from './types.js';

export const DEFAULT_DIFFICULTIES: Record<'easy' | 'medium' | 'hard', DifficultyConfig> = {
  easy: {
    tier: 'easy',
    tables: [1, 2, 3, 4, 5],
    timerSeconds: 120,
    perQuestionSeconds: 12,
    hintsEnabled: true,
    wrongPenalty: 0,
    rounds: 1,
    adaptive: false
  },
  medium: {
    tier: 'medium',
    tables: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    timerSeconds: 90,
    perQuestionSeconds: 8,
    hintsEnabled: true,
    wrongPenalty: 2,
    rounds: 1,
    adaptive: true
  },
  hard: {
    tier: 'hard',
    tables: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    timerSeconds: 60,
    perQuestionSeconds: 5,
    hintsEnabled: false,
    wrongPenalty: 5,
    rounds: 2,
    adaptive: true
  }
};

export const DEFAULT_SETTINGS: Settings = {
  difficulty: DEFAULT_DIFFICULTIES.medium,
  darkMode: 'system',
  highContrast: false,
  reducedMotion: false,
  basePoints: 50,
  speedMultiplier: 0.04,
  streakMultiplier: 8,
  musicVolume: 0.25,
  sfxVolume: 0.8,
  muteMusic: false,
  muteSfx: false
};

export const FACT_RANGE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
