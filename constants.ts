export const GEMINI_MODEL = 'gemini-3-flash-preview';
export const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';

export const COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#64748b', // Slate
];

export const INITIAL_FUEL = 100;
export const FUEL_COST_WARP = 25; // Cost to generate new sector
export const FUEL_COST_TRAVEL = 5; // Cost to visit a node
export const SCIENCE_REWARD_BASE = 50;

export const SYSTEM_INSTRUCTION = `You are the ship's computer for an advanced exploration vessel. 
Your job is to procedurally generate scientifically plausible yet fantastical celestial bodies based on color themes.
Be creative, evocative, and concise.`;