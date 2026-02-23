import { GENERATED_CAR_DESIGNS } from './cars.js';
import type { CarDesign } from './cars.js';

export type ShopItemType = 'car' | 'skin';

export interface ShopItem {
  id: string;
  type: ShopItemType;
  name: string;
  price: number;
  rarity: 'common' | 'rare' | 'epic';
  preview: string;
  description: string;
}

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'car-red',
    type: 'car',
    name: 'Crimson Bolt',
    price: 0,
    rarity: 'common',
    preview: 'assets/sprites/nitro/cars/car-red.svg',
    description: 'Balanced starter racer with a bold red finish.'
  },
  {
    id: 'car-blue',
    type: 'car',
    name: 'Azure Flash',
    price: 120,
    rarity: 'common',
    preview: 'assets/sprites/nitro/cars/car-blue.svg',
    description: 'Cool blue chassis with smooth lane glide.'
  },
  {
    id: 'car-mint',
    type: 'car',
    name: 'Mint Surge',
    price: 180,
    rarity: 'rare',
    preview: 'assets/sprites/nitro/cars/car-mint.svg',
    description: 'Precision-tuned mint racer for confident climbs.'
  },
  {
    id: 'car-gold',
    type: 'car',
    name: 'Solar Gold',
    price: 260,
    rarity: 'epic',
    preview: 'assets/sprites/nitro/cars/car-gold.svg',
    description: 'Premium gold trim for podium chasers.'
  },
  {
    id: 'car-violet',
    type: 'car',
    name: 'Violet Vortex',
    price: 220,
    rarity: 'rare',
    preview: 'assets/sprites/nitro/cars/car-violet.svg',
    description: 'High-grip racer with stealth-purple look.'
  },
  {
    id: 'car-orange',
    type: 'car',
    name: 'Blaze Runner',
    price: 200,
    rarity: 'rare',
    preview: 'assets/sprites/nitro/cars/car-orange.svg',
    description: 'Aggressive orange body and bright highlights.'
  },
  {
    id: 'car-teal',
    type: 'car',
    name: 'Tidal Strike',
    price: 170,
    rarity: 'common',
    preview: 'assets/sprites/nitro/cars/car-teal.svg',
    description: 'Clean teal frame built for steady speed.'
  },
  {
    id: 'car-pink',
    type: 'car',
    name: 'Neon Pop',
    price: 210,
    rarity: 'rare',
    preview: 'assets/sprites/nitro/cars/car-pink.svg',
    description: 'Fast, loud, and impossible to miss.'
  },
  {
    id: 'skin-default',
    type: 'skin',
    name: 'Classic HUD',
    price: 0,
    rarity: 'common',
    preview: 'assets/sprites/ui/icon-score.svg',
    description: 'Clean standard interface skin.'
  },
  {
    id: 'skin-neon',
    type: 'skin',
    name: 'Neon Pulse',
    price: 160,
    rarity: 'rare',
    preview: 'assets/sprites/ui/icon-speed.svg',
    description: 'Glowing cyan accents and futuristic panels.'
  },
  {
    id: 'skin-sunset',
    type: 'skin',
    name: 'Sunset Drift',
    price: 160,
    rarity: 'rare',
    preview: 'assets/sprites/ui/icon-streak.svg',
    description: 'Warm orange and coral game frame style.'
  },
  {
    id: 'skin-royal',
    type: 'skin',
    name: 'Royal Circuit',
    price: 260,
    rarity: 'epic',
    preview: 'assets/sprites/ui/icon-score.svg',
    description: 'Deep premium gradient with glossy trim.'
  },
  {
    id: 'snake-neon',
    type: 'skin',
    name: 'Snake Neon',
    price: 180,
    rarity: 'rare',
    preview: 'assets/games/serpents/snakes/skins/snake_skin_neon.svg',
    description: 'Neon serpent skin for Math.io Serpents.'
  },
  {
    id: 'snake-sunset',
    type: 'skin',
    name: 'Snake Sunset',
    price: 180,
    rarity: 'rare',
    preview: 'assets/games/serpents/snakes/skins/snake_skin_sunset.svg',
    description: 'Warm sunset serpent skin.'
  },
  {
    id: 'snake-royal',
    type: 'skin',
    name: 'Snake Royal',
    price: 240,
    rarity: 'epic',
    preview: 'assets/games/serpents/snakes/skins/snake_skin_royal.svg',
    description: 'Premium royal serpent skin.'
  },
  {
    id: 'snake-jungle',
    type: 'skin',
    name: 'Snake Jungle',
    price: 140,
    rarity: 'common',
    preview: 'assets/games/serpents/snakes/skins/snake_skin_jungle.svg',
    description: 'Jungle serpent skin.'
  },
  ...GENERATED_CAR_DESIGNS.map((car: CarDesign) => ({
    id: car.id,
    type: 'car' as const,
    name: car.name,
    price: car.price,
    rarity: car.rarity,
    preview: car.dataUri,
    description: 'Procedural limited-run race body with custom stripe and trim package.'
  }))
];

export const SHOP_BY_ID = Object.fromEntries(SHOP_ITEMS.map((item) => [item.id, item])) as Record<string, ShopItem>;
