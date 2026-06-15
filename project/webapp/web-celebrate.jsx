/* VoiceLog Web · 完成彩蛋 / 鼓励奖励层（多邻国式打卡反馈） */
(function () {
  const { useEffect } = React;
  const { Icon } = window;

  function ensureStyle() {
    if (document.getElementById('vl-celebrate')) return;
    const s = document.createElement('style');
    s.id = 'vl-celebrate';
    s.textContent = `
      @keyframes vlcelpop{0%{opacity:0;transform:scale(.55)}48%{opacity:1;transform:scale(1.1)}100%{opacity:1;transform:scale(1)}}
      @keyframes vlcelout{to{opacity:0;transform:scale(.92) translateY(-8px)}}
      @keyframes vlburst{0%{opacity:1;transform:translate(-50%,-50%) translate(0,0) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) translate(var(--tx),var(--ty)) scale(.3)}}
      @keyframes vlring{to{stroke-dashoffset:0}}
      @media (prefers-reduced-motion:reduce){.vlcel *{animation-duration:.01ms!important}}
    `;
    document.head.appendChild(s);
  }

  function WebCelebrate({ t, data }) {
    useEffect(ensureStyle, []);
    if (!data) return null;
    const N = 16;
    const cols = [t.accent, 'oklch(0.80 0.15 80)', 'oklch(0.70 0.15 150)', 'oklch(0.70 0.17 25)', 'oklch(0.66 0.16 270)'];
    const parts = Array.from({ length: N }).map((_, i) => {
      const a = (Math.PI * 2 * i) / N + (i % 2 ? 0.22 : -0.18);
      const d = 64 + (i % 5) * 14;
      return { tx: Math.cos(a) * d, ty: Math.sin(a) * d, c: cols[i % cols.length], size: 5 + (i % 4) * 2.2, round: i % 3 !== 0 };
    });
    const r = 34, circ = 2 * Math.PI * r;
    return (
      <div className="vlcel" key={data.key} style={{ position: 'absolute', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'vlcelpop .42s cubic-bezier(.2,.9,.3,1.2) forwards, vlcelout .42s ease 1.5s forwards' }}>
          <div style={{ position: 'absolute', top: 42, left: '50%', width: 0, height: 0 }}>
            {parts.map((p, i) => (
              <span key={i} style={{ position: 'absolute', left: 0, top: 0, width: p.size, height: p.size, borderRadius: p.round ? 999 : 2, background: p.c, animation: `vlburst .72s cubic-bezier(.2,.7,.3,1) ${(i % 4) * 0.02}s forwards`, '--tx': p.tx + 'px', '--ty': p.ty + 'px' }} />
            ))}
          </div>
          <div style={{ width: 84, height: 84, borderRadius: 999, background: t.surface, boxShadow: t.shadowLg, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <svg width="84" height="84" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
              <circle cx="42" cy="42" r={r} fill="none" stroke={t.accent} strokeWidth="5" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ} style={{ animation: 'vlring .5s cubic-bezier(.2,.7,.3,1) .05s forwards' }} />
            </svg>
            <Icon name={data.goal ? 'flame' : 'check'} size={data.goal ? 38 : 42} color={t.accent} sw={2.6} fill={false} />
          </div>
          <div style={{ marginTop: 14, padding: '10px 18px', borderRadius: 16, background: t.mode === 'dark' ? 'rgba(40,44,52,0.97)' : 'rgba(26,29,36,0.97)', boxShadow: t.shadowLg, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, maxWidth: 320 }}>
            <span style={{ fontSize: 14.5, fontWeight: 680, color: '#fff', textAlign: 'center', whiteSpace: 'nowrap' }}>{data.msg}</span>
            {data.streak > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'oklch(0.88 0.09 80)' }}><Icon name="flame" size={13} color={'oklch(0.78 0.16 55)'} sw={2} />今天已完成 {data.streak} 件</span>}
          </div>
        </div>
      </div>
    );
  }

  window.WebCelebrate = WebCelebrate;

  // 勾选即时微反馈：在复选框处就地迸发，不遮挡内容
  function CheckBurst({ t, k }) {
    useEffect(ensureStyle, []);
    const N = 9;
    const cols = [t.accent, 'oklch(0.80 0.15 80)', 'oklch(0.70 0.15 150)', 'oklch(0.70 0.17 25)'];
    const parts = Array.from({ length: N }).map((_, i) => { const a = (Math.PI * 2 * i) / N; const d = 15 + (i % 3) * 7; return { tx: Math.cos(a) * d, ty: Math.sin(a) * d, c: cols[i % cols.length], size: 3.5 + (i % 3) * 1.4, round: i % 2 }; });
    return (
      <span key={k} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
        <span style={{ position: 'absolute', left: '50%', top: '50%' }}>
          {parts.map((p, i) => <span key={i} style={{ position: 'absolute', left: 0, top: 0, width: p.size, height: p.size, borderRadius: p.round ? 999 : 1, background: p.c, animation: 'vlburst .6s cubic-bezier(.2,.7,.3,1) forwards', '--tx': p.tx + 'px', '--ty': p.ty + 'px' }} />)}
        </span>
      </span>
    );
  }
  window.CheckBurst = CheckBurst;
})();
