/* VoiceLog · 复盘 */
(function () {
  const { useState, useEffect } = React;
  const { Icon, Card, Btn, Segmented, Ring, StackBar, AllocRow, Dot, SectionLabel, catColor, catLabel, fmtH } = window;

  // 「我的复盘」——个性化、可编辑的心声，与 AI 数据复盘并列。打字或点「说一段」语音记。
  function ReflectBlock({ t, app }) {
    const today = window.VL.todayKey();
    const cur = (app.reflections && app.reflections[today]) || null;
    const [text, setText] = useState(cur ? cur.text : '');
    useEffect(() => { setText(cur ? cur.text : ''); }, [cur ? cur.text : '']);
    const save = () => { const v = (text || '').trim(); if (v !== (cur ? cur.text : '')) app.saveReflection(today, v); };
    return (
      <React.Fragment>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '6px 2px 8px' }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: t.faint, letterSpacing: 0.3 }}>我的复盘 · 你想说的</span>
          <button onClick={app.openReflect} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 28, padding: '0 11px', borderRadius: 999, border: `1px solid ${t.border}`, background: t.surface, cursor: 'pointer', font: 'inherit', fontSize: 12.5, fontWeight: 600, color: t.accentText }}><Icon name="mic" size={14} color={t.accentText} />说一段</button>
        </div>
        <Card t={t} style={{ marginBottom: 14 }}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} onBlur={save} rows={3} placeholder="今天过得怎么样？随便写写，或点「说一段」用语音记。" style={{ width: '100%', resize: 'none', border: 'none', outline: 'none', background: 'transparent', color: t.text, font: 'inherit', fontSize: 14.5, lineHeight: 1.6 }} />
          {cur && <div style={{ fontSize: 11.5, color: t.faint, marginTop: 6 }}>记于 {new Date(cur.ts).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>}
        </Card>
      </React.Fragment>
    );
  }

  // 复盘正文（可复用，嵌进合并后的「成长」页）：周期选择 + 数据 + 我的复盘 + 导出
  function ReviewBody({ t, app }) {
    const [period, setPeriod] = useState('day');
    const r = window.VL.getReview(period, app.events);
    const max = Math.max(1, ...r.alloc.map((a) => a.hours));
    const dayList = (app.events[window.VL.todayKey()] || []).slice().sort((a, b) => window.VL.sortMin(a) - window.VL.sortMin(b) || a.t.localeCompare(b.t));

    return (
      <React.Fragment>
        <div style={{ marginBottom: 14 }}>
          <Segmented t={t} value={period} onChange={setPeriod} items={window.VL.periods} />
        </div>
        <Card t={t} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, color: t.muted, fontWeight: 600 }}>{r.label} · {r.range}</div>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 38, fontWeight: 780, color: t.text, letterSpacing: -1, lineHeight: 1 }}>{fmtH(r.total)}</span>
                  <span style={{ fontSize: 15, color: t.muted, fontWeight: 600 }}>小时</span>
                </div>
                <div style={{ fontSize: 13, color: t.faint, marginTop: 6 }}>共 {r.count} 项日程</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <Ring t={t} value={r.rate} size={88} />
                <span style={{ fontSize: 12, color: t.faint }}>完成率</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              {[['完成', r.done], ['取消', r.cancelled], ['待办', r.todo]].map(([k, v]) => (
                <div key={k} style={{ flex: 1, padding: '9px 0', borderRadius: t.radius - 4, background: t.surface2, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 720, color: t.text }}>{v}</div>
                  <div style={{ fontSize: 11.5, color: t.faint, marginTop: 1 }}>{k}</div>
                </div>
              ))}
            </div>
          </Card>

          {period === 'day' && <ReflectBlock t={t} app={app} />}

          <SectionLabel t={t}>时间去向</SectionLabel>
          {r.alloc.length > 0 ? (
            <Card t={t} style={{ marginBottom: 14 }}>
              <StackBar t={t} alloc={r.alloc} total={r.total} h={16} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
                {r.alloc.map((a) => <AllocRow key={a.cat} t={t} a={a} total={r.total} max={max} />)}
              </div>
            </Card>
          ) : (
            <Card t={t} style={{ marginBottom: 14, textAlign: 'center', color: t.faint, fontSize: 13.5, padding: 24 }}>这个周期还没有日程</Card>
          )}

          <SectionLabel t={t}>洞察与建议</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {r.insights.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 11, padding: 14, borderRadius: t.radius, background: i === 0 ? t.accentSoft : t.surface, border: `1px solid ${i === 0 ? 'transparent' : t.border}`, boxShadow: i === 0 ? 'none' : t.shadow }}>
                <div style={{ flexShrink: 0, marginTop: 1 }}><Icon name={i === 0 ? 'sparkle' : 'bolt'} size={17} color={i === 0 ? t.accentText : t.muted} /></div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: i === 0 ? t.accentText : t.text, fontWeight: i === 0 ? 550 : 400 }}>{s}</p>
              </div>
            ))}
          </div>

          {period === 'day' && dayList.length > 0 && (
            <React.Fragment>
              <SectionLabel t={t}>日程明细</SectionLabel>
              <Card t={t} pad={0} style={{ marginBottom: 16, overflow: 'hidden' }}>
                {dayList.map((ev, i, arr) => (
                  <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px', borderBottom: i < arr.length - 1 ? `1px solid ${t.border}` : 'none', opacity: ev.status === 'cancelled' ? 0.55 : 1 }}>
                    <Dot color={catColor(t, ev.cat)} />
                    <span style={{ fontSize: 13.5, color: t.muted, fontVariantNumeric: 'tabular-nums', minWidth: 42 }}>{window.VL.timeLabel(ev) || '随手'}</span>
                    <span style={{ flex: 1, fontSize: 14.5, color: t.text, fontWeight: 550, textDecoration: ev.status !== 'todo' ? 'line-through' : 'none', opacity: ev.status === 'done' ? 0.6 : 1 }}>{ev.title}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, padding: '3px 8px', borderRadius: 999, color: ev.status === 'done' ? 'oklch(0.6 0.13 150)' : t.faint, background: ev.status === 'done' ? 'color-mix(in oklch, oklch(0.6 0.13 150) 14%, transparent)' : t.surface2 }}>{ev.status === 'done' ? '完成' : ev.status === 'cancelled' ? '取消' : '待办'}</span>
                  </div>
                ))}
              </Card>
            </React.Fragment>
          )}

          <Btn t={t} kind="outline" full icon="export" onClick={() => app.goExport(period)}>导出这份复盘</Btn>
      </React.Fragment>
    );
  }

  // 独立「复盘」页（保留，便于复用/回退）；合并后默认入口在「成长」页里
  function ReviewScreen({ t, app }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '54px 20px 10px', flexShrink: 0 }}>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 760, color: t.text, letterSpacing: -0.6 }}>复盘</h1>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 24px' }}>
          <ReviewBody t={t} app={app} />
        </div>
      </div>
    );
  }

  window.ReviewScreen = ReviewScreen;
  window.ReviewBody = ReviewBody;
})();
