# Release validation

Completed in the packaging environment:

- **28/28** application `.ts` and `.tsx` files passed TypeScript parser/transpilation diagnostics.
- Strict semantic TypeScript checking passed using local declaration stubs for the unavailable npm packages.
- Canonical-model smoke test passed for L-shaped geometry, wall splitting, opening placement and validation.
- **18/18** unified-backend route families used by the Studio were found in the supplied backend v3.1.0 source.
- Backend-connected project creation uses the selected Mode B capture; the sample model is limited to the explicit local demo route.
- Source tree contains no `.env`, `node_modules`, `.next`, IDE cache or local workspace state.
- ZIP integrity and release checksum verification passed after packaging.

## Build limitation

A complete `npm ci`, `npm run typecheck` and `npm run build` could not be executed against the real dependency packages in this environment because the internal npm mirror did not contain `undici-types@6.21.0`. The source passed parser and semantic checks, but CI must still run the real Next.js production build before deployment:

```bash
npm ci
npm run typecheck
npm run build
```
