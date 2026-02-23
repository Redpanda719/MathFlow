import { motion } from 'framer-motion';
import type { AchievementId, Profile } from '@shared/types';

const ACHIEVEMENT_META: Record<AchievementId, { title: string; description: string }> = {
  'multiplication-master': {
    title: 'Multiplication Master',
    description: 'Reach 90%+ mastery on all multiplication facts (1-12).'
  },
  'nitro-champion': {
    title: 'Nitro Champion',
    description: 'Win 10 Math Nitro races.'
  },
  'unstoppable-streak': {
    title: 'Unstoppable Streak',
    description: 'Hit a 20-answer correct streak.'
  },
  'lan-legend': {
    title: 'LAN Legend',
    description: 'Win any LAN match.'
  },
  'daily-driver': {
    title: 'Daily Driver',
    description: 'Play on 5 different days.'
  },
  'serpent-slayer': {
    title: 'Serpent Slayer',
    description: 'Score enough to defeat 25 serpents across matches.'
  },
  'perfect-predator': {
    title: 'Perfect Predator',
    description: 'Win a Math.io Serpents match without dying.'
  },
  'tower-commander': {
    title: 'Tower Commander',
    description: 'Clear wave 10 on hard in Math Tower Defense.'
  }
};

interface Props {
  profile: Profile;
  onBack: () => void;
}

export const AchievementsScreen = ({ profile, onBack }: Props) => (
  <div className="screen">
    <div className="topbar">
      <button className="ghost" onClick={onBack}>
        Back
      </button>
      <h2>Achievements</h2>
    </div>

    <section className="achievement-grid">
      {(Object.keys(ACHIEVEMENT_META) as AchievementId[]).map((id, idx) => {
        const progress = profile.stats.achievements[id];
        const meta = ACHIEVEMENT_META[id];
        return (
          <motion.article
            key={id}
            className={`card achievement ${progress.unlocked ? 'unlocked' : ''}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
          >
            <h3>{meta.title}</h3>
            <p>{meta.description}</p>
            <div className="achievement-footer">
              <strong>{progress.unlocked ? 'Unlocked' : 'Locked'}</strong>
              {progress.unlockedAt && <span>{new Date(progress.unlockedAt).toLocaleDateString()}</span>}
            </div>
          </motion.article>
        );
      })}
    </section>
  </div>
);
