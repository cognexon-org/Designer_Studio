# Designer Studio graphics upgrade v3.2.1

This release changes the visual rendering layer only. Capture review, canonical-model editing, backend APIs, approvals, exports, sharing, evidence handling and safety rules remain unchanged.

## Rendering architecture

`components/ScenePreview.tsx` now keeps one renderer, camera, controls, post-processing chain and environment alive for the selected quality profile. Room groups are rebuilt only when their room model, ceiling state or hidden-wall state changes. Selection and transform changes do not recreate the WebGL renderer.

Quality profiles:

- **HIGH** — device pixel ratio up to 2, 4096 directional shadow map, selective room-light shadows, SSAO, SMAA and ACES output.
- **MEDIUM** — device pixel ratio up to 1.5, 2048 directional shadow map and SSAO.
- **LOW** — device pixel ratio 1, no expensive post-processing or dynamic shadows; all editing remains available.

## Bundled local asset pack

`public/assets/realistic/` contains:

- 21 compact Y-up GLB assets: sofa, lounge chair, dining chair, task chair, coffee table, dining table, study desk, king bed, queen bed, wardrobe, nightstand, passage console, TV unit, long/short kitchen counters, refrigerator, vanity, WC, shower, plant and lamp.
- Assets are metre-based and fitted with one uniform scale value. This preserves circles, curves and authored proportions.
- 9 PBR material sets with base-colour, normal, roughness and ambient-occlusion maps: oak, walnut, marble, tile, plaster, sand fabric, charcoal fabric, rug and brushed metal.
- A local 1K Radiance HDR environment for neutral daylight reflections and fill.
- A deterministic exterior city image used behind generated windows.

The assets were created for this package and can be used with this source release. See `public/assets/realistic/ASSET_MANIFEST.json`.

## Automatic catalogue resolution

Existing canonical-model objects do not need to be changed. When `assetUrl` is absent, the renderer maps the existing object type and name to a local GLB. Examples:

- `SOFA`, `TV_UNIT`, `PLANT` and `LAMP` map directly.
- Chair names distinguish lounge, dining and task/office assets.
- Bed names distinguish king/general and queen assets.
- A `TABLE` named coffee/low table maps to the coffee table; desk/study names map to the desk; other tables map to the dining table.
- `CABINET` names are resolved to refrigerator, wardrobe, long/short kitchen counter, vanity, passage console or nightstand.
- `CUSTOM` objects containing WC/toilet or shower map to the matching bathroom asset.

Explicit backend/catalogue `assetUrl` values still take priority.

## Material and architecture improvements

- Floors now use `room.floorId`; the former hard-coded oak floor has been removed.
- Walls use a plaster normal/roughness/AO set with colour tinting.
- Furniture materials use object-specific fabric, wood, metal, ceramic, glass, mirror and emissive responses.
- Shared room boundaries are visually offset toward each room to reduce overlapping faces and z-fighting.
- Windows include frames, sill, glass, deterministic exterior imagery and optional curtains.
- Room-centred warm fill lights improve enclosed interiors without replacing the daylight rig.
- The directional shadow frustum is fitted to the active model or isolated room instead of covering a fixed 50 m box.
- Ambient occlusion adds restrained contact depth at wall/floor junctions and beneath furniture.

## Production asset guidance

The bundled GLBs are compact interactive assets designed to make the package work offline. Supplier catalogue models can continue to use `assetUrl`, Draco, Meshopt and KTX2. For final catalogue deployment, preserve real-world dimensions, use UV-unwrapped models, provide LODs, and keep texture sets compressed for the target devices.

High-quality interactive Three.js output is not a substitute for construction verification. Geometry status, measurement provenance and structural disclaimers are unchanged.
