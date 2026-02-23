import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import Confetti from 'react-confetti';
import { questionHint } from '@shared/questions';
import type { LibraryGameId } from '@shared/types';
import { Keypad } from './components/Keypad';
import { GameHUD } from './components/GameHUD';
import { MasteryGrid } from './components/MasteryGrid';
import { SettingsPanel } from './components/SettingsPanel';
import { ScreenErrorBoundary } from './components/ScreenErrorBoundary';
import { LanScreen } from './screens/LanScreen';
import { GamesLibraryScreen } from './screens/GamesLibraryScreen';
import { GameDetailScreen, type GameConfigState } from './screens/GameDetailScreen';
import { MiniGameScreen } from './screens/MiniGameScreen';
import { AchievementsScreen } from './screens/AchievementsScreen';
import { ShopScreen } from './screens/ShopScreen';
import { useAudio } from './hooks/useAudio';
import { useGameEngine } from './hooks/useGameEngine';
import { useProfileStore } from './hooks/useProfileStore';

const screens = ['home', 'practice', 'sprint', 'settings', 'lan', 'games', 'game-detail', 'game-play', 'achievements', 'shop'] as const;
type Screen = (typeof screens)[number];

export const App = () => {
  const [screen, setScreen] = useState<Screen>('home');
  const [showHints, setShowHints] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [selectedGame, setSelectedGame] = useState<LibraryGameId>('math-nitro');
  const [gameConfig, setGameConfig] = useState<GameConfigState>({ difficulty: 'medium', timed: true, roundLength: 90 });

  const {
    profile,
    hydrated,
    hydrate,
    updateProfile,
    updateSettings,
    setDifficulty,
    recordAnswer,
    recordGameRound,
    evaluateAchievements,
    purchaseItem,
    equipItem
  } = useProfileStore();

  const audio = useAudio();
  const engine = useGameEngine(profile.settings, profile.stats.facts);

  useEffect(() => hydrate(), []);

  useEffect(() => {
    document.body.classList.toggle('high-contrast', profile.settings.highContrast);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const darkEnabled = profile.settings.darkMode === 'dark' || (profile.settings.darkMode === 'system' && prefersDark);
    document.body.classList.toggle('dark', darkEnabled);
    document.body.classList.toggle('reduced-motion', profile.settings.reducedMotion);
  }, [profile.settings.highContrast, profile.settings.darkMode, profile.settings.reducedMotion]);

  useEffect(() => {
    audio.setVolumes(profile.settings.musicVolume, profile.settings.sfxVolume, profile.settings.muteMusic, profile.settings.muteSfx);
  }, [profile.settings.musicVolume, profile.settings.sfxVolume, profile.settings.muteMusic, profile.settings.muteSfx]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!['practice', 'sprint'].includes(screen)) return;
      if (/^[0-9]$/.test(event.key)) engine.pushDigit(event.key);
      if (event.key === 'Backspace') engine.erase();
      if (event.key === 'Enter') onSubmitClassic();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    if (screen !== 'sprint') return;
    const interval = window.setInterval(() => {
      engine.setTimerLeft((current) => {
        if (current === null) return null;
        if (current <= 1) {
          clearInterval(interval);
          engine.finish();
          setScreen('home');
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [screen]);

  const weakFacts = useMemo(
    () =>
      Object.entries(profile.stats.facts)
        .map(([key, stat]) => ({ key, score: stat.correct / Math.max(1, stat.attempts), avgMs: stat.averageMs }))
        .sort((a, b) => a.score - b.score || b.avgMs - a.avgMs)
        .slice(0, 6),
    [profile.stats.facts]
  );

  if (!hydrated) return null;

  const startMode = (mode: 'practice' | 'sprint') => {
    audio.playClick();
    if (!audio.enabled) audio.enable();
    setShowHints(profile.settings.difficulty.hintsEnabled);
    engine.start(mode);
    setScreen(mode);
  };

  const onSubmitClassic = () => {
    const result = engine.submit();
    if (!result.accepted) return;
    recordAnswer(result.question.a, result.question.b, result.correct, result.responseMs);
    if (result.correct) {
      audio.playCorrect();
      if (engine.streak > 0 && (engine.streak + 1) % 10 === 0) {
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 1800);
      }
    } else {
      audio.playWrong();
    }
    evaluateAchievements();
  };

  const hint = engine.question ? questionHint(engine.question.a, engine.question.b) : null;

  return (
    <div className="app-shell">
      {!audio.enabled && (
        <button className="enable-audio" onClick={audio.enable}>
          Tap to enable sound
        </button>
      )}
      {celebrate && <Confetti recycle={false} numberOfPieces={120} />}

      <AnimatePresence mode="wait">
        <motion.main
          key={screen}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: profile.settings.reducedMotion ? 0 : 0.28 }}
        >
          {screen === 'home' && (
            <div className="screen">
              <header className="hero card">
                <div className="brand-lockup">
                  <img src="assets/branding/mathflow-logo.svg" alt="MathFlow logo" className="brand-logo" />
                  <h1>MathFlow</h1>
                </div>
                <p>Advanced multiplication challenge for facts 1 to 12.</p>
                <div className="hero-buttons hero-buttons-wide">
                  <button className="primary" onClick={() => startMode('practice')}>Practice</button>
                  <button className="primary" onClick={() => startMode('sprint')}>Timed Sprint</button>
                  <button className="primary" onClick={() => setScreen('lan')}>LAN Multiplayer</button>
                  <button className="primary" onClick={() => setScreen('games')}>Games</button>
                  <button className="primary" onClick={() => setScreen('shop')}>Shop</button>
                  <button className="ghost" onClick={() => setScreen('settings')}>Settings</button>
                </div>
              </header>

              <section className="dashboard">
                <GameHUD
                  score={profile.stats.totalCorrect * 10}
                  streak={profile.stats.bestStreak}
                  accuracy={(profile.stats.totalCorrect / Math.max(1, profile.stats.totalCorrect + profile.stats.totalWrong)) * 100}
                  timerLeft={null}
                  progress={`${profile.settings.difficulty.tables.join(', ')}`}
                />
                <MasteryGrid stats={profile.stats.facts} />
                <div className="card weak-facts">
                  <h3>Adaptive Targets</h3>
                  {weakFacts.map((fact) => (
                    <p key={fact.key}>
                      {fact.key}: {(fact.score * 100).toFixed(0)}% at {Math.round(fact.avgMs)}ms
                    </p>
                  ))}
                  {weakFacts.length === 0 && <p className="muted">Play a round to build your weak-fact map.</p>}
                </div>
              </section>
            </div>
          )}

          {(screen === 'practice' || screen === 'sprint') && engine.question && (
            <div className={`screen gameplay ${engine.feedback === 'wrong' ? 'shake' : ''}`}>
              <div className="topbar">
                <button className="ghost" onClick={() => setScreen('home')}>Exit</button>
                <h2>{screen === 'practice' ? 'Practice Mode' : 'Timed Sprint'}</h2>
              </div>
              <GameHUD
                score={engine.score}
                streak={engine.streak}
                accuracy={engine.accuracy}
                timerLeft={engine.timerLeft}
                progress={`${engine.answers.length + 1}`}
              />

              <div className="game-layout">
                <div className="question card">
                  <h1>{engine.question.a} x {engine.question.b}</h1>
                  {showHints && hint && (
                    <div className="hint-block">
                      <p>{hint.repeatedAddition}</p>
                      <p>{hint.groups}</p>
                    </div>
                  )}
                  <div className={`feedback ${engine.feedback || ''}`}>
                    {engine.feedback === 'correct' ? 'Correct!' : engine.feedback === 'wrong' ? 'Try again!' : 'Solve it!'}
                  </div>
                  <label className="toggle">
                    <input type="checkbox" checked={showHints} onChange={(e) => setShowHints(e.target.checked)} />
                    Show Hints
                  </label>
                </div>
                <Keypad
                  value={engine.answerText}
                  onDigit={(d) => {
                    audio.playClick();
                    engine.pushDigit(d);
                  }}
                  onClear={engine.clear}
                  onErase={engine.erase}
                  onSubmit={onSubmitClassic}
                />
              </div>
            </div>
          )}

          {screen === 'settings' && (
            <div className="screen">
              <div className="topbar">
                <button className="ghost" onClick={() => setScreen('home')}>Back</button>
                <h2>Settings</h2>
              </div>
              <SettingsPanel
                profile={profile}
                onUpdateProfile={updateProfile}
                onUpdateSettings={updateSettings}
                onSetDifficulty={setDifficulty}
              />
            </div>
          )}

          {screen === 'lan' && <LanScreen profile={profile} playClick={audio.playClick} onBack={() => setScreen('home')} />}

          {screen === 'games' && (
            <GamesLibraryScreen
              profile={profile}
              onBack={() => setScreen('home')}
              onOpenGame={(gameId) => {
                setSelectedGame(gameId);
                setScreen('game-detail');
              }}
              onOpenAchievements={() => setScreen('achievements')}
            />
          )}

          {screen === 'game-detail' && (
            <GameDetailScreen
              gameId={selectedGame}
              profile={profile}
              onBack={() => setScreen('games')}
              onPlay={(cfg) => {
                setGameConfig(cfg);
                setScreen('game-play');
              }}
            />
          )}

          {screen === 'game-play' && (
            <ScreenErrorBoundary title="Game Screen">
              <MiniGameScreen
                gameId={selectedGame}
                profile={profile}
                config={gameConfig}
                onBack={() => setScreen('games')}
                onSaveRound={(stats) => recordGameRound(selectedGame, stats)}
                onRecordGameAnswer={(a, b, isCorrect, responseMs) => recordAnswer(a, b, isCorrect, responseMs)}
                playClick={audio.playClick}
                playCorrect={audio.playCorrect}
                playWrong={audio.playWrong}
                playCountdown={audio.playCountdown}
                playVictory={audio.playVictory}
                startNitroLoop={audio.startNitroLoop}
                stopNitroLoop={audio.stopNitroLoop}
                setNitroIntensity={audio.setNitroIntensity}
                playGameAccent={audio.playGameAccent}
              />
            </ScreenErrorBoundary>
          )}

          {screen === 'shop' && (
            <ShopScreen
              profile={profile}
              onBack={() => setScreen('home')}
              onBuy={purchaseItem}
              onEquip={equipItem}
              playClick={audio.playClick}
            />
          )}

          {screen === 'achievements' && <AchievementsScreen profile={profile} onBack={() => setScreen('games')} />}
        </motion.main>
      </AnimatePresence>

      <footer className="footer">
        <span>Player: {profile.name}</span>
        <span>Difficulty: {profile.settings.difficulty.tier}</span>
        <span>Coins: {profile.stats.coins}</span>
        <span>Best streak: {profile.stats.bestStreak}</span>
        <span>Copyright © 2026 Redpanda719</span>
      </footer>
    </div>
  );
};
