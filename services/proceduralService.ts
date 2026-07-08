import { CelestialBody, DiscoveryType } from "../types";

// ---------------------------------------------------------------------------
// Local procedural generation engine.
// Replaces the previous Gemini API dependency so the game runs with ZERO
// server / API cost: every discovery is generated instantly in the browser.
// ---------------------------------------------------------------------------

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
const chance = (p: number) => Math.random() < p;

// --- Color helpers ---------------------------------------------------------

const hexToHsl = (hex: string): [number, number, number] => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
};

const hslToHex = (h: number, s: number, l: number): string => {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const deriveSecondaryColor = (primary: string): string => {
  const [h, s, l] = hexToHsl(primary);
  const hueShift = pick([-70, -45, 45, 70, 150]);
  return hslToHex(h + hueShift, Math.min(1, s * 0.9 + 0.1), Math.min(0.75, Math.max(0.25, l + rand(-0.15, 0.15))));
};

// --- Color themes ----------------------------------------------------------

interface ColorTheme {
  label: string;
  adjectives: string[];
  imagery: string[];
}

const COLOR_THEMES: Record<string, ColorTheme> = {
  '#ef4444': {
    label: 'red',
    adjectives: ['crimson', 'blood-red', 'scarlet', 'ember-lit'],
    imagery: ['rivers of molten iron', 'storms of glowing rust', 'canyons that smolder like dying coals', 'a sky the color of an open wound'],
  },
  '#f97316': {
    label: 'orange',
    adjectives: ['amber', 'copper-toned', 'sunset-orange', 'flame-bright'],
    imagery: ['dunes of powdered copper', 'permanent sunset light', 'clouds of burning citrus haze', 'plains that shimmer like heated bronze'],
  },
  '#eab308': {
    label: 'gold',
    adjectives: ['golden', 'saffron', 'honey-colored', 'sulfur-yellow'],
    imagery: ['seas of liquid gold', 'fields of crystallized sulfur', 'a haze of glittering pollen', 'light that pours like warm honey'],
  },
  '#22c55e': {
    label: 'green',
    adjectives: ['emerald', 'verdant', 'jade', 'chlorophyll-green'],
    imagery: ['continent-spanning moss forests', 'oceans of luminous algae', 'jade cliffs wet with rain', 'auroras the color of spring leaves'],
  },
  '#06b6d4': {
    label: 'cyan',
    adjectives: ['cyan', 'glacial', 'turquoise', 'electric-blue'],
    imagery: ['glaciers of frozen methane', 'shallow seas glowing turquoise', 'ice spires refracting pale light', 'mist that crackles with static'],
  },
  '#3b82f6': {
    label: 'blue',
    adjectives: ['sapphire', 'deep-blue', 'ultramarine', 'cobalt'],
    imagery: ['bottomless indigo oceans', 'storm bands of royal blue', 'rain that falls upward into sapphire clouds', 'twilight that never ends'],
  },
  '#a855f7': {
    label: 'purple',
    adjectives: ['violet', 'amethyst', 'royal-purple', 'ultraviolet'],
    imagery: ['crystal forests of amethyst', 'lightning that branches in violet fractals', 'fog banks of luminous lavender', 'a corona of ultraviolet fire'],
  },
  '#ec4899': {
    label: 'pink',
    adjectives: ['rose-pink', 'magenta', 'neon-pink', 'coral'],
    imagery: ['coral mountains in perpetual bloom', 'seas of carbonated rose foam', 'neon storms that hum audibly', 'clouds like spun sugar'],
  },
  '#f43f5e': {
    label: 'rose',
    adjectives: ['rose-red', 'garnet', 'wine-dark', 'blush-colored'],
    imagery: ['petals of mineral glass drifting on the wind', 'wine-dark tides', 'garnet reefs sharp as razors', 'a horizon stained like crushed berries'],
  },
  '#64748b': {
    label: 'slate',
    adjectives: ['ash-grey', 'slate', 'storm-grey', 'silver'],
    imagery: ['endless basalt plains', 'fog of powdered stone', 'monoliths worn smooth by ancient winds', 'a silence so deep it feels solid'],
  },
};

const FALLBACK_THEME: ColorTheme = {
  label: 'iridescent',
  adjectives: ['iridescent', 'prismatic', 'opalescent'],
  imagery: ['light that splits into impossible colors', 'surfaces that shimmer like oil on water'],
};

// --- Name generation -------------------------------------------------------

const NAME_ROOTS = [
  'Vel', 'Kha', 'Or', 'Ael', 'Zyn', 'Tor', 'Ish', 'Nym', 'Qua', 'Ery',
  'Sol', 'Umb', 'Cal', 'Dra', 'Pho', 'Lyr', 'Mar', 'Neb', 'Vor', 'Xan',
  'Thal', 'Ser', 'Ori', 'Bel', 'Kry', 'Az', 'Myr', 'Tess', 'Hel', 'Yav',
];

const NAME_MIDDLES = [
  'a', 'e', 'i', 'o', 'ara', 'eri', 'ion', 'yra', 'os', 'une',
  'ath', 'iel', 'ora', 'ys', 'antha', 'emis', 'idon', 'ova',
];

const PLANET_SUFFIXES = ['', ' Prime', ' II', ' III', ' IV', ' V', ' VII', ' IX', ' Minor', ' Major'];
const STAR_TITLES = ['', ' Majoris', ' Minoris', "'s Heart", "'s Eye", ' Australis', ' Borealis'];
const NEBULA_FORMS = ['Veil', 'Shroud', 'Bloom', 'Crown', 'Wake', 'Halo', 'Garden', 'Cradle', 'Serpent', 'Lantern'];
const ANOMALY_LABELS = ['Rift', 'Echo', 'Lattice', 'Signal', 'Fracture', 'Beacon', 'Mirror', 'Wound', 'Chorus', 'Door'];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const coreName = () => `${pick(NAME_ROOTS)}${pick(NAME_MIDDLES)}`;

const generateName = (type: DiscoveryType, theme: ColorTheme): string => {
  switch (type) {
    case DiscoveryType.PLANET:
      return `${coreName()}${pick(PLANET_SUFFIXES)}`;
    case DiscoveryType.STAR:
      return chance(0.4)
        ? `${coreName()}-${randInt(10, 9999)}`
        : `${coreName()}${pick(STAR_TITLES)}`;
    case DiscoveryType.NEBULA:
      return chance(0.5)
        ? `The ${capitalize(pick(theme.adjectives))} ${pick(NEBULA_FORMS)}`
        : `${coreName()} Nebula`;
    case DiscoveryType.ANOMALY:
      return chance(0.5)
        ? `Anomaly ${pick(['XR', 'KQ', 'ZT', 'OM', 'VH'])}-${randInt(100, 999)}`
        : `The ${pick(['Whispering', 'Silent', 'Hungry', 'Patient', 'Inverted', 'Recursive'])} ${pick(ANOMALY_LABELS)}`;
  }
};

// --- Description generation ------------------------------------------------

const PLANET_OPENERS = [
  'A slow-turning world wrapped in',
  'A colossal terrestrial planet dominated by',
  'A small, dense world defined by',
  'A tidally locked planet split between eternal night and',
  'A young, restless world still shaping',
  'An ancient, wind-scoured planet famous among survey crews for',
];

const STAR_OPENERS = [
  'A seething star whose surface churns with',
  'A quiet, ancient sun casting',
  'A volatile variable star that pulses with',
  'A dying giant slowly exhaling',
  'A newborn star burning fiercely through',
];

const NEBULA_OPENERS = [
  'A vast stellar nursery glowing with',
  'A drifting cloud of ionized gas painted in',
  'The luminous remnant of an ancient supernova, threaded with',
  'A cold molecular cloud lit from within by',
];

const ANOMALY_OPENERS = [
  'An unclassifiable phenomenon radiating',
  'A region where physics bends around',
  'A structure of unknown origin wreathed in',
  'A recurring sensor ghost that resolves into',
];

const CLOSERS = [
  'Long-range scans suggest no one has charted this place before.',
  'The ship\'s instruments struggle to capture its full strangeness.',
  'Something about it makes the crew reluctant to look away.',
  'It will be remembered as one of the survey\'s finest finds.',
  'Automated probes request permission to linger.',
  'The navigation computer quietly bookmarks it for future study.',
];

const generateDescription = (type: DiscoveryType, theme: ColorTheme): string => {
  const imagery = pick(theme.imagery);
  const secondImagery = pick(theme.imagery.filter(i => i !== imagery)) || imagery;
  const adj = pick(theme.adjectives);
  const openerMap: Record<DiscoveryType, string[]> = {
    [DiscoveryType.PLANET]: PLANET_OPENERS,
    [DiscoveryType.STAR]: STAR_OPENERS,
    [DiscoveryType.NEBULA]: NEBULA_OPENERS,
    [DiscoveryType.ANOMALY]: ANOMALY_OPENERS,
  };
  return `${pick(openerMap[type])} ${imagery}. From orbit, its ${adj} glow reveals ${secondImagery}. ${pick(CLOSERS)}`;
};

// --- Atmosphere & resources ------------------------------------------------

const ATMOSPHERES: Record<DiscoveryType, string[]> = {
  [DiscoveryType.PLANET]: [
    'Nitrogen-oxygen, breathable', 'Dense CO2 with acid haze', 'Thin argon veil',
    'Methane-rich and frigid', 'Supercritical steam layers', 'Trace helium, near-vacuum',
    'Ammonia clouds over inert nitrogen', 'Oxygen-rich with pollen storms',
  ],
  [DiscoveryType.STAR]: [
    'Plasma corona, 2M °K', 'Helium flash shell', 'Ionized hydrogen winds',
    'Metallic vapor photosphere', 'Slow solar wind, unusually calm',
  ],
  [DiscoveryType.NEBULA]: [
    'Ionized hydrogen and dust', 'Cold molecular CO clouds', 'Shock-heated oxygen filaments',
    'Silicate dust with organic traces',
  ],
  [DiscoveryType.ANOMALY]: [
    'Not applicable', 'Fluctuating / unreadable', 'Vacuum with phantom pressure readings',
    'Sensor returns contradict each other',
  ],
};

const RESOURCES = [
  'Iridium veins', 'Helium-3 pockets', 'Quantum-locked crystals', 'Exotic ice',
  'Superheavy isotopes', 'Void silk filaments', 'Photonic glass', 'Living metal spores',
  'Dark matter residue', 'Tachyonic dust', 'Pre-collapse alloys', 'Zero-point brine',
  'Chromatic quartz', 'Graviton pearls', 'Ancient probe wreckage', 'Bio-luminescent oil',
  'Stellar diamond shards', 'Frozen antimatter traces', 'Singing ore', 'Memory crystal lattice',
];

const generateResources = (theme: ColorTheme): string[] => {
  const shuffled = [...RESOURCES].sort(() => Math.random() - 0.5).slice(0, 2);
  return [`${capitalize(pick(theme.adjectives))} ${pick(['ore', 'crystal', 'plasma', 'resin'])}`, ...shuffled];
};

// --- Main generator ---------------------------------------------------------

const TYPE_WEIGHTS: [DiscoveryType, number][] = [
  [DiscoveryType.PLANET, 0.5],
  [DiscoveryType.STAR, 0.2],
  [DiscoveryType.NEBULA, 0.2],
  [DiscoveryType.ANOMALY, 0.1],
];

const rollType = (): DiscoveryType => {
  let r = Math.random();
  for (const [type, w] of TYPE_WEIGHTS) {
    if (r < w) return type;
    r -= w;
  }
  return DiscoveryType.PLANET;
};

const HABITABILITY_RANGES: Record<DiscoveryType, [number, number]> = {
  [DiscoveryType.PLANET]: [5, 95],
  [DiscoveryType.STAR]: [0, 4],
  [DiscoveryType.NEBULA]: [0, 12],
  [DiscoveryType.ANOMALY]: [0, 40],
};

export const generateDiscovery = async (colorTheme: string): Promise<CelestialBody> => {
  const theme = COLOR_THEMES[colorTheme.toLowerCase()] ?? FALLBACK_THEME;
  const type = rollType();
  const [habMin, habMax] = HABITABILITY_RANGES[type];

  return {
    id: crypto.randomUUID(),
    name: generateName(type, theme),
    type,
    description: generateDescription(type, theme),
    colorPrimary: colorTheme,
    colorSecondary: deriveSecondaryColor(colorTheme),
    atmosphere: pick(ATMOSPHERES[type]),
    resources: generateResources(theme),
    habitability: randInt(habMin, habMax),
    distanceLightYears: Math.round(rand(0.4, 150) * 10) / 10,
  };
};
