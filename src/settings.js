// 设置定义：所有可调参数（中文标签）。版本号 + 迁移（通用分组 / 键名与 ref/TOOLKIT_STANDARD.md 一致）
import { DEFAULT_HAND } from './default_hand.js';
import { h5DeviceSelectOptions } from './h5/index.js';
export const APP_VERSION = '1.0.0';
export const SETTINGS_VERSION = 1;
export const STORE_KEY = 'zumaTool.settings';
export const APP_ID = 'zuma-tool';
const ALL8 = 'applovin,facebook,google,mintegral,moloco,tiktok,unity,generic';
// [key, 标签, 类型, 默认, min, max, step]  类型: range/color/bool/select/text/file/button
export const GROUPS = [
  ['画布与关卡', [
    ['canvasW', '画布宽度(px)', 'range', 720, 360, 1440, 2],
    ['canvasH', '画布高度(px)', 'range', 1280, 640, 2560, 2],
    ['seed', '随机种子（球链颜色）', 'range', 1, 1, 9999, 1],
    ['colorCount', '颜色数（参考=4：红/绿/黄/蓝）', 'range', 4, 2, 6, 1],
    ['chainLen', '球链总数', 'range', 56, 10, 200, 1],
    ['chainSameProb', '相邻同色概率（参考常见 2 连）', 'range', 0.45, 0, 0.9, 0.01],
    ['startFill', '开局球链队首位置(轨道比例，参考 1 秒时队首≈9 点半)', 'range', 0.84, 0.05, 0.95, 0.01],
    ['matchMin', '几个同色消除', 'range', 3, 2, 6, 1],
    ['shotColorMode', '发射球颜色', 'select', 'smart', [['smart', '偏向能凑消除的颜色（广告演示更爽）'], ['chain', '只出链上现有颜色'], ['random', '完全随机']]],
    ['smartProb', '偏向概率', 'range', 0.3, 0, 1, 0.01],
  ]],
  ['轨道', [
    ['trackCX', '大圆中心 X', 'range', 360, 100, 620, 1],
    ['trackCY', '大圆中心 Y', 'range', 680, 300, 1000, 1],
    ['trackR', '大圆半径(px，参考≈293)', 'range', 293, 120, 360, 1],
    ['trackEntryLen', '顶部入口屏外长度(px)', 'range', 420, 0, 1500, 10],
    ['trackJoinDeg', '入口并入大圆的角度(°，12 点顺时针；参考≈20)', 'range', 20, 0, 90, 1],
    ['trackBend', '入口弯道圆滑度(×球径)', 'range', 0.9, 0.1, 3, 0.05],
    ['trackEndDeg', '轨道终点角度(°，12 点起顺时针；参考≈340)', 'range', 340, 180, 400, 1],
    ['trackSpiralFrom', '开始向内螺旋的角度(°)', 'range', 290, 0, 400, 1],
    ['trackInset', '螺旋内收量(px)', 'range', 10, 0, 200, 1],
    ['grooveWidth', '凹槽槽底宽度(×球径；球压在两侧石棱上)', 'range', 0.72, 0.8, 1.6, 0.01],
    ['grooveDark', '凹槽暗度', 'range', 0.55, 0, 1, 0.01],
    ['grooveRim', '凹槽铜边(遗迹主题)', 'color', '#8c7444'],
    ['holeSize', '黑洞直径(×球径)', 'range', 1.3, 0.8, 2.5, 0.01],
    ['holeGold', '黑洞金边颜色', 'color', '#c9a24e'],
  ]],
  ['球', [
    ['ballSize', '球直径(px，参考≈画面宽 0.115)', 'range', 82, 40, 120, 1],
    ['col_red', '红色(参考≈#C12A34)', 'color', '#c12a34'],
    ['col_green', '绿色(参考≈#50A345)', 'color', '#50a345'],
    ['col_yellow', '黄色(参考≈#D4B838)', 'color', '#d4b838'],
    ['col_blue', '蓝色(参考≈#3574BA)', 'color', '#3574ba'],
    ['col_purple', '紫色(第 5 色)', 'color', '#7b3fb0'],
    ['col_white', '白色(第 6 色)', 'color', '#d8d8d0'],
    ['runeLight', '符文亮度(浅色雕刻)', 'range', 0.5, 0, 1, 0.01],
    ['runeBump', '符文雕刻深度', 'range', 1.2, 0, 4, 0.05],
    ['ballRough', '球表面粗糙度(越小越亮)', 'range', 0.38, 0, 1, 0.01],
    ['ballEnv', '环境反射强度', 'range', 0.45, 0, 2, 0.05],
    ['ballRoll', '球沿轨道滚动旋转', 'bool', true],
  ]],
  ['发射器（石青蛙）', [
    ['frogScale', '青蛙大小', 'range', 1.32, 0.5, 1.8, 0.01],
    ['frogOffX', '青蛙相对圆心偏移 X', 'range', 0, -200, 200, 1],
    ['frogOffY', '青蛙相对圆心偏移 Y', 'range', 0, -200, 200, 1],
    ['frogStartDeg', '初始朝向(°，0=朝右，90=朝下)', 'range', 60, -180, 180, 1],
    ['frogStone', '石头颜色(参考近景为暖灰砂岩)', 'color', '#8a7a63'],
    ['frogGold', '金饰颜色(参考≈#A68B4A)', 'color', '#a68b4a'],
    ['eyeStyle', '眼睛', 'select', 'googly', [['googly', '白色大眼 + 黑瞳（参考视频）'], ['gem', '发光蓝宝石眼']]],
    ['eyeGlow', '宝石眼发光颜色', 'color', '#4fc3ff'],
    ['frogIris', '眼睛虹膜颜色（参考：绿）', 'color', '#4c8f3a'],
    ['frogBlink', '青蛙眨眼（参考视频有）', 'bool', true],
    ['blinkEvery', '眨眼间隔(秒)', 'range', 3.2, 1, 10, 0.1],
    ['gemShowsNext', '头顶宝石显示下一颗球颜色（参考视频如此）', 'bool', true],
    ['gemColor', '头顶宝石颜色(不显示下一颗时)', 'color', '#8e1b22'],
    ['mouthDist', '嘴里球离中心距离(px)', 'range', 66, 0, 140, 1],
    ['pedestal', '青蛙底座圆盘(回纹)', 'bool', true],
    ['pedestalR', '底座半径(×球径，参考≈1.85)', 'range', 1.85, 0.8, 3, 0.01],
  ]],
  ['玩法与动画', [
    ['chainSpeed', '球链推进速度(球径/秒，参考≈0.6–0.9)', 'range', 0.6, 0, 6, 0.05],
    ['introSec', '开局快速滚入时长(秒，0=开局已就位)', 'range', 0, 0, 5, 0.1],
    ['introSpeed', '快速滚入速度(球径/秒)', 'range', 8, 1, 30, 0.5],
    ['pullSpeed', '缺口两端同色时前段回拉速度(×推进速度，参考 3–5)', 'range', 4, 1, 12, 0.1],
    ['dangerSlow', '接近黑洞时减速比例', 'range', 0.75, 0, 0.9, 0.01],
    ['shotSpeed', '发射速度(px/秒，参考≈0.1–0.2 秒到轨道)', 'range', 3200, 500, 8000, 50],
    ['fireCooldown', '发射间隔(秒)', 'range', 0.2, 0, 2, 0.01],
    ['insertDur', '插入挤开动画(秒)', 'range', 0.12, 0.02, 0.6, 0.01],
    ['hitRadius', '碰撞半径(×球径，≥1 不穿模)', 'range', 1, 0.5, 1.2, 0.01],
    ['pullDelay', '消除后前段停顿再回拉(秒)', 'range', 0.05, 0, 1, 0.01],
    ['popDur', '消除缩小(秒)', 'range', 0.2, 0.05, 1, 0.01],
    ['suckSpeed', '失败时吸入黑洞速度(球径/秒)', 'range', 9, 1, 40, 0.5],
  ]],
  ['消除特效', [
    ['fxGlow', '彩色光雾强度', 'range', 0.85, 0, 2, 0.05],
    ['fxSplat', '液体飞溅块数(每球)', 'range', 7, 0, 30, 1],
    ['fxShards', '碎屑/尘点数(每球)', 'range', 16, 0, 60, 1],
    ['fxFlash', '白色闪光强度', 'range', 0.75, 0, 1.5, 0.05],
    ['fxLife', '特效时长(秒)', 'range', 0.75, 0.2, 3, 0.05],
    ['fxSpread', '飞散距离(×球径)', 'range', 1.4, 0.3, 4, 0.05],
    ['fxComboBoost', '连击时特效放大', 'range', 0.15, 0, 1, 0.01],
  ]],
  ['场景与光照', [
    ['theme', '主题', 'select', 'ruins', [['ruins', '遗迹（苔藓石板 + 雕刻圆环 + 藤蔓）'], ['grey', '灰底（参考 6 秒后 #76817D）']]],
    ['themeSwitchSec', '自动切到灰底的时间(秒，0=不切；参考≈6)', 'range', 0, 0, 30, 0.5],
    ['bgImage', '自定义背景图（可选）', 'file', ''],
    ['greyColor', '灰底颜色(参考≈#76817D)', 'color', '#76817d'],
    ['greyOutline', '灰底轨道描边(参考≈#404040)', 'color', '#404040'],
    ['greyTexture', '灰底叠加做旧纹理', 'range', 0.75, 0, 1, 0.01],
    ['bgDim', '背景压暗', 'range', 0.08, 0, 0.6, 0.01],
    ['vignette', '暗角', 'range', 0.35, 0, 1, 0.01],
    ['lightAzim', '主光方向(°，135=左上)', 'range', 135, 0, 360, 1],
    ['lightElev', '主光仰角(°)', 'range', 45, 15, 89, 1],
    ['lightSun', '主光强度', 'range', 2.2, 0, 6, 0.05],
    ['lightAmb', '环境光强度', 'range', 0.75, 0, 4, 0.05],
    ['shadowOp', '投影浓度(向右下)', 'range', 0.75, 0, 1, 0.01],
    ['shadowSoft', '投影柔和度', 'range', 6, 0, 20, 0.5],
  ]],
  ['失败 / 胜利', [
    ['failBlur', '失败时背景模糊(px)', 'range', 14, 0, 40, 0.5],
    ['failColor', 'FAIL 红圈颜色(参考≈#D12A34)', 'color', '#d12a34'],
    ['failText', '失败文字', 'text', 'FAIL'],
    ['failSize', 'FAIL 红圈直径(×画面宽)', 'range', 0.6, 0.2, 0.9, 0.01],
    ['failBadgeAfter', '开始吸入后多久弹出 FAIL(秒)', 'range', 0.7, 0, 5, 0.05],
    ['failFreeze', 'FAIL 弹出后球链定格（参考视频效果）', 'bool', true],
    ['failDelay', '链被吸入后出现延迟(秒)', 'range', 0.15, 0, 3, 0.05],
    ['failScaleDur', 'FAIL 放大时长(秒)', 'range', 0.45, 0.05, 2, 0.05],
    ['winText', '胜利文字', 'text', '通关！'],
  ]],
  ['文字', [
    ['discShow', '显示底部免责声明', 'bool', true],
    ['discText', '底部文字', 'text', '广告素材宣传场景需达到一定关卡/触发相应模块后出现'],
    ['discSize', '底部字号', 'range', 17, 8, 40, 1],
    ['discY', '底部文字Y(距底)', 'range', 12, 0, 200, 1],
    ['textOpacity', '文字透明度', 'range', 0.9, 0, 1, 0.01],
  ]],
  ['音效', [
    ['sfxMute', '静音', 'bool', false],
    ['sfxVolume', '总音量', 'range', 0.8, 0, 1.5, 0.01],
    ['sfxRoll', '石球滚动(循环)', 'bool', true],
    ['sfxRollVol', '石球滚动 音量', 'range', 0.6, 0, 2, 0.01],
    ['sfxShoot', '发射', 'bool', true],
    ['sfxShootVol', '发射 音量', 'range', 1, 0, 2, 0.01],
    ['sfxInsert', '插入', 'bool', true],
    ['sfxInsertVol', '插入 音量', 'range', 0.8, 0, 2, 0.01],
    ['sfxMatch', '消除（连击音调升高）', 'bool', true],
    ['sfxMatchVol', '消除 音量', 'range', 1, 0, 2, 0.01],
    ['sfxSuck', '吸入黑洞', 'bool', true],
    ['sfxSuckVol', '吸入黑洞 音量', 'range', 1, 0, 2, 0.01],
    ['sfxFail', '失败', 'bool', true],
    ['sfxFailVol', '失败 音量', 'range', 1, 0, 2, 0.01],
    ['sfxWin', '胜利', 'bool', true],
    ['sfxWinVol', '胜利 音量', 'range', 1, 0, 2, 0.01],
  ]],
  ['手指 / 自动通关', [
    ['autoSpeed', '整体速度倍率', 'range', 1, 0.25, 6, 0.05],
    ['moveMin', '移动耗时最小(ms)', 'range', 260, 50, 2000, 10],
    ['moveMax', '移动耗时最大(ms)', 'range', 420, 50, 3000, 10],
    ['delayMin', '点击间隔最小(ms)', 'range', 120, 0, 2000, 10],
    ['delayMax', '点击间隔最大(ms)', 'range', 380, 0, 4000, 10],
    ['thinkChance', '“思考停顿”概率', 'range', 0.08, 0, 0.6, 0.01],
    ['thinkMax', '思考停顿最长(ms)', 'range', 700, 0, 4000, 50],
    ['jitter', '落点随机抖动(px)', 'range', 4, 0, 40, 1],
    ['handSize', '手指大小(画面宽比例)', 'range', 0.42, 0.1, 0.9, 0.01],
    ['handAnchorX', '指尖锚点 X(0~1)', 'range', 0.22039473684210525, 0, 1, 0.005],
    ['handAnchorY', '指尖锚点 Y(0~1)', 'range', 0.03667763157894737, 0, 1, 0.005],
    ['handRotation', '手指旋转(度)', 'range', 6, -60, 60, 1],
    ['handFlip', '手指水平翻转', 'bool', false],
    ['handImage', '上传手指图片(透明PNG，不上传则不显示手指；默认=麻将工具同款手指)', 'file', DEFAULT_HAND],
    ['pressEnabled', '点击按下效果', 'bool', true],
    ['pressDepth', '按压幅度（按下时手指缩小比例）', 'range', 0.1, 0, 0.3, 0.01],
    ['tapRipple', '点击处显示波纹圈（参考视频没有）', 'bool', false],
    ['handShow', '显示手指', 'bool', true],
    ['manualHand', '手动游玩时手指跟随指针', 'bool', true],
    ['hideCursor', '手指出现时隐藏鼠标', 'bool', true],
    ['handAvoid', '手指避开命中点（点在青蛙与目标之间，不遮挡消除）', 'bool', true],
    ['autoAim', '自动瞄准策略', 'select', 'combo', [['combo', '优先连击（预测回拉级联）'], ['match', '只求消除'], ['random', '随机乱打（演示失败）']]],
    ['autoDiscard', '无法凑对时把球打向空处(收益阈值，0=从不)', 'range', 5, 0, 50, 1],
    ['autoStartDelay', '开始前等待(ms)', 'range', 400, 0, 5000, 50],
  ]],
  ['录制', [
    ['recFps', '帧率', 'range', 30, 15, 60, 1],
    ['recFormat', '格式', 'select', 'auto', [['auto', '自动(优先 MP4)'], ['mp4', 'MP4'], ['webm', 'WebM']]],
    ['recBitrate', '码率(Mbps)', 'range', 8, 1, 30, 0.5],
    ['autoRec', '自动通关开始时自动录制（默认关）', 'bool', false],
    ['autoStop', '自动通关通关后停止录制并下载（仅在正在录制时）', 'bool', true],
    ['tailSec', '通关后继续录制(秒)', 'range', 2, 0, 10, 0.1],
  ]],
  ['导出 AE 工程', [
    ['_aeToggle', '记录 AE 时间轴（自动通关/手动游玩都可）', 'button', 'aeToggle', '● 开始记录'],
    ['_aeExport', '重新导出上一次记录', 'button', 'aeExport', '⬇ 导出 ZIP'],
    ['aeWithRec', '录制视频时同步记录，停止录制后自动导出', 'bool', true],
    ['aeFps', 'AE 合成帧率', 'select', '30', [['24', '24'], ['25', '25'], ['30', '30'], ['60', '60']]],
    ['aeSize', 'AE 合成尺寸', 'select', 'canvas', [['canvas', '同画布分辨率'], ['720x1280', '720×1280'], ['1080x1920', '1080×1920']]],
    ['aeSampling', '关键帧方式', 'select', 'reduce', [['reduce', '精简关键帧（线性插值，误差 <0.3px）'], ['bake', '逐帧烘焙（每帧一个关键帧）']]],
    ['aeNames', '图层命名', 'select', 'zh', [['zh', '中文'], ['en', 'English']]],
    ['aeAudio', '音频', 'select', 'both', [['both', '混合音轨 + 逐事件音效层'], ['mixed', '仅混合音轨'], ['events', '仅逐事件音效层'], ['none', '不导出音频']]],
    ['aeSaveAep', '脚本跑完后提示另存为 .aep', 'bool', true],
  ]],
  ['导出 3D 动画（UE5 / C4D / Blender）', [
    ['_export3d', '用上一次 AE 记录生成 glTF 场景 + Blender 脚本 + 音频', 'button', 'export3d', '导出 3D 动画 (glTF/FBX/Blender)'],
    ['export3dFps', '3D 动画帧率', 'select', '30', [['24', '24'], ['25', '25'], ['30', '30'], ['60', '60']]],
    ['export3dHand', '包含手指（贴图平面；结束页是否显示仍按“结束页显示手指”）', 'bool', true],
  ]],
  ['导出 H5 试玩广告', [
    ['_exportH5', '导出当前设置为自包含 H5 试玩（无编辑器面板，仅游戏+CTA）', 'button', 'exportH5', '⬇ 导出 H5 试玩 ZIP'],
    ['h5Format', '渠道格式', 'select', ALL8, [[ALL8, '全部（AppLovin+Facebook+Google+Mintegral+Moloco+TikTok+Unity+Generic）'], ['tiktok,generic', 'TikTok + Generic'], ['applovin', '仅 AppLovin（MRAID）'], ['facebook', '仅 Facebook/Meta（≤2MB）'], ['google', '仅 Google Ads'], ['mintegral', '仅 Mintegral'], ['moloco', '仅 Moloco'], ['tiktok', '仅 TikTok/Pangle'], ['unity', '仅 Unity Ads（MRAID）'], ['generic', '仅 Generic 离线']]],
    ['h5Orientation', '试玩方向', 'select', '1', [['0', '双端 (0)'], ['1', '竖屏 (1)'], ['2', '横屏 (2)']]],
    ['h5Device', '预览机型', 'select', 'adaptive', h5DeviceSelectOptions()],
    ['h5DeviceW', '预览宽度(px)', 'range', 390, 240, 1440, 1],
    ['h5DeviceH', '预览高度(px)', 'range', 844, 400, 2560, 1],
    ['h5CtaText', 'CTA 按钮文案', 'text', '立即下载'],
    ['h5StoreUrl', '应用商店 / 落地页 URL', 'text', 'https://play.google.com/store/apps/details?id=com.example.game'],
    ['h5GameName', '游戏名（可选）', 'text', '祖玛'],
    ['h5Icon', '应用图标（可选，透明PNG）', 'file', ''],
    ['h5MaxMb', '体积告警阈值(MB)', 'range', 5, 1, 20, 0.5],
    ['h5AutoPlay', '打开试玩后自动通关演示', 'bool', false],
  ]],
  ['结束页(End Card)', [
    ['endCard', '显示结束页', 'bool', false],
    ['endCardHand', '结束页显示手指（自动通关点按钮）', 'bool', false],
    ['endDelay', '通关/失败后出现延迟(ms)', 'range', 1200, 0, 5000, 50],
    ['endTitle', '标题', 'text', '立即下载 挑战更多关卡'],
  ]],
];
export const DEFS = {};
for (const [, items] of GROUPS) for (const it of items) if (it[2] !== 'button') DEFS[it[0]] = it[3];
// migrate：只补默认值、把仍等于旧默认值的项换成新默认、旧键→新键；不覆盖用户改过的值
export function migrate(obj) {
  if (!obj || typeof obj !== 'object') return { ...DEFS };
  let v = obj.version || 0; const s = { ...(obj.settings || obj) };
  if (v < 1) { // v0（无版本号草稿 / 其它核玩工具通用旧键）→ v1
    const mv = (o, n, f = x => x) => { if (o in s) { if (!(n in s)) s[n] = f(s[o]); delete s[o]; } };
    mv('handImg', 'handImage'); mv('sfxVol', 'sfxVolume'); mv('sfx', 'sfxMute', x => !x); mv('recTail', 'tailSec', x => Math.round(x / 100) / 10); mv('endText', 'endTitle');
    mv('ballD', 'ballSize'); mv('speed', 'chainSpeed');
    if (s.h5Format === 'tiktok,google,mintegral,generic') s.h5Format = ALL8;
    v = 1;
  }
  const OLD = { /* 版本 → 旧默认（仍等于旧默认才替换），v1 为首个正式版 */ };
  for (const nv of Object.keys(OLD).map(Number).sort((a, b) => a - b)) if (v < nv) { for (const k in OLD[nv]) if (s[k] === OLD[nv][k]) delete s[k]; v = nv; }
  const out = { ...DEFS };
  for (const k in DEFS) if (k in s && typeof s[k] === typeof DEFS[k]) out[k] = s[k];
  return out;
}
export function loadSettings() {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) return migrate(JSON.parse(raw)); } catch (e) { }
  return { ...DEFS };
}
export function saveSettings(S) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ version: SETTINGS_VERSION, settings: S })); } catch (e) { console.warn('save fail (图片过大?)', e); }
}
export function exportJSON(S) { return JSON.stringify({ app: APP_ID, version: SETTINGS_VERSION, settings: S }, null, 2); }
