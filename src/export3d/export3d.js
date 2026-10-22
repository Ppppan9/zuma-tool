// 导出 3D 动画（glTF 2.0 .glb + scene3d.json + Blender 脚本 + 音频）：页面同一套 three.js 模型（石青蛙 makeFrog、符文石球材质、背景贴图），
// 由 AE 记录的同一份时间轴按 3D 帧率逐帧烘焙关键帧。2D 叠加层（特效 / FAIL / 文字 / 手指）不进 GLB（见 README_3D.md）。
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { makeZip } from '../ae/zip.js';
import { makeFrog } from '../scene3d.js';
import { colorHex, ballTextures, BALL_STYLES } from '../paint.js';
import PY_TEXT from './blender_import.py';
import README_TEXT from './README_3D.md';
export const PX = 0.01;
const r5 = x => Math.round(x * 1e5) / 1e5;
export async function export3D({ S, ae, rec, env }) {
  const { T, view, bgCanvas, theme } = env, fps = +S.export3dFps || 30, D = ae.timeline.meta.duration, NF = Math.max(1, Math.round(D * fps)), BD = S.ballSize;
  const times = []; for (let f = 0; f <= NF; f++) times.push(r5(f / fps));
  const tracks = [], nodes = [], stats = { balls: 0, frog: 0, tracks: 0 };
  const root = new THREE.Group(); root.name = 'zuma_root'; root.scale.setScalar(PX); root.rotation.x = -Math.PI / 2; // 页面 z 向上 → glTF Y 向上
  // 背景
  const bt = new THREE.CanvasTexture(bgCanvas[theme] || bgCanvas.ruins); bt.colorSpace = THREE.SRGBColorSpace;
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(view.w, view.h), new THREE.MeshBasicMaterial({ map: bt, name: 'mat_background' })); bg.name = 'background'; bg.position.set(view.x0 + view.w / 2, -(view.y0 + view.h / 2), 0); root.add(bg);
  // 采样工具：段 s = [[t,x,y,sc,rot,op,f]...]
  const at = (s, t) => { if (t < s[0][0] - 1e-6 || t > s[s.length - 1][0] + 0.5 / fps) return null; let j = 0; while (j < s.length - 2 && s[j + 1][0] <= t) j++; const a = s[j], b = s[j + 1] || a, u = b[0] > a[0] ? Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0]))) : 0; return a.map((x, i) => x + (b[i] - x) * u); };
  const add = (name, prop, V, n, interp = THREE.InterpolateLinear) => { const C = prop === 'quaternion' ? THREE.QuaternionKeyframeTrack : THREE.VectorKeyframeTrack; tracks.push(new C(name + '.' + prop, times, V, interp)); };
  // 青蛙
  const fsegs = ae.segs.filter(g => g.id === 'frog');
  if (fsegs.length) { const fr = makeFrog(S, BD); fr.name = 'frog'; const s0 = fsegs[0].s[0]; fr.position.set(s0[1], -s0[2], 0); fr.userData.gem.color.set(colorHex(S, 0)); root.add(fr); stats.frog = 1;
    const q = [], qq = new THREE.Quaternion(), Z = new THREE.Vector3(0, 0, 1); let last = s0[4];
    for (const t of times) { for (const g of fsegs) { const e = at(g.s, t); if (e) { last = e[4]; break; } } qq.setFromAxisAngle(Z, -last); q.push(qq.x, qq.y, qq.z, qq.w); }
    add('frog', 'quaternion', q, 4); nodes.push({ name: 'frog', kind: 'frog', in: 0, out: D }); }
  // 球：同一 id 的所有段（链上球 / 口中球 / 飞行球）合并成一个节点
  const byId = new Map(); for (const g of ae.segs) { const m = g.id.match(/^(ball|mouth)_(\d+)$/); if (!m) continue; const id = m[2]; if (!byId.has(id)) byId.set(id, []); byId.get(id).push(g); }
  const geo = new THREE.SphereGeometry(BD / 2, 32, 20), mats = new Map();
  const matOf = c => { if (!mats.has(c)) { const t = ballTextures(colorHex(S, c), 101 + c * 17, S, BALL_STYLES[c]), map = new THREE.CanvasTexture(t.map); map.colorSpace = THREE.SRGBColorSpace; mats.set(c, new THREE.MeshStandardMaterial({ map, roughness: S.ballRough, metalness: 0, name: 'pbr_ball_' + c })); } return mats.get(c); };
  for (const [id, gs] of byId) {
    const c = +gs[0].asset.slice(-1), name = 'ball_' + id, m = new THREE.Mesh(geo, matOf(c)); m.name = name; root.add(m); stats.balls++;
    const P = [], Q = [], SC = [], q = new THREE.Quaternion(), dq = new THREE.Quaternion(), ax = new THREE.Vector3(); let prev = null, first = -1, lastOn = -1, lastE = null;
    times.forEach((t, f) => { let e = null; for (const g of gs) { e = at(g.s, t); if (e) break; }
      if (e) { if (first < 0) first = f; lastOn = f; lastE = e; } const v = e || lastE || gs[0].s[0], x = v[1], y = -v[2], sc = e ? Math.max(1e-3, v[3]) : 0;
      if (prev && e) { const dx = x - prev[0], dy = y - prev[1], d = Math.hypot(dx, dy); if (d > 1e-3 && d < BD * 2) { ax.set(-dy / d, dx / d, 0); dq.setFromAxisAngle(ax, d / (BD / 2)); q.premultiply(dq); } }
      prev = [x, y]; P.push(x, y, BD / 2 * Math.max(sc, 1e-3)); Q.push(q.x, q.y, q.z, q.w); SC.push(sc, sc, sc); });
    add(name, 'position', P, 3); add(name, 'quaternion', Q, 4); add(name, 'scale', SC, 3, THREE.InterpolateDiscrete);
    m.position.fromArray(P, 0); m.scale.fromArray(SC, 0);
    nodes.push({ name, kind: 'ball', color: c, in: r5(Math.max(0, first) / fps), out: r5((lastOn + 1) / fps) });
  }
  // 灯光 + 正交相机（与页面同取景）
  root.add(new THREE.HemisphereLight(0xffffff, 0x4a4e48, S.lightAmb));
  const sun = new THREE.DirectionalLight(0xfff4e0, S.lightSun), az = S.lightAzim * Math.PI / 180, el = S.lightElev * Math.PI / 180; sun.name = 'sun_light';
  sun.position.set(360 + Math.cos(az) * Math.cos(el) * 1500, -640 + Math.sin(az) * Math.cos(el) * 1500, Math.sin(el) * 1500); sun.target.position.set(360, -640, 0); root.add(sun, sun.target);
  const cam = new THREE.OrthographicCamera(-view.w / 2, view.w / 2, view.h / 2, -view.h / 2, 1, 4000); cam.name = 'camera_ortho'; cam.position.set(view.x0 + view.w / 2, -(view.y0 + view.h / 2), 2000); root.add(cam);
  const scn = new THREE.Scene(); scn.name = 'zuma_scene'; scn.add(root);
  const clip = new THREE.AnimationClip('zuma', D, tracks); stats.tracks = tracks.length;
  const glb = await new GLTFExporter().parseAsync(scn, { binary: true, animations: [clip], onlyVisible: false, trs: true });
  const tl = ae.timeline, byA = new Map(tl.assets.map(a => [a.id, a])), sfxC = tl.comps.find(c => c.id === 'sfx'), audio = [];
  if (sfxC) for (const l of sfxC.layers) { const a = byA.get(l.src.asset); if (a) audio.push({ file: a.file, t: l.start || 0, name: l.name }); }
  const scene3d = { tool: 'zuma-tool', version: '1.0.0', format: 'export3d/1', fps, frames: NF + 1, frameStart: 0, frameEnd: NF, duration: D, width: Math.round(view.w), height: Math.round(view.h),
    units: { px: PX, note: 'zuma_root 缩放 0.01（1 设计像素 = 1cm），绕 X 轴 -90°（页面 z 向上 → Y 向上）' }, camera: { name: cam.name, type: 'orthographic', orthoScale: r5(Math.max(view.w, view.h) * PX), widthM: r5(view.w * PX), heightM: r5(view.h * PX) },
    lights: { sun: { intensity: S.lightSun, elev: S.lightElev, azim: S.lightAzim }, ambient: { intensity: S.lightAmb } }, visibility: 'ball_* 不在场时 scale=0（STEP）', nodes, audio, stats };
  const enc = new TextEncoder(), fm = new Map(ae.fileList.map(f => [f.name, f.data]));
  const out = [{ name: 'scene.glb', data: new Uint8Array(glb) }, { name: 'scene3d.json', data: enc.encode(JSON.stringify(scene3d)) }, { name: 'timeline.json', data: fm.get('timeline.json') }, { name: 'blender_import.py', data: enc.encode(PY_TEXT) }, { name: 'README_3D.md', data: enc.encode(README_TEXT) }, ...ae.fileList.filter(f => f.name.startsWith('audio/'))];
  const d = new Date(), p2 = x => String(x).padStart(2, '0'), stamp = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}_${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`;
  return { blob: makeZip(out), name: `zuma-tool_3d_export_${stamp}.zip`, stats, duration: D, fps, glbSize: glb.byteLength, files: out.map(f => f.name) };
}
