---
name: Vite 8 CJS bundling issue
description: CJS/UMD packages that use require() at runtime break in Vite 8's Rolldown bundler. Applies to react-simple-maps and similar legacy packages.
---

## Rule
Do not install CJS/UMD packages into this project's frontend. Vite 8 uses Rolldown which does not support `require()` calls at runtime from external modules.

**Why:** react-simple-maps@3 ships as UMD and internally calls `require('prop-types')` at runtime. Rolldown cannot resolve this, throwing: "Calling `require` for 'prop-types' in an environment that doesn't expose the `require` function."

**How to apply:** When a charting/visualization library is needed, prefer pure ESM packages or write SVG renderers directly. For world maps, use a pure SVG equirectangular projection implemented in the component itself (see WorldMap.tsx).
