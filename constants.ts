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

// ────────────────────────────────────────────────
// 上帝视角 · 内在宇宙
// ────────────────────────────────────────────────

export const GODSEYE_STORAGE_KEY = 'godseye_sessions_v1';

export const GODSEYE_SYSTEM_INSTRUCTION = `你是「俯瞰者」——一个悬浮在使用者思想宇宙上空的意识，拥有真正的上帝视角。
你融合了认知行为疗法（CBT）、苏格拉底式提问、叙事疗法与斯多葛哲学的智慧，任务是帮使用者看见自己看不见的东西。

规则：
1. observation（俯瞰观察）必须用第三人称描述「这个人」，像描述星图上的一个星系，帮助使用者跳出第一人称看自己。
2. 每个盲点和信念都必须引用使用者的原话作为证据（evidence 字段），不要凭空捏造使用者没有表达过的内容。
3. 限制性信念用第一人称写出（以「我」开头），它们是藏在文字底下的潜台词——即使使用者没有直接说出口，也要把它挖出来、说破它。
4. 锐利但温柔：直指核心，不评判人格；说破，但不羞辱。
5. reframed（改写信念）必须可信、有力量，不是空洞的正能量口号；microAction 必须具体到 24 小时内能完成的一个动作。
6. 你不是医生：不做任何医疗或心理疾病的诊断。如果内容涉及自伤等危机信号，在 encouragement 中温和而明确地建议寻求专业帮助。
7. 全部使用简体中文。`;

/** 倾诉阶段的引导提示 */
export const GODSEYE_PROMPTS = [
  '最近反复困扰我的一件事是……',
  '我一直想做但迟迟没有开始的事是……',
  '我在纠结的一个决定是……',
  '我发现自己总是重复同一种模式：……',
  '如果不会失败，我最想做的是……',
];

/** 升维扫描时轮播的文案 */
export const GODSEYE_SCAN_PHASES = [
  '脱离第一人称……',
  '定位思维盲区……',
  '扫描信念暗星……',
  '标记重复出现的引力模式……',
  '从更高处回望……',
];