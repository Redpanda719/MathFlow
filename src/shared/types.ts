export type DifficultyTier = 'easy' | 'medium' | 'hard' | 'custom';
export type GameMode = 'practice' | 'sprint' | 'duel' | 'party';
export type LibraryGameId =
  | 'math-nitro'
  | 'math-tower-defense'
  | 'math-io-serpents';

export interface FactKey {
  a: number;
  b: number;
}

export interface Question {
  id: string;
  a: number;
  b: number;
  answer: number;
  createdAt: number;
}

export interface WeakFactStats {
  attempts: number;
  correct: number;
  averageMs: number;
  lastSeen: number;
}

export type FactStatsMap = Record<string, WeakFactStats>;

export interface DifficultyConfig {
  tier: DifficultyTier;
  tables: number[];
  timerSeconds?: number;
  perQuestionSeconds?: number;
  hintsEnabled: boolean;
  wrongPenalty: number;
  rounds: number;
  adaptive: boolean;
}

export interface Settings {
  difficulty: DifficultyConfig;
  darkMode: 'system' | 'light' | 'dark';
  highContrast: boolean;
  reducedMotion: boolean;
  basePoints: number;
  speedMultiplier: number;
  streakMultiplier: number;
  musicVolume: number;
  sfxVolume: number;
  muteMusic: boolean;
  muteSfx: boolean;
}

export interface Profile {
  id: string;
  name: string;
  avatarColor: string;
  settings: Settings;
  stats: {
    facts: FactStatsMap;
    bestStreak: number;
    totalCorrect: number;
    totalWrong: number;
    lastPlayedAt: number;
    gameStats: Record<LibraryGameId, GameStats>;
    achievements: Record<AchievementId, AchievementProgress>;
    playedDays: string[];
    lanWins: number;
    nitroWins: number;
    coins: number;
    inventory: {
      cars: string[];
      skins: string[];
      equippedCar: string;
      equippedSkin: string;
    };
  };
}

export interface GameStats {
  plays: number;
  bestScore: number;
  bestAccuracy: number;
  bestStreak: number;
  bestSpeedMs: number;
  lastPlayedAt: number;
}

export type AchievementId =
  | 'multiplication-master'
  | 'nitro-champion'
  | 'unstoppable-streak'
  | 'lan-legend'
  | 'daily-driver'
  | 'serpent-slayer'
  | 'perfect-predator'
  | 'tower-commander';

export interface AchievementProgress {
  unlocked: boolean;
  unlockedAt?: number;
}

export interface RoundStats {
  correct: number;
  wrong: number;
  accuracy: number;
  averageResponseMs: number;
  streak: number;
  bestStreak: number;
  score: number;
}

export interface AnswerEvent {
  questionId: string;
  value: number;
  responseMs: number;
  submittedAt: number;
}

export interface PlayerState {
  id: string;
  name: string;
  color: string;
  score: number;
  correct: number;
  wrong: number;
  streak: number;
  bestStreak: number;
  avgMs: number;
  ready: boolean;
  connected: boolean;
}

export interface NetworkRoomInfo {
  roomCode: string;
  hostName: string;
  hostIp: string;
  wsPort: number;
  mode: Extract<GameMode, 'duel' | 'party'> | 'nitro' | 'serpents';
  maxPlayers: number;
}

export interface LobbyState {
  room: NetworkRoomInfo;
  players: PlayerState[];
  started: boolean;
}

export interface MultiplayerConfig {
  mode: Extract<GameMode, 'duel' | 'party'> | 'nitro' | 'serpents';
  timerSeconds: number;
  questionCount: number;
  difficulty: DifficultyConfig;
  seed?: number;
  raceMode?: 'fair' | 'arcade';
}
