# Release validation

Completed in the packaging environment for v3.2.1:

- **33/33** application `.ts` and `.tsx` files passed TypeScript parser/transpilation diagnostics.
- All JSON files parsed successfully.
- **21/21** bundled GLB files opened as valid Y-up scenes, used metre-scale bounds and contained renderable geometry.
- Every bundled asset uses uniform contain scaling at runtime; no independent X/Y/Z stretching remains.
- The sample property furniture dimensions follow the existing `[width, depth, height]` contract.
- **9/9** PBR sets contained base-colour, normal, roughness and ambient-occlusion maps at 512 px or higher.
- The bundled Radiance HDR loaded as floating-point image data and retained a high dynamic range (`max > 10`).
- The graphics upgrade changes only the renderer/assets/CSS documentation. Canonical model structures, backend routes and workflow components were not modified.
- Source tree contains no `.env`, `node_modules` or `.next` output.

## Build limitation

A complete `npm ci`, `npm run typecheck` and `npm run build` could not be executed against the real dependency packages in this environment. The internal npm mirror returned `404` for `undici-types@6.21.0` and did not provide the requested Three.js package endpoint.

Deployment CI must run:

```bash
npm ci
npm run typecheck
npm run build
```

The source package therefore includes parser and asset validation, but does not claim a completed real Next.js production build in this packaging environment.
