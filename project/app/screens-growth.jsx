/* VoiceLog · 成长（等级 / XP / 时间去向报告）——产品灵魂页 */
(function () {
  const { useEffect } = React;
  const { Icon, Card, Btn, StackBar, AllocRow, Dot, SectionLabel, catColor, catLabel, fmtH } = window;
  const GOLD = window.VL.GOLD;

  if (!document.getElementById('vl-growth')) {
    const s = document.createElement('style');
    s.id = 'vl-growth';
    s.textContent = `
      @keyframes vlxp{from{width:0}}
      @keyframes vlconf{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(140px) rotate(380deg);opacity:0}}
      @keyframes vllup{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}
      @media (prefers-reduced-motion:reduce){.vl-conf{display:none!important}}`;
    document.head.appendChild(s);
  }

  // 等级徽章（暖金环 + 等级数字）
  function LevelBadge({ t, lv, size = 62 }) {
    return (
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 999, border: `1px solid ${GOLD}`, opacity: 0.45 }} />
        <div style={{ position: 'absolute', inset: 6, borderRadius: 999, background: t.mode === 'dark' ? '#0c1e1a' : 'color-mix(in oklch, ' + GOLD + ' 12%, ' + t.surface + ')', border: `1px solid ${GOLD}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: size * 0.4, fontWeight: 680, color: GOLD, letterSpacing: -1 }}>{lv}</span>
        </div>
      </div>
    );
  }

  function GrowthScreen({ t, app }) {
    const L = window.VL.levelFromXp(app.xp || 0);
    const stats = window.VL.growthStats(app.events);
    const insight = window.VL.growthInsight(L, stats);
    const max = Math.max(1, ...stats.alloc.map((a) => a.hours));

    const stat = (v, label, color) => (
      <div style={{ flex: 1, padding: '14px 8px', borderRadius: t.radius - 4, background: t.surface2, textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 720, color: color || t.text }}>{v}</div>
        <div style={{ fontSize: 11, color: t.faint, marginTop: 3 }}>{label}</div>
      </div>
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '54px 20px 10px', flexShrink: 0 }}>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 760, color: t.text, letterSpacing: -0.6 }}>成长</h1>
          <div style={{ fontSize: 13, color: t.muted, marginTop: 2 }}>时间是你最大的资产</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 24px' }}>
          {/* 等级面板 */}
          <div style={{ padding: '22px 20px', borderRadius: t.radius + 4, marginBottom: 16, background: t.mode === 'dark' ? 'linear-gradient(160deg,#16302c,#102420)' : `linear-gradient(160deg, color-mix(in oklch, ${GOLD} 14%, ${t.surface}), ${t.surface})`, border: `1px solid color-mix(in oklch, ${GOLD} 40%, ${t.border})`, boxShadow: t.shadow }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <LevelBadge t={t} lv={L.lv} />
              <div>
                <div style={{ fontSize: 10.5, color: GOLD, letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 4, fontWeight: 650 }}>Level {L.lv}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: t.text, lineHeight: 1.2 }}>{L.name}</div>
              </div>
            </div>
            <div style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 7 }}>
                <span style={{ color: GOLD, fontWeight: 650 }}>{app.xp || 0} XP</span>
                <span style={{ color: t.faint }}>{L.next ? `距 LV.${L.next.lv} · 还差 ${L.remain}` : '已达最高等级'}</span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: t.chartTrack, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${L.pct}%`, borderRadius: 999, background: `linear-gradient(90deg, ${GOLD}, color-mix(in oklch, ${GOLD} 70%, white))`, animation: 'vlxp .8s cubic-bezier(.2,.8,.2,1)' }} />
              </div>
            </div>
          </div>

          {/* 三项数据 */}
          <div style={{ display: 'flex', gap: 9, marginBottom: 16 }}>
            {stat(stats.recordCount, '本周记录')}
            {stat(`${stats.completion}%`, '完成率', 'oklch(0.62 0.14 150)')}
            {stat(app.accumulatedDays || 0, '累计天数', t.accentText)}
          </div>

          {/* 时间去向 */}
          {stats.alloc.length > 0 && (
            <React.Fragment>
              <SectionLabel t={t}>时间去向 · 本周</SectionLabel>
              <Card t={t} style={{ marginBottom: 16 }}>
                <StackBar t={t} alloc={stats.alloc} total={stats.totalH} h={16} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
                  {stats.alloc.map((a) => <AllocRow key={a.cat} t={t} a={a} total={stats.totalH} max={max} />)}
                </div>
              </Card>
            </React.Fragment>
          )}

          {/* 本周洞察 */}
          <SectionLabel t={t}>本周洞察</SectionLabel>
          <div style={{ display: 'flex', gap: 11, padding: 14, borderRadius: t.radius, marginBottom: 16, background: t.surface, border: `1px solid ${t.border}`, borderLeft: `2px solid ${GOLD}`, boxShadow: t.shadow }}>
            <Icon name="sparkle" size={17} color={GOLD} style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: t.text }}>{insight}</p>
          </div>

          {/* 隐私承诺 */}
          <div style={{ display: 'flex', gap: 9, padding: '0 2px' }}>
            <Icon name="shield" size={15} color={t.faint} style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: t.faint }}>数据本地存储，随时导出带走。等级与 XP 只升不降——每一次记录都算数。</p>
          </div>
        </div>
      </div>
    );
  }

  // 升级庆祝浮层（手机内 absolute 覆盖）
  function LevelUpOverlay({ t, level, onClose }) {
    useEffect(() => {
      if (!level) return;
      const tm = setTimeout(onClose, 4200);
      return () => clearTimeout(tm);
    }, [level]);
    if (!level) return null;
    const cols = [GOLD, 'oklch(0.55 0.1 165)', 'oklch(0.6 0.13 250)', 'oklch(0.82 0.12 85)'];
    return (
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 90, background: 'rgba(8,10,14,0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: '78%', padding: '30px 28px', borderRadius: 22, textAlign: 'center', background: t.mode === 'dark' ? 'linear-gradient(160deg,#16302c,#102420)' : `linear-gradient(160deg, color-mix(in oklch, ${GOLD} 16%, ${t.surface}), ${t.surface})`, border: `1px solid ${GOLD}`, boxShadow: t.shadowLg, animation: 'vllup .4s cubic-bezier(.2,.9,.3,1.3)' }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <span key={i} className="vl-conf" style={{ position: 'absolute', left: `${20 + Math.random() * 60}%`, top: '8%', width: 8, height: 8, borderRadius: 2, background: cols[i % cols.length], animation: `vlconf 1.2s ease-out ${Math.random() * 0.3}s forwards` }} />
          ))}
          <div style={{ width: 80, height: 80, margin: '0 auto 16px', borderRadius: 999, background: t.mode === 'dark' ? '#0c1e1a' : t.surface, border: `2px solid ${GOLD}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 34, fontWeight: 720, color: GOLD }}>{level.lv}</span>
          </div>
          <div style={{ fontSize: 12, color: GOLD, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 650 }}>Level Up</div>
          <div style={{ fontSize: 22, fontWeight: 720, color: t.text, margin: '6px 0 16px' }}>LV.{level.lv} {level.name}</div>
          <Btn t={t} kind="primary" onClick={onClose}>继续前行</Btn>
        </div>
      </div>
    );
  }

  Object.assign(window, { GrowthScreen, LevelUpOverlay, LevelBadge });
})();
