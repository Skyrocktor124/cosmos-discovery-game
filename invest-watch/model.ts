// 投资观察系统 — 数据模型与本地存储(零后端,纯 localStorage)

export type AssetType = 'stock' | 'fund' | 'crypto' | 'other';

export const ASSET_TYPES: AssetType[] = ['stock', 'fund', 'crypto', 'other'];

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  stock: '股票',
  fund: '基金',
  crypto: '加密货币',
  other: '其他',
};

export const ASSET_TYPE_COLORS: Record<AssetType, string> = {
  stock: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  fund: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  crypto: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  other: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
};

export interface PricePoint {
  t: number; // 时间戳(毫秒)
  p: number; // 价格
}

export interface LogEntry {
  id: string;
  t: number;
  text: string;
}

export interface Asset {
  id: string;
  name: string;
  code: string;
  type: AssetType;
  currentPrice: number;
  buyTarget?: number; // 目标买入价:现价 ≤ 此价时提示
  sellTarget?: number; // 目标卖出价:现价 ≥ 此价时提示
  holdingQty?: number; // 持仓数量(0 或空 = 仅观察)
  costPrice?: number; // 持仓成本价
  note?: string;
  history: PricePoint[];
  logs: LogEntry[];
  createdAt: number;
  updatedAt: number;
}

const SAVE_KEY = 'invest-watch-v1';
const HISTORY_LIMIT = 200; // 每个标的最多保留的价格记录条数

export const uid = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function loadAssets(): Asset[] {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data.assets) ? data.assets : [];
  } catch {
    return [];
  }
}

export function saveAssets(assets: Asset[]): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, assets }));
  } catch {
    // 存储不可用(隐私模式/超限)时静默失败,应用仍可继续使用
  }
}

export function pushPrice(asset: Asset, price: number, now = Date.now()): Asset {
  const history = [...asset.history, { t: now, p: price }].slice(-HISTORY_LIMIT);
  return { ...asset, currentPrice: price, history, updatedAt: now };
}

export type Signal = 'buy' | 'sell' | null;

export function signalOf(a: Asset): Signal {
  if (a.buyTarget != null && a.buyTarget > 0 && a.currentPrice <= a.buyTarget) return 'buy';
  if (a.sellTarget != null && a.sellTarget > 0 && a.currentPrice >= a.sellTarget) return 'sell';
  return null;
}

export interface Pnl {
  cost: number; // 持仓成本
  value: number; // 当前市值
  pnl: number; // 盈亏额
  pct: number; // 盈亏率(-1 ~ ∞)
}

export function pnlOf(a: Asset): Pnl | null {
  if (!a.holdingQty || !a.costPrice) return null;
  const cost = a.holdingQty * a.costPrice;
  const value = a.holdingQty * a.currentPrice;
  return { cost, value, pnl: value - cost, pct: cost > 0 ? (value - cost) / cost : 0 };
}

/** 最近一次价格变动的涨跌幅(相对于上一条记录) */
export function lastChangeOf(a: Asset): number | null {
  const h = a.history;
  if (h.length < 2) return null;
  const prev = h[h.length - 2].p;
  return prev > 0 ? (h[h.length - 1].p - prev) / prev : null;
}

export function fmtPrice(p: number): string {
  if (!isFinite(p)) return '—';
  const abs = Math.abs(p);
  const digits = abs >= 1000 ? 2 : abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6;
  return p.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

export function fmtMoney(v: number): string {
  return v.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}

export function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)}%`;
}

export function fmtTime(t: number): string {
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function exportJson(assets: Asset[]): string {
  return JSON.stringify({ version: 1, exportedAt: Date.now(), assets }, null, 2);
}

/** 解析导入的 JSON;非法数据返回 null */
export function parseImport(raw: string): Asset[] | null {
  try {
    const data = JSON.parse(raw);
    const list = Array.isArray(data) ? data : data.assets;
    if (!Array.isArray(list)) return null;
    const ok = list.every(
      (a) => a && typeof a.id === 'string' && typeof a.name === 'string' && typeof a.currentPrice === 'number',
    );
    if (!ok) return null;
    return list.map((a) => ({
      history: [],
      logs: [],
      code: '',
      type: 'other' as AssetType,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...a,
    }));
  } catch {
    return null;
  }
}
