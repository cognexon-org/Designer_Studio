# Designer Studio v3.1.0 implementation matrix

| Improvement area | Implementation |
|---|---|
| Capture Review workbench | Signed RGB, depth/confidence decoder, PLY viewer, package validation and proposals |
| Shell correction | Polygon/vertex editing, wall length/offset/split, openings, ceiling height, measurements |
| Multi-floor support | Floor filter and canonical floor associations |
| 2D tools | Pan, zoom, selectable grid, dimensions, angles, furniture and opening dragging |
| 3D tools | Semantic ray selection, transform gizmo, five camera modes, isolation and wall visibility |
| Persistent renderer | Renderer/cameras remain alive; changed room groups rebuild incrementally |
| Asset pipeline | Procedural fallback plus cached external GLB; optional Meshopt/Draco/KTX2 |
| PBR rendering | Environment lighting, ACES, physical materials, glass and soft shadows |
| Catalogue | Product/material/catalogue API search and placement |
| Versions/options | Immutable versions, restore-as-edit and named design options |
| Collaboration | Element comments, resolve, review decisions and client approvals |
| Client delivery | Expiring/revocable links, canonical interactive viewer, comments and approvals |
| Exports | All unified backend export formats and render modes exposed |
| Trust controls | QA display, confirmation gates, disclaimers and private draft workflow |
