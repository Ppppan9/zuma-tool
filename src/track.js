// 轨道：顶部正中竖直进入 → 圆角并入大圆 12 点 → 顺时针约 335° → 末段轻微向内螺旋 → 金边黑洞。
// 预采样为 1px 等弧长表，at(s) O(1)。纯函数，可在 node 中测试。
export const DW = 720, DH = 1280;
export function buildTrack(S) {
  const cx = S.trackCX, cy = S.trackCY, R = S.trackR, D = S.ballSize;
  // 竖直入口（x = 圆心 x）→ 三次贝塞尔平滑并入大圆（12 点顺时针 trackJoinDeg 处）
  const raw = [], aj = S.trackJoinDeg * Math.PI / 180, cj = S.trackBend * D;
  const P3 = [cx + R * Math.sin(aj), cy - R * Math.cos(aj)], tg = [Math.cos(aj), Math.sin(aj)];
  const yJ = Math.min(P3[1] - cj * 0.5, cy - R - D * 0.15), x0 = cx, yTop = -S.trackEntryLen;
  for (let y = yTop; y < yJ; y += 2) raw.push([x0, y]);
  const P0 = [x0, yJ], P1 = [x0, yJ + cj], P2 = [P3[0] - tg[0] * cj, P3[1] - tg[1] * cj];
  for (let u = 0; u < 1; u += 0.01) { const v = 1 - u; raw.push([v * v * v * P0[0] + 3 * v * v * u * P1[0] + 3 * v * u * u * P2[0] + u * u * u * P3[0], v * v * v * P0[1] + 3 * v * v * u * P1[1] + 3 * v * u * u * P2[1] + u * u * u * P3[1]]); }
  const end = S.trackEndDeg * Math.PI / 180, sp0 = S.trackSpiralFrom * Math.PI / 180, inset = S.trackInset;
  const sm = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  for (let a = aj; a <= end + 1e-9; a += 0.004) { const r = R - inset * sm((a - sp0) / Math.max(1e-3, end - sp0)); raw.push([cx + r * Math.sin(a), cy - r * Math.cos(a)]); }
  // 弧长重采样（1px）
  const cum = [0]; for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
  const len = cum[cum.length - 1], n = Math.floor(len) + 1, X = new Float32Array(n), Y = new Float32Array(n);
  let j = 0; for (let i = 0; i < n; i++) { while (j < raw.length - 2 && cum[j + 1] < i) j++; const u = (i - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]); X[i] = raw[j][0] + (raw[j + 1][0] - raw[j][0]) * u; Y[i] = raw[j][1] + (raw[j + 1][1] - raw[j][1]) * u; }
  const A = new Float32Array(n); for (let i = 0; i < n; i++) { const a = Math.max(0, i - 2), b = Math.min(n - 1, i + 2); A[i] = Math.atan2(Y[b] - Y[a], X[b] - X[a]); }
  function at(s) {
    if (s <= 0) return { x: X[0], y: Y[0] + s, a: Math.PI / 2 };
    if (s >= n - 1) { const a = A[n - 1]; return { x: X[n - 1], y: Y[n - 1], a }; }
    const i = Math.floor(s), u = s - i; return { x: X[i] + (X[i + 1] - X[i]) * u, y: Y[i] + (Y[i + 1] - Y[i]) * u, a: A[i] };
  }
  // 屏幕顶端（y=-D）对应的弧长：此前的球在屏幕外
  const visS = Math.max(0, -D - yTop);
  return { at, len: n - 1, X, Y, A, n, cx, cy, R, hole: { x: X[n - 1], y: Y[n - 1] }, visS, entryX: x0 };
}
