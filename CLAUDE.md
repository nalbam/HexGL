# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

HexGL is a futuristic HTML5/WebGL racing game, modernized onto **Three.js (npm `three` ^0.184), Vite, and TypeScript (ESM)**. It was ported from a 2012-era build (global `bkcore.*` namespace + ordered `<script>` tags on Three.js r50). The game is still a client-side single page — there is no backend — but it now goes through a real build toolchain.

## Commands

```
npm install            # install deps (three, vite, typescript, @types/three)
npm run dev            # Vite dev server (http://localhost:5173), HMR
npm run build          # tsc --noEmit type-check, then vite build → dist/
npm run preview        # serve the production build
npm run convert:geo    # regenerate public/geometries from geometries.src (see below)
```

There is **no test suite**. Correctness of rendering and gameplay is verified by hand: `npm run dev`, play the Cityscape track, watch the browser console. Type-check alone (`tsc`) proves nothing about runtime behavior — the renderer, materials, and physics must be eyeballed.

## Layout

```
src/
  main.ts            # entry: start-menu wiring + HexGL instantiation (ex launch.js)
  core/              Timer, Utils, ImageData (collision/height pixel sampling),
                     Audio (Web Audio), math (rotateVectorByMatrix)
  controllers/       Touch / Orientation / Gamepad input
  threejs/           Loader, Shaders, Particles, RenderManager,
                     materials/NormalMaterial
  hexgl/             HexGL, Gameplay, ShipControls, ShipEffects, CameraChase,
                     HUD, RaceData, Ladder, tracks/Cityscape
public/              geometries/ textures/ textures.full/ audio/ css/   (served at /)
scripts/             convert-geometry.mjs
geometries.src/      original legacy-format models (converter input — do not delete)
```

`index.html` (project root) is the Vite entry HTML: it keeps the `#step-1..5` / `#main` / `#overlay` / `#progressbar` / `#finish*` DOM (referenced by id) and loads a single `<script type="module" src="/src/main.ts">`.

## Architecture (the big picture)

**ESM modules, named exports.** Each former `bkcore.*` class is now a module (`export class ShipControls`, etc.); cross-references are real `import`s. Three.js is `import * as THREE from 'three'`; postprocessing passes come from `three/addons/...`. There is no global namespace and no load-order coupling.

**Assets live in `public/` and are fetched by URL — never `import`ed.** The Loader builds quality-gated path strings (`"geometries/..."`, `"textures/..."` vs `"textures.full/..."`), and `public/` is copied to the dist root, so those paths resolve unchanged in dev and prod. Importantly the 2 MB `track.js` must stay a fetched asset, not a bundled import.

**Bootstrapping:** `index.html` → `main.ts` (menu, reads URL params `controlType`/`quality`/`hud`/`godmode` via `core/Utils`) → `new HexGL(opts)` → `hexGL.load()` (async asset load w/ progress) → `hexGL.init()` → `hexGL.start()` (RAF loop).

**Core game classes (`src/hexgl/`):**

- `HexGL.ts` — orchestrator: renderer, post-processing **composer** (`three/addons` `EffectComposer` + `RenderPass`×2 + optional `BloomPass` + optional `hexvignette` `ShaderPass` + `OutputPass` for linear→sRGB), HUD, gameplay, **quality tiers 0–3** (gate resolution halving, shadows, bloom, vignette), difficulty tuning, end-of-race score + `localStorage`.
- `ShipControls.ts` — physics + input core. Samples **collision/height image maps** (`collision.png`/`height.png`) via `core/ImageData`, not geometry. Densest spot for legacy-API porting (matrix/quaternion math).
- `Gameplay.ts` — race state machine (timeattack/survival/replay), laps, checkpoints, countdown.
- `ShipEffects.ts`, `CameraChase.ts`, `HUD.ts` (Canvas 2D), `RaceData.ts` (replay frames), `Ladder.ts`.

**Tracks are data + builders (`hexgl/tracks/Cityscape.ts`):** a track object declares spawn/checkpoints and a per-quality asset manifest, plus `load()` / `buildMaterials(quality)` / `buildScenes(hexgl, quality)`. `HexGL` picks the track from a `{ Cityscape }` map.

**Three.js helpers (`src/threejs/`):** `Loader` (TextureLoader/CubeTextureLoader/BufferGeometryLoader, per-role `colorSpace`), `RenderManager` (named scene/camera/render-loop registry; HexGL registers `sky` + `game`), `Shaders` (`hexvignette` post pass + `cube` skybox), `materials/NormalMaterial` (returns a `MeshStandardMaterial`).

## Geometry conversion pipeline

The original models in `geometries.src/` are the **legacy Three.js JSON model format** (`formatVersion 3.1`, JSONLoader — removed from modern Three.js). `scripts/convert-geometry.mjs` decodes the bitmask `faces` stream into non-indexed `position`/`normal`/`uv` attributes and writes modern **`BufferGeometryLoader` JSON** to `public/geometries/` (same paths, so the Cityscape manifest is untouched). It asserts the face stream is fully consumed and the face count matches metadata. If you change a source model, re-run `npm run convert:geo`. All current Cityscape models are pure triangles (face type 42).

## Conventions & gotchas

- License headers vary: game code (`hexgl/*`) is **CC BY-NC 3.0**; reusable helpers (`threejs/*`, `core/math`) are **MIT**. Preserve the header on any file you edit.
- `core/math.ts` `rotateVectorByMatrix` is a **length-preserving** rotate (legacy `Matrix4.rotateAxis`). Do **not** swap it for `Vector3.transformDirection`, which normalizes — `ShipControls.heightCheck` probes with length-5 vectors and relies on length being preserved.
- Modern Three.js `Object3D.position` is read-only (cannot be reassigned); `ShipControls` keeps the dummy's own position vector and re-derives the mesh transform via `applyMatrix4` each frame.
- The legacy `normal`/`normalV` shaders were dropped (they used the removed fixed-light-count uniform system); meshes use `MeshStandardMaterial`. Expect lighting/material **visual retune** — `NormalMaterial` exposes `metalness`/`roughness`/`envMapIntensity`/`normalScale`. Light intensities (`Directional`/`Point`/`Ambient`) may also need retuning under modern physically-based units.
- `tsconfig` is `strict: true`.
