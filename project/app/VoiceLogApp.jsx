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
  // 全主题共用一份数据（修掉"换主题像丢数据"的坑）。首次加载时，从旧的按主题分库里
  // 挑出数据最多的一份迁移过来，绝不丢已有日程。
  const DATA_KEY = 'voicelog:data';
  const LEGACY_KEYS = ['cloud', 'dawn', 'night'].map((k) => 'voicelog:' + k);
  const evCount = (s) => { try { return Object.values((s && s.events) || {}).reduce((n, arr) => n + (arr ? arr.length : 0), 0); } catch (e) { return 0; } };
  function loadState() {
    try {
      const cur = localStorage.getItem(DATA_KEY);
      if (cur) return JSON.parse(cur);
      const legacy = LEGACY_KEYS.map((k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }).filter(Boolean);
      if (!legacy.length) return null;
      const best = legacy.sort((a, b) => evCount(b) - evCount(a))[0];
      try { localStorage.setItem(DATA_KEY, JSON.stringify(best)); } catch (e) {}
      return best;
    } catch (e) { return null; }
  }

  function TabBar({ t, tab, setTab, onMic }) {
    const items = [
      { key: 'home', icon: 'calendar', label: '日程' },
      { key: '_mic' },
      { key: 'me', icon: 'user', label: '我的' },
    ];
    return (
      <div style={{
        flexShrink: 0, position: 'relative', zIndex: 30, display: 'flex', alignItems: 'flex-start',
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
              <span style={{ fontSize: 11.5, fontWeight: on ? 680 : 550, color: on ? t.accent : t.faint }}>{it.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  function Toast({ t, toast }) {
    const hasAction = !!(toast && toast.action);
    return (
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 104, zIndex: 70, display: 'flex', justifyContent: 'center',
        pointerEvents: hasAction ? 'auto' : 'none', transition: 'opacity .3s, transform .3s',
        opacity: toast ? 1 : 0, transform: toast ? 'translateY(0)' : 'translateY(10px)',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: hasAction ? '8px 8px 8px 18px' : '11px 18px', borderRadius: 999,
          background: t.mode === 'dark' ? 'rgba(40,44,52,0.92)' : 'rgba(28,31,38,0.94)',
          backdropFilter: 'blur(12px)', boxShadow: t.shadowLg, maxWidth: '90%',
        }}>
          {toast && toast.icon && <Icon name={toast.icon} size={17} color="#fff" sw={2.4} />}
          <span style={{ fontSize: 13.5, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {toast ? toast.msg : ''}
          </span>
          {hasAction && <button onClick={toast.action.fn} style={{ height: 30, padding: '0 14px', borderRadius: 999, border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 13.5, fontWeight: 700, background: 'rgba(255,255,255,0.18)', color: '#fff', flexShrink: 0 }}>{toast.action.label}</button>}
        </div>
      </div>
    );
  }

  // 首开欢迎页（大 Logo + 名字 + 标语）。只在第一次进入时出现，点"开始使用"后记住。
  function WelcomeScreen({ t, onStart }) {
    const btn = (primary) => ({ width: '100%', maxWidth: 320, height: 52, borderRadius: 16, cursor: 'pointer', font: 'inherit', fontSize: 15, fontWeight: 700, flexShrink: 0, border: primary ? 'none' : `1px solid ${t.border}`, background: primary ? t.accent : t.surface2, color: primary ? t.onAccent : t.text, boxShadow: primary ? t.shadowLg : 'none' });
    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 90, background: t.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 30px', textAlign: 'center', animation: 'vlin .45s ease' }}>
        <div style={{ width: 92, height: 92, borderRadius: 26, background: t.accent, boxShadow: t.shadowLg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 26, flexShrink: 0 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <rect x="2.5" y="9" width="3" height="6" rx="1.5" fill={t.onAccent} />
            <rect x="7.5" y="4" width="3" height="16" rx="1.5" fill={t.onAccent} />
            <rect x="12.5" y="6.5" width="3" height="11" rx="1.5" fill={t.onAccent} />
            <rect x="17.5" y="10" width="3" height="4" rx="1.5" fill={t.onAccent} />
          </svg>
        </div>
        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 800, letterSpacing: -0.5, color: t.text }}>语迹 <span style={{ color: t.accentText }}>VoiceLog</span></h1>
        <div style={{ fontSize: 18, fontWeight: 600, color: t.text, marginTop: 14 }}>时间是你最大的资产</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11, width: '100%', maxWidth: 320, marginTop: 40 }}>
          <button onClick={() => onStart(false)} style={btn(true)}>开始（空白）</button>
          <button onClick={() => onStart(true)} style={btn(false)}>先看示例效果</button>
        </div>
        <div style={{ fontSize: 11.5, color: t.faint, marginTop: 16 }}>本地优先 · 数据保存在你的设备上</div>
      </div>
    );
  }

  function VoiceLogApp({ theme, themeKey, onTheme }) {
    const saved = useRef(loadState()).current;
    const [tab, setTab] = useState('home');
    const [selectedDay, setSelectedDay] = useState(window.VL.todayKey());
    const [events, setEvents] = useState(() => (saved && saved.events) ? saved.events : {}); // 新用户默认空白；示例从欢迎页按需载入
    const [reflections, setReflections] = useState(() => (saved && saved.reflections) ? saved.reflections : {}); // 个性化复盘：{ dayKey: { text, ts } }
    const [accentKey, setAccentKey] = useState(() => (saved && saved.accentKey) || theme.accents[0].key);
    // 成长系统：XP（只升不降）+ 累计天数；首次落在 LV.4 区间，贴近设计稿
    const [xp, setXp] = useState(() => (saved && typeof saved.xp === 'number') ? saved.xp : 0);
    const [accumulatedDays, setAccDays] = useState(() => (saved && typeof saved.accumulatedDays === 'number') ? saved.accumulatedDays : 0);
    const [lastActiveDay, setLastActiveDay] = useState(() => (saved && saved.lastActiveDay) || '');
    const [lastReviewDay, setLastReviewDay] = useState(() => (saved && saved.lastReviewDay) || '');
    const [levelUp, setLevelUp] = useState(null);
    const [trash, setTrash] = useState([]);
    const [trashOpen, setTrashOpen] = useState(false);
    const [matrixOpen, setMatrixOpen] = useState(false);
    const [voiceOpen, setVoiceOpen] = useState(false);
    const [voiceMode, setVoiceMode] = useState('voice'); // 'voice' 说话 | 'upload' 拍照/上传
    const [detail, setDetail] = useState(null);
    const [editEv, setEditEv] = useState(null);
    const [editDay, setEditDay] = useState(null); // 编辑对象所在的天（顺延项在过去某天，不一定是 selectedDay）
    const [mtOpen, setMtOpen] = useState(false);
    const [reminderEv, setReminderEv] = useState(null);
    const [toast, setToastState] = useState(null);
    const [aiEngine, setAiEngine] = useState(!!(window.VL && window.VL.serverUrl));
    const [notify, setNotify] = useState(true);
    const [exportPeriod, setExportPeriod] = useState('day');
    // 顺延横幅"先不用"贪睡：默认 120 分钟后再提醒；可在「我的」改成今天不再(-1)/其它时长
    const [rolloverSnoozeMins, setRolloverSnoozeMins] = useState(() => (saved && typeof saved.rolloverSnoozeMins === 'number') ? saved.rolloverSnoozeMins : 120);
    const [rolloverSnoozeUntil, setRolloverSnoozeUntil] = useState(() => (saved && saved.rolloverSnoozeUntil) || 0);
    const [timeFmt, setTimeFmt] = useState(() => (saved && saved.timeFmt) || '24'); // '24' | '12'
    window.VL.timeFmt = timeFmt; // 让所有显示处的 fmtTime/fmtRange 读到当前制式
    const [showWelcome, setShowWelcome] = useState(() => { try { return !localStorage.getItem('voicelog:welcomed'); } catch (e) { return false; } });
    const [demoMode, setDemoMode] = useState(false); // 示例预览中：不落库，可一键退出回到真实数据
    const demoBackup = useRef(null);
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifSeenSig, setNotifSeenSig] = useState(() => { try { return localStorage.getItem('voicelog:notifSeen') || ''; } catch (e) { return ''; } });
    const toastTimer = useRef(0);
    const remTimer = useRef(0);

    // 实时主题（基础主题 + 所选主色），并持久化事件 / 主色（按版本）
    const t = useMemo(() => {
      const a = theme.accents.find((x) => x.key === accentKey) || theme.accents[0];
      return { ...theme, accent: a.accent, accentText: a.accentText, accentSoft: a.accentSoft };
    }, [theme, accentKey]);
    useEffect(() => {
      if (demoMode) return; // 示例预览不落库，绝不覆盖你的真实数据
      try { localStorage.setItem(DATA_KEY, JSON.stringify({ events, reflections, accentKey, xp, accumulatedDays, lastActiveDay, lastReviewDay, rolloverSnoozeMins, rolloverSnoozeUntil, timeFmt })); } catch (e) {}
    }, [events, reflections, accentKey, xp, accumulatedDays, lastActiveDay, lastReviewDay, rolloverSnoozeMins, rolloverSnoozeUntil, timeFmt, demoMode]);

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

    const setToast = (msg, icon, action) => {
      setToastState({ msg, icon, action });
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToastState(null), action ? 4200 : 2400);
    };

    useEffect(() => () => { clearTimeout(toastTimer.current); clearTimeout(remTimer.current); }, []);

    const mutate = (dayKey, fn) => setEvents((prev) => {
      const next = { ...prev, [dayKey]: (prev[dayKey] || []).map((e) => ({ ...e })) };
      next[dayKey] = fn(next[dayKey]);
      return next;
    });

    // 通知中心数据：顺延提醒 + 今天及以后设了提醒、未完成的日程
    const notifications = useMemo(() => {
      const out = []; const tk = window.VL.todayKey();
      const pend = window.VL.pendingBefore ? window.VL.pendingBefore(events, tk) : [];
      if (pend.length) out.push({ kind: 'rollover', icon: 'redo', title: `${pend.length} 件未完成可顺延`, sub: '点右侧一键挪到今天' });
      Object.keys(events).sort().forEach((day) => {
        if (day < tk) return;
        (events[day] || []).forEach((ev) => {
          if (ev.status === 'todo' && ev.reminder > 0 && window.VL.timeMode(ev) === 'at') {
            out.push({ kind: 'reminder', icon: 'bell', title: ev.title, sub: `提前 ${ev.reminder} 分 · ${day === tk ? '今天' : day} ${window.VL.fmtTime(ev.t)}`, ev, day });
          }
        });
      });
      return out;
    }, [events]);
    const notifSig = notifications.map((n) => n.title + '|' + n.sub).join('§');

    const app = {
      events, selectedDay, aiEngine, notify, exportPeriod, accentKey,
      themeKey, setTheme: onTheme,
      notifications, notifCount: notifications.length,
      notifUnseen: notifications.length > 0 && notifSig !== notifSeenSig, // 红点：有"没看过的"才显示
      openNotifications: () => { setNotifOpen(true); setNotifSeenSig(notifSig); try { localStorage.setItem('voicelog:notifSeen', notifSig); } catch (e) {} },
      completeAt: (day, id) => { const ev = (events[day] || []).find((e) => e.id === id); if (!ev || ev.status === 'done') return; mutate(day, (arr) => arr.map((e) => e.id === id ? { ...e, status: 'done' } : e)); awardXp(XP.done); setToast('完成！做了就是胜利', 'check'); },
      xp, accumulatedDays, level: window.VL.levelFromXp(xp),
      setDay: setSelectedDay,
      setToast,
      // 只导航，不发 XP。成长 XP 只由真实动作触发：记录 / 完成 / 写复盘（见成长页「成长规则」）
      goGrowth: () => setTab('growth'),
      reflections,
      // 个性化复盘：打字或语音写下当天/某天的想法。当天第一次写 +XP（动作驱动）
      saveReflection: (dayKey, text) => {
        const key = dayKey || window.VL.todayKey();
        const txt = (text || '').trim();
        const first = !(reflections[key] && reflections[key].text);
        setReflections((prev) => { const next = { ...prev }; if (txt) next[key] = { text: txt, ts: Date.now() }; else delete next[key]; return next; });
        if (txt && first) { awardXp(XP.reflect); setToast('记下复盘 · 成长 +' + XP.reflect + ' XP', 'sparkle'); }
        else if (txt) setToast('复盘已更新', 'check');
        else setToast('已清空这天的复盘', 'check');
      },
      openReflect: () => { setVoiceMode('reflect'); setVoiceOpen(true); },
      openVoice: () => { setVoiceMode('voice'); setVoiceOpen(true); },
      openUpload: () => { setVoiceMode('upload'); setVoiceOpen(true); },
      demoMode,
      // 进示例预览：先把你的真实数据快照存到内存，再载入示例（示例不落库）
      enterDemo: () => {
        if (!demoMode) demoBackup.current = { events, reflections, xp, accumulatedDays, lastActiveDay, lastReviewDay };
        setEvents(clone(window.VL.data.events)); setReflections({}); setXp(320); setAccDays(86);
        setSelectedDay(window.VL.todayKey()); setTab('home'); setDemoMode(true);
        setToast('已进入示例预览 · 随时可退出', 'sparkle');
      },
      // 退出示例：从快照恢复你自己的日程
      exitDemo: () => {
        const b = demoBackup.current;
        if (b) { setEvents(b.events); setReflections(b.reflections || {}); setXp(b.xp); setAccDays(b.accumulatedDays); setLastActiveDay(b.lastActiveDay); setLastReviewDay(b.lastReviewDay); }
        demoBackup.current = null; setDemoMode(false);
        setSelectedDay(window.VL.todayKey()); setTab('home'); setToast('已退出示例 · 回到你的日程', 'check');
      },
      loadDemo: () => app.enterDemo(), // 兼容旧入口
      // 本地优先的「别丢数据」方案：把全部数据下载成一个 .json 备份文件。不需要账号。
      backup: () => {
        try {
          const blob = { _app: 'voicelog', _v: 1, _at: new Date().toISOString(), events, reflections, accentKey, xp, accumulatedDays, lastActiveDay, lastReviewDay, rolloverSnoozeMins, rolloverSnoozeUntil, timeFmt };
          const a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob([JSON.stringify(blob, null, 2)], { type: 'application/json' }));
          a.download = 'voicelog-备份-' + todayStr() + '.json';
          document.body.appendChild(a); a.click();
          setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
          setToast('已备份 ' + evCount(blob) + ' 条日程', 'check');
        } catch (e) { setToast('备份失败，请重试', 'info'); }
      },
      // 从备份文件恢复（导入），覆盖当前数据。导入前界面会先确认。
      restore: (parsed) => {
        if (!parsed || typeof parsed !== 'object' || !parsed.events) { setToast('文件格式不对，未恢复', 'info'); return; }
        try {
          setEvents(parsed.events || {});
          if (parsed.reflections) setReflections(parsed.reflections);
          if (parsed.accentKey) setAccentKey(parsed.accentKey);
          if (typeof parsed.xp === 'number') setXp(parsed.xp);
          if (typeof parsed.accumulatedDays === 'number') setAccDays(parsed.accumulatedDays);
          if (parsed.lastActiveDay) setLastActiveDay(parsed.lastActiveDay);
          if (parsed.lastReviewDay) setLastReviewDay(parsed.lastReviewDay);
          if (parsed.timeFmt) setTimeFmt(parsed.timeFmt);
          setSelectedDay(window.VL.todayKey()); setTab('home');
          setToast('已恢复 ' + evCount(parsed) + ' 条日程', 'sparkle');
        } catch (e) { setToast('恢复失败，请重试', 'info'); }
      },
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
      toggleUrgent: (id) => { mutate(selectedDay, (arr) => arr.map((e) => e.id === id ? { ...e, urgent: !e.urgent } : e)); setDetail((d) => d && d.id === id ? { ...d, urgent: !d.urgent } : d); },
      showMatrix: () => setMatrixOpen(true),
      openDetail: (ev) => setDetail(ev),
      openEdit: (ev, day) => { setDetail(null); setEditDay(day || selectedDay); setEditEv(ev); },
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
      applyBatch: (sel) => {
        const r = window.VL.applyBatchTo(events, sel);
        setEvents(r.next);
        for (let i = 0; i < r.created; i++) awardXp(XP.create);
        for (let i = 0; i < r.completed; i++) awardXp(XP.done);
        setSelectedDay(window.VL.todayKey()); setTab('home');
        const parts = [r.created && `新增 ${r.created}`, r.completed && `完成 ${r.completed}`, r.rescheduled && `改期 ${r.rescheduled}`, r.cancelled && `取消 ${r.cancelled}`].filter(Boolean);
        setToast(parts.length ? '已' + parts.join(' · ') : '已处理', 'check');
      },
      saveEvent: (id, patch) => { mutate(editDay || selectedDay, (arr) => arr.map((e) => e.id === id ? { ...e, ...patch } : e)); setToast('已更新日程', 'check'); },
      // 删除指定某天的某条（顺延项可能在过去某天），带撤销
      deleteEventAt: (day, id) => {
        const ev = (events[day] || []).find((e) => e.id === id);
        mutate(day, (arr) => arr.filter((e) => e.id !== id));
        if (ev) {
          setTrash((tr) => [{ ev, day, ts: Date.now() }, ...tr]);
          setToast('已删除', 'trash', { label: '撤销', fn: () => {
            setEvents((prev) => ({ ...prev, [day]: [...(prev[day] || []).map((e) => ({ ...e })), ev] }));
            setTrash((tr) => tr.filter((x) => x.ev.id !== ev.id));
            setToast('已恢复', 'check');
          } });
        }
      },
      rescheduleEvent: (id, time) => { mutate(selectedDay, (arr) => arr.map((e) => e.id === id ? { ...e, t: time } : e)); setDetail((d) => d && d.id === id ? { ...d, t: time } : d); setToast('已改到 ' + time, 'check'); },
      cancelEvent: (id) => mutate(selectedDay, (arr) => arr.map((e) =>
        e.id === id ? { ...e, status: 'cancelled' } : e)),
      deleteEvent: (id) => {
        const day = selectedDay;
        const ev = (events[day] || []).find((e) => e.id === id);
        mutate(day, (arr) => arr.filter((e) => e.id !== id));
        if (ev) {
          setTrash((tr) => [{ ev, day, ts: Date.now() }, ...tr]);
          setToast('已删除', 'trash', { label: '撤销', fn: () => {
            setEvents((prev) => ({ ...prev, [day]: [...(prev[day] || []).map((e) => ({ ...e })), ev] }));
            setTrash((tr) => tr.filter((x) => x.ev.id !== ev.id));
            setToast('已恢复', 'check');
          } });
        }
      },
      restoreEvent: (item) => {
        setEvents((prev) => ({ ...prev, [item.day]: [...(prev[item.day] || []).map((e) => ({ ...e })), item.ev] }));
        setTrash((tr) => tr.filter((x) => x.ev.id !== item.ev.id));
        setToast('已恢复到日程', 'check');
      },
      purgeTrash: () => { setTrash([]); setToast('回收站已清空', 'trash'); },
      openTrash: () => setTrashOpen(true),
      trash,
      postpone: (id) => {
        const order = window.VL.data.week.map((w) => w.key);
        const idx = order.indexOf(selectedDay);
        const nextKey = order[Math.min(order.length - 1, idx + 1)];
        if (nextKey === selectedDay) { setToast('已经是本周最后一天', 'bolt'); return; }
        const ev = (events[selectedDay] || []).find((e) => e.id === id);
        if (!ev) return;
        mutate(selectedDay, (arr) => arr.filter((e) => e.id !== id));
        setEvents((prev) => ({ ...prev, [nextKey]: [...(prev[nextKey] || []).map((e) => ({ ...e })), { ...ev }] }));
        setToast('已顺延到下一天 · 开始了就好，late better than never', 'redo');
      },
      // picks: [{key, id}] 勾选要挪的项；不传 = 全部今天之前的待办（含前几天累积）
      rolloverUnfinished: (picks) => {
        const toKey = window.VL.todayKey();
        const all = window.VL.pendingBefore(events, toKey);
        const chosen = (picks && picks.length)
          ? all.filter((p) => picks.some((q) => q.key === p.key && q.id === p.ev.id))
          : all;
        if (!chosen.length) return;
        setEvents((prev) => {
          const next = {}; Object.keys(prev).forEach((k) => { next[k] = (prev[k] || []).map((e) => ({ ...e })); });
          const moveIds = {}; chosen.forEach((p) => { (moveIds[p.key] = moveIds[p.key] || {})[p.ev.id] = 1; });
          Object.keys(moveIds).forEach((k) => { next[k] = (next[k] || []).filter((e) => !moveIds[k][e.id]); });
          next[toKey] = [...(next[toKey] || []), ...chosen.map((p) => ({ ...p.ev }))];
          return next;
        });
        setSelectedDay(toKey);
        setToast(`已把 ${chosen.length} 件挪到今天 · 开始了就好`, 'redo');
      },
      rolloverSnoozeUntil, rolloverSnoozeMins,
      snoozeRollover: () => {
        let until;
        if (rolloverSnoozeMins < 0) { const d = new Date(); d.setHours(23, 59, 59, 999); until = d.getTime(); }
        else until = Date.now() + rolloverSnoozeMins * 60000;
        setRolloverSnoozeUntil(until);
        setToast(rolloverSnoozeMins < 0 ? '今天先不提醒了' : (rolloverSnoozeMins >= 60 ? rolloverSnoozeMins / 60 + ' 小时' : rolloverSnoozeMins + ' 分钟') + '后再提醒你', 'bell');
      },
      setRolloverSnoozeMins: (m) => { setRolloverSnoozeMins(m); setRolloverSnoozeUntil(0); setToast('已更新顺延提醒设置', 'check'); },
      timeFmt, setTimeFmt: (f) => { setTimeFmt(f); setToast(f === '12' ? '已切换为 12 小时制' : '已切换为 24 小时制', 'check'); },
      goExport: (p) => { setExportPeriod(p); setTab('export'); },
      setTab,
      demoReminder: () => {
        const e = (events[window.VL.todayKey()] || []).find((x) => x.id === 'e3') || (events[selectedDay] || [])[0];
        if (e) setReminderEv(e);
      },
    };

    const onConfirmVoice = (parsed, reschedules) => {
      const ev = {
        id: 'v' + Date.now(), t: parsed.time, dur: (parsed.timeMode && parsed.timeMode !== 'at') ? 0 : (parsed.dur || 60), title: parsed.title,
        timeMode: parsed.timeMode || undefined, daypart: parsed.daypart || undefined,
        cat: parsed.cat, loc: parsed.loc, reminder: parsed.reminder,
        status: parsed.status === 'done' ? 'done' : 'todo', // 补录→已记录
        important: !!parsed.important, urgent: !!parsed.urgent,
        note: parsed.note || undefined, progress: parsed.progress || undefined,
      };
      // 冲突时若选了"挪旧的"：先把已有行程改到新时间（点了才改，绝不自动），再加入新事项
      mutate(parsed.dateKey, (arr) => {
        let out = arr;
        if (reschedules && reschedules.length) {
          const map = {}; reschedules.forEach((r) => { map[r.id] = r.time; });
          out = out.map((e) => (map[e.id] ? { ...e, t: map[e.id] } : e));
        }
        return [...out, ev];
      });
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
          {tab === 'growth' && <GrowthScreen t={t} app={app} />}
          {tab === 'export' && <ExportScreen t={t} app={app} />}
          {tab === 'me' && <MeScreen t={t} app={app} />}
        </div>

        {demoMode && (
          <div onClick={app.exitDemo} style={{ flexShrink: 0, zIndex: 31, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '9px 14px', background: t.accent, color: t.onAccent, cursor: 'pointer', fontSize: 13.5, fontWeight: 700 }}>
            <Icon name="sparkle" size={15} color={t.onAccent} />示例预览中 · 点此退出，回到你的日程
          </div>
        )}
        <TabBar t={t} tab={tab} setTab={(k) => (k === 'growth' ? app.goGrowth() : setTab(k))} onMic={() => { setVoiceMode('voice'); setVoiceOpen(true); }} />

        <Toast t={t} toast={toast} />
        <VoiceOverlay t={t} open={voiceOpen} openMode={voiceMode} onClose={() => setVoiceOpen(false)} onConfirm={onConfirmVoice} aiEngine={aiEngine} app={app} />
        <DetailSheet t={t} ev={detail} onClose={() => setDetail(null)}
          onToggle={app.toggleDone} onCancel={app.cancelEvent} onDelete={app.deleteEvent} onEdit={app.openEdit}
          onStar={app.toggleImportant} onUrgent={app.toggleUrgent} onMatrixInfo={app.showMatrix} onPostpone={(id) => { app.postpone(id); setDetail(null); }} app={app} />
        <EditSheet t={t} ev={editEv} onClose={() => setEditEv(null)} onSave={app.saveEvent} app={app} />
        <window.NotificationSheet t={t} open={notifOpen} onClose={() => setNotifOpen(false)} app={app} />
        <Sheet t={t} open={mtOpen} onClose={() => setMtOpen(false)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'color-mix(in oklch, oklch(0.72 0.15 70) 16%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="bolt" size={20} color={'oklch(0.6 0.15 60)'} /></div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 720, color: t.text }}>关于一心多用</h3>
          </div>
          <p style={{ margin: '0 0 12px', fontSize: 15, lineHeight: 1.65, color: t.text }}>{window.VL.MULTITASK_NOTE}</p>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: t.muted }}>VoiceLog 不会阻止你叠加日程——你最了解自己的节奏。它只是温和提个醒。</p>
          <div style={{ marginTop: 16 }}><Btn t={t} kind="primary" full onClick={() => setMtOpen(false)}>知道了</Btn></div>
        </Sheet>
        <ReminderBanner t={t} ev={reminderEv} onClose={() => setReminderEv(null)}
          onView={() => { const e = reminderEv; setReminderEv(null); setDetail(e); }} />
        <Sheet t={t} open={matrixOpen} onClose={() => setMatrixOpen(false)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: t.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="grid4" size={20} color={t.accentText} /></div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 720, color: t.text }}>重要 × 紧急 四象限</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {window.VL.QUAD_ORDER.map((k) => { const q = window.VL.QUADRANTS[k]; return (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: t.radius - 2, background: t.surface2 }}>
                <span style={{ width: 9, height: 9, borderRadius: 999, background: q.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13.5, color: t.text, fontWeight: 600, width: 96, flexShrink: 0 }}>{q.label}</span>
                <span style={{ fontSize: 13.5, color: q.color, fontWeight: 650 }}>{q.advice}</span>
              </div>
            ); })}
          </div>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: t.muted }}>{window.VL.MATRIX_NOTE}</p>
          <div style={{ marginTop: 16 }}><Btn t={t} kind="primary" full onClick={() => setMatrixOpen(false)}>知道了</Btn></div>
        </Sheet>
        <Sheet t={t} open={trashOpen} onClose={() => setTrashOpen(false)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: t.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="trash" size={19} color={t.muted} /></div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 720, color: t.text }}>回收站</h3>
          </div>
          <p style={{ margin: '0 0 14px', fontSize: 13.5, lineHeight: 1.55, color: t.muted }}>删除的日程都先放这里，随时可以找回。</p>
          {trash.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {trash.map((it) => { const wk = window.VL.data.week.find((x) => x.key === it.day); return (
                <div key={it.ev.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 11, borderRadius: t.radius - 2, border: `1px solid ${t.border}`, background: t.surface2 }}>
                  <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 999, background: window.catColor(t, it.ev.cat) }} />
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 600, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.ev.title}</div><div style={{ fontSize: 12.5, color: t.faint, marginTop: 2 }}>{wk ? `周${wk.dow} · ${wk.month}月${wk.day}日` : it.day} · {window.VL.fmtTime(it.ev.t)}</div></div>
                  <button onClick={() => app.restoreEvent(it)} style={{ flexShrink: 0, height: 32, padding: '0 13px', borderRadius: 999, border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 13.5, fontWeight: 650, background: t.accentSoft, color: t.accentText }}>恢复</button>
                </div>
              ); })}
            </div>
          ) : <div style={{ textAlign: 'center', padding: '26px 0', color: t.faint, fontSize: 13.5 }}>回收站是空的</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn t={t} kind="ghost" onClick={() => setTrashOpen(false)} style={{ flex: 1 }}>关闭</Btn>
            {trash.length > 0 && <Btn t={t} kind="ghost" icon="trash" onClick={() => { app.purgeTrash(); setTrashOpen(false); }} style={{ flexShrink: 0, color: 'oklch(0.62 0.19 25)' }}>清空</Btn>}
          </div>
        </Sheet>
        <LevelUpOverlay t={t} level={levelUp} onClose={() => setLevelUp(null)} />
        {showWelcome && <WelcomeScreen t={t} onStart={(demo) => { try { localStorage.setItem('voicelog:welcomed', '1'); } catch (e) {} setShowWelcome(false); if (demo) app.enterDemo(); }} />}
      </div>
    );
  }

  window.VoiceLogApp = VoiceLogApp;
})();
