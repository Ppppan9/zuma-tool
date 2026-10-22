# 🐸 祖玛核玩工具 v1.0.2

俯视正交 three.js 祖玛玩法素材工具：遗迹背景 / 灰色主题、石雕轨道凹槽 + 金边黑洞、符文石球链、中心石青蛙（口中含球、头顶宝石显示下一颗颜色）、插入 / 三消 / 前段回拉 / 连击、溅射 + 尘土 + 白闪特效、失败吸入 + 背景模糊 + FAIL 弹出，底部免责声明、程序化音效。

在线版：https://ppppan9.github.io/zuma-tool/

## 使用
- 直接打开 `index.html`（单文件，已内联全部资源）。右侧「控制面板」里所有参数都是中文，自动保存到浏览器（带版本号与迁移）。
- 🤖 自动通关：AI 优先寻找能触发连击的插入点；可上传手指 PNG，手指会避开命中点。录制不会自动开始。
- 导出：
  - **AE 工程**：「● 开始记录」→ 玩一段 →「■ 停止并导出」，得到 `zuma-tool_ae_export_*.zip`（`build_ae_project.jsx` + `timeline.json` + `assets/` + `audio/mix.wav` + `audio/sfx_*.wav`），说明见 zip 内 README_AE.md。
  - **3D 动画**：同一段记录导出 `scene.glb`（球 / 青蛙 / 背景 + 动画）+ `scene3d.json` + `blender_import.py`。
  - **H5 试玩广告**：一个 zip 内 8 个渠道文件夹（applovin / facebook / google / mintegral / moloco / tiktok / unity / generic）。试玩版不带手指、默认不自动演示；预览与导出按「预览机型」或自定义宽×高，只有「自适应」会留黑边。

## 开发
```
npm install
npm run build          # esbuild → index.html
npm test               # 逻辑测试 + 浏览器冒烟
npm run test:ae        # 自动游玩并导出 AE zip
npm run test:3d        # 导出 3D zip
H5_QUICK=1 npm run test:h5   # 8 渠道 390×844 冒烟
npm run shots          # 截图 + 与参考帧对比 screenshots/compare_*.png
```

## 已知限制
- 自动通关 AI 不是每局必胜：默认参数下 20 个种子约 15/20 通关（见 `npm test` 输出）。
- AE 里球和青蛙是离屏渲染的静态 PNG，没有花纹滚动效果；3D GLB 不含 2D 特效 / FAIL 徽章 / 文字 / 手指。
- 青蛙造型、球面花纹和参考视频只是接近，不是一模一样。

## 更新记录
### v1.0.2（仅消除效果）
- 按参考视频逐帧（30fps）重做消除时间轴：0–167ms 球保持原大小、白色放射裂纹 + 深色锯齿轮廓；167–267ms 变为 1.1→1.22× 半透明同色气泡（深色虚线边）；267ms 起破裂成同色光雾（约 3D 宽）+ 白色弧形碎片 + 每球约 30 片深色碎屑向外飘散；约 600ms 淡出完毕。同时消失，无白闪 / 光环 / 震屏。
- 消除时机：飞行球落在链上（尚未滑入）即判定，和参考一致（insertMatchAt）。
- 缺口：约 170ms 后前段回拉，速度 = 缺口×closeRate（限制在 closeMin–closeMax·D/s），减速收尾无回弹；参考中两端颜色不同也会合拢（gapRule 默认 always，可选 match）。
- 新设置项：fxTimeScale / fxCrack / fxSlivers / fxCloudSize / fxTint_0..3 / closeRate / closeMin / closeMax / gapRule / dyingShrink / insertMatchAt（旧设置自动迁移）。AE 导出同步新特效素材与关键帧。
- 对比图：screenshots/elim_compare_ref_vs_ours_1.png / _2.png。

### v1.0.1
- 修复穿模：球链间距按**直线（弦长）**计算（弯道上弧长 > 弦长），推进 / 插入 / 回拉 / 连击 / 失败吸入全程生效；插入的新球在缺口张开前被挤在链外侧并滑入；正在消除的球仍占位并会被推开。`npm test` 含逐帧两两圆心距检查（≥ 0.98 × 半径和）。碰撞半径默认 1.0 球径。
- 石青蛙按参考近景重做：宽扁大头、嘴唇半包口中球、白色大眼 + 绿虹膜、背部小圆宝石（显示下一颗颜色）、四肢外张长趾、眨眼。
- 消除特效按参考：球先变半透明“气泡”（虚线深色描边）→ 同色柔和光雾 + 大量深色碎片；默认关闭液体飞溅块。
- 球花纹：红球浅色花纹，绿 / 黄 / 蓝为浅底深色刻纹（参考如此）。
- FAIL 徽章改为正体粗字，弹出后球链定格（参考效果）。
- 设置版本 v2：旧默认值自动换成新默认，用户改过的值保留。
