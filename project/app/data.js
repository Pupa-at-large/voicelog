/* VoiceLog · 示例数据 */
(function () {
  // 当天 = 2026-06-16 周一（与示例复盘一致）
  const events = {
    '06-16': [
      { id: 'e0', t: '09:00', dur: 60, title: '季度规划 PPT', cat: 'deep', status: 'todo', goal: true,
        progress: { done: 1, total: 4 }, note: '分四次打磨：① 大纲 ② 数据 ③ 排版 ④ 演练。今天先搭大纲。' },
      { id: 'e1', t: '10:00', dur: 60, title: '写产品方案', cat: 'deep', status: 'done',
        note: '先把核心流程理清，写完发群里给大家看。' },
      { id: 'e2', t: '11:30', dur: 60, title: '团队周会', cat: 'meet', loc: '会议室 A',
        reminder: 10, status: 'todo', note: '同步上周进度，过本周排期。' },
      { id: 'e3', t: '15:00', dur: 60, title: '跟老王开会', cat: 'meet', loc: '公司',
        reminder: 30, status: 'todo', important: true, note: '确认下季度排期与人手。' },
      { id: 'e4', t: '19:00', dur: 60, title: '健身 · 跑步', cat: 'life',
        reminder: 15, status: 'todo' },
    ],
    '06-17': [
      { id: 'f1', t: '09:30', dur: 90, title: '需求评审', cat: 'meet', loc: '会议室 B',
        reminder: 15, status: 'todo' },
      { id: 'f2', t: '14:00', dur: 120, title: '专注写代码', cat: 'deep', status: 'todo', goal: true,
        progress: { done: 2, total: 5 },
        note: '把解析引擎的边界情况补全。' },
    ],
    '06-18': [
      { id: 'g1', t: '20:00', dur: 60, title: '读书 · 《深度工作》', cat: 'learn',
        reminder: 10, status: 'todo' },
    ],
  };

  // 周条：6/15(日) … 6/21(六)，今天 6/16
  const week = [
    { key: '06-15', dow: '日', day: 15 },
    { key: '06-16', dow: '一', day: 16, today: true },
    { key: '06-17', dow: '二', day: 17 },
    { key: '06-18', dow: '三', day: 18 },
    { key: '06-19', dow: '四', day: 19 },
    { key: '06-20', dow: '五', day: 20 },
    { key: '06-21', dow: '六', day: 21 },
  ];

  // 复盘数据（五个周期）
  const review = {
    day: {
      label: '每日复盘', range: '2026-06-16',
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

  // 语音示例：识别 → 解析
  const voice = {
    phrase: '明天下午三点跟老王开会，提前半小时提醒我，在公司',
    chunks: ['明天', '下午三点', '跟老王开会，', '提前半小时提醒我，', '在公司'],
    parsed: {
      title: '跟老王开会',
      dateKey: '06-17', dateText: '明天 · 6月17日 周二',
      time: '15:00', loc: '公司', reminder: 30, cat: 'meet', dur: 60,
    },
  };

  const fmtH = (h) => (Number.isInteger(h) ? h + '' : h.toFixed(1));

  // 从真实日程实时计算「当日复盘」，保证主页/复盘/导出处处一致
  function computeDay(dayEvents) {
    const evs = (dayEvents || []).slice();
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

    return { label: '每日复盘', range: '2026-06-16', total, count, done, cancelled, todo, rate, alloc, insights };
  }

  function getReview(period, eventsObj) {
    if (period === 'day') return computeDay((eventsObj && eventsObj['06-16']) || []);
    return review[period];
  }

  // 文件 / 图片上传 → 大模型自动提取的日程（样例）
  const upload = [
    { title: '项目评审会', dateKey: '06-19', dateText: '周五 · 6月19日 周五', time: '10:00', loc: '会议室 A', reminder: 15, cat: 'meet', dur: 90 },
    { title: '客户对接电话', dateKey: '06-19', dateText: '周五 · 6月19日 周五', time: '14:00', loc: '线上', reminder: 10, cat: 'meet', dur: 60 },
    { title: '提交季度报告', dateKey: '06-20', dateText: '周六 · 6月20日 周六', time: '18:00', loc: null, reminder: 30, cat: 'deep', dur: 60 },
  ];

  // 课表图片 → 大模型识别出的「每周重复」课程（样例）
  // dow: 0=日 1=一 … 6=六 ；与 week 数组一致
  const dowToKey = { 0: '06-15', 1: '06-16', 2: '06-17', 3: '06-18', 4: '06-19', 5: '06-20', 6: '06-21' };
  const courseSchedule = [
    { title: '高等数学', dow: 1, time: '08:00', dur: 100, loc: '理教 305', teacher: '李建国' },
    { title: '数据结构', dow: 3, time: '10:00', dur: 100, loc: '二教 401', teacher: '王敏' },
    { title: '高等数学', dow: 3, time: '14:00', dur: 100, loc: '理教 305', teacher: '李建国' },
    { title: '线性代数', dow: 4, time: '10:00', dur: 100, loc: '理教 201', teacher: '张伟' },
    { title: '数据结构', dow: 4, time: '14:00', dur: 100, loc: '二教 401', teacher: '王敏' },
    { title: '大学英语', dow: 5, time: '08:00', dur: 100, loc: '文史楼 208', teacher: 'Linda' },
    { title: '线性代数', dow: 5, time: '10:00', dur: 100, loc: '理教 201', teacher: '张伟' },
  ];
  const SEMESTER_END = '2026-07-10';
  // 重复范围选项（课表导入 + 之后补充共用）。until 为 null 表示"暂不设置"
  const RECUR_OPTIONS = [
    { key: 'semester', label: '本学期末', sub: '7月10日', until: SEMESTER_END, untilText: '7月10日（学期末）', ai: true },
    { key: 'w8', label: '重复 8 周', sub: '到 8月11日', until: '2026-08-11', untilText: '8月11日' },
    { key: 'w16', label: '重复 16 周', sub: '到 10月6日', until: '2026-10-06', untilText: '10月6日' },
    { key: 'custom', label: '自定义日期', sub: '手动选', until: null, untilText: null },
    { key: 'later', label: '暂不设置 · 之后再补', sub: '先按学期暂存', until: null, untilText: null },
  ];

  window.VL = window.VL || {};
  window.VL.data = { events, week, review, voice, upload, courseSchedule, dowToKey };
  window.VL.SEMESTER_END = SEMESTER_END;
  window.VL.RECUR_OPTIONS = RECUR_OPTIONS;
  window.VL.computeDay = computeDay;
  window.VL.getReview = getReview;

  // 时间重叠检测（允许重叠，仅用于提醒）
  const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  window.VL.overlaps = function (dayEvents, ev) {
    const s = toMin(ev.t), e = s + (ev.dur || 60);
    return (dayEvents || []).filter((x) => {
      if (x.id === ev.id || x.status === 'cancelled') return false;
      const xs = toMin(x.t), xe = xs + (x.dur || 60);
      return s < xe && xs < e;
    });
  };
  window.VL.MULTITASK_NOTE = '一心多用时，前额叶要在任务间反复切换，认知负担更重、出错更多，长期还可能削弱专注力。能错开就错开，让需要专注的事各自独占一段时间。';
  window.VL.periods = [
    { key: 'day', label: '日' }, { key: 'week', label: '周' },
    { key: 'month', label: '月' }, { key: 'quarter', label: '季' },
    { key: 'year', label: '年' },
  ];
})();
