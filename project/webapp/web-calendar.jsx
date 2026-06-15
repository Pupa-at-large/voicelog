/* VoiceLog Web · 日历网格（周 / 月 / 日，支持重叠分栏 + 重要星标） */
(function () {
  const { Icon, catColor, catLabel } = window;
  const WK = ['06-15', '06-16', '06-17', '06-18', '06-19', '06-20', '06-21'];
  const DOWH = ['日', '一', '二', '三', '四', '五', '六'];
  const TODAY = '06-16';
  const mins = (s) => { const [a, b] = s.split(':').map(Number); return a * 60 + b; };
  const live = (a) => (a || []).filter((e) => e.status !== 'cancelled');

  // 重叠分栏：同一时间簇内的事件并排
  function layout(evs) {
    const items = live(evs).slice().sort((a, b) => mins(a.t) - mins(b.t) || (b.dur - a.dur));
    const out = []; let cluster = [], end = -1;
    const flush = () => {
      const lanes = [];
      cluster.forEach((it) => {
        let li = lanes.findIndex((e) => e <= mins(it.t));
        if (li < 0) { li = lanes.length; lanes.push(0); }
        lanes[li] = mins(it.t) + it.dur; it._lane = li;
      });
      cluster.forEach((it) => { it._lanes = lanes.length; out.push(it); });
      cluster = []; end = -1;
    };
    items.forEach((it) => { const s = mins(it.t), e = s + it.dur; if (cluster.length && s >= end) flush(); cluster.push(it); end = Math.max(end, e); });
    if (cluster.length) flush();
    return out;
  }

  function Block({ t, ev, base, HH, onClick }) {
    const top = (mins(ev.t) - base * 60) / 60 * HH;
    const h = Math.max(30, (ev.dur / 60) * HH - 3);
    const col = catColor(t, ev.cat);
    const done = ev.status === 'done';
    const w = 100 / (ev._lanes || 1);
    return (
      <div onClick={(e) => { e.stopPropagation(); onClick(ev); }} style={{
        position: 'absolute', top, left: `calc(${(ev._lane || 0) * w}% + 2px)`, width: `calc(${w}% - 4px)`, height: h,
        background: `color-mix(in oklch, ${col} 14%, ${t.surface})`, borderLeft: `3px solid ${col}`, borderRadius: 8,
        padding: '5px 8px', cursor: 'pointer', overflow: 'hidden', boxShadow: t.shadow, opacity: done ? 0.6 : 1, boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {ev.important && <Icon name="starFill" size={12} color={'oklch(0.76 0.14 80)'} fill style={{ flexShrink: 0 }} />}
          {ev.repeat && <Icon name="repeat" size={11} color={col} sw={2.2} style={{ flexShrink: 0 }} />}
          <span style={{ fontSize: 12.5, fontWeight: 650, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: done ? 'line-through' : 'none' }}>{ev.title}</span>
        </div>
        {h > 40 && <div style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>{ev.t}{ev.loc ? ` · ${ev.loc}` : ''}</div>}
      </div>
    );
  }

  function HourGrid({ t, base, end, HH, children, onColClick }) {
    const hours = []; for (let h = base; h <= end; h++) hours.push(h);
    return (
      <div style={{ position: 'relative', minHeight: (end - base + 1) * HH }} onClick={onColClick}>
        {hours.map((h, i) => (
          <div key={h} style={{ position: 'absolute', top: i * HH, left: 0, right: 0, height: HH, borderTop: `1px solid ${t.border}` }} />
        ))}
        {children}
      </div>
    );
  }

  function WebCalendar({ t, view, events, selDay, onSelectEvent, onPickDay, onSelectSlot }) {
    const base = 7, end = 22, HH = 52;

    if (view === 'month') {
      const cells = []; for (let d = 1; d <= 30; d++) cells.push(d); while (cells.length % 7) cells.push(null);
      return (
        <div style={{ flex: 1, overflow: 'auto', padding: 4 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderLeft: `1px solid ${t.border}`, borderTop: `1px solid ${t.border}` }}>
            {DOWH.map((d) => <div key={'h' + d} style={{ padding: '8px 10px', fontSize: 12.5, fontWeight: 600, color: t.faint, borderRight: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`, background: t.surface2 }}>周{d}</div>)}
            {cells.map((d, i) => {
              if (!d) return <div key={i} style={{ minHeight: 116, borderRight: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`, background: t.surface2 }} />;
              const key = '06-' + String(d).padStart(2, '0');
              const evs = live(events[key]).slice().sort((a, b) => a.t.localeCompare(b.t));
              const today = key === TODAY;
              return (
                <div key={i} onClick={() => onPickDay(key)} style={{ minHeight: 116, padding: 7, borderRight: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`, cursor: 'pointer', background: today ? t.accentSoft : t.surface }}>
                  <div style={{ fontSize: 13, fontWeight: today ? 720 : 560, color: today ? t.accentText : t.text, marginBottom: 5 }}>{d}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {evs.slice(0, 3).map((ev) => (
                      <div key={ev.id} onClick={(e) => { e.stopPropagation(); onSelectEvent(ev); }} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: t.text, background: `color-mix(in oklch, ${catColor(t, ev.cat)} 13%, transparent)`, borderRadius: 5, padding: '2px 6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ev.important && <Icon name="starFill" size={10} color={'oklch(0.76 0.14 80)'} fill />}
                        <span style={{ width: 5, height: 5, borderRadius: 999, background: catColor(t, ev.cat), flexShrink: 0 }} />{ev.t} {ev.title}
                      </div>
                    ))}
                    {evs.length > 3 && <div style={{ fontSize: 11, color: t.faint, paddingLeft: 4 }}>+{evs.length - 3}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    const cols = view === 'day' ? [selDay] : WK;
    return (
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* 列头 */}
        <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 2, background: t.surface, borderBottom: `1px solid ${t.border}` }}>
          <div style={{ width: 56, flexShrink: 0 }} />
          {cols.map((k) => {
            const w = window.VL.data.week.find((x) => x.key === k);
            const today = k === TODAY;
            return (
              <div key={k} onClick={() => onPickDay(k)} style={{ flex: 1, textAlign: 'center', padding: '10px 0', cursor: 'pointer', borderLeft: `1px solid ${t.border}` }}>
                <span style={{ fontSize: 12, color: today ? t.accentText : t.faint, fontWeight: 600 }}>周{w.dow}</span>
                <div style={{ margin: '3px auto 0', width: 30, height: 30, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 680, background: today ? t.accent : 'transparent', color: today ? t.onAccent : t.text }}>{w.day}</div>
              </div>
            );
          })}
        </div>
        {/* 时间网格 */}
        <div style={{ display: 'flex', flex: 1 }}>
          <div style={{ width: 56, flexShrink: 0 }}>
            {Array.from({ length: end - base + 1 }).map((_, i) => (
              <div key={i} style={{ height: HH, position: 'relative' }}>
                <span style={{ position: 'absolute', top: -7, right: 8, fontSize: 11, color: t.faint, fontVariantNumeric: 'tabular-nums' }}>{String(base + i).padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>
          {cols.map((k) => (
            <div key={k} style={{ flex: 1, borderLeft: `1px solid ${t.border}` }}>
              <HourGrid t={t} base={base} end={end} HH={HH} onColClick={() => onSelectSlot && onSelectSlot(k)}>
                {layout(events[k]).map((ev) => <Block key={ev.id} t={t} ev={ev} base={base} HH={HH} onClick={onSelectEvent} />)}
              </HourGrid>
            </div>
          ))}
        </div>
      </div>
    );
  }

  window.WebCalendar = WebCalendar;
})();
