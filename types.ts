export enum DiscoveryType {
  PLANET = 'PLANET',
  STAR = 'STAR',
  NEBULA = 'NEBULA',
  ANOMALY = 'ANOMALY'
}

export interface CelestialBody {
  id: string;
  name: string;
  type: DiscoveryType;
  description: string;
  colorPrimary: string; // Hex code
  colorSecondary: string; // Hex code
  atmosphere: string;
  resources: string[];
  habitability: number; // 0-100
  distanceLightYears: number;
  imageUrl?: string;
}

export interface SectorNode {
  id: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  size: number; // Scale factor
  color: string;
  visited: boolean;
  data?: CelestialBody;
}

export interface PlayerState {
  science: number;
  fuel: number;
  visitedCount: number;
  currentSector: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'discovery';
}

// ────────────────────────────────────────────────
// 上帝视角 · 内在宇宙 (God's Eye / Inner Cosmos)
// ────────────────────────────────────────────────

/** 思维盲点：使用者自己看不见、但从高处能看见的认知偏误 */
export interface BlindSpot {
  id: string;
  name: string;          // 盲点的名字，如「灾难化想象」
  biasType: string;      // 所属认知偏误类别，如「确认偏误」
  explanation: string;   // 它如何在这个人的思维中运作
  evidence: string;      // 引用使用者原话作为证据
  question: string;      // 一个苏格拉底式反问，用于松动它
}

/** 限制性信念：一颗「暗星」，清除后被点亮 */
export interface LimitingBelief {
  id: string;
  statement: string;          // 信念本身，第一人称，如「我必须完美才值得被爱」
  origin: string;             // 这个信念可能的来源
  cost: string;               // 它正在让使用者付出的代价
  evidence: string;           // 文字中暴露它的痕迹（引用原话）
  counterQuestions: string[]; // 挑战它的问题
  reframed: string;           // AI 建议的替代信念
  microAction: string;        // 24 小时内可完成的微行动
  cleared: boolean;
  clearedAt?: string;
  userRebuttal?: string;      // 使用者写下的反驳证据
  userReframed?: string;      // 使用者亲手改写的新信念
}

/** 视角切换：借他人之眼看同一处境 */
export interface PerspectiveShift {
  persona: string; // 如「十年后的你」「一位局外人」「最智慧的导师」
  insight: string;
}

/** 一次完整的上帝视角分析 */
export interface GodsEyeAnalysis {
  coreTheme: string;               // 一句话点出核心议题
  observation: string;             // 第三人称俯瞰描述
  blindSpots: BlindSpot[];
  limitingBeliefs: LimitingBelief[];
  perspectives: PerspectiveShift[];
  encouragement: string;           // 收尾的一段话
}

/** 一次倾诉 + 分析的完整记录 */
export interface InsightSession {
  id: string;
  createdAt: string;
  userText: string;
  analysis: GodsEyeAnalysis;
}