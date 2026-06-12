HexGL
=========

Source code of [HexGL](http://hexgl.bkcore.com), the futuristic HTML5/WebGL racing game by [Thibaut Despoulain](http://bkcore.com).

This fork modernizes the original 2012-era build (global `bkcore.*` namespace + ordered `<script>` tags on Three.js r50) onto **Three.js, Vite, and TypeScript (ESM)**. It is still a fully client-side single page — there is no backend.

## Requirements

* Node.js 18+ (developed on Node 22)

## Getting started

```bash
npm install
npm run dev          # Vite dev server at http://localhost:5173
```

Open the URL, choose your settings on the start screen, and race the Cityscape track.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-check (`tsc`) then production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run convert:geo` | Regenerate `public/geometries` from `geometries.src` |

## Controls (keyboard)

| Key | Action |
| --- | --- |
| Arrow Up | Accelerate |
| Arrow Left / Right | Steer |
| A / Q | Air brake left |
| D / E | Air brake right |
| Esc | Restart |

Touch and gamepad input are also supported and can be selected on the start screen.

## URL parameters

Append to the URL to override the start-menu defaults, e.g. `?quality=2&hud=1`:

| Parameter | Values |
| --- | --- |
| `quality` | `0` low / `1` mid / `2` high / `3` very high |
| `controlType` | `0` keyboard / `1` touch / `3` gamepad |
| `hud` | `0` off / `1` on |
| `godmode` | `0` off / `1` on |

## License

Unless specified in the file, HexGL's code and resources are licensed under the *MIT License*. Game code under `src/hexgl/` carries a *CC BY-NC 3.0* header; preserve the per-file header when editing.
