// 导出 3D zip：先录一段（同 ae-export），再 doExport3D，检查 GLB / scene3d.json
import { chromium } from 'playwright-core';
import fs from 'fs';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1300, height: 1000 } });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto('file://' + process.cwd() + '/index.html'); await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
const info = await p.evaluate(async () => { try {
  __game.setMany({ seed: 7, chainSpeed: 2.5, introSec: 0 }); let t = 300000; __game.renderAt(t); __game.newGame(); __game.aeStart(); __game.autoSolve();
  for (let f = 0; f < 150; f++) { t += 1000 / 30; __game.renderAt(t); await new Promise(r => setTimeout(r, 0)); }
  __game.aeStop(); const r = await __game.doExport3D(false); const buf = new Uint8Array(await r.blob.arrayBuffer()); let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return { zip: btoa(bin), stats: r.stats, files: r.files, glb: r.glbSize, duration: r.duration };
} catch (e) { return { err: e.stack }; } });
if (info.err) { console.log(info.err); process.exit(1); }
fs.writeFileSync('/tmp/zuma_3d_sample.zip', Buffer.from(info.zip, 'base64'));
console.log(JSON.stringify({ stats: info.stats, files: info.files, glbKB: Math.round(info.glb / 1024), duration: info.duration }));
const bad = !info.files.includes('scene.glb') || !info.stats.balls || !info.stats.frog;
await b.close(); console.log(errs.length ? 'ERRORS ' + errs.slice(0, 3).join(' | ') : 'no page errors');
console.log(bad || errs.length ? '3D EXPORT FAIL' : '3D EXPORT PASS'); process.exit(bad || errs.length ? 1 : 0);
