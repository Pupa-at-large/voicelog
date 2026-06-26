/* VoiceLog · 成长（等级 / XP / 时间去向报告）——产品灵魂页 */
(function () {
  const { useState, useEffect } = React;
  const { Icon, Card, Btn, Chip, StackBar, AllocRow, Dot, SectionLabel, catColor, catLabel, fmtH } = window;
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

  // Typeless 式「它对你的了解」报告：隐私安心卡（可折叠）+ 多段甜甜圈 + 图标化分类表 + 四象限
  function GrowthReport({ t, stats, maturity, quadStats, wide }) {
    const [open, setOpen] = useState(false);
    const total = stats.totalH || 0;
    const table = (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, alignSelf: 'stretch', justifyContent: 'center' }}>
        {stats.alloc.length ? stats.alloc.map((a, i, arr) => {
          const pct = total ? Math.round((a.hours / total) * 100) : 0;
          return (
            <div key={a.cat} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < arr.length - 1 ? `1px solid ${t.border}` : 'none' }}>
              <Dot color={catColor(t, a.cat)} size={9} />
              <span style={{ flex: 1, fontSize: 13.5, color: t.text, fontWeight: 550 }}>{catLabel(t, a.cat)}</span>
              <span style={{ fontSize: 13, color: t.muted, fontVariantNumeric: 'tabular-nums' }}>{fmtH(a.hours)}h</span>
              <span style={{ width: 40, textAlign: 'right', fontSize: 13, fontWeight: 680, color: t.text, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
            </div>
          );
        }) : <div style={{ fontSize: 13, color: t.faint, textAlign: 'center', padding: '12px 0' }}>本周还没有数据</div>}
      </div>
    );
    return (
      <div>
        <div style={{ padding: '13px 15px', borderRadius: t.radius, background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="shield" size={18} color={t.accentText} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: 14, fontWeight: 650, color: t.text }}>你的数据保持私密</div>
            <button onClick={() => setOpen((o) => !o)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', font: 'inherit', fontSize: 12.5, fontWeight: 650, color: t.accentText, padding: 0 }}>{open ? '显示更少' : '为什么'}</button>
          </div>
          {open && <p style={{ margin: '10px 0 0', fontSize: 12.5, lineHeight: 1.65, color: t.muted }}>语迹只在你的设备上分析时间模式（像识别习惯，而非记录具体内容）——不上传、不留存、不用于训练。等级与下面这份「了解」都由本机计算，随时可导出带走。</p>}
        </div>
        <div style={{ padding: 16, borderRadius: t.radius, background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 12.5, fontWeight: 650, color: t.faint, letterSpacing: 1, textTransform: 'uppercase' }}>它对你的了解</div>
            <Chip t={t} color={GOLD} soft icon="sparkle">越用越懂你</Chip>
          </div>
          <div style={{ display: 'flex', flexDirection: wide ? 'row' : 'column', alignItems: 'center', gap: wide ? 22 : 16 }}>
            <window.Donut t={t} alloc={stats.alloc} total={total || 1} size={wide ? 168 : 186} stroke={24} centerTop={maturity + '%'} centerSub={'懂你'} />
            {table}
          </div>
        </div>
        {quadStats && quadStats.total > 0 && (
          <div style={{ padding: 16, borderRadius: t.radius, background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow, marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 12.5, fontWeight: 650, color: t.faint, letterSpacing: 1, textTransform: 'uppercase' }}>四象限 · 时间去向</div>
              <Icon name="grid4" size={16} color={t.faint} />
            </div>
            <window.QuadrantBar t={t} stats={quadStats} />
          </div>
        )}
      </div>
    );
  }

  // 「成长规则」——把"怎么算成长"摊开给用户，去掉黑箱感
  function GrowthRules({ t, level }) {
    const [open, setOpen] = useState(false);
    const rules = window.VL.XP_RULES || [];
    const ladder = (window.VL.LEVELS || []).filter((L) => L.lv >= level.lv && L.lv <= level.lv + 2);
    return (
      <Card t={t} pad={0} style={{ marginBottom: 16, overflow: 'hidden' }}>
        <button onClick={() => setOpen((o) => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', background: 'transparent', border: 'none', cursor: 'pointer', font: 'inherit', textAlign: 'left' }}>
          <Icon name="sparkle" size={17} color={GOLD} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 14.5, fontWeight: 650, color: t.text }}>怎么算成长？</span>
          <span style={{ fontSize: 12.5, color: t.faint }}>{open ? '收起' : '看规则'}</span>
          <Icon name={open ? 'chevD' : 'chevR'} size={16} color={t.faint} />
        </button>
        {open && (
          <div style={{ padding: '2px 14px 14px' }}>
            <div style={{ fontSize: 12.5, color: t.muted, lineHeight: 1.6, marginBottom: 10 }}>经验只由你的真实动作产生，<b style={{ color: t.text }}>只升不降、不惩罚</b>。打开这个页面本身不加分。</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rules.map((rule) => (
                <div key={rule.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: t.radius - 4, background: t.surface2 }}>
                  <Icon name={rule.icon} size={16} color={t.accentText} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13.5, color: t.text }}>{rule.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 720, color: GOLD }}>+{rule.xp}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: t.faint, marginTop: 12, marginBottom: 6, fontWeight: 600 }}>接下来的等级</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ladder.map((L) => (
                <div key={L.lv} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5, color: L.lv === level.lv ? t.text : t.muted }}>
                  <span style={{ width: 20, height: 20, borderRadius: 999, flexShrink: 0, border: `1.5px solid ${L.lv === level.lv ? GOLD : t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 720, color: L.lv === level.lv ? GOLD : t.faint }}>{L.lv}</span>
                  <span style={{ flex: 1 }}>{L.name}</span>
                  <span style={{ color: t.faint }}>{L.need} XP</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    );
  }

  function GrowthScreen({ t, app }) {
    const L = window.VL.levelFromXp(app.xp || 0);
    const stats = window.VL.growthStats(app.events);
    const insight = window.VL.growthInsight(L, stats);
    const maturity = window.VL.insightMaturity(app.accumulatedDays, stats.recordCount);
    const quadStats = window.VL.quadrantStats(app.events);

    const stat = (v, label, color) => (
      <div style={{ flex: 1, padding: '14px 8px', borderRadius: t.radius - 4, background: t.surface2, textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 720, color: color || t.text }}>{v}</div>
        <div style={{ fontSize: 11, color: t.faint, marginTop: 3 }}>{label}</div>
      </div>
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: 'max(env(safe-area-inset-top, 0px), 14px) 20px 10px', flexShrink: 0 }}>
          <button onClick={() => app.setTab('home')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 30, padding: '0 12px 0 8px', marginBottom: 8, borderRadius: 999, cursor: 'pointer', border: `1px solid ${t.border}`, background: t.surface2, color: t.muted, font: 'inherit', fontSize: 13, fontWeight: 600 }}><Icon name="chevL" size={15} color={t.muted} sw={2.2} />日程</button>
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

          {/* 成长规则（可见、可展开）：经验只由真实动作产生，只升不降 */}
          <GrowthRules t={t} level={L} />


          {/* Typeless 式「它对你的了解」报告（隐私卡 + 甜甜圈 + 图标分类表） */}
          <div style={{ marginBottom: 16 }}>
            <GrowthReport t={t} stats={stats} maturity={maturity} quadStats={quadStats} wide={false} />
          </div>

          {/* 一句话本周洞察（成长身份层的总结，详细洞察沉到下面的复盘） */}
          <div style={{ display: 'flex', gap: 11, padding: 14, borderRadius: t.radius, marginBottom: 8, background: t.surface, border: `1px solid ${t.border}`, borderLeft: `2px solid ${GOLD}`, boxShadow: t.shadow }}>
            <Icon name="sparkle" size={17} color={GOLD} style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: t.text }}>{insight}</p>
          </div>

          {/* ── 合并：复盘 · 回看这段时间 ── */}
          <div style={{ height: 1, background: t.border, margin: '24px -20px 18px' }} />
          <div style={{ fontSize: 22, fontWeight: 760, color: t.text, letterSpacing: -0.4 }}>复盘</div>
          <div style={{ fontSize: 12.5, color: t.muted, margin: '3px 0 16px' }}>回看这段时间花在哪、完成得怎样，写下你的想法</div>
          {window.ReviewBody && <window.ReviewBody t={t} app={app} />}
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

  Object.assign(window, { GrowthScreen, LevelUpOverlay, LevelBadge, GrowthReport });
})();
