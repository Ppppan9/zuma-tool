// 2D 画布贴图：背景（遗迹 / 灰底）+ 雕刻凹槽轨道 + 金边黑洞 + 回纹底座；球体符文贴图；2D 球精灵（AE / 无 WebGL 回退）；FAIL 徽章。
import { mulberry } from './logic.js';
export const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
export const hexRGB = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
export const mix = (a, b, t) => { const A = hexRGB(a), B = hexRGB(b); return `rgb(${A.map((x, i) => Math.round(x + (B[i] - x) * t)).join(',')})`; };
const rgba = (h, a) => { const [r, g, b] = hexRGB(h); return `rgba(${r},${g},${b},${a})`; };
export const COLOR_NAMES = ['red', 'green', 'yellow', 'blue', 'purple', 'white'];
export const colorHex = (S, c) => S['col_' + COLOR_NAMES[c]] || '#888888';

function trackPath(g, T, step = 3, from = 0) { g.beginPath(); g.moveTo(T.X[from], T.Y[from]); for (let i = from + step; i < T.n; i += step) g.lineTo(T.X[i], T.Y[i]); g.lineTo(T.X[T.n - 1], T.Y[T.n - 1]); }
function noiseCanvas(w, h, seed, cell = 8, oct = 4) { // 简易值噪声 fbm（灰度）
  const c = mk(w, h), g = c.getContext('2d'), r = mulberry(seed);
  for (let o = 0; o < oct; o++) { const cw = Math.ceil(w / (cell * 2 ** (oct - o - 1))), ch = Math.ceil(h / (cell * 2 ** (oct - o - 1))); const s = mk(cw, ch), sg = s.getContext('2d'), id = sg.createImageData(cw, ch); for (let i = 0; i < cw * ch; i++) { const v = r() * 255; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; } sg.putImageData(id, 0, 0); g.globalAlpha = o === 0 ? 1 : 0.5 / o; g.imageSmoothingEnabled = true; g.drawImage(s, 0, 0, w, h); }
  g.globalAlpha = 1; return c;
}

// ---------- 背景 ----------
// view: 设计坐标中画面覆盖的矩形 {x0,y0,w,h}；K: 每设计像素的贴图像素
export function paintBackground(S, T, imgs, view, K, theme = S.theme) {
  const c = mk(view.w * K, view.h * K), g = c.getContext('2d'); g.setTransform(K, 0, 0, K, -view.x0 * K, -view.y0 * K);
  const D = S.ballSize, img = S.bgImage ? imgs.custom : theme === 'grey' ? null : imgs.ruins;
  // 底图：cover 到 720×1280 设计区（超出部分延伸）
  if (theme === 'grey' && !S.bgImage) {
    g.fillStyle = S.greyColor; g.fillRect(view.x0, view.y0, view.w, view.h);
    if (imgs.grey && S.greyTexture > 0) { g.globalAlpha = S.greyTexture; g.globalCompositeOperation = 'luminosity'; drawCover(g, imgs.grey, view); g.globalCompositeOperation = 'source-over'; g.globalAlpha = S.greyTexture * 0.35; drawCover(g, imgs.grey, view); g.globalAlpha = 1; }
  } else if (img) { g.fillStyle = '#2d3530'; g.fillRect(view.x0, view.y0, view.w, view.h); drawCover(g, img, view); }
  else { g.fillStyle = '#56615b'; g.fillRect(view.x0, view.y0, view.w, view.h); }
  if (S.bgDim > 0) { g.fillStyle = `rgba(0,0,0,${S.bgDim})`; g.fillRect(view.x0, view.y0, view.w, view.h); }
  const fx = T.cx + S.frogOffX, fy = T.cy + S.frogOffY;
  if (S.pedestal) (theme === 'grey' ? pedestalGrey : pedestalRuins)(g, fx, fy, D * S.pedestalR, S);
  (theme === 'grey' ? grooveGrey : grooveRuins)(g, T, D * S.grooveWidth, S);
  hole(g, T.hole.x, T.hole.y, D * S.holeSize / 2, S);
  if (S.vignette > 0) { const gr = g.createRadialGradient(360, 640, 300, 360, 640, 900); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${S.vignette})`); g.fillStyle = gr; g.fillRect(view.x0, view.y0, view.w, view.h); }
  return c;
}
function drawCover(g, img, view) { const s = Math.max(720 / img.width, 1280 / img.height), w = img.width * s, h = img.height * s; g.drawImage(img, 360 - w / 2, 640 - h / 2, w, h); if (view.x0 < 0 || view.y0 < 0 || view.w > 720 || view.h > 1280) { g.save(); g.globalAlpha = 0.9; g.filter = 'blur(6px)'; const s2 = Math.max(view.w / img.width, view.h / img.height); g.globalCompositeOperation = 'destination-over'; g.drawImage(img, view.x0 + view.w / 2 - img.width * s2 / 2, view.y0 + view.h / 2 - img.height * s2 / 2, img.width * s2, img.height * s2); g.restore(); } }
function grooveRuins(g, T, gw, S) { // 参考近景：外沿凸起石棱（受光）→ 细金边 → 暗槽壁 → 深灰槽底（右下受光）
  g.save(); g.lineCap = 'butt'; g.lineJoin = 'round';
  const pass = (lw, style, dx = 0, dy = 0, blur = 0) => { g.save(); g.translate(dx, dy); if (blur) g.filter = `blur(${blur}px)`; trackPath(g, T); g.lineWidth = lw; g.strokeStyle = style; g.stroke(); g.restore(); };
  pass(gw + 30, 'rgba(0,0,0,0.30)', 5, 6, 7);                 // 投影
  pass(gw + 22, 'rgba(205,205,190,0.55)', -1.5, -1.5);         // 石棱受光
  pass(gw + 22, 'rgba(30,32,28,0.55)', 2, 2);                  // 石棱背光
  pass(gw + 18, 'rgba(120,122,110,0.85)');                     // 石棱
  pass(gw + 9, rgba(S.grooveRim, 0.95));                       // 金边
  pass(gw + 4, 'rgba(28,24,14,0.95)');                         // 金边内线
  pass(gw, mix('#3b4347', '#1a1f22', S.grooveDark));           // 槽底
  pass(gw - 14, 'rgba(120,135,140,0.22)', 6, 6, 5);            // 槽底右下受光（左上槽壁投影）
  g.restore();
}
function grooveGrey(g, T, gw, S) {
  g.save(); g.lineJoin = 'round';
  const pass = (lw, style, dx = 0, dy = 0, blur = 0) => { g.save(); g.translate(dx, dy); if (blur) g.filter = `blur(${blur}px)`; trackPath(g, T); g.lineWidth = lw; g.strokeStyle = style; g.stroke(); g.restore(); };
  pass(gw + 14, 'rgba(0,0,0,0.25)', 3, 4, 5); pass(gw + 8, S.greyOutline); pass(gw, mix(S.greyColor, '#000000', 0.18 + S.grooveDark * 0.2)); pass(gw - 10, 'rgba(255,255,255,0.05)', 3, 3, 3);
  g.restore();
}
export function hole(g, x, y, r, S) {
  g.save();
  g.filter = 'blur(6px)'; g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.arc(x + 6, y + 8, r * 1.05, 0, 7); g.fill(); g.filter = 'none';
  const gold = S.holeGold, lin = (a, b) => { const gr = g.createLinearGradient(x - r, y - r, x + r, y + r); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; };
  g.fillStyle = lin(mix(gold, '#fff6d0', 0.55), mix(gold, '#2a1a05', 0.6)); g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  g.fillStyle = lin(mix(gold, '#2a1a05', 0.45), mix(gold, '#fff0c0', 0.35)); g.beginPath(); g.arc(x, y, r * 0.86, 0, 7); g.fill();
  g.fillStyle = lin(mix(gold, '#ffffff', 0.25), mix(gold, '#3a2808', 0.5)); g.beginPath(); g.arc(x, y, r * 0.8, 0, 7); g.fill();
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; g.fillStyle = 'rgba(60,40,10,0.55)'; g.beginPath(); g.arc(x + Math.cos(a) * r * 0.93, y + Math.sin(a) * r * 0.93, r * 0.035, 0, 7); g.fill(); }
  const hr = g.createRadialGradient(x - r * 0.1, y - r * 0.12, 0, x, y, r * 0.66); hr.addColorStop(0, '#000'); hr.addColorStop(0.65, '#050302'); hr.addColorStop(1, '#2a1c0c');
  g.fillStyle = hr; g.beginPath(); g.arc(x, y, r * 0.66, 0, 7); g.fill();
  const ins = g.createLinearGradient(x - r, y - r, x + r * 0.4, y + r * 0.4); ins.addColorStop(0, 'rgba(0,0,0,0.7)'); ins.addColorStop(1, 'rgba(0,0,0,0)');
  g.strokeStyle = ins; g.lineWidth = r * 0.12; g.beginPath(); g.arc(x, y, r * 0.6, 0, 7); g.stroke();
  g.restore();
}
function pedestalRuins(g, x, y, R, S) {
  g.save();
  g.filter = 'blur(10px)'; g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(x + 8, y + 12, R * 1.02, 0, 7); g.fill(); g.filter = 'none';
  const lin = (a, b, r = R) => { const gr = g.createLinearGradient(x - r, y - r, x + r, y + r); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; };
  g.fillStyle = lin('#b9b7a6', '#4d4f47'); g.beginPath(); g.arc(x, y, R, 0, 7); g.fill();
  g.fillStyle = lin('#5b5d55', '#a9a796'); g.beginPath(); g.arc(x, y, R * 0.965, 0, 7); g.fill();
  g.fillStyle = lin('#8d8b7c', '#6c6c60'); g.beginPath(); g.arc(x, y, R * 0.94, 0, 7); g.fill();
  // 回纹带
  const r0 = R * 0.76, r1 = R * 0.9, N = 26; g.strokeStyle = 'rgba(40,38,30,0.85)'; g.lineWidth = R * 0.022; g.lineJoin = 'miter';
  const P = (a, r) => [x + Math.cos(a) * r, y + Math.sin(a) * r];
  for (let i = 0; i < N; i++) { const a0 = i / N * Math.PI * 2, da = Math.PI * 2 / N, u = t => a0 + da * t, rr = t => r0 + (r1 - r0) * t;
    const pts = [[0, 0], [0, 1], [0.8, 1], [0.8, 0.3], [0.35, 0.3], [0.35, 0.65], [0.55, 0.65]]; g.beginPath(); pts.forEach(([t, s], k) => { const p = P(u(t), rr(s)); k ? g.lineTo(...p) : g.moveTo(...p); }); g.stroke();
    g.beginPath(); g.moveTo(...P(u(0), rr(0))); g.lineTo(...P(u(1), rr(0))); g.stroke(); }
  g.strokeStyle = 'rgba(230,225,200,0.35)'; g.lineWidth = 1.5; g.translate(1.2, 1.2); g.beginPath(); g.arc(x, y, r1 + 3, 0, 7); g.stroke(); g.beginPath(); g.arc(x, y, r0 - 3, 0, 7); g.stroke(); g.translate(-1.2, -1.2);
  g.strokeStyle = 'rgba(30,28,22,0.8)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r1 + 3, 0, 7); g.stroke(); g.beginPath(); g.arc(x, y, r0 - 3, 0, 7); g.stroke();
  const inner = g.createRadialGradient(x - R * 0.2, y - R * 0.2, R * 0.1, x, y, R * 0.72); inner.addColorStop(0, '#8e8f84'); inner.addColorStop(1, '#5f6159');
  g.fillStyle = inner; g.beginPath(); g.arc(x, y, R * 0.72, 0, 7); g.fill();
  g.strokeStyle = lin('rgba(0,0,0,0.6)', 'rgba(255,255,240,0.35)', R * 0.72); g.lineWidth = 3; g.beginPath(); g.arc(x, y, R * 0.72, 0, 7); g.stroke();
  // 石纹斑驳
  const r = mulberry(99); for (let i = 0; i < 160; i++) { const a = r() * 7, d = Math.sqrt(r()) * R * 0.95; g.fillStyle = `rgba(${r() < 0.5 ? '20,25,15' : '220,220,200'},${0.04 + r() * 0.06})`; g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 2 + r() * 6, 0, 7); g.fill(); }
  g.restore();
}
function pedestalGrey(g, x, y, R, S) {
  R *= 0.7; g.save(); g.filter = 'blur(8px)'; g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.arc(x + 6, y + 9, R, 0, 7); g.fill(); g.filter = 'none';
  const lin = (a, b) => { const gr = g.createLinearGradient(x - R, y - R, x + R, y + R); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; };
  g.fillStyle = lin('#8a8070', '#3a342c'); g.beginPath(); g.arc(x, y, R, 0, 7); g.fill();
  g.fillStyle = lin('#4a443c', '#6e665a'); g.beginPath(); g.arc(x, y, R * 0.9, 0, 7); g.fill();
  g.restore();
}

// ---------- 球体贴图（等距柱状 512×256）：底色 + 浅色雕刻符文；bump = 符文凹刻 ----------
const GLYPHS = [
  (g, r) => { g.beginPath(); for (let t = 0; t < 14; t += 0.2) { const rr = 4 + t * 3.2; g.lineTo(Math.cos(t) * rr, Math.sin(t) * rr * 0.9); } g.stroke(); },           // 螺旋
  (g, r) => { for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 20, -8, 12, 0, 7); g.stroke(); } g.beginPath(); g.arc(0, 8, 26, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }, // 面具
  (g, r) => { g.beginPath(); g.moveTo(-42, 0); for (let i = 0; i <= 6; i++) g.lineTo(-42 + i * 14, i % 2 ? -18 : 18); g.stroke(); g.beginPath(); g.moveTo(-34, 30); g.lineTo(34, 30); g.stroke(); }, // 锯齿
  (g, r) => { for (let k = 1; k <= 3; k++) { g.beginPath(); g.arc(0, 18, k * 13, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); } g.beginPath(); g.arc(0, 18, 5, 0, 7); g.fill(); }, // 同心拱
  (g, r) => { g.beginPath(); g.moveTo(-36, -20); g.bezierCurveTo(-10, -44, 10, 4, 36, -20); g.stroke(); g.beginPath(); g.moveTo(-36, 16); g.bezierCurveTo(-10, -8, 10, 40, 36, 16); g.stroke(); }, // 波浪
  (g, r) => { g.beginPath(); g.moveTo(0, -36); g.lineTo(30, 0); g.lineTo(0, 36); g.lineTo(-30, 0); g.closePath(); g.stroke(); g.beginPath(); g.arc(0, 0, 9, 0, 7); g.stroke(); }, // 菱形眼
  (g, r) => { g.beginPath(); g.moveTo(-30, 30); g.lineTo(-30, -14); g.quadraticCurveTo(-30, -34, -10, -34); g.lineTo(8, -34); g.quadraticCurveTo(30, -34, 30, -12); g.lineTo(30, 4); g.lineTo(6, 4); g.lineTo(6, -12); g.stroke(); }, // 回钩
  (g, r) => { for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 16, 0, 16, s > 0 ? Math.PI : 0, s > 0 ? Math.PI * 2.6 : Math.PI * 1.6); g.stroke(); } }, // 双卷
];
// style：swirl（浅色卷纹，红）/ mask（浅色面具纹，绿）/ glyph（深色符文，黄）/ crackle（浅色裂纹网，蓝）
export const BALL_STYLES = ['swirl', 'mask', 'glyph', 'crackle', 'swirl', 'mask'];
export function ballTextures(hex, seed, S, style = 'swirl') {
  const W = 512, H = 256, map = mk(W, H), bump = mk(W, H), g = map.getContext('2d'), b = bump.getContext('2d'), r = mulberry(seed);
  g.fillStyle = hex; g.fillRect(0, 0, W, H);
  const n = noiseCanvas(W / 2, H / 2, seed + 5, 4, 4); g.globalAlpha = 0.18; g.globalCompositeOperation = 'overlay'; g.drawImage(n, 0, 0, W, H); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  b.fillStyle = '#fff'; b.fillRect(0, 0, W, H);
  const L = S.runeLight, light = style === 'glyph' ? mix(hex, '#3a2a00', 0.42 * (0.4 + L)) : mix(hex, '#ffffff', 0.25 + L * 0.5), dark = mix(hex, '#000000', 0.4);
  if (style === 'crackle') { // Voronoi 网纹（等距柱状横向循环）
    const pts = []; for (let i = 0; i < 46; i++) pts.push([r() * W, r() * H]); const all = []; for (const p of pts) for (const o of [-W, 0, W]) all.push([p[0] + o, p[1]]);
    const id = g.getImageData(0, 0, W, H), bd = b.getImageData(0, 0, W, H), [lr, lg, lb] = hexRGB(light.startsWith('#') ? light : '#ffffff');
    const LC = light.match(/\d+/g).map(Number);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let d1 = 1e9, d2 = 1e9; for (const p of all) { const d = (p[0] - x) ** 2 + ((p[1] - y) * 2) ** 2; if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; } const e = Math.sqrt(d2) - Math.sqrt(d1); if (e < 9) { const a = e < 5 ? 1 : (9 - e) / 4, q = (y * W + x) * 4; for (let k = 0; k < 3; k++) id.data[q + k] = id.data[q + k] * (1 - a) + LC[k] * a; bd.data[q] = bd.data[q + 1] = bd.data[q + 2] = 255 * (1 - a * 0.9); } }
    g.putImageData(id, 0, 0); b.putImageData(bd, 0, 0);
  } else {
    const cells = []; for (let row = 0; row < 2; row++) for (let col = 0; col < 5; col++) cells.push([col * 102.4 + (row ? 51 : 0) + (r() - 0.5) * 16, 72 + row * 112 + (r() - 0.5) * 12]);
    cells.push([cells[4][0] + W, cells[4][1]], [cells[9][0] - W, cells[9][1]]);
    const pick = cells.map(() => Math.floor(r() * GLYPHS.length)), rot = cells.map(() => (r() - 0.5) * 0.8);
    for (const [ctx, mode] of [[g, 'dark'], [g, 'light'], [b, 'bump']]) {
      cells.forEach(([cx, cy], i) => {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot[i]); const sc = style === 'mask' ? 1.55 : 1.45; ctx.scale(sc, sc * 0.95);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const lw = style === 'glyph' ? 8 : 9; ctx.lineWidth = mode === 'dark' ? lw + 5 : lw; ctx.strokeStyle = ctx.fillStyle = mode === 'dark' ? dark : mode === 'light' ? light : '#000';
        if (mode === 'dark') { ctx.globalAlpha = style === 'glyph' ? 0.12 : 0.3; ctx.translate(1.5, 2); }
        GLYPHS[pick[i]](ctx, r); if (style === 'mask') GLYPHS[(pick[i] + 3) % GLYPHS.length](ctx, r);
        ctx.restore();
      });
    }
  }
  for (const y of [6, H - 6]) { g.fillStyle = mix(hex, '#000', 0.1); g.fillRect(0, y - 6, W, 12); }
  b.filter = 'blur(1.5px)'; b.drawImage(bump, 0, 0); b.filter = 'none';
  return { map, bump };
}
// 2D 球精灵（AE 回退 / 无 WebGL）：球形明暗 + 中心符文 + 高光 + 轮廓暗边
export function ballSprite2D(hex, size, seed, S) {
  const c = mk(size, size), g = c.getContext('2d'), R = size / 2, t = ballTextures(hex, seed, S, BALL_STYLES[(seed - 101) / 17 | 0] || 'swirl').map;
  g.save(); g.beginPath(); g.arc(R, R, R * 0.98, 0, 7); g.clip();
  g.drawImage(t, 128, 0, 256, 256, -R * 0.15, -R * 0.15, size * 1.3, size * 1.3);
  const sh = g.createRadialGradient(R * 0.7, R * 0.6, R * 0.1, R, R, R); sh.addColorStop(0, 'rgba(255,255,255,0.12)'); sh.addColorStop(0.6, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = sh; g.fillRect(0, 0, size, size);
  const hl = g.createRadialGradient(R * 0.62, R * 0.5, 0, R * 0.62, R * 0.5, R * 0.42); hl.addColorStop(0, 'rgba(255,255,255,0.85)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = hl; g.fillRect(0, 0, size, size); g.restore();
  return c;
}
// ---------- FAIL 徽章 ----------
export function failBadge(S, size) {
  const c = mk(size, size), g = c.getContext('2d'), R = size / 2;
  g.save(); g.filter = 'blur(8px)'; g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.arc(R + 4, R + 7, R * 0.9, 0, 7); g.fill(); g.restore();
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(R, R, R * 0.92, 0, 7); g.fill();
  const gr = g.createRadialGradient(R * 0.8, R * 0.7, R * 0.1, R, R, R * 0.84); gr.addColorStop(0, mix(S.failColor, '#ffffff', 0.08)); gr.addColorStop(1, mix(S.failColor, '#000000', 0.12));
  g.fillStyle = gr; g.beginPath(); g.arc(R, R, R * 0.84, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = R * 0.7; g.font = `900 ${fs}px "Arial Black","Impact","Noto Sans CJK SC",sans-serif`; const w = g.measureText(S.failText).width; if (w > R * 1.5) { fs *= R * 1.5 / w; g.font = `900 ${fs}px "Arial Black","Impact","Noto Sans CJK SC",sans-serif`; }
  g.save(); g.translate(R, R + fs * 0.04); g.shadowColor = 'rgba(0,0,0,0.25)'; g.shadowOffsetY = 3; g.shadowBlur = 4; g.fillText(S.failText, 0, 0); g.restore();
  return c;
}
