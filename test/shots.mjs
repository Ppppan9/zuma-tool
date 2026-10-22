// 截图：虚拟时钟逐帧推进（33.3ms/帧），输出 screenshots/：open_1s（开局≈1s）、combo_fx（连击特效中）、fail（FAIL 画面）+ 与参考帧并排对比 compare_*.png
import { chromium } from 'playwright-core';
import fs from 'fs';
import { execFileSync } from 'child_process';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1300, height: 1000 } });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && errs.push(m.type() + ': ' + m.text()));
await p.goto('file://' + process.cwd() + '/index.html'); await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
const which = (process.argv[2] || 'open,combo,fail').split(',');
fs.mkdirSync('screenshots', { recursive: true });
const shot = async name => { const png = await p.evaluate(() => document.getElementById('stage').toDataURL('image/png')); fs.writeFileSync('screenshots/' + name + '.png', Buffer.from(png.split(',')[1], 'base64')); console.log('saved screenshots/' + name + '.png'); };
const compare = (name, ref) => { execFileSync('python3', ['-c', `
from PIL import Image, ImageDraw
a=Image.open('screenshots/${name}.png').convert('RGB').resize((540,960)); b=Image.open('${ref}').convert('RGB').resize((540,960))
W=Image.new('RGB',(1100,1000),(30,30,30)); W.paste(a,(0,40)); W.paste(b,(560,40)); d=ImageDraw.Draw(W); d.text((10,10),'zuma-tool v1.0.0: ${name}',fill=(255,255,255)); d.text((570,10),'reference: ${ref.split('/').pop()}',fill=(255,255,255)); W.save('screenshots/compare_${name}.png')`]); console.log('saved screenshots/compare_' + name + '.png'); };
const REF = '/workspace/zuma-bundle/ref/frames/';
if (which.includes('open')) {
  await p.evaluate(() => { __game.setMany({}); let t = 100000; __game.renderAt(t); __game.newGame(); for (let i = 0; i <= 30; i++) __game.renderAt(t + i * 33.3); });
  await shot('open_1s'); compare('open_1s', REF + 'f_005.jpg');
}
if (which.includes('combo')) { // 自动通关（带手指），在第一次 ≥2 连击发生后 ~120ms 截图
  const r = await p.evaluate(async () => { window.__lastMatch = null; window.__matchLog = []; window.__nodraw = true; let t = 200000; for (const seed of [7, 3, 11, 21, 42, 5]) { __game.setMany({ seed }); __game.renderAt(t); __game.newGame(); window.__lastMatch = null; let cd = 0;
    for (let i = 0; i < 30 * 60; i++) { const Z = __game.Z; if (cd <= 0 && Z.canShoot()) { const p = Z.plan(); if (p) { Z.aim(p.x, p.y); Z.shoot(p.x, p.y); } cd = 18; } cd--; t += 33.3; __game.renderAt(t); const m = window.__lastMatch; if (m && m.combo >= 2 && t - m.t >= 0) { window.__nodraw = false; for (let k = 0; k < 4; k++) { t += 33.3; __game.renderAt(t); } return { ok: true, t, combo: m.combo, n: m.n, log: window.__matchLog.slice(-6) }; } if (window.__failed || window.__finished) break; } }
    window.__nodraw = false; __game.renderAt(t); return { ok: false, log: window.__matchLog }; });
  console.log('combo capture', JSON.stringify(r)); await shot('combo_fx'); compare('combo_fx', REF + 'f_021.jpg');
}
if (which.includes('fail')) { // 演示失败：随机乱打 + 推进加速，等 FAIL 徽章放大完成
  const r = await p.evaluate(async () => { const S = __game.S, keep = { autoAim: S.autoAim, chainSpeed: S.chainSpeed, theme: S.theme };
    let t = 400000; __game.renderAt(t); __game.setMany({ chainSpeed: 8, introSec: 0, theme: 'grey' }); __game.newGame(); let shownAt = 0, i = 0; window.__nodraw = true;
    for (i = 0; i < 30 * 40; i++) { t += 33.3; __game.renderAt(t); if (window.__failed && !shownAt) shownAt = t + 850; if (shownAt && t - shownAt > 900) window.__nodraw = false; if (shownAt && t - shownAt > 1100) break; }
    window.__nodraw = false; __game.renderAt(t);
    Object.assign(S, keep); return { failed: window.__failed, shownAt, frames: i }; });
  console.log('fail capture', JSON.stringify(r)); await shot('fail'); compare('fail', REF + 'f_094.jpg');
  await p.evaluate(() => { __game.setMany({}); });
}
console.log(errs.length ? 'ERRORS ' + errs.slice(0, 5).join(' | ') : 'no page errors');
await b.close();
