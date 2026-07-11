import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import {
  Asset,
  AssetType,
  ASSET_TYPES,
  ASSET_TYPE_LABELS,
  ASSET_TYPE_COLORS,
  exportJson,
  fmtMoney,
  fmtPct,
  fmtPrice,
  fmtTime,
  lastChangeOf,
  loadAssets,
  parseImport,
  pnlOf,
  pushPrice,
  saveAssets,
  signalOf,
  uid,
} from './model';

/* ---------- 小组件 ---------- */

const Sparkline: React.FC<{ points: { t: number; p: number }[] }> = ({ points }) => {
  if (points.length < 2) {
    return <div className="h-10 flex items-center text-xs text-slate-600">更新价格后显示走势</div>;
  }
  const w = 160;
  const h = 40;
  const ps = points.slice(-40);
  const min = Math.min(...ps.map((d) => d.p));
  const max = Math.max(...ps.map((d) => d.p));
  const span = max - min || 1;
  const pts = ps
    .map((d, i) => `${((i / (ps.length - 1)) * (w - 4) + 2).toFixed(1)},${(h - 4 - ((d.p - min) / span) * (h - 8) + 2).toFixed(1)}`)
    .join(' ');
  const up = ps[ps.length - 1].p >= ps[0].p;
  return (
    <svg width={w} height={h} className="shrink-0" aria-label="价格走势">
      <polyline
        points={pts}
        fill="none"
        stroke={up ? '#34d399' : '#f87171'}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

const SignalBadge: React.FC<{ asset: Asset }> = ({ asset }) => {
  const s = signalOf(asset);
  if (s === 'buy')
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 animate-pulse">
        ▼ 到达买入目标
      </span>
    );
  if (s === 'sell')
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse">
        ▲ 到达卖出目标
      </span>
    );
  return null;
};

const PnlText: React.FC<{ value: number; pct?: number; prefix?: string }> = ({ value, pct, prefix }) => (
  <span className={value >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
    {prefix}
    {value >= 0 ? '+' : ''}
    {fmtMoney(value)}
    {pct != null && <span className="ml-1 text-xs">({fmtPct(pct)})</span>}
  </span>
);

/* ---------- 表单 ---------- */

interface FormState {
  name: string;
  code: string;
  type: AssetType;
  currentPrice: string;
  buyTarget: string;
  sellTarget: string;
  holdingQty: string;
  costPrice: string;
  note: string;
}

const emptyForm: FormState = {
  name: '',
  code: '',
  type: 'stock',
  currentPrice: '',
  buyTarget: '',
  sellTarget: '',
  holdingQty: '',
  costPrice: '',
  note: '',
};

const formFromAsset = (a: Asset): FormState => ({
  name: a.name,
  code: a.code,
  type: a.type,
  currentPrice: String(a.currentPrice),
  buyTarget: a.buyTarget != null ? String(a.buyTarget) : '',
  sellTarget: a.sellTarget != null ? String(a.sellTarget) : '',
  holdingQty: a.holdingQty != null ? String(a.holdingQty) : '',
  costPrice: a.costPrice != null ? String(a.costPrice) : '',
  note: a.note ?? '',
});

const num = (s: string): number | undefined => {
  const v = Number(s);
  return s.trim() !== '' && isFinite(v) ? v : undefined;
};

const inputCls =
  'w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-fuchsia-500 placeholder:text-slate-600';

const AssetForm: React.FC<{
  initial: FormState;
  title: string;
  onCancel: () => void;
  onSubmit: (f: FormState) => void;
}> = ({ initial, title, onCancel, onSubmit }) => {
  const [f, setF] = useState(initial);
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });
  const valid = f.name.trim() !== '' && num(f.currentPrice) != null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">{title}</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 sm:col-span-1 text-xs text-slate-400">
            名称 *
            <input className={inputCls + ' mt-1'} value={f.name} onChange={set('name')} placeholder="如:贵州茅台" />
          </label>
          <label className="col-span-2 sm:col-span-1 text-xs text-slate-400">
            代码
            <input className={inputCls + ' mt-1'} value={f.code} onChange={set('code')} placeholder="如:600519 / BTC" />
          </label>
          <label className="col-span-2 sm:col-span-1 text-xs text-slate-400">
            类型
            <select className={inputCls + ' mt-1'} value={f.type} onChange={set('type')}>
              {ASSET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ASSET_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2 sm:col-span-1 text-xs text-slate-400">
            当前价格 *
            <input className={inputCls + ' mt-1'} value={f.currentPrice} onChange={set('currentPrice')} inputMode="decimal" placeholder="0.00" />
          </label>
          <label className="text-xs text-slate-400">
            目标买入价
            <input className={inputCls + ' mt-1'} value={f.buyTarget} onChange={set('buyTarget')} inputMode="decimal" placeholder="跌到此价提示" />
          </label>
          <label className="text-xs text-slate-400">
            目标卖出价
            <input className={inputCls + ' mt-1'} value={f.sellTarget} onChange={set('sellTarget')} inputMode="decimal" placeholder="涨到此价提示" />
          </label>
          <label className="text-xs text-slate-400">
            持仓数量
            <input className={inputCls + ' mt-1'} value={f.holdingQty} onChange={set('holdingQty')} inputMode="decimal" placeholder="空 = 仅观察" />
          </label>
          <label className="text-xs text-slate-400">
            持仓成本价
            <input className={inputCls + ' mt-1'} value={f.costPrice} onChange={set('costPrice')} inputMode="decimal" placeholder="每股/每份成本" />
          </label>
          <label className="col-span-2 text-xs text-slate-400">
            备注
            <input className={inputCls + ' mt-1'} value={f.note} onChange={set('note')} placeholder="观察理由、逻辑要点…" />
          </label>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button className="px-4 py-2 rounded-lg text-sm bg-slate-800 hover:bg-slate-700 transition-colors" onClick={onCancel}>
            取消
          </button>
          <button
            className="px-4 py-2 rounded-lg text-sm font-bold bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            disabled={!valid}
            onClick={() => onSubmit(f)}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------- 单个标的卡片 ---------- */

const AssetCard: React.FC<{
  asset: Asset;
  onUpdate: (a: Asset) => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ asset, onUpdate, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [logInput, setLogInput] = useState('');
  const pnl = pnlOf(asset);
  const change = lastChangeOf(asset);
  const signal = signalOf(asset);

  const applyPrice = () => {
    const p = num(priceInput);
    if (p == null || p <= 0) return;
    onUpdate(pushPrice(asset, p));
    setPriceInput('');
  };

  const addLog = () => {
    const text = logInput.trim();
    if (!text) return;
    onUpdate({
      ...asset,
      logs: [{ id: uid(), t: Date.now(), text }, ...asset.logs],
      updatedAt: Date.now(),
    });
    setLogInput('');
  };

  return (
    <div
      className={`rounded-2xl border bg-slate-900/70 p-4 transition-colors ${
        signal === 'buy' ? 'border-emerald-500/60' : signal === 'sell' ? 'border-rose-500/60' : 'border-slate-800'
      }`}
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-base truncate">{asset.name}</span>
            {asset.code && <span className="text-xs text-slate-500">{asset.code}</span>}
            <span className={`px-2 py-0.5 rounded-full text-xs border ${ASSET_TYPE_COLORS[asset.type]}`}>
              {ASSET_TYPE_LABELS[asset.type]}
            </span>
            <SignalBadge asset={asset} />
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-2xl font-bold tabular-nums">{fmtPrice(asset.currentPrice)}</span>
            {change != null && (
              <span className={`text-sm tabular-nums ${change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {fmtPct(change)}
              </span>
            )}
            <span className="text-xs text-slate-500">更新于 {fmtTime(asset.updatedAt)}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-400">
            {asset.buyTarget != null && <span>买入目标 {fmtPrice(asset.buyTarget)}</span>}
            {asset.sellTarget != null && <span>卖出目标 {fmtPrice(asset.sellTarget)}</span>}
            {pnl && (
              <span>
                持仓 {fmtMoney(asset.holdingQty!)} · 市值 {fmtMoney(pnl.value)} · 盈亏 <PnlText value={pnl.pnl} pct={pnl.pct} />
              </span>
            )}
          </div>
        </div>
        <Sparkline points={asset.history} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          className="w-32 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-fuchsia-500 placeholder:text-slate-600"
          value={priceInput}
          onChange={(e) => setPriceInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyPrice()}
          inputMode="decimal"
          placeholder="最新价格"
        />
        <button
          className="px-3 py-1.5 rounded-lg text-sm bg-fuchsia-600/80 hover:bg-fuchsia-500 disabled:opacity-40 transition-colors"
          disabled={num(priceInput) == null || Number(priceInput) <= 0}
          onClick={applyPrice}
        >
          更新价格
        </button>
        <div className="flex-1" />
        <button className="px-3 py-1.5 rounded-lg text-sm bg-slate-800 hover:bg-slate-700 transition-colors" onClick={() => setExpanded(!expanded)}>
          {expanded ? '收起' : `日志 (${asset.logs.length})`}
        </button>
        <button className="px-3 py-1.5 rounded-lg text-sm bg-slate-800 hover:bg-slate-700 transition-colors" onClick={onEdit}>
          编辑
        </button>
        <button
          className="px-3 py-1.5 rounded-lg text-sm bg-slate-800 hover:bg-rose-900/60 text-rose-300 transition-colors"
          onClick={() => {
            if (confirm(`删除「${asset.name}」及其全部记录?`)) onDelete();
          }}
        >
          删除
        </button>
      </div>

      {asset.note && <p className="mt-2 text-xs text-slate-400 border-l-2 border-slate-700 pl-2">{asset.note}</p>}

      {expanded && (
        <div className="mt-3 border-t border-slate-800 pt-3">
          <div className="flex gap-2">
            <input
              className="flex-1 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-fuchsia-500 placeholder:text-slate-600"
              value={logInput}
              onChange={(e) => setLogInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addLog()}
              placeholder="记录一条观察日志…"
            />
            <button
              className="px-3 py-1.5 rounded-lg text-sm bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
              disabled={!logInput.trim()}
              onClick={addLog}
            >
              记录
            </button>
          </div>
          {asset.logs.length === 0 ? (
            <p className="mt-2 text-xs text-slate-600">还没有日志。写下你为什么观察它、什么条件下操作。</p>
          ) : (
            <ul className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
              {asset.logs.map((l) => (
                <li key={l.id} className="text-sm flex gap-2 items-baseline">
                  <span className="text-xs text-slate-500 shrink-0 tabular-nums">{fmtTime(l.t)}</span>
                  <span className="text-slate-300">{l.text}</span>
                  <button
                    className="ml-auto text-xs text-slate-600 hover:text-rose-400 shrink-0"
                    onClick={() =>
                      onUpdate({ ...asset, logs: asset.logs.filter((x) => x.id !== l.id), updatedAt: Date.now() })
                    }
                  >
                    删
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

/* ---------- 主应用 ---------- */

type Filter = 'all' | AssetType;

const App: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>(loadAssets);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => saveAssets(assets), [assets]);

  const updateAsset = (next: Asset) => setAssets((list) => list.map((a) => (a.id === next.id ? next : a)));

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets
      .filter((a) => (filter === 'all' ? true : a.type === filter))
      .filter((a) => !q || a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q))
      .sort((a, b) => {
        // 触发信号的排最前,其余按更新时间倒序
        const sa = signalOf(a) ? 0 : 1;
        const sb = signalOf(b) ? 0 : 1;
        return sa !== sb ? sa - sb : b.updatedAt - a.updatedAt;
      });
  }, [assets, filter, search]);

  const summary = useMemo(() => {
    let cost = 0;
    let value = 0;
    let signals = 0;
    for (const a of assets) {
      const p = pnlOf(a);
      if (p) {
        cost += p.cost;
        value += p.value;
      }
      if (signalOf(a)) signals++;
    }
    return { cost, value, pnl: value - cost, pct: cost > 0 ? (value - cost) / cost : 0, signals };
  }, [assets]);

  const submitAdd = (f: FormState) => {
    const now = Date.now();
    const price = num(f.currentPrice)!;
    setAssets((list) => [
      {
        id: uid(),
        name: f.name.trim(),
        code: f.code.trim(),
        type: f.type,
        currentPrice: price,
        buyTarget: num(f.buyTarget),
        sellTarget: num(f.sellTarget),
        holdingQty: num(f.holdingQty),
        costPrice: num(f.costPrice),
        note: f.note.trim() || undefined,
        history: [{ t: now, p: price }],
        logs: [],
        createdAt: now,
        updatedAt: now,
      },
      ...list,
    ]);
    setAdding(false);
  };

  const submitEdit = (f: FormState) => {
    if (!editing) return;
    const price = num(f.currentPrice)!;
    const priceChanged = price !== editing.currentPrice;
    let next: Asset = {
      ...editing,
      name: f.name.trim(),
      code: f.code.trim(),
      type: f.type,
      buyTarget: num(f.buyTarget),
      sellTarget: num(f.sellTarget),
      holdingQty: num(f.holdingQty),
      costPrice: num(f.costPrice),
      note: f.note.trim() || undefined,
      updatedAt: Date.now(),
    };
    if (priceChanged) next = pushPrice(next, price);
    updateAsset(next);
    setEditing(null);
  };

  const doExport = () => {
    const blob = new Blob([exportJson(assets)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invest-watch-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const list = parseImport(String(reader.result));
      if (!list) {
        alert('导入失败:文件格式不正确。');
        return;
      }
      if (confirm(`导入 ${list.length} 个标的?将替换当前全部数据。`)) setAssets(list);
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
        <header className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">
            📈 投资观察系统
          </h1>
          <div className="flex-1" />
          <button className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 transition-colors" onClick={doExport}>
            导出备份
          </button>
          <button
            className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            导入
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) doImport(file);
              e.target.value = '';
            }}
          />
        </header>
        <p className="mt-1 text-xs text-slate-500">
          数据仅保存在本机浏览器,不上传任何服务器。价格需手动更新,适合低频价值观察。
        </p>

        {/* 汇总面板 */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3">
            <div className="text-xs text-slate-500">观察标的</div>
            <div className="text-xl font-bold tabular-nums">{assets.length}</div>
          </div>
          <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3">
            <div className="text-xs text-slate-500">持仓市值</div>
            <div className="text-xl font-bold tabular-nums">{fmtMoney(summary.value)}</div>
          </div>
          <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3">
            <div className="text-xs text-slate-500">总盈亏</div>
            <div className="text-xl font-bold tabular-nums">
              {summary.cost > 0 ? <PnlText value={summary.pnl} pct={summary.pct} /> : '—'}
            </div>
          </div>
          <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3">
            <div className="text-xs text-slate-500">触发信号</div>
            <div className={`text-xl font-bold tabular-nums ${summary.signals > 0 ? 'text-amber-300' : ''}`}>
              {summary.signals}
            </div>
          </div>
        </div>

        {/* 筛选 */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(['all', ...ASSET_TYPES] as Filter[]).map((t) => (
            <button
              key={t}
              className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                filter === t
                  ? 'bg-fuchsia-600 border-fuchsia-500 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
              onClick={() => setFilter(t)}
            >
              {t === 'all' ? '全部' : ASSET_TYPE_LABELS[t]}
            </button>
          ))}
          <input
            className="ml-auto w-40 bg-slate-900 border border-slate-700 rounded-full px-3 py-1.5 text-xs focus:outline-none focus:border-fuchsia-500 placeholder:text-slate-600"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索名称/代码"
          />
        </div>

        {/* 列表 */}
        <div className="mt-4 space-y-3">
          {visible.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-800 p-10 text-center text-slate-500 text-sm">
              {assets.length === 0 ? '还没有观察标的,点右下角「+ 添加标的」开始。' : '没有匹配的标的。'}
            </div>
          )}
          {visible.map((a) => (
            <AssetCard
              key={a.id}
              asset={a}
              onUpdate={updateAsset}
              onEdit={() => setEditing(a)}
              onDelete={() => setAssets((list) => list.filter((x) => x.id !== a.id))}
            />
          ))}
        </div>

        <footer className="mt-10 text-center text-xs text-slate-600">
          本工具仅用于个人记录,不构成任何投资建议。
          <a href="../" className="ml-2 hover:text-fuchsia-300 transition-colors">
            ← 返回 Chroma Cosmos
          </a>
        </footer>
      </div>

      {/* 添加按钮 */}
      <button
        className="fixed bottom-6 right-6 px-5 py-3 rounded-full font-bold bg-fuchsia-600 hover:bg-fuchsia-500 shadow-lg shadow-fuchsia-900/50 transition-colors"
        onClick={() => setAdding(true)}
      >
        + 添加标的
      </button>

      {adding && <AssetForm title="添加观察标的" initial={emptyForm} onCancel={() => setAdding(false)} onSubmit={submitAdd} />}
      {editing && (
        <AssetForm
          title={`编辑「${editing.name}」`}
          initial={formFromAsset(editing)}
          onCancel={() => setEditing(null)}
          onSubmit={submitEdit}
        />
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
