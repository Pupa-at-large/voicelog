/* VoiceLog Web · 新用户首开 / 空状态引导页 */
(function () {
  const { useEffect } = React;
  const { Icon, Btn } = window;

  function ensureStyle() {
    if (document.getElementById('vl-welcome')) return;
    const s = document.createElement('style');
    s.id = 'vl-welcome';
    s.textContent = `
      @keyframes vlwpulse{0%{transform:scale(1);opacity:.5}70%{transform:scale(1.9);opacity:0}100%{opacity:0}}
      @keyframes vlwin{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
      @media (prefers-reduced-motion:reduce){.vlwel [data-pulse]{animation:none!important;opacity:0!important}.vlwel [data-in]{animation:none!important}}
    `;
    document.head.appendChild(s);
  }

  function WebWelcome({ t, app }) {
    useEffect(ensureStyle, []);
    const examples = [
      { text: '明天下午三点跟老王开会', icon: 'mic', label: '一句话建程' },
      { text: '每周三五早上八点英语课，到学期末', icon: 'repeat', label: '说出重复规律' },
      { text: '提醒我周五下午六点交周报', icon: 'bell', label: '顺手加提醒' },
    ];
    const step = (n, ic, title, sub) => (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: t.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={ic} size={18} color={t.accentText} /></div>
        <div><div style={{ fontSize: 13.5, fontWeight: 650, color: t.text }}>{title}</div><div style={{ fontSize: 12, color: t.faint, marginTop: 2, lineHeight: 1.45 }}>{sub}</div></div>
      </div>
    );
    return (
      <div className="vlwel" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', overflowY: 'auto' }}>
        <div data-in style={{ width: '100%', maxWidth: 540, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', animation: 'vlwin .5s ease' }}>
          {/* 麦克风徽标 */}
          <div style={{ position: 'relative', marginBottom: 26 }}>
            <span data-pulse style={{ position: 'absolute', inset: 0, borderRadius: 999, background: t.accent, animation: 'vlwpulse 2.4s ease-out infinite' }} />
            <div style={{ position: 'relative', width: 76, height: 76, borderRadius: 999, background: t.accent, boxShadow: t.shadowLg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="micFill" size={36} color={t.onAccent} fill /></div>
          </div>

          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 780, letterSpacing: -0.6, color: t.text, lineHeight: 1.2 }}>说一句，就有了今天的安排</h1>
          <p style={{ margin: '14px 0 0', fontSize: 15.5, lineHeight: 1.6, color: t.muted, maxWidth: 420 }}>语迹把你随口说的话变成日程，到点提醒、按周复盘。<br />本地优先，离线也能用。</p>

          <div style={{ display: 'flex', gap: 10, marginTop: 26 }}>
            <Btn t={t} kind="primary" size="lg" icon="mic" onClick={app.openVoice} style={{ whiteSpace: 'nowrap', padding: '0 28px' }}>说一句 / 上传课表</Btn>
          </div>

          {/* 例子 */}
          <div style={{ width: '100%', marginTop: 34 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: t.faint, letterSpacing: 0.5, marginBottom: 11 }}>或者，点一个试试 —— 直接帮你建好</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {examples.map((ex) => (
                <button key={ex.text} onClick={() => app.quickAdd(ex.text)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '13px 15px', cursor: 'pointer', font: 'inherit', textAlign: 'left', borderRadius: t.radius, border: `1px solid ${t.border}`, background: t.surface, boxShadow: t.shadow }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: t.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={ex.icon} size={17} color={t.accentText} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14.5, fontWeight: 600, color: t.text }}>「{ex.text}」</div><div style={{ fontSize: 11.5, color: t.faint, marginTop: 1 }}>{ex.label}</div></div>
                  <Icon name="arrowR" size={18} color={t.faint} sw={2} />
                </button>
              ))}
            </div>
          </div>

          {/* 隐私脚注 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 30, padding: '10px 16px', borderRadius: 999, background: t.surface2 }}>
            <Icon name="shield" size={15} color={t.accentText} />
            <span style={{ fontSize: 12.5, color: t.muted }}>本地优先 · 日程只存在你的设备上，随时可导出</span>
          </div>
        </div>
      </div>
    );
  }

  window.WebWelcome = WebWelcome;
})();
