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
          <span style={{ fontSize: 12, color: t.faint, marginLeft: 5 }}>{pct}%</span>
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
            <span style={{ fontSize: 12, color: t.faint, fontVariantNumeric: 'tabular-nums' }}>{ev.t} · {isNow ? remain(ev) : rel(ev)}</span>
          </div>
          <div style={{ fontSize: 15.5, fontWeight: 650, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>{ev.important ? '★ ' : ''}{ev.title}{ev.loc ? <span style={{ fontSize: 12.5, fontWeight: 500, color: t.muted }}> · {ev.loc}</span> : null}</div>
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

  function SectionLabel({ t, children, style }) {
    return <div style={{
      fontSize: 12.5, fontWeight: 650, color: t.faint, letterSpacing: 1.5,
      textTransform: 'uppercase', margin: '0 0 10px 2px', ...style,
    }}>{children}</div>;
  }

  Object.assign(window, {
    Card, Btn, Segmented, Chip, Dot, Ring, StackBar, AllocRow, Donut, Sheet, SectionLabel, FocusCard,
    catColor, catLabel, fmtH,
  });
})();
