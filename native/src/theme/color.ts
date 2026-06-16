// OKLCH → sRGB hex 转换。
// 设计原型(web)用的是 CSS oklch() 颜色；React Native 不支持 oklch，
// 所以这里把原型 tokens 里的 oklch(L C H) 在加载时转成 #hex，保持配色一致。
// 纯函数，可单测（见 color.test 思路）。

function srgbGamma(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function toHex2(x: number): string {
  const v = Math.round(clamp01(x) * 255);
  return v.toString(16).padStart(2, '0');
}

/** oklch(L, C, H度) → #rrggbb。L∈[0,1], C≈[0,0.4], H∈[0,360) */
export function oklchToHex(L: number, C: number, H: number): string {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  // OKLab → LMS'
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  // LMS → linear sRGB
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  return `#${toHex2(srgbGamma(r))}${toHex2(srgbGamma(g))}${toHex2(srgbGamma(bl))}`;
}

const OKLCH_RE = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/i;

/** 把任意颜色字符串解析成 RN 能用的值：oklch() → hex；hex / rgba() 原样返回 */
export function resolveColor(input: string): string {
  const m = OKLCH_RE.exec(input.trim());
  if (!m) return input; // 已是 #hex 或 rgba()
  return oklchToHex(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
}
