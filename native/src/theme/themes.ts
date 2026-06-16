// 三套视觉方向（云/暖/夜）从原型 tokens.js 移植，oklch 在此转成 hex。
import { oklchToHex, resolveColor } from './color';

export type CatKey = 'meet' | 'deep' | 'life' | 'learn' | 'misc';
export type ThemeKey = 'cloud' | 'dawn' | 'night';

export interface Theme {
  key: ThemeKey;
  name: string;
  mode: 'light' | 'dark';
  radius: number;
  cardPad: number;
  bg: string; surface: string; surface2: string; raised: string;
  text: string; muted: string; faint: string;
  border: string; borderStrong: string;
  onAccent: string; chartTrack: string;
  accent: string; accentText: string; accentSoft: string;
  cat: Record<CatKey, { label: string; color: string }>;
}

const CAT_META: Record<CatKey, { label: string; hue: number; neutral?: boolean }> = {
  meet: { label: '会议沟通', hue: 252 },
  deep: { label: '深度工作', hue: 168 },
  life: { label: '生活健康', hue: 140 },
  learn: { label: '学习成长', hue: 304 },
  misc: { label: '杂务', hue: 70, neutral: true },
};

function buildCats(L: number, C: number, neutral: string): Theme['cat'] {
  const out = {} as Theme['cat'];
  (Object.keys(CAT_META) as CatKey[]).forEach((k) => {
    const c = CAT_META[k];
    out[k] = { label: c.label, color: c.neutral ? resolveColor(neutral) : oklchToHex(L, C, c.hue) };
  });
  return out;
}

// 主色：用各方向 accents[0] 的明度/彩度 + 色相
function accent(aL: number, aC: number, tL: number, tC: number, sL: number, sC: number, hue: number) {
  return {
    accent: oklchToHex(aL, aC, hue),
    accentText: oklchToHex(tL, tC, hue),
    accentSoft: oklchToHex(sL, sC, hue),
  };
}

export const THEMES: Record<ThemeKey, Theme> = {
  cloud: {
    key: 'cloud', name: '云', mode: 'light', radius: 16, cardPad: 16,
    bg: '#F3F5F7', surface: '#FFFFFF', surface2: '#EEF1F3', raised: '#FFFFFF',
    text: '#14181B', muted: '#5C656D', faint: '#9AA3AB',
    border: 'rgba(20,24,27,0.10)', borderStrong: 'rgba(20,24,27,0.16)',
    onAccent: '#FFFFFF', chartTrack: 'rgba(20,24,27,0.06)',
    cat: buildCats(0.66, 0.125, 'oklch(0.72 0.018 250)'),
    ...accent(0.70, 0.115, 0.55, 0.10, 0.965, 0.035, 180),
  },
  dawn: {
    key: 'dawn', name: '暖', mode: 'light', radius: 24, cardPad: 18,
    bg: '#F6F1EA', surface: '#FFFDFB', surface2: '#F1E9DD', raised: '#FFFDFB',
    text: '#2A2520', muted: '#6E6155', faint: '#AC9E8E',
    border: 'rgba(42,37,32,0.11)', borderStrong: 'rgba(42,37,32,0.18)',
    onAccent: '#FFFFFF', chartTrack: 'rgba(42,37,32,0.07)',
    cat: buildCats(0.68, 0.13, 'oklch(0.73 0.02 70)'),
    ...accent(0.67, 0.15, 0.55, 0.15, 0.95, 0.04, 42),
  },
  night: {
    key: 'night', name: '夜', mode: 'dark', radius: 14, cardPad: 14,
    bg: '#121418', surface: '#1B1E24', surface2: '#23272F', raised: '#22262D',
    text: '#ECEEF1', muted: '#99A1AC', faint: '#626A75',
    border: 'rgba(255,255,255,0.10)', borderStrong: 'rgba(255,255,255,0.16)',
    onAccent: '#FFFFFF', chartTrack: 'rgba(255,255,255,0.08)',
    cat: buildCats(0.74, 0.14, 'oklch(0.66 0.02 250)'),
    ...accent(0.72, 0.15, 0.80, 0.12, 0.33, 0.07, 286),
  },
};

export const THEME_ORDER: ThemeKey[] = ['cloud', 'dawn', 'night'];
