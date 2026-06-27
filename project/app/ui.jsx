/* VoiceLog · 共享 UI 基元（均接收主题 t） */
(function () {
  const { Icon } = window;

  const catColor = (t, key) => (t.cat[key] || t.cat.misc).color;
  const catLabel = (t, key) => (t.cat[key] || t.cat.misc).label;
  const fmtH = (h) => (Number.isInteger(h) ? h + '' : h.toFixed(1));

  function Card({ t, children, style, onClick, pad }) {
    return (
      <div onClick={onClick} style={{
        background: t.surface, borderRadius: t.radius,
        border: `1px solid ${t.border}`, boxShadow: t.shadow,
        padding: pad === undefined ? t.cardPad : pad,
        cursor: onClick ? 'pointer' : 'default', ...style,
      }}>{children}</div>
    );
  }

  function Btn({ t, children, kind = 'primary', onClick, full, icon, size = 'md', style }) {
    const h = size === 'lg' ? 52 : size === 'sm' ? 36 : 46;
    const map = {
      primary: { background: t.accent, color: t.onAccent, border: '1px solid transparent', boxShadow: t.shadow },
      soft: { background: t.accentSoft, color: t.accentText, border: '1px solid transparent' },
      ghost: { background: t.surface2, color: t.text, border: '1px solid transparent' },
      outline: { background: 'transparent', color: t.text, border: `1px solid ${t.borderStrong}` },
    };
    return (
      <button onClick={onClick} style={{
        height: h, width: full ? '100%' : undefined, padding: `0 ${size === 'sm' ? 14 : 20}px`,
        borderRadius: size === 'sm' ? t.radius - 4 : t.radius - 2,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        font: 'inherit', fontSize: size === 'lg' ? 17 : 15, fontWeight: 600, cursor: 'pointer',
        letterSpacing: 0.2, transition: 'transform .12s, filter .15s', ...map[kind], ...style,
      }}
        onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
        onPointerUp={(e) => (e.currentTarget.style.transform = '')}
        onPointerLeave={(e) => (e.currentTarget.style.transform = '')}>
        {icon && <Icon name={icon} size={size === 'lg' ? 20 : 18} sw={2} />}
        {children}
      </button>
    );
  }

  function Segmented({ t, items, value, onChange, size = 'md' }) {
    const h = size === 'sm' ? 32 : 38;
    return (
      <div style={{
        display: 'flex', background: t.surface2, borderRadius: 999,
        padding: 3, gap: 2, border: `1px solid ${t.border}`,
      }}>
        {items.map((it) => {
          const on = it.key === value;
          return (
            <button key={it.key} onClick={() => onChange(it.key)} style={{
              flex: 1, height: h, border: 'none', cursor: 'pointer', font: 'inherit',
              fontSize: size === 'sm' ? 13 : 14, fontWeight: on ? 650 : 500,
              borderRadius: 999, transition: 'all .18s',
              color: on ? t.text : t.muted,
              background: on ? t.raised : 'transparent',
              boxShadow: on ? t.shadow : 'none',
            }}>{it.label}</button>
          );
        })}
      </div>
    );
  }

  function Chip({ t, children, icon, color, soft }) {
    const c = color || t.muted;
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        height: 24, padding: '0 9px', borderRadius: 999, fontSize: 12.5, fontWeight: 550,
        color: c, background: soft ? (color ? color : t.surface2) : t.surface2,
        ...(soft && color ? { background: 'color-mix(in oklch, ' + color + ' 15%, transparent)' } : {}),
      }}>
        {icon && <Icon name={icon} size={13} color={c} sw={2.1} />}
        {children}
      </span>
    );
  }

  function Dot({ color, size = 8, ring }) {
    return <span style={{
      width: size, height: size, borderRadius: 999, background: color, flexShrink: 0,
      boxShadow: ring ? `0 0 0 3px color-mix(in oklch, ${color} 22%, transparent)` : 'none',
    }} />;
  }

  // 完成率圆环
  function Ring({ t, value, size = 92, stroke = 9, color }) {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const col = color || t.accent;
    return (
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={t.chartTrack} strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={stroke}
            strokeLinecap="round" strokeDasharray={c}
            strokeDashoffset={c - (c * value) / 100}
            style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.2,.7,.3,1)' }} />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: size * 0.27, fontWeight: 720, color: t.text, letterSpacing: -0.5 }}>{value}%</span>
        </div>
      </div>
    );
  }

  // 时间去向：单条堆叠条
  function StackBar({ t, alloc, total, h = 14, anim = true }) {
    return (
      <div style={{ display: 'flex', height: h, borderRadius: 999, overflow: 'hidden', background: t.chartTrack }}>
        {alloc.map((a, i) => (
          <div key={a.cat} style={{
            width: `${(a.hours / total) * 100}%`, background: catColor(t, a.cat),
            transition: anim ? `width .8s cubic-bezier(.2,.7,.3,1) ${i * 0.06}s` : 'none',
          }} />
        ))}
      </div>
    );
  }

  // 类别明细行（条形 + 标签 + 小时）
  function AllocRow({ t, a, total, max, anim = true }) {
    const pct = Math.round((a.hours / total) * 100);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 92, flexShrink: 0 }}>
          <Dot color={catColor(t, a.cat)} />
          <span style={{ fontSize: 14, color: t.text, fontWeight: 550 }}>{catLabel(t, a.cat)}</span>
        </div>
        <div style={{ flex: 1, height: 8, borderRadius: 999, background: t.chartTrack, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${(a.hours / max) * 100}%`, background: catColor(t, a.cat),
            borderRadius: 999, transition: anim ? 'width .8s cubic-bezier(.2,.7,.3,1)' : 'none',
          }} />
        </div>
        <div style={{ width: 72, textAlign: 'right', flexShrink: 0 }}>
          <span style={{ fontSize: 13.5, color: t.text, fontWeight: 600 }}>{fmtH(a.hours)}h</span>
          <span style={{ fontSize: 12.5, color: t.faint, marginLeft: 5 }}>{pct}%</span>
        </div>
      </div>
    );
  }

  // 底部弹层
  function Sheet({ t, open, onClose, children, maxH = '88%', pad = 20 }) {
    return (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 40, pointerEvents: open ? 'auto' : 'none',
      }}>
        <div onClick={onClose} style={{
          position: 'absolute', inset: 0, background: 'rgba(8,10,14,0.4)',
          opacity: open ? 1 : 0, transition: 'opacity .3s', backdropFilter: open ? 'blur(2px)' : 'none',
        }} />
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: maxH,
          background: t.surface, borderTopLeftRadius: t.radius + 12, borderTopRightRadius: t.radius + 12,
          boxShadow: t.shadowLg, padding: `10px ${pad}px calc(${pad}px + 22px)`,
          transform: open ? 'translateY(0)' : 'translateY(101%)',
          transition: 'transform .36s cubic-bezier(.32,.72,0,1)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ width: 38, height: 5, borderRadius: 999, background: t.borderStrong, margin: '0 auto 10px' }} />
          <div style={{ overflowY: 'auto', overflowX: 'hidden' }}>{children}</div>
        </div>
      </div>
    );
  }

  // 多段甜甜圈（类别占比）
  function Donut({ t, alloc, total, size = 184, stroke = 26, centerTop, centerSub }) {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const gap = alloc.length > 1 ? 3 : 0; // 段间留白(px)
    let offset = 0;
    return (
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={t.chartTrack} strokeWidth={stroke} />
          {total > 0 && alloc.map((a) => {
            const len = Math.max(0, (a.hours / total) * c - gap);
            const seg = (
              <circle key={a.cat} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={catColor(t, a.cat)} strokeWidth={stroke}
                strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} strokeLinecap="butt"
                style={{ transition: 'stroke-dasharray .8s cubic-bezier(.2,.7,.3,1), stroke-dashoffset .8s cubic-bezier(.2,.7,.3,1)' }} />
            );
            offset += (a.hours / total) * c;
            return seg;
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: size * 0.2, fontWeight: 760, color: t.text, letterSpacing: -1, lineHeight: 1 }}>{centerTop}</span>
          {centerSub && <span style={{ fontSize: 12.5, color: t.faint, marginTop: 5 }}>{centerSub}</span>}
        </div>
      </div>
    );
  }

  // 现在 / 接下来 聚焦卡（仅"今天"显示；借 Focuster 的 Now/Next，温和聚焦当前该做的事）
  function FocusCard({ t, events, dayKey, onOpen, style }) {
    const week = (window.VL.data && window.VL.data.week) || [];
    const w = week.find((x) => x.key === dayKey);
    if (!w || !w.today) return null;
    const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
    const live = (events || []).filter((e) => e.status !== 'cancelled').slice().sort((a, b) => a.t.localeCompare(b.t));
    if (!live.length) return null;
    const now = new Date(); const nm = now.getHours() * 60 + now.getMinutes();
    let current = null;
    for (const e of live) { const s = toMin(e.t), en = s + (e.dur || 60); if (e.status !== 'done' && s <= nm && nm < en) { current = e; break; } }
    const next = live.find((e) => e.status !== 'done' && toMin(e.t) > nm) || null;
    const rel = (e) => { const d = toMin(e.t) - nm; if (d <= 0) return '即将开始'; if (d < 60) return d + ' 分钟后'; const h = Math.floor(d / 60), m = d % 60; return h + ' 小时' + (m ? ` ${m} 分` : '') + '后'; };
    const remain = (e) => { const left = toMin(e.t) + (e.dur || 60) - nm; return left > 0 ? `还剩 ${left} 分钟` : '进行中'; };

    if (!current && !next) {
      return (
        <div style={{ padding: '13px 16px', borderRadius: t.radius, background: t.accentSoft, ...style }}>
          <div style={{ fontSize: 13.5, fontWeight: 650, color: t.accentText }}>今天的安排都过完啦 ✓</div>
          <div style={{ fontSize: 12.5, color: t.accentText, opacity: 0.8, marginTop: 2 }}>给自己留点喘息时间。</div>
        </div>
      );
    }
    const line = (label, ev, isNow) => (
      <button onClick={() => onOpen && onOpen(ev)} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left', font: 'inherit', cursor: 'pointer', border: 'none', background: 'transparent', padding: '4px 0' }}>
        <span style={{ width: 4, alignSelf: 'stretch', minHeight: 30, borderRadius: 999, background: catColor(t, ev.cat), flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: isNow ? t.accentText : t.faint, textTransform: 'uppercase' }}>{label}</span>
            {isNow && <span style={{ width: 6, height: 6, borderRadius: 999, background: 'oklch(0.62 0.2 25)', boxShadow: '0 0 0 3px color-mix(in oklch, oklch(0.62 0.2 25) 25%, transparent)' }} />}
            <span style={{ fontSize: 12.5, color: t.faint, fontVariantNumeric: 'tabular-nums' }}>{window.VL.fmtRange(ev.t, ev.dur)} · {isNow ? remain(ev) : rel(ev)}</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 650, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>{ev.important ? '★ ' : ''}{ev.title}{ev.loc ? <span style={{ fontSize: 12.5, fontWeight: 500, color: t.muted }}> · {ev.loc}</span> : null}</div>
        </div>
        <Icon name="chevR" size={16} color={t.faint} />
      </button>
    );
    return (
      <div style={{ padding: '10px 16px', borderRadius: t.radius, background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow, display: 'flex', flexDirection: 'column', gap: 4, ...style }}>
        {current && line('现在', current, true)}
        {current && next && <div style={{ height: 1, background: t.border, margin: '2px 0' }} />}
        {next && line('接下来', next, false)}
      </div>
    );
  }

  // 每日容量提醒：温和、可关、非模态（借 Sunsama；遵守"复盘是主场、说教是禁区"）
  function CapacityBanner({ t, hours, cap, onDismiss, style }) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 14px', borderRadius: t.radius, background: 'color-mix(in oklch, oklch(0.72 0.15 70) 12%, transparent)', border: `1px solid color-mix(in oklch, oklch(0.72 0.15 70) 30%, transparent)`, ...style }}>
        <Icon name="clock" size={16} color={'oklch(0.6 0.13 65)'} style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 650, color: t.text }}>这天已排 {fmtH(hours)} 小时</div>
          <div style={{ fontSize: 12.5, color: t.muted, marginTop: 2, lineHeight: 1.5 }}>超出你的容量（约 {cap} 小时）。排得太满容易把整块时间切碎——要不要把不紧要的挪到别天？你最懂自己的节奏。</div>
        </div>
        {onDismiss && <button onClick={onDismiss} title="知道了" style={{ width: 24, height: 24, flexShrink: 0, borderRadius: 999, border: 'none', cursor: 'pointer', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><Icon name="x" size={14} color={t.faint} /></button>}
      </div>
    );
  }

  // 未完成顺延提示：把没做完的温和地拉到今天（借 Sunsama；不羞辱，late better than never）
  // items: [{key, ev}]，含前几天累积的待办。点开可逐条勾选要挪哪些。
  function RolloverBanner({ t, items, onMove, onDismiss, onEdit, onDelete, style }) {
    const list = items || [];
    const [open, setOpen] = React.useState(false);
    const [sel, setSel] = React.useState(() => list.map(() => true));
    React.useEffect(() => { setSel(list.map(() => true)); }, [list.length]);
    const picks = list.filter((_, i) => sel[i]).map((p) => ({ key: p.key, id: p.ev.id }));
    const lbl = (k) => (window.VL.dateText ? window.VL.dateText(k) : k);
    const days = new Set(list.map((p) => p.key)).size;
    return (
      <div style={{ padding: '12px 14px', borderRadius: t.radius, background: t.accentSoft, ...style }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <Icon name="redo" size={16} color={t.accentText} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 650, color: t.accentText }}>有 {list.length} 件没做完{days > 1 ? `（跨 ${days} 天累积）` : ''}</div>
            <div style={{ fontSize: 12.5, color: t.accentText, opacity: 0.85, marginTop: 2, lineHeight: 1.5 }}>挪到今天继续吗？开始了就好，late better than never。</div>
            <button onClick={() => setOpen((v) => !v)} style={{ marginTop: 6, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', font: 'inherit', fontSize: 12.5, fontWeight: 650, color: t.accentText, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {open ? '收起' : '看看是哪几件'} <Icon name={open ? 'chevD' : 'chevR'} size={13} color={t.accentText} />
            </button>
          </div>
        </div>
        {open && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
            {list.map((p, i) => {
              const iconBtn = { width: 30, height: 30, flexShrink: 0, borderRadius: 999, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
              return (
              <div key={p.key + '·' + p.ev.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px 4px 10px', borderRadius: t.radius - 4, border: `1px solid ${sel[i] ? t.accent : t.border}`, background: t.surface }}>
                <button onClick={() => setSel((s) => s.map((v, j) => (j === i ? !v : v)))} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', border: 'none', background: 'transparent', cursor: 'pointer', font: 'inherit', textAlign: 'left' }}>
                  <span style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, border: sel[i] ? 'none' : `2px solid ${t.borderStrong}`, background: sel[i] ? t.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{sel[i] && <Icon name="check" size={13} color={t.onAccent} sw={2.6} />}</span>
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: catColor(t, p.ev.cat), flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.ev.title}</div>
                    <div style={{ fontSize: 11.5, color: t.faint, marginTop: 1 }}>{lbl(p.key)} · {window.VL.timeLabel ? (window.VL.timeLabel(p.ev) || '随手') : window.VL.fmtTime(p.ev.t)}</div>
                  </div>
                </button>
                {onEdit && <button onClick={() => onEdit(p)} title="编辑" style={iconBtn}><Icon name="pencil" size={15} color={t.muted} /></button>}
                {onDelete && <button onClick={() => onDelete(p)} title="删除" style={iconBtn}><Icon name="trash" size={15} color={t.muted} /></button>}
              </div>
              );
            })}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button onClick={() => picks.length && onMove(picks)} style={{ height: 30, padding: '0 14px', borderRadius: 999, border: 'none', cursor: picks.length ? 'pointer' : 'default', opacity: picks.length ? 1 : 0.45, font: 'inherit', fontSize: 12.5, fontWeight: 700, background: t.accent, color: t.onAccent }}>{open ? `挪到今天（${picks.length}）` : '全部挪到今天'}</button>
          <button onClick={onDismiss} style={{ height: 30, padding: '0 12px', borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 12.5, fontWeight: 600, border: 'none', background: 'transparent', color: t.accentText }}>先不用</button>
        </div>
      </div>
    );
  }

  // 待执行清单：批量语音/文字解析出的多条动作，用户逐条确认（可勾选）后再批量执行——永不静默执行
  function BatchReviewList({ t, actions, sel, onToggle, onEdit, style }) {
    const green = 'oklch(0.6 0.13 150)', amber = 'oklch(0.72 0.15 70)';
    const KIND = {
      create: { label: '新增', c: t.accentText, on: t.accent },
      complete: { label: '完成', c: green, on: green },
      reschedule: { label: '改期', c: 'oklch(0.55 0.15 60)', on: amber },
      cancel: { label: '取消', c: t.muted, on: t.muted },
    };
    const [editIdx, setEditIdx] = React.useState(-1);
    const isoOf = (key) => (key ? window.VL.todayDateObj().getFullYear() + '-' + key : '');
    const datePatch = (iso) => { if (!iso) return {}; const dt = new Date(iso + 'T00:00:00'); if (isNaN(dt.getTime())) return {}; const key = String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0'); return { dateKey: key, dateText: window.VL.dateText ? window.VL.dateText(key) : key }; };
    const inp = { font: 'inherit', fontSize: 14, fontWeight: 600, color: t.text, background: t.surface, border: `1px solid ${t.border}`, borderRadius: t.radius - 4, padding: '8px 10px', outline: 'none', colorScheme: t.mode === 'dark' ? 'dark' : 'light' };
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...style }}>
        {actions.map((a, i) => {
          const on = sel[i];
          const d = a.draft || {};
          const recorded = a.kind === 'create' && d.status === 'done'; // 补录
          const k = recorded ? { label: '已记录', c: green, on: green } : (KIND[a.kind] || KIND.create);
          const isEdit = a.kind === 'reschedule' || a.kind === 'cancel';
          const editing = editIdx === i;
          const dateShort = (d.dateText || '').split(' · ')[0];
          let detail;
          if (a.kind === 'reschedule') { const to = [dateShort, d.time ? window.VL.fmtTime(d.time) : ''].filter(Boolean).join(' '); detail = to ? '改到 ' + to : '换个时间'; }
          else if (a.kind === 'cancel') detail = '取消这条日程';
          else detail = `${dateShort} ${window.VL.fmtRange(d.time, d.dur)}`;
          return (
            <div key={i} style={{ borderRadius: t.radius, background: on ? t.surface : t.surface2, border: `1.5px solid ${on ? k.on : t.border}`, overflow: 'hidden' }}>
              <div onClick={() => onToggle(i)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 12, cursor: 'pointer' }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, border: on ? 'none' : `2px solid ${t.borderStrong}`, background: on ? k.on : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{on && <Icon name="check" size={14} color={t.onAccent} sw={2.6} />}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: k.c, background: `color-mix(in oklch, ${k.on} 16%, transparent)`, padding: '1px 7px', borderRadius: 999, flexShrink: 0 }}>{k.label}</span>
                    <span style={{ fontSize: 15, fontWeight: 650, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: a.kind === 'cancel' ? 'line-through' : 'none' }}>{d.title || a.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12.5, color: t.muted }}>{detail}</span>
                    {!isEdit && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: t.faint }}><Dot color={catColor(t, d.cat)} size={7} />{catLabel(t, d.cat)}</span>}
                    {!isEdit && d.loc && <span style={{ fontSize: 12.5, color: t.faint }}>· {d.loc}</span>}
                    {!isEdit && d.reminder ? <span style={{ fontSize: 12.5, color: t.faint }}>· 提前{d.reminder}分</span> : null}
                  </div>
                  {d.subtasks && d.subtasks.length > 0 && (
                    <div style={{ marginTop: 5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {d.subtasks.map((s, j) => <div key={j} style={{ fontSize: 12.5, color: t.faint }}>· {s}</div>)}
                    </div>
                  )}
                </div>
                {onEdit && !isEdit && <button onClick={(e) => { e.stopPropagation(); setEditIdx(editing ? -1 : i); }} style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 8, border: `1px solid ${t.border}`, background: editing ? t.accentSoft : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="pencil" size={15} color={editing ? t.accentText : t.muted} /></button>}
              </div>
              {editing && onEdit && (
                <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                  <input value={d.title || ''} onChange={(e) => onEdit(i, { title: e.target.value })} placeholder="标题" style={inp} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="date" value={isoOf(d.dateKey)} onChange={(e) => onEdit(i, datePatch(e.target.value))} style={{ ...inp, flex: 1 }} />
                    <input type="time" value={d.time || '09:00'} onChange={(e) => e.target.value && onEdit(i, { time: e.target.value })} style={{ ...inp, flex: 1 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['meet', 'deep', 'life', 'learn', 'misc'].map((c) => { const con = d.cat === c; return <button key={c} onClick={() => onEdit(i, { cat: c })} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 28, padding: '0 10px', borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 12.5, fontWeight: 600, border: `1px solid ${con ? 'transparent' : t.border}`, background: con ? `color-mix(in oklch, ${catColor(t, c)} 16%, transparent)` : 'transparent', color: con ? t.text : t.muted }}><Dot color={catColor(t, c)} size={7} />{catLabel(t, c)}</button>; })}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button onClick={() => onEdit(i, { status: d.status === 'done' ? 'todo' : 'done' })} style={{ height: 28, padding: '0 12px', borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 12.5, fontWeight: 600, border: `1px solid ${t.border}`, background: d.status === 'done' ? `color-mix(in oklch, ${green} 16%, transparent)` : 'transparent', color: d.status === 'done' ? green : t.muted }}>{d.status === 'done' ? '已记录·已完成' : '标为已记录'}</button>
                    <button onClick={() => setEditIdx(-1)} style={{ height: 28, padding: '0 16px', borderRadius: 999, border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 12.5, fontWeight: 700, background: t.accent, color: t.onAccent }}>完成</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // 象限小标签：显示某条日程落在哪个象限
  function QuadrantChip({ t, ev, style }) {
    const q = window.VL.quadrant(ev);
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 24, padding: '0 9px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, color: q.color, background: `color-mix(in oklch, ${q.color} 15%, transparent)`, ...style }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: q.color }} />{q.advice}
      </span>
    );
  }

  // 重要×紧急 四象限视图（艾森豪威尔矩阵）：2×2 网格，把当天事按象限摆开
  function MatrixView({ t, events, onOpen, onInfo, style }) {
    const Q = window.VL.QUADRANTS;
    const groups = { do: [], plan: [], delegate: [], reduce: [] };
    (events || []).filter((e) => e.status !== 'cancelled').forEach((e) => groups[window.VL.quadrant(e).key].push(e));
    Object.values(groups).forEach((a) => a.sort((x, y) => x.t.localeCompare(y.t)));
    const cell = (key) => {
      const q = Q[key]; const items = groups[key];
      return (
        <div style={{ flex: 1, minWidth: 0, background: t.surface, border: `1px solid ${t.border}`, borderTop: `3px solid ${q.color}`, borderRadius: t.radius - 2, padding: '10px 11px', display: 'flex', flexDirection: 'column', minHeight: 134, boxShadow: t.shadow }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: q.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: t.text, whiteSpace: 'nowrap' }}>{q.advice}</span>
              <span style={{ fontSize: 11, color: t.faint, marginLeft: 'auto' }}>{items.length}</span>
            </div>
            <div style={{ fontSize: 11, color: t.faint, marginTop: 2 }}>{q.label}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, overflowY: 'auto', flex: 1 }}>
            {items.length ? items.map((e) => (
              <button key={e.id} onClick={() => onOpen && onOpen(e)} style={{ display: 'flex', alignItems: 'center', gap: 6, textAlign: 'left', font: 'inherit', cursor: 'pointer', border: 'none', background: t.surface2, borderRadius: 8, padding: '6px 8px' }}>
                <span style={{ width: 3, alignSelf: 'stretch', borderRadius: 999, background: catColor(t, e.cat), flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 550, color: e.status === 'done' ? t.faint : t.text, textDecoration: e.status === 'done' ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</span>
                <span style={{ fontSize: 11, color: t.faint, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{window.VL.fmtTime(e.t)}</span>
              </button>
            )) : <div style={{ fontSize: 11.5, color: t.faint, padding: '10px 0', textAlign: 'center' }}>—</div>}
          </div>
        </div>
      );
    };
    return (
      <div style={{ ...style }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>{cell('do')}{cell('plan')}</div>
        <div style={{ display: 'flex', gap: 8 }}>{cell('delegate')}{cell('reduce')}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 }}>
          <span style={{ fontSize: 11.5, color: t.faint }}>← 越往左越紧急 · 越往上越重要</span>
          {onInfo && <button onClick={onInfo} style={{ border: 'none', background: 'transparent', cursor: 'pointer', font: 'inherit', fontSize: 11.5, fontWeight: 650, color: t.accentText, padding: 0 }}>· 关于四象限</button>}
        </div>
      </div>
    );
  }

  // 象限占比条（成长/复盘里用）：四格小时占比 + 成长区(Q2)高亮提示
  function QuadrantBar({ t, stats, style }) {
    const Q = window.VL.QUADRANTS, order = window.VL.QUAD_ORDER;
    const total = stats.total || 0;
    const planPct = total ? Math.round((stats.byKey.plan.hours / total) * 100) : 0;
    return (
      <div style={{ ...style }}>
        <div style={{ display: 'flex', height: 14, borderRadius: 999, overflow: 'hidden', background: t.chartTrack }}>
          {order.map((k) => { const w = total ? (stats.byKey[k].hours / total) * 100 : 0; return w > 0 ? <div key={k} title={Q[k].advice} style={{ width: `${w}%`, background: Q[k].color }} /> : null; })}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 10 }}>
          {order.map((k) => { const q = Q[k], h = stats.byKey[k].hours; const pct = total ? Math.round((h / total) * 100) : 0; return (
            <div key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: q.color }} />
              <span style={{ color: t.muted }}>{q.advice}</span>
              <span style={{ color: t.text, fontWeight: 650 }}>{pct}%</span>
            </div>
          ); })}
        </div>
        <div style={{ display: 'flex', gap: 9, marginTop: 12, padding: 12, borderRadius: t.radius - 2, background: `color-mix(in oklch, ${Q.plan.color} 12%, transparent)`, border: `1px solid color-mix(in oklch, ${Q.plan.color} 28%, transparent)` }}>
          <Icon name="sparkle" size={16} color={Q.plan.color} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12.5, lineHeight: 1.55, color: t.text }}>「重要不紧急」是<b>成长区</b>，本期占 <b>{planPct}%</b>。{planPct >= 30 ? '不错——你在为长期投资时间。' : '多往这格投一点，复利在这里发生。'}</div>
        </div>
      </div>
    );
  }

  // 建议式改期 · 空档选项：把 suggestSlots 的结果列成可点选项（绝不自动改，用户点了才改）
  function SlotSuggestions({ t, slots, onPick, style }) {
    if (!slots || !slots.length) {
      return <div style={{ fontSize: 12.5, color: t.muted, lineHeight: 1.55, ...style }}>07:00–22:00 内暂时找不到完整空档。换一天，或把时长缩短一点试试。</div>;
    }
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, ...style }}>
        {slots.map((s, i) => (
          <button key={i} onClick={() => onPick(s)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 36, padding: '0 13px', borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 13.5, fontWeight: 600, border: `1px solid ${t.border}`, background: t.surface, color: t.text }}>
            <Icon name="clock" size={14} color={t.accentText} />
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{s.time} – {s.end}</span>
            {s.label && <span style={{ fontSize: 12.5, color: t.faint, fontWeight: 500 }}>· {s.label}</span>}
          </button>
        ))}
      </div>
    );
  }

  // 建议式改期入口：当 ev 与他人重叠、或所在日超容量时温和提示「换个时间」，点开列空档让用户挑。
  // 遵守设计原则①④：用户做主、不替他重排、不说教。onPick(slot) 由调用方决定如何应用（详情即时改 / 编辑回填）。
  function RescheduleCard({ t, dayEvents, ev, onPick, style }) {
    const [open, setOpen] = React.useState(false);
    const list = dayEvents || [];
    if (!ev || ev.status === 'cancelled') return null;
    const conflict = window.VL.overlaps(list, ev);
    const load = window.VL.dayLoad(list);
    const over = load > window.VL.DAILY_CAPACITY_H;
    if (!conflict.length && !over) return null;
    const slots = window.VL.suggestSlots(list, ev);
    const amber = 'oklch(0.72 0.15 70)';
    const reason = conflict.length
      ? `与「${conflict.map((c) => c.title).join('、')}」时间重叠`
      : `这天已排 ${fmtH(load)} 小时，有点满`;
    return (
      <div style={{ padding: 12, borderRadius: t.radius - 2, background: `color-mix(in oklch, ${amber} 12%, transparent)`, border: `1px solid color-mix(in oklch, ${amber} 32%, transparent)`, ...style }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
          <Icon name={conflict.length ? 'bolt' : 'clock'} size={16} color={'oklch(0.6 0.15 60)'} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 650, color: t.text }}>{reason}</div>
            <div style={{ fontSize: 12.5, color: t.muted, marginTop: 2, lineHeight: 1.5 }}>要不要换个不冲突的时间？你来挑，语迹不替你决定。</div>
          </div>
          {!open && <button onClick={() => setOpen(true)} style={{ flexShrink: 0, height: 30, padding: '0 13px', borderRadius: 999, border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 12.5, fontWeight: 700, background: t.accent, color: t.onAccent }}>换个时间</button>}
        </div>
        {open && <div style={{ marginTop: 10 }}><SlotSuggestions t={t} slots={slots} onPick={onPick} /></div>}
      </div>
    );
  }

  function SectionLabel({ t, children, style }) {
    return <div style={{
      fontSize: 12.5, fontWeight: 650, color: t.faint, letterSpacing: 1.5,
      textTransform: 'uppercase', margin: '0 0 10px 2px', ...style,
    }}>{children}</div>;
  }

  Object.assign(window, {
    Card, Btn, Segmented, Chip, Dot, Ring, StackBar, AllocRow, Donut, Sheet, SectionLabel, FocusCard, CapacityBanner, RolloverBanner, BatchReviewList,
    QuadrantChip, MatrixView, QuadrantBar, SlotSuggestions, RescheduleCard,
    catColor, catLabel, fmtH,
  });
})();
