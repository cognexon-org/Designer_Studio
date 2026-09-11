export type Point2 = [number, number];
export type Point3 = [number, number, number];
export type StructuralStatus = 'UNKNOWN' | 'NON_STRUCTURAL' | 'STRUCTURAL';
export type OpeningType = 'DOOR' | 'WINDOW' | 'OPENING';
export type VerificationStatus = 'UNCONFIRMED' | 'DESIGNER_CONFIRMED' | 'SITE_VERIFIED';
export type StudioWorkspace = 'REVIEW' | 'SHELL' | 'DESIGN' | 'PRESENT';
export type CameraMode = 'ORBIT' | 'TOP' | 'FRONT' | 'SIDE' | 'WALKTHROUGH';
export type TransformMode = 'translate' | 'rotate' | 'scale';
export type PlanTool = 'SELECT' | 'PAN' | 'DRAW_ROOM' | 'MEASURE';
export type ExportFormat = 'CANONICAL_JSON' | 'GLB' | 'GLB_LOW' | 'GLB_FULL' | 'SVG' | 'DXF' | 'PDF' | 'PNG' | 'JPEG' | 'CSV' | 'XLSX' | 'BOQ_CSV' | 'BOQ_XLSX' | 'MEASUREMENT_REPORT' | 'DOOR_WINDOW_SCHEDULE' | 'MATERIAL_SCHEDULE';

export interface MeasurementModel {
  id?: string;
  label: string;
  valueM: number;
  unit?: 'm';
  start?: Point2;
  end?: Point2;
  method?: string;
  toleranceM?: number;
  verificationStatus?: string;
  evidenceRefs?: string[];
  capturedAt?: string;
}

export interface OpeningModel {
  id: string;
  type: OpeningType;
  offsetM: number;
  widthM: number;
  heightM: number;
  bottomM?: number;
  sillM?: number;
  confidence?: number;
  uncertaintyM?: number;
  evidenceRefs?: string[];
  swing?: string;
  direction?: string;
  verificationStatus?: string;
}

export interface UnplacedOpeningProposal {
  id: string;
  type: OpeningType;
  widthM: number;
  heightM: number;
  bottomM?: number;
  sillM?: number;
  placementStatus?: 'UNPLACED' | 'ACCEPTED_FOR_PLACEMENT';
  proposalStatus?: string;
  confidence?: number;
  evidenceRefs?: string[];
}

export interface WallModel {
  id: string;
  start: Point2;
  end: Point2;
  heightM?: number;
  thicknessM: number;
  material?: string;
  materialId?: string;
  structuralStatus: StructuralStatus;
  openings: OpeningModel[];
  confidence?: number;
  uncertaintyM?: number;
  evidenceRefs?: string[];
  verificationStatus?: string;
  lockedAngle?: boolean;
  lockedLengthM?: number;
}

export interface FurnitureObject {
  id: string;
  type: 'SOFA' | 'BED' | 'TABLE' | 'CHAIR' | 'CABINET' | 'TV_UNIT' | 'PLANT' | 'LAMP' | 'RUG' | 'CUSTOM';
  name: string;
  position: Point2;
  elevationM?: number;
  size: [number, number, number];
  rotationY: number;
  material?: string;
  materialId?: string;
  materialVariant?: string;
  assetUrl?: string;
  catalogueId?: string;
  catalogueAssetId?: string;
  productId?: string;
  variantId?: string;
  sku?: string;
  supplier?: string;
  price?: number;
  currency?: string;
  priceVersion?: string;
  availability?: string;
  existingStatus?: 'EXISTING' | 'NEW' | 'REMOVE';
  visible?: boolean;
  locked?: boolean;
  groupId?: string;
  clearanceM?: number;
}

/** Equirectangular capture produced by the Mode A stitcher, linked to a room. */
/** A stitched Mode A panorama as listed by GET /v1/panoramas. */
export interface PanoramaAsset {
  assetId: string; captureId: string; roomId: string | null; roomName: string | null;
  propertyName: string | null; unitLabel: string | null; status: string;
  mimeType?: string; qaScore: number | null; createdAt: string;
}

export interface RoomPanorama { roomId: string; url: string; capturedAt?: string; }

export interface RoomModel {
  id: string;
  name: string;
  heightM: number;
  floorPolygon: Point2[];
  walls: WallModel[];
  objects: (FurnitureObject | Record<string, unknown>)[];
  /** Mode A capture linked to this room; persisted with the model so every
      version and the walkthrough agree on which photograph belongs here. */
  panoramaUrl?: string;
  panoramaAssetId?: string;
  floorId?: string;
  roomType?: string;
  scaleStatus?: string;
  verificationStatus?: string;
  confidence?: number;
  evidenceRefs?: string[];
  sourceTier?: string;
  evidenceSummary?: Record<string, unknown>;
  geometryProposals?: Record<string, unknown>;
  sensorProposal?: Record<string, unknown>;
  constraintOptimization?: Record<string, unknown>;
  quality?: { issues?: GeometryIssue[]; requiresDesignerCorrection?: boolean; estimatedUncertaintyM?: number } | Record<string, unknown>;
  unplacedOpenings?: UnplacedOpeningProposal[];
  unplacedOpeningProposals?: UnplacedOpeningProposal[];
  measurements?: MeasurementModel[];
  transform?: { originM?: Point2; rotationDegrees?: number; elevationM?: number } | Record<string, unknown>;
  ceilingProfile?: Record<string, unknown>;
}

export interface DesignModel {
  schemaVersion?: string;
  units: 'meters';
  coordinateSystem?: string;
  structure?: { id?: string; globalOrientationDegrees?: number; captureSourceIds?: string[]; bounds?: Record<string, unknown> } | Record<string, unknown>;
  floors?: { id: string; name: string; elevationM: number; roomIds: string[]; transform?: Record<string, unknown> }[];
  rooms: RoomModel[];
  metadata?: Record<string, unknown>;
}

export interface DesignVersion { id: string; version: number; model: DesignModel; label?: string | null; notes?: string | null; createdAt: string; }
export interface DesignOption { id: string; projectId: string; name: string; description?: string | null; model: DesignModel; createdAt: string; updatedAt?: string; }
export interface PropertySummary { id: string; name: string; address: string; propertyType: string; }
export interface UnitSummary { id: string; label: string; property: PropertySummary; }
export interface CaptureSummary { id: string; mode: 'PROPERTY_TOUR' | 'DESIGN_SCAN'; status: string; platform: string; unit: UnitSummary; rooms?: unknown[]; assets?: AssetSummary[]; capturePackages?: CapturePackageSummary[]; createdAt: string; }

export interface AssetSummary {
  id: string;
  roomId?: string | null;
  kind: string;
  mimeType: string;
  status: string;
  objectKey?: string;
  sizeBytes?: number | string;
  url?: string;
  metadata?: Record<string, unknown> | null;
}
export interface CapturePackageSummary { id: string; roomId: string; schemaVersion: string; status: string; checksumVerified: boolean; keyframeCount: number; quality?: Record<string, unknown> | null; }
export interface GeometryIssue { roomId?: string; elementId?: string; code: string; severity: 'ERROR' | 'WARNING' | 'INFO'; message?: string; [key: string]: unknown; }
export interface GeometryReport { valid?: boolean; status?: string; processorVersion?: string; roomCount?: number; errorCount?: number; warningCount?: number; issues?: GeometryIssue[]; requiresDesignerCorrection?: boolean; requiresSiteVerificationForFabrication?: boolean; [key: string]: unknown; }
export interface GeometryProposal { id: string; roomId: string; proposalType: string; geometry: Record<string, unknown>; confidence: number; uncertaintyM?: number | null; evidenceRefs?: string[]; processorVersion?: string; status?: string; createdAt?: string; }
export interface EvidenceResponse { expiresInSeconds: number; assets: AssetSummary[]; packages: CapturePackageSummary[]; proposals: GeometryProposal[]; geometryReport?: GeometryReport | null; }

export interface ProcessingJob { id: string; type: string; status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'; progress: number; output?: Record<string, unknown> | null; error?: string | null; createdAt: string; }
export interface DesignComment { id: string; body: string; elementId?: string | null; createdAt: string; resolvedAt?: string | null; }
export interface DesignApproval { id: string; version: number; decision: string; name?: string | null; contact?: string | null; note?: string | null; createdAt: string; }
export interface ModelReview { id: string; version: number; decision: string; notes?: string | null; verificationStatus?: string; createdAt: string; }
export interface ClientShareLink { id: string; slug: string; url?: string; version: number; designOptionId?: string | null; permissions?: Record<string, unknown>; expiresAt?: string | null; revokedAt?: string | null; createdAt: string; }
export interface ExportRecord { id: string; projectId: string; designOptionId?: string | null; version: number; format: string; status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'; mimeType?: string | null; sizeBytes?: number | string | null; metadata?: Record<string, unknown> | null; error?: string | null; createdAt: string; completedAt?: string | null; }


export interface VisualAssetLod {
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  objectKey?: string;
  url?: string;
  maxDistanceM?: number;
  maxTriangles?: number;
}

export interface VisualAssetContract {
  fit: 'UNIFORM_CONTAIN' | 'EXACT_SIZE' | 'NATIVE';
  coordinateSystem: 'Y_UP' | 'Z_UP';
  unit: 'metre' | 'centimetre' | 'millimetre';
  lods: VisualAssetLod[];
  collision: {
    shape: 'BOX' | 'SPHERE' | 'CYLINDER' | 'CONVEX';
    boundsM?: { width: number; depth: number; height: number };
    centerM?: [number, number, number];
  };
  castShadow: boolean;
  receiveShadow: boolean;
  tags: string[];
}

export interface VisualRegistryAsset {
  id: string;
  name: string;
  category: string;
  dimensionsM: Record<string, number>;
  anchor?: Record<string, unknown> | null;
  placementRules?: Record<string, unknown> | null;
  polygonCount?: number | null;
  textureBytes?: number | string | null;
  thumbnailUrl?: string | null;
  primaryUrl?: string;
  visual: VisualAssetContract;
}

export interface VisualRegistryMaterial {
  id: string;
  name: string;
  category: string;
  supplier?: string | null;
  sku?: string | null;
  textureSet: Partial<Record<'baseColor' | 'normal' | 'roughness' | 'metallic' | 'ao' | 'height' | 'emissive' | 'opacity', string>>;
  physical?: Record<string, unknown> | null;
  realWorldSizeM?: Record<string, number> | null;
  costPerUnit?: number | null;
  unit?: string | null;
}

export interface VisualRegistry {
  version: string;
  expiresInSeconds: number;
  generatedAt: string;
  assets: VisualRegistryAsset[];
  materials: VisualRegistryMaterial[];
}

export interface CatalogueAsset { id: string; name: string; category: string; glbObjectKey: string; thumbnailKey?: string | null; dimensionsM: Record<string, number>; anchor?: Record<string, unknown>; placementRules?: Record<string, unknown>; polygonCount?: number | null; textureBytes?: number | string | null; metadata?: Record<string, unknown> | null; }
export interface MaterialRecord { id: string; name: string; category: string; supplier?: string | null; sku?: string | null; textureSet?: Record<string, unknown> | null; physical?: Record<string, unknown> | null; realWorldSizeM?: Record<string, number> | null; costPerUnit?: number | null; unit?: string | null; }
export interface ProductVariant { id: string; name: string; materialId?: string | null; price?: number | null; currency?: string | null; priceVersion?: string | null; availability?: string | null; metadata?: Record<string, unknown> | null; }
export interface ProductRecord { id: string; sku: string; name: string; category: string; supplier?: string | null; catalogueAssetId?: string | null; metadata?: Record<string, unknown> | null; variants: ProductVariant[]; }

export interface DesignProject {
  panoramas?: RoomPanorama[];
  id: string; unitId: string; captureId: string; name: string;
  status: string; geometryStatus?: string; verificationStatus?: VerificationStatus | string;
  geometryReport?: GeometryReport | null; slug: string; activeVersion: number; model: DesignModel;
  generatedGlbKey?: string | null; publicManifest?: PublicDesignManifest | null; unit: UnitSummary; capture?: CaptureSummary;
  versions: DesignVersion[]; jobs?: ProcessingJob[]; comments?: DesignComment[]; approvals?: DesignApproval[];
  options?: DesignOption[]; reviews?: ModelReview[]; exports?: ExportRecord[]; shareLinks?: ClientShareLink[];
  createdAt: string; updatedAt: string;
}

export interface PublicDesignManifest { version: string; type: 'DESIGN_CONCEPT'; projectId: string; slug: string; name: string; modelUrl: string; property: { name: string; address: string; unitLabel: string }; disclaimer: string; verificationStatus?: string; geometryStatus?: string; rooms?: { id: string; name: string; heightM: number }[]; }
export interface PublicShareDesign { id: string; slug: string; version: number; permissions: Record<string, unknown>; project: { id: string; name: string; verificationStatus: string; geometryStatus: string }; property: { name: string; address: string; unitLabel: string }; model: DesignModel; disclaimer: string; }

export type Selection =
  | { kind: 'ROOM'; roomId: string }
  | { kind: 'VERTEX'; roomId: string; vertexIndex: number }
  | { kind: 'WALL'; roomId: string; wallId: string }
  | { kind: 'OPENING'; roomId: string; wallId: string; openingId: string }
  | { kind: 'OBJECT'; roomId: string; objectId: string }
  | null;

// ProgressionAi spatial-temporal project types. These sit beside the existing
// DesignProject model so Mode A, Mode B and design versions can share one
// persistent property/floor/room identity without breaking legacy Studio flows.
export interface SpatialFloorSummary {
  id: string;
  projectId: string;
  name: string;
  level?: number | null;
  elevationM?: number | null;
  transform?: Record<string, unknown> | null;
}

export interface SpatialRoomSummary {
  id: string;
  projectId: string;
  floorId?: string | null;
  name: string;
  roomType?: string | null;
  sortOrder: number;
  canonicalFrame?: Record<string, unknown> | null;
  canonicalGeometry?: Record<string, unknown> | null;
}

export interface ProgressDesignProjectSummary {
  id: string;
  name: string;
  status: string;
  slug: string;
  activeVersion: number;
  updatedAt: string;
}

export interface ProgressCaptureRoom {
  id: string;
  captureId: string;
  name: string;
  sortOrder: number;
  panoramaAssetId?: string | null;
  spatialRoomId?: string | null;
  ceilingHeightM?: number | null;
  spatialRoom?: SpatialRoomSummary | null;
}

export interface ProgressCaptureAsset {
  id: string;
  roomId?: string | null;
  spatialRoomId?: string | null;
  kind: string;
  mimeType?: string;
  status: string;
  sizeBytes?: number | string;
  metadata?: Record<string, unknown> | null;
  quality?: Record<string, unknown> | null;
  createdAt: string;
}


export interface ProgressCaptureUpload {
  id: string;
  roomId?: string | null;
  assetId: string;
  filename: string;
  kind: string;
  status: string;
  uploadedBytes: number | string;
  totalSizeBytes: number | string;
  totalParts: number;
  completedAt?: string | null;
  updatedAt: string;
}

export interface CaptureSnapshot {
  id: string;
  projectId: string;
  captureId: string;
  floorId?: string | null;
  capturedAt: string;
  sourceType: 'PROPERTY_TOUR' | 'DESIGN_SCAN' | string;
  status: string;
  spatialScope?: Record<string, unknown> | null;
  qualityReport?: Record<string, unknown> | null;
  processingVersion?: string | null;
  reconstructionVersion?: string | null;
  floor?: SpatialFloorSummary | null;
  capture: {
    id: string;
    mode: 'PROPERTY_TOUR' | 'DESIGN_SCAN';
    status: string;
    platform: string;
    startedAt?: string | null;
    createdAt: string;
    rooms: ProgressCaptureRoom[];
    assets: ProgressCaptureAsset[];
    resumableUploads?: ProgressCaptureUpload[];
    designProjects?: ProgressDesignProjectSummary[];
    jobs?: ProcessingJob[];
  };
}

export interface CaptureRegistration {
  id: string;
  projectId: string;
  sourceSnapshotId: string;
  targetSnapshotId: string;
  transform: Record<string, unknown>;
  overlap?: number | null;
  confidence: number;
  method: string;
  version: string;
  status: string;
  verifiedById?: string | null;
  createdAt: string;
}

export interface ProjectIssue {
  id: string;
  projectId: string;
  spatialRoomId?: string | null;
  captureSnapshotId?: string | null;
  spatialRef?: Record<string, unknown> | null;
  title: string;
  description?: string | null;
  status: string;
  severity: string;
  assigneeId?: string | null;
  verification?: string | null;
  evidenceRefs?: string[] | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiObservation {
  id: string;
  projectId: string;
  sourceSnapshotId?: string | null;
  targetSnapshotId?: string | null;
  spatialRoomId?: string | null;
  observationType: string;
  spatialRef?: Record<string, unknown> | null;
  structuredEvidence: Record<string, unknown>;
  confidence: number;
  modelVersion?: string | null;
  policyVersion?: string | null;
  status: 'PROPOSED' | 'CONFIRMED' | 'REJECTED' | 'CORRECTED' | string;
  createdAt: string;
}

export interface ProgressProjectSummary {
  id: string;
  unitId: string;
  name: string;
  status: string;
  captureCadence?: string | null;
  unit: UnitSummary;
  floors: SpatialFloorSummary[];
  rooms: SpatialRoomSummary[];
  _count?: { snapshots: number; issues: number; observations: number };
  createdAt: string;
  updatedAt: string;
}

export interface ProgressProject extends ProgressProjectSummary {
  snapshots: CaptureSnapshot[];
  registrations: CaptureRegistration[];
  issues: ProjectIssue[];
  observations: AiObservation[];
}
