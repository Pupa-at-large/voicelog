/* VoiceLog · 日程主页 + 语音建程 + 提醒 + 滑动操作 + 编辑 */
(function () {
  const { useState, useEffect, useRef } = React;
  const { Icon, Card, Btn, Chip, Dot, Sheet, catColor, catLabel } = window;
  const CATS_ORDER = ['meet', 'deep', 'life', 'learn', 'misc'];

  if (!document.getElementById('vl-anim')) {
    const s = document.createElement('style');
    s.id = 'vl-anim';
    s.textContent = `
      @keyframes vlbar{0%,100%{transform:scaleY(.28)}50%{transform:scaleY(1)}}
      @keyframes vlpulse{0%{transform:scale(1);opacity:.5}70%{transform:scale(2.1);opacity:0}100%{opacity:0}}
      @keyframes vlspin{to{transform:rotate(360deg)}}
      @keyframes vlin{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
      @media (prefers-reduced-motion:reduce){[data-vlbar]{animation:none!important;transform:scaleY(.6)!important}}`;
    document.head.appendChild(s);
  }

  function Waveform({ color, active, n = 28 }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 64 }}>
        {Array.from({ length: n }).map((_, i) => {
          const seed = (Math.sin(i * 1.7) + 1) / 2;
          return (
            <div key={i} data-vlbar style={{
              width: 4, height: 52, borderRadius: 999, background: color, transformOrigin: 'center',
              opacity: active ? 1 : 0.4,
              animation: active ? `vlbar ${0.7 + seed * 0.7}s ease-in-out ${i * 0.045}s infinite` : 'none',
              transform: active ? undefined : `scaleY(${0.2 + seed * 0.5})`,
            }} />
          );
        })}
      </div>
    );
  }

  // ── 语音建程：真实识别优先，失败自动回退示例 ──
  function VoiceOverlay({ t, open, openMode, onClose, onConfirm, aiEngine, app }) {
    const V = window.VL.data.voice;
    const [phase, setPhase] = useState('listening'); // listening | parsing | preview | extracting | extracted
    const [engineUsed, setEngineUsed] = useState(null); // 实际用了哪个引擎：'ai' | 'rule' | null
    const [existResched, setExistResched] = useState(null); // 冲突时选择"挪旧的"：{id,title,time}
    const [heardNothing, setHeardNothing] = useState(false); // 没识别到内容：停在监听屏给重试/上传，不再凭空造日程
    const [typedText, setTypedText] = useState(''); // 打字输入(语音不可用时的退路 + 引导第一步)
    const [transcript, setTranscript] = useState('');
    const [reflectText, setReflectText] = useState(''); // 语音/打字复盘内容
    const [srcText, setSrcText] = useState(''); // 待执行清单的"原话"（可编辑，改完重新解析）
    const srcOrig = useRef(''); // 原话编辑前的值，用于学习纠错（X→Y）
    const [mode, setMode] = useState('real'); // real | demo
    const [draft, setDraft] = useState(null);
    const [run, setRun] = useState(0);
    const [uploadName, setUploadName] = useState('');
    const [extracted, setExtracted] = useState([]);
    const [batchActions, setBatchActions] = useState([]);
    const [batchSel, setBatchSel] = useState([]);
    // 云端是否"热"过：首次成功连上后端后记住，之后不再显示"首次唤醒要等几十秒"
    const [warmed, setWarmed] = useState(() => { try { return !!localStorage.getItem('voicelog:warmed'); } catch (e) { return false; } });
    const markWarmed = () => { setWarmed(true); try { localStorage.setItem('voicelog:warmed', '1'); } catch (e) {} };
    const R = useRef({});
    const titleRef = useRef(null);
    const fileRef = useRef(null);
    const camRef = useRef(null);
    const utRef = useRef(0);

    const onPickFile = (e) => {
      const f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!f) return;
      try { R.current.rec && R.current.rec.stop && R.current.rec.stop(); } catch (x) {}
      R.current.phase = 'upload'; R.current.fellBack = true;
      clearInterval(R.current.sim); clearTimeout(R.current.t1); clearTimeout(R.current.t2);
      setUploadName(f.name); setPhase('extracting');
      clearTimeout(utRef.current);
      utRef.current = setTimeout(() => {
        setExtracted(window.VL.data.upload.map((x, i) => ({ ...x, _id: 'x' + i, _sel: true })));
        setPhase('extracted');
      }, 1500);
    };

    useEffect(() => {
      if (!open) return;
      const ctx = R.current = { phase: 'listening', fellBack: false, finalText: '', parsing: false };
      setPhase('listening'); setTranscript(''); setDraft(null); setEngineUsed(null); setExistResched(null); setHeardNothing(false);
      const setP = (p) => { ctx.phase = p; setPhase(p); };

      // 上传入口：不自动听，直接进"拍照/上传"选择屏
      if (openMode === 'upload') { setPhase('uploadStart'); return () => { clearTimeout(utRef.current); }; }
      ctx.reflectMode = (openMode === 'reflect'); // 复盘模式：说完不建日程，存为"我的复盘"

      const showActs = (acts) => {
        if (acts.length === 1 && acts[0].kind === 'create') { setDraft(acts[0].draft); setP('preview'); }
        else { setBatchActions(acts); setBatchSel(acts.map(() => true)); setP('batch'); }
      };
      const ruleParse = (text, curated) => {
        if (!curated) setEngineUsed('rule');
        // 多意图：一段话里多条 → 走「待执行清单」
        if (!curated && window.VL.parseBatch) { const acts = window.VL.parseBatch(text); if (acts.length > 1) { ctx.parsing = true; setBatchActions(acts); setBatchSel(acts.map(() => true)); setP('batch'); return; } }
        ctx.parsing = true;
        setP('parsing');
        ctx.t1 = setTimeout(() => {
          let d = curated || (window.VL.parse ? window.VL.parse(text) : { ...V.parsed });
          if (!d || !d.title) d = { ...V.parsed };
          setDraft(d); setP('preview');
        }, 850);
      };
      const startParse = async (text, curated) => {
        if (ctx.parsing) return;
        if (!curated) { text = window.VL.corrections.apply(text); setSrcText(text); srcOrig.current = text; } // 先过纠错词典，并留作可编辑原话
        // 复盘模式 / 识别到"我想复盘一下"意图 → 不建日程，转成"我的复盘"
        if (!curated && (ctx.reflectMode || (window.VL.isReflectIntent && window.VL.isReflectIntent(text)))) {
          ctx.parsing = true;
          setReflectText(ctx.reflectMode ? text : window.VL.stripReflectTrigger(text));
          setEngineUsed('reflect'); setP('reflect');
          return;
        }
        // 开启「AI 解析」且配置了后端 → 先走千问真·AI 解析；失败/未配置自动回退本地规则引擎
        if (!curated && aiEngine && window.VL.serverUrl && window.VL.parseRemote) {
          ctx.parsing = true; setP('parsing');
          try {
            const acts = await window.VL.parseRemote(text, app ? window.VL.candidateEvents(app.events) : []);
            if (ctx.phase !== 'parsing') return; // 解析期间已关闭/切换
            setEngineUsed('ai'); markWarmed(); showActs(acts); return;
          } catch (e) { ctx.parsing = false; /* 回退规则引擎，下面会标记 rule */ }
        }
        ruleParse(text, curated);
      };
      // 没识别到内容：停在监听屏给"重试/上传/看示例"，绝不凭空造一条假日程
      const noSpeech = () => {
        if (ctx.fellBack) return; ctx.fellBack = true;
        clearInterval(ctx.sim); clearTimeout(ctx.t2); setHeardNothing(true);
      };
      // 仅供「看示例」按钮显式调用：模拟一段口语 + 解析（演示用，不会自动触发）
      const playExample = () => {
        ctx.fellBack = true; ctx.real = false; setHeardNothing(false);
        setMode('demo'); setTranscript('');
        let i = 0;
        ctx.sim = setInterval(() => {
          i += 1; setTranscript(V.chunks.slice(0, i).join(''));
          if (i >= V.chunks.length) { clearInterval(ctx.sim); ctx.sim = null; ctx.t2 = setTimeout(() => startParse(V.phrase, { ...V.parsed }), 620); }
        }, 600);
      };
      ctx.example = playExample;
      ctx.stop = () => {
        if (ctx.real && ctx.rec) { try { ctx.rec.stop(); } catch (e) {} }
        else { noSpeech(); }
      };

      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      let started = false;
      if (SR) {
        try {
          const rec = new SR(); ctx.rec = rec; ctx.real = true; setMode('real');
          rec.lang = 'zh-CN'; rec.interimResults = true; rec.continuous = true; rec.maxAlternatives = 1; // continuous=true：长句/多条补录不会说一半被截断，直到点停止
          rec.onresult = (e) => {
            let final = '', interim = '';
            for (let k = 0; k < e.results.length; k++) {
              const r = e.results[k];
              if (r.isFinal) final += r[0].transcript; else interim += r[0].transcript;
            }
            ctx.finalText = final; ctx.interimText = interim; setTranscript(final + interim);
          };
          rec.onerror = () => noSpeech();
          rec.onend = () => {
            if (ctx.phase !== 'listening') return;
            // 手动停止时引擎常还没"定稿"，用 interim 兜底；真没内容则进"没听清"，不造假
            const txt = (ctx.finalText || ctx.interimText || '').trim();
            if (txt) startParse(txt, null); else if (!ctx.fellBack) noSpeech();
          };
          rec.start(); started = true;
        } catch (e) { started = false; }
      }
      if (!started) { if (ctx.reflectMode) { setReflectText(''); setPhase('reflect'); } else { ctx.real = false; setMode('demo'); noSpeech(); } }

      return () => {
        try { ctx.rec && ctx.rec.stop && ctx.rec.stop(); } catch (e) {}
        clearInterval(ctx.sim); clearTimeout(ctx.t1); clearTimeout(ctx.t2); clearTimeout(utRef.current);
      };
    }, [open, run]);

    // 徽章诚实化：显示"实际用了哪个引擎"——开了 AI 但云端没响应回退时，明确标注
    const isManual = engineUsed === 'manual';
    const engineOn = engineUsed && engineUsed !== 'manual' ? engineUsed === 'ai' : (isManual ? false : aiEngine);
    const engine = isManual
      ? { label: '手动填写', color: t.muted }
      : engineOn
        ? { label: 'AI 解析', color: 'oklch(0.62 0.15 150)' }
        : { label: (engineUsed === 'rule' && aiEngine) ? '规则解析 · 云端未响应' : '规则解析', color: 'oklch(0.70 0.14 70)' };
    const blankDraft = () => ({ title: '新日程', dateKey: window.VL.todayKey(), dateText: window.VL.dateText(window.VL.todayKey(), '今天'), time: '09:00', dur: 60, loc: null, reminder: 0, cat: 'misc', urgent: false, important: false });
    const openManual = () => { setEngineUsed('manual'); setDraft(blankDraft()); setPhase('preview'); };
    const openTyping = () => { setTypedText(''); setPhase('typing'); };
    // 从一次原话编辑里学到一条纠错（提取唯一被改动的那一小段 X→Y）
    const learnEdit = (oldT, newT) => {
      if (!oldT || oldT === newT) return;
      let i = 0; while (i < oldT.length && i < newT.length && oldT[i] === newT[i]) i++;
      let j = 0; while (j < oldT.length - i && j < newT.length - i && oldT[oldT.length - 1 - j] === newT[newT.length - 1 - j]) j++;
      const wrong = oldT.slice(i, oldT.length - j), right = newT.slice(i, newT.length - j);
      if (wrong && right && wrong.length <= 12 && right.length <= 12) window.VL.corrections.add(wrong, right);
    };
    // 打字解析(组件作用域,供"打字输入"/"重新解析"用;语音路径仍走 effect 里的 startParse)
    const doParse = async (text) => {
      let txt = (text || '').trim(); if (!txt) return;
      txt = window.VL.corrections.apply(txt); setSrcText(txt); srcOrig.current = txt;
      if (aiEngine && window.VL.serverUrl && window.VL.parseRemote) {
        setEngineUsed(null); setPhase('parsing');
        try {
          const acts = await window.VL.parseRemote(txt, app ? window.VL.candidateEvents(app.events) : []);
          setEngineUsed('ai'); markWarmed();
          if (acts.length === 1 && acts[0].kind === 'create') { setDraft(acts[0].draft); setPhase('preview'); }
          else { setBatchActions(acts); setBatchSel(acts.map(() => true)); setPhase('batch'); }
          return;
        } catch (e) { /* 回退规则 */ }
      }
      setEngineUsed('rule');
      const acts = window.VL.parseBatch ? window.VL.parseBatch(txt) : [];
      if (acts.length > 1) { setBatchActions(acts); setBatchSel(acts.map(() => true)); setPhase('batch'); return; }
      const d = window.VL.parse ? window.VL.parse(txt) : null;
      if (d && d.title) { setDraft(d); setPhase('preview'); } else { setPhase('typing'); }
    };

    const field = (label, value, opts) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderBottom: opts && opts.last ? 'none' : `1px solid ${t.border}` }}>
        <span style={{ fontSize: 13.5, color: t.faint, width: 44, flexShrink: 0 }}>{label}</span>
        <div style={{ flex: 1, minWidth: 0 }}>{value}</div>
        {opts && opts.icon && <Icon name={opts.icon} size={15} color={t.faint} />}
      </div>
    );

    // 预览可编辑日期/时间：把"解析对不对"交给用户当场纠正后再加入
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

    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 50, pointerEvents: open ? 'auto' : 'none' }}>
        <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(8,10,14,0.46)', opacity: open ? 1 : 0, transition: 'opacity .3s' }} />
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, background: t.surface,
          borderTopLeftRadius: t.radius + 14, borderTopRightRadius: t.radius + 14, boxShadow: t.shadowLg,
          transform: open ? 'translateY(0)' : 'translateY(101%)', transition: 'transform .4s cubic-bezier(.32,.72,0,1)',
          padding: '12px 20px calc(20px + 22px)', minHeight: (phase === 'preview' || phase === 'batch') ? 'auto' : 420,
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ width: 38, height: 5, borderRadius: 999, background: t.borderStrong, margin: '0 auto 6px' }} />
          <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt" style={{ display: 'none' }} onChange={onPickFile} />
          <input ref={camRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onPickFile} />

          {phase === 'uploadStart' && (
            <div style={{ display: 'flex', flexDirection: 'column', padding: '16px 4px 6px' }}>
              <div style={{ textAlign: 'center', marginBottom: 18 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: t.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><Icon name="plus" size={26} color={t.accentText} /></div>
                <div style={{ fontSize: 18, fontWeight: 720, color: t.text }}>添加日程</div>
                <div style={{ fontSize: 12.5, color: t.faint, marginTop: 5, lineHeight: 1.5 }}>拍照 / 上传识别，或手动填写；也可点麦克风说一句</div>
              </div>
              <button onClick={() => camRef.current && camRef.current.click()} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, height: 50, borderRadius: 14, cursor: 'pointer', border: 'none', background: t.accent, color: t.onAccent, font: 'inherit', fontSize: 15, fontWeight: 700, boxShadow: t.shadow, marginBottom: 10 }}><Icon name="image" size={19} color={t.onAccent} />拍照（课表 / 白板）</button>
              <button onClick={() => fileRef.current && fileRef.current.click()} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, height: 50, borderRadius: 14, cursor: 'pointer', border: `1px solid ${t.border}`, background: t.surface2, color: t.text, font: 'inherit', fontSize: 15, fontWeight: 650, marginBottom: 10 }}><Icon name="export" size={18} color={t.accentText} />从相册 / 文件选择</button>
              <button onClick={openTyping} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, height: 50, borderRadius: 14, cursor: 'pointer', border: `1px solid ${t.border}`, background: t.surface2, color: t.text, font: 'inherit', fontSize: 15, fontWeight: 650, marginBottom: 10 }}><Icon name="sparkle" size={18} color={t.accentText} />打字一句 · AI 解析</button>
              <button onClick={openManual} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, height: 50, borderRadius: 14, cursor: 'pointer', border: `1px solid ${t.border}`, background: t.surface2, color: t.text, font: 'inherit', fontSize: 15, fontWeight: 650 }}><Icon name="pencil" size={18} color={t.accentText} />手动填写一条</button>
              <button onClick={onClose} style={{ marginTop: 16, height: 40, borderRadius: 12, cursor: 'pointer', border: 'none', background: 'transparent', color: t.muted, font: 'inherit', fontSize: 13.5, fontWeight: 600 }}>取消</button>
              <div style={{ fontSize: 11.5, color: t.faint, textAlign: 'center', marginTop: 6 }}>提示：拍照/上传现在是演示样例，真识别接入视觉模型后生效</div>
            </div>
          )}

          {phase === 'typing' && (
            <div style={{ display: 'flex', flexDirection: 'column', padding: '14px 4px 6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Icon name="sparkle" size={17} color={t.accentText} />
                <span style={{ fontSize: 18, fontWeight: 720, color: t.text }}>打一句话，AI 帮你建</span>
              </div>
              <div style={{ fontSize: 12.5, color: t.faint, margin: '0 0 12px 25px' }}>像说话那样写,不用工整,它会理清</div>
              <textarea value={typedText} onChange={(e) => setTypedText(e.target.value)} autoFocus rows={3} placeholder="例如：明天下午三点跟老王在公司开会，提前半小时提醒" style={{ width: '100%', resize: 'none', padding: '12px 13px', borderRadius: t.radius, border: `1px solid ${t.border}`, background: t.surface2, color: t.text, font: 'inherit', fontSize: 15, lineHeight: 1.5, outline: 'none' }} />
              <button onClick={() => setTypedText('明天下午三点跟老王开会')} style={{ alignSelf: 'flex-start', marginTop: 8, padding: '5px 11px', borderRadius: 999, border: `1px solid ${t.border}`, background: 'transparent', cursor: 'pointer', font: 'inherit', fontSize: 12.5, color: t.muted }}>用这句试试</button>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <Btn t={t} kind="ghost" onClick={() => setPhase('uploadStart')} style={{ flex: 1 }}>返回</Btn>
                <Btn t={t} kind="primary" icon="sparkle" onClick={() => doParse(typedText)} style={{ flex: 2 }}>解析</Btn>
              </div>
            </div>
          )}

          {phase === 'reflect' && (
            <div style={{ display: 'flex', flexDirection: 'column', padding: '14px 4px 6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Icon name="sparkle" size={17} color={t.accentText} />
                <span style={{ fontSize: 18, fontWeight: 720, color: t.text }}>今天的复盘</span>
              </div>
              <div style={{ fontSize: 12.5, color: t.faint, margin: '0 0 12px 25px' }}>说说今天的想法、感受、收获——这是给你自己的记录，不会被解析成日程</div>
              <textarea value={reflectText} onChange={(e) => setReflectText(e.target.value)} autoFocus rows={5} placeholder="例如：今天效率不错，专注写完了报告；晚上有点累，明天想早点睡。" style={{ width: '100%', resize: 'none', padding: '12px 13px', borderRadius: t.radius, border: `1px solid ${t.border}`, background: t.surface2, color: t.text, font: 'inherit', fontSize: 15, lineHeight: 1.6, outline: 'none' }} />
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <Btn t={t} kind="ghost" onClick={onClose} style={{ flex: 1 }}>取消</Btn>
                <Btn t={t} kind="primary" icon="check" onClick={() => { if (app && reflectText.trim()) app.saveReflection(window.VL.todayKey(), reflectText.trim()); onClose(); }} style={{ flex: 2 }}>存为今天的复盘</Btn>
              </div>
            </div>
          )}

          {phase === 'listening' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '18px 0 8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <Dot color={heardNothing ? t.muted : 'oklch(0.62 0.2 25)'} ring={!heardNothing} />
                <span style={{ fontSize: 15, fontWeight: 600, color: t.text }}>{heardNothing ? '没听清' : '正在听…'}</span>
                <Chip t={t} color={mode === 'real' ? engine.color : t.muted} soft>{mode === 'real' ? '手机语音识别' : '示例演示'}</Chip>
              </div>
              <Waveform color={t.accent} active={!heardNothing} />
              <p style={{ marginTop: 20, fontSize: heardNothing ? 15 : 19, lineHeight: 1.5, color: (transcript && !heardNothing) ? t.text : t.faint, textAlign: 'center', fontWeight: 500, minHeight: 58, letterSpacing: 0.2 }}>
                {heardNothing ? '没识别到内容。点下面「重新听」再说一次，或上传文件 / 改用打字。' : (transcript || '说出你的安排，例如「明天下午三点跟老王开会」')}
                {transcript && !heardNothing && <span style={{ display: 'inline-block', width: 2, height: 20, background: t.accent, marginLeft: 1, verticalAlign: -3, animation: 'vlbar 1s steps(1) infinite' }} />}
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 22, alignItems: 'center' }}>
                <button onClick={onClose} style={{ width: 48, height: 48, borderRadius: 999, border: `1px solid ${t.borderStrong}`, background: 'transparent', color: t.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={20} color={t.muted} /></button>
                <button onClick={() => (heardNothing ? setRun((r) => r + 1) : (R.current.stop && R.current.stop()))} style={{ width: 66, height: 66, borderRadius: 999, border: 'none', cursor: 'pointer', background: t.accent, color: t.onAccent, boxShadow: t.shadowLg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {heardNothing ? <Icon name="mic" size={28} color={t.onAccent} /> : <div style={{ width: 22, height: 22, borderRadius: 6, background: t.onAccent }} />}
                </button>
                <div style={{ width: 48 }} />
              </div>
              <span style={{ fontSize: 12.5, color: t.faint, marginTop: 12 }}>{heardNothing ? '点这里重新听' : '说完点「停止」· 长句、多条都能说'}</span>
              {heardNothing && <button onClick={openTyping} style={{ marginTop: 10, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', font: 'inherit', fontSize: 13.5, fontWeight: 700, color: t.accentText }}>改用打字</button>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', margin: '16px 0 2px' }}>
                <div style={{ flex: 1, height: 1, background: t.border }} />
                <span style={{ fontSize: 12.5, color: t.faint }}>或</span>
                <div style={{ flex: 1, height: 1, background: t.border }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, width: '100%', marginTop: 6 }}>
                <button onClick={() => fileRef.current && fileRef.current.click()} style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 42, padding: '0 18px',
                  borderRadius: 999, cursor: 'pointer', border: `1px solid ${t.border}`, background: t.surface2,
                  color: t.text, font: 'inherit', fontSize: 13.5, fontWeight: 600,
                }}>
                  <Icon name="export" size={17} color={t.accentText} />上传文件 / 图片，让 AI 提取日程
                </button>
              </div>
            </div>
          )}

          {phase === 'parsing' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 18 }}>
              <div style={{ width: 40, height: 40, borderRadius: 999, border: `3px solid ${t.chartTrack}`, borderTopColor: t.accent, animation: 'vlspin .8s linear infinite' }} />
              <span style={{ fontSize: 15, fontWeight: 600, color: t.text }}>正在解析…</span>
              <Chip t={t} color={engine.color} soft icon="sparkle">{engine.label}</Chip>
              {aiEngine && !engineUsed && !warmed && <span style={{ fontSize: 12.5, color: t.faint, marginTop: -4 }}>首次唤醒云端可能要等几十秒…</span>}
            </div>
          )}

          {phase === 'extracting' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '54px 0', gap: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 999, border: `3px solid ${t.chartTrack}`, borderTopColor: t.accent, animation: 'vlspin .8s linear infinite' }} />
              <span style={{ fontSize: 15, fontWeight: 600, color: t.text }}>AI 正在提取日程…</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, maxWidth: '80%' }}>
                <Icon name="doc" size={14} color={t.faint} />
                <span style={{ fontSize: 12.5, color: t.faint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{uploadName}</span>
              </div>
              <Chip t={t} color={'oklch(0.62 0.15 150)'} soft icon="sparkle">大模型解析</Chip>
            </div>
          )}

          {phase === 'extracted' && (
            <div style={{ animation: 'vlin .3s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 2px 4px' }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: t.text }}>找到 {extracted.length} 个日程</span>
                <Chip t={t} color={'oklch(0.62 0.15 150)'} soft icon="sparkle">大模型解析</Chip>
              </div>
              <div style={{ display: 'flex', gap: 7, padding: '8px 12px', borderRadius: t.radius - 4, background: t.surface2, marginBottom: 12 }}>
                <Icon name="doc" size={14} color={t.faint} style={{ marginTop: 1, flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, color: t.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{uploadName} · 勾选要加入的项</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                {extracted.map((x) => (
                  <button key={x._id} onClick={() => setExtracted((arr) => arr.map((y) => y._id === x._id ? { ...y, _sel: !y._sel } : y))} style={{
                    display: 'flex', alignItems: 'center', gap: 11, padding: 12, cursor: 'pointer', textAlign: 'left', font: 'inherit',
                    borderRadius: t.radius, background: x._sel ? t.surface : t.surface2, border: `1.5px solid ${x._sel ? t.accentText : t.border}`,
                  }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, border: x._sel ? 'none' : `2px solid ${t.borderStrong}`, background: x._sel ? t.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{x._sel && <Icon name="check" size={14} color={t.onAccent} sw={2.6} />}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 650, color: t.text }}>{x.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12.5, color: t.muted }}>{x.dateText.split(' · ')[0]} {x.time}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: t.faint }}><Dot color={catColor(t, x.cat)} size={7} />{catLabel(t, x.cat)}</span>
                        {x.loc && <span style={{ fontSize: 12.5, color: t.faint }}>· {x.loc}</span>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <Btn t={t} kind="ghost" onClick={() => { setPhase('listening'); setRun((r) => r + 1); }} style={{ flex: 1 }}>重新上传</Btn>
                <Btn t={t} kind="primary" icon="check" onClick={() => { const sel = extracted.filter((x) => x._sel); if (sel.length) app.addExtracted(sel); onClose(); }} style={{ flex: 2 }}>加入选中（{extracted.filter((x) => x._sel).length}）</Btn>
              </div>
            </div>
          )}

          {phase === 'batch' && (
            <div style={{ animation: 'vlin .3s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 2px 6px' }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: t.text }}>待执行清单 · {batchActions.length} 条</span>
                <Chip t={t} color={t.accentText} soft icon="sparkle">多意图</Chip>
              </div>
              {srcText && (
                <div style={{ padding: '9px 11px', borderRadius: t.radius - 4, background: t.surface2, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Icon name="mic" size={13} color={t.faint} />
                    <span style={{ fontSize: 12.5, color: t.faint, fontWeight: 600 }}>识别到的原话（可改错字，改完重新解析）</span>
                  </div>
                  <textarea value={srcText} onChange={(e) => setSrcText(e.target.value)} rows={2} style={{ width: '100%', resize: 'none', border: `1px solid ${t.border}`, borderRadius: t.radius - 6, background: t.surface, color: t.text, font: 'inherit', fontSize: 13.5, lineHeight: 1.5, padding: '8px 10px', outline: 'none' }} />
                  <button onClick={() => { learnEdit(srcOrig.current, srcText); doParse(srcText); }} style={{ marginTop: 7, display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: '0 12px', borderRadius: 999, cursor: 'pointer', border: `1px solid ${t.border}`, background: t.surface, font: 'inherit', fontSize: 12.5, fontWeight: 650, color: t.accentText }}><Icon name="redo" size={14} color={t.accentText} />重新解析（并记住改动）</button>
                </div>
              )}
              <div style={{ display: 'flex', gap: 7, padding: '8px 12px', borderRadius: t.radius - 4, background: t.surface2, marginBottom: 12 }}>
                <Icon name="mic" size={14} color={t.faint} style={{ marginTop: 1, flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, color: t.muted, lineHeight: 1.5 }}>从一段话里识别出多条意图，核对后一起执行——不会替你静默操作。</span>
              </div>
              <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                <window.BatchReviewList t={t} actions={batchActions} sel={batchSel} onToggle={(i) => setBatchSel((s) => s.map((v, j) => (j === i ? !v : v)))} onEdit={(i, patch) => setBatchActions((acts) => acts.map((a, j) => (j === i ? { ...a, title: patch.title !== undefined ? patch.title : a.title, draft: { ...a.draft, ...patch } } : a)))} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <Btn t={t} kind="ghost" icon="redo" onClick={() => setRun((r) => r + 1)} style={{ flex: 1 }}>重说</Btn>
                <Btn t={t} kind="primary" icon="check" onClick={() => { const sel = batchActions.filter((_, i) => batchSel[i]); if (sel.length) app.applyBatch(sel); onClose(); }} style={{ flex: 2 }}>确认执行（{batchSel.filter(Boolean).length}）</Btn>
              </div>
            </div>
          )}

          {phase === 'preview' && draft && (
            <div style={{ animation: 'vlin .3s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 2px 12px' }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: t.text }}>{isManual ? '新建日程' : '解析结果'}</span>
                <Chip t={t} color={engine.color} soft icon="sparkle">{engine.label}</Chip>
              </div>
              {transcript && (
                <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderRadius: t.radius - 4, background: t.surface2, marginBottom: 10 }}>
                  <Icon name="mic" size={15} color={t.faint} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 13.5, color: t.muted, lineHeight: 1.5 }}>{transcript}</span>
                </div>
              )}
              {transcript && (() => {
                const tr = window.VL.speechTrust(transcript);
                if (!tr.fillers && !tr.corrected) return null;
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', borderRadius: t.radius - 4, background: t.accentSoft, marginBottom: 14 }}>
                    <Icon name="sparkle" size={14} color={t.accentText} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, color: t.accentText, lineHeight: 1.5 }}>已清理 {tr.fillers} 处口头语{tr.corrected ? ' · 识别到一次更正' : ''} · 已帮你理清意图</span>
                  </div>
                );
              })()}
              {(() => {
                if (!app || draft.status === 'done') return null; // 补录(已记录)允许并行重叠，不弹冲突
                const dayEvs = app.events[draft.dateKey] || [];
                const conflict = window.VL.overlaps(dayEvs, { id: '__new', t: draft.time, dur: draft.dur, timeMode: draft.timeMode, daypart: draft.daypart });
                if (!conflict.length) return null;
                const C = conflict[0];
                const newSlots = window.VL.suggestSlots(dayEvs, { id: '__new', t: draft.time, dur: draft.dur });
                const oldSlots = window.VL.suggestSlots(dayEvs.filter((e) => e.id !== C.id).concat([{ id: '__new', t: draft.time, dur: draft.dur }]), C);
                const amber = 'oklch(0.72 0.15 70)';
                // 弹窗只驱动一个目标：选一种解决冲突的方式（说教沉到复盘，绝不自动改）
                return (
                  <div style={{ padding: 12, borderRadius: t.radius - 2, marginBottom: 12, background: `color-mix(in oklch, ${amber} 12%, transparent)`, border: `1px solid color-mix(in oklch, ${amber} 32%, transparent)` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
                      <Icon name="bolt" size={16} color={'oklch(0.6 0.15 60)'} />
                      <span style={{ fontSize: 13.5, fontWeight: 650, color: t.text }}>和「{conflict.map((c) => c.title).join('、')}」{C.t} 撞了，怎么办？</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: t.faint, margin: '0 0 5px' }}>把『{draft.title}』错开到：</div>
                    <window.SlotSuggestions t={t} slots={newSlots} onPick={(s) => { setDraft((dr) => ({ ...dr, time: s.time })); setExistResched(null); }} />
                    {oldSlots && oldSlots.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 12.5, color: t.faint, margin: '0 0 5px' }}>或把『{C.title}』挪到：</div>
                        <window.SlotSuggestions t={t} slots={oldSlots} onPick={(s) => setExistResched({ id: C.id, title: C.title, time: s.time })} />
                      </div>
                    )}
                    {existResched && existResched.id === C.id && (
                      <div style={{ marginTop: 9, fontSize: 12.5, color: t.accentText, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="check" size={13} color={t.accentText} />确认后把『{existResched.title}』挪到 {existResched.time}</div>
                    )}
                    <div style={{ fontSize: 12.5, color: t.faint, marginTop: 9 }}>不想动？直接「加入日程」= 两个都留。</div>
                  </div>
                );
              })()}
              <div style={{ border: `1px solid ${t.border}`, borderRadius: t.radius, overflow: 'hidden', background: t.raised }}>
                {field('标题', (
                  <span ref={titleRef} contentEditable suppressContentEditableWarning style={{ fontSize: 15, fontWeight: 650, color: t.text, outline: 'none', borderRadius: 4, padding: '1px 3px', margin: '0 -3px', display: 'inline-block' }}>{draft.title}</span>
                ), { icon: 'pencil' })}
                {field('日期', (
                  <div>
                    <input type="date" value={draftISO} onChange={(e) => setDraftDate(e.target.value)} style={inputStyle} />
                    <div style={{ fontSize: 12.5, color: t.faint, marginTop: 1 }}>{draft.dateText}</div>
                  </div>
                ), { icon: 'clock' })}
                {field('时间', (
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                      {[['at', '精确'], ['period', '时段'], ['allday', '全天'], ['untimed', '随手记']].map(([k, lab]) => {
                        const on = window.VL.timeMode(draft) === k;
                        return <button key={k} onClick={() => setDraft((dr) => { const nx = { ...dr, timeMode: k }; if (k === 'period') { nx.daypart = dr.daypart || 'afternoon'; const dp = window.VL.daypartOf(nx.daypart); nx.time = dp ? dp.rep : '15:00'; nx.dur = 0; } else if (k === 'allday') { nx.time = '00:00'; nx.dur = 0; } else if (k === 'untimed') { nx.dur = 0; } else { nx.dur = dr.dur || 60; } return nx; })} style={{ height: 28, padding: '0 11px', borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 12.5, fontWeight: 600, border: `1px solid ${on ? 'transparent' : t.border}`, background: on ? t.accentSoft : 'transparent', color: on ? t.accentText : t.muted }}>{lab}</button>;
                      })}
                    </div>
                    {window.VL.timeMode(draft) === 'at' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <input type="time" value={draft.time} onChange={(e) => { const v = e.target.value; if (v) setDraft((dr) => ({ ...dr, time: v })); }} style={{ ...inputStyle, fontSize: 15 }} />
                        <span style={{ color: t.faint }}>到</span>
                        <input type="time" value={window.VL.endTime(draft.time, draft.dur)} onChange={(e) => { const v = e.target.value; if (!v) return; const [sh, sm] = draft.time.split(':').map(Number); const [eh, em] = v.split(':').map(Number); let d = (eh * 60 + em) - (sh * 60 + sm); if (d <= 0) d += 1440; setDraft((dr) => ({ ...dr, dur: d })); }} style={{ ...inputStyle, fontSize: 15 }} />
                        <span style={{ fontSize: 12.5, color: t.faint }}>· {draft.dur}分</span>
                      </div>
                    )}
                    {window.VL.timeMode(draft) === 'period' && (
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {window.VL.DAYPARTS.map((d) => { const on = draft.daypart === d.key; return <button key={d.key} onClick={() => setDraft((dr) => ({ ...dr, daypart: d.key, time: (window.VL.daypartOf(d.key) || {}).rep || '15:00' }))} style={{ height: 28, padding: '0 11px', borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 12.5, fontWeight: 600, border: `1px solid ${on ? 'transparent' : t.border}`, background: on ? t.accentSoft : 'transparent', color: on ? t.accentText : t.muted }}>{d.label}</button>; })}
                      </div>
                    )}
                    {(window.VL.timeMode(draft) === 'allday' || window.VL.timeMode(draft) === 'untimed') && <span style={{ fontSize: 12.5, color: t.faint }}>{window.VL.timeMode(draft) === 'allday' ? '贯穿一整天，不占具体时段' : '只记一笔，不设时间'}</span>}
                  </div>
                ), { icon: 'clock' })}
                {field('地点', <span style={{ fontSize: 15, color: draft.loc ? t.text : t.faint }}>{draft.loc || '未识别 · 可不填'}</span>, { icon: 'pin' })}
                {field('提醒', (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[0, 15, 30].map((m) => (
                      <button key={m} onClick={() => setDraft({ ...draft, reminder: m })} style={{ height: 28, padding: '0 11px', borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 12.5, fontWeight: 600, border: `1px solid ${draft.reminder === m ? 'transparent' : t.border}`, background: draft.reminder === m ? t.accentSoft : 'transparent', color: draft.reminder === m ? t.accentText : t.muted }}>{m === 0 ? '不提醒' : `提前${m}分`}</button>
                    ))}
                  </div>
                ))}
                {field('类别', (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {CATS_ORDER.map((c) => {
                      const on = draft.cat === c;
                      return (
                        <button key={c} onClick={() => setDraft({ ...draft, cat: c })} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 28, padding: '0 10px', borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 12.5, fontWeight: 600, border: `1px solid ${on ? 'transparent' : t.border}`, background: on ? `color-mix(in oklch, ${catColor(t, c)} 16%, transparent)` : 'transparent', color: on ? t.text : t.muted }}>
                          <Dot color={catColor(t, c)} size={7} />{catLabel(t, c)}
                        </button>
                      );
                    })}
                  </div>
                ), { last: true })}
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

  function ReminderBanner({ t, ev, onClose, onView }) {
    useEffect(() => { if (!ev) return; const tm = setTimeout(onClose, 6500); return () => clearTimeout(tm); }, [ev]);
    return (
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 60, padding: '52px 12px 0', transform: ev ? 'translateY(0)' : 'translateY(-130%)', transition: 'transform .42s cubic-bezier(.32,.72,0,1)', pointerEvents: ev ? 'auto' : 'none' }}>
        <div style={{ background: t.mode === 'dark' ? 'rgba(40,44,52,0.86)' : 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', borderRadius: 22, border: `1px solid ${t.border}`, boxShadow: t.shadowLg, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: t.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="bell" size={19} color={t.accentText} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: t.faint, fontWeight: 600 }}>{ev ? `提前 ${ev.reminder} 分钟 · ${window.VL.fmtTime(ev.t)}` : ''}</div>
              <div style={{ fontSize: 15, fontWeight: 650, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev ? ev.title : ''}{ev && ev.loc ? ` · ${ev.loc}` : ''}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>
            <Btn t={t} kind="ghost" size="sm" onClick={onClose} style={{ flex: 1 }}>知道了</Btn>
            <Btn t={t} kind="primary" size="sm" onClick={onView} style={{ flex: 1 }}>查看</Btn>
          </div>
        </div>
      </div>
    );
  }

  // ── 可滑动日程行：左滑「编辑/删除」，右滑「完成」 ──
  function SwipeRow({ t, ev, onToggle, onOpen, onEdit, onDelete, conflict, onWarn, onStar }) {
    const RIGHT = 144, LEFT = 96;
    const [tx, setTx] = useState(0);
    const [drag, setDrag] = useState(false);
    const d = useRef(null);
    const movedRef = useRef(false);
    const done = ev.status === 'done';
    const cancelled = ev.status === 'cancelled';
    const col = catColor(t, ev.cat);

    const down = (e) => { d.current = { x0: e.clientX, y0: e.clientY, base: tx, axis: null, moved: false }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) {} };
    const move = (e) => {
      if (!d.current) return;
      const dx = e.clientX - d.current.x0, dy = e.clientY - d.current.y0;
      if (!d.current.axis && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) d.current.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (d.current.axis === 'x') {
        d.current.moved = true; setDrag(true);
        setTx(Math.max(-RIGHT, Math.min(LEFT, d.current.base + dx)));
      }
    };
    const up = () => {
      if (!d.current) return;
      const moved = d.current.axis === 'x' && d.current.moved;
      setDrag(false);
      if (d.current.axis === 'x') setTx((v) => (v <= -RIGHT / 2 ? -RIGHT : v >= LEFT / 2 ? LEFT : 0));
      d.current = null; movedRef.current = moved;
    };
    const onClickCard = () => {
      if (movedRef.current) { movedRef.current = false; return; }
      if (tx !== 0) { setTx(0); return; }
      onOpen(ev);
    };

    return (
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ width: 48, flexShrink: 0, textAlign: 'right', paddingTop: 14 }}>
          <div style={{ fontSize: window.VL.timeMode(ev) === 'at' ? 15 : 13, fontWeight: 650, color: done || cancelled ? t.faint : t.text, fontVariantNumeric: 'tabular-nums' }}>{window.VL.timeLabel(ev) || '随手'}</div>
          {window.VL.timeMode(ev) === 'at' && <div style={{ fontSize: 11.5, color: t.faint, marginTop: 1, fontVariantNumeric: 'tabular-nums' }}>{window.VL.fmtTime(window.VL.endTime(ev.t, ev.dur))}</div>}
        </div>
        <div style={{ flex: 1, minWidth: 0, position: 'relative', borderRadius: t.radius, overflow: 'hidden', boxShadow: t.shadow }}>
          {/* 右侧操作：编辑 / 删除 */}
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: RIGHT, display: 'flex' }}>
            <button onClick={() => { setTx(0); onEdit(ev); }} style={swBtn(t.accentSoft, t.accentText)}><Icon name="pencil" size={19} color={t.accentText} /><span style={{ fontSize: 11.5, marginTop: 3 }}>编辑</span></button>
            <button onClick={() => { setTx(0); onDelete(ev.id); }} style={swBtn('oklch(0.62 0.2 25)', '#fff')}><Icon name="trash" size={19} color="#fff" /><span style={{ fontSize: 11.5, marginTop: 3 }}>删除</span></button>
          </div>
          {/* 左侧操作：完成 */}
          <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: LEFT, display: 'flex' }}>
            <button onClick={() => { setTx(0); onToggle(ev.id); }} style={swBtn('oklch(0.6 0.14 150)', '#fff')}><Icon name="check" size={20} color="#fff" sw={2.4} /><span style={{ fontSize: 11.5, marginTop: 3 }}>{done ? '撤销' : '完成'}</span></button>
          </div>
          {/* 前景卡片 */}
          <div onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onClick={onClickCard}
            style={{ position: 'relative', background: t.surface, border: `1px solid ${t.border}`, borderRadius: t.radius, padding: '13px 14px 13px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', touchAction: 'pan-y', transform: `translateX(${tx}px)`, transition: drag ? 'none' : 'transform .26s cubic-bezier(.32,.72,0,1)', opacity: cancelled ? 0.62 : 1 }}>
            <div style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 3.5, borderRadius: 999, background: col, opacity: done || cancelled ? 0.4 : 1 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: done || cancelled ? t.faint : t.text, textDecoration: done || cancelled ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</div>
              <div style={{ display: 'flex', gap: 12, marginTop: 5, alignItems: 'center' }}>
                {ev.loc && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12.5, color: t.muted }}><Icon name="pin" size={13} color={t.faint} />{ev.loc}</span>}
                {ev.reminder ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12.5, color: t.muted }}><Icon name="bell" size={13} color={t.faint} />提前{ev.reminder}分</span> : null}
                {ev.urgent && !cancelled && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12.5, fontWeight: 600, color: 'oklch(0.62 0.19 25)' }}><Icon name="flagFill" size={12} color={'oklch(0.62 0.19 25)'} fill />急</span>}
                {conflict && !cancelled && <span onClick={(e) => { e.stopPropagation(); onWarn && onWarn(); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12.5, fontWeight: 600, color: 'oklch(0.58 0.15 60)', background: 'color-mix(in oklch, oklch(0.72 0.15 70) 16%, transparent)', padding: '2px 8px', borderRadius: 999 }}><Icon name="bolt" size={12} color={'oklch(0.58 0.15 60)'} sw={2.2} />重叠</span>}
                {cancelled && <span style={{ fontSize: 12.5, color: t.faint }}>已取消</span>}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <button onClick={(e) => { e.stopPropagation(); onStar && onStar(ev.id); }} style={{ width: 28, height: 28, borderRadius: 999, cursor: 'pointer', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} title="重要">
                <Icon name={ev.important ? 'starFill' : 'star'} size={19} color={ev.important ? 'oklch(0.76 0.14 80)' : t.faint} fill={ev.important} sw={1.9} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onToggle(ev.id); }} style={{ width: 28, height: 28, borderRadius: 999, cursor: 'pointer', border: done ? 'none' : `2px solid ${t.borderStrong}`, background: done ? col : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>{done && <Icon name="check" size={16} color={t.onAccent} sw={2.6} />}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  function swBtn(bg, fg) { return { width: 72, height: '100%', border: 'none', cursor: 'pointer', background: bg, color: fg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', font: 'inherit', fontWeight: 600 }; }

  // ── 日程详情 ──
  function DetailSheet({ t, ev, onClose, onToggle, onCancel, onDelete, onEdit, onStar, onUrgent, onPostpone, onMatrixInfo, app }) {
    if (!ev) return null;
    const done = ev.status === 'done';
    const col = catColor(t, ev.cat);
    const meta = (icon, label, val) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: `1px solid ${t.border}` }}>
        <Icon name={icon} size={17} color={t.faint} />
        <span style={{ fontSize: 13.5, color: t.muted, width: 52 }}>{label}</span>
        <span style={{ fontSize: 15, color: t.text, fontWeight: 550 }}>{val}</span>
      </div>
    );
    return (
      <Sheet t={t} open={!!ev} onClose={onClose}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 5, alignSelf: 'stretch', minHeight: 30, borderRadius: 999, background: col, marginTop: 3 }} />
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: 22, fontWeight: 720, color: t.text, letterSpacing: -0.3 }}>{ev.title}</h3>
            <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip t={t} color={col} soft><Dot color={col} size={7} />{catLabel(t, ev.cat)}</Chip>
              <button onClick={onMatrixInfo} style={{ border: 'none', background: 'transparent', cursor: onMatrixInfo ? 'pointer' : 'default', padding: 0, font: 'inherit' }} title="四象限"><window.QuadrantChip t={t} ev={ev} /></button>
            </div>
          </div>
          <button onClick={() => onStar(ev.id)} style={{ width: 38, height: 38, borderRadius: 999, cursor: 'pointer', flexShrink: 0, border: `1px solid ${t.border}`, background: t.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="重要">
            <Icon name={ev.important ? 'starFill' : 'star'} size={18} color={ev.important ? 'oklch(0.76 0.14 80)' : t.muted} fill={ev.important} />
          </button>
          <button onClick={() => onUrgent && onUrgent(ev.id)} style={{ width: 38, height: 38, borderRadius: 999, cursor: 'pointer', flexShrink: 0, border: `1px solid ${t.border}`, background: t.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="紧急">
            <Icon name={ev.urgent ? 'flagFill' : 'flag'} size={18} color={ev.urgent ? 'oklch(0.62 0.19 25)' : t.muted} fill={ev.urgent} />
          </button>
          <button onClick={() => onEdit(ev)} style={{ height: 38, padding: '0 13px', borderRadius: 999, cursor: 'pointer', flexShrink: 0, border: `1px solid ${t.border}`, background: t.surface2, color: t.text, font: 'inherit', fontSize: 13.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="pencil" size={15} color={t.text} />编辑</button>
        </div>
        <div style={{ marginTop: 10 }}>
          {window.VL.timeMode(ev) === 'at'
            ? meta('clock', '时间', `${window.VL.fmtRange(ev.t, ev.dur)} · ${ev.dur} 分钟`)
            : meta('clock', '时间', window.VL.timeMode(ev) === 'allday' ? '全天 · 贯穿一整天' : (window.VL.timeLabel(ev) || '随手记 · 未设时间'))}
          {ev.loc && meta('pin', '地点', ev.loc)}
          {meta('bell', '提醒', ev.reminder ? `提前 ${ev.reminder} 分钟` : '不提醒')}
        </div>
        {ev.note && (
          <div style={{ marginTop: 14, padding: 14, borderRadius: t.radius - 2, background: t.surface2 }}>
            <div style={{ fontSize: 12.5, color: t.faint, fontWeight: 600, marginBottom: 5 }}>备注</div>
            <div style={{ fontSize: 15, color: t.text, lineHeight: 1.55 }}>{ev.note}</div>
          </div>
        )}
        {app && !done && <window.RescheduleCard t={t} dayEvents={app.events[app.selectedDay] || []} ev={ev} onPick={(s) => app.rescheduleEvent(ev.id, s.time)} style={{ marginTop: 14 }} />}
        <div style={{ marginTop: 18 }}>
          <Btn t={t} kind={done ? 'ghost' : 'primary'} icon="check" full onClick={() => { onToggle(ev.id); onClose(); }}>{done ? '标记未完成' : '标记完成'}</Btn>
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            {onPostpone && <Btn t={t} kind="ghost" icon="redo" onClick={() => onPostpone(ev.id)} style={{ flex: 1 }}>延期一天</Btn>}
            <Btn t={t} kind="ghost" onClick={() => { onCancel(ev.id); onClose(); }} style={{ flex: 1 }}>取消</Btn>
            <button onClick={() => { onDelete(ev.id); onClose(); }} style={{ width: 46, height: 46, borderRadius: t.radius - 2, flexShrink: 0, cursor: 'pointer', border: `1px solid ${t.border}`, background: t.surface2, color: 'oklch(0.62 0.19 25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="trash" size={19} color="oklch(0.62 0.19 25)" /></button>
          </div>
        </div>
      </Sheet>
    );
  }

  // ── 编辑表单 ──
  function EditSheet({ t, ev, onClose, onSave, app }) {
    const [st, setSt] = useState(null);
    const titleRef = useRef(null), locRef = useRef(null), noteRef = useRef(null);
    useEffect(() => { if (ev) { const [h, m] = (ev.t || '09:00').split(':').map(Number); setSt({ hh: h, mm: m, cat: ev.cat, reminder: ev.reminder || 0, important: !!ev.important, urgent: !!ev.urgent, timeMode: window.VL.timeMode(ev), daypart: ev.daypart || 'afternoon' }); } }, [ev]);
    if (!ev || !st) return null;
    const bump = (delta) => setSt((s) => { let total = (s.hh * 60 + s.mm + delta + 1440) % 1440; return { ...s, hh: Math.floor(total / 60), mm: total % 60 }; });
    const time = `${String(st.hh).padStart(2, '0')}:${String(st.mm).padStart(2, '0')}`;
    const editable = (ref, val) => (
      <span ref={ref} contentEditable suppressContentEditableWarning style={{ fontSize: 15, fontWeight: 600, color: t.text, outline: 'none', borderRadius: 6, padding: '6px 10px', background: t.surface2, display: 'inline-block', minWidth: 120 }}>{val}</span>
    );
    const row = (label, node) => (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12.5, color: t.faint, fontWeight: 600, marginBottom: 7, marginLeft: 2 }}>{label}</div>
        {node}
      </div>
    );
    return (
      <Sheet t={t} open={!!ev} onClose={onClose}>
        <h3 style={{ margin: '2px 2px 16px', fontSize: 22, fontWeight: 720, color: t.text }}>编辑日程</h3>
        {row('标题', editable(titleRef, ev.title))}
        {row('时间', (
          <div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {[['at', '精确'], ['period', '时段'], ['allday', '全天'], ['untimed', '随手记']].map(([k, lab]) => {
                const on = st.timeMode === k;
                return <button key={k} onClick={() => setSt({ ...st, timeMode: k })} style={{ height: 32, padding: '0 13px', borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 13.5, fontWeight: 600, border: `1px solid ${on ? 'transparent' : t.border}`, background: on ? t.accentSoft : 'transparent', color: on ? t.accentText : t.muted }}>{lab}</button>;
              })}
            </div>
            {st.timeMode === 'at' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => bump(-15)} style={stepBtn(t)}><Icon name="minus" size={18} color={t.text} sw={2.2} /></button>
                <span style={{ fontSize: 22, fontWeight: 720, color: t.text, fontVariantNumeric: 'tabular-nums', minWidth: 78, textAlign: 'center' }}>{time}</span>
                <button onClick={() => bump(15)} style={stepBtn(t)}><Icon name="plus" size={18} color={t.text} sw={2.2} /></button>
                <span style={{ fontSize: 12.5, color: t.faint, marginLeft: 4 }}>每档 15 分钟</span>
              </div>
            )}
            {st.timeMode === 'period' && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {window.VL.DAYPARTS.map((d) => { const on = st.daypart === d.key; return <button key={d.key} onClick={() => setSt({ ...st, daypart: d.key })} style={{ height: 32, padding: '0 13px', borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 13.5, fontWeight: 600, border: `1px solid ${on ? 'transparent' : t.border}`, background: on ? t.accentSoft : 'transparent', color: on ? t.accentText : t.muted }}>{d.label}</button>; })}
              </div>
            )}
            {(st.timeMode === 'allday' || st.timeMode === 'untimed') && (
              <div style={{ fontSize: 12.5, color: t.faint, paddingLeft: 2 }}>{st.timeMode === 'allday' ? '贯穿一整天，不占具体时段' : '只是记一笔，不设时间'}</div>
            )}
          </div>
        ))}
        {row('类别', (
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {CATS_ORDER.map((c) => {
              const on = st.cat === c;
              return <button key={c} onClick={() => setSt({ ...st, cat: c })} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 32, padding: '0 12px', borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 13.5, fontWeight: 600, border: `1px solid ${on ? 'transparent' : t.border}`, background: on ? `color-mix(in oklch, ${catColor(t, c)} 16%, transparent)` : 'transparent', color: on ? t.text : t.muted }}><Dot color={catColor(t, c)} size={7} />{catLabel(t, c)}</button>;
            })}
          </div>
        ))}
        {row('地点', editable(locRef, ev.loc || ''))}
        {row('备注 / 子任务', (
          <span ref={noteRef} contentEditable suppressContentEditableWarning data-ph="写点备注，或每行一个子任务…" style={{ display: 'block', fontSize: 15, fontWeight: 500, color: t.text, outline: 'none', borderRadius: 8, padding: '10px 12px', background: t.surface2, minHeight: 58, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{ev.note || ''}</span>
        ))}
        {row('提醒', (
          <div style={{ display: 'flex', gap: 7 }}>
            {[0, 10, 15, 30].map((m) => <button key={m} onClick={() => setSt({ ...st, reminder: m })} style={{ height: 32, padding: '0 13px', borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 13.5, fontWeight: 600, border: `1px solid ${st.reminder === m ? 'transparent' : t.border}`, background: st.reminder === m ? t.accentSoft : 'transparent', color: st.reminder === m ? t.accentText : t.muted }}>{m === 0 ? '不提醒' : `提前${m}分`}</button>)}
          </div>
        ))}
        {row('优先级', (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => setSt({ ...st, important: !st.important })} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 13.5, fontWeight: 600, border: `1px solid ${st.important ? 'transparent' : t.border}`, background: st.important ? 'color-mix(in oklch, oklch(0.76 0.14 80) 18%, transparent)' : 'transparent', color: st.important ? t.text : t.muted }}>
              <Icon name={st.important ? 'starFill' : 'star'} size={16} color={st.important ? 'oklch(0.72 0.14 80)' : t.muted} fill={st.important} />重要
            </button>
            <button onClick={() => setSt({ ...st, urgent: !st.urgent })} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 13.5, fontWeight: 600, border: `1px solid ${st.urgent ? 'transparent' : t.border}`, background: st.urgent ? 'color-mix(in oklch, oklch(0.62 0.19 25) 16%, transparent)' : 'transparent', color: st.urgent ? t.text : t.muted }}>
              <Icon name={st.urgent ? 'flagFill' : 'flag'} size={16} color={st.urgent ? 'oklch(0.62 0.19 25)' : t.muted} fill={st.urgent} />紧急
            </button>
            <window.QuadrantChip t={t} ev={{ important: st.important, urgent: st.urgent }} />
          </div>
        ))}
        {app && <window.RescheduleCard t={t} dayEvents={app.events[app.selectedDay] || []} ev={{ id: ev.id, t: time, dur: ev.dur, status: ev.status }} onPick={(s) => { const [h, m] = s.time.split(':').map(Number); setSt((p) => ({ ...p, hh: h, mm: m })); }} style={{ marginBottom: 14 }} />}
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <Btn t={t} kind="ghost" onClick={onClose} style={{ flex: 1 }}>取消</Btn>
          <Btn t={t} kind="primary" icon="check" onClick={() => {
            const title = (titleRef.current ? titleRef.current.textContent.trim() : ev.title) || ev.title;
            const loc = locRef.current ? locRef.current.textContent.trim() : ev.loc;
            const note = noteRef.current ? noteRef.current.innerText.trim() : ev.note;
            const tmode = st.timeMode || 'at';
            let nt = time, ndur = ev.dur || 60, ndaypart = null;
            if (tmode === 'period') { ndaypart = st.daypart; const dp = window.VL.daypartOf(st.daypart); nt = dp ? dp.rep : '15:00'; ndur = 0; }
            else if (tmode === 'allday') { nt = '00:00'; ndur = 0; }
            else if (tmode === 'untimed') { ndur = 0; }
            onSave(ev.id, { title, t: nt, dur: ndur, timeMode: tmode, daypart: ndaypart, cat: st.cat, reminder: st.reminder, loc: loc || null, note: note || null, important: st.important, urgent: st.urgent });
            onClose();
          }} style={{ flex: 2 }}>保存</Btn>
        </div>
      </Sheet>
    );
  }
  function stepBtn(t) { return { width: 40, height: 40, borderRadius: 999, cursor: 'pointer', border: `1px solid ${t.border}`, background: t.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center' }; }

  // ── 主页 ──
  // 通知中心（二级页）：聚合到点提醒 / 顺延；空态「暂无通知」
  function NotificationSheet({ t, open, onClose, app }) {
    const notes = (app && app.notifications) || [];
    return (
      <Sheet t={t} open={open} onClose={onClose}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Icon name="bell" size={19} color={t.accentText} />
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 720, color: t.text }}>通知</h3>
          {notes.length > 0 && <span style={{ fontSize: 12.5, color: t.faint }}>{notes.length} 条</span>}
        </div>
        {notes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '34px 0 26px' }}>
            <div style={{ width: 56, height: 56, borderRadius: 999, background: t.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><Icon name="bell" size={26} color={t.borderStrong} /></div>
            <div style={{ fontSize: 15, fontWeight: 600, color: t.muted }}>暂无通知</div>
            <div style={{ fontSize: 12.5, color: t.faint, marginTop: 5 }}>到点的提醒、顺延会出现在这里</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notes.map((n, i) => {
              const aBtn = { height: 30, padding: '0 12px', borderRadius: 999, border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 12.5, fontWeight: 700, flexShrink: 0 };
              const ghost = { ...aBtn, border: `1px solid ${t.border}`, background: 'transparent', color: t.muted, fontWeight: 600 };
              return (
                <div key={i} style={{ display: 'flex', gap: 11, padding: '12px 13px', borderRadius: t.radius, background: t.surface2 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: t.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={n.icon || 'bell'} size={17} color={t.accentText} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</div>
                    <div style={{ fontSize: 12.5, color: t.faint, marginTop: 2 }}>{n.sub}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 9 }}>
                      {n.kind === 'rollover' && <button onClick={() => { app.rolloverUnfinished(); onClose(); }} style={{ ...aBtn, background: t.accent, color: t.onAccent }}>全部挪到今天</button>}
                      {n.kind === 'reminder' && <button onClick={() => app.completeAt(n.day, n.ev.id)} style={{ ...aBtn, background: t.accent, color: t.onAccent }}>完成</button>}
                      {n.kind === 'reminder' && <button onClick={() => { app.openEdit(n.ev, n.day); onClose(); }} style={ghost}>编辑</button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Sheet>
    );
  }

  function HomeScreen({ t, app }) {
    const [view, setView] = useState('list');
    const [capDismiss, setCapDismiss] = useState({});
    const [weekOff, setWeekOff] = useState(0); // 周条翻周偏移
    const sel = app.selectedDay;
    const todayKey = window.VL.todayKey();
    // 周条跟随选中日：选中日变化时，把周条移到包含它的那一周（语音加未来日程也能在首页看到）
    useEffect(() => {
      const diff = Math.round((window.VL.keyDate(sel) - window.VL.todayDateObj()) / 86400000);
      setWeekOff(Math.round((diff - 2) / 7));
    }, [sel]);
    const weekDays = window.VL.windowDays(weekOff);
    const DOWC = ['日', '一', '二', '三', '四', '五', '六'];
    const allEmpty = Object.values(app.events).every((a) => !a || !a.length); // 全空 = 新用户，给第一动作引导
    // 今天之前所有未完成（含前几天累积）；仅在「今天」视图、且未在贪睡期内显示
    const pending = (sel === todayKey) ? window.VL.pendingBefore(app.events, todayKey) : [];
    const rollSnoozed = Date.now() < (app.rolloverSnoozeUntil || 0);
    // 按时间精度排序：全天置顶 → 时段/精确按时刻 → 随手记沉底
    const list = (app.events[sel] || []).slice().sort((a, b) => window.VL.sortMin(a) - window.VL.sortMin(b) || a.t.localeCompare(b.t));
    const conflictIds = new Set();
    list.forEach((ev) => { if (ev.status === 'todo' && window.VL.overlaps(list, ev).length) conflictIds.add(ev.id); });
    const doneN = list.filter((e) => e.status === 'done').length;
    const cur = weekDays.find((w) => w.key === sel) || (() => { const d = window.VL.keyDate(sel); return { key: sel, dow: DOWC[d.getDay()], day: d.getDate(), month: d.getMonth() + 1, today: sel === todayKey }; })();
    const totalH = list.filter((e) => e.status !== 'cancelled').reduce((s, e) => s + e.dur, 0) / 60;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: 'max(env(safe-area-inset-top, 0px), 14px) 20px 6px', flexShrink: 0 }}>
          {/* 品牌行：内联 SVG 声波标志 + 名字 + 标语（跨主题随主色） */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: t.shadow }}>
              <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="9" width="2.6" height="6" rx="1.3" fill={t.onAccent} />
                <rect x="8" y="4.5" width="2.6" height="15" rx="1.3" fill={t.onAccent} />
                <rect x="13" y="7.5" width="2.6" height="9" rx="1.3" fill={t.onAccent} />
                <rect x="18" y="10.5" width="2.6" height="3" rx="1.3" fill={t.onAccent} />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 780, color: t.text, letterSpacing: -0.3, lineHeight: 1.1 }}>语迹 <span style={{ color: t.accentText, fontWeight: 740 }}>VoiceLog</span></div>
              <div style={{ fontSize: 11.5, color: t.faint, marginTop: 2 }}>时间是你最大的资产</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13.5, color: t.accentText, fontWeight: 650, letterSpacing: 0.3 }}>{cur.today ? '今天' : `周${cur.dow}`}</div>
              <h1 style={{ margin: '2px 0 0', fontSize: 30, fontWeight: 760, color: t.text, letterSpacing: -0.6 }}>{cur.month}月{cur.day}日 <span style={{ fontSize: 18, fontWeight: 600, color: t.muted }}>周{cur.dow}</span></h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* 成长入口：纯图标按钮，和 +/通知 一套语言（上升趋势 = 成长） */}
              <button onClick={app.goGrowth} title="成长" style={{ width: 42, height: 42, borderRadius: 999, cursor: 'pointer', border: `1px solid ${t.border}`, background: t.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: t.shadow }}><Icon name="trend" size={20} color={t.text} /></button>
              <button onClick={app.openUpload} title="添加日程（拍照/上传/手动）" style={{ width: 42, height: 42, borderRadius: 999, cursor: 'pointer', border: `1px solid ${t.border}`, background: t.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: t.shadow }}><Icon name="plus" size={20} color={t.text} /></button>
              <button onClick={app.openNotifications} title="通知" style={{ width: 42, height: 42, borderRadius: 999, cursor: 'pointer', border: `1px solid ${t.border}`, background: t.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: t.shadow, position: 'relative' }}><Icon name="bell" size={20} color={t.text} />{app.notifUnseen && <span style={{ position: 'absolute', top: 7, right: 8, width: 8, height: 8, borderRadius: 999, background: 'oklch(0.62 0.19 25)', border: `1.5px solid ${t.surface}` }} />}</button>
            </div>
          </div>
          {/* 列表 / 全览 切换 */}
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'inline-flex', background: t.surface2, borderRadius: 999, padding: 3, border: `1px solid ${t.border}` }}>
              {[['list', '列表', 'list'], ['overview', '全览', 'grid'], ['matrix', '象限', 'matrix']].map(([k, lab, ic]) => {
                const on = view === k;
                return <button key={k} onClick={() => setView(k)} title={lab} aria-label={lab} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 36, border: 'none', cursor: 'pointer', borderRadius: 999, background: on ? t.raised : 'transparent', boxShadow: on ? t.shadow : 'none' }}><Icon name={ic} size={19} color={on ? t.accentText : t.muted} sw={on ? 2.1 : 1.85} /></button>;
              })}
            </div>
          </div>
        </div>

        {view === 'overview' ? <window.OverviewView t={t} app={app} /> :
         view === 'matrix' ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 24px' }}>
            <window.MatrixView t={t} events={list} onOpen={app.openDetail} onInfo={app.showMatrix} />
          </div>
        ) : (
          <React.Fragment>
            <div style={{ padding: '4px 20px 0', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <button onClick={() => setWeekOff((o) => o - 1)} style={{ width: 30, height: 30, borderRadius: 999, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="chevL" size={17} color={t.muted} /></button>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: t.faint, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  {weekDays[0].month}月{weekDays[0].day}日 – {weekDays[6].month}月{weekDays[6].day}日
                  {weekOff !== 0 && <button onClick={() => { setWeekOff(0); app.setDay(window.VL.todayKey()); }} style={{ height: 22, padding: '0 9px', borderRadius: 999, border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 11.5, fontWeight: 650, background: t.accentSoft, color: t.accentText }}>回今天</button>}
                </span>
                <button onClick={() => setWeekOff((o) => o + 1)} style={{ width: 30, height: 30, borderRadius: 999, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="chevR" size={17} color={t.muted} /></button>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {weekDays.map((w) => {
                  const on = w.key === sel;
                  const has = (app.events[w.key] || []).length > 0;
                  return (
                    <button key={w.key} onClick={() => app.setDay(w.key)} style={{ flex: 1, padding: '8px 0 9px', borderRadius: 14, cursor: 'pointer', border: 'none', background: on ? t.accent : 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'background .2s' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: on ? t.onAccent : t.faint }}>{w.dow}</span>
                      <span style={{ fontSize: 15, fontWeight: 680, color: on ? t.onAccent : t.text, fontVariantNumeric: 'tabular-nums' }}>{w.day}</span>
                      <span style={{ width: 5, height: 5, borderRadius: 999, background: has ? (on ? t.onAccent : t.accent) : 'transparent' }} />
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: 10, fontSize: 13.5, color: t.muted }}>
                {list.length > 0 ? <>共 <b style={{ color: t.text }}>{list.length}</b> 项 · 约 {totalH % 1 === 0 ? totalH : totalH.toFixed(1)} 小时 · 已完成 {doneN}</> : '这天还没有安排'}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 24px' }}>
              {pending.length > 0 && !rollSnoozed && (
                <window.RolloverBanner t={t} items={pending} onMove={(picks) => app.rolloverUnfinished(picks)} onDismiss={() => app.snoozeRollover()} onEdit={(p) => app.openEdit(p.ev, p.key)} onDelete={(p) => app.deleteEventAt(p.key, p.ev.id)} style={{ marginBottom: 12 }} />
              )}
              {totalH > window.VL.DAILY_CAPACITY_H && !capDismiss[sel] && (
                <window.CapacityBanner t={t} hours={totalH} cap={window.VL.DAILY_CAPACITY_H} onDismiss={() => setCapDismiss((d) => ({ ...d, [sel]: true }))} style={{ marginBottom: 12 }} />
              )}
              <window.FocusCard t={t} events={list} dayKey={sel} onOpen={app.openDetail} style={{ marginBottom: 14 }} />
              {list.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(() => {
                    const grp = (ev) => { const m = window.VL.timeMode(ev); return m === 'allday' ? 'allday' : m === 'untimed' ? 'untimed' : 'timed'; };
                    const HEAD = { allday: '全天 · 贯穿一整天', timed: '具体时间', untimed: '随手记 · 没有具体时间' };
                    const mixed = new Set(list.map(grp)).size > 1; // 只在"既有精确又有模糊"时才显示分组标
                    const out = []; let last = null;
                    list.forEach((ev) => {
                      const g = grp(ev);
                      if (mixed && g !== last) { out.push(<div key={'h-' + g} style={{ fontSize: 11.5, fontWeight: 700, color: t.faint, letterSpacing: 0.5, marginLeft: 50, marginBottom: -4 }}>{HEAD[g]}</div>); last = g; }
                      out.push(<SwipeRow key={ev.id} t={t} ev={ev} conflict={conflictIds.has(ev.id)} onWarn={app.showMultitask} onToggle={app.toggleDone} onOpen={app.openDetail} onEdit={app.openEdit} onDelete={app.deleteEvent} onStar={app.toggleImportant} />);
                    });
                    return out;
                  })()}
                  <div style={{ textAlign: 'center', fontSize: 12.5, color: t.faint, marginTop: 6 }}>← 左滑编辑/删除 · 右滑完成 →</div>
                </div>
              ) : allEmpty ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 76, height: 76, borderRadius: 22, background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: t.shadowLg }}><Icon name="micFill" size={34} color={t.onAccent} /></div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 760, color: t.text }}>记下你的第一件事</div>
                    <div style={{ fontSize: 13.5, color: t.muted, marginTop: 5, lineHeight: 1.55 }}>说一句，或打一句话——语迹帮你变成日程。<br />例如「明天下午三点跟老王开会」</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 280 }}>
                    <Btn t={t} kind="primary" icon="mic" onClick={app.openVoice} style={{ width: '100%' }}>说一句</Btn>
                    <Btn t={t} kind="soft" icon="sparkle" onClick={app.openUpload} style={{ width: '100%' }}>打字 / 上传 / 手动</Btn>
                  </div>
                  <button onClick={app.loadDemo} style={{ marginTop: 2, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', font: 'inherit', fontSize: 13.5, fontWeight: 600, color: t.faint }}>或先看示例数据</button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '44px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 72, height: 72, borderRadius: 24, background: t.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="calendar" size={32} color={t.faint} sw={1.6} /></div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 650, color: t.text }}>这天还很空</div>
                    <div style={{ fontSize: 13.5, color: t.muted, marginTop: 4, lineHeight: 1.5 }}>说一句话，就能建个日程</div>
                  </div>
                  <Btn t={t} kind="primary" icon="mic" onClick={app.openVoice}>说一句试试</Btn>
                </div>
              )}
            </div>
          </React.Fragment>
        )}
      </div>
    );
  }

  Object.assign(window, { HomeScreen, VoiceOverlay, ReminderBanner, DetailSheet, EditSheet, NotificationSheet });
})();
