// 浏览器冒烟：页面加载无报错、版本号 v1.0.2、默认不自动录制、自动通关能发射并消除（虚拟时钟 + 页面 AI 规划）
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1300, height: 1000 } });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto('file://' + process.cwd() + '/index.html'); await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
const r = await p.evaluate(async () => { const ver = document.getElementById('ver').textContent; let t = 500000; window.__nodraw = true; __game.setMany({ seed: 1 }); __game.renderAt(t); __game.newGame(); let cd = 0;
  for (let i = 0; i < 30 * 120 && !window.__finished && !window.__failed; i++) { const Z = __game.Z; if (cd <= 0 && Z.canShoot()) { const q = Z.plan(); if (q) { Z.aim(q.x, q.y); Z.shoot(q.x, q.y); } cd = 18; } cd--; t += 33.3; __game.renderAt(t); }
  window.__nodraw = false; __game.renderAt(t); const Z = __game.Z; return { ver, rec: !!__game.mediaRec, finished: !!window.__finished, failed: !!window.__failed, shots: Z.shotsFired, removed: Z.removed, maxCombo: Z.maxCombo }; });
await b.close();
const checks = [[r.ver === 'v1.0.2', 'UI 版本 ' + r.ver], [!r.rec, '默认未自动录制'], [r.removed > 0, `自动打：${JSON.stringify(r)}`], [!errs.length, errs.length ? 'ERRORS ' + errs.slice(0, 3).join(' | ') : 'no page errors']];
for (const [ok, m] of checks) console.log((ok ? 'PASS ' : 'FAIL ') + m);
process.exit(checks.every(c => c[0]) ? 0 : 1);
