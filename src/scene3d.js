// three.js 俯视正交场景：背景贴图平面 + 投影接收层 + 光泽雕刻石球 + 石青蛙模型。坐标：x = 设计 x，y = -设计 y，z 朝向相机（高度）。
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ballTextures, colorHex, mk, mix, BALL_STYLES } from './paint.js';
import { mulberry } from './logic.js';

export function hasWebGL() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }

function stoneTexture(hex, seed) {
  const W = 256, c = mk(W, W), g = c.getContext('2d'), r = mulberry(seed);
  g.fillStyle = hex; g.fillRect(0, 0, W, W);
  for (let i = 0; i < 900; i++) { const v = r(); g.fillStyle = v < 0.5 ? `rgba(30,28,24,${0.05 + r() * 0.12})` : `rgba(240,235,220,${0.04 + r() * 0.1})`; g.beginPath(); g.arc(r() * W, r() * W, 1 + r() * 5, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(25,22,18,0.35)'; g.lineWidth = 1.2; for (let i = 0; i < 14; i++) { g.beginPath(); let x = r() * W, y = r() * W; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 30; y += (r() - 0.5) * 30; g.lineTo(x, y); } g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
const ell = (rx, ry, rz, mat, seg = 32) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7)), mat); m.scale.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; return m; };

// 石青蛙（参考近景：暖灰砂岩、背部龟甲状雕纹、头顶大宝石、白色大眼黑瞳、四肢张开长趾）：+x = 嘴朝向；单位 = 设计 px
function frogBackTexture(hex) {
  const W = 256, c = mk(W, W), g = c.getContext('2d'), r = mulberry(11);
  g.fillStyle = hex; g.fillRect(0, 0, W, W);
  for (let i = 0; i < 1400; i++) { g.fillStyle = r() < 0.55 ? `rgba(40,32,22,${0.04 + r() * 0.1})` : `rgba(255,245,225,${0.04 + r() * 0.08})`; g.beginPath(); g.arc(r() * W, r() * W, 0.8 + r() * 3.5, 0, 7); g.fill(); }
  // 龟甲 / 雕刻纹（等距柱状贴图上半部分 = 背部）
  g.strokeStyle = 'rgba(45,36,24,0.75)'; g.lineWidth = 3;
  for (let row = 0; row < 3; row++) for (let col = 0; col < 8; col++) { const cx = col * 32 + (row % 2) * 16, cy = 22 + row * 30, R = 15; g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + Math.PI / 6; g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.9); } g.closePath(); g.stroke(); }
  g.strokeStyle = 'rgba(255,240,215,0.25)'; g.lineWidth = 1.2; for (let row = 0; row < 3; row++) for (let col = 0; col < 8; col++) { const cx = col * 32 + (row % 2) * 16 + 1.5, cy = 23.5 + row * 30, R = 13; g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + Math.PI / 6; g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.9); } g.closePath(); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function makeFrog(S, D) {
  const G = new THREE.Group(); G.name = 'frog';
  const stoneTex = stoneTexture(S.frogStone, 7), backTex = frogBackTexture(S.frogStone);
  const stone = new THREE.MeshStandardMaterial({ color: 0xffffff, map: stoneTex, roughness: 0.78, metalness: 0.02, bumpMap: stoneTex, bumpScale: 1.2, name: 'pbr_frog_stone' });
  const back = new THREE.MeshStandardMaterial({ color: 0xffffff, map: backTex, roughness: 0.8, bumpMap: backTex, bumpScale: 2.5, name: 'pbr_frog_back' });
  const stoneDark = new THREE.MeshStandardMaterial({ color: new THREE.Color(mix(S.frogStone, '#1a140c', 0.35)), map: stoneTex, roughness: 0.85, name: 'pbr_frog_stone_dark' });
  const gold = new THREE.MeshStandardMaterial({ color: new THREE.Color(S.frogGold), roughness: 0.3, metalness: 0.9, name: 'pbr_frog_gold' });
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf2efe8, roughness: 0.2, clearcoat: 1, name: 'pbr_frog_eye' });
  const black = new THREE.MeshPhysicalMaterial({ color: 0x0b0b0c, roughness: 0.1, clearcoat: 1, name: 'pbr_frog_pupil' });
  const k = D / 80;
  const add = (m, x, y, z, rz = 0, par = G) => { m.position.set(x * k, y * k, z * k); m.rotation.z = rz; par.add(m); return m; };
  const E = (rx, ry, rz, mat) => ell(rx * k, ry * k, rz * k, mat);
  for (const s of [-1, 1]) {
    // 后腿：大腿 + 小腿 + 4 长趾（向后外张）
    add(E(28, 15, 14, stone), -32, s * 44, 15, s * 0.75);
    add(E(18, 9, 8, stone), -38, s * 62, 9, s * -0.5);
    for (let t = 0; t < 4; t++) { const a = s * (2.0 + t * 0.35), L = 9; add(E(L, 4.4, 4, stone), -46 + Math.cos(a) * L, s * 66 + Math.sin(a) * L, 6, a); add(E(4.6, 4.6, 3.8, stoneDark), -46 + Math.cos(a) * L * 2, s * 66 + Math.sin(a) * L * 2, 5); }
    // 前腿：上臂 + 4 长趾（向前外张）
    add(E(20, 10, 10, stone), 22, s * 48, 14, s * -0.9);
    for (let t = 0; t < 4; t++) { const a = s * (-0.3 - t * 0.4), L = 9; const bx = 32, by = s * 60; add(E(L, 3.8, 3.8, stone), bx + Math.cos(a) * L, by + Math.sin(a) * L, 7, a); add(E(4.6, 4.6, 3.6, stoneDark), bx + Math.cos(a) * L * 2, by + Math.sin(a) * L * 2, 6); }
  }
  add(E(58, 54, 26, back), -12, 0, 24);                     // 身体（背甲雕纹）
  add(E(42, 50, 24, stone), 26, 0, 28);                     // 头
  add(E(14, 36, 12, stoneDark), S.mouthDist / (k * S.frogScale) - 14, 0, 20);   // 嘴（含球处阴影）
  const eyes = new THREE.Group(); eyes.name = 'eyes'; G.add(eyes);
  for (const s of [-1, 1]) {
    if (S.eyeStyle === 'gem') {
      add(new THREE.Mesh(new THREE.TorusGeometry(12 * k, 3.5 * k, 12, 32), gold), 36, s * 32, 46, 0, eyes);
      add(new THREE.Mesh(new THREE.SphereGeometry(11 * k, 24, 16), new THREE.MeshPhysicalMaterial({ color: new THREE.Color(S.eyeGlow), emissive: new THREE.Color(S.eyeGlow), emissiveIntensity: 0.9, roughness: 0.1, clearcoat: 1, name: 'pbr_frog_gem_eye' })), 36, s * 32, 48, 0, eyes);
    } else {
      add(E(20, 19, 17, stone), 36, s * 36, 40, 0, eyes);     // 眼眶
      add(E(18, 17, 16, white), 40, s * 36, 47, 0, eyes);     // 白色大眼
      add(E(8.5, 8.5, 6, black), 52, s * 34, 55, 0, eyes);    // 黑瞳（看向前方）
    }
  }
  // 头顶大宝石（金托 + 宝石：显示下一颗球颜色 / 固定色）
  add(new THREE.Mesh(new THREE.TorusGeometry(19 * k, 5 * k, 14, 40), gold), -4, 0, 50);
  add(new THREE.Mesh(new THREE.CylinderGeometry(20 * k, 22 * k, 6 * k, 40), gold), -4, 0, 46).rotation.x = Math.PI / 2;
  const gemMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(S.gemColor), roughness: 0.08, clearcoat: 1, emissive: new THREE.Color(S.gemColor), emissiveIntensity: 0.35, name: 'pbr_frog_gem' });
  const gem = add(new THREE.Mesh(new THREE.SphereGeometry(17 * k, 32, 24), gemMat), -4, 0, 52); gem.scale.z = 0.75; gem.name = 'frog_gem';
  G.userData.gem = gemMat;
  G.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  G.scale.setScalar(S.frogScale);
  return G;
}

export function create3D(W, H, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true, canvas: opts.canvas });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.toneMapping = THREE.NoToneMapping;
  const pmrem = new THREE.PMREMGenerator(renderer), envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const R = { renderer, W, H, mats: new Map(), pool: new Map(), quats: new Map(), lastS: new Map(), geo: null };
  R.setup = (S, T, bgCanvas, view) => {
    const scene = new THREE.Scene(); R.scene = scene; R.S = S; R.view = view; R.D = S.ballSize;
    scene.environment = envTex;
    const cam = new THREE.OrthographicCamera(view.x0, view.x0 + view.w, -view.y0, -(view.y0 + view.h), 1, 4000); cam.position.set(0, 0, 2000); R.camera = cam;
    const bgTex = new THREE.CanvasTexture(bgCanvas); bgTex.colorSpace = THREE.SRGBColorSpace; bgTex.anisotropy = 4; R.bgTex = bgTex;
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(view.w, view.h), new THREE.MeshBasicMaterial({ map: bgTex, name: 'mat_background' })); bg.position.set(view.x0 + view.w / 2, -(view.y0 + view.h / 2), 0); bg.name = 'background'; scene.add(bg);
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(view.w, view.h), new THREE.ShadowMaterial({ opacity: S.shadowOp, name: 'mat_shadow' })); sc.position.copy(bg.position); sc.position.z = 0.5; sc.receiveShadow = true; sc.name = 'shadow_catcher'; scene.add(sc);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x4a4e48, S.lightAmb));
    const sun = new THREE.DirectionalLight(0xfff4e0, S.lightSun), az = S.lightAzim * Math.PI / 180, el = S.lightElev * Math.PI / 180;
    sun.position.set(360 + Math.cos(az) * Math.cos(el) * 1500, -640 + Math.sin(az) * Math.cos(el) * 1500, Math.sin(el) * 1500); sun.target.position.set(360, -640, 0);
    sun.castShadow = true; const sh = sun.shadow; sh.mapSize.set(2048, 2048); const ext = Math.max(view.w, view.h) * 0.8; Object.assign(sh.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 10, far: 4000 }); sh.camera.updateProjectionMatrix(); sh.radius = S.shadowSoft; sh.blurSamples = 16; sh.bias = -0.0005;
    scene.add(sun, sun.target); R.sun = sun;
    R.geo = new THREE.SphereGeometry(R.D / 2, 48, 32);
    R.mats.clear(); for (const m of R.pool.values()) m.removeFromParent(); R.pool.clear();
    const frog = makeFrog(S, R.D); frog.position.set(T.cx + S.frogOffX, -(T.cy + S.frogOffY), 0); scene.add(frog); R.frog = frog;
  };
  R.mat = (S, c) => {
    if (!R.mats.has(c)) { const hex = colorHex(S, c), t = ballTextures(hex, 101 + c * 17, S, BALL_STYLES[c]); const map = new THREE.CanvasTexture(t.map), bump = new THREE.CanvasTexture(t.bump); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
      R.mats.set(c, new THREE.MeshPhysicalMaterial({ map, bumpMap: bump, bumpScale: S.runeBump, roughness: S.ballRough, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.35, envMapIntensity: S.ballEnv, name: 'pbr_ball_' + c })); }
    return R.mats.get(c);
  };
  // balls: [{id, c, x, y, s?, a?, scale}]；frog: {ang, gem}
  R.render = (balls, frog, S) => {
    const used = new Set();
    for (const b of balls) {
      let m = R.pool.get(b.id); if (!m) { m = new THREE.Mesh(R.geo, R.mat(S, b.c)); m.castShadow = true; m.receiveShadow = false; const r = mulberry(b.id * 7919); m.quaternion.setFromEuler(new THREE.Euler(r() * 6.3, r() * 6.3, r() * 6.3)); R.pool.set(b.id, m); R.scene.add(m); }
      if (m.material !== R.mat(S, b.c)) m.material = R.mat(S, b.c);
      const px = b.x, py = -b.y, last = R.lastS.get(b.id);
      if (S.ballRoll && last) { const dx = px - last[0], dy = py - last[1], d = Math.hypot(dx, dy); if (d > 1e-3 && d < R.D * 2) { const ax = new THREE.Vector3(-dy / d, dx / d, 0), q = new THREE.Quaternion().setFromAxisAngle(ax, d / (R.D / 2)); m.quaternion.premultiply(q); } }
      R.lastS.set(b.id, [px, py]);
      m.position.set(px, py, (b.z ?? R.D / 2) * (b.scale ?? 1)); m.scale.setScalar(Math.max(1e-3, b.scale ?? 1)); m.visible = true; used.add(b.id);
    }
    for (const [id, m] of R.pool) if (!used.has(id)) { m.visible = false; if (R.pool.size > 220) { m.removeFromParent(); R.pool.delete(id); R.lastS.delete(id); } }
    if (frog) { R.frog.rotation.z = -frog.ang; if (frog.gem != null) R.frog.userData.gem.color.set(frog.gem), R.frog.userData.gem.emissive.set(frog.gem); }
    renderer.render(R.scene, R.camera);
    return renderer.domElement;
  };
  R.setBg = c => { R.bgTex.image = c; R.bgTex.needsUpdate = true; };
  R.resize = (w, h) => { R.W = w; R.H = h; renderer.setSize(w, h, false); };
  return R;
}
