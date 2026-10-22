// WebAudio 程序化音效（无版权素材）：石球滚动循环、发射闷响、插入咔哒、消除碎裂（连击音调升高）、吸入黑洞、失败、胜利。所有输出接 master，可送往录制流。
export const SFX_NAMES = { shoot: ['sfxShoot', '发射'], insert: ['sfxInsert', '插入'], match: ['sfxMatch', '消除'], suck: ['sfxSuck', '吸入'], fail: ['sfxFail', '失败'], win: ['sfxWin', '胜利'] };
export const SFX_DUR = { shoot: 0.18, insert: 0.1, match: 0.5, suck: 1.2, fail: 1.3, win: 1.2 };
export class Sfx {
  constructor() { this.ctx = null; this.rollG = null; }
  ensure() {
    if (this.ctx) return this.ctx;
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    try { this.ctx = new C(); } catch (e) { return null; }
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
    try { this.recDest = this.ctx.createMediaStreamDestination(); this.master.connect(this.recDest); } catch (e) { }
    this.makeNoise(); return this.ctx;
  }
  makeNoise() { const len = Math.round(this.ctx.sampleRate * 2), b = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = b.getChannelData(0); let s = 7, last = 0; for (let i = 0; i < len; i++) { s = (s * 16807) % 2147483647; const w = s / 1073741823.5 - 1; d[i] = w; } this.noise = b;
    const bb = this.ctx.createBuffer(1, len, this.ctx.sampleRate), e = bb.getChannelData(0); for (let i = 0; i < len; i++) { last = (last + 0.02 * d[i]) / 1.02; e[i] = last * 3.5; } this.brown = bb; }
  now() { return this._t != null ? this._t : this.ctx.currentTime; }
  resume() { const c = this.ensure(); if (c && c.state === 'suspended') c.resume(); }
  play(name, S, o = {}) {
    const [k] = SFX_NAMES[name] || []; if (!k || S.sfxMute || !S[k]) return;
    if (this.hook && this._t == null) try { this.hook(name, o); } catch (e) { }
    if (!this.ensure()) return;
    const v = S.sfxVolume * (S[k + 'Vol'] ?? 1); if (v <= 0) return;
    this['_' + name](this.now(), v, o);
  }
  // 滚动循环：每帧按球链速度设置音量
  roll(S, level) {
    if (!this.ctx || this._t != null) return;
    if (!this.rollG) { const src = this.ctx.createBufferSource(); src.buffer = this.brown; src.loop = true; const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380; const g = this.ctx.createGain(); g.gain.value = 0; const lfo = this.ctx.createOscillator(), lg = this.ctx.createGain(); lfo.frequency.value = 7; lg.gain.value = 0.25; lfo.connect(lg); lg.connect(g.gain); src.connect(f); f.connect(g); g.connect(this.master); src.start(); lfo.start(); this.rollG = g; }
    const v = S.sfxMute || !S.sfxRoll ? 0 : S.sfxVolume * S.sfxRollVol * 0.35 * Math.min(1, level);
    this.rollG.gain.setTargetAtTime(v, this.ctx.currentTime, 0.08);
  }
  env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
  osc(t, type, f0, f1, dur, vol, a = 0.004) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur); this.env(g, t, a, vol, dur); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + a + dur + 0.05); }
  nz(t, type, f0, f1, q, dur, vol, a = 0.004) { const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noise; const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur); f.Q.value = q; const g = c.createGain(); this.env(g, t, a, vol, dur); s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random() * 1.2); s.stop(t + a + dur + 0.05); }
  _shoot(t, v) { this.osc(t, 'sine', 210, 70, 0.12, v * 0.6); this.nz(t, 'lowpass', 1800, 300, 1, 0.07, v * 0.45); this.nz(t, 'bandpass', 3000, 1200, 3, 0.03, v * 0.2); }
  _insert(t, v) { this.osc(t, 'triangle', 900, 500, 0.04, v * 0.25); this.nz(t, 'bandpass', 2600, 1400, 4, 0.04, v * 0.3); }
  _match(t, v, o) { const k = Math.pow(1.17, Math.max(0, (o.combo || 1) - 1)); // 碎裂：噪声爆裂 + 方波碎响 + 低频冲击，连击升调
    this.nz(t, 'bandpass', 2400 * k, 600 * k, 1.2, 0.28, v * 0.7, 0.002); this.nz(t, 'highpass', 5000, 3000, 1, 0.12, v * 0.35, 0.001);
    for (let i = 0; i < 5; i++) this.osc(t + i * 0.025, 'square', (700 + i * 160) * k, (380 + i * 90) * k, 0.05, v * 0.07);
    this.osc(t, 'sine', 140 * k, 60, 0.22, v * 0.55); this.osc(t + 0.04, 'triangle', 880 * k, 1320 * k, 0.25, v * 0.12, 0.01); }
  _suck(t, v) { this.nz(t, 'bandpass', 2400, 160, 2, 1.0, v * 0.5, 0.15); this.osc(t, 'sawtooth', 320, 50, 1.0, v * 0.08, 0.1); }
  _fail(t, v) { [392, 330, 262, 196].forEach((f, i) => { this.osc(t + i * 0.16, 'square', f, f * 0.98, 0.3, v * 0.12, 0.01); this.osc(t + i * 0.16, 'sawtooth', f / 2, f / 2, 0.32, v * 0.08, 0.01); }); this.osc(t + 0.64, 'sine', 120, 60, 0.6, v * 0.5); }
  _win(t, v) { [523, 659, 784, 1047].forEach((f, i) => { this.osc(t + i * 0.1, 'sine', f, f, 0.6, v * 0.22, 0.006); this.osc(t + i * 0.1, 'triangle', f * 2, f * 2, 0.25, v * 0.05, 0.006); }); }
}
export async function renderSfxOffline(events, dur, S) {
  const C = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!C) return null;
  const sr = 44100, oc = new C(1, Math.max(1, Math.ceil(sr * dur)), sr);
  const x = new Sfx(); x.ctx = oc; x.master = oc.createGain(); x.master.connect(oc.destination); x.makeNoise();
  const S2 = { ...S, sfxMute: false }; for (const k in SFX_NAMES) S2[SFX_NAMES[k][0]] = true;
  for (const e of events) { x._t = e.t; x.play(e.name, S2, { combo: e.combo }); }
  return await oc.startRendering();
}
export function encodeWav(buf) {
  const ch = buf.getChannelData(0), n = ch.length, dv = new DataView(new ArrayBuffer(44 + n * 2));
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); ws(8, 'WAVE'); ws(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, buf.sampleRate, true); dv.setUint32(28, buf.sampleRate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); ws(36, 'data'); dv.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) { const v = Math.max(-1, Math.min(1, ch[i])); dv.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true); }
  return new Uint8Array(dv.buffer);
}
