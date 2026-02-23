export interface CarDesign {
  id: string;
  name: string;
  price: number;
  rarity: 'common' | 'rare' | 'epic';
  svg: string;
  dataUri: string;
}

const STOCK_CAR_ASSETS: Record<string, string> = {
  'car-red': 'assets/sprites/nitro/cars/car-red.svg',
  'car-blue': 'assets/sprites/nitro/cars/car-blue.svg',
  'car-mint': 'assets/sprites/nitro/cars/car-mint.svg',
  'car-gold': 'assets/sprites/nitro/cars/car-gold.svg',
  'car-violet': 'assets/sprites/nitro/cars/car-violet.svg',
  'car-orange': 'assets/sprites/nitro/cars/car-orange.svg',
  'car-teal': 'assets/sprites/nitro/cars/car-teal.svg',
  'car-pink': 'assets/sprites/nitro/cars/car-pink.svg'
};

type Archetype = 'formula' | 'muscle' | 'truck' | 'van' | 'buggy' | 'retro' | 'mini' | 'hyper' | 'wagon' | 'pod';

const ARCHETYPES: Archetype[] = ['formula', 'muscle', 'truck', 'van', 'buggy', 'retro', 'mini', 'hyper', 'wagon', 'pod'];

const ARCHETYPE_LABEL: Record<Archetype, string> = {
  formula: 'Formula',
  muscle: 'Muscle',
  truck: 'Truck',
  van: 'Van',
  buggy: 'Buggy',
  retro: 'Retro',
  mini: 'Mini',
  hyper: 'Hyper',
  wagon: 'Wagon',
  pod: 'Pod'
};

const palettes = [
  ['#ef4444', '#991b1b', '#fecaca'],
  ['#f97316', '#9a3412', '#fed7aa'],
  ['#f59e0b', '#92400e', '#fde68a'],
  ['#84cc16', '#3f6212', '#d9f99d'],
  ['#10b981', '#065f46', '#a7f3d0'],
  ['#14b8a6', '#115e59', '#99f6e4'],
  ['#06b6d4', '#155e75', '#a5f3fc'],
  ['#3b82f6', '#1e3a8a', '#bfdbfe'],
  ['#6366f1', '#312e81', '#c7d2fe'],
  ['#a855f7', '#581c87', '#e9d5ff'],
  ['#ec4899', '#831843', '#fbcfe8'],
  ['#f43f5e', '#881337', '#fecdd3']
] as const;

const encodeSvg = (svg: string): string => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const wheel = (x: number, y: number, r: number): string =>
  `<circle cx='${x}' cy='${y}' r='${r}' fill='#111827'/><circle cx='${x}' cy='${y}' r='${Math.max(2, r - 4)}' fill='#9ca3af'/>`;

const lights = (fx: number, fy: number, rx: number, ry: number): string =>
  `<rect x='${fx}' y='${fy}' width='7' height='4' rx='2' fill='#fca5a5'/><rect x='${rx}' y='${ry}' width='9' height='5' rx='2' fill='#fde68a'/>`;

const stripe = (variant: number, accent: string): string => {
  if (variant % 4 === 0) return `<rect x='30' y='29' width='48' height='3' rx='2' fill='${accent}' opacity='.9'/>`;
  if (variant % 4 === 1) return `<rect x='36' y='22' width='6' height='14' fill='${accent}' opacity='.86'/><rect x='47' y='22' width='6' height='14' fill='${accent}' opacity='.86'/>`;
  if (variant % 4 === 2) return `<polygon points='28,30 52,22 62,22 38,30' fill='${accent}' opacity='.82'/>`;
  return `<polygon points='28,24 62,24 74,30 28,30' fill='${accent}' opacity='.78'/>`;
};

interface CarShape {
  body: string;
  roof: string;
  details: string;
  wheels: string;
  shadow: string;
}

const buildShape = (arch: Archetype, variant: number, base: string, trim: string, accent: string): CarShape => {
  if (arch === 'formula') {
    return {
      shadow: `<ellipse cx='58' cy='48' rx='40' ry='5' fill='#000' opacity='.22'/>`,
      body: `<polygon points='14,34 44,34 58,24 83,24 106,28 106,36 14,36' fill='${base}'/><polygon points='43,34 57,24 64,24 56,34' fill='${trim}'/>`,
      roof: `<rect x='58' y='20' width='14' height='7' rx='2' fill='#dbeafe'/>`,
      details: `${stripe(variant, accent)}${lights(12, 31, 98, 30)}<rect x='92' y='24' width='12' height='3' rx='2' fill='${trim}'/>`,
      wheels: `${wheel(32, 40, 7)}${wheel(86, 40, 7)}`
    };
  }
  if (arch === 'muscle') {
    return {
      shadow: `<ellipse cx='58' cy='49' rx='38' ry='6' fill='#000' opacity='.23'/>`,
      body: `<rect x='18' y='26' width='88' height='11' rx='5' fill='${base}'/><polygon points='26,26 34,18 66,18 83,24 96,26' fill='${base}'/>`,
      roof: `<rect x='35' y='20' width='20' height='7' rx='2' fill='#dbeafe'/><rect x='58' y='20' width='13' height='7' rx='2' fill='#dbeafe'/>`,
      details: `${stripe(variant + 1, accent)}${lights(16, 30, 95, 29)}<rect x='20' y='33' width='82' height='2' rx='1' fill='${trim}' opacity='.6'/>`,
      wheels: `${wheel(35, 40, 8)}${wheel(79, 40, 8)}`
    };
  }
  if (arch === 'truck') {
    return {
      shadow: `<ellipse cx='58' cy='49' rx='41' ry='6' fill='#000' opacity='.24'/>`,
      body: `<rect x='16' y='27' width='40' height='10' rx='2' fill='${trim}'/><rect x='56' y='23' width='38' height='14' rx='3' fill='${base}'/><rect x='52' y='30' width='44' height='7' rx='2' fill='${base}'/>`,
      roof: `<rect x='62' y='24' width='15' height='7' rx='2' fill='#dbeafe'/>`,
      details: `${stripe(variant + 2, accent)}${lights(12, 31, 95, 30)}<rect x='20' y='30' width='28' height='3' rx='1' fill='${accent}' opacity='.8'/>`,
      wheels: `${wheel(31, 41, 8)}${wheel(79, 41, 8)}`
    };
  }
  if (arch === 'van') {
    return {
      shadow: `<ellipse cx='58' cy='49' rx='40' ry='6' fill='#000' opacity='.22'/>`,
      body: `<rect x='16' y='18' width='90' height='19' rx='6' fill='${base}'/><rect x='16' y='30' width='90' height='7' rx='4' fill='${trim}' opacity='.55'/>`,
      roof: `<rect x='22' y='21' width='18' height='7' rx='2' fill='#dbeafe'/><rect x='43' y='21' width='18' height='7' rx='2' fill='#dbeafe'/><rect x='64' y='21' width='18' height='7' rx='2' fill='#dbeafe'/>`,
      details: `${stripe(variant + 3, accent)}${lights(16, 31, 96, 30)}<rect x='78' y='30' width='14' height='6' rx='2' fill='${accent}' opacity='.4'/>`,
      wheels: `${wheel(35, 41, 7)}${wheel(85, 41, 7)}`
    };
  }
  if (arch === 'buggy') {
    return {
      shadow: `<ellipse cx='58' cy='49' rx='42' ry='6' fill='#000' opacity='.25'/>`,
      body: `<polygon points='16,34 36,34 44,24 64,24 74,30 96,30 104,34 104,37 16,37' fill='${base}'/>`,
      roof: `<polygon points='40,24 46,16 58,16 62,24' fill='#dbeafe'/><rect x='37' y='15' width='25' height='3' rx='1.5' fill='${trim}'/>`,
      details: `${stripe(variant, accent)}${lights(12, 32, 96, 31)}<rect x='84' y='27' width='12' height='3' rx='1' fill='${accent}'/>`,
      wheels: `${wheel(30, 42, 9)}${wheel(82, 42, 9)}`
    };
  }
  if (arch === 'retro') {
    return {
      shadow: `<ellipse cx='58' cy='49' rx='37' ry='6' fill='#000' opacity='.21'/>`,
      body: `<rect x='20' y='25' width='68' height='12' rx='6' fill='${base}'/><polygon points='26,25 34,19 68,19 80,25' fill='${base}'/>`,
      roof: `<rect x='34' y='20' width='16' height='7' rx='2' fill='#dbeafe'/><rect x='52' y='20' width='14' height='7' rx='2' fill='#dbeafe'/>`,
      details: `${stripe(variant + 1, accent)}${lights(17, 30, 84, 30)}<circle cx='24' cy='31' r='2.3' fill='#fde68a'/><circle cx='83' cy='31' r='2.3' fill='#fde68a'/>`,
      wheels: `${wheel(34, 41, 8)}${wheel(74, 41, 8)}`
    };
  }
  if (arch === 'mini') {
    return {
      shadow: `<ellipse cx='58' cy='49' rx='34' ry='5' fill='#000' opacity='.2'/>`,
      body: `<rect x='24' y='23' width='68' height='14' rx='7' fill='${base}'/><rect x='30' y='17' width='56' height='8' rx='4' fill='${trim}'/>`,
      roof: `<rect x='36' y='19' width='18' height='5' rx='2' fill='#dbeafe'/><rect x='56' y='19' width='18' height='5' rx='2' fill='#dbeafe'/>`,
      details: `${stripe(variant + 2, accent)}${lights(20, 31, 93, 30)}`,
      wheels: `${wheel(38, 41, 7)}${wheel(78, 41, 7)}`
    };
  }
  if (arch === 'hyper') {
    return {
      shadow: `<ellipse cx='58' cy='48' rx='42' ry='5' fill='#000' opacity='.24'/>`,
      body: `<polygon points='14,35 42,35 62,22 84,22 108,28 108,36 14,36' fill='${base}'/><polygon points='44,35 62,22 73,22 65,35' fill='${trim}' opacity='.45'/>`,
      roof: `<polygon points='61,22 74,22 69,28 56,28' fill='#dbeafe'/>`,
      details: `${stripe(variant + 3, accent)}${lights(11, 31, 100, 30)}<polygon points='92,24 105,24 108,28 95,28' fill='${accent}'/>`,
      wheels: `${wheel(31, 41, 7)}${wheel(89, 41, 7)}`
    };
  }
  if (arch === 'wagon') {
    return {
      shadow: `<ellipse cx='58' cy='49' rx='39' ry='6' fill='#000' opacity='.22'/>`,
      body: `<rect x='16' y='24' width='92' height='13' rx='5' fill='${base}'/><polygon points='22,24 30,18 80,18 92,24' fill='${base}'/>`,
      roof: `<rect x='28' y='19' width='16' height='7' rx='2' fill='#dbeafe'/><rect x='46' y='19' width='16' height='7' rx='2' fill='#dbeafe'/><rect x='64' y='19' width='14' height='7' rx='2' fill='#dbeafe'/>`,
      details: `${stripe(variant, accent)}${lights(13, 31, 99, 30)}<rect x='22' y='33' width='82' height='2' rx='1' fill='${trim}' opacity='.6'/>`,
      wheels: `${wheel(33, 41, 8)}${wheel(81, 41, 8)}`
    };
  }
  return {
    shadow: `<ellipse cx='58' cy='49' rx='33' ry='6' fill='#000' opacity='.2'/>`,
    body: `<ellipse cx='57' cy='30' rx='37' ry='12' fill='${base}'/><rect x='22' y='30' width='72' height='7' rx='3' fill='${trim}' opacity='.45'/>`,
    roof: `<ellipse cx='49' cy='24' rx='10' ry='5' fill='#dbeafe'/><ellipse cx='66' cy='24' rx='9' ry='5' fill='#dbeafe'/>`,
    details: `${stripe(variant + 1, accent)}${lights(16, 31, 95, 30)}`,
    wheels: `${wheel(36, 41, 7)}${wheel(74, 41, 7)}`
  };
};

const carSvg = (index: number): string => {
  const [base, trim, accent] = palettes[index % palettes.length];
  const arch = ARCHETYPES[index % ARCHETYPES.length];
  const variant = Math.floor(index / ARCHETYPES.length);
  const shape = buildShape(arch, variant, base, trim, accent);
  const number = String(index + 1).padStart(3, '0');

  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 56'>
  ${shape.shadow}
  ${shape.body}
  ${shape.roof}
  ${shape.details}
  ${shape.wheels}
  <text x='60' y='52' text-anchor='middle' font-family='Avenir Next, sans-serif' font-size='6.5' fill='#e5e7eb' opacity='.72'>${ARCHETYPE_LABEL[arch]} ${number}</text>
</svg>`;
};

const carName = (index: number): string => {
  const adjectives = ['Turbo', 'Quantum', 'Nova', 'Hyper', 'Solar', 'Shadow', 'Velocity', 'Crimson', 'Arctic', 'Neon'];
  const nouns = ['Falcon', 'Comet', 'Striker', 'Raptor', 'Pulse', 'Drift', 'Blaze', 'Rocket', 'Vector', 'Cyclone'];
  const arch = ARCHETYPES[index % ARCHETYPES.length];
  const a = adjectives[index % adjectives.length];
  const b = nouns[Math.floor(index / adjectives.length) % nouns.length];
  return `${ARCHETYPE_LABEL[arch]} ${a} ${b}`;
};

const carPrice = (index: number): number => 90 + (index % 10) * 18 + Math.floor(index / 10) * 14;
const carRarity = (index: number): 'common' | 'rare' | 'epic' => {
  if (index % 9 === 0) return 'epic';
  if (index % 3 === 0) return 'rare';
  return 'common';
};

export const GENERATED_CAR_DESIGNS: CarDesign[] = Array.from({ length: 100 }, (_, i) => {
  const id = `car-custom-${String(i + 1).padStart(3, '0')}`;
  const svg = carSvg(i);
  return {
    id,
    name: carName(i),
    price: carPrice(i),
    rarity: carRarity(i),
    svg,
    dataUri: encodeSvg(svg)
  };
});

export const GENERATED_CAR_MAP = Object.fromEntries(GENERATED_CAR_DESIGNS.map((car) => [car.id, car])) as Record<string, CarDesign>;

export const getCarSpriteSrc = (carId: string): string => {
  if (STOCK_CAR_ASSETS[carId]) return STOCK_CAR_ASSETS[carId];
  return GENERATED_CAR_MAP[carId]?.dataUri ?? STOCK_CAR_ASSETS['car-red'];
};
