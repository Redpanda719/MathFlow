import { useState } from 'react';
import { GAME_BY_ID } from '@shared/games';
import type { DifficultyTier, LibraryGameId, Profile } from '@shared/types';

interface GameConfigState {
  difficulty: DifficultyTier;
  timed: boolean;
  roundLength: number;
}

interface Props {
  gameId: LibraryGameId;
  profile: Profile;
  onBack: () => void;
  onPlay: (config: GameConfigState) => void;
}

export const GameDetailScreen = ({ gameId, profile, onBack, onPlay }: Props) => {
  const game = GAME_BY_ID[gameId] ?? {
    id: gameId,
    title: 'Game',
    subtitle: '',
    description: 'Game details are unavailable.',
    rules: [],
    tags: ['easy', 'medium', 'hard', 'custom'] as DifficultyTier[],
    accent: '#3a8dde'
  };
  const stats = profile.stats.gameStats[gameId];
  const [config, setConfig] = useState<GameConfigState>({ difficulty: profile.settings.difficulty.tier, timed: true, roundLength: 90 });

  return (
    <div className="screen">
      <div className="topbar">
        <button className="ghost" onClick={onBack}>
          Back
        </button>
        <h2>{game.title}</h2>
      </div>

      <section className="card game-detail">
        <p className="lead">{game.description}</p>
        <h4>Rules</h4>
        {game.rules.map((rule) => (
          <p key={rule}>• {rule}</p>
        ))}

        <h4>Configuration</h4>
        <label>
          Difficulty
          <select
            value={config.difficulty}
            onChange={(e) => setConfig((c) => ({ ...c, difficulty: e.target.value as DifficultyTier }))}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={config.timed} onChange={(e) => setConfig((c) => ({ ...c, timed: e.target.checked }))} />
          Timed Mode
        </label>
        <label>
          Round Length
          <select value={config.roundLength} onChange={(e) => setConfig((c) => ({ ...c, roundLength: Number(e.target.value) }))}>
            <option value={60}>60s</option>
            <option value={90}>90s</option>
            <option value={120}>120s</option>
          </select>
        </label>

        <div className="game-metrics">
          <small>Best Score: {stats.bestScore}</small>
          <small>Best Accuracy: {stats.bestAccuracy.toFixed(0)}%</small>
          <small>Best Streak: {stats.bestStreak}</small>
        </div>

        <button className="primary" onClick={() => onPlay(config)}>
          Play {game.title}
        </button>
      </section>
    </div>
  );
};

export type { GameConfigState };
