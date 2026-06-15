/* VoiceLog · 导出 + 我的 */
(function () {
  const { useState } = React;
  const { Icon, Card, Btn, Segmented, Dot, SectionLabel, fmtH } = window;

  const labelOf = (cat) => (window.VL.CATS[cat] ? window.VL.CATS[cat].label : '');
  const pct = (h, total) => (total ? Math.round((h / total) * 100) : 0);

  function buildMD(r) {
    const L = [`# ${r.label} · ${r.range}`, '', `共 ${r.count} 项日程，合计约 ${fmtH(r.total)} 小时。`, '', '## 时间去向'];
    r.alloc.forEach((a) => L.push(`- **${labelOf(a.cat)}** · ${fmtH(a.hours)} 小时（${a.items} 项，占 ${pct(a.hours, r.total)}%）`));
    L.push('', '## 洞察与建议');
    r.insights.forEach((s) => L.push(`- ${s}`));
    L.push('', `> 完成率 ${r.rate}%（完成 ${r.done} / 取消 ${r.cancelled} / 待办 ${r.todo}）`);
    return L.join('\n');
  }
  function buildTXT(r) {
    const pad = (s, n) => { let w = 0; for (const c of s) w += c.charCodeAt(0) > 255 ? 2 : 1; return s + ' '.repeat(Math.max(2, n - w)); };
    const L = [`${r.label} · ${r.range}`, '', `共 ${r.count} 项日程，合计约 ${fmtH(r.total)} 小时。`, '', '【时间去向】'];
    r.alloc.forEach((a) => L.push('  ' + pad(labelOf(a.cat), 10) + `${fmtH(a.hours)} 小时 · ${a.items} 项 · ${pct(a.hours, r.total)}%`));
    L.push('', '【洞察与建议】');
    r.insights.forEach((s) => L.push('  · ' + s));
    L.push('', `完成率 ${r.rate}%（完成 ${r.done} / 取消 ${r.cancelled} / 待办 ${r.todo}）`);
    return L.join('\n');
  }

  const FORMATS = [
    { key: 'md', name: 'Markdown', ext: '.md', desc: '结构化清晰，最适合喂给别的 AI 继续聊' },
    { key: 'txt', name: '纯文本', ext: '.txt', desc: '随处可读，任何编辑器都能打开' },
    { key: 'docx', name: 'Word', ext: '.docx', desc: '带排版，方便打印或发给同事' },
  ];

  // Markdown：深色代码风
  function MdPreview({ t, r, fname }) {
    return (
      <div style={{ background: t.mode === 'dark' ? '#0E1014' : '#1B1E24', borderRadius: t.radius, padding: 16, border: `1px solid ${t.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Dot color="oklch(0.7 0.16 25)" size={9} /><Dot color="oklch(0.82 0.14 80)" size={9} /><Dot color="oklch(0.72 0.15 150)" size={9} />
          <span style={{ marginLeft: 6, fontSize: 11.5, color: 'rgba(255,255,255,0.4)', fontFamily: 'ui-monospace, monospace' }}>{fname}</span>
        </div>
        <pre style={{ margin: 0, fontSize: 12, lineHeight: 1.7, color: 'rgba(255,255,255,0.85)', fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 230, overflow: 'auto' }}>{buildMD(r)}</pre>
      </div>
    );
  }
  // 纯文本：浅色纸张风
  function TxtPreview({ t, r, fname }) {
    return (
      <div style={{ background: t.mode === 'dark' ? '#15171B' : '#FBFAF6', borderRadius: t.radius, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 14px', borderBottom: `1px solid ${t.border}`, background: t.surface2 }}>
          <Icon name="doc" size={15} color={t.muted} />
          <span style={{ fontSize: 11.5, color: t.muted, fontFamily: 'ui-monospace, monospace' }}>{fname}</span>
        </div>
        <pre style={{ margin: 0, padding: 16, fontSize: 12.5, lineHeight: 1.75, color: t.text, fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 230, overflow: 'auto' }}>{buildTXT(r)}</pre>
      </div>
    );
  }
  // Word：白纸文档风
  function DocxPreview({ t, r, fname }) {
    const ink = '#23262B', sub = '#6B7280';
    return (
      <div style={{ borderRadius: t.radius, overflow: 'hidden', border: `1px solid ${t.border}`, boxShadow: t.shadow }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: '#2B579A' }}>
          <span style={{ width: 20, height: 20, borderRadius: 4, background: '#fff', color: '#2B579A', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>W</span>
          <span style={{ fontSize: 12, color: '#fff', opacity: 0.95, fontWeight: 500 }}>{fname}</span>
        </div>
        <div style={{ background: '#fff', padding: '22px 24px', maxHeight: 300, overflow: 'auto' }}>
          <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 21, fontWeight: 700, color: ink, letterSpacing: -0.2 }}>{r.label}</div>
          <div style={{ fontSize: 12.5, color: sub, marginTop: 3, marginBottom: 14 }}>{r.range} · 共 {r.count} 项 · 合计约 {fmtH(r.total)} 小时</div>
          <div style={{ height: 2, background: '#2B579A', width: 40, marginBottom: 16 }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: '#2B579A', marginBottom: 8 }}>时间去向</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, color: ink, marginBottom: 16 }}>
            <tbody>
              {r.alloc.map((a) => (
                <tr key={a.cat} style={{ borderBottom: '1px solid #EAEbed' }}>
                  <td style={{ padding: '6px 0' }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 999, background: window.catColor(t, a.cat), marginRight: 7 }} />{labelOf(a.cat)}</td>
                  <td style={{ padding: '6px 0', textAlign: 'right', color: sub }}>{fmtH(a.hours)} 小时</td>
                  <td style={{ padding: '6px 0', textAlign: 'right', width: 48, color: sub }}>{a.items} 项</td>
                  <td style={{ padding: '6px 0', textAlign: 'right', width: 44, fontWeight: 600 }}>{pct(a.hours, r.total)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#2B579A', marginBottom: 8 }}>洞察与建议</div>
          <ul style={{ margin: 0, paddingLeft: 18, color: ink }}>
            {r.insights.map((s, i) => <li key={i} style={{ fontSize: 12.5, lineHeight: 1.65, marginBottom: 5 }}>{s}</li>)}
          </ul>
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #EAEbed', fontSize: 12, color: sub, fontStyle: 'italic' }}>完成率 {r.rate}%（完成 {r.done} / 取消 {r.cancelled} / 待办 {r.todo}）</div>
        </div>
      </div>
    );
  }

  function ExportScreen({ t, app }) {
    const [period, setPeriod] = useState(app.exportPeriod || 'day');
    const [fmt, setFmt] = useState('md');
    const r = window.VL.getReview(period, app.events);
    const ext = FORMATS.find((f) => f.key === fmt).ext;
    const fname = `${r.label}_${r.range.replace(/[\s/–]+/g, '-')}${ext}`;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '54px 20px 10px', flexShrink: 0 }}>
          <button onClick={() => app.setTab('review')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 30, padding: '0 12px 0 8px', marginBottom: 8, borderRadius: 999, cursor: 'pointer', border: `1px solid ${t.border}`, background: t.surface2, color: t.muted, font: 'inherit', fontSize: 13, fontWeight: 600 }}><Icon name="chevL" size={15} color={t.muted} sw={2.2} />复盘</button>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 760, color: t.text, letterSpacing: -0.6 }}>导出</h1>
          <div style={{ marginTop: 14 }}><Segmented t={t} value={period} onChange={setPeriod} items={window.VL.periods} /></div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 24px' }}>
          <SectionLabel t={t}>选择格式</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {FORMATS.map((f) => {
              const on = fmt === f.key;
              return (
                <button key={f.key} onClick={() => setFmt(f.key)} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 15, cursor: 'pointer', borderRadius: t.radius, font: 'inherit', textAlign: 'left', background: on ? t.accentSoft : t.surface, border: `1.5px solid ${on ? t.accentText : t.border}`, boxShadow: on ? 'none' : t.shadow, transition: 'all .15s' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: on ? t.accent : t.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 760, color: on ? t.onAccent : t.muted, letterSpacing: -0.3 }}>{f.ext.replace('.', '').toUpperCase()}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15.5, fontWeight: 650, color: t.text }}>{f.name}</div>
                    <div style={{ fontSize: 12.5, color: t.muted, marginTop: 2, lineHeight: 1.4 }}>{f.desc}</div>
                  </div>
                  <div style={{ width: 22, height: 22, borderRadius: 999, flexShrink: 0, border: on ? 'none' : `2px solid ${t.borderStrong}`, background: on ? t.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{on && <Icon name="check" size={14} color={t.onAccent} sw={2.6} />}</div>
                </button>
              );
            })}
          </div>

          <SectionLabel t={t}>预览 · 跟随格式变化</SectionLabel>
          <div style={{ marginBottom: 16 }}>
            {fmt === 'md' && <MdPreview t={t} r={r} fname={fname} />}
            {fmt === 'txt' && <TxtPreview t={t} r={r} fname={fname} />}
            {fmt === 'docx' && <DocxPreview t={t} r={r} fname={fname} />}
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <Btn t={t} kind="ghost" icon="copy" onClick={() => app.setToast('已复制到剪贴板', 'copy')} style={{ flex: 1 }}>复制</Btn>
            <Btn t={t} kind="primary" icon="export" onClick={() => app.setToast(`已导出 ${fname}`, 'check')} style={{ flex: 1.4 }}>导出到 exports/</Btn>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="shield" size={14} color={t.faint} />
            <span style={{ fontSize: 12.5, color: t.faint }}>文件保存在你自己的机器上 · 不经过任何云端</span>
          </div>
        </div>
      </div>
    );
  }

  function Row({ t, icon, title, sub, right, onClick, last }) {
    return (
      <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 14px', cursor: onClick ? 'pointer' : 'default', borderBottom: last ? 'none' : `1px solid ${t.border}` }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: t.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={18} color={t.muted} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: t.text }}>{title}</div>
          {sub && <div style={{ fontSize: 12, color: t.faint, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>}
        </div>
        {right}
      </div>
    );
  }
  function Toggle({ t, on, onChange }) {
    return (
      <button onClick={() => onChange(!on)} style={{ width: 46, height: 28, borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0, background: on ? t.accent : t.borderStrong, position: 'relative', transition: 'background .2s', padding: 0 }}>
        <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 22, height: 22, borderRadius: 999, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left .2s' }} />
      </button>
    );
  }

  function MeScreen({ t, app }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '54px 20px 10px', flexShrink: 0 }}>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 760, color: t.text, letterSpacing: -0.6 }}>我的</h1>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px 24px' }}>
          <div style={{ display: 'flex', gap: 13, padding: 16, borderRadius: t.radius, marginBottom: 18, background: t.accentSoft }}>
            <Icon name="shield" size={22} color={t.accentText} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: t.accentText }}>本地优先</div>
              <div style={{ fontSize: 13, color: t.accentText, opacity: 0.85, marginTop: 3, lineHeight: 1.5 }}>所有日程与复盘都存在你自己的机器上，核心功能离线即可运行，不依赖任何云服务。</div>
            </div>
          </div>

          {/* 外观 · 主题色自调 */}
          <SectionLabel t={t}>外观 · 主题色</SectionLabel>
          <Card t={t} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon name={t.mode === 'dark' ? 'flame' : 'sun'} size={18} color={t.muted} />
                <span style={{ fontSize: 14.5, fontWeight: 600, color: t.text }}>{t.name} · {t.en}</span>
              </div>
              <span style={{ fontSize: 12.5, color: t.faint }}>点色块即时换色</span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {t.accents.map((a) => {
                const on = app.accentKey === a.key;
                return (
                  <button key={a.key} onClick={() => app.setAccent(a.key)} style={{ flex: 1, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: '100%', height: 38, borderRadius: 12, background: a.accent, boxShadow: on ? `0 0 0 2.5px ${t.surface}, 0 0 0 5px ${a.accent}` : t.shadow, transition: 'box-shadow .15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{on && <Icon name="check" size={18} color="#fff" sw={2.6} />}</span>
                    <span style={{ fontSize: 11.5, color: on ? t.text : t.faint, fontWeight: on ? 650 : 500 }}>{a.name}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          <SectionLabel t={t}>解析引擎</SectionLabel>
          <Card t={t} pad={0} style={{ marginBottom: 16, overflow: 'hidden' }}>
            <Row t={t} icon={app.aiEngine ? 'sparkle' : 'bolt'} title={app.aiEngine ? 'AI 解析' : '规则解析'} sub={app.aiEngine ? '已接入大模型 · 口语理解更强、复盘更有洞察' : '离线规则引擎 · 无需联网、开箱即用'} right={<Dot color={app.aiEngine ? 'oklch(0.62 0.15 150)' : 'oklch(0.70 0.14 70)'} size={10} ring />} last />
          </Card>
          <div style={{ margin: '-8px 2px 16px', display: 'flex', justifyContent: 'flex-end' }}>
            <Btn t={t} kind="soft" size="sm" icon={app.aiEngine ? 'bolt' : 'sparkle'} onClick={() => app.setAi(!app.aiEngine)}>{app.aiEngine ? '切回规则解析' : '配置 API Key，启用 AI'}</Btn>
          </div>

          <SectionLabel t={t}>提醒</SectionLabel>
          <Card t={t} pad={0} style={{ marginBottom: 16, overflow: 'hidden' }}>
            <Row t={t} icon="bell" title="浏览器到点提醒" sub="到点在页面内提醒，并发送系统通知" right={<Toggle t={t} on={app.notify} onChange={app.setNotify} />} last />
          </Card>

          <SectionLabel t={t}>回收站</SectionLabel>
          <Card t={t} pad={0} style={{ marginBottom: 16, overflow: 'hidden' }}>
            <Row t={t} icon="trash" title={`回收站 · ${app.trash.length} 项`} sub="删除的日程先放这里，随时找回" onClick={app.openTrash} right={<Icon name="chevR" size={18} color={t.faint} />} last />
          </Card>

          <SectionLabel t={t}>数据位置</SectionLabel>
          <Card t={t} pad={0} style={{ marginBottom: 20, overflow: 'hidden' }}>
            <Row t={t} icon="folder" title="voicelog.db" sub="SQLite · 程序的事实来源" />
            <Row t={t} icon="doc" title="voicelog_schedule.md" sub="纯文本镜像 · 不开 App 也能直接读、直接喂给 LLM" />
            <Row t={t} icon="export" title="exports/" sub="导出的复盘文件都放在这里" last />
          </Card>

          <div style={{ textAlign: 'center', fontSize: 12, color: t.faint, lineHeight: 1.6 }}>语迹 VoiceLog · 对着它说话，就能管日程<br />本地优先 · 永不崩 · 可导出喂给任何大模型</div>
        </div>
      </div>
    );
  }

  Object.assign(window, { ExportScreen, MeScreen, MdPreview, TxtPreview, DocxPreview, buildMD, buildTXT, EXPORT_FORMATS: FORMATS });
})();
