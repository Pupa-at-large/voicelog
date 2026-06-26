/* 语迹 VoiceLog · 客户端同步模块（骨架）—— window.VL.sync
 *
 * 本地优先：没配置后端 / 没登录时，所有函数安全降级，绝不影响离线使用。
 * 职责：① 手机号验证码登录拿 token；② 把本地 {day:[ev]} 与服务器做增量同步（后写赢）。
 * 真正接进 App 的状态机是「下一步」——这里先把 API + 纯合并逻辑准备好、可单测。
 */
(function () {
  const VL = (window.VL = window.VL || {});
  const K = { url: 'voicelog:serverUrl', token: 'voicelog:token', phone: 'voicelog:phone', cursor: 'voicelog:syncCursor' };
  const get = (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const set = (k, v) => { try { (v == null || v === '') ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} };
  const base = () => (VL.serverUrl || get(K.url) || '').replace(/\/+$/, '');
  const token = () => get(K.token);

  async function api(path, opts) {
    if (!base()) throw new Error('未配置后端地址');
    const r = await fetch(base() + path, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: 'Bearer ' + token() } : {}), ...((opts && opts.headers) || {}) },
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'HTTP ' + r.status);
    return data;
  }

  // ── 账户 ──
  const configure = (url) => { if (VL.setServerUrl) VL.setServerUrl(url || ''); else { set(K.url, url || ''); VL.serverUrl = url || ''; } };
  const requestOtp = (phone) => api('/auth/request', { method: 'POST', body: JSON.stringify({ phone }) });
  async function verifyOtp(phone, code) {
    const d = await api('/auth/verify', { method: 'POST', body: JSON.stringify({ phone, code }) });
    set(K.token, d.token); set(K.phone, d.phone); set(K.cursor, '0');
    return d;
  }
  const logout = () => { set(K.token, null); set(K.phone, null); set(K.cursor, null); };
  const isLoggedIn = () => !!token();
  const currentPhone = () => get(K.phone);

  // ── 纯函数：本地 {day:[ev]} ⇄ 扁平行（带 day/updated_at/deleted）。可在 node 里单测。──
  function flatten(eventsByDay) {
    const rows = [];
    for (const day of Object.keys(eventsByDay || {})) for (const ev of eventsByDay[day] || []) rows.push({ ...ev, day, updated_at: ev.updated_at || 0 });
    return rows;
  }
  function stripMeta(r) { const { day, updated_at, deleted, seq, ...ev } = r; return ev; }
  function rebuild(rows) {
    const byDay = {};
    for (const r of rows) { if (r.deleted) continue; (byDay[r.day] = byDay[r.day] || []).push(stripMeta(r)); }
    for (const day of Object.keys(byDay)) byDay[day].sort((a, b) => String(a.t || '').localeCompare(String(b.t || '')));
    return byDay;
  }
  // 后写赢：同 id 取 updated_at 较大者
  function merge(localRows, remoteRows) {
    const m = new Map();
    for (const r of localRows) m.set(r.id, r);
    for (const r of remoteRows) { const cur = m.get(r.id); if (!cur || Number(r.updated_at || 0) >= Number(cur.updated_at || 0)) m.set(r.id, r); }
    return [...m.values()];
  }

  // ── 一次同步：推本地变化 → 拉远端增量 → 返回合并后的 {day:[ev]}。降级安全。──
  async function syncNow(eventsByDay) {
    if (!base() || !isLoggedIn()) return { events: eventsByDay, skipped: true };
    const localRows = flatten(eventsByDay);
    await api('/sync/push', { method: 'POST', body: JSON.stringify({ events: localRows }) });
    const since = Number(get(K.cursor) || 0) || 0;
    const pulled = await api('/sync/pull?since=' + since, { method: 'GET' });
    set(K.cursor, String(pulled.cursor || since));
    return { events: rebuild(merge(localRows, pulled.events || [])), cursor: pulled.cursor };
  }

  VL.sync = { configure, requestOtp, verifyOtp, logout, isLoggedIn, currentPhone, base, flatten, rebuild, merge, syncNow };
})();
