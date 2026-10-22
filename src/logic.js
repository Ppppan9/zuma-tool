// 祖玛核心玩法（纯逻辑，无 DOM；node 测试直接 import）
// 链：balls[0] = 队尾（弧长最小，靠近入口），balls[n-1] = 队首（最靠近黑洞）。弧长单位 px（设计坐标 720×1280）。
export function mulberry(seed) { let a = seed >>> 0 || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const COLOR_KEYS = ['red', 'green', 'yellow', 'blue', 'purple', 'white'];

export function makeChainColors(n, nColors, rnd, sameProb = 0.45, maxRun = 2) {
  const out = []; let run = 0;
  for (let i = 0; i < n; i++) {
    let c;
    if (i > 0 && run < maxRun && rnd() < sameProb) c = out[i - 1];
    else { do { c = Math.floor(rnd() * nColors); } while (i > 0 && c === out[i - 1] && nColors > 1); }
    run = i > 0 && c === out[i - 1] ? run + 1 : 1; out.push(c);
  }
  return out;
}

export class Zuma {
  constructor(S, track, opts = {}) {
    this.S = S; this.T = track; this.D = S.ballSize; this.rnd = mulberry(opts.seed ?? S.seed);
    this.nColors = Math.max(1, Math.min(S.colorCount, 6));
    this.balls = []; this.dying = []; this.shots = []; this.events = []; this.id = 0; this.state = 'play'; this.time = 0; this.cool = 0;
    this.combo = 0; this.maxCombo = 0; this.removed = 0; this.shotsFired = 0; this.matches = 0; this.failT = 0;
    const cols = opts.colors || makeChainColors(S.chainLen, this.nColors, this.rnd, S.chainSameProb, 2);
    const head = S.startFill * track.len;
    for (let i = cols.length - 1, k = 0; i >= 0; i--, k++) this.balls.unshift(this.mk(cols[i], head - k * this.D));
    for (let i = 1; i < this.balls.length; i++) { const m = this.minNext(i); if (this.balls[i].s < m) this.balls[i].s = m; }
    this.frog = { x: track.cx + S.frogOffX, y: track.cy + S.frogOffY, ang: -Math.PI / 2 + S.frogStartDeg * Math.PI / 180 };
    this.cur = this.pickColor(); this.next = this.pickColor();
  }
  mk(c, s) { return { id: ++this.id, c, s, g: 1, roll: 0, fly: 0, fx: 0, fy: 0, tag: 0 }; }
  pickColor() {
    if (this.S.shotColorMode === 'random') return Math.floor(this.rnd() * this.nColors);
    const vis = this.balls.filter(b => b.s > this.T.visS - this.D * 3);
    if (this.S.shotColorMode === 'smart' && this.rnd() < this.S.smartProb && this.balls.length) { // 偏向“当前就能凑出消除”的颜色
      const good = this.goodColors();
      if (good.length) return good[Math.floor(this.rnd() * good.length)];
    }
    const set = [...new Set((vis.length ? vis : this.balls).map(b => b.c))];
    return set.length ? set[Math.floor(this.rnd() * set.length)] : Math.floor(this.rnd() * this.nColors);
  }
  goodColors() { const good = []; for (let c = 0; c < this.nColors; c++) { const p = this.plan(c, true); if (p && p.score >= 100) good.push(c); } return good; }
  need(a, b) { return this.D * (a.g + b.g) / 2; }
  // 弯道上弦长 < 弧长：返回使两球“直线距离”≥ nd 的最小弧长位置（从 s0 向前）
  chordS(s0, nd) { const T = this.T, p0 = T.at(s0); let s = s0 + nd; for (let k = 0; k < 8; k++) { const p = T.at(s), d = Math.hypot(p.x - p0.x, p.y - p0.y); if (d >= nd - 0.02 || s >= T.len) break; s += (nd - d) * 1.05 + 0.02; } return s; }
  chordSBack(s0, nd) { const T = this.T, p0 = T.at(s0); let s = s0 - nd; for (let k = 0; k < 8; k++) { const p = T.at(s), d = Math.hypot(p.x - p0.x, p.y - p0.y); if (d >= nd - 0.02) break; s -= (nd - d) * 1.05 + 0.02; } return s; }
  minNext(i) { const B = this.balls; return this.chordS(B[i - 1].s, this.need(B[i - 1], B[i])); }
  touching(i) { const B = this.balls; return i > 0 && B[i].s <= this.minNext(i) + 0.5; } // i 与 i-1 相接
  segments() { const B = this.balls, segs = []; let a = 0; for (let i = 1; i <= B.length; i++) if (i === B.length || !this.touching(i)) { segs.push([a, i - 1]); a = i; } return segs; }
  pos(b) {
    const p = this.T.at(b.s); if (!(b.g < 1) && !(b.fly > 0)) return p;
    const u = b.fly * b.fly; let x = p.x + (b.fx - p.x) * u, y = p.y + (b.fy - p.y) * u;
    // 插入中的球：缺口还没完全张开时被相邻球“挤”在轨道旁（参考视频：新球先浮在链外侧，随缺口张开滑入），任何时刻不与相邻球重叠
    const B = this.balls, k = B.indexOf(b), D = this.D;
    if (k >= 0) { const nb = []; for (let j = k - 2; j <= k + 2; j++) if (j !== k && j >= 0 && j < B.length && B[j].g >= 1) { const q = this.T.at(B[j].s); q.r = D; nb.push(q); }
      for (const d of this.dying) if (Math.hypot(d.x - x, d.y - y) < D * 2) nb.push({ x: d.x, y: d.y, r: D / 2 * (1 + (this.S.dyingShrink ? Math.max(0.01, 1 - d.t / this.S.popDur) : 1)) * 1.01 });
      const f = this.frog; for (let it = 0; it < 30; it++) { let moved = false; for (const n of nb) { let dx = x - n.x, dy = y - n.y, d = Math.hypot(dx, dy); if (d >= n.r) continue; if (d < 1e-3) { dx = f.x - n.x; dy = f.y - n.y; d = Math.hypot(dx, dy) || 1; } x = n.x + dx / d * n.r * 1.0005; y = n.y + dy / d * n.r * 1.0005; moved = true; } if (!moved) break; }
      const bad = () => nb.filter(n => Math.hypot(x - n.x, y - n.y) < n.r * 0.999);
      if (bad().length) { // 交替投影没收敛（急弯处夹在两球之间）：取两相邻球外接圆交点里离目标最近且不冲突的点
        const x0 = x, y0 = y; let best = null;
        for (let i = 0; i < nb.length; i++) for (let j = i + 1; j < nb.length; j++) { const A = nb[i], C = nb[j], dx = C.x - A.x, dy = C.y - A.y, dd = Math.hypot(dx, dy); if (dd < 1e-6 || dd > A.r + C.r) continue;
          const l = (A.r * A.r - C.r * C.r + dd * dd) / (2 * dd), h = Math.sqrt(Math.max(0, A.r * A.r - l * l)) * 1.001 + 0.01, mx = A.x + dx * l / dd, my = A.y + dy * l / dd;
          for (const sg of [-1, 1]) { const qx = mx - dy / dd * h * sg, qy = my + dx / dd * h * sg; if (nb.some(n => Math.hypot(qx - n.x, qy - n.y) < n.r * 0.999)) continue; const c = Math.hypot(qx - x0, qy - y0); if (!best || c < best.c) best = { x: qx, y: qy, c }; } }
        if (best) { x = best.x; y = best.y; } }
    }
    return { x, y, a: p.a };
  }
  // 渲染列表（链上球 + 飞行球 + 消除中缩小的球），所有可见元素用同一套位置；scale = 半径倍率
  renderList() {
    const D = this.D, L = this.T.len, out = [];
    for (const b of this.balls) { const p = this.pos(b); let sc = 1; const left = L - b.s; if (left < D * 0.9) sc = Math.max(0, Math.min(1, left / (D * 0.9))) * 0.6 + 0.4 * (left > 0); if (this.state === 'fail' && left < D) sc = Math.max(0, Math.min(1, left / D)); out.push({ id: b.id, c: b.c, x: p.x, y: p.y, scale: sc, s: b.s }); }
    for (const s of this.shots) out.push({ id: s.id, c: s.c, x: s.x, y: s.y, scale: 1, shot: true });
    for (const d of this.dying) { const u = d.t / this.S.popDur; out.push({ id: d.id, c: d.c, x: d.x, y: d.y, scale: this.S.dyingShrink ? Math.max(0.01, 1 - u) : 1, dying: u }); }
    return out;
  }
  muzzle() { const f = this.frog, r = this.S.mouthDist; return { x: f.x + Math.cos(f.ang) * r, y: f.y + Math.sin(f.ang) * r }; }
  aim(tx, ty) { this.frog.ang = Math.atan2(ty - this.frog.y, tx - this.frog.x); }
  canShoot() { return this.state === "play" && this.cool <= 0 && !this.pendingPromote; }
  shoot(tx, ty) {
    if (this.state !== 'play') return false;
    this.aim(tx, ty); if (this.cool > 0) return false;
    const m = this.muzzle(), a = this.frog.ang;
    this.shots.push({ id: ++this.id, c: this.cur, x: m.x, y: m.y, vx: Math.cos(a) * this.S.shotSpeed, vy: Math.sin(a) * this.S.shotSpeed, roll: 0 });
    this.pendingPromote = true;
    this.cool = this.S.fireCooldown; this.shotsFired++; this.events.push({ type: 'shoot', x: m.x, y: m.y });
    return true;
  }
  // 射线首个命中的链上球（与游戏内碰撞同一判定）
  rayHit(ox, oy, dx, dy, maxT = 3000) {
    const r = this.D * this.S.hitRadius; let best = null;
    for (let i = 0; i < this.balls.length; i++) { const b = this.balls[i]; if (b.s < this.T.visS) continue; const p = this.pos(b), px = p.x - ox, py = p.y - oy, t = px * dx + py * dy; if (t < 0) continue; const d2 = px * px + py * py - t * t; if (d2 > r * r) continue; const th = t - Math.sqrt(r * r - d2); if (th < maxT && (!best || th < best.t)) best = { i, t: th }; }
    return best;
  }
  sideOf(i, x, y) { const b = this.balls[i], p = this.T.at(b.s); return (x - p.x) * Math.cos(p.a) + (y - p.y) * Math.sin(p.a) > 0 ? 1 : 0; } // 1 = 插到前方
  insert(i, side, c, x, y, id = 0) {
    const B = this.balls, h = B[i], k = i + side, nb = this.mk(c, h.s + (side ? 0.5 : -0.5) * this.D);
    if (id) nb.id = id; nb.g = 0; nb.fly = 1; nb.fx = x; nb.fy = y; nb.ins = true; B.splice(k, 0, nb);
    this.events.push({ type: 'insert', x, y, c }); return nb;
  }
  runAt(i) { // 与 i 同色且相接的连续段
    const B = this.balls, c = B[i].c; let a = i, b = i;
    while (a > 0 && B[a - 1].c === c && this.touching(a) && B[a - 1].g >= 1) a--;
    while (b < B.length - 1 && B[b + 1].c === c && this.touching(b + 1) && B[b + 1].g >= 1) b++;
    return [a, b];
  }
  tryMatch(i, comboLevel) {
    const [a, b] = this.runAt(i); if (b - a + 1 < this.S.matchMin) return false;
    const gone = this.balls.splice(a, b - a + 1);
    const level = comboLevel; this.combo = level; this.maxCombo = Math.max(this.maxCombo, level); this.removed += gone.length; this.matches++;
    this.events.push({ type: 'match', combo: level, balls: gone.map(g => { const p = this.pos(g); return { x: p.x, y: p.y, c: g.c, id: g.id }; }) });
    for (const g of gone) { const p = this.pos(g); this.dying.push({ id: g.id, c: g.c, x: p.x, y: p.y, t: 0, s: g.s }); }
    if (a < this.balls.length) this.balls[a].hold = this.S.pullDelay ?? 0.15;
    if (a < this.balls.length && a > 0) this.balls[a].tag = level; // 缺口前段首球：记住连击层级（回拉相接后 +1）
    return true;
  }
  update(dt) {
    if (dt <= 0) return; this.time += dt; const S = this.S, B = this.balls, D = this.D;
    this.cool -= dt;
    if (this.state === 'fail') {
      this.failT += dt; const v = S.suckSpeed * D * (1 + this.failT * 3);
      for (const b of B) { b.s += v * dt; b.roll += v * dt / (D / 2); }
      for (let i = 1; i < B.length; i++) { const m = this.minNext(i); if (B[i].s < m) B[i].s = m; }
      this.stepDying(dt); this.pushDying();
      while (B.length && B[B.length - 1].s >= this.T.len) { const g = B.pop(); this.events.push({ type: 'sucked', c: g.c }); }
      this.stepShots(dt, false); return;
    }
    if (this.state === 'win') { this.stepShots(dt, false); this.stepDying(dt); return; }
    this.stepDying(dt);
    // 插入生长
    const done = [];
    for (const b of B) { if (b.g < 1) { b.g = Math.min(1, b.g + dt / S.insertDur); b.fly = Math.max(0, 1 - b.g); if (b.g >= 1) done.push(b); } }
    // 分段推进 / 回拉
    const segs = this.segments(), old = B.map(b => b.s);
    let speed = S.chainSpeed * D; const head = B.length ? B[B.length - 1].s / this.T.len : 0;
    if (S.dangerSlow > 0 && head > 0.85) speed *= 1 - S.dangerSlow * Math.min(1, (head - 0.85) / 0.15);
    if (this.time < S.introSec) speed = S.introSpeed * D;
    const pulling = new Set();
    segs.forEach(([a, b], j) => {
      let dv = 0;
      if (j === 0) dv = speed * dt;
      else { const prev = B[a - 1]; if (B[a].hold > 0) B[a].hold -= dt;
        else if (prev && prev.g >= 1 && B[a].g >= 1 && (prev.c === B[a].c || S.gapRule === 'always')) {
          // 回拉：参考视频里缺口无论两端是否同色都会合拢；速度 = 剩余缺口 × closeRate（指数缓出），夹在 [closeMin, closeMax] 球径/秒
          const gap = Math.max(0, B[a].s - this.minNext(a)); let v = S.closeRate > 0 ? gap * S.closeRate : S.pullSpeed * S.chainSpeed * D;
          v = Math.max(S.closeMin * D, Math.min(S.closeMax * D, v)); dv = -Math.min(gap, v * dt); pulling.add(a);
        } }
      if (dv) {
        // 消除中的球（正在缩小）仍占位：段的首/尾不能挤进它们
        if (dv > 0) for (const d of this.dying) if (d.s > B[b].s) { const lim = d.s - this.D / 2 * (1 + (S.dyingShrink ? 1 - d.t / S.popDur : 1)) * 1.01 - B[b].s; if (lim < dv) dv = Math.max(0, lim); }
        if (dv < 0) for (const d of this.dying) if (d.s < B[a].s) { const lim = d.s + this.D / 2 * (1 + (S.dyingShrink ? 1 - d.t / S.popDur : 1)) * 1.01 - B[a].s; if (lim > dv) dv = Math.min(0, lim); }
        for (let i = a; i <= b; i++) B[i].s += dv;
      }
    });
    const pullHeads = [...pulling].map(i => B[i]);
    for (let i = 1; i < B.length; i++) { const m = this.minNext(i); if (B[i].s < m) B[i].s = m; }
    const joins = pullHeads.filter(b => { const i = B.indexOf(b); return i > 0 && this.touching(i); });
    this.pushDying();
    for (let i = 0; i < B.length; i++) B[i].roll += (B[i].s - old[i]) / (D / 2);
    // 相接 → 连击判定
    for (const b of joins) { const i = B.indexOf(b); if (i < 0) continue; const lvl = (b.tag || 0) + 1; b.tag = 0; this.events.push({ type: 'join', c: b.c }); this.tryMatch(i, lvl); }
    for (const b of done) { const i = B.indexOf(b); b.ins = false; if (i >= 0) this.tryMatch(i, 1); }
    this.stepShots(dt, true);
    if (this.pendingPromote && !this.shots.length) { // 发射后：下一颗进嘴（smart：若预告色凑不出消除，按概率换成能消除的颜色）
      this.pendingPromote = false; let c = this.next;
      if (this.S.shotColorMode === 'smart' && this.balls.length) { const p = this.plan(c, true); if (!(p && p.score >= 100) && this.rnd() < this.S.smartProb) { const good = this.goodColors(); if (good.length) c = good[Math.floor(this.rnd() * good.length)]; } }
      this.cur = c; this.next = this.pickColor();
    }
    if (B.length && B[B.length - 1].s >= this.T.len - D * 0.5) { this.state = 'fail'; this.failT = 0; this.events.push({ type: 'fail' }); }
    else if (!B.length) { this.state = 'win'; this.events.push({ type: 'win' }); }
  }
  pushDying() { // 消除中的球被相邻链球推开（沿轨道），保证不与链球重叠
    const B = this.balls, D = this.D;
    for (const d of this.dying) { const sc = this.S.dyingShrink ? Math.max(0.01, 1 - d.t / this.S.popDur) : 1, need = D / 2 * (1 + sc) * 1.012; let moved = false;
      for (const b of B) { if (Math.abs(b.s - d.s) >= need * 1.6) continue; const pb = this.T.at(b.s); if (Math.hypot(pb.x - d.x, pb.y - d.y) >= need) continue; d.s = b.s <= d.s ? this.chordS(b.s, need) : this.chordSBack(b.s, need); const q = this.T.at(d.s); d.x = q.x; d.y = q.y; moved = true; }
      if (moved) { const p = this.T.at(d.s); d.x = p.x; d.y = p.y; } }
    // 消除中的球之间也不重叠：按弧长排序，挤开时沿轨道两侧对称分开
    const L = this.dying.slice().sort((p, q) => p.s - q.s), scl = d => this.S.dyingShrink ? Math.max(0.01, 1 - d.t / this.S.popDur) : 1;
    for (let it = 0; it < 3; it++) for (let i = 1; i < L.length; i++) { const a = L[i - 1], b = L[i], need = D / 2 * (scl(a) + scl(b)) * 1.012, dd = Math.hypot(b.x - a.x, b.y - a.y); if (dd < need) { b.s = this.chordS(a.s, need); const p = this.T.at(b.s); b.x = p.x; b.y = p.y; } }
    // 消除中的球被后方推到前方链球时：把前方链球往前顶（再做一次链约束），不重叠
    { let changed = false; for (const d of this.dying) { const sc = this.S.dyingShrink ? Math.max(0.01, 1 - d.t / this.S.popDur) : 1, need = D / 2 * (1 + sc) * 1.012;
        for (const b of B) { if (b.s <= d.s || b.s - d.s > need * 1.6) continue; const pb = this.T.at(b.s); if (Math.hypot(pb.x - d.x, pb.y - d.y) < need) { b.s = this.chordS(d.s, need); changed = true; } } }
      if (changed) for (let i = 1; i < B.length; i++) { const m = this.minNext(i); if (B[i].s < m) B[i].s = m; } }
  }
  stepDying(dt) { for (const d of this.dying) d.t += dt; this.dying = this.dying.filter(d => d.t < this.S.popDur); }
  stepShots(dt, collide) {
    const D = this.D, r = D * this.S.hitRadius;
    for (let k = this.shots.length - 1; k >= 0; k--) {
      const s = this.shots[k], dist = Math.hypot(s.vx, s.vy) * dt, n = Math.max(1, Math.ceil(dist / (D * 0.25)));
      let hit = false;
      for (let q = 0; q < n && !hit; q++) {
        s.x += s.vx * dt / n; s.y += s.vy * dt / n; s.roll += dist / n / (D / 2);
        if (!collide) continue;
        for (let i = 0; i < this.balls.length; i++) { const b = this.balls[i]; if (b.s < this.T.visS) continue; const p = this.pos(b); if ((p.x - s.x) ** 2 + (p.y - s.y) ** 2 < r * r) { this.insert(i, this.sideOf(i, s.x, s.y), s.c, s.x, s.y, s.id); hit = true; break; } }
      }
      if (hit || s.x < -D * 2 || s.x > 720 + D * 2 || s.y < -D * 2 || s.y > 1280 + D * 2) this.shots.splice(k, 1);
    }
  }
  // ---- 自动通关：评估每个可见球前/后插入的收益（含连击级联预测），返回最佳瞄准点 ----
  plan(color = null, noDiscard = false) {
    const B = this.balls, D = this.D, m = this.muzzle0(), c = color ?? this.cur; let best = null;
    const lead = (this.S.chainSpeed * D) * 0.12;
    for (let i = 0; i < B.length; i++) {
      const b = B[i]; if (b.s < this.T.visS + D * 0.3 || b.g < 1 || b.s > this.T.len - D * 0.6) continue;
      const p = this.T.at(b.s + lead), tx = Math.cos(p.a), ty = Math.sin(p.a);
      for (const side of [0, 1]) {
        const ax = p.x + tx * (side ? 0.32 : -0.32) * D, ay = p.y + ty * (side ? 0.32 : -0.32) * D;
        const dx = ax - m.x, dy = ay - m.y, L = Math.hypot(dx, dy); if (L < D) continue;
        const h = this.rayHit(m.x, m.y, dx / L, dy / L); if (!h) continue;
        const hx = m.x + dx / L * h.t, hy = m.y + dy / L * h.t, sd = this.sideOf(h.i, hx, hy);
        const sc0 = this.score(h.i + sd, c), sc = sc0 + B[h.i].s / this.T.len * (sc0 >= 100 ? 60 : 8) - (h.i !== i ? 3 : 0);
        if (!best || sc > best.score) best = { x: ax, y: ay, score: sc, i: h.i, side: sd, id: B[h.i].id, hit: { x: hx, y: hy } };
      }
    }
    // 无法消除时：若设置允许，把球打向没有球的方向（飞出屏幕，不加长球链）
    const th = this.S.autoDiscard;
    if (!noDiscard && (!best || best.score < th) && th > 0) {
      for (let k = 0; k < 72; k++) { const a = k * Math.PI / 36, dx = Math.cos(a), dy = Math.sin(a); if (!this.rayHit(m.x, m.y, dx, dy)) return { x: m.x + dx * 260, y: m.y + dy * 260, score: 0, discard: true }; }
    }
    return best;
  }
  muzzle0() { return { x: this.frog.x, y: this.frog.y }; }
  score(k, c) { // 在索引 k 插入颜色 c 的收益：模拟消除 + 回拉连击级联
    const B = this.balls; const segs = this.segments(); let seg = segs.find(([a, b]) => k >= a && k <= b + 1) || [k, k - 1];
    // 当前段颜色序列 + 后/前段（用于回拉级联）
    const arr = B.slice(seg[0], seg[1] + 1).map(b => b.c); const kk = k - seg[0]; arr.splice(kk, 0, c);
    let a = kk, b = kk; while (a > 0 && arr[a - 1] === c) a--; while (b < arr.length - 1 && arr[b + 1] === c) b++;
    const run = b - a + 1; if (run < this.S.matchMin) return run === 2 ? 12 : (a > 0 && b < arr.length - 1 && arr[a - 1] === arr[b + 1] ? 3 : 1);
    let removed = run, combo = 1; arr.splice(a, run); let at = a;
    // 前段为队尾段时，后段（更靠近入口）会推上来；前段回拉：用相邻段拼接近似
    const segIdx = segs.indexOf(seg); const behind = segIdx > 0 ? B.slice(segs[segIdx - 1][0], segs[segIdx - 1][1] + 1).map(x => x.c) : [];
    if (at === 0 && behind.length) { arr.unshift(...behind); at = behind.length; }
    while (at > 0 && at < arr.length && arr[at - 1] === arr[at]) {
      const cc = arr[at]; let l = at - 1, r = at; while (l > 0 && arr[l - 1] === cc) l--; while (r < arr.length - 1 && arr[r + 1] === cc) r++;
      if (r - l + 1 < this.S.matchMin) break; removed += r - l + 1; combo++; arr.splice(l, r - l + 1); at = l;
    }
    return 100 + removed * 10 + (combo - 1) * 250;
  }
}
