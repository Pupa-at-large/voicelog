/* VoiceLog · 应用外壳（导航 + 状态 + 浮层） */
(function () {
  const { useState, useEffect, useRef, useMemo } = React;
  const {
    Icon, Sheet, Btn, HomeScreen, ReviewScreen, ExportScreen, MeScreen, GrowthScreen, LevelUpOverlay,
    VoiceOverlay, ReminderBanner, DetailSheet, EditSheet,
  } = window;
  const XP = window.VL.XP;
  const todayStr = () => new Date().toISOString().slice(0, 10);

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const SKEY = (k) => 'voicelog:' + k;
  function loadState(k) { try { return JSON.parse(localStorage.getItem(SKEY(k)) || 'null'); } catch (e) { return null; } }

  function TabBar({ t, tab, setTab, onMic }) {
    const items = [
      { key: 'home', icon: 'calendar', label: '日程' },
      { key: 'review', icon: 'chart', label: '复盘' },
      { key: '_mic' },
      { key: 'growth', icon: 'sparkle', label: '成长' },
      { key: 'me', icon: 'user', label: '我的' },
    ];
    return (
      <div style={{
        flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'flex-start',
        padding: '8px 14px calc(8px + 22px)', background: t.surface,
        borderTop: `1px solid ${t.border}`,
        boxShadow: t.mode === 'dark' ? 'none' : '0 -4px 24px rgba(16,24,40,0.04)',
      }}>
        {items.map((it) => {
          if (it.key === '_mic') {
            return (
              <div key="_mic" style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <button onClick={onMic} style={{
                  width: 58, height: 58, borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: t.accent, color: t.onAccent, transform: 'translateY(-16px)',
                  boxShadow: `${t.shadowLg}, 0 0 0 5px ${t.surface}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                }}>
                  <span style={{
                    position: 'absolute', inset: 0, borderRadius: 999, background: t.accent,
                    animation: 'vlpulse 2.4s ease-out infinite', zIndex: -1,
                  }} />
                  <Icon name="micFill" size={26} color={t.onAccent} fill />
                </button>
              </div>
            );
          }
          const on = tab === it.key;
          return (
            <button key={it.key} onClick={() => setTab(it.key)} style={{
              flex: 1, border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 0',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}>
              <Icon name={it.icon} size={23} color={on ? t.accent : t.faint} sw={on ? 2.2 : 1.9} />
              <span style={{ fontSize: 10.5, fontWeight: on ? 680 : 550, color: on ? t.accent : t.faint }}>{it.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  function Toast({ t, toast }) {
    return (
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 104, zIndex: 70, display: 'flex', justifyContent: 'center',
        pointerEvents: 'none', transition: 'opacity .3s, transform .3s',
        opacity: toast ? 1 : 0, transform: toast ? 'translateY(0)' : 'translateY(10px)',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 999,
          background: t.mode === 'dark' ? 'rgba(40,44,52,0.92)' : 'rgba(28,31,38,0.94)',
          backdropFilter: 'blur(12px)', boxShadow: t.shadowLg, maxWidth: '85%',
        }}>
          {toast && toast.icon && <Icon name={toast.icon} size={17} color="#fff" sw={2.4} />}
          <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {toast ? toast.msg : ''}
          </span>
        </div>
      </div>
    );
  }

  function VoiceLogApp({ theme }) {
    const saved = useRef(loadState(theme.key)).current;
    const [tab, setTab] = useState('home');
    const [selectedDay, setSelectedDay] = useState('06-16');
    const [events, setEvents] = useState(() => (saved && saved.events) ? saved.events : clone(window.VL.data.events));
    const [accentKey, setAccentKey] = useState(() => (saved && saved.accentKey) || theme.accents[0].key);
    // 成长系统：XP（只升不降）+ 累计天数；首次落在 LV.4 区间，贴近设计稿
    const [xp, setXp] = useState(() => (saved && typeof saved.xp === 'number') ? saved.xp : 320);
    const [accumulatedDays, setAccDays] = useState(() => (saved && typeof saved.accumulatedDays === 'number') ? saved.accumulatedDays : 86);
    const [lastActiveDay, setLastActiveDay] = useState(() => (saved && saved.lastActiveDay) || '');
    const [lastReviewDay, setLastReviewDay] = useState(() => (saved && saved.lastReviewDay) || '');
    const [levelUp, setLevelUp] = useState(null);
    const [voiceOpen, setVoiceOpen] = useState(false);
    const [detail, setDetail] = useState(null);
    const [editEv, setEditEv] = useState(null);
    const [mtOpen, setMtOpen] = useState(false);
    const [reminderEv, setReminderEv] = useState(null);
    const [toast, setToastState] = useState(null);
    const [aiEngine, setAiEngine] = useState(false);
    const [notify, setNotify] = useState(true);
    const [exportPeriod, setExportPeriod] = useState('day');
    const toastTimer = useRef(0);
    const remTimer = useRef(0);

    // 实时主题（基础主题 + 所选主色），并持久化事件 / 主色（按版本）
    const t = useMemo(() => {
      const a = theme.accents.find((x) => x.key === accentKey) || theme.accents[0];
      return { ...theme, accent: a.accent, accentText: a.accentText, accentSoft: a.accentSoft };
    }, [theme, accentKey]);
    useEffect(() => {
      try { localStorage.setItem(SKEY(theme.key), JSON.stringify({ events, accentKey, xp, accumulatedDays, lastActiveDay, lastReviewDay })); } catch (e) {}
    }, [events, accentKey, xp, accumulatedDays, lastActiveDay, lastReviewDay]);

    // 任意 XP 行为都记一次「活跃」，累计天数只增不减
    const markActive = () => {
      const today = todayStr();
      setLastActiveDay((prev) => { if (prev !== today) setAccDays((d) => d + 1); return today; });
    };
    // 加 XP：跨级则触发升级庆祝
    const awardXp = (amount) => {
      markActive();
      setXp((prev) => {
        const nv = prev + amount;
        if (window.VL.levelFromXp(nv).lv > window.VL.levelFromXp(prev).lv) setLevelUp(window.VL.levelFromXp(nv));
        return nv;
      });
    };

    const setToast = (msg, icon) => {
      setToastState({ msg, icon });
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToastState(null), 2400);
    };

    useEffect(() => () => { clearTimeout(toastTimer.current); clearTimeout(remTimer.current); }, []);

    const mutate = (dayKey, fn) => setEvents((prev) => {
      const next = { ...prev, [dayKey]: (prev[dayKey] || []).map((e) => ({ ...e })) };
      next[dayKey] = fn(next[dayKey]);
      return next;
    });

    const app = {
      events, selectedDay, aiEngine, notify, exportPeriod, accentKey,
      xp, accumulatedDays, level: window.VL.levelFromXp(xp),
      setDay: setSelectedDay,
      setToast,
      goGrowth: () => {
        setTab('growth');
        const today = todayStr();
        if (lastReviewDay !== today) { setLastReviewDay(today); awardXp(XP.review); setToast('复盘成长 +15 XP', 'sparkle'); }
      },
      openVoice: () => setVoiceOpen(true),
      setAccent: (k) => { setAccentKey(k); setToast('已更新主题色', 'check'); },
      setAi: (v) => { setAiEngine(v); setToast(v ? '已启用 AI 解析' : '已切回规则解析', 'sparkle'); },
      setNotify: (v) => { setNotify(v); setToast(v ? '已开启到点提醒' : '已关闭提醒', 'bell'); },
      toggleDone: (id) => {
        const cur = (events[selectedDay] || []).find((e) => e.id === id);
        const willDone = cur && cur.status !== 'done';
        mutate(selectedDay, (arr) => arr.map((e) =>
          e.id === id ? { ...e, status: e.status === 'done' ? 'todo' : 'done' } : e));
        if (willDone) awardXp(XP.done);
      },
      toggleImportant: (id) => { mutate(selectedDay, (arr) => arr.map((e) => e.id === id ? { ...e, important: !e.important } : e)); setDetail((d) => d && d.id === id ? { ...d, important: !d.important } : d); },
      openDetail: (ev) => setDetail(ev),
      openEdit: (ev) => { setDetail(null); setEditEv(ev); },
      showMultitask: () => setMtOpen(true),
      addExtracted: (list) => {
        setEvents((prev) => {
          const next = { ...prev };
          list.forEach((p) => {
            const ev = { id: 'u' + Date.now() + Math.random().toString(36).slice(2, 6), t: p.time, dur: p.dur || 60, title: p.title, cat: p.cat, loc: p.loc, reminder: p.reminder || 0, status: 'todo' };
            next[p.dateKey] = [...(next[p.dateKey] || []).map((e) => ({ ...e })), ev];
          });
          return next;
        });
        list.forEach(() => awardXp(XP.create));
        setToast(`已加入 ${list.length} 个日程`, 'check');
      },
      saveEvent: (id, patch) => { mutate(selectedDay, (arr) => arr.map((e) => e.id === id ? { ...e, ...patch } : e)); setToast('已更新日程', 'check'); },
      cancelEvent: (id) => mutate(selectedDay, (arr) => arr.map((e) =>
        e.id === id ? { ...e, status: 'cancelled' } : e)),
      deleteEvent: (id) => { mutate(selectedDay, (arr) => arr.filter((e) => e.id !== id)); setToast('已删除', 'trash'); },
      goExport: (p) => { setExportPeriod(p); setTab('export'); },
      setTab,
      demoReminder: () => {
        const e = (events['06-16'] || []).find((x) => x.id === 'e3') || (events[selectedDay] || [])[0];
        if (e) setReminderEv(e);
      },
    };

    const onConfirmVoice = (parsed) => {
      const ev = {
        id: 'v' + Date.now(), t: parsed.time, dur: parsed.dur || 60, title: parsed.title,
        cat: parsed.cat, loc: parsed.loc, reminder: parsed.reminder, status: 'todo',
      };
      mutate(parsed.dateKey, (arr) => [...arr, ev]);
      awardXp(XP.create);
      setVoiceOpen(false);
      setSelectedDay(parsed.dateKey);
      setTab('home');
      setToast(`已加入「${parsed.dateText.split(' · ')[0]}」`, 'check');
      if (parsed.reminder > 0 && notify) {
        clearTimeout(remTimer.current);
        remTimer.current = setTimeout(() => setReminderEv(ev), 1600);
      }
    };

    return (
      <div style={{
        position: 'absolute', inset: 0, background: t.bg, color: t.text,
        fontFamily: t.font, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        WebkitFontSmoothing: 'antialiased',
      }}>
        {/* 状态栏占位背景（让顶部色块延伸到刘海后面） */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 54, background: t.bg, zIndex: 1 }} />

        <div style={{ flex: 1, minHeight: 0, position: 'relative', zIndex: 2 }}>
          {tab === 'home' && <HomeScreen t={t} app={app} />}
          {tab === 'review' && <ReviewScreen t={t} app={app} />}
          {tab === 'growth' && <GrowthScreen t={t} app={app} />}
          {tab === 'export' && <ExportScreen t={t} app={app} />}
          {tab === 'me' && <MeScreen t={t} app={app} />}
        </div>

        <TabBar t={t} tab={tab} setTab={(k) => (k === 'growth' ? app.goGrowth() : setTab(k))} onMic={() => setVoiceOpen(true)} />

        <Toast t={t} toast={toast} />
        <VoiceOverlay t={t} open={voiceOpen} onClose={() => setVoiceOpen(false)} onConfirm={onConfirmVoice} aiEngine={aiEngine} app={app} />
        <DetailSheet t={t} ev={detail} onClose={() => setDetail(null)}
          onToggle={app.toggleDone} onCancel={app.cancelEvent} onDelete={app.deleteEvent} onEdit={app.openEdit} />
        <EditSheet t={t} ev={editEv} onClose={() => setEditEv(null)} onSave={app.saveEvent} app={app} />
        <Sheet t={t} open={mtOpen} onClose={() => setMtOpen(false)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'color-mix(in oklch, oklch(0.72 0.15 70) 16%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="bolt" size={20} color={'oklch(0.6 0.15 60)'} /></div>
            <h3 style={{ margin: 0, fontSize: 19, fontWeight: 720, color: t.text }}>关于一心多用</h3>
          </div>
          <p style={{ margin: '0 0 12px', fontSize: 14.5, lineHeight: 1.65, color: t.text }}>{window.VL.MULTITASK_NOTE}</p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: t.muted }}>VoiceLog 不会阻止你叠加日程——你最了解自己的节奏。它只是温和提个醒。</p>
          <div style={{ marginTop: 16 }}><Btn t={t} kind="primary" full onClick={() => setMtOpen(false)}>知道了</Btn></div>
        </Sheet>
        <ReminderBanner t={t} ev={reminderEv} onClose={() => setReminderEv(null)}
          onView={() => { const e = reminderEv; setReminderEv(null); setDetail(e); }} />
        <LevelUpOverlay t={t} level={levelUp} onClose={() => setLevelUp(null)} />
      </div>
    );
  }

  window.VoiceLogApp = VoiceLogApp;
})();
