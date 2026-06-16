/* VoiceLog Web · 桌面应用外壳 + 视图 */
(function () {
  const { useState, useEffect, useRef, useMemo } = React;
  const { Icon, Card, Btn, Segmented, Chip, Dot, Ring, StackBar, AllocRow, SectionLabel, catColor, catLabel, fmtH } = window;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const SKEY = 'voicelog-web-v2';
  const CATS = ['meet', 'deep', 'life', 'learn', 'misc'];
  const XP = window.VL.XP;
  const GOLD = window.VL.GOLD;
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const load = () => { try { return JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) { return null; } };

  function Modal({ t, open, onClose, children, width = 440 }) {
    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 55, pointerEvents: open ? 'auto' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(8,10,14,0.5)', opacity: open ? 1 : 0, transition: 'opacity .25s', backdropFilter: open ? 'blur(3px)' : 'none' }} />
        <div style={{ position: 'relative', width, maxWidth: '90%', maxHeight: '86%', overflowY: 'auto', background: t.surface, borderRadius: t.radius + 8, boxShadow: t.shadowLg, border: `1px solid ${t.border}`, padding: 22, transform: open ? 'scale(1)' : 'scale(0.96)', opacity: open ? 1 : 0, transition: 'transform .25s, opacity .25s' }}>{open && children}</div>
      </div>
    );
  }

  // ── 重复范围补充弹窗（之后再补的课表） ──
  function RecurrenceModal({ t, open, onClose, count, onConfirm }) {
    const opts = (window.VL.RECUR_OPTIONS || []).filter((o) => o.key !== 'later');
    const [key, setKey] = useState('semester');
    const [custom, setCustom] = useState('2026-07-10');
    useEffect(() => { if (open) { setKey('semester'); setCustom('2026-07-10'); } }, [open]);
    const fmtDate = (s) => { const p = s.split('-'); return `${+p[1]}月${+p[2]}日`; };
    const sel = opts.find((o) => o.key === key) || opts[0];
    const until = key === 'custom' ? custom : sel.until;
    const untilText = key === 'custom' ? fmtDate(custom) : sel.untilText;
    return (
      <Modal t={t} open={open} onClose={onClose} width={440}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: t.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="repeat" size={20} color={t.accentText} sw={2} /></div>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 720, color: t.text }}>补充重复范围</h3>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: 13.5, lineHeight: 1.6, color: t.muted }}>{count > 0 ? `有 ${count} 节课还按"本学期暂存"。` : ''}现在知道结课日期了？设定后，这些课会每周重复到那天为止。</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {opts.map((o) => {
            const on = key === o.key;
            return (
              <button key={o.key} onClick={() => setKey(o.key)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 13px', cursor: 'pointer', font: 'inherit', borderRadius: t.radius - 4, border: `1.5px solid ${on ? t.accentText : t.border}`, background: on ? t.accentSoft : t.surface, textAlign: 'left' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 650, color: on ? t.accentText : t.text }}>{o.label}</span>
                    {o.ai && <span style={{ fontSize: 10, fontWeight: 700, color: 'oklch(0.55 0.13 150)', background: 'color-mix(in oklch, oklch(0.62 0.15 150) 16%, transparent)', padding: '1px 6px', borderRadius: 999 }}>AI 推荐</span>}
                  </div>
                  <div style={{ fontSize: 11, color: on ? t.accentText : t.faint, opacity: on ? 0.8 : 1, marginTop: 1 }}>{o.sub}</div>
                </div>
              </button>
            );
          })}
        </div>
        {key === 'custom' && <input type="date" value={custom} min="2026-06-15" onChange={(e) => setCustom(e.target.value)} style={{ width: '100%', height: 40, padding: '0 13px', borderRadius: t.radius - 4, border: `1px solid ${t.border}`, background: t.bg, color: t.text, font: 'inherit', fontSize: 13.5, outline: 'none', marginBottom: 4 }} />}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <Btn t={t} kind="ghost" onClick={onClose} style={{ flex: 1 }}>稍后</Btn>
          <Btn t={t} kind="primary" icon="check" onClick={() => onConfirm(until, untilText)} style={{ flex: 2 }}>重复至 {untilText}</Btn>
        </div>
      </Modal>
    );
  }

  // ── 侧边栏 ──
  function Sidebar({ t, tab, setTab, onVoice, aiEngine, level, xp, onGrowth }) {
    const nav = [['cal', '日历', 'calendar'], ['review', '复盘', 'chart'], ['growth', '成长', 'sparkle'], ['export', '导出', 'export'], ['me', '设置', 'user']];
    return (
      <div style={{ width: 248, flexShrink: 0, background: t.surface, borderRight: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '4px 6px 18px' }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="micFill" size={20} color={t.onAccent} fill /></div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 760, color: t.text, letterSpacing: -0.3 }}>语迹 VoiceLog</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}><Dot color={'oklch(0.62 0.15 150)'} size={6} /><span style={{ fontSize: 11.5, color: t.faint }}>本地优先 · 已就绪</span></div>
          </div>
        </div>
        <Btn t={t} kind="primary" icon="mic" full onClick={onVoice} style={{ marginBottom: 16 }}>说一句 / 上传建程</Btn>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {nav.map(([k, lab, ic]) => {
            const on = tab === k;
            return (
              <button key={k} onClick={() => setTab(k)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: t.radius - 2, border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 14.5, fontWeight: on ? 650 : 500, color: on ? t.accentText : t.muted, background: on ? t.accentSoft : 'transparent', textAlign: 'left' }}>
                <Icon name={ic} size={19} color={on ? t.accentText : t.muted} sw={on ? 2.1 : 1.9} />{lab}
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1 }} />
        {level && (
          <button onClick={onGrowth} title="成长" style={{ display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer', font: 'inherit', padding: 12, marginBottom: 10, borderRadius: t.radius, border: `1px solid color-mix(in oklch, ${GOLD} 40%, ${t.border})`, background: t.mode === 'dark' ? 'linear-gradient(150deg,#16302c,#102420)' : `linear-gradient(150deg, color-mix(in oklch, ${GOLD} 13%, ${t.surface}), ${t.surface})` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 30, height: 30, borderRadius: 999, flexShrink: 0, border: `1.5px solid ${GOLD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 720, color: GOLD }}>{level.lv}</span>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 650, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{level.name}</div><div style={{ fontSize: 11, color: t.faint }}>LV.{level.lv} · {xp} XP</div></div>
            </div>
            <div style={{ height: 5, borderRadius: 999, background: t.chartTrack, overflow: 'hidden', marginTop: 9 }}><div style={{ height: '100%', width: `${level.pct}%`, borderRadius: 999, background: GOLD }} /></div>
          </button>
        )}
        <div style={{ padding: 12, borderRadius: t.radius, background: t.surface2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Dot color={aiEngine ? 'oklch(0.62 0.15 150)' : 'oklch(0.70 0.14 70)'} size={9} ring /><span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{aiEngine ? 'AI 解析' : '规则解析'}</span></div>
          <div style={{ fontSize: 11.5, color: t.faint, marginTop: 6, lineHeight: 1.5 }}>数据存于本机 voicelog.db，并镜像一份 Markdown。</div>
        </div>
      </div>
    );
  }

  // ── 右栏：快速建程 + 当日清单 ──
  function RightRail({ t, app, dayKey }) {
    const [text, setText] = useState('');
    const [capDismiss, setCapDismiss] = useState({});
    const [rollDismiss, setRollDismiss] = useState(false);
    const list = (app.events[dayKey] || []).slice().sort((a, b) => a.t.localeCompare(b.t));
    const load = window.VL.dayLoad(list);
    const todayKey = window.VL.todayKey();
    const prevKey = window.VL.prevKey(todayKey);
    const rollN = (dayKey === todayKey && prevKey) ? (app.events[prevKey] || []).filter((e) => e.status === 'todo').length : 0;
    const w = window.VL.data.week.find((x) => x.key === dayKey);
    const submit = () => { const v = text.trim(); if (!v) return; app.quickAdd(v); setText(''); };
    return (
      <div style={{ width: 312, flexShrink: 0, borderLeft: `1px solid ${t.border}`, background: t.surface, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 18, borderBottom: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 12.5, fontWeight: 650, color: t.faint, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 9 }}>快速建程</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} placeholder="明天三点开会 / 每周三五早上八点英语课…" style={{ flex: 1, height: 42, padding: '0 14px', borderRadius: t.radius - 2, border: `1px solid ${t.border}`, background: t.bg, color: t.text, font: 'inherit', fontSize: 13.5, outline: 'none' }} />
            <button onClick={submit} style={{ width: 42, height: 42, flexShrink: 0, borderRadius: t.radius - 2, border: 'none', cursor: 'pointer', background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="arrowR" size={19} color={t.onAccent} sw={2.2} /></button>
          </div>
          <div style={{ fontSize: 11.5, color: t.faint, marginTop: 8 }}>回车即建 · 支持「每周三五」重复、「到学期末」截止，一段话还能<b style={{ color: t.muted }}>多条一起建</b></div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
          {rollN > 0 && !rollDismiss && (
            <window.RolloverBanner t={t} count={rollN} onMove={() => { app.rolloverUnfinished(); setRollDismiss(true); }} onDismiss={() => setRollDismiss(true)} style={{ marginBottom: 14 }} />
          )}
          {load > window.VL.DAILY_CAPACITY_H && !capDismiss[dayKey] && (
            <window.CapacityBanner t={t} hours={load} cap={window.VL.DAILY_CAPACITY_H} onDismiss={() => setCapDismiss((d) => ({ ...d, [dayKey]: true }))} style={{ marginBottom: 14 }} />
          )}
          <window.FocusCard t={t} events={list} dayKey={dayKey} onOpen={app.openDetail} style={{ marginBottom: 16 }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: t.text, marginBottom: 12 }}>{w.today ? '今天' : `周${w.dow}`} · 6月{w.day}日 <span style={{ fontSize: 13, fontWeight: 500, color: t.faint }}>{list.length} 项</span></div>
          {list.length ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {list.map((ev) => {
              const done = ev.status === 'done', cancelled = ev.status === 'cancelled';
              const conf = window.VL.overlaps(list, ev).length > 0 && !cancelled;
              return (
                <div key={ev.id} onClick={() => app.openDetail(ev)} style={{ display: 'flex', gap: 10, padding: 11, borderRadius: t.radius - 2, border: `1px solid ${t.border}`, background: t.bg, cursor: 'pointer', opacity: cancelled ? 0.6 : 1 }}>
                  <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 999, background: catColor(t, ev.cat), opacity: done ? 0.4 : 1 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {ev.important && <Icon name="starFill" size={12} color={'oklch(0.76 0.14 80)'} fill />}
                      {ev.urgent && <Icon name="flagFill" size={11} color={'oklch(0.62 0.19 25)'} fill />}
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: done || cancelled ? t.faint : t.text, textDecoration: done || cancelled ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3 }}>
                      <span style={{ fontSize: 11.5, color: t.muted, fontVariantNumeric: 'tabular-nums' }}>{ev.t}</span>
                      {ev.loc && <span style={{ fontSize: 11.5, color: t.faint }}>{ev.loc}</span>}
                      {conf && <span onClick={(e) => { e.stopPropagation(); app.showMultitask(); }} style={{ fontSize: 11, fontWeight: 600, color: 'oklch(0.58 0.15 60)', background: 'color-mix(in oklch, oklch(0.72 0.15 70) 16%, transparent)', padding: '1px 7px', borderRadius: 999 }}>重叠</span>}
                    </div>
                    {ev.progress && <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 7 }}><div style={{ flex: 1, height: 5, borderRadius: 999, background: t.chartTrack, overflow: 'hidden' }}><div style={{ height: '100%', width: `${ev.progress.done / ev.progress.total * 100}%`, background: catColor(t, ev.cat), borderRadius: 999 }} /></div><span style={{ fontSize: 11, fontWeight: 600, color: t.faint, fontVariantNumeric: 'tabular-nums' }}>{ev.progress.done}/{ev.progress.total}</span></div>}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); app.toggleDone(ev.id, 'list'); }} style={{ position: 'relative', width: 24, height: 24, alignSelf: 'center', borderRadius: 999, flexShrink: 0, cursor: 'pointer', border: done ? 'none' : `2px solid ${t.borderStrong}`, background: done ? catColor(t, ev.cat) : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, transform: app.burst && app.burst.id === ev.id ? 'scale(1.22)' : 'scale(1)', transition: 'transform .2s cubic-bezier(.2,.9,.3,1.4)' }}>{done && <Icon name="check" size={14} color={t.onAccent} sw={2.6} />}{app.burst && app.burst.id === ev.id && <window.CheckBurst t={t} k={app.burst.key} />}</button>
                </div>
              );
            })}
          </div> : <div style={{ textAlign: 'center', padding: '30px 0', color: t.faint, fontSize: 13 }}>这天还没有安排</div>}
        </div>
      </div>
    );
  }

  // ── 日历视图 ──
  function CalView({ t, app }) {
    const [view, setView] = useState('week');
    const selDayNum = (window.VL.data.week.find((x) => x.key === app.selDay) || {}).day;
    const ranges = { week: '6月15日 – 21日', month: '2026 年 6 月', day: '6月' + selDayNum + '日', matrix: '6月' + selDayNum + '日 · 四象限' };
    return (
      <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px', borderBottom: `1px solid ${t.border}` }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 750, color: t.text }}>{ranges[view]}</h1>
            <button onClick={() => { app.setDay('06-16'); }} style={{ height: 34, padding: '0 14px', borderRadius: t.radius - 2, border: `1px solid ${t.border}`, background: t.surface, color: t.text, font: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>今天</button>
            <div style={{ flex: 1 }} />
            <div style={{ width: 288 }}><Segmented t={t} value={view} onChange={setView} items={[{ key: 'day', label: '日' }, { key: 'week', label: '周' }, { key: 'month', label: '月' }, { key: 'matrix', label: '象限' }]} /></div>
          </div>
          {app.hasPending && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 24px', background: t.accentSoft, borderBottom: `1px solid ${t.border}` }}>
              <Icon name="repeat" size={18} color={t.accentText} sw={2} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 13, color: t.accentText, lineHeight: 1.5 }}>课表已加入，有 <b>{app.pendingCount}</b> 节课的重复范围先按本学期暂存。知道结课日期了就补上，每周自动重复到那天。</div>
              <button onClick={app.openRecur} style={{ flexShrink: 0, height: 32, padding: '0 14px', borderRadius: t.radius - 4, border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 13, fontWeight: 650, background: t.accent, color: t.onAccent }}>补充范围</button>
            </div>
          )}
          {view === 'matrix'
            ? <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}><window.MatrixView t={t} events={app.events[app.selDay] || []} onOpen={app.openDetail} onInfo={app.showMatrix} /></div>
            : <window.WebCalendar t={t} view={view} events={app.events} selDay={app.selDay} onSelectEvent={app.openDetail} onPickDay={(k) => { app.setDay(k); if (view === 'month') setView('day'); }} onSelectSlot={(k) => app.setDay(k)} />}
        </div>
        <RightRail t={t} app={app} dayKey={app.selDay} />
      </div>
    );
  }

  // ── 复盘视图 ──
  function ReviewView({ t, app }) {
    const [period, setPeriod] = useState('day');
    const r = window.VL.getReview(period, app.events);
    const max = Math.max(1, ...r.alloc.map((a) => a.hours));
    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 760, color: t.text }}>复盘</h1>
          <div style={{ width: 320 }}><Segmented t={t} value={period} onChange={setPeriod} items={window.VL.periods} /></div>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <Card t={t} style={{ width: 320, flexShrink: 0 }}>
            <div style={{ fontSize: 13, color: t.muted, fontWeight: 600 }}>{r.label} · {r.range}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '14px 0' }}>
              <div><div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}><span style={{ fontSize: 44, fontWeight: 780, color: t.text, letterSpacing: -1, lineHeight: 1 }}>{fmtH(r.total)}</span><span style={{ fontSize: 15, color: t.muted, fontWeight: 600 }}>小时</span></div><div style={{ fontSize: 13, color: t.faint, marginTop: 6 }}>共 {r.count} 项日程</div></div>
              <Ring t={t} value={r.rate} size={96} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>{[['完成', r.done], ['取消', r.cancelled], ['待办', r.todo]].map(([k, v]) => <div key={k} style={{ flex: 1, padding: '10px 0', borderRadius: t.radius - 4, background: t.surface2, textAlign: 'center' }}><div style={{ fontSize: 19, fontWeight: 720, color: t.text }}>{v}</div><div style={{ fontSize: 11.5, color: t.faint, marginTop: 1 }}>{k}</div></div>)}</div>
          </Card>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SectionLabel t={t}>时间去向</SectionLabel>
            {r.alloc.length ? <Card t={t} style={{ marginBottom: 18 }}><StackBar t={t} alloc={r.alloc} total={r.total} h={18} /><div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>{r.alloc.map((a) => <AllocRow key={a.cat} t={t} a={a} total={r.total} max={max} />)}</div></Card> : <Card t={t} style={{ marginBottom: 18, textAlign: 'center', color: t.faint, padding: 24 }}>这个周期还没有日程</Card>}
            <SectionLabel t={t}>洞察与建议</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {r.insights.map((s, i) => <div key={i} style={{ display: 'flex', gap: 11, padding: 15, borderRadius: t.radius, background: i === 0 ? t.accentSoft : t.surface, border: `1px solid ${i === 0 ? 'transparent' : t.border}`, boxShadow: i === 0 ? 'none' : t.shadow }}><Icon name={i === 0 ? 'sparkle' : 'bolt'} size={17} color={i === 0 ? t.accentText : t.muted} style={{ flexShrink: 0, marginTop: 1 }} /><p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: i === 0 ? t.accentText : t.text, fontWeight: i === 0 ? 550 : 400 }}>{s}</p></div>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 导出视图 ──
  function ExportView({ t, app }) {
    const [period, setPeriod] = useState('day');
    const [fmt, setFmt] = useState('md');
    const r = window.VL.getReview(period, app.events);
    const F = window.EXPORT_FORMATS;
    const ext = F.find((f) => f.key === fmt).ext;
    const fname = `${r.label}_${r.range.replace(/[\s/–]+/g, '-')}${ext}`;
    const Prev = { md: window.MdPreview, txt: window.TxtPreview, docx: window.DocxPreview }[fmt];
    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 760, color: t.text }}>导出</h1>
          <div style={{ width: 320 }}><Segmented t={t} value={period} onChange={setPeriod} items={window.VL.periods} /></div>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <div style={{ width: 320, flexShrink: 0 }}>
            <SectionLabel t={t}>选择格式</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {F.map((f) => { const on = fmt === f.key; return (
                <button key={f.key} onClick={() => setFmt(f.key)} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 14, cursor: 'pointer', borderRadius: t.radius, font: 'inherit', textAlign: 'left', background: on ? t.accentSoft : t.surface, border: `1.5px solid ${on ? t.accentText : t.border}`, boxShadow: on ? 'none' : t.shadow }}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0, background: on ? t.accent : t.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 11.5, fontWeight: 760, color: on ? t.onAccent : t.muted }}>{f.ext.replace('.', '').toUpperCase()}</span></div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 650, color: t.text }}>{f.name}</div><div style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>{f.desc}</div></div>
                </button>
              ); })}
            </div>
            <Btn t={t} kind="primary" icon="export" full onClick={() => app.setToast(`已导出 ${fname}`, 'check')} style={{ marginBottom: 8 }}>导出到 exports/</Btn>
            <Btn t={t} kind="ghost" icon="copy" full onClick={() => app.setToast('已复制到剪贴板', 'copy')}>复制内容</Btn>
            <div style={{ display: 'flex', gap: 7, alignItems: 'center', justifyContent: 'center', marginTop: 14 }}><Icon name="shield" size={14} color={t.faint} /><span style={{ fontSize: 12, color: t.faint }}>保存在本机 · 不经过云端</span></div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SectionLabel t={t}>预览 · 跟随格式变化</SectionLabel>
            <Prev t={t} r={r} fname={fname} />
          </div>
        </div>
      </div>
    );
  }

  // ── 设置视图 ──
  function SettingsView({ t, app, baseKey }) {
    const Row = ({ icon, title, sub, right, last }) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 14px', borderBottom: last ? 'none' : `1px solid ${t.border}` }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: t.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={18} color={t.muted} /></div>
        <div style={{ flex: 1 }}><div style={{ fontSize: 14.5, fontWeight: 600, color: t.text }}>{title}</div>{sub && <div style={{ fontSize: 12, color: t.faint, marginTop: 1 }}>{sub}</div>}</div>{right}
      </div>
    );
    const Toggle = ({ on, onChange }) => <button onClick={() => onChange(!on)} style={{ width: 46, height: 28, borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0, background: on ? t.accent : t.borderStrong, position: 'relative', padding: 0 }}><span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 22, height: 22, borderRadius: 999, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left .2s' }} /></button>;
    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', maxWidth: 720 }}>
        <h1 style={{ margin: '0 0 22px', fontSize: 26, fontWeight: 760, color: t.text }}>设置</h1>
        <div style={{ display: 'flex', gap: 13, padding: 16, borderRadius: t.radius, marginBottom: 20, background: t.accentSoft }}><Icon name="shield" size={22} color={t.accentText} style={{ flexShrink: 0, marginTop: 1 }} /><div><div style={{ fontSize: 15, fontWeight: 700, color: t.accentText }}>本地优先</div><div style={{ fontSize: 13, color: t.accentText, opacity: 0.85, marginTop: 3, lineHeight: 1.5 }}>所有数据都存在你自己的机器上，离线可用，不依赖云服务。</div></div></div>

        <SectionLabel t={t}>外观 · 视觉方向</SectionLabel>
        <Card t={t} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {Object.values(window.VL.themes).map((th) => { const on = baseKey === th.key; return (
              <button key={th.key} onClick={() => app.setBase(th.key)} style={{ flex: 1, padding: '12px 0', borderRadius: t.radius - 2, cursor: 'pointer', font: 'inherit', border: `1.5px solid ${on ? t.accentText : t.border}`, background: on ? t.accentSoft : t.surface, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 30, height: 30, borderRadius: 9, background: th.accent }} /><span style={{ fontSize: 13, fontWeight: on ? 650 : 500, color: on ? t.text : t.muted }}>{th.name} · {th.en}</span>
              </button>
            ); })}
          </div>
          <div style={{ fontSize: 12.5, color: t.faint, fontWeight: 600, marginBottom: 9 }}>主题色</div>
          <div style={{ display: 'flex', gap: 12 }}>
            {t.accents.map((a) => { const on = app.accentKey === a.key; return (
              <button key={a.key} onClick={() => app.setAccent(a.key)} style={{ flex: 1, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ width: '100%', height: 34, borderRadius: 10, background: a.accent, boxShadow: on ? `0 0 0 2.5px ${t.surface}, 0 0 0 5px ${a.accent}` : t.shadow, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{on && <Icon name="check" size={17} color="#fff" sw={2.6} />}</span>
                <span style={{ fontSize: 11.5, color: on ? t.text : t.faint, fontWeight: on ? 650 : 500 }}>{a.name}</span>
              </button>
            ); })}
          </div>
        </Card>

        <SectionLabel t={t}>解析引擎</SectionLabel>
        <Card t={t} pad={0} style={{ marginBottom: 8, overflow: 'hidden' }}><Row icon={app.aiEngine ? 'sparkle' : 'bolt'} title={app.aiEngine ? 'AI 解析' : '规则解析'} sub={app.aiEngine ? '已接入大模型 · 口语理解更强、复盘更有洞察' : '离线规则引擎 · 无需联网、开箱即用'} right={<Toggle on={app.aiEngine} onChange={app.setAi} />} last /></Card>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, marginTop: 16 }}>
          <SectionLabel t={t} style={{ margin: 0 }}>提醒与数据</SectionLabel>
        </div>
        <Card t={t} pad={0} style={{ marginBottom: 16, overflow: 'hidden' }}>
          <Row icon="bell" title="浏览器到点提醒" sub="到点在页面内提醒，并发送系统通知" right={<Toggle on={app.notify} onChange={app.setNotify} />} />
          <Row icon="folder" title="voicelog.db" sub="SQLite · 程序的事实来源" />
          <Row icon="doc" title="voicelog_schedule.md" sub="纯文本镜像 · 不开 App 也能直接读、喂给 LLM" />
          <Row icon="trash" title={`回收站 · ${app.trash.length} 项`} sub="删除的日程先放这里，随时找回" right={<button onClick={app.openTrash} style={{ height: 32, padding: '0 14px', borderRadius: 999, border: `1px solid ${t.border}`, cursor: 'pointer', font: 'inherit', fontSize: 13, fontWeight: 600, background: t.surface, color: t.text }}>打开</button>} />
          <Row icon="export" title="exports/" sub="导出的复盘文件都放在这里" last />
        </Card>
      </div>
    );
  }

  // ── 详情 / 编辑 模态 ──
  function DetailModal({ t, app }) {
    const ev = app.detail; if (!ev) return null;
    const done = ev.status === 'done', col = catColor(t, ev.cat);
    const meta = (icon, label, val) => <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: `1px solid ${t.border}` }}><Icon name={icon} size={17} color={t.faint} /><span style={{ fontSize: 14, color: t.muted, width: 52 }}>{label}</span><span style={{ fontSize: 14.5, color: t.text, fontWeight: 550 }}>{val}</span></div>;
    return (
      <Modal t={t} open={!!ev} onClose={() => app.setDetail(null)}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ width: 5, alignSelf: 'stretch', minHeight: 30, borderRadius: 999, background: col, marginTop: 3 }} />
          <div style={{ flex: 1 }}><h3 style={{ margin: 0, fontSize: 21, fontWeight: 720, color: t.text }}>{ev.title}</h3><div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}><Chip t={t} color={col} soft><Dot color={col} size={7} />{catLabel(t, ev.cat)}</Chip><button onClick={() => app.showMatrix()} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, font: 'inherit' }} title="四象限"><window.QuadrantChip t={t} ev={ev} /></button></div></div>
          <button onClick={() => app.toggleImportant(ev.id)} title="重要" style={{ width: 36, height: 36, borderRadius: 999, cursor: 'pointer', flexShrink: 0, border: `1px solid ${t.border}`, background: t.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={ev.important ? 'starFill' : 'star'} size={18} color={ev.important ? 'oklch(0.76 0.14 80)' : t.muted} fill={ev.important} /></button>
          <button onClick={() => app.toggleUrgent(ev.id)} title="紧急" style={{ width: 36, height: 36, borderRadius: 999, cursor: 'pointer', flexShrink: 0, border: `1px solid ${t.border}`, background: t.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={ev.urgent ? 'flagFill' : 'flag'} size={18} color={ev.urgent ? 'oklch(0.62 0.19 25)' : t.muted} fill={ev.urgent} /></button>
        </div>
        <div style={{ marginTop: 12 }}>{meta('clock', '时间', `${ev.t} · ${ev.dur} 分钟`)}{ev.repeat && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: `1px solid ${t.border}` }}>
            <Icon name="repeat" size={17} color={t.faint} />
            <span style={{ fontSize: 14, color: t.muted, width: 52 }}>重复</span>
            <span style={{ fontSize: 14.5, color: t.text, fontWeight: 550 }}>每周{['日', '一', '二', '三', '四', '五', '六'][ev.repeat.dow]} · {ev.repeat.until ? `至 ${ev.repeat.untilText}` : '范围待补充'}</span>
            {!ev.repeat.until && <button onClick={() => { app.setDetail(null); app.openRecur(); }} style={{ marginLeft: 'auto', height: 28, padding: '0 11px', borderRadius: 999, border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 12.5, fontWeight: 650, background: t.accentSoft, color: t.accentText }}>补充</button>}
          </div>
        )}{ev.loc && meta('pin', '地点', ev.loc)}{meta('bell', '提醒', ev.reminder ? `提前 ${ev.reminder} 分钟` : '不提醒')}</div>
        {ev.note && <div style={{ marginTop: 14, padding: 14, borderRadius: t.radius - 2, background: t.surface2 }}><div style={{ fontSize: 12, color: t.faint, fontWeight: 600, marginBottom: 5 }}>备注</div><div style={{ fontSize: 14.5, color: t.text, lineHeight: 1.55 }}>{ev.note}</div></div>}
        {ev.progress && (
          <div style={{ marginTop: 14, padding: 14, borderRadius: t.radius - 2, background: t.surface2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12.5, color: t.faint, fontWeight: 650 }}>分阶段进度</span>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: t.text }}>{ev.progress.done} / {ev.progress.total}</span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>{Array.from({ length: ev.progress.total }).map((_, i) => <div key={i} style={{ flex: 1, height: 7, borderRadius: 999, background: i < ev.progress.done ? catColor(t, ev.cat) : t.chartTrack, transition: 'background .4s' }} />)}</div>
            <div style={{ fontSize: 12, color: t.muted, lineHeight: 1.55, marginTop: 10 }}>长期任务不必一次做完，<b style={{ color: t.text }}>每一步都算数</b>。</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Btn t={t} kind="primary" icon="plus" onClick={() => app.advanceProgress(ev.id)} style={{ flex: 1, opacity: ev.progress.done >= ev.progress.total ? 0.5 : 1, pointerEvents: ev.progress.done >= ev.progress.total ? 'none' : 'auto' }}>推进一步</Btn>
              <Btn t={t} kind="ghost" icon="redo" onClick={() => app.postpone(ev.id)}>延期一天</Btn>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <Btn t={t} kind={done ? 'ghost' : 'primary'} icon="check" onClick={() => { app.toggleDone(ev.id); app.setDetail(null); }} style={{ flex: 1 }}>{done ? '标记未完成' : '标记完成'}</Btn>
          <Btn t={t} kind="ghost" icon="pencil" onClick={() => app.openEdit(ev)}>编辑</Btn>
          <Btn t={t} kind="ghost" onClick={() => { app.cancelEvent(ev.id); app.setDetail(null); }}>取消</Btn>
          <button onClick={() => { app.deleteEvent(ev.id); app.setDetail(null); }} style={{ width: 46, height: 46, borderRadius: t.radius - 2, flexShrink: 0, cursor: 'pointer', border: `1px solid ${t.border}`, background: t.surface2, color: 'oklch(0.62 0.19 25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="trash" size={19} color="oklch(0.62 0.19 25)" /></button>
        </div>
      </Modal>
    );
  }

  function EditModal({ t, app }) {
    const ev = app.editEv;
    const [st, setSt] = useState(null);
    const titleRef = useRef(null), locRef = useRef(null);
    useEffect(() => { if (ev) { const [h, m] = ev.t.split(':').map(Number); setSt({ hh: h, mm: m, cat: ev.cat, reminder: ev.reminder || 0, important: !!ev.important, urgent: !!ev.urgent }); } }, [ev]);
    if (!ev || !st) return null;
    const bump = (d) => setSt((s) => { const tot = (s.hh * 60 + s.mm + d + 1440) % 1440; return { ...s, hh: Math.floor(tot / 60), mm: tot % 60 }; });
    const time = `${String(st.hh).padStart(2, '0')}:${String(st.mm).padStart(2, '0')}`;
    const conflict = window.VL.overlaps(app.events[app.selDay] || [], { id: ev.id, t: time, dur: ev.dur });
    const ed = (ref, val) => <span ref={ref} contentEditable suppressContentEditableWarning style={{ fontSize: 15.5, fontWeight: 600, color: t.text, outline: 'none', borderRadius: 6, padding: '7px 11px', background: t.surface2, display: 'inline-block', minWidth: 160 }}>{val}</span>;
    const row = (label, node) => <div style={{ marginBottom: 15 }}><div style={{ fontSize: 12.5, color: t.faint, fontWeight: 600, marginBottom: 7 }}>{label}</div>{node}</div>;
    return (
      <Modal t={t} open={!!ev} onClose={() => app.setEditEv(null)}>
        <h3 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 720, color: t.text }}>编辑日程</h3>
        {row('标题', ed(titleRef, ev.title))}
        {row('时间', <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><button onClick={() => bump(-15)} style={stepBtn(t)}><Icon name="minus" size={18} color={t.text} sw={2.2} /></button><span style={{ fontSize: 22, fontWeight: 720, color: t.text, fontVariantNumeric: 'tabular-nums', minWidth: 78, textAlign: 'center' }}>{time}</span><button onClick={() => bump(15)} style={stepBtn(t)}><Icon name="plus" size={18} color={t.text} sw={2.2} /></button><span style={{ fontSize: 12.5, color: t.faint, marginLeft: 4 }}>每档 15 分钟</span></div>)}
        {row('类别', <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>{CATS.map((c) => { const on = st.cat === c; return <button key={c} onClick={() => setSt({ ...st, cat: c })} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 32, padding: '0 12px', borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 13, fontWeight: 600, border: `1px solid ${on ? 'transparent' : t.border}`, background: on ? `color-mix(in oklch, ${catColor(t, c)} 16%, transparent)` : 'transparent', color: on ? t.text : t.muted }}><Dot color={catColor(t, c)} size={7} />{catLabel(t, c)}</button>; })}</div>)}
        {row('地点', ed(locRef, ev.loc || ''))}
        {row('提醒', <div style={{ display: 'flex', gap: 7 }}>{[0, 10, 15, 30].map((m) => <button key={m} onClick={() => setSt({ ...st, reminder: m })} style={{ height: 32, padding: '0 13px', borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 13, fontWeight: 600, border: `1px solid ${st.reminder === m ? 'transparent' : t.border}`, background: st.reminder === m ? t.accentSoft : 'transparent', color: st.reminder === m ? t.accentText : t.muted }}>{m === 0 ? '不提醒' : `提前${m}分`}</button>)}</div>)}
        {row('优先级', <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => setSt({ ...st, important: !st.important })} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 13.5, fontWeight: 600, border: `1px solid ${st.important ? 'transparent' : t.border}`, background: st.important ? 'color-mix(in oklch, oklch(0.76 0.14 80) 18%, transparent)' : 'transparent', color: st.important ? t.text : t.muted }}><Icon name={st.important ? 'starFill' : 'star'} size={16} color={st.important ? 'oklch(0.72 0.14 80)' : t.muted} fill={st.important} />重要</button>
          <button onClick={() => setSt({ ...st, urgent: !st.urgent })} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 13.5, fontWeight: 600, border: `1px solid ${st.urgent ? 'transparent' : t.border}`, background: st.urgent ? 'color-mix(in oklch, oklch(0.62 0.19 25) 16%, transparent)' : 'transparent', color: st.urgent ? t.text : t.muted }}><Icon name={st.urgent ? 'flagFill' : 'flag'} size={16} color={st.urgent ? 'oklch(0.62 0.19 25)' : t.muted} fill={st.urgent} />紧急</button>
          <window.QuadrantChip t={t} ev={{ important: st.important, urgent: st.urgent }} />
        </div>)}
        {conflict.length > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: 12, borderRadius: t.radius - 2, marginBottom: 14, background: 'color-mix(in oklch, oklch(0.72 0.15 70) 14%, transparent)', border: `1px solid color-mix(in oklch, oklch(0.72 0.15 70) 35%, transparent)` }}><Icon name="bolt" size={16} color={'oklch(0.6 0.15 60)'} style={{ flexShrink: 0 }} /><div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.55, color: t.text }}>与「{conflict.map((c) => c.title).join('、')}」时间重叠</div><Icon name="info" size={14} color={t.faint} onClick={() => app.showMultitask()} style={{ flexShrink: 0, cursor: 'pointer' }} /></div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <Btn t={t} kind="ghost" onClick={() => app.setEditEv(null)} style={{ flex: 1 }}>取消</Btn>
          <Btn t={t} kind="primary" icon="check" onClick={() => { const title = (titleRef.current ? titleRef.current.textContent.trim() : ev.title) || ev.title; const loc = locRef.current ? locRef.current.textContent.trim() : ev.loc; app.saveEvent(ev.id, { title, t: time, cat: st.cat, reminder: st.reminder, loc: loc || null, important: st.important, urgent: st.urgent }); app.setEditEv(null); }} style={{ flex: 2 }}>保存</Btn>
        </div>
      </Modal>
    );
  }
  function stepBtn(t) { return { width: 40, height: 40, borderRadius: 999, cursor: 'pointer', border: `1px solid ${t.border}`, background: t.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center' }; }

  function Toast({ t, toast }) {
    return <div style={{ position: 'absolute', left: '50%', bottom: 28, transform: 'translateX(-50%) translateY(' + (toast ? '0' : '10px') + ')', zIndex: 70, opacity: toast ? 1 : 0, transition: 'opacity .3s, transform .3s', pointerEvents: toast && toast.action ? 'auto' : 'none' }}><div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: toast && toast.action ? '9px 9px 9px 20px' : '11px 20px', borderRadius: 999, background: t.mode === 'dark' ? 'rgba(40,44,52,0.95)' : 'rgba(28,31,38,0.95)', boxShadow: t.shadowLg }}>{toast && toast.icon && <Icon name={toast.icon} size={17} color="#fff" sw={2.4} />}<span style={{ fontSize: 14, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>{toast ? toast.msg : ''}</span>{toast && toast.action && <button onClick={toast.action.fn} style={{ height: 30, padding: '0 14px', borderRadius: 999, border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.16)', color: '#fff' }}>{toast.action.label}</button>}</div></div>;
  }

  // ── 根组件 ──
  function VoiceLogWeb({ theme, fresh }) {
    const saved = useRef(fresh ? null : load()).current;
    const [baseKey, setBaseKey] = useState(() => (saved && saved.baseKey) || theme.key);
    const [accentKey, setAccentKey] = useState(() => (saved && saved.accentKey) || theme.accents[0].key);
    const [events, setEvents] = useState(() => fresh ? {} : ((saved && saved.events) ? saved.events : clone(window.VL.data.events)));
    const [tab, setTab] = useState('cal');
    const [selDay, setSelDay] = useState('06-16');
    const [detail, setDetail] = useState(null);
    const [editEv, setEditEv] = useState(null);
    const [voiceOpen, setVoiceOpen] = useState(false);
    const [aiEngine, setAiEngine] = useState(false);
    const [notify, setNotify] = useState(true);
    const [mtOpen, setMtOpen] = useState(false);
    const [recurOpen, setRecurOpen] = useState(false);
    const [trash, setTrash] = useState([]);
    const [trashOpen, setTrashOpen] = useState(false);
    const [celebrate, setCelebrate] = useState(null);
    const [burst, setBurst] = useState(null);
    // 成长系统：新用户从 0 起步，老用户落在 LV.4 区间
    const [xp, setXp] = useState(() => fresh ? 0 : ((saved && typeof saved.xp === 'number') ? saved.xp : 320));
    const [accumulatedDays, setAccDays] = useState(() => fresh ? 0 : ((saved && typeof saved.accumulatedDays === 'number') ? saved.accumulatedDays : 86));
    const [lastActiveDay, setLastActiveDay] = useState(() => (saved && saved.lastActiveDay) || '');
    const [lastReviewDay, setLastReviewDay] = useState(() => (saved && saved.lastReviewDay) || '');
    const [levelUp, setLevelUp] = useState(null);
    const [batch, setBatch] = useState(null);
    const [batchSel, setBatchSel] = useState([]);
    const [matrixOpen, setMatrixOpen] = useState(false);
    const [toast, setToastState] = useState(null);
    const toastTimer = useRef(0);
    const celTimer = useRef(0);
    const burstTimer = useRef(0);

    const base = window.VL.themes[baseKey] || theme;
    const t = useMemo(() => { const a = base.accents.find((x) => x.key === accentKey) || base.accents[0]; return { ...base, accent: a.accent, accentText: a.accentText, accentSoft: a.accentSoft }; }, [base, accentKey]);
    useEffect(() => { if (fresh) return; try { localStorage.setItem(SKEY, JSON.stringify({ events, baseKey, accentKey, xp, accumulatedDays, lastActiveDay, lastReviewDay })); } catch (e) {} }, [events, baseKey, accentKey, xp, accumulatedDays, lastActiveDay, lastReviewDay, fresh]);

    const markActive = () => { const today = todayStr(); setLastActiveDay((p) => { if (p !== today) setAccDays((d) => d + 1); return today; }); };
    const awardXp = (amount) => { markActive(); setXp((p) => { const nv = p + amount; if (window.VL.levelFromXp(nv).lv > window.VL.levelFromXp(p).lv) setLevelUp(window.VL.levelFromXp(nv)); return nv; }); };
    const isEmpty = useMemo(() => Object.values(events).every((a) => !a || a.length === 0), [events]);

    const setToast = (msg, icon, action) => { setToastState({ msg, icon, action }); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToastState(null), action ? 4200 : 2400); };
    const flashCelebrate = (d) => { setCelebrate({ ...d, key: Date.now() }); clearTimeout(celTimer.current); celTimer.current = setTimeout(() => setCelebrate(null), d.goal ? 2100 : 1900); };
    const fireCelebrate = (ev) => {
      const doneToday = (events['06-16'] || []).filter((e) => e.status === 'done').length + (selDay === '06-16' ? 1 : 0);
      const late = selDay === '06-16' && ev.t < '16:00';
      let msg;
      if (ev.goalDone) msg = '目标达成 · 全部进度完成！';
      else if (late) msg = '晚一点也算数';
      else { const pool = ['完成！做了就是胜利', '又往前推了一点，挺好', '搞定一件，给自己点个赞', '保持这个节奏']; msg = pool[Math.floor(Math.random() * pool.length)]; }
      flashCelebrate({ msg, streak: doneToday > 0 ? doneToday : 1, goal: !!ev.goalDone });
    };
    const hasPending = useMemo(() => Object.values(events).some((arr) => (arr || []).some((e) => e.repeat && !e.repeat.until)), [events]);
    const pendingCount = useMemo(() => Object.values(events).reduce((n, arr) => n + (arr || []).filter((e) => e.repeat && !e.repeat.until).length, 0), [events]);
    const mutate = (day, fn) => setEvents((prev) => { const next = { ...prev, [day]: (prev[day] || []).map((e) => ({ ...e })) }; next[day] = fn(next[day]); return next; });
    const addEvent = (p) => { const ev = { id: 'v' + Date.now() + Math.random().toString(36).slice(2, 5), t: p.time, dur: p.dur || 60, title: p.title, cat: p.cat, loc: p.loc, reminder: p.reminder || 0, status: 'todo', important: !!p.important, urgent: !!p.urgent }; mutate(p.dateKey, (arr) => [...arr, ev]); setSelDay(p.dateKey); awardXp(XP.create); return ev; };

    const app = {
      events, selDay, detail, editEv, aiEngine, notify, accentKey, hasPending, pendingCount, burst,
      xp, accumulatedDays, level: window.VL.levelFromXp(xp),
      setDay: setSelDay, setToast, setDetail, setEditEv, setTab,
      goGrowth: () => { setTab('growth'); const today = todayStr(); if (lastReviewDay !== today) { setLastReviewDay(today); awardXp(XP.review); setToast('复盘成长 +15 XP', 'sparkle'); } },
      openDetail: (ev) => setDetail(ev),
      openEdit: (ev) => { setDetail(null); setEditEv(ev); },
      openRecur: () => setRecurOpen(true),
      openVoice: () => setVoiceOpen(true),
      showMultitask: () => setMtOpen(true),
      setBase: (k) => { setBaseKey(k); setToast('已切换视觉方向', 'check'); },
      setAccent: (k) => { setAccentKey(k); setToast('已更新主题色', 'check'); },
      setAi: (v) => { setAiEngine(v); setToast(v ? '已启用 AI 解析' : '已切回规则解析', 'sparkle'); },
      setNotify: (v) => { setNotify(v); setToast(v ? '已开启到点提醒' : '已关闭提醒', 'bell'); },
      toggleDone: (id, source) => {
        const cur = (events[selDay] || []).find((e) => e.id === id);
        const willDone = cur && cur.status !== 'done';
        mutate(selDay, (arr) => arr.map((e) => e.id === id ? { ...e, status: e.status === 'done' ? 'todo' : 'done' } : e));
        if (!willDone || !cur) return;
        awardXp(XP.done);
        // 一键即时完成：永远只做非阻塞的内联微迸发，不弹满屏浮层（不再让"完成"变成一步）。
        // 满屏庆祝仅保留给真正的里程碑——长期目标全部完成（advanceProgress）与升级（独立 Modal）。
        setBurst({ id, key: Date.now() });
        clearTimeout(burstTimer.current);
        burstTimer.current = setTimeout(() => setBurst(null), 700);
      },
      advanceProgress: (id) => {
        const ev = (events[selDay] || []).find((e) => e.id === id); if (!ev || !ev.progress) return;
        const nd = Math.min(ev.progress.total, ev.progress.done + 1);
        const full = nd >= ev.progress.total;
        mutate(selDay, (arr) => arr.map((e) => e.id === id ? { ...e, progress: { ...e.progress, done: nd }, status: full ? 'done' : e.status } : e));
        setDetail((d) => d && d.id === id ? { ...d, progress: { ...d.progress, done: nd }, status: full ? 'done' : d.status } : d);
        if (full) { awardXp(XP.done); fireCelebrate({ ...ev, goalDone: true }); }
        else flashCelebrate({ msg: '又推进一步 · 做了就好', streak: 0, goal: false });
      },
      postpone: (id) => {
        const order = window.VL.data.week.map((w) => w.key); const idx = order.indexOf(selDay); const nextKey = order[Math.min(order.length - 1, idx + 1)];
        const ev = (events[selDay] || []).find((e) => e.id === id); if (!ev) return;
        mutate(selDay, (arr) => arr.filter((e) => e.id !== id));
        setEvents((prev) => ({ ...prev, [nextKey]: [...(prev[nextKey] || []).map((e) => ({ ...e })), { ...ev }] }));
        setDetail(null);
        setToast('已顺延到下一天 · 开始了就好', 'redo');
      },
      rolloverUnfinished: () => {
        const toKey = window.VL.todayKey();
        const fromKey = window.VL.prevKey(toKey);
        if (!fromKey) return;
        const items = (events[fromKey] || []).filter((e) => e.status === 'todo');
        if (!items.length) return;
        setEvents((prev) => {
          const next = { ...prev };
          next[fromKey] = (prev[fromKey] || []).filter((e) => e.status !== 'todo').map((e) => ({ ...e }));
          next[toKey] = [...(prev[toKey] || []).map((e) => ({ ...e })), ...items.map((e) => ({ ...e }))];
          return next;
        });
        setSelDay(toKey);
        setToast(`已把 ${items.length} 件挪到今天 · 开始了就好`, 'redo');
      },
      toggleImportant: (id) => { mutate(selDay, (arr) => arr.map((e) => e.id === id ? { ...e, important: !e.important } : e)); setDetail((d) => d && d.id === id ? { ...d, important: !d.important } : d); },
      toggleUrgent: (id) => { mutate(selDay, (arr) => arr.map((e) => e.id === id ? { ...e, urgent: !e.urgent } : e)); setDetail((d) => d && d.id === id ? { ...d, urgent: !d.urgent } : d); },
      showMatrix: () => setMatrixOpen(true),
      saveEvent: (id, patch) => { mutate(selDay, (arr) => arr.map((e) => e.id === id ? { ...e, ...patch } : e)); setToast('已更新日程', 'check'); },
      cancelEvent: (id) => mutate(selDay, (arr) => arr.map((e) => e.id === id ? { ...e, status: 'cancelled' } : e)),
      deleteEvent: (id) => {
        const ev = (events[selDay] || []).find((e) => e.id === id); const day = selDay;
        mutate(selDay, (arr) => arr.filter((e) => e.id !== id));
        if (ev) {
          setTrash((tr) => [{ ev, day, ts: Date.now() }, ...tr]);
          setToast('已删除', 'trash', { label: '撤销', fn: () => { setEvents((prev) => ({ ...prev, [day]: [...(prev[day] || []).map((e) => ({ ...e })), ev] })); setTrash((tr) => tr.filter((x) => x.ev.id !== ev.id)); setToast('已恢复', 'check'); } });
        }
      },
      restoreEvent: (item) => { setEvents((prev) => ({ ...prev, [item.day]: [...(prev[item.day] || []).map((e) => ({ ...e })), item.ev] })); setTrash((tr) => tr.filter((x) => x.ev.id !== item.ev.id)); setToast('已恢复到日历', 'check'); },
      purgeTrash: () => { setTrash([]); setToast('回收站已清空', 'trash'); },
      openTrash: () => setTrashOpen(true),
      trash,
      quickAdd: (text) => {
        const acts = window.VL.parseBatch(text);
        if (acts.length > 1) { setBatch(acts); setBatchSel(acts.map(() => true)); return; }
        const d = window.VL.parse(text); if (d.repeat && d.repeat.dows && d.repeat.dows.length) { app.addRepeating(d); return; }
        addEvent(d); const conf = window.VL.overlaps(events[d.dateKey] || [], { id: '__n', t: d.time, dur: d.dur }); setToast(conf.length ? `已加入 · 与「${conf[0].title}」重叠` : `已加入「${d.dateText.split(' · ')[0]}」`, conf.length ? 'bolt' : 'check');
      },
      openBatch: (acts) => { setBatch(acts); setBatchSel(acts.map(() => true)); },
      addRepeating: (d) => {
        const dk = window.VL.data.dowToKey;
        setEvents((prev) => {
          const next = { ...prev };
          d.repeat.dows.forEach((dw, i) => {
            const key = dk[dw]; if (!key) return;
            const ev = { id: 'r' + Date.now() + i + Math.random().toString(36).slice(2, 4), t: d.time, dur: d.dur || 60, title: d.title, cat: d.cat, loc: d.loc || null, reminder: d.reminder || 0, status: 'todo', repeat: { freq: d.repeat.freq, dow: dw, until: d.repeat.until, untilText: d.repeat.untilText } };
            next[key] = [...(next[key] || []).map((e) => ({ ...e })), ev];
          });
          return next;
        });
        setSelDay(dk[d.repeat.dows[0]] || '06-16'); setTab('cal');
        const n = d.repeat.dows.length;
        awardXp(XP.create * n);
        setToast(d.repeat.until ? `已加入每周 ${n} 项 · 重复至 ${d.repeat.untilText}` : `已加入每周 ${n} 项 · 范围待补充`, 'repeat');
      },
      addExtracted: (list) => { setEvents((prev) => { const next = { ...prev }; list.forEach((p) => { const ev = { id: 'u' + Date.now() + Math.random().toString(36).slice(2, 5), t: p.time, dur: p.dur || 60, title: p.title, cat: p.cat, loc: p.loc, reminder: p.reminder || 0, status: 'todo' }; next[p.dateKey] = [...(next[p.dateKey] || []).map((e) => ({ ...e })), ev]; }); return next; }); awardXp(XP.create * list.length); setToast(`已加入 ${list.length} 个日程`, 'check'); },
      applyBatch: (sel) => {
        const created = sel.filter((a) => a.kind !== 'complete').length;
        const completed = sel.filter((a) => a.kind === 'complete').length;
        setEvents((prev) => window.VL.applyBatchTo(prev, sel).next);
        if (created) awardXp(XP.create * created);
        if (completed) awardXp(XP.done * completed);
        setSelDay(window.VL.todayKey()); setTab('cal');
        setToast(`已新增 ${created} 条 · 完成 ${completed} 条`, 'check');
      },
      addCourses: (list, repeat) => {
        const dk = window.VL.data.dowToKey;
        setEvents((prev) => {
          const next = { ...prev };
          list.forEach((c, i) => {
            const key = dk[c.dow]; if (!key) return;
            const ev = { id: 'c' + Date.now() + i + Math.random().toString(36).slice(2, 4), t: c.time, dur: c.dur || 100, title: c.title, cat: 'learn', loc: c.loc || null, reminder: 0, status: 'todo', note: c.teacher ? `任课老师：${c.teacher}` : undefined, repeat: { freq: 'weekly', dow: c.dow, until: repeat.until, untilText: repeat.untilText } };
            next[key] = [...(next[key] || []).map((e) => ({ ...e })), ev];
          });
          return next;
        });
        setSelDay('06-16'); setTab('cal');
        awardXp(XP.create * list.length);
        setToast(repeat.until ? `已加入 ${list.length} 节课 · 每周重复至 ${repeat.untilText}` : `已加入 ${list.length} 节课 · 重复范围待补充`, 'check');
      },
      setCourseRange: (until, untilText) => {
        setEvents((prev) => { const next = {}; Object.keys(prev).forEach((k) => { next[k] = prev[k].map((e) => (e.repeat && !e.repeat.until) ? { ...e, repeat: { ...e.repeat, until, untilText } } : e); }); return next; });
        setToast(`已设置课表重复至 ${untilText}`, 'repeat');
      },
    };
    const onConfirmVoice = (p) => { if (p.repeat && p.repeat.dows && p.repeat.dows.length) { app.addRepeating(p); setVoiceOpen(false); setTab('cal'); return; } addEvent(p); setVoiceOpen(false); setTab('cal'); setToast(`已加入「${p.dateText.split(' · ')[0]}」`, 'check'); };

    return (
      <div style={{ position: 'absolute', inset: 0, background: t.bg, color: t.text, fontFamily: t.font, display: 'flex', overflow: 'hidden', WebkitFontSmoothing: 'antialiased' }}>
        <Sidebar t={t} tab={tab} setTab={(k) => (k === 'growth' ? app.goGrowth() : setTab(k))} onVoice={() => setVoiceOpen(true)} aiEngine={aiEngine} level={app.level} xp={xp} onGrowth={app.goGrowth} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex' }}>
          {tab === 'cal' && (isEmpty ? <window.WebWelcome t={t} app={app} /> : <CalView t={t} app={app} />)}
          {tab === 'review' && <ReviewView t={t} app={app} />}
          {tab === 'growth' && <window.WebGrowth t={t} app={app} />}
          {tab === 'export' && <ExportView t={t} app={app} />}
          {tab === 'me' && <SettingsView t={t} app={app} baseKey={baseKey} />}
        </div>
        <DetailModal t={t} app={app} />
        <EditModal t={t} app={app} />
        <window.WebVoiceModal t={t} open={voiceOpen} onClose={() => setVoiceOpen(false)} onConfirm={onConfirmVoice} onExtracted={app.addExtracted} onCourses={app.addCourses} onBatch={(acts) => { setVoiceOpen(false); app.openBatch(acts); }} aiEngine={aiEngine} dayEventsFor={(k) => events[k] || []} onInfo={app.showMultitask} />
        <RecurrenceModal t={t} open={recurOpen} onClose={() => setRecurOpen(false)} count={pendingCount} onConfirm={(u, ut) => { app.setCourseRange(u, ut); setRecurOpen(false); }} />
        <Modal t={t} open={mtOpen} onClose={() => setMtOpen(false)} width={420}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}><div style={{ width: 40, height: 40, borderRadius: 12, background: 'color-mix(in oklch, oklch(0.72 0.15 70) 16%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="bolt" size={20} color={'oklch(0.6 0.15 60)'} /></div><h3 style={{ margin: 0, fontSize: 19, fontWeight: 720, color: t.text }}>关于一心多用</h3></div>
          <p style={{ margin: '0 0 12px', fontSize: 14.5, lineHeight: 1.65, color: t.text }}>{window.VL.MULTITASK_NOTE}</p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: t.muted }}>VoiceLog 不会阻止你叠加日程——你最了解自己的节奏。它只是温和提个醒。</p>
          <div style={{ marginTop: 16 }}><Btn t={t} kind="primary" full onClick={() => setMtOpen(false)}>知道了</Btn></div>
        </Modal>
        <Modal t={t} open={matrixOpen} onClose={() => setMatrixOpen(false)} width={440}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}><div style={{ width: 40, height: 40, borderRadius: 12, background: t.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="grid4" size={20} color={t.accentText} /></div><h3 style={{ margin: 0, fontSize: 19, fontWeight: 720, color: t.text }}>重要 × 紧急 四象限</h3></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {window.VL.QUAD_ORDER.map((k) => { const q = window.VL.QUADRANTS[k]; return (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: t.radius - 2, background: t.surface2 }}>
                <span style={{ width: 9, height: 9, borderRadius: 999, background: q.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13.5, color: t.text, fontWeight: 600, width: 100, flexShrink: 0 }}>{q.label}</span>
                <span style={{ fontSize: 13.5, color: q.color, fontWeight: 650 }}>{q.advice}</span>
              </div>
            ); })}
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: t.muted }}>{window.VL.MATRIX_NOTE}</p>
          <div style={{ marginTop: 16 }}><Btn t={t} kind="primary" full onClick={() => setMatrixOpen(false)}>知道了</Btn></div>
        </Modal>
        <Toast t={t} toast={toast} />
        <window.WebCelebrate t={t} data={celebrate} />
        <Modal t={t} open={!!batch} onClose={() => setBatch(null)} width={480}>
          {batch && (() => {
            const k = batchSel.filter(Boolean).length;
            return (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: t.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="sparkle" size={20} color={t.accentText} /></div>
                  <h3 style={{ margin: 0, fontSize: 19, fontWeight: 720, color: t.text }}>待执行清单 · 找到 {batch.length} 条</h3>
                </div>
                <p style={{ margin: '0 0 14px', fontSize: 13, lineHeight: 1.6, color: t.muted }}>从一段话里识别出多条意图，核对后一起执行。</p>
                <window.BatchReviewList t={t} actions={batch} sel={batchSel} onToggle={(i) => setBatchSel((s) => s.map((v, j) => (j === i ? !v : v)))} />
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <Btn t={t} kind="ghost" onClick={() => setBatch(null)} style={{ flex: 1 }}>取消</Btn>
                  <Btn t={t} kind="primary" icon="check" onClick={() => { const sel = batch.filter((_, i) => batchSel[i]); if (sel.length) app.applyBatch(sel); setBatch(null); }} style={{ flex: 2, opacity: k ? 1 : 0.5, pointerEvents: k ? 'auto' : 'none' }}>确认执行（{k}）</Btn>
                </div>
              </div>
            );
          })()}
        </Modal>
        <Modal t={t} open={!!levelUp} onClose={() => setLevelUp(null)} width={360}>
          {levelUp && (
            <div style={{ textAlign: 'center', padding: '6px 4px' }}>
              <div style={{ width: 84, height: 84, margin: '0 auto 16px', borderRadius: 999, background: t.mode === 'dark' ? '#0c1e1a' : t.surface, border: `2px solid ${GOLD}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 36, fontWeight: 720, color: GOLD }}>{levelUp.lv}</span></div>
              <div style={{ fontSize: 12, color: GOLD, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 650 }}>Level Up</div>
              <div style={{ fontSize: 22, fontWeight: 720, color: t.text, margin: '6px 0 18px' }}>LV.{levelUp.lv} {levelUp.name}</div>
              <Btn t={t} kind="primary" full onClick={() => setLevelUp(null)}>继续前行</Btn>
            </div>
          )}
        </Modal>
        <Modal t={t} open={trashOpen} onClose={() => setTrashOpen(false)} width={440}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: t.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="trash" size={19} color={t.muted} /></div>
            <h3 style={{ margin: 0, fontSize: 19, fontWeight: 720, color: t.text }}>回收站</h3>
          </div>
          <p style={{ margin: '0 0 14px', fontSize: 13, lineHeight: 1.55, color: t.muted }}>随时可以找回。</p>
          {trash.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {trash.map((it) => { const wk = window.VL.data.week.find((x) => x.key === it.day); return (
                <div key={it.ev.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 11, borderRadius: t.radius - 2, border: `1px solid ${t.border}`, background: t.bg }}>
                  <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 999, background: catColor(t, it.ev.cat) }} />
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 600, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.ev.title}</div><div style={{ fontSize: 12, color: t.faint, marginTop: 2 }}>{wk ? `周${wk.dow} · 6月${wk.day}日` : it.day} · {it.ev.t}</div></div>
                  <button onClick={() => app.restoreEvent(it)} style={{ flexShrink: 0, height: 32, padding: '0 13px', borderRadius: 999, border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 13, fontWeight: 650, background: t.accentSoft, color: t.accentText }}>恢复</button>
                </div>
              ); })}
            </div>
          ) : <div style={{ textAlign: 'center', padding: '26px 0', color: t.faint, fontSize: 13.5 }}>回收站是空的</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn t={t} kind="ghost" onClick={() => setTrashOpen(false)} style={{ flex: 1 }}>关闭</Btn>
            {trash.length > 0 && <Btn t={t} kind="ghost" icon="trash" onClick={app.purgeTrash} style={{ flexShrink: 0, color: 'oklch(0.62 0.19 25)' }}>清空</Btn>}
          </div>
        </Modal>
      </div>
    );
  }

  window.VoiceLogWeb = VoiceLogWeb;
})();
