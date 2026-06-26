/* VoiceLog Web · 成长（等级 / XP / 时间去向报告）——桌面端 */
(function () {
  const { Icon, Card, StackBar, AllocRow, SectionLabel } = window;
  const GOLD = window.VL.GOLD;

  function WebGrowth({ t, app }) {
    const L = window.VL.levelFromXp(app.xp || 0);
    const stats = window.VL.growthStats(app.events);
    const insight = window.VL.growthInsight(L, stats);
    const maturity = window.VL.insightMaturity(app.accumulatedDays, stats.recordCount);
    const quadStats = window.VL.quadrantStats(app.events);

    const stat = (v, label, color) => (
      <div style={{ flex: 1, padding: '16px 10px', borderRadius: t.radius - 2, background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow, textAlign: 'center' }}>
        <div style={{ fontSize: 26, fontWeight: 720, color: color || t.text }}>{v}</div>
        <div style={{ fontSize: 12, color: t.faint, marginTop: 3 }}>{label}</div>
      </div>
    );

    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 760, color: t.text }}>成长</h1>
          <div style={{ fontSize: 13.5, color: t.muted, marginTop: 3 }}>时间是你最大的资产 · 记录、复盘、向上</div>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          {/* 等级面板 */}
          <div style={{ width: 340, flexShrink: 0, padding: '24px 22px', borderRadius: t.radius + 6, background: t.mode === 'dark' ? 'linear-gradient(160deg,#16302c,#102420)' : `linear-gradient(160deg, color-mix(in oklch, ${GOLD} 15%, ${t.surface}), ${t.surface})`, border: `1px solid color-mix(in oklch, ${GOLD} 42%, ${t.border})`, boxShadow: t.shadow }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <window.LevelBadge t={t} lv={L.lv} size={66} />
              <div>
                <div style={{ fontSize: 11, color: GOLD, letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 4, fontWeight: 650 }}>Level {L.lv}</div>
                <div style={{ fontSize: 21, fontWeight: 700, color: t.text, lineHeight: 1.2 }}>{L.name}</div>
              </div>
            </div>
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 8 }}>
                <span style={{ color: GOLD, fontWeight: 650 }}>{app.xp || 0} XP</span>
                <span style={{ color: t.faint }}>{L.next ? `距 LV.${L.next.lv} · 还差 ${L.remain}` : '已达最高等级'}</span>
              </div>
              <div style={{ height: 9, borderRadius: 999, background: t.chartTrack, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${L.pct}%`, borderRadius: 999, background: `linear-gradient(90deg, ${GOLD}, color-mix(in oklch, ${GOLD} 70%, white))`, transition: 'width .8s cubic-bezier(.2,.8,.2,1)' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 9, marginTop: 20, padding: '10px 0 0', borderTop: `1px solid ${t.border}` }}>
              <Icon name="shield" size={15} color={t.faint} style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: t.faint }}>数据本地存储，随时导出带走。等级与 XP 只升不降——每一次记录都算数。</p>
            </div>
            {/* 成长规则：经验只由真实动作产生，打开页面不加分 */}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.text, marginBottom: 9 }}>怎么算成长（只升不降）</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {(window.VL.XP_RULES || []).map((rule) => (
                  <div key={rule.key} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5, color: t.muted }}>
                    <Icon name={rule.icon} size={14} color={t.accentText} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{rule.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 720, color: GOLD }}>+{rule.xp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 数据 + 时间去向 + 洞察 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
              {stat(stats.recordCount, '本周记录')}
              {stat(`${stats.completion}%`, '完成率', 'oklch(0.62 0.14 150)')}
              {stat(app.accumulatedDays || 0, '累计天数', t.accentText)}
            </div>
            <div style={{ marginBottom: 18 }}>
              <window.GrowthReport t={t} stats={stats} maturity={maturity} quadStats={quadStats} wide={true} />
            </div>
            <SectionLabel t={t}>本周洞察</SectionLabel>
            <div style={{ display: 'flex', gap: 11, padding: 15, borderRadius: t.radius, background: t.surface, border: `1px solid ${t.border}`, borderLeft: `2px solid ${GOLD}`, boxShadow: t.shadow }}>
              <Icon name="sparkle" size={17} color={GOLD} style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: t.text }}>{insight}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  window.WebGrowth = WebGrowth;
})();
