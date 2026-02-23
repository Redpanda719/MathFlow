import type { CSSProperties } from 'react';
import { getCarSpriteSrc } from '@shared/cars';
import type { LibraryGameId } from '@shared/types';

type NitroTheme = 'stadium-day' | 'neon-night' | 'desert-rally';

export interface PixiRacer {
  id: string;
  name: string;
  distance: number;
  streak: number;
}

export interface NitroTrackEntity {
  id: string;
  lane: number;
  x: number; // 0..100 track percent
  kind: 'hazard' | 'powerup' | 'coin';
  type: string;
}

export interface GameOverlay {
  nitro?: {
    lane: number;
    boost: number;
    entities: NitroTrackEntity[];
  };
  generic?: {
    activeHazards: string[];
    activePowerups: string[];
    level: number;
  };
}

interface Props {
  gameId: LibraryGameId;
  width?: number;
  height?: number;
  reducedMotion: boolean;
  nitroTheme?: NitroTheme;
  racers?: PixiRacer[];
  flavorValue?: number;
  equippedCarId?: string;
  equippedSkinId?: string;
  overlay?: GameOverlay;
}

const asset = (path: string): string => {
  const base = import.meta.env.BASE_URL || '/';
  return `${base.replace(/\/?$/, '/')}${path.replace(/^\//, '')}`;
};

const gameBackground = (gameId: LibraryGameId): string => {
  if (gameId === 'math-tower-defense') return asset('assets/games/td/tiles/grass.png');
  if (gameId === 'math-io-serpents') return asset('assets/games/serpents/tiles/ground_tile_01.png');
  return asset('assets/backgrounds/nitro/stadium-day/far.svg');
};

const gameSprite = (gameId: Exclude<LibraryGameId, 'math-nitro'>): string => {
  if (gameId === 'math-tower-defense') return asset('assets/games/td/towers/cannon_turret.png');
  if (gameId === 'math-io-serpents') return asset('assets/games/serpents/snakes/head.png');
  return asset('assets/games/serpents/snakes/head.png');
};

const nitroCarSprite = (index: number, racerId: string, equippedCarId: string): string => {
  if (racerId === 'you') return getCarSpriteSrc(equippedCarId);
  const palette = ['car-blue', 'car-mint', 'car-gold', 'car-violet', 'car-orange', 'car-teal', 'car-pink', 'car-red'];
  return getCarSpriteSrc(palette[index % palette.length]);
};

export const PixiGameScene = ({
  gameId,
  height = 260,
  reducedMotion,
  nitroTheme = 'stadium-day',
  racers = [],
  flavorValue = 0,
  equippedCarId = 'car-red',
  equippedSkinId = 'skin-default',
  overlay
}: Props) => {
  if (gameId === 'math-nitro') {
    const maxDistance = Math.max(120, ...racers.map((r) => r.distance + 1));

    return (
      <div className={`pixi-scene dom-scene skin-${equippedSkinId}`} style={{ height }}>
        <img className={`nitro-layer nitro-far ${reducedMotion ? 'still' : ''}`} src={asset(`assets/backgrounds/nitro/${nitroTheme}/far.svg`)} alt="" />
        <img className={`nitro-layer nitro-mid ${reducedMotion ? 'still' : ''}`} src={asset(`assets/backgrounds/nitro/${nitroTheme}/mid.svg`)} alt="" />
        <img className="nitro-layer nitro-near" src={asset(`assets/backgrounds/nitro/${nitroTheme}/near.svg`)} alt="" />

        <div className="nitro-track-grid">
          {racers.map((racer, lane) => {
            const positionPct = Math.min(88, (racer.distance / maxDistance) * 88);
            const carStyle: CSSProperties = {
              transform: `translateX(${positionPct}%)`,
              transition: reducedMotion ? 'none' : 'transform 130ms cubic-bezier(0.22, 1, 0.36, 1)'
            };
            return (
              <div key={racer.id} className={`nitro-lane-row ${overlay?.nitro?.lane === lane && racer.id === 'you' ? 'active-player-lane' : ''}`}>
                <div className="nitro-lane-name">{racer.name}</div>
                <img
                  className={`nitro-car-sprite ${!reducedMotion && racer.streak >= 5 ? 'boosting' : ''}`}
                  src={nitroCarSprite(lane, racer.id, equippedCarId)}
                  alt=""
                  style={carStyle}
                />
                <img className="nitro-lane-flag" src={asset('assets/sprites/props/flag.svg')} alt="" />
                {racer.id === 'you' &&
                  overlay?.nitro?.entities
                    .filter((e) => e.lane === lane)
                    .map((entity) => (
                      <div key={entity.id} className={`nitro-entity ${entity.kind}`} style={{ left: `${Math.max(2, Math.min(95, entity.x))}%` }}>
                        {entity.kind === 'coin' ? (
                          <img src={asset('assets/sprites/ui/icon-score.svg')} alt="" />
                        ) : entity.kind === 'powerup' ? (
                          <img src={asset('assets/sprites/ui/icon-speed.svg')} alt="" />
                        ) : (
                          <img src={asset('assets/sprites/props/cone.svg')} alt="" />
                        )}
                      </div>
                    ))}
              </div>
            );
          })}
        </div>

        <div className="nitro-boost-meter">
          <div style={{ width: `${Math.max(0, Math.min(100, overlay?.nitro?.boost ?? 0))}%` }} />
        </div>
        <img className="nitro-finish-banner" src={asset('assets/sprites/nitro/finish-banner.svg')} alt="" />
      </div>
    );
  }

  const nonNitro = gameId as Exclude<LibraryGameId, 'math-nitro'>;

  return (
    <div className={`pixi-scene dom-scene skin-${equippedSkinId}`} style={{ height }}>
      <img className="game-bg" src={gameBackground(gameId)} alt="" />

      <div className="game-ambient-row">
        <img className={`game-main-sprite ${reducedMotion ? 'still' : ''}`} src={gameSprite(nonNitro)} alt="" />
        <img className={`game-prop ${reducedMotion ? 'still' : ''}`} src={asset('assets/sprites/props/cone.svg')} alt="" />
        <img className={`game-prop delay ${reducedMotion ? 'still' : ''}`} src={asset('assets/sprites/props/flag.svg')} alt="" />
      </div>

      <div className="game-power-chip">
        <img src={asset('assets/sprites/ui/icon-score.svg')} alt="" />
        <span>Power {Math.round(flavorValue)}</span>
      </div>
      {overlay?.generic && (
        <div className="game-overlay-strip">
          <span>Lv {overlay.generic.level}</span>
          <span>Hazards: {overlay.generic.activeHazards.slice(0, 3).join(', ') || 'None'}</span>
          <span>Powerups: {overlay.generic.activePowerups.slice(0, 3).join(', ') || 'None'}</span>
        </div>
      )}
    </div>
  );
};
