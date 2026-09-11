# PropertyTour360 Designer Studio v3.2.1

Unified Mode B browser Studio for `PropertyTour360_Backend_Unified_Final_v3.1.0`.

## Product workflow

1. **Capture Review** — inspect signed RGB keyframes, ARCore depth/confidence data, fused PLY point-cloud evidence, package checksums and geometry proposals.
2. **Shell Correction** — edit arbitrary polygons, vertices, walls, lengths, offsets, openings, ceiling height and measurement constraints in synchronized 2D/3D views.
3. **Interior Design** — place procedural or catalogue products, use exact transforms, PBR materials, GLB assets, collision warnings and product metadata.
4. **Presentation** — prepare camera views, generate local screenshots or queued server renders/exports, create design options, comments, approvals and expiring client links.

The canonical JSON model remains authoritative. GLB, PDF, DXF, images, video and schedules are derived outputs. Sensor proposals remain drafts until accepted and reviewed by a designer.

## Major capabilities

- Real capture-derived project models; no sample model is used for backend projects.
- Signed evidence viewer for RGB, Depth16, confidence and fused PLY point clouds.
- Accept/reject geometry proposals with versioned backend updates.
- Persistent Three.js renderer with room-level incremental rebuilds, local GLB asset caching and selection-safe updates.
- Bundled corrected Y-up GLB furniture catalogue with automatic type/name mapping, uniform proportion-preserving fitting and detailed procedural fallbacks.
- Bundled full PBR material sets (base colour, normal, roughness and AO) for timber, stone, tile, plaster, fabric, rug and metal.
- Local HDR environment lighting, fitted 4K/2K soft shadows, room fill lights, ACES tone mapping and SSAO/SMAA post-processing.
- Optional Draco, Meshopt and KTX2 catalogue asset support.
- Arbitrary room polygons, L-shaped/free-form rooms, draggable vertices and wall splitting.
- Wall offset, length, thickness, structural status and material editing.
- Multiple doors, windows and passages with offset, sill, size and door swing.
- Pan/zoom 2D plan, dimensions, wall angles, grid controls and floor filtering.
- 3D semantic selection, transform gizmos, orbit/top/front/side/walkthrough cameras.
- Room isolation, ceiling toggle, selected-wall visibility and viewport screenshots.
- Products, catalogue assets and material APIs from the unified backend.
- Named design options, comments, resolution, reviews, approvals and share links.
- Server jobs for GLB, JSON, SVG, DXF, PDF, PNG/JPEG, CSV/XLSX, BOQ and schedules.
- Server still, panorama and walkthrough render requests.
- Client presentation route `/d/{slug}` with element comments and approval decisions.
- Immutable model versions and optimistic concurrency protection.

## Requirements

- Node.js 22+
- npm 10+
- PropertyTour360 unified backend v3.1.0
- A WebGL 2-capable browser; the application keeps 2D and server-export fallbacks available.

## Setup

```bash
cp .env.example .env.local
npm ci
npm run typecheck
npm run build
npm run dev
```

Open `http://localhost:3002`.

The default API base URL is `http://localhost:3000`. Configure `NEXT_PUBLIC_API_BASE_URL` for other deployments.

## Compression decoders

Meshopt support is built into Three.js. Draco and KTX2 support is enabled when the optional decoder paths are configured. Copy the official decoder assets into `public/decoders/draco` and `public/decoders/basis` before enabling those variables.

## Safety and trust

- Geometry proposals are visibly labelled and require designer review.
- Draft source evidence remains private.
- Client links require designer-confirmed or site-verified geometry.
- Publishing is blocked by backend QA and confirmation rules.
- Structural work, fabrication dimensions, services and regulatory compliance require qualified professional verification.

See `docs/GRAPHICS_UPGRADE_v3.2.md`, `docs/UNIFIED_BACKEND_CONTRACT.md`, `docs/STUDIO_IMPLEMENTATION_MATRIX.md` and `RELEASE_VALIDATION.md`.
