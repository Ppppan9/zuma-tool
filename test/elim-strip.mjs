// 消除动画逐帧对比：参考 ref.mp4（30fps，三消成立帧 = b_024）vs 本工具（虚拟时钟 33.3ms/帧，从 match 事件起），同一 ms 偏移、同样取景
import { chromium } from 'playwright-core';
import fs from 'fs';
import { execFileSync } from 'child_process';
const OFFS = [0, 33, 67, 100, 133, 167, 200, 233, 267, 300, 333, 400, 467, 533, 600, 667];
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1300, height: 1000 } });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.goto('file://' + process.cwd() + '/index.html'); await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
const r = await p.evaluate(async OFFS => { window.__nodraw = true; window.__lastMatch = null; let t = 700000; __game.setMany({ seed: +(window.__seed || 3) }); __game.renderAt(t); __game.newGame(); let cd = 0;
  for (let i = 0; i < 30 * 60; i++) { const Z = __game.Z; if (cd <= 0 && Z.canShoot()) { const q = Z.plan(); if (q && !q.discard) { Z.aim(q.x, q.y); Z.shoot(q.x, q.y); } cd = 18; } cd--;
    for (let s = 0; s < 4; s++) { t += 8.33; __game.renderAt(t); const m = window.__lastMatch; if (m && t - m.t < 9 && i > 30 && m.n >= 3) { // match 刚发生：从 match 时刻起按偏移截图
        const t0 = m.t, c = m.c, out = []; window.__nodraw = false; for (const o of OFFS) { __game.renderAt(t0 + o + 0.01); out.push(document.getElementById('stage').toDataURL('image/png')); } return { c, shots: out, t0, combo: m.combo }; } } }
  return null; }, OFFS);
await b.close();
if (!r) { console.log('no match captured'); process.exit(1); }
OFFS.forEach((o, k) => fs.writeFileSync(`/tmp/our_${k}.png`, Buffer.from(r.shots[k].split(',')[1], 'base64')));
fs.writeFileSync('/tmp/our_meta.json', JSON.stringify({ c: r.c, offs: OFFS }));
execFileSync('python3', ['-c', `
from PIL import Image, ImageDraw
import json
m=json.load(open('/tmp/our_meta.json')); cx,cy=m['c']; offs=m['offs']
W0,H0=300,231
for part in (0,1):
  idx=list(range(part*8,part*8+8)); S=Image.new('RGB',(W0*8,H0*2+20),(20,20,20)); d=ImageDraw.Draw(S)
  for j,k in enumerate(idx):
    o=offs[k]; fi=24+round(o/33.333)
    ref=Image.open('/tmp/e30/b_%03d.jpg'%fi).convert('RGB').crop((180,1150,700,1550)).resize((W0,H0))
    a=Image.open('/tmp/our_%d.png'%k).convert('RGB'); s=a.size[0]/720
    ours=a.crop((int((cx-173)*s),int((cy-133)*s),int((cx+173)*s),int((cy+133)*s))).resize((W0,H0))
    S.paste(ref,(j*W0,20)); S.paste(ours,(j*W0,20+H0)); d.text((j*W0+4,4),'+%dms  ref b_%03d / ours'%(o,fi),fill=(255,255,0))
  S.save('screenshots/elim_compare_ref_vs_ours_%d.png'%(part+1))
`]);
console.log('match at', r.c, 'combo', r.combo, '→ screenshots/elim_compare_ref_vs_ours_1.png / _2.png', errs.length ? 'ERRORS ' + errs.join('|') : 'no page errors');
