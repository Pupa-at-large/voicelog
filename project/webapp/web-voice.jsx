/* VoiceLog Web · 语音建程 / 文件上传 模态框 */
(function () {
  const { useState, useEffect, useRef } = React;
  const { Icon, Btn, Chip, Dot, catColor, catLabel } = window;
  const CATS = ['meet', 'deep', 'life', 'learn', 'misc'];

  function Wave({ color }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 48 }}>
        {Array.from({ length: 32 }).map((_, i) => {
          const s = (Math.sin(i * 1.7) + 1) / 2;
          return <div key={i} data-vlbar style={{ width: 4, height: 40, borderRadius: 999, background: color, transformOrigin: 'center', animation: `vlbar ${0.7 + s * 0.7}s ease-in-out ${i * 0.04}s infinite` }} />;
        })}
      </div>
    );
  }

  function WebVoiceModal({ t, open, openMode, onClose, onConfirm, onReflect, onExtracted, onCourses, onBatch, aiEngine, dayEventsFor, allEvents }) {
    const V = window.VL.data.voice;
    const [phase, setPhase] = useState('listening');
    const [engineUsed, setEngineUsed] = useState(null); // 'ai' | 'rule' | null
    const [existResched, setExistResched] = useState(null); // 冲突"挪旧的"：{id,title,time}
    const [heardNothing, setHeardNothing] = useState(false);
    const [typedText, setTypedText] = useState('');
    const [transcript, setTranscript] = useState('');
    const [reflectText, setReflectText] = useState('');
    const [mode, setMode] = useState('real');
    const [draft, setDraft] = useState(null);
    const [run, setRun] = useState(0);
    const [uploadName, setUploadName] = useState('');
    const [extracted, setExtracted] = useState([]);
    const [extractKind, setExtractKind] = useState('doc');
    const [courses, setCourses] = useState([]);
    const [excluded, setExcluded] = useState({});
    const [recurKey, setRecurKey] = useState('semester');
    const [customUntil, setCustomUntil] = useState(window.VL.SEMESTER_END);
    const R = useRef({});
    const titleRef = useRef(null);
    const fileRef = useRef(null);
    const utRef = useRef(0);

    const pickFile = (kind) => { R.current.kind = kind; fileRef.current && fileRef.current.click(); };
    const onPickFile = (e) => {
      const f = e.target.files && e.target.files[0]; e.target.value = '';
      if (!f) return;
      const kind = R.current.kind || 'doc';
      try { R.current.rec && R.current.rec.stop(); } catch (x) {}
      R.current.phase = 'upload'; R.current.fellBack = true;
      clearInterval(R.current.sim); clearTimeout(R.current.t1); clearTimeout(R.current.t2);
      setUploadName(f.name); setExtractKind(kind); setPhase('extracting');
      clearTimeout(utRef.current);
      if (kind === 'course') {
        utRef.current = setTimeout(() => {
          setCourses(window.VL.data.courseSchedule.map((c, i) => ({ ...c, _id: 'c' + i })));
          setExcluded({}); setRecurKey('semester'); setPhase('course-grid');
        }, 1600);
      } else {
        utRef.current = setTimeout(() => { setExtracted(window.VL.data.upload.map((x, i) => ({ ...x, _id: 'x' + i, _sel: true }))); setPhase('extracted'); }, 1500);
      }
    };

    useEffect(() => {
      if (!open) return;
      const ctx = R.current = { phase: 'listening', fellBack: false, finalText: '', parsing: false, reflectMode: (openMode === 'reflect') };
      setPhase('listening'); setTranscript(''); setDraft(null); setEngineUsed(null); setExistResched(null); setHeardNothing(false);
      const setP = (p) => { ctx.phase = p; setPhase(p); };
      const showActs = (acts) => {
        if (acts.length === 1 && acts[0].kind === 'create') { setDraft(acts[0].draft); setP('preview'); }
        else if (onBatch) { ctx.parsing = true; onBatch(acts); }
        else { setDraft(acts[0].draft); setP('preview'); }
      };
      const ruleParse = (text, curated) => {
        if (!curated) setEngineUsed('rule');
        // 多意图：一段话里有多条 → 走「待执行清单」，不再单条预览
        if (!curated && onBatch && window.VL.parseBatch) { const acts = window.VL.parseBatch(text); if (acts.length > 1) { ctx.parsing = true; onBatch(acts); return; } }
        ctx.parsing = true; setP('parsing');
        ctx.t1 = setTimeout(() => { let d = curated || (window.VL.parse ? window.VL.parse(text) : { ...V.parsed }); if (!d || !d.title) d = { ...V.parsed }; setDraft(d); setP('preview'); }, 850);
      };
      const startParse = async (text, curated) => {
        if (ctx.parsing) return;
        // 复盘模式 / 识别到"我想复盘一下" → 不建日程，转成"我的复盘"
        if (!curated && (ctx.reflectMode || (window.VL.isReflectIntent && window.VL.isReflectIntent(text)))) {
          ctx.parsing = true; setReflectText(ctx.reflectMode ? text : window.VL.stripReflectTrigger(text)); setEngineUsed('reflect'); setP('reflect'); return;
        }
        // 开启「AI 解析」且配置了后端 → 先走千问真·AI 解析；失败/未配置自动回退规则引擎
        if (!curated && aiEngine && window.VL.serverUrl && window.VL.parseRemote) {
          ctx.parsing = true; setP('parsing');
          try { const acts = await window.VL.parseRemote(text, window.VL.candidateEvents(allEvents || {})); if (ctx.phase !== 'parsing') return; setEngineUsed('ai'); showActs(acts); return; }
          catch (e) { ctx.parsing = false; }
        }
        ruleParse(text, curated);
      };
      const noSpeech = () => { if (ctx.fellBack) return; ctx.fellBack = true; clearInterval(ctx.sim); clearTimeout(ctx.t2); setHeardNothing(true); };
      const playExample = () => { ctx.fellBack = true; ctx.real = false; setHeardNothing(false); setMode('demo'); setTranscript(''); let i = 0; ctx.sim = setInterval(() => { i += 1; setTranscript(V.chunks.slice(0, i).join('')); if (i >= V.chunks.length) { clearInterval(ctx.sim); ctx.t2 = setTimeout(() => startParse(V.phrase, { ...V.parsed }), 620); } }, 600); };
      ctx.example = playExample;
      ctx.stop = () => { if (ctx.real && ctx.rec) { try { ctx.rec.stop(); } catch (e) {} } else { noSpeech(); } };
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      let started = false;
      if (SR) {
        try {
          const rec = new SR(); ctx.rec = rec; ctx.real = true; setMode('real');
          rec.lang = 'zh-CN'; rec.interimResults = true; rec.continuous = true; // 长句不被截断，说完点停止
          rec.onresult = (e) => { let f = '', it = ''; for (let k = 0; k < e.results.length; k++) { const r = e.results[k]; if (r.isFinal) f += r[0].transcript; else it += r[0].transcript; } ctx.finalText = f; ctx.interimText = it; setTranscript(f + it); };
          rec.onerror = () => noSpeech();
          // 手动停止时常还没"定稿"，用 interim 兜底，避免回退到示例文本
          rec.onend = () => { if (ctx.phase !== 'listening') return; const x = (ctx.finalText || ctx.interimText || '').trim(); if (x) startParse(x, null); else if (!ctx.fellBack) noSpeech(); };
          rec.start(); started = true;
        } catch (e) { started = false; }
      }
      if (!started) { if (ctx.reflectMode) { setReflectText(''); setP('reflect'); } else { ctx.real = false; setMode('demo'); noSpeech(); } }
      return () => { try { ctx.rec && ctx.rec.stop(); } catch (e) {} clearInterval(ctx.sim); clearTimeout(ctx.t1); clearTimeout(ctx.t2); clearTimeout(utRef.current); };
    }, [open, run]);

    const engineOn = engineUsed ? engineUsed === 'ai' : aiEngine;
    const engine = engineOn ? { label: 'AI 解析', color: 'oklch(0.62 0.15 150)' } : { label: (engineUsed === 'rule' && aiEngine) ? '规则解析 · 云端未响应' : '规则解析', color: 'oklch(0.70 0.14 70)' };
    const openTyping = () => { setTypedText(''); setPhase('typing'); };
    const doParse = async (text) => {
      const txt = (text || '').trim(); if (!txt) return;
      if (aiEngine && window.VL.serverUrl && window.VL.parseRemote) {
        setEngineUsed(null); setPhase('parsing');
        try {
          const acts = await window.VL.parseRemote(txt, window.VL.candidateEvents(allEvents || {})); setEngineUsed('ai');
          if (acts.length === 1 && acts[0].kind === 'create') { setDraft(acts[0].draft); setPhase('preview'); }
          else if (onBatch) { onBatch(acts); } else { setDraft(acts[0].draft); setPhase('preview'); }
          return;
        } catch (e) { /* 回退规则 */ }
      }
      setEngineUsed('rule');
      const acts = window.VL.parseBatch ? window.VL.parseBatch(txt) : [];
      if (acts.length > 1 && onBatch) { onBatch(acts); return; }
      const d = window.VL.parse ? window.VL.parse(txt) : null;
      if (d && d.title) { setDraft(d); setPhase('preview'); } else { setPhase('typing'); }
    };
    // 预览可编辑日期/时间（与移动端一致）
    const draftISO = draft ? (window.VL.todayDateObj().getFullYear() + '-' + draft.dateKey) : '';
    const setDraftDate = (iso) => {
      if (!iso) return; const d = new Date(iso + 'T00:00:00'); if (isNaN(d.getTime())) return;
      const key = String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const diff = Math.round((d - window.VL.todayDateObj()) / 86400000);
      const prefix = diff === 0 ? '今天' : diff === 1 ? '明天' : diff === 2 ? '后天' : diff === -1 ? '昨天' : null;
      const dow = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
      const dateText = (prefix ? prefix + ' · ' : '') + `${d.getMonth() + 1}月${d.getDate()}日 周${dow}`;
      setDraft((dr) => ({ ...dr, dateKey: key, dateText }));
    };
    const inputStyle = { font: 'inherit', fontSize: 15, fontWeight: 600, color: t.text, background: 'transparent', border: 'none', outline: 'none', padding: 0, colorScheme: t.mode === 'dark' ? 'dark' : 'light' };
    const DOW5 = [[1, '一'], [2, '二'], [3, '三'], [4, '四'], [5, '五']];
    const liveCourses = courses.filter((c) => !excluded[c._id]);
    const times = Array.from(new Set(courses.map((c) => c.time))).sort();
    const recurOpts = window.VL.RECUR_OPTIONS;
    const recurSel = recurOpts.find((o) => o.key === recurKey) || recurOpts[0];
    const fmtDate = (s) => { if (!s) return ''; const p = s.split('-'); return `${+p[1]}月${+p[2]}日`; };
    const courseRepeat = recurKey === 'custom' ? { until: customUntil, untilText: fmtDate(customUntil) } : { until: recurSel.until, untilText: recurSel.untilText };
    const learnCol = catColor(t, 'learn');
    const field = (label, value, icon, last) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: last ? 'none' : `1px solid ${t.border}` }}>
        <span style={{ fontSize: 13, color: t.faint, width: 44, flexShrink: 0 }}>{label}</span>
        <div style={{ flex: 1, minWidth: 0 }}>{value}</div>
        {icon && <Icon name={icon} size={15} color={t.faint} />}
      </div>
    );

    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 60, pointerEvents: open ? 'auto' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(8,10,14,0.5)', opacity: open ? 1 : 0, transition: 'opacity .25s', backdropFilter: open ? 'blur(3px)' : 'none' }} />
        <div style={{ position: 'relative', width: phase === 'course-grid' ? 600 : 460, maxWidth: '92%', maxHeight: '88%', overflowY: 'auto', background: t.surface, borderRadius: t.radius + 8, boxShadow: t.shadowLg, border: `1px solid ${t.border}`, padding: 24, transform: open ? 'scale(1)' : 'scale(0.96)', opacity: open ? 1 : 0, transition: 'transform .25s, opacity .25s' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: 999, border: 'none', cursor: 'pointer', background: t.surface2, color: t.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={17} color={t.muted} /></button>

          {phase === 'typing' && (
            <div style={{ padding: '6px 2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><Icon name="sparkle" size={17} color={t.accentText} /><span style={{ fontSize: 17, fontWeight: 720, color: t.text }}>打一句话，AI 帮你建</span></div>
              <div style={{ fontSize: 12.5, color: t.faint, margin: '0 0 12px 25px' }}>像说话那样写,不用工整,它会理清</div>
              <textarea value={typedText} onChange={(e) => setTypedText(e.target.value)} autoFocus rows={3} placeholder="例如：明天下午三点跟老王在公司开会，提前半小时提醒" style={{ width: '100%', resize: 'none', padding: '12px 13px', borderRadius: t.radius, border: `1px solid ${t.border}`, background: t.surface2, color: t.text, font: 'inherit', fontSize: 15, lineHeight: 1.5, outline: 'none' }} />
              <button onClick={() => setTypedText('明天下午三点跟老王开会')} style={{ marginTop: 8, padding: '5px 11px', borderRadius: 999, border: `1px solid ${t.border}`, background: 'transparent', cursor: 'pointer', font: 'inherit', fontSize: 12.5, color: t.muted }}>用这句试试</button>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <Btn t={t} kind="ghost" onClick={() => setPhase('listening')} style={{ flex: 1 }}>返回</Btn>
                <Btn t={t} kind="primary" icon="sparkle" onClick={() => doParse(typedText)} style={{ flex: 2 }}>解析</Btn>
              </div>
            </div>
          )}

          {phase === 'reflect' && (
            <div style={{ padding: '6px 2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><Icon name="sparkle" size={17} color={t.accentText} /><span style={{ fontSize: 17, fontWeight: 720, color: t.text }}>今天的复盘</span></div>
              <div style={{ fontSize: 12.5, color: t.faint, margin: '0 0 12px 25px' }}>说说今天的想法、感受、收获——给你自己的记录，不会被解析成日程</div>
              <textarea value={reflectText} onChange={(e) => setReflectText(e.target.value)} autoFocus rows={5} placeholder="例如：今天效率不错，专注写完了报告；晚上有点累，明天想早点睡。" style={{ width: '100%', resize: 'none', padding: '12px 13px', borderRadius: t.radius, border: `1px solid ${t.border}`, background: t.surface2, color: t.text, font: 'inherit', fontSize: 15, lineHeight: 1.6, outline: 'none' }} />
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <Btn t={t} kind="ghost" onClick={onClose} style={{ flex: 1 }}>取消</Btn>
                <Btn t={t} kind="primary" icon="check" onClick={() => { if (onReflect && reflectText.trim()) onReflect(window.VL.todayKey(), reflectText.trim()); onClose(); }} style={{ flex: 2 }}>存为今天的复盘</Btn>
              </div>
            </div>
          )}

          {phase === 'listening' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                <Dot color={heardNothing ? t.muted : 'oklch(0.62 0.2 25)'} ring={!heardNothing} /><span style={{ fontSize: 15, fontWeight: 600, color: t.text }}>{heardNothing ? '没听清' : '正在听…'}</span>
                <Chip t={t} color={mode === 'real' ? engine.color : t.muted} soft>{mode === 'real' ? '浏览器语音识别' : '示例演示'}</Chip>
              </div>
              {!heardNothing && <Wave color={t.accent} />}
              <p style={{ marginTop: 18, fontSize: heardNothing ? 14 : 17, lineHeight: 1.5, color: (transcript && !heardNothing) ? t.text : t.faint, textAlign: 'center', fontWeight: 500, minHeight: 50 }}>{heardNothing ? '没识别到内容。点下面「重新听」再说一次，或上传文件 / 改用打字。' : (transcript || '说出你的安排，例如「明天下午三点跟老王开会」')}</p>
              <button onClick={() => (heardNothing ? setRun((r) => r + 1) : (R.current.stop && R.current.stop()))} style={{ width: 60, height: 60, borderRadius: 999, border: 'none', cursor: 'pointer', background: t.accent, boxShadow: t.shadowLg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>{heardNothing ? <Icon name="mic" size={26} color={t.onAccent} /> : <div style={{ width: 20, height: 20, borderRadius: 6, background: t.onAccent }} />}</button>
              {heardNothing && <button onClick={openTyping} style={{ marginTop: 10, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', font: 'inherit', fontSize: 13, fontWeight: 700, color: t.accentText }}>改用打字</button>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', margin: '18px 0 4px' }}>
                <div style={{ flex: 1, height: 1, background: t.border }} /><span style={{ fontSize: 12, color: t.faint }}>或</span><div style={{ flex: 1, height: 1, background: t.border }} />
              </div>
              <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt" style={{ display: 'none' }} onChange={onPickFile} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, width: '100%' }}>
                <button onClick={() => pickFile('course')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderRadius: t.radius, cursor: 'pointer', textAlign: 'left', font: 'inherit', border: `1.5px solid ${t.accentText}`, background: t.accentSoft }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="grid" size={19} color={t.onAccent} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 700, color: t.accentText }}>上传课表图片</div><div style={{ fontSize: 12, color: t.accentText, opacity: 0.8, marginTop: 1 }}>自动识别每周课程，并确认重复范围</div></div>
                  <Icon name="chevR" size={18} color={t.accentText} />
                </button>
                <button onClick={() => pickFile('doc')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderRadius: t.radius, cursor: 'pointer', textAlign: 'left', font: 'inherit', border: `1px solid ${t.border}`, background: t.surface2 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: t.raised, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="doc" size={19} color={t.muted} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 650, color: t.text }}>上传文件 / 截图</div><div style={{ fontSize: 12, color: t.faint, marginTop: 1 }}>从通知、邮件、会议纪要里提取日程</div></div>
                  <Icon name="chevR" size={18} color={t.faint} />
                </button>
              </div>
            </div>
          )}

          {phase === 'parsing' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 16 }}>
              <div style={{ width: 38, height: 38, borderRadius: 999, border: `3px solid ${t.chartTrack}`, borderTopColor: t.accent, animation: 'vlspin .8s linear infinite' }} />
              <span style={{ fontSize: 15, fontWeight: 600, color: t.text }}>正在解析…</span><Chip t={t} color={engine.color} soft icon="sparkle">{engine.label}</Chip>
            </div>
          )}

          {phase === 'extracting' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 999, border: `3px solid ${t.chartTrack}`, borderTopColor: t.accent, animation: 'vlspin .8s linear infinite' }} />
              <span style={{ fontSize: 15, fontWeight: 600, color: t.text }}>{extractKind === 'course' ? 'AI 正在识别课表…' : 'AI 正在提取日程…'}</span>
              <span style={{ fontSize: 12.5, color: t.faint }}>{uploadName}</span><Chip t={t} color={'oklch(0.62 0.15 150)'} soft icon="sparkle">{extractKind === 'course' ? '识别课程 · 推断重复规律' : '大模型解析'}</Chip>
            </div>
          )}

          {phase === 'extracted' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2px 30px 12px 2px' }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: t.text }}>找到 {extracted.length} 个日程</span><Chip t={t} color={'oklch(0.62 0.15 150)'} soft icon="sparkle">大模型解析</Chip>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {extracted.map((x) => (
                  <button key={x._id} onClick={() => setExtracted((arr) => arr.map((y) => y._id === x._id ? { ...y, _sel: !y._sel } : y))} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 12, cursor: 'pointer', textAlign: 'left', font: 'inherit', borderRadius: t.radius, background: x._sel ? t.surface : t.surface2, border: `1.5px solid ${x._sel ? t.accentText : t.border}` }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, border: x._sel ? 'none' : `2px solid ${t.borderStrong}`, background: x._sel ? t.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{x._sel && <Icon name="check" size={14} color={t.onAccent} sw={2.6} />}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 650, color: t.text }}>{x.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}><span style={{ fontSize: 12.5, color: t.muted }}>{x.dateText.split(' · ')[0]} {x.time}</span><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: t.faint }}><Dot color={catColor(t, x.cat)} size={7} />{catLabel(t, x.cat)}</span>{x.loc && <span style={{ fontSize: 12, color: t.faint }}>· {x.loc}</span>}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <Btn t={t} kind="ghost" onClick={() => { setPhase('listening'); setRun((r) => r + 1); }} style={{ flex: 1 }}>重新上传</Btn>
                <Btn t={t} kind="primary" icon="check" onClick={() => { const sel = extracted.filter((x) => x._sel); if (sel.length) onExtracted(sel); onClose(); }} style={{ flex: 2 }}>加入选中（{extracted.filter((x) => x._sel).length}）</Btn>
              </div>
            </div>
          )}

          {phase === 'course-grid' && (
            <div style={{ animation: 'vlin .25s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2px 30px 14px 2px' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: t.text }}>识别到 {courses.length} 节课</div>
                  <div style={{ fontSize: 12.5, color: t.faint, marginTop: 2 }}>{uploadName}</div>
                </div>
                <Chip t={t} color={'oklch(0.62 0.15 150)'} soft icon="sparkle">大模型识别</Chip>
              </div>

              {/* AI 推断的重复规律 */}
              <div style={{ display: 'flex', gap: 10, padding: 13, borderRadius: t.radius, background: t.accentSoft, marginBottom: 14 }}>
                <Icon name="repeat" size={18} color={t.accentText} sw={2} style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 13, lineHeight: 1.55, color: t.accentText }}>这看起来是一份<b>每周重复</b>的课表。AI 已按周几 / 节次整理好，下面确认重复到什么时候即可。</div>
              </div>

              {/* 课表网格预览 */}
              <div style={{ display: 'grid', gridTemplateColumns: `46px repeat(5, 1fr)`, gap: 4, marginBottom: 16 }}>
                <div />
                {DOW5.map(([d, lab]) => <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 650, color: t.muted, paddingBottom: 2 }}>周{lab}</div>)}
                {times.map((tm) => (
                  <React.Fragment key={tm}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6, fontSize: 11.5, color: t.faint, fontVariantNumeric: 'tabular-nums' }}>{tm}</div>
                    {DOW5.map(([d]) => {
                      const c = courses.find((x) => x.dow === d && x.time === tm);
                      if (!c) return <div key={d} style={{ minHeight: 56, borderRadius: 9, background: t.surface2, opacity: 0.5 }} />;
                      const off = !!excluded[c._id];
                      return (
                        <button key={d} onClick={() => setExcluded((m) => ({ ...m, [c._id]: !m[c._id] }))} title={off ? '点击加回' : '点击排除'} style={{ minHeight: 56, padding: '7px 8px', cursor: 'pointer', font: 'inherit', textAlign: 'left', borderRadius: 9, border: `1px solid ${off ? t.border : 'transparent'}`, background: off ? 'transparent' : `color-mix(in oklch, ${learnCol} 16%, ${t.surface})`, borderLeft: off ? `1px solid ${t.border}` : `3px solid ${learnCol}`, opacity: off ? 0.45 : 1, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <span style={{ fontSize: 12.5, fontWeight: 650, color: t.text, textDecoration: off ? 'line-through' : 'none', lineHeight: 1.25 }}>{c.title}</span>
                          <span style={{ fontSize: 10.5, color: t.faint, marginTop: 2 }}>{c.loc}</span>
                        </button>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>

              {/* 重复范围确认 */}
              <div style={{ fontSize: 12.5, fontWeight: 650, color: t.faint, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 9 }}>每周重复到什么时候？</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                {recurOpts.map((o) => {
                  const on = recurKey === o.key;
                  return (
                    <button key={o.key} onClick={() => setRecurKey(o.key)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 13px', cursor: 'pointer', font: 'inherit', borderRadius: t.radius - 4, border: `1.5px solid ${on ? t.accentText : t.border}`, background: on ? t.accentSoft : t.surface, textAlign: 'left' }}>
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
              {recurKey === 'custom' && (
                <input type="date" value={customUntil} min={window.VL.todayISO()}onChange={(e) => setCustomUntil(e.target.value)} style={{ width: '100%', height: 40, padding: '0 13px', borderRadius: t.radius - 4, border: `1px solid ${t.border}`, background: t.bg, color: t.text, font: 'inherit', fontSize: 13.5, outline: 'none', marginBottom: 4 }} />
              )}
              {recurKey === 'later' && (
                <div style={{ display: 'flex', gap: 9, padding: 11, borderRadius: t.radius - 4, background: t.surface2 }}>
                  <Icon name="bell" size={15} color={t.faint} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: 12, lineHeight: 1.55, color: t.muted }}>先按本学期暂存，<b>不影响现在就用</b>。等你知道确切的结课日期，随时在日历顶部或课程详情里补上。</div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <Btn t={t} kind="ghost" onClick={() => { setPhase('listening'); setRun((r) => r + 1); }} style={{ flex: 1 }}>重新上传</Btn>
                <Btn t={t} kind="primary" icon="check" onClick={() => { if (liveCourses.length && onCourses) onCourses(liveCourses, courseRepeat); if (liveCourses.length) onClose(); }} style={{ flex: 2, opacity: liveCourses.length ? 1 : 0.5, pointerEvents: liveCourses.length ? 'auto' : 'none' }}>
                  {courseRepeat.until ? `加入课表 · 每周至 ${courseRepeat.untilText}` : `加入课表 · 范围之后再补`}（{liveCourses.length}）
                </Btn>
              </div>
            </div>
          )}

          {phase === 'preview' && draft && (
            <div style={{ animation: 'vlin .25s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2px 30px 12px 2px' }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: t.text }}>解析结果</span><Chip t={t} color={engine.color} soft icon="sparkle">{engine.label}</Chip>
              </div>
              {transcript && <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderRadius: t.radius - 4, background: t.surface2, marginBottom: 10 }}><Icon name="mic" size={15} color={t.faint} style={{ marginTop: 2, flexShrink: 0 }} /><span style={{ fontSize: 13, color: t.muted, lineHeight: 1.5 }}>{transcript}</span></div>}
              {transcript && (() => {
                const tr = window.VL.speechTrust(transcript);
                if (!tr.fillers && !tr.corrected) return null;
                return <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', borderRadius: t.radius - 4, background: t.accentSoft, marginBottom: 12 }}><Icon name="sparkle" size={14} color={t.accentText} style={{ flexShrink: 0 }} /><span style={{ fontSize: 12.5, color: t.accentText, lineHeight: 1.5 }}>已清理 {tr.fillers} 处口头语{tr.corrected ? ' · 识别到一次更正' : ''} · 已帮你理清意图</span></div>;
              })()}
              {(() => {
                const dayEvs = dayEventsFor ? dayEventsFor(draft.dateKey) : [];
                const conflict = window.VL.overlaps(dayEvs, { id: '__new', t: draft.time, dur: draft.dur });
                if (!conflict.length) return null;
                const C = conflict[0];
                const newSlots = window.VL.suggestSlots(dayEvs, { id: '__new', t: draft.time, dur: draft.dur });
                const oldSlots = window.VL.suggestSlots(dayEvs.filter((e) => e.id !== C.id).concat([{ id: '__new', t: draft.time, dur: draft.dur }]), C);
                const amber = 'oklch(0.72 0.15 70)';
                return (
                  <div style={{ padding: 12, borderRadius: t.radius - 2, marginBottom: 12, background: `color-mix(in oklch, ${amber} 12%, transparent)`, border: `1px solid color-mix(in oklch, ${amber} 32%, transparent)` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}><Icon name="bolt" size={16} color={'oklch(0.6 0.15 60)'} /><span style={{ fontSize: 13.5, fontWeight: 650, color: t.text }}>和「{conflict.map((c) => c.title).join('、')}」{C.t} 撞了，怎么办？</span></div>
                    <div style={{ fontSize: 12, color: t.faint, margin: '0 0 5px' }}>把『{draft.title}』错开到：</div>
                    <window.SlotSuggestions t={t} slots={newSlots} onPick={(s) => { setDraft((dr) => ({ ...dr, time: s.time })); setExistResched(null); }} />
                    {oldSlots && oldSlots.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 12, color: t.faint, margin: '0 0 5px' }}>或把『{C.title}』挪到：</div>
                        <window.SlotSuggestions t={t} slots={oldSlots} onPick={(s) => setExistResched({ id: C.id, title: C.title, time: s.time })} />
                      </div>
                    )}
                    {existResched && existResched.id === C.id && (<div style={{ marginTop: 9, fontSize: 12.5, color: t.accentText, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="check" size={13} color={t.accentText} />确认后把『{existResched.title}』挪到 {existResched.time}</div>)}
                    <div style={{ fontSize: 12, color: t.faint, marginTop: 9 }}>不想动？直接「加入日程」= 两个都留。</div>
                  </div>
                );
              })()}
              <div style={{ border: `1px solid ${t.border}`, borderRadius: t.radius, overflow: 'hidden', background: t.raised }}>
                {field('标题', <span ref={titleRef} contentEditable suppressContentEditableWarning style={{ fontSize: 16, fontWeight: 650, color: t.text, outline: 'none', borderRadius: 4, padding: '1px 3px', margin: '0 -3px', display: 'inline-block' }}>{draft.title}</span>, 'pencil')}
                {field('日期', <div><input type="date" value={draftISO} onChange={(e) => setDraftDate(e.target.value)} style={inputStyle} /><div style={{ fontSize: 12.5, color: t.faint, marginTop: 1 }}>{draft.dateText}</div></div>, 'clock')}
                {field('时间', <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>{[['at', '精确'], ['period', '时段'], ['allday', '全天'], ['untimed', '随手记']].map(([k, lab]) => { const on = window.VL.timeMode(draft) === k; return <button key={k} onClick={() => setDraft((dr) => { const nx = { ...dr, timeMode: k }; if (k === 'period') { nx.daypart = dr.daypart || 'afternoon'; const dp = window.VL.daypartOf(nx.daypart); nx.time = dp ? dp.rep : '15:00'; nx.dur = 0; } else if (k === 'allday') { nx.time = '00:00'; nx.dur = 0; } else if (k === 'untimed') { nx.dur = 0; } else { nx.dur = dr.dur || 60; } return nx; })} style={{ height: 28, padding: '0 11px', borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 12.5, fontWeight: 600, border: `1px solid ${on ? 'transparent' : t.border}`, background: on ? t.accentSoft : 'transparent', color: on ? t.accentText : t.muted }}>{lab}</button>; })}</div>
                  {window.VL.timeMode(draft) === 'at' && <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><input type="time" value={draft.time} onChange={(e) => { const v = e.target.value; if (v) setDraft((dr) => ({ ...dr, time: v })); }} style={{ ...inputStyle, fontSize: 15.5 }} /><span style={{ color: t.faint }}>到</span><input type="time" value={window.VL.endTime(draft.time, draft.dur)} onChange={(e) => { const v = e.target.value; if (!v) return; const [sh, sm] = draft.time.split(':').map(Number); const [eh, em] = v.split(':').map(Number); let d = (eh * 60 + em) - (sh * 60 + sm); if (d <= 0) d += 1440; setDraft((dr) => ({ ...dr, dur: d })); }} style={{ ...inputStyle, fontSize: 15.5 }} /><span style={{ fontSize: 12, color: t.faint }}>· {draft.dur}分</span></div>}
                  {window.VL.timeMode(draft) === 'period' && <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>{window.VL.DAYPARTS.map((d) => { const on = draft.daypart === d.key; return <button key={d.key} onClick={() => setDraft((dr) => ({ ...dr, daypart: d.key, time: (window.VL.daypartOf(d.key) || {}).rep || '15:00' }))} style={{ height: 28, padding: '0 11px', borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 12.5, fontWeight: 600, border: `1px solid ${on ? 'transparent' : t.border}`, background: on ? t.accentSoft : 'transparent', color: on ? t.accentText : t.muted }}>{d.label}</button>; })}</div>}
                  {(window.VL.timeMode(draft) === 'allday' || window.VL.timeMode(draft) === 'untimed') && <span style={{ fontSize: 12.5, color: t.faint }}>{window.VL.timeMode(draft) === 'allday' ? '贯穿一整天，不占具体时段' : '只记一笔，不设时间'}</span>}
                </div>, 'clock')}
                {field('地点', <span style={{ fontSize: 15, color: draft.loc ? t.text : t.faint }}>{draft.loc || '未识别 · 可不填'}</span>, 'pin')}
                {field('提醒', <div style={{ display: 'flex', gap: 6 }}>{[0, 15, 30].map((m) => <button key={m} onClick={() => setDraft({ ...draft, reminder: m })} style={{ height: 28, padding: '0 11px', borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 12.5, fontWeight: 600, border: `1px solid ${draft.reminder === m ? 'transparent' : t.border}`, background: draft.reminder === m ? t.accentSoft : 'transparent', color: draft.reminder === m ? t.accentText : t.muted }}>{m === 0 ? '不提醒' : `提前${m}分`}</button>)}</div>)}
                {field('类别', <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{CATS.map((c) => { const on = draft.cat === c; return <button key={c} onClick={() => setDraft({ ...draft, cat: c })} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 28, padding: '0 10px', borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 12.5, fontWeight: 600, border: `1px solid ${on ? 'transparent' : t.border}`, background: on ? `color-mix(in oklch, ${catColor(t, c)} 16%, transparent)` : 'transparent', color: on ? t.text : t.muted }}><Dot color={catColor(t, c)} size={7} />{catLabel(t, c)}</button>; })}</div>, null, true)}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <Btn t={t} kind="ghost" icon="redo" onClick={() => setRun((r) => r + 1)} style={{ flex: 1 }}>重说</Btn>
                <Btn t={t} kind="primary" icon="check" onClick={() => { const title = titleRef.current ? titleRef.current.textContent.trim() : draft.title; onConfirm({ ...draft, title: title || draft.title }, existResched ? [{ id: existResched.id, time: existResched.time }] : null); }} style={{ flex: 2 }}>加入日程</Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  window.WebVoiceModal = WebVoiceModal;
})();
