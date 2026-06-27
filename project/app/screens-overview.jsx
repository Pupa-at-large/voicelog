/* VoiceLog · 全览（可缩放：月 ↔ 周 ↔ 日） */
(function () {
  const { useState, useRef, useEffect } = React;
  const { Icon, Segmented, catColor, catLabel } = window;

  const HKEYS = window.VL.WEEK_KEYS;           // 真实 7 天窗口
  const DOWH = ['日', '一', '二', '三', '四', '五', '六']; // 月视图列头固定 日…六
  const TODAY = window.VL.todayKey();
  const LEVELS = [{ key: 'month', label: '月' }, { key: 'week', label: '周' }, { key: 'day', label: '日' }];
  const mins = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const live = (arr) => (arr || []).filter((e) => e.status !== 'cancelled');

  if (!document.getElementById('vl-anim2')) {
    const s = document.createElement('style');
    s.id = 'vl-anim2';
    s.textContent = `@keyframes vlpop{from{opacity:0;transform:scale(.965)}to{opacity:1;transform:none}}
      @media (prefers-reduced-motion:reduce){[data-vlpop]{animation:none!important}}`;
    document.head.appendChild(s);
  }

  // 日：按小时展开
  function DayView({ t, app, dayKey }) {
    const base = 7, end = 23, HH = 56;
    const evs = live(app.events[dayKey]).slice().sort((a, b) => a.t.localeCompare(b.t));
    const w = window.VL.data.week.find((x) => x.key === dayKey);
    const hours = []; for (let h = base; h <= end; h++) hours.push(h);
    return (
      <div style={{ flex: 1, overflowY: 'auto' }} data-vlpop>
        <div style={{ padding: '2px 18px 6px', fontSize: 13.5, color: t.muted }}>
          {w.month}月{w.day}日 周{w.dow} · {evs.length} 项
        </div>
        <div style={{ padding: '6px 16px 28px' }}>
          <div style={{ position: 'relative', marginLeft: 46, height: (end - base + 1) * HH }}>
            {hours.map((h, i) => (
              <div key={h} style={{ position: 'absolute', top: i * HH, left: -46, right: 0, height: HH }}>
                <span style={{ position: 'absolute', left: 0, top: -7, width: 38, textAlign: 'right', fontSize: 11.5, color: t.faint, fontVariantNumeric: 'tabular-nums' }}>{String(h).padStart(2, '0')}:00</span>
                <div style={{ position: 'absolute', left: 0, right: 0, top: 0, borderTop: `1px solid ${t.border}` }} />
              </div>
            ))}
            {evs.map((e) => {
              const top = (mins(e.t) - base * 60) / 60 * HH;
              const h = Math.max(28, (e.dur / 60) * HH - 4);
              const col = catColor(t, e.cat);
              const done = e.status === 'done';
              return (
                <div key={e.id} onClick={() => app.openDetail(e)} style={{
                  position: 'absolute', top, left: 4, right: 4, height: h, cursor: 'pointer', overflow: 'hidden',
                  background: `color-mix(in oklch, ${col} 14%, ${t.surface})`, borderLeft: `3px solid ${col}`,
                  borderRadius: 9, padding: '7px 11px', boxShadow: t.shadow, opacity: done ? 0.6 : 1,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {e.important && <Icon name="starFill" size={13} color={'oklch(0.76 0.14 80)'} fill style={{ flexShrink: 0 }} />}
                    <div style={{ fontSize: 13.5, fontWeight: 650, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: done ? 'line-through' : 'none' }}>{e.title}</div>
                  </div>
                  <div style={{ fontSize: 11.5, color: t.muted, marginTop: 2 }}>{window.VL.fmtRange(e.t, e.dur)} · {catLabel(t, e.cat)}{e.loc ? ` · ${e.loc}` : ''}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // 周：7 列迷你时间轴
  function WeekView({ t, app, onPick }) {
    const base = 7, end = 23, HH = 17, trackH = (end - base + 1) * HH;
    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px 24px' }} data-vlpop>
        <div style={{ display: 'flex', gap: 5 }}>
          {HKEYS.map((k) => {
            const w = window.VL.data.week.find((x) => x.key === k);
            const evs = live(app.events[k]);
            const today = k === TODAY;
            return (
              <div key={k} onClick={() => onPick(k)} style={{ flex: 1, cursor: 'pointer' }}>
                <div style={{ textAlign: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: 11.5, color: today ? t.accentText : t.faint, fontWeight: 600 }}>{w.dow}</div>
                  <div style={{
                    margin: '2px auto 0', width: 26, height: 26, borderRadius: 999, fontSize: 13.5, fontWeight: 680,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: today ? t.accent : 'transparent', color: today ? t.onAccent : t.text,
                  }}>{w.day}</div>
                </div>
                <div style={{ position: 'relative', height: trackH, borderRadius: 8, background: t.surface2, overflow: 'hidden' }}>
                  {evs.map((e) => {
                    const top = Math.max(0, (mins(e.t) - base * 60) / 60 * HH);
                    const h = Math.max(7, (e.dur / 60) * HH - 2);
                    return <div key={e.id} title={e.title} style={{ position: 'absolute', top, left: 2, right: 2, height: h, borderRadius: 4, background: catColor(t, e.cat), opacity: e.status === 'done' ? 0.5 : 0.95 }} />;
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ textAlign: 'center', fontSize: 12.5, color: t.faint, marginTop: 14 }}>点任意一天放大到「日」</div>
      </div>
    );
  }

  // 月：日历热力
  function MonthView({ t, app, onPick, monthOff, onMonth }) {
    const _t = window.VL.todayDateObj();
    const _b = new Date(_t.getFullYear(), _t.getMonth() + (monthOff || 0), 1);
    const _Y = _b.getFullYear(), _M = _b.getMonth();
    const isThisMonth = _Y === _t.getFullYear() && _M === _t.getMonth();
    const lead = new Date(_Y, _M, 1).getDay();            // 当月 1 号是周几
    const daysInMonth = new Date(_Y, _M + 1, 0).getDate(); // 当月天数
    const _mm = String(_M + 1).padStart(2, '0');
    const navBtn = { width: 34, height: 34, borderRadius: 999, border: `1px solid ${t.border}`, background: t.surface2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7) cells.push(null);
    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px 24px' }} data-vlpop>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 10 }}>
          <button onClick={() => onMonth && onMonth(-1)} style={navBtn}><Icon name="chevL" size={18} color={t.text} /></button>
          <span style={{ fontSize: 15, fontWeight: 700, color: t.text, minWidth: 92, textAlign: 'center' }}>{_Y} 年 {_M + 1} 月{isThisMonth ? '' : ''}</span>
          <button onClick={() => onMonth && onMonth(1)} style={navBtn}><Icon name="chevR" size={18} color={t.text} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 6 }}>
          {DOWH.map((d) => <div key={d} style={{ textAlign: 'center', fontSize: 11.5, color: t.faint, fontWeight: 600, padding: '2px 0' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const key = _mm + '-' + String(d).padStart(2, '0');
            const evs = live(app.events[key]);
            const cats = [...new Set(evs.map((e) => e.cat))];
            const today = isThisMonth && key === TODAY;
            return (
              <div key={i} onClick={() => evs.length && onPick(key)} style={{
                minHeight: 58, borderRadius: 10, padding: '6px 0 0', cursor: evs.length ? 'pointer' : 'default',
                background: today ? t.accentSoft : (evs.length ? t.surface : 'transparent'),
                border: `1px solid ${today ? 'transparent' : (evs.length ? t.border : 'transparent')}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}>
                <span style={{ fontSize: 13.5, fontWeight: today ? 720 : 560, color: today ? t.accentText : (evs.length ? t.text : t.faint) }}>{d}</span>
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 38 }}>
                  {cats.slice(0, 4).map((c) => <span key={c} style={{ width: 6, height: 6, borderRadius: 999, background: catColor(t, c) }} />)}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ textAlign: 'center', fontSize: 12.5, color: t.faint, marginTop: 14 }}>点有安排的日期放大查看</div>
      </div>
    );
  }

  function OverviewView({ t, app }) {
    const [idx, setIdx] = useState(1); // 0 月 · 1 周 · 2 日
    const [day, setDay] = useState(TODAY);
    const [monthOff, setMonthOff] = useState(0); // 月视图翻月偏移
    const ref = useRef(null);
    const step = (d) => setIdx((i) => Math.max(0, Math.min(2, i + d)));

    // 双指 / ⌘滚轮缩放：在全览区内独占手势，不再缩放外层画布
    useEffect(() => {
      const el = ref.current; if (!el) return;
      const acc = { v: 0 };
      const onWheel = (e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault(); e.stopPropagation();
          acc.v += e.deltaY;
          if (acc.v < -38) { acc.v = 0; step(1); }
          else if (acc.v > 38) { acc.v = 0; step(-1); }
        } else { e.stopPropagation(); }
      };
      let d0 = 0;
      const dist = (tt) => Math.hypot(tt[0].clientX - tt[1].clientX, tt[0].clientY - tt[1].clientY);
      const onTS = (e) => { if (e.touches.length === 2) d0 = dist(e.touches); };
      const onTM = (e) => {
        if (e.touches.length === 2) {
          e.preventDefault(); e.stopPropagation();
          const d = dist(e.touches);
          if (d0 && d / d0 > 1.22) { d0 = d; step(1); }
          else if (d0 && d / d0 < 0.82) { d0 = d; step(-1); }
        }
      };
      el.addEventListener('wheel', onWheel, { passive: false });
      el.addEventListener('touchstart', onTS, { passive: false });
      el.addEventListener('touchmove', onTM, { passive: false });
      return () => { el.removeEventListener('wheel', onWheel); el.removeEventListener('touchstart', onTS); el.removeEventListener('touchmove', onTM); };
    }, []);

    const level = LEVELS[idx].key;
    return (
      <div ref={ref} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', touchAction: 'pan-y' }}>
        {/* 缩放控制 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 16px 10px' }}>
          <button onClick={() => step(-1)} disabled={idx === 0} style={zbtn(t, idx === 0)}><Icon name="minus" size={18} color={idx === 0 ? t.faint : t.text} sw={2.2} /></button>
          <div style={{ flex: 1 }}><Segmented t={t} size="sm" value={level} onChange={(k) => setIdx(LEVELS.findIndex((l) => l.key === k))} items={LEVELS} /></div>
          <button onClick={() => step(1)} disabled={idx === 2} style={zbtn(t, idx === 2)}><Icon name="plus" size={18} color={idx === 2 ? t.faint : t.text} sw={2.2} /></button>
        </div>
        {level === 'day' && <DayView t={t} app={app} dayKey={day} />}
        {level === 'week' && <WeekView t={t} app={app} onPick={(k) => { setDay(k); setIdx(2); }} />}
        {level === 'month' && <MonthView t={t} app={app} monthOff={monthOff} onMonth={(d) => setMonthOff((o) => o + d)} onPick={(k) => { setDay(k); setIdx(2); }} />}
        <div style={{ textAlign: 'center', fontSize: 11.5, color: t.faint, padding: '2px 0 8px' }}>双指 / ⌘+滚轮缩放 · 或用上方 ± 切换</div>
      </div>
    );
  }

  function zbtn(t, dis) {
    return {
      width: 38, height: 38, borderRadius: 999, flexShrink: 0, cursor: dis ? 'default' : 'pointer',
      border: `1px solid ${t.border}`, background: t.surface, opacity: dis ? 0.5 : 1,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    };
  }

  window.OverviewView = OverviewView;
})();
