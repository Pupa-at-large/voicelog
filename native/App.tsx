// 语迹 VoiceLog · 原生 App（Expo / React Native）
// M2 垂直切片：日程主页 —— 主题(云/暖/夜) + 当天清单 + 一键完成 + 容量提醒 + 建议式改期。
// 数据走统一 Store（本地持久化）。这是从网页原型迁移的第一屏，证明路线可行。
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, StatusBar, useColorScheme,
} from 'react-native';
import { THEMES, THEME_ORDER, type ThemeKey, type Theme } from './src/theme/themes';
import {
  WEEK, todayKey, overlaps, dayLoad, suggestSlots, DAILY_CAPACITY_H,
  type EventsMap, type VEvent,
} from './src/data/model';
import { Store } from './src/data/store';

export default function App() {
  const scheme = useColorScheme();
  const [events, setEvents] = useState<EventsMap>({});
  const [themeKey, setThemeKey] = useState<ThemeKey>(scheme === 'dark' ? 'night' : 'cloud');
  const [selDay, setSelDay] = useState<string>(todayKey());
  const [ready, setReady] = useState(false);
  const [openSlots, setOpenSlots] = useState<string | null>(null); // 展开换时间的 event id

  useEffect(() => {
    (async () => {
      const [ev, th] = await Promise.all([Store.loadEvents(), Store.loadTheme()]);
      setEvents(ev);
      if (th && (THEME_ORDER as string[]).includes(th)) setThemeKey(th as ThemeKey);
      setReady(true);
    })();
  }, []);

  useEffect(() => { if (ready) Store.saveEvents(events); }, [events, ready]);

  const t = THEMES[themeKey];
  const list = useMemo(
    () => (events[selDay] || []).slice().sort((a, b) => a.t.localeCompare(b.t)),
    [events, selDay],
  );
  const load = dayLoad(list);
  const doneN = list.filter((e) => e.status === 'done').length;
  const cur = WEEK.find((w) => w.key === selDay) || WEEK[1];

  const pickTheme = (k: ThemeKey) => { setThemeKey(k); Store.saveTheme(k); };
  const toggleDone = (id: string) =>
    setEvents((prev) => ({
      ...prev,
      [selDay]: (prev[selDay] || []).map((e) =>
        e.id === id ? { ...e, status: e.status === 'done' ? 'todo' : 'done' } : e),
    }));
  const reschedule = (id: string, time: string) => {
    setEvents((prev) => ({
      ...prev,
      [selDay]: (prev[selDay] || []).map((e) => (e.id === id ? { ...e, t: time } : e)),
    }));
    setOpenSlots(null);
  };

  return (
    <View style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={t.mode === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 64, paddingBottom: 48 }}>
        {/* 头部：日期 + 主题切换 */}
        <View style={s.headerRow}>
          <View>
            <Text style={{ color: t.accentText, fontWeight: '700', fontSize: 13 }}>
              {cur.today ? '今天' : `周${cur.dow}`}
            </Text>
            <Text style={{ color: t.text, fontWeight: '800', fontSize: 30, marginTop: 2 }}>
              6月{cur.day}日 <Text style={{ color: t.muted, fontSize: 18, fontWeight: '600' }}>周{cur.dow}</Text>
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {THEME_ORDER.map((k) => {
              const on = k === themeKey;
              const th = THEMES[k];
              return (
                <Pressable key={k} onPress={() => pickTheme(k)} hitSlop={6}
                  style={[s.themeChip, { borderColor: on ? th.accent : t.border, backgroundColor: on ? th.accent : t.surface }]}>
                  <Text style={{ color: on ? th.onAccent : t.muted, fontWeight: '700', fontSize: 13 }}>{th.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 周条 */}
        <View style={s.weekRow}>
          {WEEK.map((w) => {
            const on = w.key === selDay;
            const has = (events[w.key] || []).length > 0;
            return (
              <Pressable key={w.key} onPress={() => setSelDay(w.key)} style={[s.weekCell, on && { backgroundColor: t.accent }]}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: on ? t.onAccent : t.faint }}>{w.dow}</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: on ? t.onAccent : t.text, marginTop: 4 }}>{w.day}</Text>
                <View style={{ width: 5, height: 5, borderRadius: 3, marginTop: 5, backgroundColor: has ? (on ? t.onAccent : t.accent) : 'transparent' }} />
              </Pressable>
            );
          })}
        </View>

        <Text style={{ color: t.muted, fontSize: 13.5, marginTop: 14, marginBottom: 10 }}>
          {list.length ? `共 ${list.length} 项 · 约 ${load % 1 === 0 ? load : load.toFixed(1)} 小时 · 已完成 ${doneN}` : '这天还没有安排'}
        </Text>

        {/* 容量提醒 */}
        {load > DAILY_CAPACITY_H && (
          <View style={[s.banner, { backgroundColor: t.surface2, borderColor: t.border }]}>
            <Text style={{ color: t.text, fontWeight: '700', fontSize: 13.5 }}>这天已排 {load.toFixed(1)} 小时</Text>
            <Text style={{ color: t.muted, fontSize: 12.5, marginTop: 2, lineHeight: 18 }}>
              超出容量（约 {DAILY_CAPACITY_H} 小时）。排得太满容易把整块时间切碎——要不要把不紧要的挪到别天？你最懂自己的节奏。
            </Text>
          </View>
        )}

        {/* 清单 */}
        {list.map((ev) => (
          <EventRow
            key={ev.id} t={t} ev={ev}
            conflict={ev.status !== 'cancelled' && overlaps(list, ev).length > 0}
            slotsOpen={openSlots === ev.id}
            dayEvents={list}
            onToggle={() => toggleDone(ev.id)}
            onOpenSlots={() => setOpenSlots(openSlots === ev.id ? null : ev.id)}
            onPickSlot={(time) => reschedule(ev.id, time)}
          />
        ))}

        <Text style={{ color: t.faint, fontSize: 12, textAlign: 'center', marginTop: 18 }}>
          语迹 VoiceLog · 原生 App 预览（M2）
        </Text>
      </ScrollView>
    </View>
  );
}

function EventRow({ t, ev, conflict, slotsOpen, dayEvents, onToggle, onOpenSlots, onPickSlot }: {
  t: Theme; ev: VEvent; conflict: boolean; slotsOpen: boolean; dayEvents: VEvent[];
  onToggle: () => void; onOpenSlots: () => void; onPickSlot: (time: string) => void;
}) {
  const done = ev.status === 'done';
  const col = t.cat[ev.cat].color;
  const slots = slotsOpen ? suggestSlots(dayEvents, ev) : [];
  return (
    <View style={[s.card, { backgroundColor: t.surface, borderColor: t.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 52 }}>
          <Text style={{ color: done ? t.faint : t.text, fontWeight: '700', fontSize: 15 }}>{ev.t}</Text>
          <Text style={{ color: t.faint, fontSize: 11.5, marginTop: 1 }}>{ev.dur}分</Text>
        </View>
        <View style={{ width: 3.5, alignSelf: 'stretch', borderRadius: 2, backgroundColor: col, marginRight: 12, opacity: done ? 0.4 : 1 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: done ? t.faint : t.text, fontWeight: '600', fontSize: 15.5, textDecorationLine: done ? 'line-through' : 'none' }}>
            {ev.important ? '★ ' : ''}{ev.title}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
            {ev.loc && <Text style={{ color: t.muted, fontSize: 12.5 }}>📍 {ev.loc}</Text>}
            {ev.urgent && !done && <Text style={{ color: '#D2492B', fontSize: 12, fontWeight: '700' }}>🚩 急</Text>}
            {conflict && !done && <Text style={{ color: '#B26A1E', fontSize: 12, fontWeight: '700' }}>⚡ 重叠</Text>}
          </View>
        </View>
        <Pressable onPress={onToggle} hitSlop={8}
          style={[s.check, { borderColor: done ? 'transparent' : t.borderStrong, backgroundColor: done ? col : 'transparent' }]}>
          {done && <Text style={{ color: t.onAccent, fontWeight: '900', fontSize: 14 }}>✓</Text>}
        </Pressable>
      </View>

      {/* 建议式改期入口：重叠时温和提示，点开才列空档（绝不自动改） */}
      {conflict && !done && (
        <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border }}>
          <Pressable onPress={onOpenSlots}>
            <Text style={{ color: t.accentText, fontWeight: '700', fontSize: 13 }}>
              {slotsOpen ? '收起' : '换个时间 ›'}
            </Text>
          </Pressable>
          {slotsOpen && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {slots.length ? slots.map((sl) => (
                <Pressable key={sl.time} onPress={() => onPickSlot(sl.time)}
                  style={[s.slot, { borderColor: t.border, backgroundColor: t.surface2 }]}>
                  <Text style={{ color: t.text, fontWeight: '600', fontSize: 13 }}>{sl.time} – {sl.end}</Text>
                  <Text style={{ color: t.faint, fontSize: 11.5, marginLeft: 6 }}>{sl.label}</Text>
                </Pressable>
              )) : <Text style={{ color: t.muted, fontSize: 12.5 }}>07:00–22:00 内暂时找不到完整空档。</Text>}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  themeChip: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  weekRow: { flexDirection: 'row', gap: 6, marginTop: 16 },
  weekCell: { flex: 1, paddingVertical: 8, borderRadius: 14, alignItems: 'center' },
  banner: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  slot: { flexDirection: 'row', alignItems: 'center', height: 34, paddingHorizontal: 12, borderRadius: 17, borderWidth: 1 },
});
