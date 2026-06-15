/* VoiceLog · 设计令牌 —— 三套「柔和现代」视觉方向 + 可选主色 */
(function () {
  // 五个时间类别（与 README / 示例复盘一致）
  const CATS = {
    meet:  { label: '会议沟通', hue: 252 },
    deep:  { label: '深度工作', hue: 168 },
    life:  { label: '生活健康', hue: 140 },
    learn: { label: '学习成长', hue: 304 },
    misc:  { label: '杂务',     hue: 70, neutral: true },
  };

  function buildCats(L, C, neutralStr) {
    const out = {};
    for (const k in CATS) {
      const c = CATS[k];
      out[k] = { label: c.label, color: c.neutral ? neutralStr : `oklch(${L} ${C} ${c.hue})` };
    }
    return out;
  }

  // 主色色板：同明度/彩度，只换色相 —— 克制、不破坏调性
  // p = { aL,aC, tL,tC, sL,sC }（accent / accentText / accentSoft 的明度彩度）
  function buildAccents(p, swatches) {
    return swatches.map((s) => ({
      key: s.key, name: s.name, hue: s.hue,
      accent: `oklch(${p.aL} ${p.aC} ${s.hue})`,
      accentText: `oklch(${p.tL} ${p.tC} ${s.hue})`,
      accentSoft: `oklch(${p.sL} ${p.sC} ${s.hue})`,
    }));
  }

  const cloud = {
    key: 'cloud', name: '云', en: 'Cloud', mode: 'light',
    font: '-apple-system, "PingFang SC", "Segoe UI", system-ui, sans-serif',
    radius: 16, cardPad: 16, rowGap: 10, density: 'normal',
    bg: '#F3F5F7', surface: '#FFFFFF', surface2: '#EEF1F3', raised: '#FFFFFF',
    text: '#14181B', muted: '#5C656D', faint: '#9AA3AB',
    border: 'rgba(20,24,27,0.08)', borderStrong: 'rgba(20,24,27,0.14)',
    onAccent: '#FFFFFF',
    shadow: '0 1px 2px rgba(16,24,40,0.05), 0 6px 20px rgba(16,24,40,0.06)',
    shadowLg: '0 12px 40px rgba(16,24,40,0.14)',
    cat: buildCats(0.66, 0.125, 'oklch(0.72 0.018 250)'),
    chartTrack: 'rgba(20,24,27,0.06)',
    accents: buildAccents(
      { aL: 0.70, aC: 0.115, tL: 0.55, tC: 0.10, sL: 0.965, sC: 0.035 },
      [{ key: 'teal', name: '青', hue: 180 }, { key: 'blue', name: '蓝', hue: 250 },
       { key: 'green', name: '绿', hue: 150 }, { key: 'violet', name: '紫', hue: 296 },
       { key: 'rose', name: '玫', hue: 18 }]),
  };

  const dawn = {
    key: 'dawn', name: '暖', en: 'Dawn', mode: 'light',
    font: '"PingFang SC", -apple-system, "Segoe UI", system-ui, sans-serif',
    radius: 24, cardPad: 18, rowGap: 12, density: 'comfy',
    bg: '#F6F1EA', surface: '#FFFDFB', surface2: '#F1E9DD', raised: '#FFFDFB',
    text: '#2A2520', muted: '#6E6155', faint: '#AC9E8E',
    border: 'rgba(42,37,32,0.09)', borderStrong: 'rgba(42,37,32,0.16)',
    onAccent: '#FFFFFF',
    shadow: '0 1px 2px rgba(67,49,30,0.05), 0 6px 22px rgba(67,49,30,0.07)',
    shadowLg: '0 14px 44px rgba(67,49,30,0.16)',
    cat: buildCats(0.68, 0.13, 'oklch(0.73 0.02 70)'),
    chartTrack: 'rgba(42,37,32,0.07)',
    accents: buildAccents(
      { aL: 0.67, aC: 0.15, tL: 0.55, tC: 0.15, sL: 0.95, sC: 0.04 },
      [{ key: 'coral', name: '珊', hue: 42 }, { key: 'amber', name: '琥', hue: 78 },
       { key: 'rose', name: '茜', hue: 14 }, { key: 'plum', name: '梅', hue: 330 },
       { key: 'teal', name: '松', hue: 192 }]),
  };

  const night = {
    key: 'night', name: '夜', en: 'Night', mode: 'dark',
    font: '-apple-system, "PingFang SC", "Segoe UI", system-ui, sans-serif',
    radius: 14, cardPad: 14, rowGap: 9, density: 'compact',
    bg: '#121418', surface: '#1B1E24', surface2: '#23272F', raised: '#22262D',
    text: '#ECEEF1', muted: '#99A1AC', faint: '#626A75',
    border: 'rgba(255,255,255,0.08)', borderStrong: 'rgba(255,255,255,0.15)',
    onAccent: '#FFFFFF',
    shadow: '0 1px 2px rgba(0,0,0,0.4), 0 8px 28px rgba(0,0,0,0.5)',
    shadowLg: '0 18px 50px rgba(0,0,0,0.6)',
    cat: buildCats(0.74, 0.14, 'oklch(0.66 0.02 250)'),
    chartTrack: 'rgba(255,255,255,0.08)',
    accents: buildAccents(
      { aL: 0.72, aC: 0.15, tL: 0.80, tC: 0.12, sL: 0.33, sC: 0.07 },
      [{ key: 'violet', name: '靛', hue: 286 }, { key: 'blue', name: '蓝', hue: 256 },
       { key: 'teal', name: '青', hue: 190 }, { key: 'green', name: '绿', hue: 150 },
       { key: 'pink', name: '霞', hue: 344 }]),
  };

  // 默认主色 = 各自 accents[0]
  [cloud, dawn, night].forEach((t) => {
    const a = t.accents[0];
    t.accent = a.accent; t.accentText = a.accentText; t.accentSoft = a.accentSoft;
  });

  window.VL = window.VL || {};
  window.VL.CATS = CATS;
  window.VL.themes = { cloud, dawn, night };
})();
