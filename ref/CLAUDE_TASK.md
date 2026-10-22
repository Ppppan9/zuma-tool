# Task: build 祖玛核玩工具 (zuma-tool) — a web game tool cloned from a mobile ad video

Work in this folder. Build a complete, runnable project here (git init, commit as you go). Respond/comment in Chinese where user-facing (UI labels in Chinese).

## References (in ./ref)
- ref/ref.mp4 (24s, 1080x1920) and ref/frames/f_001..096.jpg (4 fps, so frame N ≈ (N-1)/4 s). LOOK AT THE FRAMES carefully and match visuals.
- ref/TOOLKIT_STANDARD.md — mandatory house standard for all 核玩工具 (settings panel, versioned settings + migrate, recording, auto-solve with uploadable finger image, AE export, 3D export, H5 playable export §5). Follow it exactly.
- ref/example-tool/ — an existing tool (block-shooter) following the standard. Reuse its structure: build.mjs, settings/migrate pattern, recorder, AE export (.jsx + timeline json + assets zip), 3D export, H5 export, tests. Copy & adapt; don't reinvent.
- ref/h5-playable/ — shared H5 playable module; copy to src/h5/ and use it (device presets, resolveH5Device, h5DeviceSelectOptions, editOutsideScripts black-screen fix, 8 channels).

## Game analysis of the reference
- Top-down orthographic view, 3D-looking assets (use three.js, orthographic camera), light from top-left, soft drop shadows to bottom-right on balls, frog, track.
- Background: default theme "遗迹" = mossy ancient stone ruin slab with carved circular patterns, roots/vines at edges (frames 1–24). Second theme "灰底" = flat grey ~#76817D with dark grey track outline ~#404040 (frames after ~6s). Theme switch in settings.
- Track: enters straight down from top-center off-screen, joins a big circle at 12 o'clock, travels CLOCKWISE ~300°, spirals slightly inward, ends at a dark hole with gold/bronze rim at ~10 o'clock. Track path editable via parameters (radius, entry length, spiral inset, end angle).
- Balls: 4 colors red ~#C12A34, green ~#50A345, yellow ~#D4B838, blue ~#3574BA; glossy carved-stone spheres with lighter rune engravings and specular highlight; diameter ≈ 1/10 screen width. Chain pushes ≈ 1 ball diameter/s (param). No special balls.
- Shooter: grey stone frog ~#7A7A7A fixed at circle center, glowing blue gem eyes, gold headpiece ~#A68B4A with dark red gem. Snaps rotation instantly toward tap. Current ball sits in its mouth; NO next-ball preview; new ball pops in instantly after a shot.
- Shot: straight line, very fast (~0.1–0.2s to track), no trail. Inserts into chain pushing the front part forward. 3+ same color => eliminate.
- Elimination FX: balls scale down & vanish, burst of liquid-like color splatters + small dust/sparks in ball color, brief bright white flash. No score popups.
- Gap rule: after elimination, front segment stops; back segment keeps advancing. If the balls on both sides of the gap are the same color, the FRONT segment pulls BACKWARD fast (3–5x, param) and snaps in; if that makes 3+, chain-eliminate again (combos cascade, see 4–7s and 11–14s).
- No in-game UI (no score/level/buttons). Small white disclaimer text bottom: "广告素材宣传 场景表现非一定关卡 / 触发相应模块出现" (toggleable, editable).
- Fail: when head ball reaches the hole, whole chain rapidly sucks in, background heavy gaussian blur, a big red circle ~#D12A34 with bold white "FAIL" scales up center. Also make a win/end state per standard.
- SFX: generate procedurally (WebAudio): stone rolling loop, shoot thwack, crunchy smash rising pitch with combo, suction, fail sting. Volume params.

## Tool requirements (all from standard)
- Every gameplay/visual value exposed in the settings panel (colors, counts, speeds, ball size, chain length, pull-back speed, FX amount, theme, track shape, frog scale, disclaimer, etc.), versioned settings with migrate, saved in localStorage.
- Auto-solve (自动通关) demo that aims at good matches/combos, with uploadable finger PNG simulating taps; finger avoids covering the impact; recording (录屏) does not auto-start with auto-solve.
- Exports: AE project export, 3D export, and H5 试玩广告 export: 8 channel folders applovin, facebook, google, mintegral, moloco, tiktok, unity, generic in one zip, matching the example tool. H5 playable is played by the REAL player: NO finger, auto-play OFF by default. Preview & export follow the selected device preset or custom W×H; only 「自适应」 does full multi-device letterbox. Device presets from the shared module.
- Version starts at v1.0.0, shown in UI.
- Tests: `npm run build` and `npm test` (logic: insertion, match, gap pull-back, combos, fail) and `npm run test:h5` with an H5_QUICK=1 mode (8 channels at 390x844 only) — run quick mode, not the full matrix. Take a few screenshots into screenshots/ (gameplay at ~1s-like layout, combo mid-FX, FAIL screen) for visual comparison to ref frames.
- README in Chinese.

When finished, print a short summary: what's done, test results, known gaps vs reference.
