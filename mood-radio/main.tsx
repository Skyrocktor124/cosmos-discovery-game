import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import ShareButton from '../shared/ShareButton';
import { radio, SECTION_NAMES } from './music';
import type { MusicProfile } from './music';
import { MOODS, MOOD_BY_ID, matchMood, isIntense, songLink, type Mood, type MoodMatch } from './moods';

const LAST_KEY = 'mood-radio-last-v1';
const PLATFORMS = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'spotify', label: 'Spotify' },
  { id: 'netease', label: '网易云' },
] as const;

/** Strong feelings get a slower, sparser, quieter piece — less to process. */
const tune = (profile: MusicProfile, intense: boolean): MusicProfile => {
  if (!intense) return profile;
  return {
    ...profile,
    bpm: Math.round(profile.bpm * 0.88),
    breath: profile.breath * 1.2,
    melodyDensity: profile.melodyDensity * 0.7,
    perc: false,
    volume: profile.volume * 0.92,
    brightness: profile.brightness * 0.85,
  };
};

const readMoodParam = (): Mood | null => {
  const id = new URLSearchParams(location.search).get('mood');
  return id ? MOOD_BY_ID.get(id) ?? null : null;
};

const Playlist: React.FC<{ mood: Mood }> = ({ mood }) => (
  <ol className="flex flex-col gap-2" data-testid="playlist">
    {mood.songs.map((song, i) => (
      <li
        key={`${song.title}-${song.artist}`}
        className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-sm transition-colors hover:bg-white/[0.06]"
      >
        <span className="font-mono text-xs text-slate-500 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-white">{song.title}</span>
          <span className="block text-xs text-slate-400">{song.artist}</span>
        </span>
        {/* On phones the platform links drop to their own row so titles never truncate */}
        <span className="flex shrink-0 basis-full gap-1.5 pl-7 sm:basis-auto sm:pl-0">
          {PLATFORMS.map(p => (
            <a
              key={p.id}
              href={songLink(song, p.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-colors hover:border-white/30 hover:text-white"
            >
              {p.label}
            </a>
          ))}
        </span>
      </li>
    ))}
  </ol>
);

const Station: React.FC<{ match: MoodMatch; intense: boolean; onBack: () => void }> = ({ match, intense, onBack }) => {
  const { mood, hits, guessed } = match;
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [level, setLevel] = useState(0);
  const [section, setSection] = useState(0);
  const profile = useMemo(() => tune(mood.audio, intense), [mood, intense]);

  // Live output meter: if these bars move but you hear nothing, the problem is
  // the device (muted, silent switch, wrong output) rather than the station.
  useEffect(() => {
    if (!playing) { setLevel(0); return; }
    let raf = 0;
    const tick = () => {
      setLevel(radio.getLevel());
      setSection(radio.position.section);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // Reached by a tap, so audio usually starts straight away — but a cold
  // shared link has no gesture, and the browser will keep it suspended.
  // Re-check once the resume promise has had a chance to settle.
  useEffect(() => {
    radio.start(profile);
    setPlaying(radio.isAudible);
    const t = setTimeout(() => setPlaying(radio.isAudible), 350);
    return () => { clearTimeout(t); radio.stop(); };
  }, [profile]);

  const toggle = () => {
    if (playing) {
      radio.stop();
      setPlaying(false);
    } else {
      radio.start(profile);
      setPlaying(radio.isPlaying);
    }
  };

  const onVolume = (v: number) => {
    setVolume(v);
    radio.setVolume(v);
  };

  const shareUrl = `${location.origin}${location.pathname}?mood=${mood.id}`;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 px-5 py-10">
      <header className="flex flex-col items-center gap-2 text-center">
        <button
          onClick={onBack}
          className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors hover:text-white"
        >
          ← 换一种心情
        </button>
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
          {mood.emoji} {mood.label}频率
        </h1>
        <p className="text-sm" style={{ color: mood.accent }}>{mood.intent}</p>
        {guessed ? (
          <p className="max-w-sm text-xs leading-relaxed text-slate-500">
            没太听懂你说的,先给你一段最安全的频率。也可以直接点下面的心情标签。
          </p>
        ) : hits.length > 0 && (
          <p className="text-xs text-slate-500">
            听到了:{hits.slice(0, 4).map(h => `「${h}」`).join(' ')}{intense && ' · 已放慢速度'}
          </p>
        )}
      </header>

      {/* Breathing ring — doubles as the play/pause control */}
      <button
        onClick={toggle}
        aria-label={playing ? '暂停音景' : '播放音景'}
        data-testid="play-toggle"
        className="group relative flex h-52 w-52 items-center justify-center sm:h-60 sm:w-60"
      >
        <span
          className={`absolute inset-0 rounded-full blur-2xl ${playing ? 'animate-breathe' : 'opacity-40'}`}
          style={{ background: mood.accent, ['--breath' as string]: `${profile.breath}s` }}
        />
        <span
          className={`absolute inset-4 rounded-full border-2 ${playing ? 'animate-breathe' : 'opacity-50'}`}
          style={{ borderColor: mood.accent, ['--breath' as string]: `${profile.breath}s` }}
        />
        <span className="relative flex flex-col items-center gap-1">
          <span className="text-4xl">{playing ? '❚❚' : '▶'}</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">
            {playing ? '跟着圈呼吸' : '点击收听'}
          </span>
        </span>
      </button>

      <div className="-mt-4 flex flex-col items-center gap-1 text-center">
        <span className="text-sm font-semibold text-white" data-testid="track-name">{mood.track}</span>
        <span className="text-[10px] text-slate-500">
          为这个心情实时演奏 · {profile.bpm} BPM · {mood.audio.bed === 'rain' ? '雨声' : mood.audio.bed === 'waves' ? '海浪' : '无环境声'}
        </span>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">🔈</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={e => onVolume(Number(e.target.value))}
            aria-label="音量"
            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-white"
            style={{ accentColor: mood.accent }}
          />
          <span className="text-xs text-slate-500">🔊</span>
        </div>

        {/* Output meter */}
        <div className="flex items-center gap-2" data-testid="meter" data-level={level.toFixed(3)}>
          <span className="flex h-3 flex-1 items-end gap-[3px]">
            {Array.from({ length: 14 }, (_, i) => (
              <span
                key={i}
                className="h-full flex-1 rounded-sm transition-opacity duration-75"
                style={{
                  background: mood.accent,
                  opacity: level * 14 > i ? 0.9 : 0.12,
                }}
              />
            ))}
          </span>
          <span data-testid="status" className="w-28 shrink-0 text-right text-[10px] text-slate-500">
            {playing ? `正在播放 · ${SECTION_NAMES[section]}` : '已暂停'}
          </span>
        </div>
        {playing && (
          <p className="text-center text-[10px] leading-relaxed text-slate-600">
            本曲由浏览器实时演奏,每次都不一样,可以一直听下去。<br />
            条在动却听不见,请检查手机静音键和音量。
          </p>
        )}
      </div>

      <p className="max-w-md rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-center text-sm leading-relaxed text-slate-300">
        {mood.care}
      </p>

      <section className="w-full">
        <h2 className="mb-3 flex items-baseline gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
          延伸歌单
          <span className="text-[10px] normal-case tracking-normal text-slate-600">
            听完这首,还可以听这 {mood.songs.length} 首 · 点平台名跳转
          </span>
        </h2>
        <Playlist mood={mood} />
      </section>

      <ShareButton
        text={`我的心情是「${mood.label}」,心情电台给了我 ${mood.songs.length} 首疗愈歌 ${mood.emoji}`}
        url={shareUrl}
      />
    </div>
  );
};

const Picker: React.FC<{ onPick: (text: string) => void; initial: string }> = ({ onPick, initial }) => {
  const [text, setText] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) onPick(text);
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-8 px-5 py-16">
      <header className="flex flex-col items-center gap-3 text-center">
        <h1 className="bg-gradient-to-r from-cyan-300 via-violet-300 to-pink-300 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-4xl">
          心情电台
        </h1>
        <p className="text-sm text-slate-400">
          说说你现在的心情,给你一段疗愈频率和一份歌单。
        </p>
        <p className="text-xs text-slate-600">Mood Radio · 中英文都能听懂 · 完全免费,不用注册</p>
      </header>

      <form onSubmit={submit} className="flex w-full flex-col gap-3">
        <input
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="例如:今天加班到现在,累到不想说话"
          maxLength={120}
          data-testid="mood-input"
          className="w-full rounded-2xl border border-white/15 bg-white/[0.04] px-5 py-4 text-base text-white placeholder:text-slate-600 focus:border-white/40 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          data-testid="tune-in"
          className="rounded-2xl bg-white px-6 py-3.5 text-sm font-black uppercase tracking-widest text-slate-900 transition-opacity disabled:cursor-not-allowed disabled:opacity-25"
        >
          为我调频 ♪
        </button>
      </form>

      <div className="flex w-full flex-col items-center gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">或者直接选一个</span>
        <div className="flex flex-wrap justify-center gap-2">
          {MOODS.map(m => (
            <button
              key={m.id}
              onClick={() => onPick(m.label)}
              className="rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors"
              style={{ borderColor: `${m.accent}55`, color: m.accent }}
            >
              {m.emoji} {m.label}
            </button>
          ))}
        </div>
      </div>

      <nav className="mt-6 flex flex-wrap justify-center gap-4 text-xs font-bold uppercase text-slate-600">
        <a href="../" className="transition-colors hover:text-cyan-300">▶ Chroma Cosmos</a>
        <a href="../astro-merge/" className="transition-colors hover:text-fuchsia-300">▶ Astro Merge</a>
        <a href="../orbit-dash/" className="transition-colors hover:text-amber-300">▶ Orbit Dash</a>
        <a href="../star-serpent/" className="transition-colors hover:text-emerald-300">▶ Star Serpent</a>
      </nav>
    </div>
  );
};

const App: React.FC = () => {
  const [match, setMatch] = useState<MoodMatch | null>(null);
  const [intense, setIntense] = useState(false);
  const [lastText, setLastText] = useState('');

  // A shared ?mood=... link opens straight on that station.
  useEffect(() => {
    const shared = readMoodParam();
    if (shared) {
      setMatch({ mood: shared, hits: [], guessed: false });
      return;
    }
    try {
      const saved = localStorage.getItem(LAST_KEY);
      if (saved) setLastText(saved);
    } catch { /* storage may be blocked */ }
  }, []);

  const tuneIn = (text: string) => {
    const result = matchMood(text);
    if (!result) return;
    setIntense(isIntense(text));
    setMatch(result);
    try { localStorage.setItem(LAST_KEY, text); } catch { /* ignore */ }
  };

  const back = () => {
    radio.stop();
    setMatch(null);
    history.replaceState(null, '', location.pathname);
  };

  const accent = match?.mood.glow ?? '#0f172a';

  return (
    <div
      className="min-h-dvh w-full overflow-y-auto text-white transition-[background] duration-1000"
      style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent} 0%, #020617 65%)` }}
    >
      {match
        ? <Station match={match} intense={intense} onBack={back} />
        : <Picker onPick={tuneIn} initial={lastText} />}
    </div>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element');
ReactDOM.createRoot(rootElement).render(<App />);
