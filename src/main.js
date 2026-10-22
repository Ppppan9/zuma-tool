// 祖玛核玩工具 v1.0.0 —— 主程序：游戏循环 / 渲染合成 / 输入 / 自动通关 / 录制 / AE·3D·H5 导出 / 设置面板
import { GROUPS, DEFS, loadSettings, saveSettings, migrate, exportJSON, APP_ID, APP_VERSION } from './settings.js';
import { buildTrack, DW, DH } from './track.js';
import { Zuma } from './logic.js';
import { paintBackground, failBadge, colorHex, ballSprite2D, mk } from './paint.js';
import { spawnMatchFx, drawFx, fxItems } from './fx.js';
import { Sfx } from './audio.js';
import { DEFAULT_HAND } from './default_hand.js';
import { create3D, hasWebGL } from './scene3d.js';
import { createAERecorder } from './ae/recorder.js';
import { buildSprites } from './ae/sprites.js';
import { export3D } from './export3d/export3d.js';
import { exportH5PlayableFromPage, applyPlayableMode, isPlayableNoHand, applyH5DevicePresetToSettings, markH5DeviceCustomIfSizeEdited, bindEditorDevicePreview } from './h5/index.js';
import RUINS_JPG from './assets/ruins.jpg';
import GREY_JPG from './assets/grey.jpg';

const H5_NO_HAND = isPlayableNoHand();
let S = loadSettings();
const cv = document.getElementById('stage'); const ctx = cv.getContext('2d');
const sfx = new Sfx();
const now = () => window.__vclock != null ? window.__vclock : performance.now();
const clamp01 = t => t < 0 ? 0 : t > 1 ? 1 : t;
const easeIO = t => { t = clamp01(t); return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
const easeOut = t => 1 - Math.pow(1 - clamp01(t), 3);
const easeBack = t => { t = clamp01(t); const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const status = t => { const el = document.getElementById('status'); if (el) el.textContent = t; };
const imgs = {}; let T, Z, view, K = 1, R3 = null, bgCanvas = {}, fx = [], dying = [], t0Game = 0, lastT = 0, failAt = 0, failShowAt = 0, winAt = 0, themeNow = 'ruins', mouthT = 0, fxSeed = 1;
let autoRunning = false, autoToken = 0;
const hand = { x: 560, y: 1100, press: 0, pressT0: null, img: null, visible: false, follow: null };
const ripples = [];
window.__finished = false; window.__failed = false;

function loadImg(src) { return new Promise(res => { if (!src) return res(null); const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; }); }
const colorOf = c => colorHex(S, c);

// ---------- 画面 / 视口 ----------
function computeView() {
  const cw = S.canvasW, ch = S.canvasH; K = Math.min(cw / DW, ch / DH); const w = cw / K, h = ch / K;
  view = { x0: DW / 2 - w / 2, y0: DH / 2 - h / 2, w, h };
}
function rebuild() {
  if (cv.width !== S.canvasW || cv.height !== S.canvasH) { cv.width = S.canvasW; cv.height = S.canvasH; }
  if (!document.documentElement.classList.contains('h5-playable')) cv.style.aspectRatio = `${S.canvasW}/${S.canvasH}`;
  computeView(); T = buildTrack(S);
  bgCanvas.ruins = paintBackground(S, T, imgs, view, K, 'ruins'); bgCanvas.grey = paintBackground(S, T, imgs, view, K, 'grey');
  if (R3 === null && !window.__no3d && hasWebGL()) { try { R3 = create3D(S.canvasW, S.canvasH); } catch (e) { console.warn('WebGL 不可用，使用 2D 回退', e); R3 = false; } }
  if (R3) { R3.resize(S.canvasW, S.canvasH); R3.setup(S, T, bgCanvas[themeNow] || bgCanvas.ruins, view); }
  sprites2D = null; aeSpritesCache = null;
}
function newGame() {
  autoToken++; autoRunning = false; updAutoBtn();
  themeNow = S.theme; rebuild();
  Z = new Zuma(S, T); fx = []; dying = []; failAt = failShowAt = winAt = 0; t0Game = lastT = now(); mouthT = 0;
  if (R3) R3.setBg(bgCanvas[themeNow]);
  window.__finished = false; window.__failed = false; status(`v${APP_VERSION} · 球链 ${Z.balls.length} 颗 · ${S.colorCount} 色`);
}

// ---------- 游戏推进 ----------
function step(t) {
  let dt = Math.min(0.1, (t - lastT) / 1000); lastT = t; if (dt <= 0) return;
  const sec = (t - t0Game) / 1000;
  if (S.themeSwitchSec > 0 && sec >= S.themeSwitchSec && themeNow !== 'grey') { themeNow = 'grey'; if (R3) R3.setBg(bgCanvas.grey); }
  if (failShowAt && S.failFreeze && t >= failShowAt) dt = 0;
  while (dt > 0) { const h = Math.min(dt, 1 / 120); Z.update(h); dt -= h; }
  for (const e of Z.events) {
    if (e.type === 'shoot') { sfx.play('shoot', S); mouthT = t; }
    else if (e.type === 'insert') sfx.play('insert', S);
    else if (e.type === 'match') {
      sfx.play('match', S, { combo: e.combo }); spawnMatchFx(fx, e, S, t / 1000, colorOf, fxSeed++);
      window.__lastMatch = { combo: e.combo, t, n: e.balls.length }; window.__matchLog = (window.__matchLog || []).concat([[Math.round(t), e.combo, e.balls.length]]);
      window.__maxCombo = Math.max(window.__maxCombo || 0, e.combo); if (e.combo >= 2) status(`连击 ×${e.combo}！`);
    } else if (e.type === 'fail') { failAt = t; sfx.play('suck', S); window.__failed = true; status('失败：球链进洞'); }
    else if (e.type === 'win') { winAt = t; sfx.play('win', S); window.__finished = true; status('通关！'); onFinish(); }
  }
  Z.events.length = 0;
  if (failAt && !failShowAt && (Z.balls.length === 0 || t - failAt > S.failBadgeAfter * 1000)) { failShowAt = t + S.failDelay * 1000; setTimeout(() => sfx.play('fail', S), S.failDelay * 1000); onFinish(); }
  // 滚动声：链在动且未结束
  if (sfx.ctx) sfx.roll(S, Z.state === 'play' && Z.balls.length ? 1 : Z.state === 'fail' && Z.balls.length ? 1.4 : 0);
}

// ---------- 渲染 ----------
function ballList(t) {
  const D = S.ballSize, out = Z.renderList().filter(b => b.y > view.y0 - D && !(b.dying != null && S.fxGhost > 0));
  if (Z.state === 'play' || (Z.state === 'fail' && !failShowAt)) { const m = Z.muzzle(), u = clamp01((t - mouthT) / 90); out.push({ id: 1e7 + Z.shotsFired, c: Z.cur, x: m.x, y: m.y, z: S.ballSize * 0.3, scale: mouthT ? (t - mouthT < 35 ? 0.01 : 0.3 + 0.7 * easeOut(u)) : 1, mouth: true }); }
  return out;
}
let sprites2D = null, aeSpritesCache = null;
function draw(t) {
  const g = ctx, cw = cv.width, ch = cv.height, balls = ballList(t), frog = { ang: Z.frog.ang, gem: S.gemShowsNext ? colorOf(Z.next) : S.gemColor, blink: S.frogBlink && (t % (S.blinkEvery * 1000)) < 140 };
  const blur = failAt ? S.failBlur * K * easeOut((t - failAt) / 700) : 0;
  g.setTransform(1, 0, 0, 1, 0, 0); g.filter = 'none'; g.globalAlpha = 1;
  if (R3) { const img = R3.render(balls, frog, S); if (blur > 0.2) { g.filter = `blur(${blur.toFixed(1)}px)`; g.drawImage(img, -blur * 2, -blur * 2, cw + blur * 4, ch + blur * 4); g.filter = 'none'; } else g.drawImage(img, 0, 0); }
  else draw2DFallback(g, balls, frog, blur);
  g.setTransform(K, 0, 0, K, -view.x0 * K, -view.y0 * K);
  drawFx(g, fx, t / 1000, S);
  // 免责声明
  if (S.discShow && S.discText) { g.save(); g.globalAlpha = S.textOpacity; g.fillStyle = '#fff'; g.font = `${S.discSize}px "PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 3; g.fillText(S.discText, DW / 2, view.y0 + view.h - S.discY); g.restore(); }
  // FAIL
  if (failShowAt && t >= failShowAt) { const u = (t - failShowAt) / (S.failScaleDur * 1000), s = easeBack(u), size = S.failSize * DW; if (!draw.badge || draw.badgeKey !== S.failColor + S.failText + size) { draw.badge = failBadge(S, size * 1.15); draw.badgeKey = S.failColor + S.failText + size; }
    g.save(); g.translate(DW / 2, DH / 2); g.rotate((1 - easeOut(u)) * -0.35); g.scale(s, s); g.globalAlpha = clamp01(u * 4); g.drawImage(draw.badge, -size * 1.15 / 2, -size * 1.15 / 2); g.restore(); }
  if (winAt && S.winText) { const u = (t - winAt) / 500; g.save(); g.globalAlpha = clamp01(u * 3); g.translate(DW / 2, DH / 2); const s = easeBack(u); g.scale(s, s); g.font = '900 96px "Arial Black","PingFang SC","Noto Sans CJK SC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 12; g.strokeStyle = 'rgba(60,30,0,0.8)'; g.strokeText(S.winText, 0, 0); g.fillStyle = '#ffd54a'; g.fillText(S.winText, 0, 0); g.restore(); }
  const ea = endAlpha(t); if (ea > 0) drawEnd(g, ea);
  for (let i = ripples.length - 1; i >= 0; i--) { const r = ripples[i], u = (t - r.t0) / 450; if (u > 1) { ripples.splice(i, 1); continue; } g.strokeStyle = `rgba(255,255,255,${1 - u})`; g.lineWidth = 4; g.beginPath(); g.arc(r.x, r.y, 10 + u * 50, 0, 7); g.stroke(); }
  const hs = handState(); if (hs) drawHand(g, hs);
  draw.balls = balls; draw.frog = frog; draw.blur = blur / K;
}
function draw2DFallback(g, balls, frog, blur) { // 无 WebGL：背景 + 2D 球精灵 + 简化青蛙
  const D = S.ballSize; if (!sprites2D) { sprites2D = {}; for (let c = 0; c < 6; c++) sprites2D[c] = ballSprite2D(colorOf(c), 128, 101 + c * 17, S); }
  if (blur > 0.2) g.filter = `blur(${blur.toFixed(1)}px)`;
  g.drawImage(bgCanvas[themeNow], 0, 0, cv.width, cv.height);
  g.setTransform(K, 0, 0, K, -view.x0 * K, -view.y0 * K);
  const f = Z.frog; g.save(); g.translate(f.x, f.y); g.rotate(f.ang); g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(10, 14, D * 0.95 * S.frogScale, D * 0.8 * S.frogScale, 0, 0, 7); g.fill(); g.fillStyle = S.frogStone; g.beginPath(); g.ellipse(0, 0, D * 0.9 * S.frogScale, D * 0.75 * S.frogScale, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; for (const s of [-1, 1]) { g.beginPath(); g.arc(D * 0.35, s * D * 0.32, D * 0.2, 0, 7); g.fill(); } g.fillStyle = frog.gem; g.beginPath(); g.arc(0, 0, D * 0.14, 0, 7); g.fill(); g.restore();
  for (const b of balls) { const s = D * b.scale; g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.arc(b.x + 6, b.y + 8, s / 2, 0, 7); g.fill(); g.drawImage(sprites2D[b.c], b.x - s / 2, b.y - s / 2, s, s); }
  g.filter = 'none';
}
function endAlpha(t) { const e = winAt || failShowAt; return e && S.endCard && t - e > S.endDelay ? Math.min(1, (t - e - S.endDelay) / 400) : 0; }
function endButton() { return { x: DW / 2 - 200, y: DH * 0.62, w: 400, h: 110 }; }
function drawEnd(g, a) { g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(view.x0, view.y0, view.w, view.h); g.fillStyle = '#fff'; g.font = '900 54px "PingFang SC","Noto Sans CJK SC",sans-serif'; g.textAlign = 'center'; g.fillText(S.endTitle, DW / 2, DH * 0.42); const b = endButton(); g.fillStyle = '#3ecf5a'; g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, 55); g.fill(); g.fillStyle = '#fff'; g.font = '900 46px "PingFang SC","Noto Sans CJK SC",sans-serif'; g.textBaseline = 'middle'; g.fillText(S.h5CtaText || '立即下载', DW / 2, b.y + b.h / 2); g.restore(); }

// ---------- 手指 ----------
function handScaleOf() { return hand.img ? S.handSize * DW / hand.img.width : 1; }
const handHiddenByEnd = () => !S.endCardHand && endAlpha(now()) > 0;
function handState() { if (H5_NO_HAND || !S.handShow || !hand.img || !hand.visible || handHiddenByEnd()) return null; if (!autoRunning && !S.manualHand) return null; return { x: hand.x, y: hand.y, s: handScaleOf() * (1 - S.pressDepth * hand.press) }; }
function drawHand(g, h) { const im = hand.img, w = im.width * h.s, hh = im.height * h.s; g.save(); g.translate(h.x, h.y); g.rotate(S.handRotation * Math.PI / 180); if (S.handFlip) g.scale(-1, 1); g.drawImage(im, -S.handAnchorX * w, -S.handAnchorY * hh, w, hh); g.restore(); }
function handCursorHidden() { return !H5_NO_HAND && !!(S.hideCursor && S.handShow && hand.img && !handHiddenByEnd() && (autoRunning ? hand.visible : S.manualHand && hand.visible)); }
function updateCursor() { const c = handCursorHidden() ? 'none' : 'pointer'; if (cv.style.cursor !== c) cv.style.cursor = c; }
function updPress(t) { if (!S.pressEnabled || hand.pressT0 == null) { hand.press = 0; return; } const p = (t - hand.pressT0) / 180; hand.press = p < 0 || p > 1 ? (hand.follow ? 1 : 0) : (hand.follow && p > 0.5 ? 1 : Math.sin(Math.PI * p)); }

// ---------- 输入 ----------
function evtPos(e) { const r = cv.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width * cv.width, py = (e.clientY - r.top) / r.height * cv.height; return { x: px / K + view.x0, y: py / K + view.y0 }; }
function tapAt(x, y) {
  sfx.resume(); if (S.tapRipple) ripples.push({ x, y, t0: now() });
  if (endAlpha(now()) > 0) { const b = endButton(); if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h && window.__h5Install) window.__h5Install(); return false; }
  return Z.shoot(x, y);
}
let pointerDown = false;
cv.addEventListener('pointerdown', e => { if (autoRunning) return; sfx.resume(); const p = evtPos(e); hand.x = p.x; hand.y = p.y; hand.visible = true; pointerDown = true; hand.follow = 1; if (S.pressEnabled) hand.pressT0 = now(); try { cv.setPointerCapture(e.pointerId); } catch (_) { } tapAt(p.x, p.y); });
cv.addEventListener('pointermove', e => { if (autoRunning) return; const p = evtPos(e); hand.x = p.x; hand.y = p.y; hand.visible = true; if (Z && Z.state === 'play' && !pointerDown && e.pointerType === 'mouse') Z.aim(p.x, p.y); });
cv.addEventListener('pointerup', () => { if (autoRunning) return; pointerDown = false; hand.follow = null; hand.pressT0 = null; });
cv.addEventListener('pointercancel', () => { pointerDown = false; hand.follow = null; });
cv.addEventListener('pointerleave', () => { if (!autoRunning && !pointerDown) hand.visible = false; });

// ---------- 自动通关（瞄准连击；手指点在青蛙与目标之间，不遮挡命中点）----------
const wait = (ms, tok) => new Promise((res, rej) => { const t0 = now(), f = () => { if (tok !== autoToken) return rej('stop'); if (now() - t0 >= ms / S.autoSpeed) return res(); requestAnimationFrame(f); }; f(); });
const rr = (a, b) => a + Math.random() * Math.max(0, b - a);
const frame = () => new Promise(r => requestAnimationFrame(r));
async function moveHand(tx, ty, tok, durMs) {
  const x0 = hand.x, y0 = hand.y, dur = (durMs ?? rr(S.moveMin, S.moveMax)) / S.autoSpeed, t0 = now();
  const cx = (x0 + tx) / 2 + (Math.random() - 0.3) * 50, cy = (y0 + ty) / 2 + 30 + Math.random() * 30;
  while (true) { if (tok !== autoToken) throw 'stop'; const p = Math.min(1, (now() - t0) / dur), e = easeIO(p); hand.x = (1 - e) * (1 - e) * x0 + 2 * (1 - e) * e * cx + e * e * tx; hand.y = (1 - e) * (1 - e) * y0 + 2 * (1 - e) * e * cy + e * e * ty; if (p >= 1) return; await frame(); }
}
function handBox(x, y) { if (!hand.img) return null; const s = handScaleOf(), w = hand.img.width * s, h = hand.img.height * s; return { x0: x - S.handAnchorX * w * 0.85, x1: x + (1 - S.handAnchorX) * w * 0.85, y0: y - S.handAnchorY * h, y1: y + (1 - S.handAnchorY) * h * 0.9 }; }
function tapPoint(p) {
  const f = Z.frog, dx = p.x - f.x, dy = p.y - f.y, L = Math.hypot(dx, dy) || 1, D = S.ballSize, hit = p.hit || p;
  const fr = S.handAvoid ? [0.55, 0.45, 0.65, 0.38, 0.72, 0.3, 0.8] : [0.9];
  for (const k of fr) { const x = f.x + dx * k, y = f.y + dy * k, b = handBox(x, y); if (!b || !S.handAvoid) return { x, y }; if (!(hit.x > b.x0 - D * 0.6 && hit.x < b.x1 + D * 0.6 && hit.y > b.y0 - D * 0.6 && hit.y < b.y1 + D * 0.6)) return { x, y }; }
  return { x: f.x + dx * 0.5, y: f.y + dy * 0.5 };
}
function planShot() {
  if (S.autoAim === 'random') { const a = Math.random() * Math.PI * 2; return { x: Z.frog.x + Math.cos(a) * 300, y: Z.frog.y + Math.sin(a) * 300, score: 0 }; }
  const p = Z.plan(); if (p && S.autoAim === 'match' && p.score >= 100) p.score = 100; return p;
}
const ended = () => !!(winAt || failAt);
async function autoSolve() {
  if (autoRunning) { autoToken++; autoRunning = false; hand.visible = false; hand.follow = null; updAutoBtn(); return; }
  if (ended()) newGame();
  const tok = ++autoToken; autoRunning = true; updAutoBtn(); sfx.resume();
  hand.x = DW * 0.72; hand.y = DH * 0.86; hand.visible = true;
  if (S.autoRec && !rec) startRec();
  try {
    await wait(S.autoStartDelay, tok);
    while (!ended()) {
      if (!Z.canShoot()) { await frame(); if (tok !== autoToken) throw 'stop'; continue; }
      let p = planShot(); if (!p) { await frame(); continue; }
      let tp = tapPoint(p); await moveHand(tp.x + (Math.random() - 0.5) * S.jitter, tp.y + (Math.random() - 0.5) * S.jitter, tok);
      if (ended()) break;
      while (!Z.canShoot()) { await frame(); if (tok !== autoToken) throw 'stop'; }
      const p2 = planShot(); // 链在动：到位后按最新局面微调（同一目标时手指只挪几像素）
      if (p2) { const tp2 = tapPoint(p2); if (Math.hypot(tp2.x - hand.x, tp2.y - hand.y) > 4) await moveHand(tp2.x, tp2.y, tok, Math.min(160, 40 + Math.hypot(tp2.x - hand.x, tp2.y - hand.y))); }
      if (S.pressEnabled) hand.pressT0 = now();
      await wait(50, tok);
      Z.shoot(hand.x, hand.y);
      await wait(rr(S.delayMin, S.delayMax) + (Math.random() < S.thinkChance ? Math.random() * S.thinkMax : 0), tok);
    }
    while (endAlpha(now()) <= 0 && S.endCard) { if (tok !== autoToken) throw 'stop'; await frame(); }
  } catch (e) { if (e !== 'stop') console.error(e); }
  if (tok === autoToken) { autoRunning = false; updAutoBtn(); }
}
function onFinish() { if (rec && S.autoStop && autoRunning) setTimeout(stopRec, S.tailSec * 1000 + (S.endCard ? S.endDelay : 0) + 800); }
function updAutoBtn() { const b = document.getElementById('btnAuto'); if (b) { b.textContent = autoRunning ? '■ 停止' : '▶ 自动通关'; b.classList.toggle('on', autoRunning); } }

// ---------- 录制（仅“⏺ 开始录制”按钮或 autoRec）----------
let rec = null, recChunks = [], recT0 = 0;
function pickMime() {
  const mp4 = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/mp4'], webm = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  const list = S.recFormat === 'webm' ? webm : S.recFormat === 'mp4' ? mp4 : mp4.concat(webm);
  return list.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
}
function startRec() {
  if (!window.MediaRecorder) { status('浏览器不支持录制'); return; }
  sfx.ensure();
  const vs = cv.captureStream(S.recFps), tracks = [...vs.getVideoTracks()];
  if (sfx.recDest) tracks.push(...sfx.recDest.stream.getAudioTracks());
  const mime = pickMime();
  rec = new MediaRecorder(new MediaStream(tracks), { mimeType: mime || undefined, videoBitsPerSecond: S.recBitrate * 1e6 });
  recChunks = []; rec.ondataavailable = e => e.data.size && recChunks.push(e.data);
  rec.onstop = () => {
    const type = rec.mimeType || mime || 'video/webm', ext = type.includes('mp4') ? 'mp4' : 'webm';
    const blob = new Blob(recChunks, { type }), url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `zuma_${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`; a.textContent = `⬇ ${a.download} (${(blob.size / 1e6).toFixed(1)}MB)`;
    document.getElementById('recList').prepend(a); window.__lastRec = { size: blob.size, type }; rec = null; updRecBtn();
    if (aeByRec && aeActive()) aeStopAndExport().catch(e => console.error(e));
    aeByRec = false;
  };
  rec.start(250); recT0 = now(); updRecBtn(); aeByRec = false; if (S.aeWithRec && !aeActive()) { recStart(); aeByRec = true; }
}
function stopRec() { if (rec && rec.state !== 'inactive') rec.stop(); }
function updRecBtn() { const b = document.getElementById('btnRec'); if (!b) return; b.textContent = rec ? '■ 停止录制' : '⏺ 开始录制'; b.classList.toggle('on', !!rec); }

// ---------- AE / 3D 导出 ----------
function frameItems(t) { // 当前帧全部可见元素（设计坐标）：AE 图层 / 3D 节点的采样来源
  const out = [], D = S.ballSize; out.push({ id: 'background', asset: 'background_' + themeNow, x: view.x0, y: view.y0, sc: 1, z: 0 });
  out.push({ id: 'frog', asset: 'frog', x: Z.frog.x, y: Z.frog.y, sc: 1, rot: Z.frog.ang, z: 2 });
  for (const b of draw.balls || []) out.push({ id: (b.mouth ? 'mouth_' : 'ball_') + b.id, asset: 'ball_' + b.c, x: b.x, y: b.y, sc: b.scale, z: b.mouth ? 3 : 1, c: b.c, h: b.z });
  for (const p of fxItems(fx, t / 1000)) out.push({ id: 'fx_' + (p.p.id || (p.p.id = ++frameItems.n)), asset: p.asset, x: p.x, y: p.y, sc: p.sc, rot: p.rot || 0, op: p.op, z: 4, add: p.add });
  if (draw.blur > 0.05) out.push({ id: 'blur', asset: null, blur: draw.blur, z: 5 });
  if (S.discShow && S.discText) out.push({ id: 'disclaimer', asset: 'disclaimer', x: DW / 2, y: view.y0 + view.h - S.discY, sc: 1, z: 6 });
  if (failShowAt && t >= failShowAt) { const u = (t - failShowAt) / (S.failScaleDur * 1000); out.push({ id: 'result_fail', asset: 'fail_badge', x: DW / 2, y: DH / 2, sc: Math.max(0.001, easeBack(u)), rot: (1 - easeOut(u)) * -0.35, op: clamp01(u * 4), z: 7 }); }
  if (winAt && S.winText) { const u = (t - winAt) / 500; out.push({ id: 'result_win', asset: 'win_text', x: DW / 2, y: DH / 2, sc: Math.max(0.001, easeBack(u)), op: clamp01(u * 3), z: 7 }); }
  const ea = endAlpha(t); if (ea > 0) out.push({ id: 'end_card', asset: 'end_card', x: view.x0, y: view.y0, sc: 1, op: ea, z: 8 });
  const hs = handState(); if (hs) out.push({ id: 'hand', asset: 'hand', x: hs.x, y: hs.y, sc: hs.s / handScaleOf(), rot: S.handRotation * Math.PI / 180, z: 9 });
  return out;
}
frameItems.n = 0;
const aeRec = createAERecorder({ sfx, now, version: APP_VERSION, env: () => ({ S, view, K, T, canvas: cv, items: frameItems(now()), sprites: () => aeSprites() }) });
function aeSprites() { if (!aeSpritesCache) aeSpritesCache = buildSprites({ S, T, view, K, bgCanvas, R3, handImg: hand.img, colorOf, endDraw: g => drawEnd(g, 1) }); return aeSpritesCache; }
let recClosed = false, aeLastRec = null, aeByRec = false;
function recStart() { aeRec.start(); recClosed = false; updateAEButtons(); toast('开始记录 AE 时间轴'); }
function aeActive() { return !!aeRec.rec && !recClosed; }
function aeStop() { const r = aeRec.rec; recClosed = true; updateAEButtons(); if (r && r.frames > 1) aeLastRec = r; return r && r.frames > 1 ? r : null; }
async function aeStopAndExport() { const r = aeStop(); if (!r) { toast('没有记录到内容'); return null; } return doExportAE(true, r); }
const curRec = () => aeActive() ? aeRec.rec : aeLastRec;
function updateAEButtons() { const b = document.getElementById('btn_aeToggle'); if (!b) return; b.textContent = aeActive() ? `■ 停止并导出（${((now() - (aeRec.rec.t0 || now())) / 1000).toFixed(1)}s）` : '● 开始记录'; b.classList.toggle('on', aeActive()); }
async function doExportH5() { try { return await exportH5PlayableFromPage({ toolId: APP_ID, S, stripDataUrls: [DEFAULT_HAND], status, toast }); } catch (e) { status('H5 导出失败：' + e.message); console.error(e); return null; } }
const PANEL_ACTIONS = { aeToggle: () => aeActive() ? aeStopAndExport() : recStart(), aeExport: () => doExportAE(), export3d: () => doExport3D(), exportH5: () => doExportH5() };
function recTailDone(t) { const e = winAt || failShowAt; return e && t - e > (S.endCard ? S.endDelay + 400 : 0) + Math.max(800, S.tailSec * 1000); }
function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.textContent = `⬇ ${name} (${(blob.size / 1e6).toFixed(1)}MB)`; document.getElementById('recList').prepend(a); a.click(); }
async function doExportAE(save = true, r0 = curRec()) {
  if (!r0) { toast('请先用“● 开始记录”记录一段（自动通关或手动游玩）'); return null; }
  status('正在生成 AE 工程…'); const r = await aeRec.exportZip(r0); window.__aeLast = r;
  if (save) download(r.blob, r.name); status(`AE 工程：${r.stats.layers} 图层，${r.stats.keys} 关键帧`); return r;
}
async function doExport3D(save = true, r0 = curRec()) {
  if (!r0) { toast('请先用“● 开始记录”记录一段（自动通关或手动游玩）'); return null; }
  status('正在生成 3D 动画…'); const ae = await aeRec.exportZip(r0, { aeFps: String(+S.export3dFps || 30), aeSize: 'canvas', aeSampling: 'bake', aeNames: 'en', aeAudio: 'both' });
  const r = await export3D({ S: { ...r0.S, export3dFps: S.export3dFps }, ae, rec: r0, env: { T, view, bgCanvas, theme: themeNow } });
  window.__e3dLast = r; if (save) download(r.blob, r.name); status(`3D 动画：${r.stats.nodes} 节点，${r.duration.toFixed(2)}s`); return r;
}

// ---------- 主循环 ----------
function loop(t) {
  updateCursor();
  if (window.__vclock != null) { requestAnimationFrame(loop); return; }
  t = now(); step(t); updPress(t); draw(t);
  if (aeActive()) { if (recTailDone(t)) aeStop(); else aeRec.sample(t); if (t - (loop.aeBtnT || 0) > 250) { loop.aeBtnT = t; updateAEButtons(); } }
  const ri = document.getElementById('recInfo'); if (ri) ri.textContent = rec ? `录制中 ${((t - recT0) / 1000).toFixed(1)}s` : '';
  requestAnimationFrame(loop);
}

// ---------- 设置面板 ----------
const NEWGAME_KEYS = /^(seed|colorCount|chainLen|chainSameProb|startFill|matchMin|shotColorMode|track|ballSize|frog|canvas|theme$|mouthDist|eyeStyle|pedestal|grooveWidth|holeSize|light|shadow|ballRough|ballEnv|rune|col_|bgImage|grey|groove|hole|bgDim|vignette)/;
function applyChange(k) {
  if (k === 'h5DeviceW' || k === 'h5DeviceH') markH5DeviceCustomIfSizeEdited(S);
  if (k === 'h5Device' || k === 'h5DeviceW' || k === 'h5DeviceH') { try { if (window.__h5EditorDeviceFit) window.__h5EditorDeviceFit(); } catch (e) { } }
  saveSettings(S);
  if (k === 'handImage' || k === 'handAnchorX' || k === 'handAnchorY') loadHand();
  if (k === 'bgImage') { loadImg(S.bgImage).then(im => { imgs.custom = im; newGame(); }); return; }
  if (R3 && /^(col_|rune|ballRough|ballEnv|light|shadow|frog|eyeStyle|eyeGlow|gemColor|mouthDist|ballSize)/.test(k)) { R3.mats.clear(); }
  if (NEWGAME_KEYS.test(k)) newGame();
  else if (/^fail/.test(k)) draw.badge = null;
}
function loadHand() { const im = new Image(); im.onload = () => { hand.img = im; aeSpritesCache = null; }; im.onerror = () => { hand.img = null; }; if (!S.handImage) { hand.img = null; return; } im.src = S.handImage; }
function buildPanel() {
  const body = document.getElementById('panelBody'); if (!body) return;
  const openTitles = new Set([...body.querySelectorAll('details[open] summary')].map(s => s.textContent));
  body.innerHTML = '';
  GROUPS.forEach(([title, items], gi) => {
    const det = document.createElement('details'); if (gi < 1 || openTitles.has(title)) det.open = true; det.innerHTML = `<summary>${title}</summary>`;
    items.forEach(([k, label, type, def, a, b, step2]) => {
      const row = document.createElement('div'); row.className = 'row'; row.innerHTML = `<label title="${k}">${label}</label>`;
      if (type === 'range') {
        const r = document.createElement('input'); r.type = 'range'; r.min = a; r.max = b; r.step = step2; r.value = S[k]; r.id = 'rng_' + k;
        const n = document.createElement('input'); n.type = 'number'; n.className = 'val'; n.step = step2; n.value = S[k];
        r.oninput = () => { S[k] = +r.value; n.value = r.value; applyChange(k); }; n.onchange = () => { S[k] = +n.value; r.value = n.value; applyChange(k); };
        row.append(r, n);
      } else if (type === 'color') { const c = document.createElement('input'); c.type = 'color'; c.value = S[k]; c.oninput = () => { S[k] = c.value; applyChange(k); }; row.append(c); }
      else if (type === 'bool') { row.classList.add('t-switch'); const l = document.createElement('label'); l.className = 'switch'; l.innerHTML = `<input type="checkbox" class="switch-input" id="chk_${k}" ${S[k] ? 'checked' : ''}><span class="slider"></span>`; l.querySelector('input').onchange = e => { S[k] = e.target.checked; applyChange(k); }; row.append(l); }
      else if (type === 'select') { const s = document.createElement('select'); s.id = 'sel_' + k; a.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; s.append(o); }); s.value = S[k]; s.onchange = () => { S[k] = s.value; if (k === 'h5Device') { applyH5DevicePresetToSettings(S); buildPanel(); } applyChange(k); }; row.append(s); }
      else if (type === 'text') { const t = document.createElement('input'); t.type = 'text'; t.value = S[k]; t.oninput = () => { S[k] = t.value; applyChange(k); }; row.append(t); }
      else if (type === 'button') { const bt = document.createElement('button'); bt.id = 'btn' + k; bt.textContent = a; bt.onclick = () => Promise.resolve(PANEL_ACTIONS[def] && PANEL_ACTIONS[def]()).catch(e => { status('导出失败：' + e.message); console.error(e); }); row.append(bt); }
      else if (type === 'file') {
        const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/png,image/webp,image/jpeg,image/*'; f.id = 'file_' + k;
        f.onchange = () => { const file = f.files[0]; if (!file) return; const fr = new FileReader(); fr.onload = () => { S[k] = fr.result; applyChange(k); }; fr.readAsDataURL(file); };
        const x = document.createElement('button'); x.textContent = k === 'handImage' ? '清除已上传手指' : '清除'; if (k === 'handImage') x.id = 'btnClearHand'; x.onclick = () => { S[k] = ''; f.value = ''; applyChange(k); };
        row.append(f, x);
        if (k === 'handImage') { const d = document.createElement('button'); d.textContent = '恢复默认手指'; d.onclick = () => { S[k] = DEFAULT_HAND; applyChange(k); }; row.append(d); }
      }
      det.append(row);
    });
    if (title.startsWith('手指')) det.insertAdjacentHTML('beforeend', '<div class="tip">默认手指 = 麻将工具同款手图。上传透明背景 PNG 可替换，用锚点 X/Y 标定指尖位置。自动通关时手指点在青蛙与目标之间（开启“避开命中点”），不遮挡插入与消除特效。录制不会随自动通关自动开始（除非打开“自动录制”）。</div>');
    if (title.startsWith('导出 H5')) det.insertAdjacentHTML('beforeend', '<div class="tip">试玩由玩家自己玩：导出包不含手指、默认不自动演示。预览与导出均按所选机型/自定义尺寸；选「自适应」才是全机型 contain/letterbox。</div>');
    if (title.startsWith('场景')) det.insertAdjacentHTML('beforeend', '<div class="tip">遗迹主题底图为生成的苔藓石板贴图（内置），凹槽轨道 / 金边黑洞 / 回纹底座为程序绘制，随轨道参数实时变化。</div>');
    body.append(det);
  });
}
let toastT = 0;
function toast(t, dur = 1600) { const el = document.getElementById('toast'); if (!el) return; el.textContent = t; el.classList.add('show'); clearTimeout(toastT); if (dur > 0) toastT = setTimeout(() => el.classList.remove('show'), dur); }
const $ = id => document.getElementById(id) || {};
$('btnAuto').onclick = autoSolve;
$('btnNew').onclick = newGame;
$('btnSeed').onclick = () => { S.seed = 1 + Math.floor(Math.random() * 9999); saveSettings(S); buildPanel(); newGame(); };
$('btnTheme').onclick = () => { S.theme = S.theme === 'ruins' ? 'grey' : 'ruins'; saveSettings(S); buildPanel(); newGame(); };
$('btnRec').onclick = () => rec ? stopRec() : startRec();
$('btnShot').onclick = () => { const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = 'zuma_shot.png'; a.click(); };
$('btnExport').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([exportJSON(S)], { type: 'application/json' })); a.download = 'zuma-tool-settings.json'; a.click(); };
$('btnImport').onclick = () => document.getElementById('importFile').click();
$('importFile').onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { const j = JSON.parse(t); S = migrate(j); saveSettings(S); buildPanel(); loadHand(); newGame(); toast('已导入设置'); }).catch(() => toast('导入失败')); };
$('btnReset').onclick = () => { if (!confirm('恢复全部默认设置？')) return; S = { ...DEFS }; saveSettings(S); buildPanel(); loadHand(); newGame(); };
{ const v = document.getElementById('ver'); if (v) v.textContent = 'v' + APP_VERSION; }
const __h5 = applyPlayableMode({
  applySettings: ps => { Object.assign(S, migrate({ version: 1, settings: { ...S, ...ps } })); },
  autoPlay: () => { try { autoSolve(); } catch (e) { } },
  state: () => { try { return Z.shotsFired + '|' + Z.frog.ang.toFixed(3) + '|' + Z.balls.length; } catch (e) { return ''; } },
  isEnded: () => { try { return !!(winAt || failShowAt); } catch (e) { return false; } },
  onResize: () => { },
});
if (__h5) { try { const panel = document.getElementById('panel'); if (panel) panel.style.display = 'none'; } catch (e) { } }
if (!__h5) bindEditorDevicePreview(() => S);
window.__game = {
  renderAt: t => { window.__vclock = t; step(t); updPress(t); if (!window.__nodraw) draw(t); else draw.balls = ballList(t); if (aeActive()) aeRec.sample(t); },
  get Z() { return Z; }, get T() { return T; }, get S() { return S; }, get view() { return view; }, get hand() { return hand; }, get R3() { return R3; }, get fx() { return fx; },
  autoSolve, newGame, tapAt, planShot, tapPoint, handBox, frameItems: () => frameItems(now()), get autoRunning() { return autoRunning; },
  set(k, v) { S[k] = v; applyChange(k); buildPanel(); }, setMany(o) { Object.assign(S, o); saveSettings(S); buildPanel(); newGame(); },
  doExportAE, doExport3D, doExportH5, aeStart: () => recStart(), aeStop: () => aeStop(), aeActive: () => aeActive(), startRec, stopRec, get mediaRec() { return rec; }, migrate, APP_ID, APP_VERSION,
};
Promise.all([loadImg(RUINS_JPG), loadImg(GREY_JPG), loadImg(S.bgImage)]).then(([a, b, c]) => {
  imgs.ruins = a; imgs.grey = b; imgs.custom = c; buildPanel(); loadHand(); newGame(); window.__ready = true; requestAnimationFrame(loop);
});
