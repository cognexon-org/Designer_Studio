# Unified backend contract

This Studio targets `PropertyTour360_Backend_Unified_Final_v3.1.0` only.

Primary APIs used:

- `/v1/design-projects` and `/v1/design-projects/{id}`
- `/v1/design-projects/{id}/model`
- `/v2/design-projects/{id}/evidence`
- `/v2/models/{id}/proposals`
- `/v2/models/{id}/measurements`
- `/v2/captures/{captureId}/geometry-jobs`
- `/v2/design-projects/{id}/model-qa`
- `/v2/design-projects/{id}/reviews`
- `/v2/design-projects/{id}/options`
- `/v2/design-projects/{id}/comments`
- `/v2/design-projects/{id}/share-links`
- `/v2/design-projects/{id}/exports`
- `/v2/design-projects/{id}/renders`
- `/v2/catalogue/assets`, `/v2/products`, `/v2/materials`
- `/v2/public/design-links/{slug}`

The Studio expects canonical model schema 2.1 and Capture Package schema 2.1 evidence produced by the Android v3.1.0 app.
