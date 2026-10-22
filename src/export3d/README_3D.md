# 祖玛核玩工具 · 3D 动画导出说明

zip 内容：`scene.glb`（glTF 2.0，含动画）、`scene3d.json`（帧率 / 相机 / 节点进出时间）、`timeline.json`（同一次记录的 AE 时间轴）、`blender_import.py`、`audio/`。

- 坐标：`zuma_root` 缩放 0.01（1 设计像素 = 1 cm）；页面是俯视正交相机，GLB 里 X = 设计 x，-Z(Blender Y) = 设计 y，Y 向上。
- 节点：`background`（贴图平面）、`frog`（页面同一个石青蛙模型，旋转关键帧）、`ball_<id>`（每颗球一个球体，位置 / 旋转(滚动) / 缩放关键帧；不在场时缩放为 0）。
- 相机 `camera_ortho`：与页面同一正交俯视取景。
- Blender：Scripting 里运行 `blender_import.py`（与 scene.glb 同目录），会导入 GLB、设帧率与帧范围、设活动相机与分辨率、把音频加入视频序列编辑器。

已知限制：消除特效、FAIL 徽章、免责声明、手指等 2D 叠加层未放进 GLB（请用 AE 工程合成）；背景模糊同理。
