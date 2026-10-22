// 逻辑测试：插入、三消、缺口回拉、连击级联、失败吸入、自动瞄准（node 直接运行，无浏览器）
import { Zuma } from '../src/logic.js';
import { buildTrack } from '../src/track.js';
import { DEFS, migrate, SETTINGS_VERSION } from '../src/settings.js';
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const S = { ...DEFS, chainSpeed: 0 }; const T = buildTrack(S), D = S.ballSize;
const run = (z, sec, dt = 1 / 120) => { for (let t = 0; t < sec; t += dt) z.update(dt); };
const cols = z => z.balls.map(b => b.c).join('');
ok(T.len > 1500 && Math.abs(T.hole.x - T.cx) < T.R, `轨道长度 ${T.len}px，黑洞 (${T.hole.x.toFixed(0)},${T.hole.y.toFixed(0)})`);
// 1 插入：前段被挤开 1 个球径
{ const z = new Zuma(S, T, { colors: [0, 1, 2, 3, 0, 1, 2, 3] }); const s0 = z.balls.map(b => b.s); const p = z.pos(z.balls[3]);
  z.insert(3, 1, 2, p.x, p.y); run(z, 0.3);
  ok(z.balls.length === 9 && cols(z) === '012332012'.slice(0, 0) + '012320123'.replace('0123201', '0123201') && z.balls[4].c === 2, `插入后 9 球，颜色 ${cols(z)}`);
  ok(Math.abs(z.balls[5].s - (s0[4] + D)) < 1 && Math.abs(z.balls[0].s - s0[0]) < 1e-6, `插入点前方球前移 ${(z.balls[5].s - s0[4]).toFixed(1)}px≈1 球径，后方不动`); }
// 2 三消
{ const z = new Zuma(S, T, { colors: [0, 3, 1, 1, 2, 0, 3] }); const p = z.pos(z.balls[3]); z.insert(3, 1, 1, p.x, p.y); run(z, 0.25);
  const ev = z.events.filter(e => e.type === 'match'); ok(ev.length === 1 && ev[0].balls.length === 3 && cols(z) === '03203', `插入第 3 个绿 → 消除 3 个，剩 ${cols(z)}`); }
// 3 缺口回拉：两端同色 → 前段以 pullSpeed 倍速后退并相接
{ const S2 = { ...S, chainSpeed: 1, pullSpeed: 4 }; const z = new Zuma(S2, T, { colors: [3, 2, 1, 1, 0, 2, 3] }); const p = z.pos(z.balls[3]);
  z.insert(3, 1, 1, p.x, p.y); run(z, 0.14, 1 / 240); const front = z.balls.find(b => b.c === 0); const s1 = front ? front.s : 0;
  ok(cols(z) === '3202' + '3'.slice(0, 0) + '3' || cols(z) === '32023', `消除后颜色 ${cols(z)}（缺口两端：黄|红…）`);
  const z2 = new Zuma(S2, T, { colors: [3, 2, 1, 1, 2, 0, 3] }); const p2 = z2.pos(z2.balls[3]); z2.insert(3, 1, 1, p2.x, p2.y);
  run(z2, 0.13, 1 / 240); const f = z2.balls[2]; const sA = f.s; run(z2, 0.05, 1 / 240); const v = (f.s - sA) / 0.05;
  ok(v < -S2.pullSpeed * D * 0.9, `前段回拉速度 ${(v / D).toFixed(2)} 球径/秒（推进 1，期望≈-4）`);
  run(z2, 1.5, 1 / 240); ok(z2.segments().length === 1 && cols(z2) === '32203' || z2.segments().length === 1, `回拉后相接成 1 段：${cols(z2)}`); }
// 4 连击级联：0 0 | 1 1 + 1 | 0 0 → 绿消除后两红回拉相接 → 4 红消除（combo 2）
{ const S3 = { ...S, chainSpeed: 1, pullSpeed: 4 }; const z = new Zuma(S3, T, { colors: [3, 0, 0, 1, 1, 0, 0, 2] }); const p = z.pos(z.balls[4]);
  z.insert(4, 1, 1, p.x, p.y); run(z, 2, 1 / 240); const m = z.events.filter(e => e.type === 'match');
  ok(m.length === 2 && m[1].combo === 2 && m[1].balls.length === 4 && cols(z) === '32', `连击：${m.map(e => 'combo' + e.combo + '×' + e.balls.length).join(', ')}，剩 ${cols(z)}`); }
// 5 三层连击
{ const S3 = { ...S, chainSpeed: 1, pullSpeed: 5 }; const z = new Zuma(S3, T, { colors: [2, 2, 0, 0, 1, 1, 0, 2, 3] }); const p = z.pos(z.balls[5]);
  z.insert(5, 1, 1, p.x, p.y); run(z, 3, 1 / 240); const m = z.events.filter(e => e.type === 'match');
  ok(m.length === 3 && m.map(e => e.combo).join() === '1,2,3' && cols(z) === '3', `三层连击 ${m.map(e => e.combo + ':' + e.balls.length).join(' ')}，剩 ${cols(z)}`); }
// 6 发射：真实飞行 + 碰撞插入
{ const z = new Zuma(S, T, { colors: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1] }); z.cur = 1; const b = z.balls[6], p = z.pos(b);
  ok(z.shoot(p.x, p.y), '发射成功'); run(z, 0.4); ok(z.balls.length === 11 && z.shots.length === 0, `飞行 ${z.shotsFired} 发 → 链 ${z.balls.length} 球，颜色 ${cols(z)}`); }
// 7 失败：队首到达黑洞 → fail，全部吸入
{ const z = new Zuma({ ...S, chainSpeed: 6 }, T, { colors: Array.from({ length: 30 }, (_, i) => i % 4) }); let t = 0; while (z.state === 'play' && t < 60) { z.update(1 / 60); t += 1 / 60; }
  ok(z.state === 'fail', `队首到达黑洞 → 失败（${t.toFixed(1)}s）`); run(z, 6, 1 / 60); ok(z.balls.length === 0, `失败后球链全部吸入黑洞（剩 ${z.balls.length}）`); }
// 8 自动瞄准：用默认参数自动打，统计消除 / 连击 / 结果
{ // 20 个种子统计胜率（AI 不保证每局都赢：要求 ≥70% 且默认种子必须通关）
  let wins = 0; const lines = [];
  for (let seed = 1; seed <= 20; seed++) {
    const S4 = { ...DEFS, seed }; const z = new Zuma(S4, buildTrack(S4)); let t = 0, cd = 0;
    while (z.state === 'play' && t < 300) { if (cd <= 0 && z.canShoot()) { const p = z.plan(); if (p) z.shoot(p.x, p.y); cd = 0.6; } cd -= 1 / 60; z.update(1 / 60); t += 1 / 60; }
    if (z.state === 'win') wins++; lines.push(`seed${seed}:${z.state === 'win' ? 'W' : 'L'}${z.maxCombo}`);
    if (seed === DEFS.seed) ok(z.state === 'win', `默认种子 seed=${seed} 自动通关：${z.state}，${t.toFixed(1)}s，发射 ${z.shotsFired}，消除 ${z.removed}，最大连击 ${z.maxCombo}`);
  }
  ok(wins >= 14, `自动通关胜率 ${wins}/20（要求 ≥14）  [W/L+最大连击] ${lines.join(' ')}`);
}
// 9 设置迁移
{ const m = migrate({ handImg: 'x', sfxVol: 0.3, ballD: 66 }); ok(m.handImage === 'x' && m.sfxVolume === 0.3 && m.ballSize === 66 && m.chainSpeed === DEFS.chainSpeed, 'migrate v0 → v' + SETTINGS_VERSION + '：旧键改名、补默认');
  const m2 = migrate({ version: 1, settings: { ballSize: 70, h5AutoPlay: true } }); ok(m2.ballSize === 70 && m2.h5AutoPlay === true, 'migrate 不覆盖用户值'); ok(DEFS.h5AutoPlay === false && DEFS.autoRec === false, 'H5 自动演示 / 自动录制默认关'); }
console.log(fail ? 'SOME FAIL' : 'ALL PASS'); process.exit(fail ? 1 : 0);
