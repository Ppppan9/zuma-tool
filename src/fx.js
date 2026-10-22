// 消除特效（2D 叠加在 3D 画面之上）：彩色光雾 + 液体飞溅块 + 碎屑/尘点 + 白色闪光。确定性随机（同一事件同样的形状）。
import { mulberry } from './logic.js';
import { mix, hexRGB } from './paint.js';
const easeOut = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
export function spawnMatchFx(list, ev, S, t0, colorOf, seed) {
  const D = S.ballSize, boost = 1 + S.fxComboBoost * Math.max(0, ev.combo - 1), r = mulberry(seed), L = S.fxLife;
  let cx = 0, cy = 0; ev.balls.forEach(b => { cx += b.x; cy += b.y; }); cx /= ev.balls.length; cy /= ev.balls.length;
  if (S.fxFlash > 0) list.push({ k: 'flash', x: cx, y: cy, t0, life: 0.18, r: D * (1.1 + ev.balls.length * 0.25) * boost, a: S.fxFlash });
  for (const b of ev.balls) {
    const hex = colorOf(b.c);
    if (S.fxGlow > 0) list.push({ c: b.c, k: 'glow', x: b.x, y: b.y, t0, life: L * 0.9, r: D * 0.95 * boost, hex, a: S.fxGlow });
    for (let i = 0; i < S.fxSplat * boost; i++) { const a = r() * Math.PI * 2, sp = (0.3 + r() * 0.9) * S.fxSpread * D; const pts = []; const n = 7 + Math.floor(r() * 4); for (let k = 0; k < n; k++) pts.push(0.6 + r() * 0.5);
      list.push({ c: b.c, k: 'splat', x: b.x + Math.cos(a) * D * 0.15, y: b.y + Math.sin(a) * D * 0.15, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t0, life: L * (0.6 + r() * 0.5), r: D * (0.1 + r() * 0.16) * boost, pts, rot: r() * 6.3, hex: mix(hex, '#000000', 0.15 + r() * 0.3), hl: mix(hex, '#ffffff', 0.35) }); }
    for (let i = 0; i < S.fxShards * boost; i++) { const a = r() * Math.PI * 2, sp = (0.6 + r() * 1.2) * S.fxSpread * D;
      list.push({ c: b.c, k: r() < 0.65 ? 'shard' : 'dust', x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t0, life: L * (0.5 + r() * 0.6), r: D * (0.03 + r() * 0.06), rot: a, spin: (r() - 0.5) * 8, hex: mix(hex, '#000000', 0.45 + r() * 0.3) }); }
  }
}
export function drawFx(g, list, t, S) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i], u = (t - p.t0) / p.life; if (u >= 1) { list.splice(i, 1); continue; } if (u < 0) continue;
    const e = easeOut(u), age = u * p.life;
    if (p.k === 'flash') { const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * (0.6 + e * 0.6)); const a = p.a * (1 - u); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(0.45, `rgba(255,255,240,${a * 0.6})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, p.r * 1.3, 0, 7); g.fill(); continue; }
    if (p.k === 'glow') { const [rr, gg, bb] = hexRGB(p.hex), R = p.r * (0.7 + e * 0.8), a = p.a * (1 - u) * 0.75; g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, R); gr.addColorStop(0, `rgba(${Math.min(255, rr + 90)},${Math.min(255, gg + 90)},${Math.min(255, bb + 90)},${a})`); gr.addColorStop(0.5, `rgba(${rr},${gg},${bb},${a * 0.55})`); gr.addColorStop(1, `rgba(${rr},${gg},${bb},0)`); g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, R, 0, 7); g.fill(); g.restore(); continue; }
    const dist = 1 - Math.pow(1 - u, 2.2), x = p.x + p.vx * p.life * dist * 0.55, y = p.y + p.vy * p.life * dist * 0.55;
    if (p.k === 'splat') { const R = p.r * (0.6 + e * 0.9), a = u < 0.7 ? 0.95 : 0.95 * (1 - (u - 0.7) / 0.3); g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate(p.rot); g.fillStyle = p.hex; g.beginPath(); p.pts.forEach((q, k) => { const an = k / p.pts.length * Math.PI * 2, rx = Math.cos(an) * R * q * 1.35, ry = Math.sin(an) * R * q * 0.85; k ? g.lineTo(rx, ry) : g.moveTo(rx, ry); }); g.closePath(); g.fill(); g.fillStyle = p.hl; g.globalAlpha = a * 0.5; g.beginPath(); g.ellipse(-R * 0.25, -R * 0.2, R * 0.35, R * 0.18, 0, 0, 7); g.fill(); g.restore(); continue; }
    if (p.k === 'shard') { g.save(); g.globalAlpha = 1 - u; g.translate(x, y); g.rotate(p.rot + p.spin * age); g.fillStyle = p.hex; g.beginPath(); g.moveTo(-p.r * 1.6, 0); g.lineTo(0, -p.r * 0.35); g.lineTo(p.r * 1.6, 0); g.lineTo(0, p.r * 0.35); g.closePath(); g.fill(); g.restore(); continue; }
    if (p.k === 'dust') { g.globalAlpha = (1 - u) * 0.8; g.fillStyle = p.hex; g.beginPath(); g.arc(x, y, p.r * 0.6, 0, 7); g.fill(); g.globalAlpha = 1; }
  }
}
// 当前帧所有粒子的“图层快照”（AE 记录用）
export function fxItems(list, t) {
  const out = [];
  for (const p of list) { const u = (t - p.t0) / p.life; if (u < 0 || u >= 1) continue; const e = easeOut(u), dist = 1 - Math.pow(1 - u, 2.2);
    if (p.k === 'flash') out.push({ asset: 'fx_flash', x: p.x, y: p.y, sc: p.r * (0.6 + e * 0.6) * 2.6, op: p.a * (1 - u), p });
    else if (p.k === 'glow') out.push({ asset: 'fx_glow_' + p.c, x: p.x, y: p.y, sc: p.r * (0.7 + e * 0.8) * 2, op: p.a * (1 - u) * 0.75, p, add: true });
    else { const x = p.x + p.vx * p.life * dist * 0.55, y = p.y + p.vy * p.life * dist * 0.55;
      if (p.k === 'splat') out.push({ asset: 'fx_splat_' + p.c, x, y, sc: p.r * (0.6 + e * 0.9) * 2.7, op: u < 0.7 ? 0.95 : 0.95 * (1 - (u - 0.7) / 0.3), rot: p.rot, p, tint: p.hex });
      else if (p.k === 'shard') out.push({ asset: 'fx_shard_' + p.c, x, y, sc: p.r * 3.2, op: 1 - u, rot: p.rot + p.spin * u * p.life, p, tint: p.hex });
      else out.push({ asset: 'fx_dust_' + p.c, x, y, sc: p.r * 1.2, op: (1 - u) * 0.8, p, tint: p.hex }); }
  }
  return out;
}
