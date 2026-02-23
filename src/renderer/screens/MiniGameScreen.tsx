import { useEffect, useMemo, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import { buildSeededPromptStream, generatePrompt, type MathPrompt } from '@shared/questions';
import { DEFAULT_DIFFICULTIES } from '@shared/constants';
import { calculateAnswerPoints } from '@shared/scoring';
import { GAME_BY_ID } from '@shared/games';
import { GAME_BALANCE, nitroBalanceForTier, withDifficultyIntensity } from '@shared/gameplayBalance';
import { fairNitroSeed, nitroBoostGain } from '@shared/gameplayLogic';
import { useLan } from '@renderer/hooks/useLan';
import { PixiGameScene } from '@renderer/components/PixiGameScene';
import type { DifficultyConfig, DifficultyTier, LibraryGameId, Profile } from '@shared/types';
import type { GameConfigState } from './GameDetailScreen';

interface Props {
  gameId: LibraryGameId;
  profile: Profile;
  config: GameConfigState;
  onBack: () => void;
  onSaveRound: (data: { score: number; accuracy: number; bestStreak: number; averageMs: number; correct?: number; wrong?: number; won?: boolean; wasLan?: boolean }) => void;
  onRecordGameAnswer?: (a: number, b: number, correct: boolean, responseMs: number) => void;
  playClick: () => void;
  playCorrect: () => void;
  playWrong: () => void;
  playCountdown: () => void;
  playVictory: () => void;
  startNitroLoop: () => void;
  stopNitroLoop: () => void;
  setNitroIntensity: (value: number) => void;
  playGameAccent: (gameId: string, success: boolean) => void;
}

interface Racer {
  id: string;
  name: string;
  distance: number;
  index: number;
  correct: number;
  wrong: number;
  streak: number;
  bestStreak: number;
  avgMs: number;
  ai: boolean;
  skill?: 'beginner' | 'normal' | 'expert' | 'cheater';
  nextActionAt?: number;
}

interface SerpentState {
  worldSize: number;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  speed: number;
  mass: number;
  alive: boolean;
  kills: number;
  abilityBoost: number;
  abilityShield: number;
  abilityMagnet: number;
  boostMs: number;
  shieldMs: number;
  magnetMs: number;
}

interface AISerpent {
  id: string;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  speed: number;
  mass: number;
  alive: boolean;
}

interface Pellet {
  id: string;
  x: number;
  y: number;
  value: number;
}

interface TowerPad {
  id: string;
  lane: number;
  type: 'empty' | 'cannon' | 'frost' | 'lightning';
  cannonType?: 'standard' | 'heavy' | 'burst';
  level: number;
  cooldownMs: number;
  targetMode: 'first' | 'last' | 'strong';
}

interface Creep {
  id: string;
  lane: number;
  progress: number;
  hp: number;
  speed: number;
  kind: 'slime' | 'bug' | 'bot' | 'boss';
  slowMs: number;
}

interface TDState {
  map: 'meadow' | 'canyon' | 'neon';
  wave: number;
  lives: number;
  gold: number;
  energy: number;
  damageDone: number;
  wavesCleared: number;
  speed: 1 | 2;
  pads: TowerPad[];
  creeps: Creep[];
  spawnTimerMs: number;
  freezeMs: number;
  cooldownBombMs: number;
  cooldownFreezeMs: number;
  cooldownRepairMs: number;
}

interface TDProjectile {
  id: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
  speed: number;
  lane: number;
}

interface TDEffect {
  id: string;
  x: number;
  y: number;
  frame: number;
  msLeft: number;
  type: 'muzzle' | 'explosion';
}

interface TowerDragState {
  active: boolean;
  x: number;
  y: number;
  padId?: string;
  valid: boolean;
}

const difficultyFromTier = (tier: DifficultyTier, fallback: DifficultyConfig): DifficultyConfig => {
  if (tier === 'easy') return DEFAULT_DIFFICULTIES.easy;
  if (tier === 'medium') return DEFAULT_DIFFICULTIES.medium;
  if (tier === 'hard') return DEFAULT_DIFFICULTIES.hard;
  return fallback;
};

const aiProfile = (skill: Racer['skill']) => {
  if (skill === 'beginner') return { min: 1300, max: 2400, accuracy: 0.65 };
  if (skill === 'expert') return { min: 560, max: 1100, accuracy: 0.9 };
  if (skill === 'cheater') return { min: 260, max: 520, accuracy: 0.97 };
  return { min: 850, max: 1550, accuracy: 0.8 };
};

const randomDir = (): { x: number; y: number } => {
  const a = Math.random() * Math.PI * 2;
  return { x: Math.cos(a), y: Math.sin(a) };
};

const randomPellet = (worldSize: number, idx: number): Pellet => ({
  id: `pl-${idx}-${Math.random().toString(36).slice(2, 7)}`,
  x: 80 + Math.random() * (worldSize - 160),
  y: 80 + Math.random() * (worldSize - 160),
  value: 2 + Math.floor(Math.random() * 4)
});

const clusteredPellets = (worldSize: number, cx: number, cy: number, count: number): Pellet[] => {
  const clustered = Array.from({ length: count }).map((_, i) => ({
    id: `cl-${i}-${Math.random().toString(36).slice(2, 7)}`,
    x: Math.max(60, Math.min(worldSize - 60, cx + (Math.random() - 0.5) * 320)),
    y: Math.max(60, Math.min(worldSize - 60, cy + (Math.random() - 0.5) * 320)),
    value: 3 + Math.floor(Math.random() * 5)
  }));
  const background = Array.from({ length: Math.max(0, count + 120) }).map((_, i) => randomPellet(worldSize, i + count));
  return [...clustered, ...background];
};

export const MiniGameScreen = ({
  gameId,
  profile,
  config,
  onBack,
  onSaveRound,
  onRecordGameAnswer,
  playClick,
  playCorrect,
  playWrong,
  playCountdown,
  playVictory,
  startNitroLoop,
  stopNitroLoop,
  setNitroIntensity,
  playGameAccent
}: Props) => {
  const isNitro = gameId === 'math-nitro';
  const isSerpents = gameId === 'math-io-serpents';
  const isTower = gameId === 'math-tower-defense';
  const lanCapable = isNitro || isSerpents;

  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [responses, setResponses] = useState<number[]>([]);
  const [phase, setPhase] = useState<'play' | 'summary'>('play');
  const [paused, setPaused] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(true);
  const [timeLeft, setTimeLeft] = useState(config.timed ? config.roundLength : 9999);
  const [promptSeenAt, setPromptSeenAt] = useState(Date.now());

  const difficulty = useMemo(
    () => difficultyFromTier(config.difficulty, profile.settings.difficulty),
    [config.difficulty, profile.settings.difficulty]
  );

  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000_000));
  const [prompts] = useState<MathPrompt[]>(() => buildSeededPromptStream(seed, 160, 'multiplication', difficulty));
  const [index, setIndex] = useState(0);
  const currentPrompt = prompts[Math.min(index, prompts.length - 1)] ?? generatePrompt('multiplication', difficulty);
  const [forcedQuiz, setForcedQuiz] = useState({ active: false, remaining: 5, nextAt: Date.now() + 30_000 });

  const [matchMode, setMatchMode] = useState<'solo' | 'lan'>('solo');

  const [raceLength, setRaceLength] = useState<30 | 50 | 80>(30);
  const [raceMode, setRaceMode] = useState<'fair' | 'arcade'>('fair');
  const [nitroTheme, setNitroTheme] = useState<'stadium-day' | 'neon-night' | 'desert-rally'>('stadium-day');
  const [nitroBoostMeter, setNitroBoostMeter] = useState(0);
  const [nitroBoostMs, setNitroBoostMs] = useState(0);
  const [nitroBursts, setNitroBursts] = useState(2);
  const [aiPack, setAiPack] = useState<Array<Racer['skill']>>(['beginner', 'normal', 'expert']);
  const [aiSkill, setAiSkill] = useState<Racer['skill']>('normal');
  const [aiCount, setAiCount] = useState(3);
  const [racers, setRacers] = useState<Racer[]>([]);

  const [serpentsTheme, setSerpentsTheme] = useState<'meadow' | 'neon' | 'desert'>('meadow');
  const [serpent, setSerpent] = useState<SerpentState>({
    worldSize: 2200,
    x: 1100,
    y: 1100,
    dirX: 1,
    dirY: 0,
    speed: 2.1,
    mass: 42,
    alive: true,
    kills: 0,
    abilityBoost: 60,
    abilityShield: 40,
    abilityMagnet: 30,
    boostMs: 0,
    shieldMs: 0,
    magnetMs: 0
  });
  const [aiSerpents, setAiSerpents] = useState<AISerpent[]>([]);
  const [pellets, setPellets] = useState<Pellet[]>(() => Array.from({ length: 220 }).map((_, i) => randomPellet(2200, i)));

  const [td, setTd] = useState<TDState>({
    map: 'meadow',
    wave: 1,
    lives: 20,
    gold: 160,
    energy: 60,
    damageDone: 0,
    wavesCleared: 0,
    speed: 1,
    pads: [
      { id: 'p1', lane: 0, type: 'empty', level: 0, cooldownMs: 0, targetMode: 'first' },
      { id: 'p2', lane: 0, type: 'empty', level: 0, cooldownMs: 0, targetMode: 'first' },
      { id: 'p3', lane: 1, type: 'empty', level: 0, cooldownMs: 0, targetMode: 'first' },
      { id: 'p4', lane: 1, type: 'empty', level: 0, cooldownMs: 0, targetMode: 'first' },
      { id: 'p5', lane: 1, type: 'empty', level: 0, cooldownMs: 0, targetMode: 'first' }
    ],
    creeps: [],
    spawnTimerMs: 900,
    freezeMs: 0,
    cooldownBombMs: 0,
    cooldownFreezeMs: 0,
    cooldownRepairMs: 0
  });
  const [dragTowerType, setDragTowerType] = useState<'cannon-standard' | 'cannon-heavy' | 'cannon-burst' | 'frost' | 'lightning'>('cannon-standard');
  const [tdProjectiles, setTdProjectiles] = useState<TDProjectile[]>([]);
  const [tdEffects, setTdEffects] = useState<TDEffect[]>([]);
  const [tdDrag, setTdDrag] = useState<TowerDragState>({ active: false, x: 0, y: 0, valid: false });
  const [selectedTowerPadId, setSelectedTowerPadId] = useState<string | null>(null);
  const [tdCannonSprites, setTdCannonSprites] = useState({
    base: '/assets/games/td/towers/cannon/cannon_base.svg',
    turret: '/assets/games/td/towers/cannon/cannon_turret.svg',
    muzzle: [
      '/assets/games/td/towers/cannon/cannon_muzzle_flash_01.svg',
      '/assets/games/td/towers/cannon/cannon_muzzle_flash_02.svg',
      '/assets/games/td/towers/cannon/cannon_muzzle_flash_03.svg'
    ],
    ball: '/assets/games/td/towers/cannon/cannon_ball.svg',
    explosion: [
      '/assets/games/td/towers/cannon/cannon_explosion_01.svg',
      '/assets/games/td/towers/cannon/cannon_explosion_02.svg',
      '/assets/games/td/towers/cannon/cannon_explosion_03.svg',
      '/assets/games/td/towers/cannon/cannon_explosion_04.svg',
      '/assets/games/td/towers/cannon/cannon_explosion_05.svg'
    ],
    buildPad: '/assets/games/td/towers/cannon/build_pad.svg',
    rangeRing: '/assets/games/td/ui/range_ring.svg'
  });

  const { state: lanState, actions: lanActions, myPlayer } = useLan();
  const [manualIp, setManualIp] = useState('127.0.0.1');
  const [manualPort, setManualPort] = useState(9898);

  const gameTitle = GAME_BY_ID[gameId]?.title ?? 'Game';
  const serpentSkinSprite =
    profile.stats.inventory.equippedSkin === 'snake-neon'
      ? '/assets/games/serpents/snakes/skins/snake_skin_neon.svg'
      : profile.stats.inventory.equippedSkin === 'snake-sunset'
        ? '/assets/games/serpents/snakes/skins/snake_skin_sunset.svg'
        : profile.stats.inventory.equippedSkin === 'snake-royal'
          ? '/assets/games/serpents/snakes/skins/snake_skin_royal.svg'
          : profile.stats.inventory.equippedSkin === 'snake-jungle'
            ? '/assets/games/serpents/snakes/skins/snake_skin_jungle.svg'
            : '/assets/games/serpents/snakes/head_detailed.svg';

  useEffect(() => {
    if (!isTower) return;
    const customRoot = '/assets/custom/towers/cannon/';
    const probes = {
      base: `${customRoot}cannon_base.png`,
      turret: `${customRoot}cannon_turret.png`,
      muzzle: [
        `${customRoot}cannon_muzzle_flash_01.png`,
        `${customRoot}cannon_muzzle_flash_02.png`,
        `${customRoot}cannon_muzzle_flash_03.png`
      ],
      ball: `${customRoot}cannon_ball.png`,
      explosion: [
        `${customRoot}cannon_explosion_01.png`,
        `${customRoot}cannon_explosion_02.png`,
        `${customRoot}cannon_explosion_03.png`,
        `${customRoot}cannon_explosion_04.png`,
        `${customRoot}cannon_explosion_05.png`
      ],
      buildPad: `${customRoot}build_pad.png`,
      rangeRing: `${customRoot}range_ring.png`
    };

    const imageExists = (src: string) =>
      new Promise<boolean>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = src;
      });

    (async () => {
      const baseOk = await imageExists(probes.base);
      if (!baseOk) return;
      const turretOk = await imageExists(probes.turret);
      const ballOk = await imageExists(probes.ball);
      const buildPadOk = await imageExists(probes.buildPad);
      const rangeRingOk = await imageExists(probes.rangeRing);
      const muzzleOk = await Promise.all(probes.muzzle.map(imageExists));
      const explosionOk = await Promise.all(probes.explosion.map(imageExists));

      setTdCannonSprites((prev) => ({
        base: baseOk ? probes.base : prev.base,
        turret: turretOk ? probes.turret : prev.turret,
        muzzle: muzzleOk.every(Boolean) ? probes.muzzle : prev.muzzle,
        ball: ballOk ? probes.ball : prev.ball,
        explosion: explosionOk.every(Boolean) ? probes.explosion : prev.explosion,
        buildPad: buildPadOk ? probes.buildPad : prev.buildPad,
        rangeRing: rangeRingOk ? probes.rangeRing : prev.rangeRing
      }));
    })();
  }, [isTower]);

  useEffect(() => {
    if (phase !== 'play' || !config.timed || paused) return;
    const timer = window.setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, config.timed, paused]);

  useEffect(() => {
    if (phase !== 'play') return;
    if ((config.timed && timeLeft <= 0) || index >= prompts.length || (isTower && td.lives <= 0) || (isSerpents && !serpent.alive)) {
      finishRound();
    }
  }, [phase, config.timed, timeLeft, index, prompts.length, isTower, td.lives, isSerpents, serpent.alive]);

  useEffect(() => {
    if (phase !== 'play') return;
    if (!(isTower || (isSerpents && matchMode === 'solo'))) return;
    const timer = window.setInterval(() => {
      setForcedQuiz((state) => {
        if (state.active) return state;
        if (Date.now() < state.nextAt) return state;
        return { active: true, remaining: 5, nextAt: state.nextAt };
      });
    }, 500);
    return () => clearInterval(timer);
  }, [phase, isTower, isSerpents, matchMode]);

  useEffect(() => {
    if (!isNitro || matchMode !== 'solo') return;
    const human: Racer = {
      id: 'you',
      name: profile.name,
      distance: 0,
      index: 0,
      correct: 0,
      wrong: 0,
      streak: 0,
      bestStreak: 0,
      avgMs: 0,
      ai: false
    };
    const bots = aiPack.slice(0, aiCount).map((skill, i) => ({
      id: `ai-${i}`,
      name: `AI ${skill?.toUpperCase()}`,
      distance: 0,
      index: 0,
      correct: 0,
      wrong: 0,
      streak: 0,
      bestStreak: 0,
      avgMs: 0,
      ai: true,
      skill,
      nextActionAt: Date.now() + 900 + Math.random() * 1200
    }));
    setRacers([human, ...bots]);
    setNitroBoostMeter(0);
    setNitroBoostMs(0);
    setNitroBursts(2);
  }, [isNitro, matchMode, profile.name, aiPack, aiCount]);

  useEffect(() => {
    if (!isSerpents || matchMode !== 'solo') return;
    setSerpent((s) => ({ ...s, x: s.worldSize / 2, y: s.worldSize / 2, mass: 42, alive: true, kills: 0 }));
    setAiSerpents(
      Array.from({ length: difficulty.tier === 'hard' ? 8 : difficulty.tier === 'easy' ? 4 : 6 }).map((_, i) => {
        const d = randomDir();
        return {
          id: `ai-ser-${i}`,
          x: 250 + Math.random() * 1700,
          y: 250 + Math.random() * 1700,
          dirX: d.x,
          dirY: d.y,
          speed: 1.3 + Math.random() * 1.2,
          mass: 30 + Math.random() * 40,
          alive: true
        };
      })
    );
    setPellets(clusteredPellets(2200, 1100, 1100, difficulty.tier === 'hard' ? 180 : 220));
  }, [isSerpents, matchMode, difficulty.tier]);

  useEffect(() => {
    if (!lanCapable || matchMode !== 'lan') return;
    lanActions.startDiscovery();
    return () => {
      lanActions.stopDiscovery();
      lanActions.leave();
      lanActions.stopHost();
    };
  }, [lanCapable, matchMode]);

  useEffect(() => {
    if (lanState.currentQuestion) playCountdown();
  }, [lanState.currentQuestion?.id]);

  useEffect(() => {
    if (phase !== 'play') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'p') {
        setPaused((x) => !x);
        return;
      }
      if (event.key === 'Escape') {
        setTutorialOpen((x) => !x);
        return;
      }
      if (isNitro && matchMode === 'solo' && event.key === ' ') {
        event.preventDefault();
        activateNitroBoost();
      }
      if (isSerpents && matchMode === 'solo') {
        if (event.key === ' ') {
          event.preventDefault();
          activateSerpentBoost();
        }
        if (event.key === 'q') activateSerpentShield();
        if (event.key === 'e') activateSerpentMagnet();
        if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') setSerpentDir(-1, 0);
        if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') setSerpentDir(1, 0);
        if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') setSerpentDir(0, -1);
        if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') setSerpentDir(0, 1);
      }
      if (isTower) {
        if (event.key === '1') setDragTowerType('cannon-standard');
        if (event.key === '2') setDragTowerType('cannon-heavy');
        if (event.key === '3') setDragTowerType('cannon-burst');
        if (event.key === '4') setDragTowerType('frost');
        if (event.key === '5') setDragTowerType('lightning');
        if (event.key.toLowerCase() === 'b') triggerTdBomb();
        if (event.key.toLowerCase() === 'f') triggerTdFreeze();
        if (event.key.toLowerCase() === 'r') triggerTdRepair();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, isNitro, isSerpents, isTower, matchMode, td.energy, td.cooldownBombMs, td.cooldownFreezeMs, td.cooldownRepairMs]);

  useEffect(() => {
    if (phase !== 'play' || paused || !isNitro || matchMode !== 'solo') return;
    startNitroLoop();
    const tick = window.setInterval(() => {
      const balance = nitroBalanceForTier(difficulty.tier);
      setNitroBoostMs((v) => Math.max(0, v - 120));
      setRacers((prev) => {
        const now = Date.now();
        const next = prev.map((racer) => {
          if (racer.ai) {
            if ((racer.nextActionAt ?? 0) > now || racer.index >= raceLength) return racer;
            const skill = aiProfile(racer.skill);
            const responseMs = skill.min + Math.random() * (skill.max - skill.min);
            const ok = Math.random() < skill.accuracy;
            const newIdx = racer.index + 1;
            return {
              ...racer,
              index: newIdx,
              correct: racer.correct + (ok ? 1 : 0),
              wrong: racer.wrong + (ok ? 0 : 1),
              streak: ok ? racer.streak + 1 : 0,
              bestStreak: Math.max(racer.bestStreak, ok ? racer.streak + 1 : 0),
              distance: Math.max(0, racer.distance + (ok ? 10 + Math.random() * 7 : -4)),
              nextActionAt: now + skill.min * 0.8 + Math.random() * (skill.max - skill.min) * 0.8
            };
          }
          return {
            ...racer,
            distance: Math.max(0, racer.distance + balance.baseSpeed * 3.5 + (nitroBoostMs > 0 ? 2.9 : 0))
          };
        });
        if (next.some((r) => r.index >= raceLength)) window.setTimeout(() => finishRound(true, next), 20);
        return next;
      });
    }, 120);
    return () => {
      clearInterval(tick);
      stopNitroLoop();
    };
  }, [phase, paused, isNitro, matchMode, difficulty.tier, nitroBoostMs, raceLength, startNitroLoop, stopNitroLoop]);

  useEffect(() => {
    if (!isNitro || racers.length === 0) return;
    const me = racers.find((r) => r.id === 'you');
    if (!me) return;
    const intensity = Math.min(1, Math.max(0, me.distance / Math.max(90, raceLength * 1.6)));
    setNitroIntensity(intensity);
  }, [isNitro, racers, raceLength, setNitroIntensity]);

  useEffect(() => {
    if (phase !== 'play' || paused || forcedQuiz.active || !isSerpents || matchMode !== 'solo') return;
    const tick = window.setInterval(() => {
      let frameSerpent: SerpentState | null = null;
      setSerpent((s) => {
        if (!s.alive) return s;
        const boostMul = s.boostMs > 0 ? 1.75 : 1;
        const nx = s.x + s.dirX * s.speed * boostMul;
        const ny = s.y + s.dirY * s.speed * boostMul;
        const margin = 40;
        const inside = nx >= margin && ny >= margin && nx <= s.worldSize - margin && ny <= s.worldSize - margin;
        if (!inside && s.shieldMs <= 0) {
          const dead = { ...s, alive: false };
          frameSerpent = dead;
          return dead;
        }
        const next = {
          ...s,
          x: Math.max(margin, Math.min(s.worldSize - margin, nx)),
          y: Math.max(margin, Math.min(s.worldSize - margin, ny)),
          boostMs: Math.max(0, s.boostMs - 70),
          shieldMs: Math.max(0, s.shieldMs - 70),
          magnetMs: Math.max(0, s.magnetMs - 70),
          abilityBoost: Math.max(0, s.abilityBoost - (s.boostMs > 0 ? 0.6 : 0)),
          mass: Math.max(20, s.mass - (s.boostMs > 0 ? 0.09 : 0))
        };
        frameSerpent = next;
        return next;
      });
      if (!frameSerpent || !frameSerpent.alive) return;

      setAiSerpents((prev) =>
        prev.map((ai) => {
          if (!ai.alive) return ai;
          const turn = (Math.random() - 0.5) * 0.25;
          const ndx = ai.dirX * Math.cos(turn) - ai.dirY * Math.sin(turn);
          const ndy = ai.dirX * Math.sin(turn) + ai.dirY * Math.cos(turn);
          let nx = ai.x + ndx * ai.speed;
          let ny = ai.y + ndy * ai.speed;
          if (nx < 60 || ny < 60 || nx > 2140 || ny > 2140) {
            nx = Math.max(60, Math.min(2140, nx));
            ny = Math.max(60, Math.min(2140, ny));
          }
          return { ...ai, x: nx, y: ny, dirX: ndx, dirY: ndy };
        })
      );

      setPellets((prev) => {
        const bodyRadius = 18 + frameSerpent.mass * 0.08;
        const magnetRadius = frameSerpent.magnetMs > 0 ? 200 : 100 + bodyRadius;
        const eaten = prev.filter((p) => Math.hypot(p.x - frameSerpent!.x, p.y - frameSerpent!.y) <= magnetRadius);
        if (eaten.length > 0) {
          const gain = eaten.reduce((a, b) => a + b.value, 0);
          setScore((v) => v + gain);
          setSerpent((s) => ({ ...s, mass: s.mass + gain * 1.2 }));
          playGameAccent('math-io-serpents', true);
        }
        const survivors = prev.filter((p) => Math.hypot(p.x - frameSerpent!.x, p.y - frameSerpent!.y) > magnetRadius);
        if (survivors.length < 180) {
          const refill = Array.from({ length: 40 }).map((_, i) => randomPellet(2200, i + Date.now()));
          return [...survivors, ...refill];
        }
        return survivors;
      });

      setAiSerpents((prev) => {
        let gainedMass = 0;
        let gainedScore = 0;
        let gainedKills = 0;
        const deathBurst: Pellet[] = [];
        let gotHitByBigger = false;

        const next = prev.map((ai) => {
          if (!ai.alive) return ai;
          const dist = Math.hypot(ai.x - frameSerpent!.x, ai.y - frameSerpent!.y);
          const contact = dist < 16 + ai.mass * 0.05;
          if (!contact) return ai;

          const meWins = frameSerpent!.boostMs > 0 || frameSerpent!.shieldMs > 0 || frameSerpent!.mass >= ai.mass * 1.12;
          if (meWins) {
            gainedKills += 1;
            gainedMass += ai.mass * 0.5;
            gainedScore += Math.round(ai.mass * 1.25);
            for (let i = 0; i < Math.min(42, Math.round(ai.mass * 0.7)); i += 1) {
              deathBurst.push({
                id: `burst-${ai.id}-${Date.now()}-${i}`,
                x: ai.x + (Math.random() - 0.5) * 44,
                y: ai.y + (Math.random() - 0.5) * 44,
                value: 2 + Math.floor(Math.random() * 5)
              });
            }
            return { ...ai, alive: false };
          }

          gotHitByBigger = true;
          return ai;
        });

        if (deathBurst.length > 0) {
          setPellets((pel) => [...pel, ...deathBurst]);
          setSerpent((s) => ({ ...s, mass: s.mass + gainedMass, kills: s.kills + gainedKills }));
          setScore((v) => v + gainedScore);
          playGameAccent('math-io-serpents', true);
        }
        if (gotHitByBigger) {
          setSerpent((s) => (s.shieldMs > 0 ? { ...s, shieldMs: 0 } : { ...s, alive: false }));
          playWrong();
        }
        return next;
      });
    }, 70);
    return () => clearInterval(tick);
  }, [phase, paused, forcedQuiz.active, isSerpents, matchMode, playGameAccent, playWrong]);

  useEffect(() => {
    if (phase !== 'play' || paused || forcedQuiz.active || !isTower) return;
    const tick = window.setInterval(() => {
      const dt = 120;
      setTdProjectiles((prev) =>
        prev
          .map((p) => {
            const dx = p.tx - p.x;
            const dy = p.ty - p.y;
            const dist = Math.max(1, Math.hypot(dx, dy));
            const step = Math.min(dist, p.speed);
            return { ...p, x: p.x + (dx / dist) * step, y: p.y + (dy / dist) * step };
          })
          .filter((p) => Math.hypot(p.tx - p.x, p.ty - p.y) > 6)
      );
      setTdEffects((prev) =>
        prev
          .map((e) => ({
            ...e,
            msLeft: e.msLeft - dt,
            frame: Math.max(0, e.frame + 1)
          }))
          .filter((e) => e.msLeft > 0)
      );

      setTd((prev) => {
        const dtScaled = 120 * prev.speed;
        const next: TDState = {
          ...prev,
          spawnTimerMs: prev.spawnTimerMs - dtScaled,
          freezeMs: Math.max(0, prev.freezeMs - dtScaled),
          cooldownBombMs: Math.max(0, prev.cooldownBombMs - dtScaled),
          cooldownFreezeMs: Math.max(0, prev.cooldownFreezeMs - dtScaled),
          cooldownRepairMs: Math.max(0, prev.cooldownRepairMs - dtScaled),
          pads: prev.pads.map((p) => ({ ...p, cooldownMs: Math.max(0, p.cooldownMs - dtScaled) }))
        };

        if (next.spawnTimerMs <= 0) {
          const bossWave = next.wave % 5 === 0;
          const kind: Creep['kind'] = bossWave ? 'boss' : next.wave > 6 ? 'bot' : next.wave > 3 ? 'bug' : 'slime';
          next.creeps = [
            ...next.creeps,
            {
              id: `cr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              lane: Math.random() > 0.5 ? 1 : 0,
              progress: 0,
              hp: kind === 'boss' ? 220 : kind === 'bot' ? 90 : kind === 'bug' ? 64 : 46,
              speed: kind === 'boss' ? 0.28 : kind === 'bot' ? 0.44 : kind === 'bug' ? 0.62 : 0.74,
              kind,
              slowMs: 0
            }
          ];
          next.spawnTimerMs = Math.max(420, 1500 - next.wave * 70);
        }

        const towerDamage = next.pads.reduce((acc, pad) => {
          if (pad.type === 'empty') return acc;
          const cannonBase =
            pad.cannonType === 'heavy' ? 5.8 : pad.cannonType === 'burst' ? 2.8 : 3.8;
          const base = pad.type === 'cannon' ? cannonBase : pad.type === 'frost' ? 2.2 : 3.1;
          return acc + base * pad.level;
        }, 0);

        const creepsAfterMove = next.creeps
          .map((c) => ({
            ...c,
            progress:
              c.progress +
              c.speed *
                (next.freezeMs > 0 || c.slowMs > 0 ? 0.45 : 1) *
                (difficulty.tier === 'hard' ? 1.2 : difficulty.tier === 'easy' ? 0.82 : 1),
            slowMs: Math.max(0, c.slowMs - dtScaled)
          }))
          .map((c) => {
            const sameLanePower = next.pads.filter((p) => p.type !== 'empty' && p.lane === c.lane).length;
            const hit = towerDamage * (0.12 + sameLanePower * 0.08);
            return { ...c, hp: c.hp - hit };
          });

        const leaked = creepsAfterMove.filter((c) => c.progress >= 100).length;
        const killed = creepsAfterMove.filter((c) => c.hp <= 0);
        const alive = creepsAfterMove.filter((c) => c.progress < 100 && c.hp > 0);

        const muzzleBursts: TDEffect[] = [];
        const explosions: TDEffect[] = [];
        const newProjectiles: TDProjectile[] = [];
        next.pads = next.pads.map((pad) => {
          if (pad.type === 'empty') return pad;
          const target = alive
            .filter((c) => c.lane === pad.lane)
            .sort((a, b) => b.progress - a.progress)[0];
          if (!target || pad.cooldownMs > 0) return pad;
          const px = (tdPadLayout[pad.id]?.x ?? 10) * 6;
          const py = (tdPadLayout[pad.id]?.y ?? 20) * 2.2;
          const tx = target.progress * 10;
          const ty = target.lane === 0 ? 42 : 122;
          newProjectiles.push({
            id: `pr-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            x: px,
            y: py,
            tx,
            ty,
            speed: 8 + pad.level * 1.5,
            lane: pad.lane
          });
          muzzleBursts.push({ id: `mz-${Date.now()}-${pad.id}`, x: px, y: py, frame: 0, msLeft: 190, type: 'muzzle' });
          explosions.push({ id: `ex-${Date.now()}-${pad.id}`, x: tx, y: ty, frame: 0, msLeft: 320, type: 'explosion' });
          const baseCooldown =
            pad.cannonType === 'heavy' ? 1260 : pad.cannonType === 'burst' ? 580 : 980;
          return { ...pad, cooldownMs: Math.max(220, baseCooldown - pad.level * 120) };
        });
        if (newProjectiles.length) setTdProjectiles((prevShots) => [...prevShots, ...newProjectiles]);
        if (muzzleBursts.length || explosions.length) setTdEffects((prevFx) => [...prevFx, ...muzzleBursts, ...explosions]);

        next.creeps = alive;
        next.lives = Math.max(0, next.lives - leaked);
        next.gold += killed.reduce((a, c) => a + (c.kind === 'boss' ? 35 : c.kind === 'bot' ? 14 : 9), 0);
        next.damageDone += killed.length;

        if (next.damageDone > 0 && next.damageDone % 35 === 0) {
          next.wave += 1;
          next.wavesCleared += 1;
        }

        return next;
      });
    }, 120);
    return () => clearInterval(tick);
  }, [phase, paused, forcedQuiz.active, isTower, difficulty.tier]);

  const finishRound = (won = false, finalRacers: Racer[] = racers) => {
    if (phase === 'summary') return;
    const attempts = correct + wrong;
    const accuracy = attempts ? (correct / attempts) * 100 : 0;
    const averageMs = responses.length ? responses.reduce((a, b) => a + b, 0) / responses.length : 0;
    onSaveRound({ score, accuracy, bestStreak, averageMs, correct, wrong, won, wasLan: lanCapable && matchMode === 'lan' });
    playVictory();
    setPhase('summary');

    if (isNitro && matchMode === 'solo') {
      const podium = [...finalRacers].sort((a, b) => b.distance - a.distance);
      if (podium[0]?.id === 'you') onSaveRound({ score, accuracy, bestStreak, averageMs, won: true });
    }
    if (isSerpents && serpent.alive) {
      onSaveRound({ score, accuracy, bestStreak, averageMs, won: true });
    }
    if (isTower && td.wave >= 10 && td.lives > 0) {
      onSaveRound({ score, accuracy, bestStreak, averageMs, won: true });
    }
  };

  const setSerpentDir = (x: number, y: number) => {
    setSerpent((s) => ({ ...s, dirX: x, dirY: y }));
  };

  const activateNitroBoost = () => {
    if (nitroBoostMeter < 20 && nitroBursts <= 0) return;
    setNitroBoostMs(2200);
    if (nitroBoostMeter >= 20) {
      setNitroBoostMeter((v) => Math.max(0, v - 20));
    } else {
      setNitroBursts((v) => Math.max(0, v - 1));
    }
    setRacers((prev) => prev.map((r) => (r.id === 'you' ? { ...r, distance: r.distance + 28 } : r)));
  };

  const activateSerpentBoost = () => {
    setSerpent((s) => {
      if (s.abilityBoost < 20) return s;
      return { ...s, abilityBoost: s.abilityBoost - 20, boostMs: Math.max(900, s.boostMs + 700) };
    });
  };

  const activateSerpentShield = () => {
    setSerpent((s) => {
      if (s.abilityShield < 25) return s;
      return { ...s, abilityShield: s.abilityShield - 25, shieldMs: Math.max(900, s.shieldMs + 1200) };
    });
  };

  const activateSerpentMagnet = () => {
    setSerpent((s) => {
      if (s.abilityMagnet < 25) return s;
      return { ...s, abilityMagnet: s.abilityMagnet - 25, magnetMs: Math.max(1200, s.magnetMs + 1300) };
    });
  };

  const placeTower = (padId: string, type: 'cannon-standard' | 'cannon-heavy' | 'cannon-burst' | 'frost' | 'lightning'): boolean => {
    let placed = false;
    setTd((prev) => {
      const pad = prev.pads.find((p) => p.id === padId);
      if (!pad) return prev;
      const resolvedType = type.startsWith('cannon') ? 'cannon' : type;
      const cannonType =
        type === 'cannon-heavy' ? 'heavy' : type === 'cannon-burst' ? 'burst' : 'standard';
      const cost =
        type === 'cannon-standard' ? 100 :
        type === 'cannon-heavy' ? 145 :
        type === 'cannon-burst' ? 130 :
        type === 'frost' ? 120 : 140;
      if (prev.gold < cost) return prev;
      placed = true;
      return {
        ...prev,
        gold: prev.gold - cost,
        pads: prev.pads.map((p) =>
          p.id === padId
            ? {
                ...p,
                type: resolvedType,
                cannonType,
                level: p.type === resolvedType ? Math.min(4, p.level + 1) : Math.max(1, p.level),
                cooldownMs: 0
              }
            : p
        )
      };
    });
    if (placed) {
      playCorrect();
      playGameAccent('math-tower-defense', true);
    } else {
      playWrong();
      playGameAccent('math-tower-defense', false);
    }
    return placed;
  };

  const triggerTdBomb = () => {
    setTd((prev) => {
      if (prev.energy < 30 || prev.cooldownBombMs > 0) return prev;
      return {
        ...prev,
        energy: prev.energy - 30,
        cooldownBombMs: 9000,
        creeps: prev.creeps.map((c) => ({ ...c, hp: c.hp - 45 }))
      };
    });
  };

  const triggerTdFreeze = () => {
    setTd((prev) => {
      if (prev.energy < 25 || prev.cooldownFreezeMs > 0) return prev;
      return {
        ...prev,
        energy: prev.energy - 25,
        cooldownFreezeMs: 12000,
        freezeMs: 3000
      };
    });
  };

  const triggerTdRepair = () => {
    setTd((prev) => {
      if (prev.energy < 20 || prev.cooldownRepairMs > 0) return prev;
      return {
        ...prev,
        energy: prev.energy - 20,
        cooldownRepairMs: 10000,
        lives: Math.min(20, prev.lives + 4)
      };
    });
  };

  const tdPadLayout: Record<string, { x: number; y: number }> = {
    p1: { x: 12, y: 28 },
    p2: { x: 32, y: 28 },
    p3: { x: 54, y: 70 },
    p4: { x: 74, y: 70 },
    p5: { x: 90, y: 70 }
  };

  const nearestPadFromPercent = (xPercent: number, yPercent: number): string | undefined => {
    let bestId: string | undefined;
    let bestDist = Infinity;
    Object.entries(tdPadLayout).forEach(([id, p]) => {
      const d = Math.hypot(p.x - xPercent, p.y - yPercent);
      if (d < bestDist) {
        bestDist = d;
        bestId = id;
      }
    });
    return bestDist <= 18 ? bestId : undefined;
  };

  const beginTowerDrag = (type: 'cannon-standard' | 'cannon-heavy' | 'cannon-burst' | 'frost' | 'lightning') => {
    setDragTowerType(type);
    setTdDrag((s) => ({ ...s, active: true }));
    playClick();
  };

  const updateTowerDrag = (event: ReactMouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * 100;
    const py = ((event.clientY - rect.top) / rect.height) * 100;
    const padId = nearestPadFromPercent(px, py);
    const cost =
      dragTowerType === 'cannon-standard' ? 100 :
      dragTowerType === 'cannon-heavy' ? 145 :
      dragTowerType === 'cannon-burst' ? 130 :
      dragTowerType === 'frost' ? 120 : 140;
    setTdDrag({
      active: true,
      x: px,
      y: py,
      padId,
      valid: Boolean(padId) && td.gold >= cost
    });
  };

  const releaseTowerDrag = () => {
    if (!tdDrag.active) return;
    if (tdDrag.padId && tdDrag.valid) {
      placeTower(tdDrag.padId, dragTowerType);
    } else {
      playWrong();
    }
    setTdDrag({ active: false, x: 0, y: 0, valid: false, padId: undefined });
  };

  const submitSoloAnswer = () => {
    if (!answer.length || phase !== 'play') return;
    const responseMs = Date.now() - promptSeenAt;
    const isCorrect = Number(answer) === currentPrompt.answer;
    const nextStreak = isCorrect ? streak + 1 : 0;
    const delta = calculateAnswerPoints(isCorrect, responseMs, nextStreak, profile.settings, difficulty.wrongPenalty);

    setScore((v) => v + delta);
    setCorrect((v) => v + (isCorrect ? 1 : 0));
    setWrong((v) => v + (isCorrect ? 0 : 1));
    setStreak(nextStreak);
    setBestStreak((v) => Math.max(v, nextStreak));
    setResponses((r) => [...r, responseMs]);

    const promptA = currentPrompt.meta?.a;
    const promptB = currentPrompt.meta?.b;
    if (typeof promptA === 'number' && typeof promptB === 'number') {
      onRecordGameAnswer?.(promptA, promptB, isCorrect, responseMs);
    }

    if (isCorrect) {
      playCorrect();
      playGameAccent(gameId, true);
    } else {
      playWrong();
      playGameAccent(gameId, false);
    }

    if (isNitro && matchMode === 'solo') {
      const gain = nitroBoostGain(isCorrect, responseMs, nextStreak, difficulty.tier);
      setNitroBoostMeter((v) => Math.min(100, v + gain));
      if (isCorrect && responseMs < 1200) setNitroBoostMs((v) => Math.max(v, 900));
      setRacers((prev) =>
        prev.map((r) => {
          if (r.id !== 'you') return r;
          const attempts = r.correct + r.wrong + 1;
          return {
            ...r,
            index: r.index + 1,
            correct: r.correct + (isCorrect ? 1 : 0),
            wrong: r.wrong + (isCorrect ? 0 : 1),
            streak: nextStreak,
            bestStreak: Math.max(r.bestStreak, nextStreak),
            distance: Math.max(0, r.distance + (isCorrect ? Math.max(14, 30 - responseMs / 120) : -6)),
            avgMs: ((r.avgMs * (attempts - 1)) + responseMs) / attempts
          };
        })
      );
      setIndex((i) => i + 1);
      if (index + 1 >= raceLength) window.setTimeout(() => finishRound(true), 20);
    } else {
      if (isSerpents) {
        setSerpent((s) => ({
          ...s,
          abilityBoost: Math.max(0, Math.min(100, s.abilityBoost + (isCorrect ? 18 : -8))),
          abilityShield: Math.max(0, Math.min(100, s.abilityShield + (isCorrect ? 14 : -8))),
          abilityMagnet: Math.max(0, Math.min(100, s.abilityMagnet + (isCorrect ? 16 : -8)))
        }));
      }
      if (isTower) {
        setTd((s) => ({ ...s, energy: Math.max(0, Math.min(140, s.energy + (isCorrect ? 20 : -8))), gold: s.gold + (isCorrect ? 8 : 0) }));
      }
      setIndex((i) => i + 1);
    }

    setForcedQuiz((state) => {
      if (!state.active) return state;
      const next = state.remaining - 1;
      if (next > 0) return { ...state, remaining: next };
      return { active: false, remaining: 5, nextAt: Date.now() + 30_000 };
    });

    setAnswer('');
    setPromptSeenAt(Date.now());
  };

  const submitLanAnswer = () => {
    if (!lanState.currentQuestion || !answer.length) return;
    const responseMs = Date.now() - promptSeenAt;
    lanActions.submitAnswer({ questionId: lanState.currentQuestion.id, value: Number(answer), responseMs });
    setAnswer('');
    setPromptSeenAt(Date.now());
  };

  const lanLeaderboard = useMemo(
    () => (lanState.lobby?.players ?? []).slice().sort((a, b) => b.score - a.score),
    [lanState.lobby?.players]
  );

  if (lanCapable && matchMode === 'lan') {
    const roomMode = isNitro ? 'nitro' : 'serpents';
    const lanTitle = isNitro ? 'Math Nitro LAN' : 'Math.io Serpents LAN';
    return (
      <div className="screen">
        <div className="topbar">
          <button className="ghost" onClick={onBack}>Back</button>
          <h2>{lanTitle}</h2>
          <button className="ghost" onClick={() => setMatchMode('solo')}>Solo</button>
        </div>

        <div className="lan-grid">
          <section className="card">
            <h3>Host Match</h3>
            <label>
              Theme
              <select value={isNitro ? nitroTheme : serpentsTheme} onChange={(e) => (isNitro ? setNitroTheme(e.target.value as typeof nitroTheme) : setSerpentsTheme(e.target.value as typeof serpentsTheme))}>
                {isNitro ? (
                  <>
                    <option value="stadium-day">Stadium Day</option>
                    <option value="neon-night">Neon Night</option>
                    <option value="desert-rally">Desert Rally</option>
                  </>
                ) : (
                  <>
                    <option value="meadow">Meadow</option>
                    <option value="neon">Neon</option>
                    <option value="desert">Desert</option>
                  </>
                )}
              </select>
            </label>
            <label>
              Match Mode
              <select value={raceMode} onChange={(e) => setRaceMode(e.target.value as 'fair' | 'arcade')}>
                <option value="fair">Fair (same prompts)</option>
                <option value="arcade">Arcade</option>
              </select>
            </label>
            <label>
              Length
              <select value={raceLength} onChange={(e) => setRaceLength(Number(e.target.value) as 30 | 50 | 80)}>
                <option value={30}>Short</option>
                <option value={50}>Medium</option>
                <option value={80}>Long</option>
              </select>
            </label>
            <button
              className="primary"
              onClick={() =>
                lanActions.hostRoom({
                  hostName: profile.name,
                  mode: roomMode,
                  maxPlayers: 8,
                  config: {
                    mode: roomMode,
                    timerSeconds: config.roundLength,
                    questionCount: raceLength,
                    difficulty,
                    seed: fairNitroSeed(seed, raceMode),
                    raceMode
                  }
                })
              }
            >
              Start Host
            </button>
            <button className="ghost" onClick={() => lanActions.stopHost()}>Stop Host</button>
          </section>

          <section className="card">
            <h3>Join Match</h3>
            <div className="host-list">
              {lanState.hosts
                .filter((host) => host.mode === roomMode)
                .map((host) => (
                  <button
                    key={`${host.hostIp}:${host.wsPort}`}
                    onClick={() => lanActions.joinRoom({ hostIp: host.hostIp, wsPort: host.wsPort, name: profile.name, color: profile.avatarColor })}
                  >
                    {host.hostName} {host.hostIp}:{host.wsPort}
                  </button>
                ))}
            </div>
            <label>
              Manual IP
              <input value={manualIp} onChange={(e) => setManualIp(e.target.value)} />
            </label>
            <label>
              Port
              <input type="number" value={manualPort} onChange={(e) => setManualPort(Number(e.target.value))} />
            </label>
            <button className="primary" onClick={() => lanActions.joinRoom({ hostIp: manualIp, wsPort: manualPort, name: profile.name, color: profile.avatarColor })}>
              Join
            </button>
          </section>
        </div>

        {lanState.lobby && (
          <section className="card">
            <div className="lobby-header">
              <h3>Lobby</h3>
              <button className="ghost" onClick={() => lanActions.setReady(!(myPlayer?.ready ?? false))}>
                {(myPlayer?.ready ?? false) ? 'Unready' : 'Ready'}
              </button>
              {lanState.isHost && <button className="primary" onClick={() => lanActions.startGame()}>Launch Match</button>}
            </div>
            <div className="players-row">
              {lanState.lobby.players.map((player) => (
                <div key={player.id} className="player-pill">
                  <span className="dot" style={{ background: player.color }} />
                  {player.name}
                  <strong>{player.score}</strong>
                </div>
              ))}
            </div>
            {lanState.currentQuestion && (
              <div className="nitro-play">
                <h1>{lanState.currentQuestion.a} x {lanState.currentQuestion.b}</h1>
                <p>
                  Position: {Math.max(1, lanLeaderboard.findIndex((p) => p.id === (lanState.isHost ? 'host-local' : lanState.playerId)) + 1)} / {lanLeaderboard.length}
                </p>
                <div className="inline-answer">
                  <input
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                    onKeyDown={(e) => e.key === 'Enter' && submitLanAnswer()}
                  />
                  <button className="primary" onClick={submitLanAnswer}>Submit</button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    );
  }

  if (phase === 'summary') {
    const attempts = correct + wrong;
    const accuracy = attempts ? (correct / attempts) * 100 : 0;
    const averageMs = responses.length ? responses.reduce((a, b) => a + b, 0) / responses.length : 0;
    const podium = isNitro ? [...racers].sort((a, b) => b.distance - a.distance) : [];

    return (
      <div className="screen">
        <div className="topbar">
          <button className="ghost" onClick={onBack}>Back to Library</button>
          <h2>{gameTitle} Summary</h2>
        </div>
        <section className="card summary-grid">
          <h3>Score: {score}</h3>
          <p>Correct: {correct}</p>
          <p>Wrong: {wrong}</p>
          <p>Accuracy: {accuracy.toFixed(1)}%</p>
          <p>Avg Response: {Math.round(averageMs)}ms</p>
          <p>Best Streak: {bestStreak}</p>
          {isSerpents && <p>Kills: {serpent.kills} Mass: {Math.round(serpent.mass)}</p>}
          {isTower && <p>Waves Cleared: {td.wavesCleared} Lives Left: {td.lives}</p>}
          {isNitro && (
            <div>
              <h4>Podium</h4>
              {podium.map((r, i) => (
                <p key={r.id}>{i + 1}. {r.name} - {Math.round(r.distance)}m</p>
              ))}
            </div>
          )}
          <button className="primary" onClick={onBack}>Done</button>
        </section>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="topbar">
        <button className="ghost" onClick={onBack}>Back</button>
        <h2>{gameTitle}</h2>
        <button className="ghost" onClick={() => setPaused((x) => !x)}>{paused ? 'Resume' : 'Pause'}</button>
        <button className="ghost" onClick={() => window.location.reload()}>Restart</button>
        {lanCapable && (
          <div className="mode-toggle">
            <button className={matchMode === 'solo' ? 'primary' : 'ghost'} onClick={() => setMatchMode('solo')}>Solo</button>
            <button className={matchMode === 'lan' ? 'primary' : 'ghost'} onClick={() => setMatchMode('lan')}>LAN</button>
          </div>
        )}
      </div>

      {tutorialOpen && (
        <section className="card tutorial-panel">
          <h3>Tutorial: {gameTitle}</h3>
          {isNitro && <p>Solve math to race forward. Press Space to boost when charged.</p>}
          {isSerpents && (
            <p>
              Continuous movement arena, many opponents, and head-to-body collisions. Use Boost/Shield/Magnet abilities and cut off rivals.
            </p>
          )}
          {isTower && <p>Drag towers onto build pads. GOLD buys towers, ENERGY from math powers Bomb/Freeze/Repair abilities.</p>}
          <button className="primary" onClick={() => setTutorialOpen(false)}>Start</button>
        </section>
      )}

      <section className="card controls-panel">
        <h3>Controls</h3>
        {isNitro && (
          <div className="controls-row">
            <button className="primary" onClick={activateNitroBoost}>BOOST</button>
            <span className="muted">Keyboard: Space</span>
          </div>
        )}
        {isSerpents && (
          <div className="controls-row">
            <button className="ghost" onClick={() => setSerpentDir(-1, 0)}>Left</button>
            <button className="ghost" onClick={() => setSerpentDir(0, -1)}>Up</button>
            <button className="ghost" onClick={() => setSerpentDir(0, 1)}>Down</button>
            <button className="ghost" onClick={() => setSerpentDir(1, 0)}>Right</button>
            <button className="primary" onClick={activateSerpentBoost}>Boost</button>
            <button className="ghost" onClick={activateSerpentShield}>Shield</button>
            <button className="ghost" onClick={activateSerpentMagnet}>Magnet</button>
            <span className="muted">Keys: Arrows/WASD + Space/Q/E</span>
          </div>
        )}
        {isTower && (
          <div className="controls-row td-controls">
            <article className="td-shop-card card" draggable onDragStart={() => beginTowerDrag('cannon-standard')}>
              <img src={tdCannonSprites.turret} alt="" className="td-shop-icon" />
              <div>
                <strong>Cannon Tower</strong>
                <p className="muted">Balanced damage, splash upgrade path</p>
                <p>Cost: 100 GOLD</p>
              </div>
            </article>
            <article className="td-shop-card card" draggable onDragStart={() => beginTowerDrag('cannon-heavy')}>
              <img src={tdCannonSprites.turret} alt="" className="td-shop-icon td-heavy" />
              <div>
                <strong>Heavy Cannon</strong>
                <p className="muted">High damage, slower fire rate</p>
                <p>Cost: 145 GOLD</p>
              </div>
            </article>
            <article className="td-shop-card card" draggable onDragStart={() => beginTowerDrag('cannon-burst')}>
              <img src={tdCannonSprites.turret} alt="" className="td-shop-icon td-burst" />
              <div>
                <strong>Burst Cannon</strong>
                <p className="muted">Rapid shots, lower per-hit damage</p>
                <p>Cost: 130 GOLD</p>
              </div>
            </article>
            <button className="ghost" onClick={triggerTdBomb}>Bomb (B)</button>
            <button className="ghost" onClick={triggerTdFreeze}>Freeze (F)</button>
            <button className="ghost" onClick={triggerTdRepair}>Repair (R)</button>
          </div>
        )}
      </section>

      {isNitro && matchMode === 'solo' && (
        <section className="card nitro-config-row">
          <label>
            AI Skill
            <select
              value={aiSkill}
              onChange={(e) => {
                const skill = e.target.value as Racer['skill'];
                setAiSkill(skill);
                setAiPack(Array.from({ length: 7 }).map(() => skill));
              }}
            >
              <option value="beginner">Beginner</option>
              <option value="normal">Normal</option>
              <option value="expert">Expert</option>
              <option value="cheater">Cheater</option>
            </select>
          </label>
          <label>
            AI Racers
            <select value={aiCount} onChange={(e) => setAiCount(Number(e.target.value))}>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
              <option value={6}>6</option>
              <option value={7}>7</option>
            </select>
          </label>
          <label>
            Track Theme
            <select value={nitroTheme} onChange={(e) => setNitroTheme(e.target.value as typeof nitroTheme)}>
              <option value="stadium-day">Stadium Day</option>
              <option value="neon-night">Neon Night</option>
              <option value="desert-rally">Desert Rally</option>
            </select>
          </label>
        </section>
      )}

      {isNitro && (
        <section className="card flavor-panel pixi-shell">
          <PixiGameScene
            gameId={gameId}
            nitroTheme={nitroTheme}
            reducedMotion={profile.settings.reducedMotion}
            equippedCarId={profile.stats.inventory.equippedCar}
            equippedSkinId={profile.stats.inventory.equippedSkin}
            racers={racers.map((r) => ({ id: r.id, name: r.name, distance: r.distance, streak: r.streak }))}
            overlay={{
              nitro: isNitro ? { lane: 1, boost: nitroBoostMeter, entities: [] } : undefined,
              generic: !isNitro ? { level: isTower ? td.wave : Math.max(1, Math.round(serpent.mass / 25)), activeHazards: withDifficultyIntensity(GAME_BALANCE[gameId], difficulty.tier).hazards, activePowerups: withDifficultyIntensity(GAME_BALANCE[gameId], difficulty.tier).powerups } : undefined
            }}
            flavorValue={isTower ? td.energy : serpent.mass}
          />
        </section>
      )}

      <section className="card game-runtime">
        {forcedQuiz.active && (isSerpents || isTower) && (
          <div className="nitro-boost-cta">
            <strong>MATH CHECKPOINT: solve {forcedQuiz.remaining} more</strong>
            <span className="muted">Gameplay pauses until all 5 are answered.</span>
          </div>
        )}
        {isNitro && (
          <div className="nitro-boost-cta">
            <strong>{nitroBoostMeter >= 20 || nitroBursts > 0 ? 'BOOST READY' : `BOOST NEEDS ${Math.max(0, 20 - Math.round(nitroBoostMeter))}%`}</strong>
            <button className="primary" onClick={activateNitroBoost} disabled={nitroBoostMeter < 20 && nitroBursts <= 0}>BOOST (Space)</button>
          </div>
        )}

        <div className="hud-mini">
          <span><img src="assets/sprites/ui/icon-score.svg" alt="" />Score: {score}</span>
          <span><img src="assets/sprites/ui/icon-streak.svg" alt="" />Streak: {streak}</span>
          <span><img src="assets/sprites/ui/icon-speed.svg" alt="" />Accuracy: {((correct / Math.max(1, correct + wrong)) * 100).toFixed(0)}%</span>
          <span>{config.timed ? `Time: ${timeLeft}s` : `Prompt ${index + 1}/${prompts.length}`}</span>
          {isNitro && <span>Boost: {Math.round(nitroBoostMeter)} Bursts: {nitroBursts}</span>}
          {isSerpents && <span>Mass: {Math.round(serpent.mass)} Boost/Shield/Magnet: {Math.round(serpent.abilityBoost)}/{Math.round(serpent.abilityShield)}/{Math.round(serpent.abilityMagnet)}</span>}
          {isTower && <span>Wave: {td.wave} Lives: {td.lives} Gold: {td.gold} Energy: {td.energy}</span>}
        </div>

        {!isNitro && (
          <p className="muted">
            Hazards: {withDifficultyIntensity(GAME_BALANCE[gameId], difficulty.tier).hazards.join(', ')} | Powerups: {withDifficultyIntensity(GAME_BALANCE[gameId], difficulty.tier).powerups.join(', ')}
          </p>
        )}

        {isSerpents && (
          <section className="serpents-arena">
            <div
              className="serpents-world"
              style={{
                width: `${serpent.worldSize}px`,
                height: `${serpent.worldSize}px`,
                transform: `translate(calc(50% - ${serpent.x}px), calc(50% - ${serpent.y}px))`
              } as CSSProperties}
            >
              {pellets.slice(0, 260).map((p) => (
                <div key={p.id} className="serpent-pellet" style={{ left: p.x, top: p.y }} />
              ))}
              {aiSerpents.filter((s) => s.alive).map((ai) => (
                <div key={ai.id} className="serpent-ai" style={{ left: ai.x, top: ai.y, width: 18 + ai.mass * 0.06, height: 18 + ai.mass * 0.06 }} />
              ))}
              <div
                className={`serpent-player ${serpent.shieldMs > 0 ? 'shielded' : ''}`}
                style={{
                  left: serpent.x,
                  top: serpent.y,
                  width: 18 + serpent.mass * 0.06,
                  height: 18 + serpent.mass * 0.06,
                  backgroundImage: `url('${serpentSkinSprite}')`
                }}
              />
            </div>
            <div className="serpents-leaderboard">
              <h4>Leaderboard</h4>
              <p>You: {Math.round(serpent.mass)}</p>
              {aiSerpents.slice(0, 5).map((ai) => (
                <p key={`lb-${ai.id}`}>{ai.id.toUpperCase()}: {Math.round(ai.mass)}</p>
              ))}
            </div>
            <div className="serpents-minimap">
              <div className="me" style={{ left: `${(serpent.x / serpent.worldSize) * 100}%`, top: `${(serpent.y / serpent.worldSize) * 100}%` }} />
            </div>
            <div className="serpents-you-center">
              <img src={serpentSkinSprite} alt="" />
              <span>YOU</span>
            </div>
          </section>
        )}

        {isTower && (
          <section className="td-board" onMouseMove={updateTowerDrag} onMouseUp={releaseTowerDrag} onMouseLeave={releaseTowerDrag}>
            <div className="td-paths">
              <div className="td-lane" />
              <div className="td-lane" />
              {td.creeps.map((c) => (
                <div key={c.id} className={`td-creep ${c.kind}`} style={{ left: `${c.progress}%`, top: c.lane === 0 ? 42 : 122 }} />
              ))}
              {tdProjectiles.map((shot) => (
                <img key={shot.id} src={tdCannonSprites.ball} className="td-projectile" style={{ left: shot.x, top: shot.y }} alt="" />
              ))}
              {tdEffects.map((fx) =>
                fx.type === 'muzzle' ? (
                  <img
                    key={fx.id}
                    src={tdCannonSprites.muzzle[Math.min(2, fx.frame % tdCannonSprites.muzzle.length)]}
                    className="td-muzzle"
                    style={{ left: fx.x, top: fx.y }}
                    alt=""
                  />
                ) : (
                  <img
                    key={fx.id}
                    src={tdCannonSprites.explosion[Math.min(4, fx.frame % tdCannonSprites.explosion.length)]}
                    className="td-explosion"
                    style={{ left: fx.x, top: fx.y }}
                    alt=""
                  />
                )
              )}
            </div>
            <div className="td-pads">
              {td.pads.map((pad) => (
                <div
                  key={pad.id}
                  className={`td-pad ${pad.type}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    beginTowerDrag(dragTowerType);
                  }}
                  onDrop={() => {
                    const cost =
                      dragTowerType === 'cannon-standard' ? 100 :
                      dragTowerType === 'cannon-heavy' ? 145 :
                      dragTowerType === 'cannon-burst' ? 130 :
                      dragTowerType === 'frost' ? 120 : 140;
                    if (td.gold >= cost) placeTower(pad.id, dragTowerType);
                    else playWrong();
                    setTdDrag({ active: false, x: 0, y: 0, valid: false, padId: undefined });
                  }}
                  onClick={() => {
                    setSelectedTowerPadId(pad.id);
                    if (dragTowerType.startsWith('cannon')) placeTower(pad.id, dragTowerType);
                  }}
                >
                  <img src={tdCannonSprites.buildPad} alt="" className="td-pad-sprite" />
                  {pad.type !== 'empty' && (
                    <div className="td-tower-stack">
                      <img src={tdCannonSprites.base} className="td-tower-base" alt="" />
                      <img
                        src={tdCannonSprites.turret}
                        className="td-tower-turret"
                        alt=""
                        style={{
                          transform: `rotate(${(() => {
                            const target = td.creeps.filter((c) => c.lane === pad.lane).sort((a, b) => b.progress - a.progress)[0];
                            if (!target) return 0;
                            const tx = target.progress;
                            const px = tdPadLayout[pad.id]?.x ?? 0;
                            return Math.atan2((target.lane === 0 ? 28 : 70) - (tdPadLayout[pad.id]?.y ?? 0), tx - px) * (180 / Math.PI);
                          })()}deg)`
                        }}
                      />
                    </div>
                  )}
                  <strong>{pad.type === 'empty' ? 'Empty Pad' : `${pad.cannonType ?? 'standard'} Cannon L${pad.level}`}</strong>
                </div>
              ))}
            </div>
            {tdDrag.active && (
              <div
                className={`td-drag-ghost ${tdDrag.valid ? 'valid' : 'invalid'}`}
                style={{ left: `${tdDrag.x}%`, top: `${tdDrag.y}%` }}
              >
                <img src={tdCannonSprites.rangeRing} alt="" className="td-range-ring" />
                <img src={tdCannonSprites.base} alt="" className="td-ghost-base" />
                <img src={tdCannonSprites.turret} alt="" className="td-ghost-turret" />
              </div>
            )}
            {selectedTowerPadId && (
              <div className="td-upgrade-panel card">
                <h4>Tower Panel</h4>
                <p>Selected: {selectedTowerPadId}</p>
                <button className="ghost" onClick={() => placeTower(selectedTowerPadId, 'cannon-standard')}>Upgrade (+100)</button>
                <button
                  className="ghost"
                  onClick={() =>
                    setTd((s) => ({
                      ...s,
                      gold: s.gold + 55,
                      pads: s.pads.map((p) => (p.id === selectedTowerPadId ? { ...p, type: 'empty', level: 0 } : p))
                    }))
                  }
                >
                  Sell (55)
                </button>
                <button
                  className="ghost"
                  onClick={() =>
                    setTd((s) => ({
                      ...s,
                      pads: s.pads.map((p) =>
                        p.id === selectedTowerPadId
                          ? { ...p, targetMode: p.targetMode === 'first' ? 'last' : p.targetMode === 'last' ? 'strong' : 'first' }
                          : p
                      )
                    }))
                  }
                >
                  Target Mode
                </button>
              </div>
            )}
          </section>
        )}

        <h1>{currentPrompt.prompt}</h1>
        <div className="inline-answer">
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitSoloAnswer();
            }}
            placeholder="Answer"
          />
          <button
            className="primary"
            onClick={() => {
              playClick();
              submitSoloAnswer();
            }}
          >
            Submit
          </button>
        </div>
      </section>
    </div>
  );
};
