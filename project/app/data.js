/* VoiceLog · 示例数据 */
(function () {
  // ?reset=1（或 ?reset）：清空本站数据回到全新 demo（保留已配置的后端地址）；清完抹掉参数，刷新不会反复清。
  try {
    if (/[?&]reset(=1|=true)?(&|$)/i.test(location.search)) {
      Object.keys(localStorage).filter((k) => k.indexOf('voicelog') === 0 && k !== 'voicelog:serverUrl').forEach((k) => localStorage.removeItem(k));
      const clean = location.search.replace(/([?&])reset(=[^&]*)?/i, '$1').replace(/[?&]+$/, '').replace(/[?&]&/, '?');
      if (history && history.replaceState) history.replaceState({}, '', location.pathname + clean + location.hash);
    }
  } catch (e) {}

  // ── 日期锚点：跟随真实「今天」（本地时区，跨午夜自动翻天）──
  // 原型本是冻结在 6/16(周一) 那一周的静态 demo；这里把"7 天窗口 + 种子数据"按
  // "相对今天的偏移"动态平移：窗口 = 今天-1 … 今天+5（保留"昨天有未完成、今天排满"的结构）。
  // 测试可用 ?today=YYYY-MM-DD 或 localStorage 'voicelog:today' 覆盖。
  const DOWC = ['日', '一', '二', '三', '四', '五', '六'];
  const _pad = (n) => String(n).padStart(2, '0');
  const _mmdd = (d) => _pad(d.getMonth() + 1) + '-' + _pad(d.getDate());
  const _iso = (d) => d.getFullYear() + '-' + _pad(d.getMonth() + 1) + '-' + _pad(d.getDate());
  const _TODAY = (function () {
    let s = '';
    try { s = (new URLSearchParams(location.search).get('today') || localStorage.getItem('voicelog:today') || '').trim(); } catch (e) {}
    const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T00:00:00') : new Date();
    d.setHours(0, 0, 0, 0); return d;
  })();
  const _dayAt = (n) => { const d = new Date(_TODAY.getTime()); d.setDate(d.getDate() + n); return d; };
  const relKey = (n) => _mmdd(_dayAt(n));
  const _fmtMD = (d) => `${d.getMonth() + 1}月${d.getDate()}日`;
  const _OFF = { '06-15': -1, '06-16': 0, '06-17': 1, '06-18': 2, '06-19': 3, '06-20': 4, '06-21': 5 };
  const remap = (k) => (k in _OFF ? relKey(_OFF[k]) : k);
  const remapEvents = (seed) => { const o = {}; Object.keys(seed).forEach((k) => { o[remap(k)] = seed[k]; }); return o; };

  // 7 天窗口（今天在 index 1）；dow/day/month 均按真实日期算。weekOff 翻周用。
  const windowDays = (weekOff) => [-1, 0, 1, 2, 3, 4, 5].map((i) => { const n = i + (weekOff || 0) * 7; const d = _dayAt(n); return { key: _mmdd(d), dow: DOWC[d.getDay()], day: d.getDate(), month: d.getMonth() + 1, today: n === 0 }; });
  const week = windowDays(0);
  const dowToKey = {}; week.forEach((w) => { dowToKey[DOWC.indexOf(w.dow)] = w.key; });
  // 日期文案："今天 · 6月17日 周二"（窗口外只给"M月D日"）
  function dateTextOf(key, prefix) {
    const w = week.find((x) => x.key === key);
    let base;
    if (w) base = `${w.month}月${w.day}日 周${w.dow}`;
    else {
      // 窗口外的任意日期：按"最接近今天的那一年"还原出真实 dow/月/日（解决未来/过去日程显示成裸键）
      const p = String(key || '').split('-'); const mo = +p[0], da = +p[1];
      if (mo && da) {
        let d = new Date(_TODAY.getFullYear(), mo - 1, da);
        const diff = (d - _TODAY) / 86400000;
        if (diff > 182) d = new Date(_TODAY.getFullYear() - 1, mo - 1, da);
        else if (diff < -182) d = new Date(_TODAY.getFullYear() + 1, mo - 1, da);
        base = `${d.getMonth() + 1}月${d.getDate()}日 周${DOWC[d.getDay()]}`;
      } else base = key;
    }
    return prefix ? `${prefix} · ${base}` : base;
  }

  // 种子日程（键用原始偏移写，加载时平移到真实窗口）
  const _eventsSeed = {
    // 昨天（周日）：留了几件没做完，用来演示「未完成顺延到今天」
    '06-15': [
      { id: 'd1', t: '10:00', dur: 60, title: '整理上周周报', cat: 'deep', status: 'todo' },
      { id: 'd2', t: '15:00', dur: 60, title: '陪家人逛超市', cat: 'life', status: 'done' },
      { id: 'd3', t: '17:00', dur: 30, title: '回复邮件', cat: 'misc', status: 'todo' },
    ],
    '06-16': [
      { id: 'e0', t: '09:00', dur: 60, title: '季度规划 PPT', cat: 'deep', status: 'todo', goal: true, important: true,
        progress: { done: 1, total: 4 }, note: '分四次打磨：① 大纲 ② 数据 ③ 排版 ④ 演练。今天先搭大纲。' },
      { id: 'e1', t: '10:00', dur: 60, title: '写产品方案', cat: 'deep', status: 'done',
        note: '先把核心流程理清，写完发群里给大家看。' },
      { id: 'e2', t: '11:30', dur: 60, title: '团队周会', cat: 'meet', loc: '会议室 A',
        reminder: 10, status: 'todo', urgent: true, note: '同步上周进度，过本周排期。' },
      { id: 'e3', t: '15:00', dur: 60, title: '跟老王开会', cat: 'meet', loc: '公司',
        reminder: 30, status: 'todo', important: true, urgent: true, note: '确认下季度排期与人手。' },
      { id: 'e4', t: '19:00', dur: 60, title: '健身 · 跑步', cat: 'life', important: true,
        reminder: 15, status: 'todo' },
    ],
    '06-17': [
      { id: 'f1', t: '09:30', dur: 90, title: '需求评审', cat: 'meet', loc: '会议室 B',
        reminder: 15, status: 'todo' },
      { id: 'f2', t: '14:00', dur: 120, title: '专注写代码', cat: 'deep', status: 'todo', goal: true,
        progress: { done: 2, total: 5 },
        note: '把解析引擎的边界情况补全。' },
    ],
    // 周三：刻意排得很满（约 9 小时）用来演示「每日容量提醒」——保持不重叠
    '06-18': [
      { id: 'g0', t: '09:00', dur: 120, title: '客户提案会', cat: 'meet', loc: '会议室 A',
        reminder: 15, status: 'todo', note: '过一遍方案，准备好报价表。' },
      { id: 'g2', t: '11:30', dur: 120, title: '写季度方案', cat: 'deep', status: 'todo' },
      { id: 'g3', t: '14:00', dur: 120, title: '部门评审', cat: 'meet', loc: '大会议室',
        reminder: 10, status: 'todo' },
      { id: 'g4', t: '16:30', dur: 120, title: '跟进与修复线上问题', cat: 'deep', status: 'todo' },
      { id: 'g1', t: '20:00', dur: 60, title: '读书 · 《深度工作》', cat: 'learn',
        reminder: 10, status: 'todo' },
    ],
  };
  const events = remapEvents(_eventsSeed);

  // 复盘数据（五个周期）
  const review = {
    day: {
      label: '每日复盘', range: _iso(_TODAY),
      total: 4.0, count: 4, done: 1, cancelled: 0, todo: 3, rate: 25,
      alloc: [
        { cat: 'meet', hours: 2.0, items: 2 },
        { cat: 'deep', hours: 1.0, items: 1 },
        { cat: 'life', hours: 1.0, items: 1 },
      ],
      insights: [
        '完成率 25%（完成 1 / 取消 0 / 待办 3）。完成率偏低，下次排期时不妨少排一点、留出缓冲。',
        '时间主要花在「会议沟通」上，约 2.0 小时，占 50%。',
        '会议扎堆在下午，把需要专注的事挪到上午的空时段会更高效。',
      ],
    },
    week: {
      label: '每周复盘', range: '6/15 – 6/21',
      total: 17.0, count: 19, done: 14, cancelled: 1, todo: 4, rate: 74,
      alloc: [
        { cat: 'meet', hours: 6.0, items: 7 },
        { cat: 'deep', hours: 5.0, items: 4 },
        { cat: 'life', hours: 3.0, items: 4 },
        { cat: 'learn', hours: 2.0, items: 3 },
        { cat: 'misc', hours: 1.0, items: 1 },
      ],
      insights: [
        '完成率 74%（完成 14 / 取消 1 / 待办 4），保持得不错。',
        '会议沟通约 6.0 小时，占 35%，是本周最大开销；深度工作 5.0 小时紧随其后。',
        '周三、周四深度工作时段最完整，可以把硬骨头都安排在这两天。',
      ],
    },
    month: {
      label: '每月复盘', range: '2026 年 6 月',
      total: 72.0, count: 84, done: 63, cancelled: 5, todo: 16, rate: 75,
      alloc: [
        { cat: 'meet', hours: 26.0, items: 31 },
        { cat: 'deep', hours: 21.0, items: 18 },
        { cat: 'life', hours: 13.0, items: 17 },
        { cat: 'learn', hours: 8.0, items: 11 },
        { cat: 'misc', hours: 4.0, items: 7 },
      ],
      insights: [
        '完成率 75%，与上月持平，节奏稳定。',
        '会议沟通占了 36% 的时间——如果其中有可以异步处理的，能省下不少。',
        '深度工作 21 小时，月中两周明显高于月初，状态在回升。',
      ],
    },
    quarter: {
      label: '季度复盘', range: '2026 Q2',
      total: 214.0, count: 248, done: 188, cancelled: 14, todo: 46, rate: 76,
      alloc: [
        { cat: 'meet', hours: 78.0, items: 92 },
        { cat: 'deep', hours: 64.0, items: 55 },
        { cat: 'life', hours: 38.0, items: 49 },
        { cat: 'learn', hours: 22.0, items: 31 },
        { cat: 'misc', hours: 12.0, items: 21 },
      ],
      insights: [
        '本季完成率 76%，逐月小幅提升。',
        '深度工作占比从季初 24% 升到季末 31%，专注时间在变多。',
        '生活健康稳定在 18% 左右，作息保持得不错，继续保持。',
      ],
    },
    year: {
      label: '年度复盘', range: '2026 年',
      total: 868.0, count: 1004, done: 772, cancelled: 56, todo: 176, rate: 77,
      alloc: [
        { cat: 'meet', hours: 312.0, items: 372 },
        { cat: 'deep', hours: 268.0, items: 224 },
        { cat: 'life', hours: 156.0, items: 198 },
        { cat: 'learn', hours: 84.0, items: 124 },
        { cat: 'misc', hours: 48.0, items: 86 },
      ],
      insights: [
        '全年完成率 77%，是稳步上行的一年。',
        '深度工作累计 268 小时，相当于约 34 个完整工作日的专注产出。',
        '下半年会议时间比上半年下降 12%，异步协作的习惯正在见效。',
      ],
    },
  };

  // 语音示例：识别 → 解析（特意带口头语 + 一次自我更正，演示「语音信任反馈」）
  const voice = {
    phrase: '嗯，明天下午两点…啊不对，是三点跟老王开会，提前半小时提醒我，在公司',
    chunks: ['嗯，', '明天下午两点…', '啊不对，是三点', '跟老王开会，', '提前半小时提醒我，', '在公司'],
    parsed: {
      title: '跟老王开会',
      dateKey: relKey(1), dateText: dateTextOf(relKey(1), '明天'),
      time: '15:00', loc: '公司', reminder: 30, cat: 'meet', dur: 60,
    },
    // 多意图批量示例：一段话同时新增多条 + 标记完成（见 parseBatch）
    batchPhrase: '明天上午十点开产品评审会，下午三点跟设计师对方案。今天上午的周报我写完了。后天晚上八点约朋友吃饭，提前半小时提醒。',
    batchChunks: ['明天上午十点开产品评审会，', '下午三点跟设计师对方案。', '今天上午的周报我写完了。', '后天晚上八点约朋友吃饭，', '提前半小时提醒。'],
  };

  const fmtH = (h) => (Number.isInteger(h) ? h + '' : h.toFixed(1));

  // 从真实日程实时计算复盘（任意一段时间），保证主页/复盘/导出处处一致、且永远反映你的真实数据
  function computeStats(rawEvs, _label, _range) {
    const evs = (rawEvs || []).slice();
    const live = evs.filter((e) => e.status !== 'cancelled');
    const done = evs.filter((e) => e.status === 'done').length;
    const cancelled = evs.filter((e) => e.status === 'cancelled').length;
    const count = evs.length;
    const todo = count - done - cancelled;
    const total = live.reduce((s, e) => s + (e.dur || 0), 0) / 60;
    const denom = done + todo;
    const rate = denom ? Math.round((done / denom) * 100) : 0;

    const byCat = {};
    live.forEach((e) => {
      const c = e.cat || 'misc';
      byCat[c] = byCat[c] || { cat: c, hours: 0, items: 0 };
      byCat[c].hours += (e.dur || 0) / 60;
      byCat[c].items += 1;
    });
    const alloc = Object.values(byCat).sort((a, b) => b.hours - a.hours);

    const label = (c) => (window.VL.CATS[c] ? window.VL.CATS[c].label : c);
    const insights = [];
    insights.push(
      `完成率 ${rate}%（完成 ${done} / 取消 ${cancelled} / 待办 ${todo}）。` +
      (rate < 50 ? '完成率偏低，下次排期时不妨少排一点、留出缓冲。'
        : rate >= 80 ? '保持得不错，继续维持这个节奏。'
        : '节奏还行，可以再紧凑一点。')
    );
    if (alloc.length && total > 0) {
      const top = alloc[0];
      insights.push(`时间主要花在「${label(top.cat)}」上，约 ${fmtH(top.hours)} 小时，占 ${Math.round((top.hours / total) * 100)}%。`);
    }
    const meet = byCat.meet ? byCat.meet.hours : 0;
    if (total > 0 && meet / total >= 0.5) insights.push('会议扎堆，把能异步处理的挪出来、给专注时段让位会更高效。');
    else if (byCat.deep) insights.push('有完整的深度工作时段，挺好，继续守住它。');

    return { label: _label, range: _range, total, count, done, cancelled, todo, rate, alloc, insights };
  }
  const computeDay = (dayEvents) => computeStats(dayEvents, '每日复盘', _iso(_TODAY));
  // 把若干天的事件汇总成一个扁平列表
  const gatherDays = (eventsObj, keys) => keys.reduce((out, k) => { const a = eventsObj && eventsObj[k]; if (a && a.length) out.push.apply(out, a); return out; }, []);

  // 所有周期都按真实数据实时算（之前 week/月以上读的是写死的示例报告，新用户会看到假数据——已修）
  function getReview(period, eventsObj) {
    if (period === 'day') return computeDay((eventsObj && eventsObj[relKey(0)]) || []);
    if (period === 'week') {
      const wd = windowDays(0); const keys = wd.map((d) => d.key);
      return computeStats(gatherDays(eventsObj, keys), '每周复盘', `${wd[0].month}/${wd[0].day}–${wd[6].month}/${wd[6].day}`);
    }
    const spec = { month: [30, '每月复盘', '近 30 天'], quarter: [90, '季度复盘', '近 90 天'], year: [365, '年度复盘', '近一年'] }[period] || [30, '复盘', ''];
    const keys = []; for (let i = 0; i < spec[0]; i++) keys.push(relKey(-i));
    return computeStats(gatherDays(eventsObj, keys), spec[1], spec[2]);
  }

  // 文件 / 图片上传 → 大模型自动提取的日程（样例）
  const upload = [
    { title: '项目评审会', dateKey: remap('06-19'), dateText: dateTextOf(remap('06-19')), time: '10:00', loc: '会议室 A', reminder: 15, cat: 'meet', dur: 90 },
    { title: '客户对接电话', dateKey: remap('06-19'), dateText: dateTextOf(remap('06-19')), time: '14:00', loc: '线上', reminder: 10, cat: 'meet', dur: 60 },
    { title: '提交季度报告', dateKey: remap('06-20'), dateText: dateTextOf(remap('06-20')), time: '18:00', loc: null, reminder: 30, cat: 'deep', dur: 60 },
  ];

  // 课表图片 → 大模型识别出的「每周重复」课程（样例）。dow: 0=日…6=六；dowToKey 已在顶部按真实窗口构建
  const courseSchedule = [
    { title: '高等数学', dow: 1, time: '08:00', dur: 100, loc: '理教 305', teacher: '李建国' },
    { title: '数据结构', dow: 3, time: '10:00', dur: 100, loc: '二教 401', teacher: '王敏' },
    { title: '高等数学', dow: 3, time: '14:00', dur: 100, loc: '理教 305', teacher: '李建国' },
    { title: '线性代数', dow: 4, time: '10:00', dur: 100, loc: '理教 201', teacher: '张伟' },
    { title: '数据结构', dow: 4, time: '14:00', dur: 100, loc: '二教 401', teacher: '王敏' },
    { title: '大学英语', dow: 5, time: '08:00', dur: 100, loc: '文史楼 208', teacher: 'Linda' },
    { title: '线性代数', dow: 5, time: '10:00', dur: 100, loc: '理教 201', teacher: '张伟' },
  ];
  const SEMESTER_END = _iso(_dayAt(24));
  const _w8 = _dayAt(56), _w16 = _dayAt(112);
  // 重复范围选项（课表导入 + 之后补充共用）。until 为 null 表示"暂不设置"
  const RECUR_OPTIONS = [
    { key: 'semester', label: '本学期末', sub: _fmtMD(_dayAt(24)), until: SEMESTER_END, untilText: _fmtMD(_dayAt(24)) + '（学期末）', ai: true },
    { key: 'w8', label: '重复 8 周', sub: '到 ' + _fmtMD(_w8), until: _iso(_w8), untilText: _fmtMD(_w8) },
    { key: 'w16', label: '重复 16 周', sub: '到 ' + _fmtMD(_w16), until: _iso(_w16), untilText: _fmtMD(_w16) },
    { key: 'custom', label: '自定义日期', sub: '手动选', until: null, untilText: null },
    { key: 'later', label: '暂不设置 · 之后再补', sub: '先按学期暂存', until: null, untilText: null },
  ];

  window.VL = window.VL || {};
  window.VL.data = { events, week, review, voice, upload, courseSchedule, dowToKey };
  window.VL.relKey = relKey;
  window.VL.todayISO = function () { return _iso(_TODAY); };
  window.VL.todayDateObj = function () { return new Date(_TODAY.getTime()); };
  window.VL.WEEK_KEYS = week.map((w) => w.key);
  window.VL.windowDays = windowDays;
  window.VL.dateText = dateTextOf;

  // ── 时间显示：内部一律存 24 小时 "HH:MM"，只在显示时格式化。──
  // window.VL.timeFmt 由 App 按设置写入（'24' | '12'）；默认 24。
  window.VL.timeFmt = '24';
  window.VL.fmtTime = function (hhmm, fmt) {
    fmt = fmt || window.VL.timeFmt || '24';
    if (!/^\d{1,2}:\d{2}$/.test(hhmm || '')) return hhmm || '';
    if (fmt === '24') return hhmm;
    const [h, m] = hhmm.split(':').map(Number);
    const ap = h < 6 ? '凌晨' : h < 12 ? '上午' : h < 13 ? '中午' : h < 18 ? '下午' : '晚上';
    let h12 = h % 12; if (h12 === 0) h12 = 12;
    return ap + h12 + ':' + String(m).padStart(2, '0');
  };
  window.VL.endTime = function (hhmm, dur) {
    if (!/^\d{1,2}:\d{2}$/.test(hhmm || '')) return hhmm || '';
    const [h, m] = hhmm.split(':').map(Number); const tot = h * 60 + m + (dur || 0);
    return String(Math.floor(tot / 60) % 24).padStart(2, '0') + ':' + String(tot % 60).padStart(2, '0');
  };
  // "几点到几点"：起点–终点（终点=起点+时长）
  window.VL.fmtRange = function (hhmm, dur, fmt) {
    return window.VL.fmtTime(hhmm, fmt) + '–' + window.VL.fmtTime(window.VL.endTime(hhmm, dur), fmt);
  };
  window.VL.SEMESTER_END = SEMESTER_END;
  window.VL.RECUR_OPTIONS = RECUR_OPTIONS;
  window.VL.computeDay = computeDay;
  window.VL.getReview = getReview;

  const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };

  // ── 时间精度：精确(at) / 时段(period) / 全天(allday) / 随手记(untimed) ──
  // 给"记流水账、记不清几点"的人用：时间从"必填精确值"变成"可选精度"
  window.VL.DAYPARTS = [
    { key: 'dawn', label: '凌晨', rep: '05:00' },
    { key: 'morning', label: '上午', rep: '09:00' },
    { key: 'noon', label: '中午', rep: '12:00' },
    { key: 'afternoon', label: '下午', rep: '15:00' },
    { key: 'evening', label: '晚上', rep: '20:00' },
    { key: 'night', label: '深夜', rep: '23:00' },
  ];
  window.VL.daypartOf = (key) => window.VL.DAYPARTS.find((d) => d.key === key) || null;
  // 规范化精度：显式 timeMode 优先；否则有合法 t → 精确，无 → 随手记（向后兼容老数据）
  window.VL.timeMode = function (ev) {
    const m = ev && ev.timeMode;
    if (m === 'allday' || m === 'untimed' || m === 'period') return m;
    return (ev && /^\d{1,2}:\d{2}$/.test(ev.t || '')) ? 'at' : 'untimed';
  };
  // 列表排序键（分钟）：全天置顶、随手记沉底、时段用代表时刻塞进大致位置
  window.VL.sortMin = function (ev) {
    const m = window.VL.timeMode(ev);
    if (m === 'allday') return -1;
    if (m === 'untimed') return 9999;
    if (m === 'period') { const d = window.VL.daypartOf(ev.daypart); return d ? toMin(d.rep) : 9999; }
    return toMin(ev.t);
  };
  // 显示用时间标签：精确→时刻；时段→上午/下午…；全天→全天；随手记→空
  window.VL.timeLabel = function (ev, fmt) {
    const m = window.VL.timeMode(ev);
    if (m === 'allday') return '全天';
    if (m === 'untimed') return '';
    if (m === 'period') { const d = window.VL.daypartOf(ev.daypart); return d ? d.label : '某时段'; }
    return window.VL.fmtTime(ev.t, fmt);
  };

  // 时间重叠检测（允许重叠，仅用于提醒）——只有"精确"事件占时段、参与冲突
  window.VL.overlaps = function (dayEvents, ev) {
    if (window.VL.timeMode(ev) !== 'at') return [];
    const s = toMin(ev.t), e = s + (ev.dur || 60);
    return (dayEvents || []).filter((x) => {
      if (x.id === ev.id || x.status === 'cancelled' || window.VL.timeMode(x) !== 'at') return false;
      const xs = toMin(x.t), xe = xs + (x.dur || 60);
      return s < xe && xs < e;
    });
  };
  window.VL.MULTITASK_NOTE = '一心多用时，前额叶要在任务间反复切换，认知负担更重、出错更多，长期还可能削弱专注力。能错开就错开，让需要专注的事各自独占一段时间。';

  // ── 语音复盘意图：用户说"我想复盘一下/复盘/记一下想法/今天感觉…"→ 不建日程，转成"个性化复盘" ──
  const REFLECT_TRIGGER = /^(嗯+|那个|我?想?)?\s*(复盘一?下?|做个?复盘|记一?下?(我的)?(想法|感受|心情)|说(说|下)(今天|这周)?(的)?(想法|感受|总结)|总结一?下?(今天|这周)?|今天(的)?(感觉|感受|想说)|聊聊今天)/;
  // ── 本地纠错词典：{错→对}，存 localStorage。语音/打字解析前自动替换，越用越准 ──
  window.VL.corrections = {
    _key: 'voicelog:corrections',
    _load() { try { return JSON.parse(localStorage.getItem(this._key) || '{}'); } catch (e) { return {}; } },
    _save(d) { try { localStorage.setItem(this._key, JSON.stringify(d)); } catch (e) {} },
    list() { const d = this._load(); return Object.keys(d).map((k) => ({ wrong: k, right: d[k] })); },
    add(wrong, right) { wrong = String(wrong || '').trim(); right = String(right || '').trim(); if (!wrong || !right || wrong === right) return false; const d = this._load(); d[wrong] = right; this._save(d); return true; },
    remove(wrong) { const d = this._load(); delete d[wrong]; this._save(d); },
    // 把已知错词替换成对的（长词优先，避免子串误替换）
    apply(text) { let s = String(text || ''); const d = this._load(); Object.keys(d).sort((a, b) => b.length - a.length).forEach((k) => { if (k) s = s.split(k).join(d[k]); }); return s; },
  };
  window.VL.isReflectIntent = (text) => REFLECT_TRIGGER.test(String(text || '').trim());
  // 去掉开头的触发语，留下真正的复盘内容
  window.VL.stripReflectTrigger = (text) => String(text || '').trim().replace(REFLECT_TRIGGER, '').replace(/^[，,。、:：\s]+/, '').trim();

  // ── 建议式改期：找空档（artifact 不会自动重排，只列选项给用户挑）──
  // 在 SLOT_START–SLOT_END 内，为 ev 找最多 3 个「不与他人重叠」的空档，优先离原时间近的。
  // 纯函数：返回 [{ time:'HH:MM', end:'HH:MM', label }]。每个空档取离原时间最近的可行起点，互不重复。
  window.VL.SLOT_START = 7 * 60;   // 07:00
  window.VL.SLOT_END = 22 * 60;    // 22:00
  window.VL.suggestSlots = function (dayEvents, ev) {
    const W0 = window.VL.SLOT_START, W1 = window.VL.SLOT_END;
    const dur = (ev && ev.dur) || 60;
    if (dur <= 0 || dur > W1 - W0) return [];
    const orig = toMin(ev.t);
    // 占用区间（排除自身与已取消），裁剪到 [W0,W1] 后合并
    const busy = (dayEvents || [])
      .filter((x) => x.id !== ev.id && x.status !== 'cancelled')
      .map((x) => { const s = toMin(x.t); return [Math.max(W0, s), Math.min(W1, s + (x.dur || 60))]; })
      .filter(([s, e]) => e > s)
      .sort((a, b) => a[0] - b[0]);
    const merged = [];
    busy.forEach(([s, e]) => {
      const last = merged[merged.length - 1];
      if (last && s <= last[1]) last[1] = Math.max(last[1], e);
      else merged.push([s, e]);
    });
    // 计算空档（容得下 dur 的才算）
    const gaps = []; let cursor = W0;
    merged.forEach(([s, e]) => { if (s - cursor >= dur) gaps.push([cursor, s]); cursor = Math.max(cursor, e); });
    if (W1 - cursor >= dur) gaps.push([cursor, W1]);
    // 每个空档取离原时间最近的起点；跳过等于当前时间的（无意义）
    const fmt = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    const starts = gaps
      .map(([s, e]) => Math.max(s, Math.min(orig, e - dur)))
      .filter((start) => start !== orig)
      .sort((a, b) => Math.abs(a - orig) - Math.abs(b - orig))
      .slice(0, 3);
    return starts.map((start) => {
      const diff = start - orig, abs = Math.abs(diff);
      const h = Math.floor(abs / 60), m = abs % 60;
      const span = [h ? h + ' 小时' : '', m ? m + ' 分' : ''].filter(Boolean).join(' ');
      return { time: fmt(start), end: fmt(start + dur), label: diff < 0 ? `早 ${span}` : `晚 ${span}` };
    });
  };

  // ── 重要 × 紧急 四象限（艾森豪威尔矩阵）──
  // important（⭐已有）× urgent（🚩新增）→ 四格。Q2「重要不紧急」是成长区，呼应产品灵魂。
  const QUADRANTS = {
    do:       { key: 'do',       label: '重要 · 紧急',    advice: '立即做',         color: 'oklch(0.62 0.19 25)',  imp: true,  urg: true,  pos: 0 },
    plan:     { key: 'plan',     label: '重要 · 不紧急',  advice: '计划做 · 成长区',  color: 'oklch(0.60 0.13 165)', imp: true,  urg: false, pos: 1 },
    delegate: { key: 'delegate', label: '紧急 · 不重要',  advice: '快办 / 能托则托',  color: 'oklch(0.72 0.14 70)',  imp: false, urg: true,  pos: 2 },
    reduce:   { key: 'reduce',   label: '不重要 · 不紧急', advice: '可减少',          color: 'oklch(0.65 0.03 260)', imp: false, urg: false, pos: 3 },
  };
  window.VL.QUADRANTS = QUADRANTS;
  window.VL.QUAD_ORDER = ['do', 'plan', 'delegate', 'reduce'];
  window.VL.quadrant = function (ev) {
    const i = !!(ev && ev.important), u = !!(ev && ev.urgent);
    return i && u ? QUADRANTS.do : i && !u ? QUADRANTS.plan : !i && u ? QUADRANTS.delegate : QUADRANTS.reduce;
  };
  // 各象限的小时数 / 件数（未取消）——给复盘/成长用
  window.VL.quadrantStats = function (dayEventsOrObj) {
    let all = [];
    if (Array.isArray(dayEventsOrObj)) all = dayEventsOrObj;
    else Object.keys(dayEventsOrObj || {}).forEach((k) => (dayEventsOrObj[k] || []).forEach((e) => all.push(e)));
    const out = { do: { hours: 0, items: 0 }, plan: { hours: 0, items: 0 }, delegate: { hours: 0, items: 0 }, reduce: { hours: 0, items: 0 } };
    all.filter((e) => e.status !== 'cancelled').forEach((e) => { const q = window.VL.quadrant(e); out[q.key].hours += (e.dur || 0) / 60; out[q.key].items += 1; });
    const total = Object.values(out).reduce((s, q) => s + q.hours, 0);
    return { byKey: out, total };
  };
  window.VL.MATRIX_NOTE = '把事情按「重要」和「紧急」两个维度分四格：重要又紧急的立即做；重要但不紧急的，才是真正带来成长的区，值得计划着多投入；紧急但不重要的尽量快办或交出去；既不重要也不紧急的，少做一点。语迹不替你判定——你来标，它帮你看清。';
  // 每日容量（小时）：单日排程超过它时温和提醒「今天排太满了」（借 Sunsama 的"过度安排"提示）
  window.VL.DAILY_CAPACITY_H = 8;
  // 某天已排（未取消）的小时数
  window.VL.dayLoad = function (dayEvents) {
    return (dayEvents || []).filter((e) => e.status !== 'cancelled').reduce((s, e) => s + (e.dur || 0), 0) / 60;
  };
  // 日期键工具 + 未完成（待办）筛选（用于「未完成顺延」）
  window.VL.todayKey = function () { const w = (window.VL.data.week || []).find((x) => x.today); return w ? w.key : '06-16'; };
  window.VL.prevKey = function (key) { const o = (window.VL.data.week || []).map((w) => w.key); const i = o.indexOf(key); return i > 0 ? o[i - 1] : null; };
  window.VL.unfinished = function (dayEvents) { return (dayEvents || []).filter((e) => e.status === 'todo'); };
  // MM-DD 键 → 最接近今天的那个 Date（处理跨年）
  window.VL.keyDate = function (key) {
    const base = window.VL.todayDateObj ? window.VL.todayDateObj() : new Date();
    const parts = String(key || '').split('-'); const mo = +parts[0], da = +parts[1];
    if (!mo || !da) return base;
    let d = new Date(base.getFullYear(), mo - 1, da);
    const diff = (d - base) / 86400000;
    if (diff > 182) d = new Date(base.getFullYear() - 1, mo - 1, da);
    else if (diff < -182) d = new Date(base.getFullYear() + 1, mo - 1, da);
    return d;
  };
  // 今天之前所有"待办(todo)"——含前几天累积的，按日期升序。返回 [{key, ev}]
  window.VL.pendingBefore = function (eventsObj, todayKey) {
    const today = window.VL.keyDate(todayKey || window.VL.todayKey());
    const out = [];
    Object.keys(eventsObj || {}).forEach((k) => {
      if (window.VL.keyDate(k) >= today) return;
      (eventsObj[k] || []).forEach((e) => { if (e.status === 'todo') out.push({ key: k, ev: e }); });
    });
    out.sort((a, b) => window.VL.keyDate(a.key) - window.VL.keyDate(b.key));
    return out;
  };

  // 批量执行「待执行清单」：纯函数，返回新 events + 计数（新增 / 完成）。供移动端 + Web 共用、可单测。
  window.VL.applyBatchTo = function (prev, actions) {
    const next = {}; Object.keys(prev || {}).forEach((k) => { next[k] = (prev[k] || []).map((e) => ({ ...e })); });
    let created = 0, completed = 0;
    const rid = () => 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const mk = (d, status) => ({ id: rid(), t: d.time, timeMode: d.timeMode || undefined, daypart: d.daypart || undefined, dur: (d.timeMode && d.timeMode !== 'at') ? 0 : (d.dur || 60), title: d.title, cat: d.cat, loc: d.loc || null, reminder: d.reminder || 0, status, important: !!d.important, urgent: !!d.urgent, note: d.note || undefined, progress: d.progress || undefined });
    let rescheduled = 0, cancelled = 0;
    // 定位已有日程：优先 targetId（千问从我们给的清单里选），否则按标题模糊匹配
    const findLoc = (id, title, dateKey) => {
      if (id) { for (const day of Object.keys(next)) { const e = (next[day] || []).find((x) => x.id === id); if (e) return { e, day }; } }
      if (!title) return null;
      const days = [dateKey, window.VL.todayKey(), window.VL.prevKey(window.VL.todayKey()), ...Object.keys(next)].filter(Boolean);
      const seen = new Set();
      for (const day of days) {
        if (seen.has(day)) continue; seen.add(day);
        const e = (next[day] || []).find((x) => x.status !== 'cancelled' && (x.title.includes(title) || title.includes(x.title)));
        if (e) return { e, day };
      }
      return null;
    };
    (actions || []).forEach((a) => {
      const d = a.draft || {};
      if (a.kind === 'reschedule') {
        const loc = findLoc(a.targetId, a.title, d.dateKey);
        if (!loc) return;
        const newDay = d.dateKey || loc.day;
        const patched = { ...loc.e, t: d.time || loc.e.t };
        if (newDay !== loc.day) { next[loc.day] = next[loc.day].filter((x) => x.id !== loc.e.id); next[newDay] = [...(next[newDay] || []), patched]; }
        else { next[loc.day] = next[loc.day].map((x) => (x.id === loc.e.id ? patched : x)); }
        rescheduled += 1;
      } else if (a.kind === 'cancel') {
        const loc = findLoc(a.targetId, a.title, d.dateKey);
        if (loc) { next[loc.day] = next[loc.day].map((x) => (x.id === loc.e.id ? { ...x, status: 'cancelled' } : x)); cancelled += 1; }
      } else if (a.kind === 'complete') {
        const loc = findLoc(a.targetId, a.title, d.dateKey);
        if (loc) { next[loc.day] = next[loc.day].map((x) => (x.id === loc.e.id ? { ...x, status: 'done' } : x)); }
        else { next[d.dateKey] = [...(next[d.dateKey] || []), mk(d, 'done')]; }
        completed += 1;
      } else {
        next[d.dateKey] = [...(next[d.dateKey] || []), mk(d, d.status === 'done' ? 'done' : 'todo')];
        created += 1;
      }
    });
    return { next, created, completed, rescheduled, cancelled };
  };
  // 给后端"语音改期/取消"用：把现有日程压成精简清单（带 id 供匹配）
  window.VL.candidateEvents = function (eventsObj) {
    const out = [];
    Object.keys(eventsObj || {}).forEach((k) => (eventsObj[k] || []).forEach((e) => {
      if (e.status === 'cancelled') return;
      const dt = window.VL.keyDate(k);
      const iso = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
      out.push({ id: e.id, title: e.title, date: iso, time: e.t });
    }));
    return out.slice(0, 50);
  };
  window.VL.periods = [
    { key: 'day', label: '日' }, { key: 'week', label: '周' },
    { key: 'month', label: '月' }, { key: 'quarter', label: '季' },
    { key: 'year', label: '年' },
  ];

  // ── 成长系统：等级 / XP（只升不降，绝不惩罚、绝不裸 streak）──
  // 称号文字可自由替换；阈值为累计 XP。
  const LEVELS = [
    { lv: 1,  need: 0,    name: '初次记录的人' },
    { lv: 2,  need: 30,   name: '开始留意时间的人' },
    { lv: 3,  need: 80,   name: '渐入轨道的人' },
    { lv: 4,  need: 160,  name: '稳步前行的人' },
    { lv: 5,  need: 270,  name: '掌控节奏的人' },
    { lv: 6,  need: 410,  name: '善用时间的人' },
    { lv: 7,  need: 590,  name: '复盘成习惯的人' },
    { lv: 8,  need: 820,  name: '时间的经营者' },
    { lv: 9,  need: 1100, name: '自律自如的人' },
    { lv: 10, need: 1450, name: '时间的主人' },
  ];
  // 动作驱动、只增不减、不惩罚。复盘最被看重（复盘是主场）。
  const XP = { create: 2, done: 5, reflect: 15 };
  // 给「成长规则」卡展示用：每条 = { key, icon, label, xp }
  const XP_RULES = [
    { key: 'create', icon: 'plus', label: '记录一条安排', xp: XP.create },
    { key: 'done', icon: 'check', label: '完成一条', xp: XP.done },
    { key: 'reflect', icon: 'sparkle', label: '写下 / 说出一次复盘', xp: XP.reflect },
  ];

  function levelFromXp(xp) {
    let cur = LEVELS[0];
    for (const L of LEVELS) if (xp >= L.need) cur = L;
    const idx = LEVELS.indexOf(cur);
    const next = LEVELS[idx + 1] || null;
    const into = xp - cur.need;
    const span = next ? next.need - cur.need : 1;
    const pct = next ? Math.max(0, Math.min(100, Math.round((into / span) * 100))) : 100;
    const remain = next ? next.need - xp : 0;
    return { ...cur, next, idx, into, span, pct, remain };
  }

  // 本周成长统计（基于真实日程，保证主页/复盘/成长处处一致）
  function growthStats(eventsObj) {
    const all = [];
    Object.keys(eventsObj || {}).forEach((k) => (eventsObj[k] || []).forEach((e) => all.push(e)));
    const live = all.filter((e) => e.status !== 'cancelled');
    const done = all.filter((e) => e.status === 'done').length;
    const cancelled = all.filter((e) => e.status === 'cancelled').length;
    const todo = all.length - done - cancelled;
    const denom = done + todo;
    const completion = denom ? Math.round((done / denom) * 100) : 0;
    const byCat = {};
    live.forEach((e) => {
      const c = e.cat || 'misc';
      byCat[c] = byCat[c] || { cat: c, hours: 0, items: 0 };
      byCat[c].hours += (e.dur || 0) / 60;
      byCat[c].items += 1;
    });
    const alloc = Object.values(byCat).sort((a, b) => b.hours - a.hours);
    const totalH = alloc.reduce((s, a) => s + a.hours, 0);
    return { recordCount: all.length, done, todo, cancelled, completion, alloc, totalH };
  }

  function growthInsight(L, stats) {
    if (stats.recordCount === 0) return '本周还没有日程记录。记一条，就向下一级迈进一步。';
    const parts = [];
    if (stats.done) parts.push(`本周已完成 ${stats.done} 项`);
    if (L.next) parts.push(`再积累 ${L.remain} XP 就能升到 LV.${L.next.lv}`);
    parts.push('late better than never——你一直在向上');
    return parts.join('，') + '。';
  }

  window.VL.LEVELS = LEVELS;
  window.VL.XP = XP;
  window.VL.XP_RULES = XP_RULES;
  window.VL.levelFromXp = levelFromXp;
  window.VL.growthStats = growthStats;
  window.VL.growthInsight = growthInsight;
  // 「它对你的了解」成熟度（借 Typeless 把"AI 懂你"量化）：随累计天数与记录缓慢上升，封顶 95%
  window.VL.insightMaturity = function (accumulatedDays, recordCount) {
    const d = accumulatedDays || 0, r = recordCount || 0;
    return Math.min(95, Math.round(100 * (1 - Math.exp(-((d * 0.6 + r * 1.2) / 90)))));
  };
  // 语音信任反馈（借 Typeless「捕捉想法而非词」）：统计口头语、识别自我更正
  window.VL.speechTrust = function (text) {
    const s = text || '';
    let fillers = 0;
    ['嗯', '呃', '额', '啊', '那个', '这个', '就是', '哦', '唉'].forEach((w) => { const m = s.match(new RegExp(w, 'g')); if (m) fillers += m.length; });
    const corrected = /不对|不是.*?是|改成|应该是|说错|搞错|算了/.test(s);
    return { fillers, corrected };
  };
  // 成长色：暖金（跨主题统一，呼应 PRD「等级=暖金」）
  window.VL.GOLD = 'oklch(0.78 0.115 82)';
  window.VL.GOLD_SOFT = 'oklch(0.92 0.05 85)';

  // ── 后端代理地址（口语 → 千问 真·AI 解析，见 server/）。──
  // 来源优先级：URL 的 ?server=... （写入并持久化）→ localStorage。没配置则为空，
  // 语音解析自动回退到本地规则引擎（离线可用、零回归）。
  (function () {
    let url = '';
    try {
      const q = new URLSearchParams(location.search).get('server');
      if (q && q.trim()) { url = q.trim(); try { localStorage.setItem('voicelog:serverUrl', url); } catch (e) {} }
      else { try { url = localStorage.getItem('voicelog:serverUrl') || ''; } catch (e) { url = ''; } }
    } catch (e) { url = ''; }
    window.VL.serverUrl = url;
  })();
  window.VL.setServerUrl = function (u) {
    u = (u || '').trim(); window.VL.serverUrl = u;
    try { u ? localStorage.setItem('voicelog:serverUrl', u) : localStorage.removeItem('voicelog:serverUrl'); } catch (e) {}
  };
})();
