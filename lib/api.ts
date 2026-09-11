import { clearToken, getApiBase, getToken } from './auth';
import type {
  CaptureSummary, CatalogueAsset, ClientShareLink, DesignComment, DesignModel, DesignOption, DesignProject,
  EvidenceResponse, ExportFormat, ExportRecord, GeometryProposal, MaterialRecord, MeasurementModel, ModelReview,
  ProcessingJob, ProductRecord, PublicDesignManifest, PublicShareDesign, PanoramaAsset,
  ProgressProject, ProgressProjectSummary, CaptureSnapshot, ProjectIssue, VisualRegistry } from './types';

export class ApiError extends Error {
  constructor(public status: number, public payload: unknown) {
    super(typeof payload === 'object' && payload && 'error' in payload ? String((payload as { error: unknown }).error) : `Request failed (${status})`);
  }
}

async function parsePayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (response.status === 204) return null;
  if (contentType.includes('application/json')) return response.json().catch(() => null);
  return response.text().catch(() => null);
}

async function request<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (authenticated) {
    const token = getToken();
    if (token) headers.set('authorization', `Bearer ${token}`);
  }
  const response = await fetch(`${getApiBase()}${path}`, { ...init, headers, cache: 'no-store' });
  const payload = await parsePayload(response);
  if (!response.ok) {
    if (response.status === 401) clearToken();
    throw new ApiError(response.status, payload);
  }
  return payload as T;
}

export function absoluteAppUrl(path: string): string {
  if (typeof window === 'undefined') return path;
  return new URL(path, window.location.origin).toString();
}

export const api = {
  requestOtp: (phone: string) => request<{ requested: true; expiresInSeconds: number; developmentOtp?: string }>('/v1/auth/otp/request', { method: 'POST', body: JSON.stringify({ phone }) }, false),
  verifyOtp: (phone: string, code: string, name?: string) => request<{ token: string; user: { id: string; name?: string; role: string; organization: { name: string } } }>('/v1/auth/otp/verify', { method: 'POST', body: JSON.stringify({ phone, code, name }) }, false),
  me: () => request<{ id: string; name?: string; phone: string; role: string; organization: { name: string } }>('/v1/me'),
  listProgressProjects: () => request<ProgressProjectSummary[]>('/v2/progress-projects'),
  getProgressProject: (projectId: string) => request<ProgressProject>(`/v2/progress-projects/${projectId}`),
  getProgressTimeline: (projectId: string) => request<CaptureSnapshot[]>(`/v2/progress-projects/${projectId}/timeline`),
  createProgressIssue: (projectId: string, body: { title: string; description?: string; severity?: string; spatialRoomId?: string; captureSnapshotId?: string }) =>
    request<ProjectIssue>(`/v2/progress-projects/${projectId}/issues`, { method: 'POST', body: JSON.stringify(body) }),
  listProjects: () => request<DesignProject[]>('/v1/design-projects'),
  getProject: (projectId: string) => request<DesignProject>(`/v1/design-projects/${projectId}`),
  listCaptures: () => request<CaptureSummary[]>('/v1/captures'),
  createProject: (captureId: string, name: string) => request<DesignProject & { geometryJobId?: string }>('/v1/design-projects', { method: 'POST', body: JSON.stringify({ captureId, name, generateGeometry: true }) }),
  updateModel: (projectId: string, model: DesignModel, notes?: string, expectedVersion?: number, label?: string) => request<DesignProject>(`/v1/design-projects/${projectId}/model`, { method: 'PUT', body: JSON.stringify({ model, notes, expectedVersion, label }) }),
  generateGeometry: (projectId: string) => request<{ jobId: string }>(`/v1/design-projects/${projectId}/generate-geometry`, { method: 'POST' }),
  runGeometryStages: (captureId: string, projectId: string, stages?: string[]) => request<{ jobId: string; stages: string[] }>(`/v2/captures/${captureId}/geometry-jobs`, { method: 'POST', body: JSON.stringify({ projectId, stages }) }),
  confirmModel: (projectId: string, status: 'DESIGNER_CONFIRMED' | 'SITE_VERIFIED', note?: string) => request<DesignProject>(`/v1/design-projects/${projectId}/confirm`, { method: 'POST', body: JSON.stringify({ status, note }) }),
  submitReview: (projectId: string, decision: 'DESIGNER_CONFIRMED' | 'SITE_VERIFIED' | 'CHANGES_REQUIRED', notes?: string) => request<ModelReview>(`/v2/design-projects/${projectId}/reviews`, { method: 'POST', body: JSON.stringify({ decision, notes }) }),
  runModelQa: (projectId: string) => request<{ jobId: string }>(`/v2/design-projects/${projectId}/model-qa`, { method: 'POST' }),
  listPanoramas: () => request<PanoramaAsset[]>('/v1/panoramas'),
  getCaptureAssetUrl: (captureId: string, assetId: string) =>
    request<{ url: string; expiresInSeconds: number }>(`/v1/captures/${captureId}/assets/${assetId}/download-url`),
  getEvidence: (projectId: string) => request<EvidenceResponse>(`/v2/design-projects/${projectId}/evidence`),
  listProposals: (projectId: string) => request<GeometryProposal[]>(`/v2/models/${projectId}/proposals`),
  decideProposal: (projectId: string, proposalId: string, decision: 'ACCEPT' | 'REJECT', note?: string) => request<GeometryProposal>(`/v2/models/${projectId}/proposals/${proposalId}/decision`, { method: 'POST', body: JSON.stringify({ decision, note }) }),
  listMeasurements: (projectId: string) => request<(MeasurementModel & { roomId: string })[]>(`/v2/models/${projectId}/measurements`),
  addMeasurement: (projectId: string, roomId: string, measurement: MeasurementModel) => request(`/v2/models/${projectId}/measurements`, { method: 'POST', body: JSON.stringify({ roomId, measurement }) }),
  generateShell: (projectId: string) => request<{ jobId: string }>(`/v1/design-projects/${projectId}/generate-shell`, { method: 'POST' }),
  getJob: (jobId: string) => request<ProcessingJob>(`/v1/jobs/${jobId}`),
  getGeometryJob: (jobId: string) => request<ProcessingJob>(`/v2/geometry-jobs/${jobId}`),
  publishProject: (projectId: string) => request<DesignProject & { publicUrl: string }>(`/v1/design-projects/${projectId}/publish`, { method: 'POST' }),
  unpublishProject: (projectId: string) => request<DesignProject>(`/v1/design-projects/${projectId}/unpublish`, { method: 'POST' }),
  listOptions: (projectId: string) => request<DesignOption[]>(`/v2/design-projects/${projectId}/options`),
  createOption: (projectId: string, name: string, description?: string, model?: DesignModel) => request<DesignOption>(`/v2/design-projects/${projectId}/options`, { method: 'POST', body: JSON.stringify({ name, description, model }) }),
  listComments: (projectId: string) => request<DesignComment[]>(`/v2/design-projects/${projectId}/comments`),
  addComment: (projectId: string, body: string, elementId?: string) => request<DesignComment>(`/v1/design-projects/${projectId}/comments`, { method: 'POST', body: JSON.stringify({ body, elementId }) }),
  resolveComment: (projectId: string, commentId: string) => request<DesignComment>(`/v2/design-projects/${projectId}/comments/${commentId}/resolve`, { method: 'POST' }),
  createShareLink: (projectId: string, designOptionId?: string, expiresAt?: string, permissions = { view: true, comment: true, approve: true }) => request<ClientShareLink & { url: string }>(`/v2/design-projects/${projectId}/share-links`, { method: 'POST', body: JSON.stringify({ designOptionId, expiresAt, permissions }) }),
  revokeShareLink: (projectId: string, linkId: string) => request<ClientShareLink>(`/v2/design-projects/${projectId}/share-links/${linkId}/revoke`, { method: 'POST' }),
  listExports: (projectId: string) => request<ExportRecord[]>(`/v2/design-projects/${projectId}/exports`),
  createExport: (projectId: string, format: ExportFormat, designOptionId?: string, version?: number, settings?: Record<string, unknown>) => request<{ exportId: string; jobId: string }>(`/v2/design-projects/${projectId}/exports`, { method: 'POST', body: JSON.stringify({ format, designOptionId, version, settings }) }),
  createRender: (projectId: string, quality: 'PREVIEW' | 'FINAL', mode: 'STILL' | 'PANORAMA' | 'WALKTHROUGH', designOptionId?: string, settings?: Record<string, unknown>) => request<{ renderId: string; jobId: string }>(`/v2/design-projects/${projectId}/renders`, { method: 'POST', body: JSON.stringify({ quality, mode, designOptionId, settings }) }),
  getExportUrl: (exportId: string) => request<{ url: string; expiresInSeconds: number; mimeType: string; format: string }>(`/v2/exports/${exportId}/download-url`),
  listCatalogueAssets: (q?: string, category?: string) => request<CatalogueAsset[]>(`/v2/catalogue/assets?${new URLSearchParams({ ...(q ? { q } : {}), ...(category ? { category } : {}) }).toString()}`),
  getVisualRegistry: (category?: string) => request<VisualRegistry>(`/v2/visual-registry?${new URLSearchParams(category ? { category } : {}).toString()}`),
  listProducts: (q?: string, category?: string) => request<ProductRecord[]>(`/v2/products?${new URLSearchParams({ ...(q ? { q } : {}), ...(category ? { category } : {}) }).toString()}`),
  listMaterials: (q?: string, category?: string) => request<MaterialRecord[]>(`/v2/materials?${new URLSearchParams({ ...(q ? { q } : {}), ...(category ? { category } : {}) }).toString()}`),
  getPublicDesign: (slug: string) => request<PublicDesignManifest>(`/v1/public/designs/${slug}/manifest`, {}, false),
  getPublicShareDesign: (slug: string) => request<PublicShareDesign>(`/v2/public/design-links/${slug}`, {}, false),
  submitPublicApproval: (slug: string, decision: 'APPROVED' | 'CHANGES_REQUESTED', name?: string, contact?: string, note?: string, shareLink = false) => request<{ id: string }>(shareLink ? `/v2/public/design-links/${slug}/approvals` : `/v1/public/designs/${slug}/approvals`, { method: 'POST', body: JSON.stringify({ decision, name, contact, note }) }, false),
  submitPublicComment: (slug: string, body: string, elementId?: string) => request<{ id: string }>(`/v2/public/design-links/${slug}/comments`, { method: 'POST', body: JSON.stringify({ body, elementId }) }, false)
};
