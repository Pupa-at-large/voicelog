/* VoiceLog · 中文口语 → 结构化日程（离线规则引擎，简版） */
(function () {
  const CN = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

  function cnInt(s) {
    if (s == null || s === '') return null;
    if (/^[0-9]+$/.test(s)) return parseInt(s, 10);
    // 纯中文：十=10, 十X=1X, X十=X0, X十Y=XY
    if (!/[零一二两三四五六七八九十]/.test(s)) return null;
    let v = 0;
    if (s.indexOf('十') >= 0) {
      const [a, b] = s.split('十');
      const tens = a === '' ? 1 : (CN[a] ?? 0);
      const ones = b === '' ? 0 : (CN[b] ?? 0);
      v = tens * 10 + ones;
    } else {
      v = CN[s] ?? null;
      if (v === null) return null;
    }
    return v;
  }

  // 周几 → 本周日期键（按真实窗口动态构建，见 data.js 的 dowToKey）
  const _d2k = (window.VL.data && window.VL.data.dowToKey) || {};
  const DOW2KEY = { 日: _d2k[0], 天: _d2k[0], 一: _d2k[1], 二: _d2k[2], 三: _d2k[3], 四: _d2k[4], 五: _d2k[5], 六: _d2k[6] };

  function dateTextOf(key, prefix) {
    const w = (window.VL.data.week || []).find((x) => x.key === key);
    if (!w) return prefix || key;
    const base = `6月${w.day}日 周${w.dow}`;
    return prefix ? `${prefix} · ${base}` : base;
  }

  function parse(text) {
    const raw = (text || '').trim();
    let rest = raw;
    // 去口头语（与 speechTrust 同一份，"就是"太常用故不删），避免"嗯/那个"混进标题
    rest = rest.replace(/(嗯|呃|额|啊|哦|唉)+/g, ' ').replace(/那个|这个/g, ' ');
    const strip = (re) => { const m = rest.match(re); if (m) { rest = rest.replace(m[0], ' '); return m; } return null; };

    // ── 重复（每周X / 周X多天 / 每天 / …到X为止）──
    let repeat = null;
    {
      const DOWN = { 日: 0, 天: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 };
      let dows = null, freq = 'weekly', rmatch = null;
      if (/每\s*[天日]/.test(rest)) { dows = [1, 2, 3, 4, 5, 6, 0]; freq = 'daily'; rmatch = (rest.match(/每\s*[天日]/) || [])[0]; }
      else {
        const dm = rest.match(/(每\s*)?(?:周|星期|礼拜)\s*([一二三四五六日天](?:\s*[、,，和]?\s*[一二三四五六日天])*)/);
        if (dm) {
          const days = (dm[2].match(/[一二三四五六日天]/g) || []).map((d) => DOWN[d]);
          const uniq = Array.from(new Set(days)).sort((a, b) => a - b);
          if (dm[1] || uniq.length >= 2) { dows = uniq; freq = 'weekly'; rmatch = dm[0]; }
        }
      }
      if (dows && dows.length) {
        if (rmatch) rest = rest.replace(rmatch, ' ');
        let until = null, untilText = null;
        if (/学期/.test(rest)) { until = window.VL.SEMESTER_END; untilText = '7月10日（学期末）'; rest = rest.replace(/(?:一直\s*)?(?:到\s*)?(?:本|这|整个?|一整?个?)?学期(?:末)?/g, ' '); }
        else {
          const dd = rest.match(/到\s*([0-9]{1,2}|[一二三四五六七八九十]+)\s*月\s*([0-9]{1,2}|[一二三四五六七八九十]+)\s*[日号]/);
          if (dd) { const mo = cnInt(dd[1]), day = cnInt(dd[2]); if (mo && day) { until = `2026-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`; untilText = `${mo}月${day}日`; rest = rest.replace(dd[0], ' '); } }
          else { const wm = rest.match(/(?:持续|连续|共)?\s*([0-9]+|[两二三四五六七八九十]+)\s*(?:个)?\s*(?:周|星期|礼拜)/); if (wm) { const w = cnInt(wm[1]); if (w) { const b = window.VL.todayDateObj ? window.VL.todayDateObj() : new Date(); b.setDate(b.getDate() + w * 7); until = b.toISOString().slice(0, 10); untilText = `${w}周后`; rest = rest.replace(wm[0], ' '); } } }
        }
        repeat = { freq, dows, until, untilText };
      }
    }

    // ── 日期 ──
    const _rk = (n) => (window.VL.relKey ? window.VL.relKey(n) : '06-16');
    let dateKey = _rk(0), datePrefix = '今天';
    if (/大后天/.test(rest)) { dateKey = _rk(3); datePrefix = '大后天'; strip(/大后天/); }
    else if (/后天/.test(rest)) { dateKey = _rk(2); datePrefix = '后天'; strip(/后天/); }
    else if (/明天|明儿/.test(rest)) { dateKey = _rk(1); datePrefix = '明天'; strip(/明天|明儿/); }
    else if (/明晚/.test(rest)) { dateKey = _rk(1); datePrefix = '明天'; rest = rest.replace('明晚', '晚上'); } // 明天晚上
    else if (/明早/.test(rest)) { dateKey = _rk(1); datePrefix = '明天'; rest = rest.replace('明早', '早上'); } // 明天早上
    else if (/今天|今儿|今晚|今早/.test(rest)) { dateKey = _rk(0); datePrefix = '今天'; strip(/今天|今儿/); }
    else if (/([0-9]+|[一二两三四五六七八九十]+)\s*天\s*(后|以后|之后|前|以前|之前)/.test(rest)) {
      const dm = rest.match(/([0-9]+|[一二两三四五六七八九十]+)\s*天\s*(后|以后|之后|前|以前|之前)/);
      const n = cnInt(dm[1]) || 0; const off = /前/.test(dm[2]) ? -n : n;
      dateKey = _rk(off); datePrefix = off === 0 ? '今天' : (off < 0 ? `${-off}天前` : `${off}天后`);
      strip(/([0-9]+|[一二两三四五六七八九十]+)\s*天\s*(后|以后|之后|前|以前|之前)/);
    }
    else {
      const m = rest.match(/(?:下个?周|下星期|下礼拜|这?周|这?星期|这?礼拜)([一二三四五六日天])/);
      if (m && DOW2KEY[m[1]]) {
        let dk = DOW2KEY[m[1]];
        if (/下/.test(m[0]) && window.VL.keyDate) { const d = new Date(window.VL.keyDate(dk).getTime()); d.setDate(d.getDate() + 7); dk = String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
        dateKey = dk; datePrefix = (/下/.test(m[0]) ? '下周' : '周') + m[1];
        strip(/(?:下个?周|下星期|下礼拜|这?周|这?星期|这?礼拜)[一二三四五六日天]/);
      }
    }

    // ── 时段 ──
    let ampm = null;
    if (/凌晨|早上|早晨|上午/.test(rest)) ampm = 'am';
    else if (/中午/.test(rest)) ampm = 'noon';
    else if (/下午|午后/.test(rest)) ampm = 'pm';
    else if (/晚上|夜里|今晚|傍晚/.test(rest)) ampm = 'pm';
    strip(/凌晨|早上|早晨|上午|中午|下午|午后|晚上|夜里|今晚|傍晚/);

    // ── 时间（支持"X点到Y点"时间段 → 算出时长）──
    const grabTime = () => {
      let r = strip(/([0-9]{1,2})\s*[:：]\s*([0-9]{1,2})/);
      if (r) return { hh: parseInt(r[1], 10), mm: parseInt(r[2], 10) };
      r = strip(/([0-9]{1,2}|[零一二两三四五六七八九十]+)\s*[点时](?:\s*(半|一刻|三刻|[0-9一二两三四五六七八九十]+)\s*分?)?/);
      if (!r) return null;
      const hh0 = cnInt(r[1]); if (hh0 == null) return null;
      let mm0 = 0; const f = r[2];
      if (f === '半') mm0 = 30; else if (f === '一刻') mm0 = 15; else if (f === '三刻') mm0 = 45;
      else if (f) { const v = cnInt(f.replace('分', '')); if (v != null) mm0 = v; }
      return { hh: hh0, mm: mm0 };
    };
    let m;
    let hh = null, mm = 0, hasTime = false, dur = 60;
    const _t1 = grabTime();
    if (_t1) { hh = _t1.hh; mm = _t1.mm; hasTime = true; }
    // 结束时间（到/至/~/-，且后面跟数字）→ 时长
    let _end = null;
    if (hasTime && /[到至~\-–]\s*[0-9零一二两三四五六七八九十]/.test(rest)) { strip(/\s*[到至~\-–]\s*/); _end = grabTime(); }
    const _adj = (h) => ((ampm === 'pm' && h < 12) ? h + 12 : (ampm === 'noon') ? 12 : (ampm === 'am' && h === 12) ? 0 : h);
    if (hasTime) { hh = _adj(hh); if (_end) _end.hh = _adj(_end.hh); } else { hh = 9; mm = 0; }
    if (_end) { const d = (_end.hh * 60 + _end.mm) - (hh * 60 + mm); if (d > 0) dur = d; }
    const time = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

    // ── 提醒 ──
    let reminder = 0;
    m = strip(/提前\s*(半个?|[0-9]+|[零一二两三四五六七八九十]+)\s*(个)?\s*(小时|分钟|分)/);
    if (m) {
      const unit = m[3];
      let v = /半/.test(m[1]) ? (unit.indexOf('小时') >= 0 ? 30 : 30) : cnInt(m[1]);
      if (/半/.test(m[1])) reminder = unit.indexOf('小时') >= 0 ? 30 : 30;
      else if (v != null) reminder = unit.indexOf('小时') >= 0 ? v * 60 : v;
    }

    // ── 地点 ──
    let loc = null;
    m = strip(/(?:在|@|去)\s*([^\s，,。、；;的把和跟与]{1,12}?)(?=(?:开会|碰头|见面|吃饭|锻炼|运动|跑步|上课|学习|复习|读书|看书|做|进行|准备|参加|举行|开始|结束|$|，|,|。|、))/);
    if (m && m[1]) loc = m[1];
    if (!loc) { m = strip(/(?:在|@)\s*([^\s，,。、；;]{1,12})/); if (m) loc = m[1]; }

    // ── 类别 ──
    const cat =
      /开会|会议|评审|沟通|同步|对齐|碰头|面试|汇报|周会|例会/.test(raw) ? 'meet' :
      /写|方案|代码|编程|设计|文档|报告|专注|深度|ppt|稿/.test(raw) ? 'deep' :
      /健身|跑步|锻炼|运动|吃饭|午饭|晚饭|睡|休息|医院|看病|体检|散步/.test(raw) ? 'life' :
      /读书|看书|学习|上课|复习|课程|背单词|练习/.test(raw) ? 'learn' : 'misc';

    // ── 标题 ──
    let title = rest
      .replace(/提醒我?一?下?|提醒|帮我?|记一?下|记得|麻烦|安排|要|有个?|有一?个|的|跟|和|与|，|,|。|、|；|;/g, ' ')
      .replace(/\s+/g, '').trim();
    if (!title) {
      let base = raw
        .replace(/今天|明天|后天|大后天|下个?周[一二三四五六日天]|下星期[一二三四五六日天]|下礼拜[一二三四五六日天]|这?周[一二三四五六日天]|这?星期[一二三四五六日天]|这?礼拜[一二三四五六日天]/g, '')
        .replace(/上午|下午|中午|早上|早晨|晚上|凌晨|傍晚|夜里/g, '')
        .replace(/[0-9一二两三四五六七八九十]+\s*[点时](?:半|一刻|三刻|[0-9一二三四五六七八九十]+分?)?/g, '')
        .replace(/提前.*?(?:分钟|分|小时)/g, '');
      if (loc) base = base.split('在' + loc).join('').split('去' + loc).join('').split(loc).join('');
      base = base.replace(/提醒我?一?下?|提醒|帮我?|[，,。、；;]/g, '').trim();
      title = base || loc || '新日程';
    }
    // 再剥一层：开头人称（我/我要…）、结尾语气词（了/啦…），让"我19点到20点自习了"→"自习"
    title = title.replace(/^(我要|我想|我得|我去|我在|我们|我|帮我)/, '').replace(/(了|啦|吧|呀|哦|嘛)+$/, '').trim() || title;

    // ── 重要 / 紧急（喂入四象限）──
    const urgent = /紧急|尽快|赶紧|赶快|马上|立刻|立马|加急|催|今天就?要|今天必须|deadline|截止|ddl/i.test(raw);
    const importantKw = /重要|关键|必须|一定要?|别忘|千万|要紧|优先/.test(raw);

    const out = { title, dateKey, dateText: dateTextOf(dateKey, datePrefix), time, loc, reminder, cat, dur, urgent, important: importantKw };
    if (repeat && repeat.dows.length) {
      const DOWL = ['日', '一', '二', '三', '四', '五', '六'];
      const dk = (window.VL.data && window.VL.data.dowToKey) || {};
      out.dateKey = dk[repeat.dows[0]] || dateKey;
      out.repeat = repeat;
      const dayText = repeat.freq === 'daily' ? '每天' : '每周' + repeat.dows.map((d) => DOWL[d]).join('、');
      out.dateText = dayText + ' · ' + time + (repeat.until ? ` · 至 ${repeat.untilText}` : ' · 范围待补充');
    }
    return out;
  }

  window.VL = window.VL || {};
  window.VL.parse = parse;

  // ── 多意图批量解析（PRD「丝滑核心」）──
  // 一段话拆成多条动作：新增 / 完成（标记已完成或补录为已完成）。
  // 离线规则版（部署时换 LLM 拆解更稳）；永远返回"待执行清单"供用户确认，绝不静默执行。
  // 逗号再切用的线索（含时段词，便于"，下午三点…"这种切开）
  const DATE_CUE = '今天|明天|后天|大后天|昨天|前天|早上|早晨|上午|中午|下午|傍晚|晚上|凌晨|下个?周[一二三四五六日天]|下星期[一二三四五六日天]|这?周[一二三四五六日天]|这?星期[一二三四五六日天]';
  // 仅用于"日期继承"判定的"真·日期"线索（不含时段词；时段不是某一天）
  const DAY_HAS = /(今天|今晚|今早|明天|明早|明晚|后天|大后天|昨天|前天|下个?周[一二三四五六日天]|下星期[一二三四五六日天]|这?周[一二三四五六日天]|这?星期[一二三四五六日天]|这?礼拜[一二三四五六日天]|[0-9一二三四五六七八九十]+\s*月\s*[0-9一二三四五六七八九十]+)/;
  const DONE_RE = /(写完|做完|搞定|弄完|开完|忙完|跑完|完成|交了|交完|读完|看完)(了|啦)?|已经.{0,4}(好|完|交)/;

  function parseBatch(text) {
    let s = (text || '').trim();
    if (!s) return [];
    // 连接词 → 强分隔
    s = s.replace(/(然后|接着|还有|另外|对了|顺便|再有|以及|其次|最后)/g, '');
    // 在"逗号 + 紧跟新的时间/日期线索"处再切（区分"一条事件内部的逗号"与"下一条事件"）
    s = s.replace(new RegExp('[，,、]\\s*(?=(' + DATE_CUE + '|[0-9]{1,2}\\s*[:：点]|[零一二两三四五六七八九十]+\\s*点))', 'g'), '');
    const segs = s.split(/[。！!？?\n；;]+/).map((x) => x.trim()).filter((x) => x.length >= 2);

    const actions = [];
    let lastDateKey = null, lastDateText = null;
    for (const seg of segs) {
      const hasDate = DAY_HAS.test(seg);
      const isDone = DONE_RE.test(seg);
      const d = window.VL.parse(seg);
      if (!d || !d.title) continue;
      // 日期继承：无显式日期的分句沿用上一条的日期（"明天十点开会，三点对方案" 都算明天）
      if (!hasDate && lastDateKey) { d.dateKey = lastDateKey; d.dateText = lastDateText; }
      else if (hasDate) { lastDateKey = d.dateKey; lastDateText = d.dateText; }
      if (isDone) {
        // 完成意图：清掉标题里的"写完了/搞定了"等词
        let title = d.title.replace(/(我|都|已经)?\s*(写完|做完|搞定|弄完|开完|忙完|跑完|完成|交完|读完|看完|交)(了|啦)?$/g, '').replace(/的$/, '').trim() || d.title;
        actions.push({ kind: 'complete', title, draft: { ...d, title, status: 'done' }, seg });
      } else {
        actions.push({ kind: 'create', title: d.title, draft: d, seg });
      }
    }
    return actions;
  }

  window.VL.parseBatch = parseBatch;

  // ── 远程 AI 解析（接 server/ 的 /parse → 通义千问）──
  // 把千问返回的 action 映射成内部草稿（字段与 parse() 输出同构），
  // 让单条预览 / 编辑 / 批量「待执行清单」复用现有 UI；返回与 parseBatch 同构的数组。
  const SERVER_CATS = ['meet', 'deep', 'life', 'learn', 'misc'];
  const SERVER_KINDS = ['create', 'complete', 'reschedule', 'cancel'];
  function mapServerAction(a) {
    if (!a) return null;
    const kind = SERVER_KINDS.indexOf(a.kind) >= 0 ? a.kind : 'create';
    const title = a.title ? String(a.title).trim() : '';
    if (kind === 'create' && !title) return null;
    if ((kind === 'reschedule' || kind === 'cancel' || kind === 'complete') && !title && !a.targetId) return null;
    const today = (window.VL.todayKey && window.VL.todayKey()) || '06-16';
    const hasDate = /^\d{4}-\d{2}-\d{2}$/.test(String(a.date || ''));
    const hasTime = /^\d{1,2}:\d{2}$/.test(a.time || '');
    const dateKey = hasDate ? String(a.date).slice(5) : today;
    const order = ((window.VL.data && window.VL.data.week) || []).map((w) => w.key);
    const di = order.indexOf(dateKey), ti = order.indexOf(today);
    let prefix = null;
    if (di >= 0 && ti >= 0) { const diff = di - ti; prefix = diff === 0 ? '今天' : diff === 1 ? '明天' : diff === 2 ? '后天' : null; }
    const base = { kind, targetId: a.targetId || null, title, seg: title };
    // 改期/取消：只带"变化项"，date/time 没给就保持原样（null → applyBatchTo 沿用原值）
    if (kind === 'reschedule' || kind === 'cancel') {
      return Object.assign(base, { draft: { title, dateKey: hasDate ? dateKey : null, dateText: hasDate ? dateTextOf(dateKey, prefix) : null, time: hasTime ? a.time : null } });
    }
    const draft = {
      title, dateKey, dateText: dateTextOf(dateKey, prefix), time: hasTime ? a.time : '09:00',
      loc: a.loc || null, reminder: Number(a.reminder) || 0,
      cat: SERVER_CATS.indexOf(a.cat) >= 0 ? a.cat : 'misc',
      dur: Number(a.dur) || 60, urgent: !!a.urgent, important: !!a.important,
    };
    // 子任务 → 备注 + 进度；补录(done) → 标已记录
    const subs = Array.isArray(a.subtasks) ? a.subtasks.map((s) => String(s || '').trim()).filter(Boolean) : [];
    if (subs.length) { draft.subtasks = subs; draft.note = subs.map((s) => '· ' + s).join('\n'); draft.progress = { done: a.done ? subs.length : 0, total: subs.length }; }
    else if (a.note) { draft.note = String(a.note); }
    if (a.done) draft.status = 'done';
    if (kind === 'complete') return Object.assign(base, { draft: Object.assign({}, draft, { status: 'done' }) });
    return Object.assign(base, { draft });
  }
  window.VL.mapServerAction = mapServerAction;

  async function parseRemote(text, candidates) {
    const base = (window.VL.serverUrl || '').replace(/\/+$/, '');
    if (!base) throw new Error('未配置后端地址');
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 30000); // 容忍免费后端冷启动(~50s 仍可能超时→回退规则)
    try {
      const _n = new Date();
      const _hm = String(_n.getHours()).padStart(2, '0') + ':' + String(_n.getMinutes()).padStart(2, '0');
      const r = await fetch(base + '/parse', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        // 把客户端真实的"今天/现在" + 现有日程（供"改期/取消"按 id 匹配）一并发给后端
        body: JSON.stringify({ text: text, today: window.VL.todayISO ? window.VL.todayISO() : undefined, now: _hm, events: candidates || [] }),
        signal: ctrl.signal,
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      const acts = (data.actions || []).map(mapServerAction).filter(Boolean);
      if (!acts.length) throw new Error('空结果');
      // 改期/取消时千问常只给 targetId、不给标题——从候选清单回填，供清单展示
      const byId = {}; (candidates || []).forEach((e) => { if (e && e.id) byId[e.id] = e; });
      acts.forEach((a) => { if (a.targetId && byId[a.targetId] && !(a.draft && a.draft.title)) { const ti = byId[a.targetId].title; a.title = ti; a.seg = ti; if (a.draft) a.draft.title = ti; } });
      return acts;
    } finally { clearTimeout(to); }
  }
  window.VL.parseRemote = parseRemote;
})();
