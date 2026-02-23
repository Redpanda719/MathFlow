# MathFlow

MathFlow is an Electron + React + TypeScript math game app with:
- Practice / Sprint core modes
- LAN multiplayer stack (host/join on local network)
- A focused Games library with three full games:
  1. Math Nitro
  2. Math.io Serpents
  3. Math Tower Defense

## Run

```bash
npm install
npm run dev
```

Build renderer + Electron:

```bash
npm run build
```

Build desktop packages (including DMG on macOS):

```bash
npm run dist
```

## Games

## 1) Math Nitro
Fast race gameplay powered by quick math answers.

Controls:
- `Space`: boost
- `Enter`: submit math answer

Modes:
- Solo vs AI
- LAN race (host/join)

## 2) Math.io Serpents
Snake.io-style arena gameplay (continuous movement, many opponents, pellet field, ability play).

Core gameplay:
- Continuous arena movement (not grid-step classic snake)
- Pellet collection for mass/score
- Ability bar: Boost / Shield / Magnet
- Math prompt cards recharge abilities without pausing movement
- Collisions and survival pressure

Controls:
- `WASD` or Arrow keys: steer
- `Space`: Boost
- `Q`: Shield
- `E`: Magnet
- `Enter`: submit math answer

Modes:
- Solo vs AI serpents
- LAN match (host/join, ready/lobby, synchronized question stream)

## 3) Math Tower Defense
Real-time TD loop with wave progression, creep pressure, drag/drop tower placement, and math-fueled energy abilities.

Core gameplay:
- Place and upgrade towers on build pads
- Creeps travel lanes toward your base
- Use GOLD for tower economy
- Use ENERGY (primarily math-earned) for abilities:
  - Bomb Strike
  - Time Freeze
  - Emergency Repair

Controls:
- Drag tower cards and place on pads (Cannon / Heavy Cannon / Burst Cannon)
- `1/2/3`: quick-select cannon variants (`4/5` for Frost/Lightning)
- `B`: Bomb, `F`: Freeze, `R`: Repair
- `Enter`: submit math answer

### Cannon Tower Assets

Built-in Cannon sprites ship offline at:

- `/assets/games/td/towers/cannon/cannon_base.png`
- `/assets/games/td/towers/cannon/cannon_turret.png`
- `/assets/games/td/towers/cannon/cannon_muzzle_flash_01.png`
- `/assets/games/td/towers/cannon/cannon_muzzle_flash_02.png`
- `/assets/games/td/towers/cannon/cannon_muzzle_flash_03.png`
- `/assets/games/td/towers/cannon/cannon_ball.png`
- `/assets/games/td/towers/cannon/cannon_explosion_01.png` ... `_05.png`
- `/assets/games/td/towers/cannon/build_pad.png`
- `/assets/games/td/ui/range_ring.png`

### How to install custom tower art

You can manually replace Cannon visuals with purchased art by dropping files into:

- `/assets/custom/towers/cannon/`

Supported filenames:

- `cannon_base.png`
- `cannon_turret.png`
- `cannon_muzzle_flash_01.png` ... `_03.png`
- `cannon_ball.png`
- `cannon_explosion_01.png` ... `_05.png`
- `build_pad.png`
- `range_ring.png`

If custom files exist, the game uses them at runtime; otherwise it falls back to built-in assets.  
No auto-download is used and no internet is required.

Where to buy/find sprite packs (manual install):

- itch.io asset packs
- Unity Asset Store (license permitting external use)
- Kenney.nl (CC0)
- OpenGameArt.org
- CraftPix.net
- Paid pixel-art marketplaces

### Snake Skins

New serpent skins are available in Shop -> `Skins`, including:

- Snake Neon
- Snake Sunset
- Snake Royal
- Snake Jungle

## LAN Notes

LAN is local-network only and requires desktop Electron runtime.

- Discovery: UDP broadcast
- Match traffic: WebSocket
- Manual join fallback: enter IP + port
- Same-machine test: host and join `127.0.0.1:9898`

Serpents and Nitro both support LAN host/join from the Games screen.

## Multiplication Range (1-12)

Settings includes table range controls:
- Range Start
- Range End

You can configure custom multiplication coverage up to `12 x 12`.

## Achievements

Includes existing and new achievements:
- Multiplication Master
- Nitro Champion
- Unstoppable Streak
- LAN Legend
- Daily Driver
- Serpent Slayer
- Perfect Predator
- Tower Commander

## Persistence / Migration

Profile data is stored locally and auto-migrated.

Recent migration keeps compatibility from older game IDs:
- `math-defender` -> `math-tower-defense`
- `math-snake` -> `math-io-serpents`

---

Copyright © 2026 Redpanda719

No internet asset fetching is required at runtime.
