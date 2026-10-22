// 自动通关（虚拟时钟逐帧推进）并记录 AE 时间轴 → 导出 AE zip（E3D=1 同时导出 3D zip），检查 zip 结构 / 图层 / 关键帧
import { chromium } from 'playwright-core';
import fs from 'fs';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1300, height: 1000 } });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto('file://' + process.cwd() + '/index.html'); await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
const maxF = +(process.env.AE_FRAMES || 240);
const info = await p.evaluate(async maxF => { try {
  __game.setMany({ seed: 7, chainSpeed: 2.5, introSec: 0 }); let t = 300000; __game.renderAt(t); __game.newGame(); __game.aeStart(); __game.autoSolve(); let f = 0;
  while (f < maxF && !window.__failShown) { t += 1000 / 30; f++; __game.renderAt(t); await new Promise(r => setTimeout(r, 0)); }
  __game.aeStop(); const r = await __game.doExportAE(false);
  const enc = async blob => { const buf = new Uint8Array(await blob.arrayBuffer()); let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000)); return btoa(bin); };
  const out = { zip: await enc(r.blob), name: r.name, stats: r.stats, files: r.fileList.map(x => x.name), duration: r.timeline.meta.duration, frames: f };
  if (window.__E3D) { const r3 = await __game.doExport3D(false); out.z3 = await enc(r3.blob); out.s3 = r3.stats; out.f3 = r3.files; out.glb = r3.glbSize; }
  return out;
} catch (e) { return { err: e.stack }; } }, maxF);
if (info.err) { console.log(info.err); process.exit(1); }
fs.mkdirSync('screenshots', { recursive: true });
fs.writeFileSync('/tmp/zuma_ae_sample.zip', Buffer.from(info.zip, 'base64'));
const need = ['build_ae_project.jsx', 'timeline.json', 'README_AE.md', 'audio/mix.wav'], miss = need.filter(n => !info.files.includes(n));
console.log(JSON.stringify({ name: info.name, frames: info.frames, duration: info.duration, stats: info.stats, files: info.files.length, assets: info.files.filter(n => n.startsWith('assets/')).length, sfxFiles: info.files.filter(n => n.startsWith('audio/sfx_')) }));
let bad = miss.length || !info.stats.layers || !info.stats.keys; if (miss.length) console.log('MISSING', miss);
await b.close();
console.log(errs.length ? 'ERRORS ' + errs.slice(0, 3).join(' | ') : 'no page errors');
console.log(bad || errs.length ? 'AE EXPORT FAIL' : 'AE EXPORT PASS'); process.exit(bad || errs.length ? 1 : 0);
