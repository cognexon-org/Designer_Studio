# PropertyTour360 Designer Studio v3.2.1

## Corrected realistic asset release

This patch preserves the v3.2 Studio workflows, API contracts, canonical model schema, editing tools, evidence review, exports, approvals, sharing, lighting, PBR materials, HDR environment, SSAO and persistent renderer architecture.

### Graphics corrections

- Replaced the original bundled catalogue with 21 validated Y-up, metre-based GLB assets.
- Removed destructive independent X/Y/Z asset scaling.
- Added uniform contain scaling so circular and curved components retain their proportions.
- Corrected the sample model to the existing `[width, depth, height]` furniture-size contract.
- Added dedicated assets and routing for dining chairs, task chairs, study desks, passage consoles, queen beds and short return counters.
- Corrected sample orientations and dimensions for counters, wardrobes, vanities, WC fixtures, desks and other directional assets.
- Added a dedicated emissive linen material for the arc-lamp shade.
- Preserved authored external catalogue materials; local bundled assets continue to receive the Studio's PBR material system.

No backend route, public share, model schema or workflow behavior was changed.
