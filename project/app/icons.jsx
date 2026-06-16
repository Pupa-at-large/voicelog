/* VoiceLog · 图标（描边 SVG） */
(function () {
  const P = {
    calendar: 'M4 7h16M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Zm4-4v4m8-4v4',
    chart: 'M5 21V9m7 12V4m7 17v-8',
    export: 'M12 15V4m0 0L8 8m4-4 4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4',
    mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm7 9a7 7 0 0 1-14 0m7 7v3',
    user: 'M5 20a7 7 0 0 1 14 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    check: 'M5 12.5 10 17.5 19.5 7',
    bell: 'M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6m4 10a2.5 2.5 0 0 0 4 0',
    clock: 'M12 7v5l3.5 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    pin: 'M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
    chevR: 'M9 6l6 6-6 6',
    chevL: 'M15 6l-6 6 6 6',
    chevD: 'M6 9l6 6 6-6',
    plus: 'M12 5v14M5 12h14',
    sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z',
    x: 'M6 6l12 12M18 6 6 18',
    copy: 'M9 9V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3M4 11v7a2 2 0 0 0 2 2h7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2Z',
    doc: 'M7 3h7l5 5v13a0 0 0 0 1 0 0H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 0v5h5M9 13h6M9 17h6',
    trash: 'M5 7h14M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2m-7 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13',
    arrowUp: 'M12 19V6m0 0-6 6m6-6 6 6',
    arrowR: 'M5 12h14m0 0-6-6m6 6-6 6',
    redo: 'M4 9h11a4 4 0 0 1 0 8H9M4 9l3-3M4 9l3 3',
    pencil: 'M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z',
    folder: 'M4 7a2 2 0 0 1 2-2h3l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z',
    shield: 'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z',
    flame: 'M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c2 2 3 3 3 6a5 5 0 0 1-10 0c0-3 2-4 2-6 1 1 2 1 3-1Z',
    sun: 'M12 5V3m0 18v-2m7-7h2M3 12h2m12.5-5.5 1.5-1.5M5 19l1.5-1.5m11 0L19 19M5 5l1.5 1.5M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
    bolt: 'M13 3 5 13h6l-1 8 8-10h-6l1-8Z',
    info: 'M12 11v5m0-9h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    star: 'M12 3.6l2.55 5.17 5.7.83-4.13 4.02.98 5.68L12 16.6l-5.1 2.7.98-5.68L3.75 9.6l5.7-.83L12 3.6Z',
    minus: 'M5 12h14',
    list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
    grid: 'M4 5a1 1 0 0 1 1-1h5v6H4V5Zm10-1h5a1 1 0 0 1 1 1v4h-6V4ZM4 11h6v6H5a1 1 0 0 1-1-1v-5Zm10 0h6v5a1 1 0 0 1-1 1h-5v-6Z',
    repeat: 'M17 3l4 4-4 4M21 7H7a4 4 0 0 0-4 4v1m4 9l-4-4 4-4M3 17h14a4 4 0 0 0 4-4v-1',
    image: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Zm0 11 5-5 4 4 3-3 4 4M9.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
    flag: 'M6 21V4m0 0h11l-2 3.5L17 11H6',
    grid4: 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z',
  };
  // 填充图标
  const FILL = {
    micFill: 'M12 2a3.5 3.5 0 0 0-3.5 3.5v6a3.5 3.5 0 0 0 7 0v-6A3.5 3.5 0 0 0 12 2Z',
    starFill: 'M12 3.6l2.55 5.17 5.7.83-4.13 4.02.98 5.68L12 16.6l-5.1 2.7.98-5.68L3.75 9.6l5.7-.83L12 3.6Z',
    flagFill: 'M6 21a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h11a1 1 0 0 1 .8 1.6L15.25 7.5 17.8 10.4A1 1 0 0 1 17 12H7v8a1 1 0 0 1-1 1Z',
  };

  function Icon({ name, size = 22, color = 'currentColor', sw = 1.9, fill = false, style, onClick }) {
    const d = (fill ? FILL[name] : P[name]) || P[name];
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" onClick={onClick} style={{ display: 'block', flexShrink: 0, ...style }}
        fill={fill ? color : 'none'} stroke={fill ? 'none' : color}
        strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
      </svg>
    );
  }

  window.Icon = Icon;
})();
