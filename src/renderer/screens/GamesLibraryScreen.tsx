import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import { GAME_LIBRARY } from '@shared/games';
import type { LibraryGameId, Profile } from '@shared/types';

interface Props {
  profile: Profile;
  onBack: () => void;
  onOpenGame: (gameId: LibraryGameId) => void;
  onOpenAchievements: () => void;
}

export const GamesLibraryScreen = ({ profile, onBack, onOpenGame, onOpenAchievements }: Props) => (
  <div className="screen">
    <div className="topbar">
      <button className="ghost" onClick={onBack}>
        Back
      </button>
      <h2>Games Library</h2>
      <button className="ghost" onClick={onOpenAchievements}>
        Achievements
      </button>
    </div>

    <section className="game-library-grid">
      {GAME_LIBRARY.map((game, idx) => {
        const stats = profile.stats.gameStats[game.id];
        return (
          <motion.article
            key={game.id}
            className="card game-card"
            style={{ '--accent': game.accent } as CSSProperties}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
          >
            <div className="game-card-header">
              <h3>{game.title}</h3>
              <span>{game.subtitle}</span>
            </div>
            <p>{game.description}</p>
            <div className="game-tags">
              {game.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <div className="game-metrics">
              <small>Best Score: {stats.bestScore}</small>
              <small>Best Accuracy: {stats.bestAccuracy.toFixed(0)}%</small>
            </div>
            <div className="game-card-actions">
              <button className="ghost" onClick={() => onOpenGame(game.id)}>
                Details
              </button>
              <button className="primary" onClick={() => onOpenGame(game.id)}>
                Quick Play
              </button>
            </div>
          </motion.article>
        );
      })}
    </section>
  </div>
);
