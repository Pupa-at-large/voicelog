// 数据模型 + 种子数据（从原型 project/app/data.js 移植精简版）。
// 「今天」= 06-16，与原型一致。
import type { CatKey } from '../theme/themes';

export type Status = 'todo' | 'done' | 'cancelled';

export interface VEvent {
  id: string;
  t: string;        // 'HH:MM'
  dur: number;      // 分钟
  title: string;
  cat: CatKey;
  status: Status;
  loc?: string;
  reminder?: number;
  important?: boolean;
  urgent?: boolean;
  note?: string;
}

export type EventsMap = Record<string, VEvent[]>;

export interface WeekDay { key: string; dow: string; day: number; today?: boolean }

export const WEEK: WeekDay[] = [
  { key: '06-15', dow: '日', day: 15 },
  { key: '06-16', dow: '一', day: 16, today: true },
  { key: '06-17', dow: '二', day: 17 },
  { key: '06-18', dow: '三', day: 18 },
  { key: '06-19', dow: '四', day: 19 },
  { key: '06-20', dow: '五', day: 20 },
  { key: '06-21', dow: '六', day: 21 },
];

export function todayKey(): string {
  return WEEK.find((w) => w.today)?.key ?? '06-16';
}

export const SEED: EventsMap = {
  '06-15': [
    { id: 'd1', t: '10:00', dur: 60, title: '整理上周周报', cat: 'deep', status: 'todo' },
    { id: 'd2', t: '15:00', dur: 60, title: '陪家人逛超市', cat: 'life', status: 'done' },
    { id: 'd3', t: '17:00', dur: 30, title: '回复邮件', cat: 'misc', status: 'todo' },
  ],
  '06-16': [
    { id: 'e0', t: '09:00', dur: 60, title: '季度规划 PPT', cat: 'deep', status: 'todo', important: true, note: '今天先搭大纲。' },
    { id: 'e1', t: '10:00', dur: 60, title: '写产品方案', cat: 'deep', status: 'done' },
    { id: 'e2', t: '11:30', dur: 60, title: '团队周会', cat: 'meet', loc: '会议室 A', reminder: 10, status: 'todo', urgent: true },
    { id: 'e3', t: '15:00', dur: 60, title: '跟老王开会', cat: 'meet', loc: '公司', reminder: 30, status: 'todo', important: true, urgent: true },
    { id: 'e4', t: '19:00', dur: 60, title: '健身 · 跑步', cat: 'life', important: true, reminder: 15, status: 'todo' },
  ],
  '06-17': [
    { id: 'f1', t: '09:30', dur: 90, title: '需求评审', cat: 'meet', loc: '会议室 B', reminder: 15, status: 'todo' },
    { id: 'f2', t: '14:00', dur: 120, title: '专注写代码', cat: 'deep', status: 'todo' },
  ],
  '06-18': [
    { id: 'g0', t: '09:00', dur: 120, title: '客户提案会', cat: 'meet', loc: '会议室 A', reminder: 15, status: 'todo' },
    { id: 'g2', t: '11:30', dur: 120, title: '写季度方案', cat: 'deep', status: 'todo' },
    { id: 'g3', t: '14:00', dur: 120, title: '部门评审', cat: 'meet', loc: '大会议室', reminder: 10, status: 'todo' },
    { id: 'g4', t: '16:30', dur: 120, title: '跟进线上问题', cat: 'deep', status: 'todo' },
    { id: 'g1', t: '20:00', dur: 60, title: '读书 ·《深度工作》', cat: 'learn', reminder: 10, status: 'todo' },
  ],
};

const toMin = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };

/** 与原型一致：同一天里和 ev 时间重叠的其他日程（排除自身/已取消） */
export function overlaps(dayEvents: VEvent[], ev: Pick<VEvent, 'id' | 't' | 'dur'>): VEvent[] {
  const s = toMin(ev.t), e = s + (ev.dur || 60);
  return (dayEvents || []).filter((x) => {
    if (x.id === ev.id || x.status === 'cancelled') return false;
    const xs = toMin(x.t), xe = xs + (x.dur || 60);
    return s < xe && xs < e;
  });
}

export const DAILY_CAPACITY_H = 8;
export function dayLoad(dayEvents: VEvent[]): number {
  return (dayEvents || []).filter((e) => e.status !== 'cancelled').reduce((s, e) => s + (e.dur || 0), 0) / 60;
}

export const SLOT_START = 7 * 60;
export const SLOT_END = 22 * 60;

/** 建议式改期：07:00–22:00 找最多 3 个不重叠空档，近优先。移植自原型 suggestSlots。 */
export function suggestSlots(dayEvents: VEvent[], ev: Pick<VEvent, 'id' | 't' | 'dur'>) {
  const W0 = SLOT_START, W1 = SLOT_END;
  const dur = ev.dur || 60;
  if (dur <= 0 || dur > W1 - W0) return [] as { time: string; end: string; label: string }[];
  const orig = toMin(ev.t);
  const busy = (dayEvents || [])
    .filter((x) => x.id !== ev.id && x.status !== 'cancelled')
    .map((x) => [Math.max(W0, toMin(x.t)), Math.min(W1, toMin(x.t) + (x.dur || 60))] as [number, number])
    .filter(([s, e]) => e > s)
    .sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  busy.forEach(([s, e]) => {
    const last = merged[merged.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  });
  const gaps: [number, number][] = []; let cursor = W0;
  merged.forEach(([s, e]) => { if (s - cursor >= dur) gaps.push([cursor, s]); cursor = Math.max(cursor, e); });
  if (W1 - cursor >= dur) gaps.push([cursor, W1]);
  const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return gaps
    .map(([s, e]) => Math.max(s, Math.min(orig, e - dur)))
    .filter((start) => start !== orig)
    .sort((a, b) => Math.abs(a - orig) - Math.abs(b - orig))
    .slice(0, 3)
    .map((start) => {
      const diff = start - orig, abs = Math.abs(diff);
      const h = Math.floor(abs / 60), m = abs % 60;
      const span = [h ? `${h} 小时` : '', m ? `${m} 分` : ''].filter(Boolean).join(' ');
      return { time: fmt(start), end: fmt(start + dur), label: diff < 0 ? `早 ${span}` : `晚 ${span}` };
    });
}
