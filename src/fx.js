// 消除特效（v1.0.2，按参考 ref.mp4 30fps 逐帧还原）。时间轴（ms，从“凑成三消”起，× fxTimeScale）：
//   0–167   球保持原大小（3D 球仍在），叠加“裂纹”：白色放射裂纹从球心向外长出 + 深色锯齿描边（≈67ms 起明显）
//   167–267 每颗球变成半透明浅色“气泡”（放大 1.08→1.2，深色虚线边，能透出后面的球）——3D 球此时已移除
//   267     气泡破裂：同色柔和光雾合成一团（每球一个软圆，半径 1.1→1.45 球径），白色细弧碎片向外飞（≈100ms）
//   300–670 大量深色细长碎片（球色压暗 ≈ 深蓝 / 深红）向外漂 1–2 球径并旋转，光雾 500ms 后淡出，670ms 全部消失
// 无白闪、无冲击环、无震屏（参考中都没有）。确定性随机：同一事件同样的形状。
import { mulberry } from './logic.js';
import { hexRGB } from './paint.js';
const cl = x => Math.max(0, Math.min(1, x)), easeOut = t => 1 - Math.pow(1 - cl(t), 3);
export const FX_MS = { crack: 167, ghost: 100, cloud: 403, sliver: 100, shardStart: 33, shardLife: 340 };
export function spawnMatchFx(list, ev, S, t0, colorOf, seed) {
  const D = S.ballSize, k = S.fxTimeScale || 1, boost = 1 + S.fxComboBoost * Math.max(0, ev.combo - 1), r = mulberry(seed);
  const T1 = FX_MS.crack * k / 1000, T2 = T1 + FX_MS.ghost * k / 1000;
  for (const b of ev.balls) {
    const hex = colorOf(b.c), tint = (S['fxTint_' + b.c] || hex), id = list.n = (list.n || 0) + 1;
    if (S.fxCrack > 0) { const rays = []; const n = 9 + Math.floor(r() * 4); for (let i = 0; i < n; i++) rays.push([r() * 6.283, 0.55 + r() * 0.4, (r() - 0.5) * 0.5]); list.push({ k: 'crack', c: b.c, x: b.x, y: b.y, t0, life: T1, r: D / 2, hex, rays, a: S.fxCrack, id }); }
    if (S.fxGhost > 0) list.push({ k: 'ghost', c: b.c, x: b.x, y: b.y, t0: t0 + T1, life: T2 - T1, r: D / 2, hex: tint, dk: hex, a: S.fxGhost, rot: r() * 6.283 });
    if (S.fxGlow > 0) list.push({ k: 'glow', c: b.c, x: b.x, y: b.y, t0: t0 + T2, life: FX_MS.cloud * k / 1000, r: D * (S.fxCloudSize || 1.5) * boost, hex: tint, a: S.fxGlow });
    for (let i = 0; i < (S.fxSlivers || 0); i++) { const a = r() * 6.283, sp = (1.2 + r() * 1.4) * D; list.push({ k: 'sliver', c: b.c, x: b.x + Math.cos(a) * D * 0.4, y: b.y + Math.sin(a) * D * 0.4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t0: t0 + T2, life: FX_MS.sliver * k / 1000 * (0.8 + r() * 0.5), r: D * (0.12 + r() * 0.1), rot: a + Math.PI / 2 + (r() - 0.5), bend: 0.6 + r() * 0.6 }); }
    for (let i = 0; i < S.fxShards * boost; i++) { const a = r() * 6.283, rad = r() * D * 0.6, sp = (0.6 + r() * 1.6) * S.fxSpread * D;
      list.push({ k: 'shard', c: b.c, x: b.x + Math.cos(a) * rad, y: b.y + Math.sin(a) * rad, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t0: t0 + T2 + (FX_MS.shardStart + r() * 40) * k / 1000, life: FX_MS.shardLife * k / 1000 * (0.75 + r() * 0.45), r: D * (0.05 + r() * 0.05), w: 0.28 + r() * 0.22, rot: r() * 6.283, spin: (r() - 0.5) * 9, hex }); }
  }
}
const dark = (hex, f = 0.28) => { const [a, b, c] = hexRGB(hex); return `rgb(${a * f | 0},${b * f | 0},${Math.min(255, c * f + 18) | 0})`; };
const pale = (hex, a) => { const [r, g, b] = hexRGB(hex); return `rgba(${r},${g},${b},${a})`; }; // hex = 该色的雾色（设置 fxTint_*）
const colorOfDark = p => p.dk || p.hex;
export function drawFx(g, list, t, S) {
  // 光雾先画（在碎片下面）
  for (let pass = 0; pass < 2; pass++) for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i], u = (t - p.t0) / p.life; if (pass === 1 && u >= 1) { list.splice(i, 1); continue; } if (u < 0 || u >= 1) continue;
    if ((p.k === 'glow') !== (pass === 0)) continue;
    const e = easeOut(u), age = u * p.life;
    if (p.k === 'glow') { const R = p.r * (1 + e * 0.32), a = p.a * (u < 0.55 ? 1 : 1 - (u - 0.55) / 0.45) * 0.7; const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, R); gr.addColorStop(0, pale(p.hex, a)); gr.addColorStop(0.62, pale(p.hex, a * 0.8)); gr.addColorStop(1, pale(p.hex, 0)); g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, R, 0, 7); g.fill(); continue; }
    if (p.k === 'crack') { const grow = cl(u * 1.6), a = p.a; g.save(); g.translate(p.x, p.y); g.lineCap = 'round';
      g.strokeStyle = `rgba(255,255,255,${0.9 * a * cl(u * 2.5)})`; g.lineWidth = p.r * 0.07; for (const [an, L, bend] of p.rays) { g.beginPath(); g.moveTo(0, 0); const l = p.r * L * grow; g.quadraticCurveTo(Math.cos(an + bend) * l * 0.5, Math.sin(an + bend) * l * 0.5, Math.cos(an) * l, Math.sin(an) * l); g.stroke(); }
      if (u > 0.35) { g.strokeStyle = dark(p.hex, 0.25); g.globalAlpha = a * cl((u - 0.35) * 3); g.lineWidth = p.r * 0.08; g.beginPath(); const n = 22; for (let q = 0; q <= n; q++) { const an = q / n * 6.283, rr = p.r * (q % 2 ? 1.04 : 0.94); q ? g.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : g.moveTo(rr, 0); } g.stroke(); }
      g.restore(); continue; }
    if (p.k === 'ghost') { const R = p.r * (1.1 + e * 0.12); g.save(); g.fillStyle = pale(p.hex, 0.55 * p.a); g.beginPath(); g.arc(p.x, p.y, R, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(p.x - R * 0.3, p.y - R * 0.35, R * 0.35, R * 0.2, -0.5, 0, 7); g.fill();
      g.setLineDash([R * 0.16, R * 0.1]); g.lineDashOffset = p.rot * R; g.lineWidth = Math.max(1.5, R * 0.075); g.strokeStyle = dark(colorOfDark(p), 0.22); g.globalAlpha = 0.9 * p.a; g.beginPath(); g.arc(p.x, p.y, R, 0, 7); g.stroke(); g.restore(); continue; }
    const dist = 1 - Math.pow(1 - u, 2), x = p.x + p.vx * p.life * dist * 0.5, y = p.y + p.vy * p.life * dist * 0.5;
    if (p.k === 'sliver') { g.save(); g.globalAlpha = 1 - u; g.strokeStyle = '#fff'; g.lineWidth = p.r * 0.22; g.lineCap = 'round'; g.translate(x, y); g.rotate(p.rot); g.beginPath(); g.arc(0, p.r * p.bend * 2, p.r * p.bend * 2, -Math.PI / 2 - 0.5 / p.bend, -Math.PI / 2 + 0.5 / p.bend); g.stroke(); g.restore(); continue; }
    if (p.k === 'shard') { g.save(); g.globalAlpha = u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3; g.translate(x, y); g.rotate(p.rot + p.spin * age); g.fillStyle = dark(p.hex); g.beginPath(); g.moveTo(-p.r, 0); g.lineTo(-p.r * 0.2, -p.r * p.w); g.lineTo(p.r, 0); g.lineTo(p.r * 0.1, p.r * p.w * 0.8); g.closePath(); g.fill(); g.restore(); }
  }
}
// 当前帧所有粒子的“图层快照”（AE 记录用，与 drawFx 同一套时间 / 位置 / 缩放）
export function fxItems(list, t) {
  const out = [];
  for (const p of list) { const u = (t - p.t0) / p.life; if (u < 0 || u >= 1) continue; const e = easeOut(u), dist = 1 - Math.pow(1 - u, 2), age = u * p.life;
    if (p.k === 'glow') out.push({ asset: 'fx_glow_' + p.c, x: p.x, y: p.y, sc: p.r * (1 + e * 0.32) * 2, op: p.a * (u < 0.55 ? 1 : 1 - (u - 0.55) / 0.45) * 0.7, p, z: 3.9 });
    else if (p.k === 'crack') out.push({ asset: 'fx_crack_' + p.c, x: p.x, y: p.y, sc: p.r * 2.2 * (0.6 + 0.4 * cl(u * 1.6)), op: p.a * cl(u * 2.5), p });
    else if (p.k === 'ghost') out.push({ asset: 'fx_ghost_' + p.c, x: p.x, y: p.y, sc: p.r * 2 * (1.1 + e * 0.12), op: p.a, p });
    else { const x = p.x + p.vx * p.life * dist * 0.5, y = p.y + p.vy * p.life * dist * 0.5;
      if (p.k === 'sliver') out.push({ asset: 'fx_sliver', x, y, sc: p.r * 2, op: 1 - u, rot: p.rot, p });
      else if (p.k === 'shard') out.push({ asset: 'fx_shard_' + p.c, x, y, sc: p.r * 2, op: u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3, rot: p.rot + p.spin * age, p }); }
  }
  return out;
}
