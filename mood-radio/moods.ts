// Mood taxonomy for the healing radio.
// Everything here is static data: the "recommendation engine" is keyword
// matching in the browser, so the station costs nothing to run and works offline.

import { CHORDS, type MusicProfile } from './music';

export interface Song {
  title: string;
  artist: string;
}

export interface Mood {
  id: string;
  emoji: string;
  label: string;      // 中文名
  labelEn: string;
  accent: string;     // hex, drives the whole station's palette
  glow: string;       // background wash
  intent: string;     // 这个频率想为你做什么
  intentEn: string;
  care: string;       // 一句陪伴的话 / 呼吸提示
  track: string;      // 这首生成曲的名字
  keywords: string[]; // matched as substrings against the raw input
  songs: Song[];
  audio: MusicProfile;
}

export const MOODS: Mood[] = [
  {
    id: 'anxious',
    emoji: '🌊',
    label: '焦虑不安',
    labelEn: 'Anxious',
    accent: '#22d3ee',
    glow: '#083344',
    intent: '把心跳调慢,让身体先松下来',
    intentEn: 'Slow the pulse, unclench the body',
    care: '跟着光圈呼吸:吸气 4 秒,停 2 秒,吐气 6 秒。吐气比吸气长,身体就知道危险过去了。',
    keywords: [
      '焦虑', '紧张', '慌', '不安', '害怕', '担心', '压力', '喘不过气', '心跳', '内耗', 'emo',
      'anxious', 'anxiety', 'nervous', 'panic', 'stress', 'worried', 'overwhelmed', 'tense',
    ],
    songs: [
      { title: 'Weightless', artist: 'Marconi Union' },
      { title: 'Gymnopédie No.1', artist: 'Erik Satie' },
      { title: 'Nuvole Bianche', artist: 'Ludovico Einaudi' },
      { title: '云烟成雨', artist: '房东的猫' },
      { title: '贝加尔湖畔', artist: '李健' },
      { title: 'Watermark', artist: 'Enya' },
    ],
    track: '《把心跳调慢》',
    audio: {
      root: 146.83, scale: [0, 2, 4, 7, 9], progression: [CHORDS.Isus2, CHORDS.IVadd9, CHORDS.Isus2, CHORDS.V7sus],
      bpm: 56, barsPerChord: 2,
      pad: 'glass', melody: 'glass', arp: 'harp',
      melodyLow: 2, melodyRange: 2, melodySlots: [0, 6, 11], melodyDensity: 0.5,
      contour: 'hover', bass: 'pedal', arpEvery: 6, swing: 0, perc: false,
      brightness: 3000, bed: 'waves', breath: 12, volume: 0.85,
    },
  },
  {
    id: 'sad',
    emoji: '🌧️',
    label: '难过想哭',
    labelEn: 'Sad',
    accent: '#818cf8',
    glow: '#1e1b4b',
    intent: '不急着让你好起来,先陪你把它听完',
    intentEn: 'Not to fix it — to sit with it',
    care: '难过不需要被赶走。让它有个地方待着,它自己会慢慢变轻。想哭就哭,这也是一种排水。',
    keywords: [
      '难过', '悲伤', '想哭', '伤心', '失恋', '分手', '心碎', '委屈', '低落', '沮丧', '崩溃', '痛',
      'sad', 'cry', 'heartbreak', 'breakup', 'grief', 'down', 'blue', 'depressed', 'hurt',
    ],
    songs: [
      { title: 'Someone Like You', artist: 'Adele' },
      { title: 'Everybody Hurts', artist: 'R.E.M.' },
      { title: 'On the Nature of Daylight', artist: 'Max Richter' },
      { title: '后来', artist: '刘若英' },
      { title: '突然好想你', artist: '五月天' },
      { title: '好久不见', artist: '陈奕迅' },
    ],
    track: '《陪你把它听完》',
    audio: {
      root: 130.81, scale: [0, 3, 5, 7, 10], progression: [CHORDS.i7, CHORDS.bVI, CHORDS.bIII, CHORDS.bVII],
      bpm: 52, barsPerChord: 2,
      pad: 'strings', melody: 'felt', arp: 'felt',
      melodyLow: 2, melodyRange: 2, melodySlots: [0, 5, 10, 14], melodyDensity: 0.5,
      contour: 'fall', bass: 'sparse', arpEvery: 8, swing: 0, perc: false,
      brightness: 2600, bed: 'rain', breath: 14, volume: 0.85,
    },
  },
  {
    id: 'tired',
    emoji: '🍃',
    label: '疲惫耗尽',
    labelEn: 'Exhausted',
    accent: '#4ade80',
    glow: '#052e16',
    intent: '什么都不用做,先把电充回来一点',
    intentEn: 'Nothing to do here but recharge',
    care: '累不是你不够努力的证据,是你已经撑了很久的证据。这 10 分钟不属于任何人,只属于你。',
    keywords: [
      '累', '疲惫', '疲劳', '倦', '没力气', '耗尽', '撑不住', '想躺', '摆烂', '加班', '忙',
      'tired', 'exhausted', 'burnout', 'burnt out', 'drained', 'weary', 'fatigue', 'overworked',
    ],
    songs: [
      { title: 'Sunrise', artist: 'Norah Jones' },
      { title: 'Lovely Day', artist: 'Bill Withers' },
      { title: '平凡之路', artist: '朴树' },
      { title: 'Fix You', artist: 'Coldplay' },
      { title: 'Spiegel im Spiegel', artist: 'Arvo Pärt' },
      { title: '稻香', artist: '周杰伦' },
    ],
    track: '《先把电充回来》',
    audio: {
      root: 164.81, scale: [0, 2, 5, 7, 9], progression: [CHORDS.Imaj7, CHORDS.IVmaj7, CHORDS.ii7, CHORDS.V7sus],
      bpm: 66, barsPerChord: 1,
      pad: 'air', melody: 'air', arp: 'harp',
      melodyLow: 2, melodyRange: 2, melodySlots: [0, 6, 12], melodyDensity: 0.45,
      contour: 'fall', bass: 'pedal', arpEvery: 4, swing: 0.08, perc: false,
      brightness: 2600, bed: 'waves', breath: 13, volume: 0.8,
    },
  },
  {
    id: 'lonely',
    emoji: '🕯️',
    label: '孤独没人懂',
    labelEn: 'Lonely',
    accent: '#fbbf24',
    glow: '#451a03',
    intent: '房间里多一盏灯,和一点人声',
    intentEn: 'One more lamp on in the room',
    care: '此刻地球上有几十万人和你听着同一种安静。孤独不代表被遗弃,它只是暂时没人接住你。',
    keywords: [
      '孤独', '寂寞', '一个人', '没人懂', '没人陪', '空虚', '被孤立', '想念朋友', '异乡',
      'lonely', 'alone', 'isolated', 'nobody', 'empty', 'homesick', 'left out',
    ],
    songs: [
      { title: '夜空中最亮的星', artist: '逃跑计划' },
      { title: 'Saturn', artist: 'Sleeping At Last' },
      { title: 'To Build a Home', artist: 'The Cinematic Orchestra' },
      { title: '陪你度过漫长岁月', artist: '陈奕迅' },
      { title: 'Bridge Over Troubled Water', artist: 'Simon & Garfunkel' },
      { title: 'Holocene', artist: 'Bon Iver' },
    ],
    track: '《房间里多一盏灯》',
    audio: {
      root: 155.56, scale: [0, 2, 3, 7, 9], progression: [CHORDS.i9, CHORDS.bIII, CHORDS.bVII, CHORDS.iv7],
      bpm: 70, barsPerChord: 1,
      pad: 'glass', melody: 'bell', arp: 'harp',
      melodyLow: 2, melodyRange: 2, melodySlots: [0, 4, 8, 12], melodyDensity: 0.55,
      contour: 'arc', bass: 'root13', arpEvery: 4, swing: 0, perc: true,
      brightness: 3400, bed: 'rain', breath: 12, volume: 0.85,
    },
  },
  {
    id: 'angry',
    emoji: '🔥',
    label: '愤怒烦躁',
    labelEn: 'Angry',
    accent: '#fb7185',
    glow: '#4c0519',
    intent: '先让火烧出来,再慢慢降温',
    intentEn: 'Let it burn, then let it cool',
    care: '生气说明你的边界被踩了,这是合理的。先用力吐三口气,把肩膀放下来,再决定要不要回应。',
    keywords: [
      '愤怒', '生气', '烦', '烦躁', '气死', '火大', '暴躁', '不爽', '讨厌', '恨', '受不了',
      'angry', 'anger', 'mad', 'furious', 'rage', 'annoyed', 'irritated', 'frustrated', 'pissed',
    ],
    songs: [
      { title: 'Let It Be', artist: 'The Beatles' },
      { title: '倔强', artist: '五月天' },
      { title: 'Breathe Me', artist: 'Sia' },
      { title: 'Experience', artist: 'Ludovico Einaudi' },
      { title: '怒放的生命', artist: '汪峰' },
      { title: 'Rise Up', artist: 'Andra Day' },
    ],
    track: '《先烧完再降温》',
    audio: {
      root: 138.59, scale: [0, 5, 7, 10, 12], progression: [CHORDS.i, CHORDS.iv, CHORDS.bVII, CHORDS.bVI],
      bpm: 84, barsPerChord: 1,
      pad: 'reed', melody: 'reed', arp: 'reed',
      melodyLow: 1, melodyRange: 2, melodySlots: [0, 2, 4, 6, 8, 10, 12, 14], melodyDensity: 0.6,
      contour: 'leap', bass: 'root13', arpEvery: 2, swing: 0, perc: true,
      brightness: 3800, bed: 'waves', breath: 10, volume: 0.74,
    },
  },
  {
    id: 'calm',
    emoji: '🌙',
    label: '平静放松',
    labelEn: 'Calm',
    accent: '#a78bfa',
    glow: '#2e1065',
    intent: '把这份平静调得更深一点',
    intentEn: 'Deepen the quiet you already have',
    care: '平静是很珍贵的状态,值得被延长。什么都不想,只听声音在房间里散开就好。',
    keywords: [
      '平静', '放松', '安静', '还好', '平常', '发呆', '冥想', '专注', '看书', '写字', '一般',
      'calm', 'relax', 'peaceful', 'quiet', 'chill', 'okay', 'fine', 'focus', 'meditate', 'study',
    ],
    songs: [
      { title: 'Clair de Lune', artist: 'Claude Debussy' },
      { title: '旅行的意义', artist: '陈绮贞' },
      { title: "Comptine d'un autre été", artist: 'Yann Tiersen' },
      { title: 'Only Time', artist: 'Enya' },
      { title: '我想和你虚度时光', artist: '程璧' },
      { title: 'Merry Christmas Mr. Lawrence', artist: '坂本龍一' },
    ],
    track: '《把安静调得更深》',
    audio: {
      root: 174.61, scale: [0, 2, 4, 7, 9], progression: [CHORDS.Imaj7, CHORDS.vi7, CHORDS.IVmaj7, CHORDS.V7sus],
      bpm: 72, barsPerChord: 1,
      pad: 'strings', melody: 'felt', arp: 'harp',
      melodyLow: 2, melodyRange: 2, melodySlots: [0, 4, 8, 11, 14], melodyDensity: 0.5,
      contour: 'arc', bass: 'root13', arpEvery: 4, swing: 0, perc: false,
      brightness: 3600, bed: 'none', breath: 11, volume: 0.85,
    },
  },
  {
    id: 'joyful',
    emoji: '☀️',
    label: '开心雀跃',
    labelEn: 'Joyful',
    accent: '#f472b6',
    glow: '#500724',
    intent: '把这份好心情摊开、晒久一点',
    intentEn: 'Stretch the good mood out',
    care: '开心的时候记得停三秒,认真感受一下它。被好好感受过的快乐,记得更久。',
    keywords: [
      '开心', '快乐', '高兴', '兴奋', '幸福', '爽', '好事', '恋爱', '成功', '通过了', '放假',
      'happy', 'joy', 'excited', 'great', 'good mood', 'celebrate', 'love', 'grateful', 'yay',
    ],
    songs: [
      { title: 'Here Comes the Sun', artist: 'The Beatles' },
      { title: 'Three Little Birds', artist: 'Bob Marley' },
      { title: '宁夏', artist: '梁静茹' },
      { title: 'What a Wonderful World', artist: 'Louis Armstrong' },
      { title: '恋爱ing', artist: '五月天' },
      { title: 'Best Day of My Life', artist: 'American Authors' },
    ],
    track: '《晒久一点》',
    audio: {
      root: 196.0, scale: [0, 2, 4, 7, 9, 12], progression: [CHORDS.I, CHORDS.V, CHORDS.vi7, CHORDS.IV],
      bpm: 104, barsPerChord: 1,
      pad: 'strings', melody: 'kalimba', arp: 'kalimba',
      melodyLow: 2, melodyRange: 2, melodySlots: [0, 2, 3, 6, 8, 10, 11, 14], melodyDensity: 0.7,
      contour: 'rise', bass: 'walk', arpEvery: 2, swing: 0.14, perc: true,
      brightness: 5200, bed: 'none', breath: 9, volume: 0.78,
    },
  },
  {
    id: 'longing',
    emoji: '🌾',
    label: '思念怀旧',
    labelEn: 'Nostalgic',
    accent: '#fdba74',
    glow: '#431407',
    intent: '让想念有个地方落下来',
    intentEn: 'Give the missing somewhere to land',
    care: '你还在想念,说明那段时光真的很好。谢谢它来过,也谢谢你还记得。',
    keywords: [
      '想念', '思念', '怀念', '想家', '回忆', '过去', '以前', '老朋友', '毕业', '异地', '想他', '想她',
      'miss', 'missing', 'nostalgia', 'nostalgic', 'memories', 'homesick', 'long distance', 'past',
    ],
    songs: [
      { title: '月亮代表我的心', artist: '邓丽君' },
      { title: 'Fields of Gold', artist: 'Eva Cassidy' },
      { title: '同桌的你', artist: '老狼' },
      { title: 'Vincent', artist: 'Don McLean' },
      { title: '大鱼', artist: '周深' },
      { title: "One Summer's Day (千与千寻)", artist: '久石讓' },
    ],
    track: '《让想念落下来》',
    audio: {
      root: 146.83, scale: [0, 2, 3, 7, 9], progression: [CHORDS.vi7, CHORDS.IVmaj7, CHORDS.Iadd9, CHORDS.V],
      bpm: 62, barsPerChord: 1,
      pad: 'strings', melody: 'bell', arp: 'felt',
      melodyLow: 2, melodyRange: 2, melodySlots: [0, 3, 8, 11], melodyDensity: 0.45,
      contour: 'fall', bass: 'sparse', arpEvery: 4, swing: 0, perc: false,
      brightness: 2800, bed: 'rain', breath: 13, volume: 0.82,
    },
  },
  {
    id: 'sleepless',
    emoji: '🌌',
    label: '睡不着',
    labelEn: 'Sleepless',
    accent: '#38bdf8',
    glow: '#0c1e3a',
    intent: '不催你睡,只把房间的声音铺软',
    intentEn: 'No pressure to sleep — just softer air',
    care: '别数还剩几小时能睡,那只会更醒。把注意力放在吐气上,睡意会自己来找你。',
    keywords: [
      '睡不着', '失眠', '半夜', '凌晨', '熬夜', '睡前', '入睡', '晚安', '做梦', '躺着',
      'sleepless', 'insomnia', 'cant sleep', "can't sleep", 'awake', 'bedtime', 'night', 'late',
    ],
    songs: [
      { title: 'Sleep', artist: 'Max Richter' },
      { title: 'River Flows in You', artist: 'Yiruma' },
      { title: 'Nocturne Op.9 No.2', artist: 'Frédéric Chopin' },
      { title: 'Moonlight Sonata (1st Movement)', artist: 'Ludwig van Beethoven' },
      { title: '晚安', artist: '颜人中' },
      { title: '月半小夜曲', artist: '李克勤' },
    ],
    track: '《不催你睡》',
    audio: {
      root: 110.0, scale: [0, 3, 7, 10, 12], progression: [CHORDS.i7, CHORDS.iv7, CHORDS.i7, CHORDS.bVI],
      bpm: 44, barsPerChord: 2,
      pad: 'glass', melody: 'glass', arp: 'bell',
      melodyLow: 2, melodyRange: 2, melodySlots: [0, 8], melodyDensity: 0.6,
      contour: 'fall', bass: 'pedal', arpEvery: 8, swing: 0, perc: false,
      brightness: 1800, bed: 'rain', breath: 16, volume: 0.8,
    },
  },
];

export const MOOD_BY_ID = new Map(MOODS.map(m => [m.id, m]));

export interface MoodMatch {
  mood: Mood;
  /** Keywords that actually fired — shown back to the user as "听到了…" */
  hits: string[];
  /** True when nothing matched and we fell back to a gentle default. */
  guessed: boolean;
}

// Words that mean "a lot of it" — they push the station gentler and slower.
const INTENSIFIERS = ['非常', '特别', '超级', '好想', '太', '很', '巨', '快要', 'very', 'so ', 'really', 'extremely'];

export const isIntense = (input: string): boolean => {
  const t = input.toLowerCase();
  return INTENSIFIERS.some(w => t.includes(w));
};

/**
 * How much meaning a keyword carries. Squared so that a specific phrase
 * ("睡不着", "can't sleep") outweighs several vague single hits ("累", "忙")
 * elsewhere in the same sentence, and CJK characters count for more than
 * latin ones because each one is a whole morpheme.
 */
const weight = (kw: string): number => {
  let w = 0;
  for (const ch of kw) w += /[一-鿿]/.test(ch) ? 2.2 : 1;
  return w * w;
};

/** Pick a station from free-form text, in Chinese or English. */
export const matchMood = (input: string): MoodMatch | null => {
  const text = input.trim().toLowerCase();
  if (!text) return null;

  let best: { mood: Mood; score: number; hits: string[] } | null = null;

  for (const mood of MOODS) {
    let score = 0;
    const hits: string[] = [];
    for (const kw of mood.keywords) {
      if (text.includes(kw.toLowerCase())) {
        score += weight(kw);
        hits.push(kw);
      }
    }
    // Strongest signal first, so the "听到了…" line shows what really decided it.
    hits.sort((a, b) => weight(b) - weight(a));
    if (score > 0 && (!best || score > best.score)) best = { mood, score, hits };
  }

  if (!best) {
    // Nothing recognised: never leave the listener with an error — hand them
    // the neutral station and say so honestly.
    return { mood: MOOD_BY_ID.get('calm')!, hits: [], guessed: true };
  }
  return { mood: best.mood, hits: best.hits, guessed: false };
};

export type Platform = 'youtube' | 'spotify' | 'netease';

// Search links rather than hardcoded track IDs: they never rot, and they work
// whichever region/platform the listener actually has.
export const songLink = (song: Song, platform: Platform): string => {
  const q = `${song.title} ${song.artist}`;
  switch (platform) {
    case 'youtube':
      return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
    case 'spotify':
      return `https://open.spotify.com/search/${encodeURIComponent(q)}`;
    case 'netease':
      return `https://music.163.com/#/search/m/?s=${encodeURIComponent(q)}`;
  }
};
