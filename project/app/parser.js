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

  // 周几 → 本周日期键
  const DOW2KEY = { 日: '06-15', 天: '06-15', 一: '06-16', 二: '06-17', 三: '06-18', 四: '06-19', 五: '06-20', 六: '06-21' };

  function dateTextOf(key, prefix) {
    const w = (window.VL.data.week || []).find((x) => x.key === key);
    if (!w) return prefix || key;
    const base = `6月${w.day}日 周${w.dow}`;
    return prefix ? `${prefix} · ${base}` : base;
  }

  function parse(text) {
    const raw = (text || '').trim();
    let rest = raw;
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
          else { const wm = rest.match(/(?:持续|连续|共)?\s*([0-9]+|[两二三四五六七八九十]+)\s*(?:个)?\s*(?:周|星期|礼拜)/); if (wm) { const w = cnInt(wm[1]); if (w) { const b = new Date('2026-06-15T00:00:00'); b.setDate(b.getDate() + w * 7); until = b.toISOString().slice(0, 10); untilText = `${w}周后`; rest = rest.replace(wm[0], ' '); } } }
        }
        repeat = { freq, dows, until, untilText };
      }
    }

    // ── 日期 ──
    let dateKey = '06-16', datePrefix = '今天';
    if (/大后天/.test(rest)) { dateKey = '06-19'; datePrefix = '大后天'; strip(/大后天/); }
    else if (/后天/.test(rest)) { dateKey = '06-18'; datePrefix = '后天'; strip(/后天/); }
    else if (/明天|明儿/.test(rest)) { dateKey = '06-17'; datePrefix = '明天'; strip(/明天|明儿/); }
    else if (/今天|今儿|今晚|今早/.test(rest)) { dateKey = '06-16'; datePrefix = '今天'; strip(/今天|今儿/); }
    else {
      const m = rest.match(/(?:下个?周|下星期|下礼拜|这?周|这?星期|这?礼拜)([一二三四五六日天])/);
      if (m && DOW2KEY[m[1]]) { dateKey = DOW2KEY[m[1]]; datePrefix = (/下/.test(m[0]) ? '下周' : '周') + m[1]; strip(/(?:下个?周|下星期|下礼拜|这?周|这?星期|这?礼拜)[一二三四五六日天]/); }
    }

    // ── 时段 ──
    let ampm = null;
    if (/凌晨|早上|早晨|上午/.test(rest)) ampm = 'am';
    else if (/中午/.test(rest)) ampm = 'noon';
    else if (/下午|午后/.test(rest)) ampm = 'pm';
    else if (/晚上|夜里|今晚|傍晚/.test(rest)) ampm = 'pm';
    strip(/凌晨|早上|早晨|上午|中午|下午|午后|晚上|夜里|今晚|傍晚/);

    // ── 时间 ──
    let hh = null, mm = 0, hasTime = false;
    let m = strip(/([0-9]{1,2})\s*[:：]\s*([0-9]{1,2})/);
    if (m) { hh = parseInt(m[1], 10); mm = parseInt(m[2], 10); hasTime = true; }
    else {
      m = strip(/([0-9]{1,2}|[零一二两三四五六七八九十]+)\s*[点时](?:\s*(半|一刻|三刻|[0-9一二两三四五六七八九十]+)\s*分?)?/);
      if (m) {
        hh = cnInt(m[1]); hasTime = hh != null;
        const f = m[2];
        if (f === '半') mm = 30; else if (f === '一刻') mm = 15; else if (f === '三刻') mm = 45;
        else if (f) { const v = cnInt(f.replace('分', '')); if (v != null) mm = v; }
      }
    }
    if (hasTime) {
      if (ampm === 'pm' && hh < 12) hh += 12;
      else if (ampm === 'noon') hh = 12;
      else if (ampm === 'am' && hh === 12) hh = 0;
    } else { hh = 9; mm = 0; }
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

    const out = { title, dateKey, dateText: dateTextOf(dateKey, datePrefix), time, loc, reminder, cat, dur: 60 };
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
})();
