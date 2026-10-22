# 素材来源（ASSETS）

| 文件 | 用途 | 来源 |
|---|---|---|
| `src/assets/ruins.jpg`（720×1280） | 遗迹主题背景（苔藓遗迹、雕纹环形石板、藤蔓、石块） | **AI 生成**：用本工具开发环境的图像生成功能（GenerateImage），以参考广告视频 `ref.mp4` 的一帧作为构图参考生成，再缩放到 720×1280。不是从参考视频直接截取，也不是从网上下载。轨道凹槽、金边黑洞、中心底座、暗角等在运行时由 `src/paint.js` 程序绘制在其上。 |
| `src/assets/grey.jpg`（720×1280） | 灰色主题背景（平灰石板 #76817D 附近色调 + 细裂纹） | **AI 生成**：同上方式生成（参考视频中切换到灰色主题后的画面作构图参考），缩放到 720×1280。 |
| `src/default_hand.js`（内嵌 PNG data URL） | 默认手指图片（仅工具内自动通关演示用，H5 试玩包会剥离） | 从同系列工具 `mahjong-tool` 的默认手指直接复制（该工具自带素材）。 |
| `src/h5/fixtures/*.png` | H5 冒烟测试用的手指图片（大/中号） | 来自共享模块 `game-toolkit-standard/h5-playable`，仅测试使用，不打包进页面。 |
| 球花纹、球凹凸贴图、青蛙石材 / 龟甲纹、底座、凹槽、黑洞、消除特效、FAIL 徽章、结束页 | 画面元素 | 运行时程序生成（`src/paint.js`、`src/scene3d.js`、`src/fx.js`、canvas 2D + three.js），无外部图片。 |
| 3D 环境光 | 球 / 青蛙反射 | three.js 自带 `RoomEnvironment`（程序生成），无 HDR 文件。 |
| 全部音效（发射 / 插入 / 消除 / 吸入 / 失败 / 胜利 / 滚动声） | SFX | `src/audio.js` 用 WebAudio 振荡器 + 噪声程序合成；导出的 wav 也是离线渲染同一合成器得到，无录音素材。 |
| 字体 | 文字 | 使用系统字体（PingFang SC / Microsoft YaHei / Noto Sans CJK SC / Arial Black），不打包字体文件。 |

参考视频 `ref.mp4` 及其抽帧只用于开发时的对比截图（`screenshots/compare_*.png` 右侧），没有打包进工具页面或任何导出物。
