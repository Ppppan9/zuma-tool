// AE / 3D 导出用的精灵素材：球与石青蛙用页面同一套 three.js 模型/材质离屏渲染（含右下软阴影，透明 PNG），
// 背景 = 页面背景画布，其余（特效、免责声明、FAIL 徽章、胜利文字、手指、结束页）用页面同一套 2D 绘制函数。
// 返回 { key: { c: canvas, w, h, ax, ay } }，w/h/ax/ay 为设计像素（720×1280 坐标系）。
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { makeFrog, hasWebGL } from '../scene3d.js';
import { mk, colorHex, ballTextures, BALL_STYLES, ballSprite2D, failBadge, hexRGB } from '../paint.js';
import { DW } from '../track.js';
const KS = 2; // 素材超采样（每设计像素 2 像素）
export function buildSprites({ S, T, view, K, bgCanvas, handImg, colorOf, endDraw }) {
  const out = {}, D = S.ballSize, nC = Math.max(4, S.colorCount || 4);
  // ---- 3D：球 + 青蛙（含阴影） ----
  let ok3 = hasWebGL();
  if (ok3) try {
    const box = Math.ceil(D * 3.2 * S.frogScale + 40), W = Math.round(box * KS);
    const rd = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); rd.setSize(W, W, false); rd.outputColorSpace = THREE.SRGBColorSpace; rd.setClearColor(0, 0); rd.shadowMap.enabled = true; rd.shadowMap.type = THREE.VSMShadowMap;
    const pm = new THREE.PMREMGenerator(rd), env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    const snap = (key, obj, half) => {
      const sc = new THREE.Scene(); sc.environment = env; sc.add(new THREE.HemisphereLight(0xffffff, 0x4a4e48, S.lightAmb));
      const sun = new THREE.DirectionalLight(0xfff4e0, S.lightSun), az = S.lightAzim * Math.PI / 180, el = S.lightElev * Math.PI / 180;
      sun.position.set(Math.cos(az) * Math.cos(el) * 1500, Math.sin(az) * Math.cos(el) * 1500, Math.sin(el) * 1500); sun.castShadow = true; Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 10, far: 4000 }); sun.shadow.camera.updateProjectionMatrix(); sun.shadow.mapSize.set(1024, 1024); sun.shadow.radius = S.shadowSoft; sun.shadow.blurSamples = 16; sun.shadow.bias = -0.0005; sc.add(sun);
      const catcher = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, half * 2), new THREE.ShadowMaterial({ opacity: S.shadowOp })); catcher.position.z = 0.5; catcher.receiveShadow = true; sc.add(catcher);
      obj.traverse(o => { if (o.isMesh) o.castShadow = true; }); sc.add(obj);
      const cam = new THREE.OrthographicCamera(-half, half, half, -half, 1, 4000); cam.position.set(0, 0, 2000);
      const n = Math.round(half * 2 * KS); rd.setSize(n, n, false); rd.render(sc, cam);
      const c = mk(n, n); c.getContext('2d').drawImage(rd.domElement, 0, 0); out[key] = { c, w: half * 2, h: half * 2, ax: half, ay: half };
    };
    for (let c = 0; c < nC; c++) {
      const hex = colorHex(S, c), t = ballTextures(hex, 101 + c * 17, S, BALL_STYLES[c]), map = new THREE.CanvasTexture(t.map); map.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(new THREE.SphereGeometry(D / 2, 48, 32), new THREE.MeshPhysicalMaterial({ map, bumpMap: new THREE.CanvasTexture(t.bump), bumpScale: S.runeBump, roughness: S.ballRough, clearcoat: 0.3, clearcoatRoughness: 0.35, envMapIntensity: S.ballEnv }));
      m.position.z = D / 2; m.rotation.set(0.3, 0.5 + c, 0.2); snap('ball_' + c, m, D * 0.85);
    }
    const fr = makeFrog(S, D); fr.userData.gem.color.set(colorOf(0)); snap('frog', fr, box / 2);
    rd.dispose(); rd.forceContextLoss && rd.forceContextLoss();
  } catch (e) { console.warn('3D sprites failed, 2D fallback', e); ok3 = false; }
  if (!ok3) { for (let c = 0; c < nC; c++) { const s = Math.round(D * KS), c2 = ballSprite2D(colorOf(c), s, 101 + c * 17, S); out['ball_' + c] = { c: c2, w: D, h: D, ax: D / 2, ay: D / 2 }; }
    const r = D * S.frogScale, c = mk(r * 2.2 * KS, r * 2.2 * KS), g = c.getContext('2d'); g.scale(KS, KS); g.translate(r * 1.1, r * 1.1); g.fillStyle = S.frogStone; g.beginPath(); g.ellipse(0, 0, r * 0.9, r * 0.75, 0, 0, 7); g.fill(); out.frog = { c, w: r * 2.2, h: r * 2.2, ax: r * 1.1, ay: r * 1.1 }; }
  // ---- 背景（两套主题，页面同一画布，覆盖整个可视区域） ----
  for (const th of ['ruins', 'grey']) if (bgCanvas[th]) out['background_' + th] = { c: bgCanvas[th], w: view.w, h: view.h, ax: 0, ay: 0 };
  // ---- 特效（单位尺寸素材：w=h=1，图层缩放 = 页面绘制尺寸） ----
  const blob = (key, fn, n = 128) => { const c = mk(n, n), g = c.getContext('2d'); fn(g, n); out[key] = { c, w: 1, h: 1, ax: 0.5, ay: 0.5 }; };
  blob('fx_flash', (g, n) => { const gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,250,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, n, n); });
  for (let c = 0; c < nC; c++) { const [r, gg, b] = hexRGB(colorHex(S, c));
    blob('fx_glow_' + c, (g, n) => { const gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); gr.addColorStop(0, `rgba(${r},${gg},${b},0.9)`); gr.addColorStop(0.5, `rgba(${r},${gg},${b},0.4)`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`); g.fillStyle = gr; g.fillRect(0, 0, n, n); });
    blob('fx_splat_' + c, (g, n) => { g.fillStyle = `rgb(${r},${gg},${b})`; g.beginPath(); for (let i = 0; i <= 14; i++) { const a = i / 14 * 6.283, rr = n * (0.3 + 0.12 * Math.sin(i * 2.7 + c)); g.lineTo(n / 2 + Math.cos(a) * rr, n / 2 + Math.sin(a) * rr); } g.fill(); });
    blob('fx_shard_' + c, (g, n) => { g.fillStyle = `rgb(${r * 0.45 | 0},${gg * 0.45 | 0},${b * 0.45 | 0})`; g.beginPath(); g.moveTo(n * 0.5, n * 0.15); g.lineTo(n * 0.85, n * 0.55); g.lineTo(n * 0.4, n * 0.85); g.lineTo(n * 0.2, n * 0.45); g.fill(); }, 64);
    blob('fx_dust_' + c, (g, n) => { const gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); gr.addColorStop(0, `rgba(${(r + 200) / 2 | 0},${(gg + 190) / 2 | 0},${(b + 170) / 2 | 0},0.8)`); gr.addColorStop(1, 'rgba(200,190,170,0)'); g.fillStyle = gr; g.fillRect(0, 0, n, n); }, 64); }
  // ---- 文字 / 徽章 / 手 / 结束页 ----
  { const fs = S.discSize, w = DW, h = fs * 1.6, c = mk(w * KS, h * KS), g = c.getContext('2d'); g.scale(KS, KS); g.globalAlpha = S.textOpacity; g.fillStyle = '#fff'; g.font = `${fs}px "PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 3; g.fillText(S.discText || '', w / 2, h - 2); out.disclaimer = { c, w, h, ax: w / 2, ay: h - 2 }; }
  { const size = S.failSize * DW * 1.15, c = failBadge(S, Math.round(size * KS)); out.fail_badge = { c, w: size, h: size, ax: size / 2, ay: size / 2 }; }
  { const w = 640, h = 160, c = mk(w * KS, h * KS), g = c.getContext('2d'); g.scale(KS, KS); g.translate(w / 2, h / 2); g.font = '900 96px "Arial Black","PingFang SC","Noto Sans CJK SC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 12; g.strokeStyle = 'rgba(60,30,0,0.8)'; g.strokeText(S.winText || '', 0, 0); g.fillStyle = '#ffd54a'; g.fillText(S.winText || '', 0, 0); out.win_text = { c, w, h, ax: w / 2, ay: h / 2 }; }
  if (handImg) { const s = S.handSize * DW / handImg.width, w = handImg.width * s, h = handImg.height * s, c = mk(handImg.width, handImg.height), g = c.getContext('2d'); if (S.handFlip) { g.translate(c.width, 0); g.scale(-1, 1); } g.drawImage(handImg, 0, 0); out.hand = { c, w, h, ax: (S.handFlip ? 1 - S.handAnchorX : S.handAnchorX) * w, ay: S.handAnchorY * h }; }
  { const c = mk(view.w, view.h), g = c.getContext('2d'); g.translate(-view.x0, -view.y0); endDraw(g); out.end_card = { c, w: view.w, h: view.h, ax: 0, ay: 0 }; }
  return out;
}
