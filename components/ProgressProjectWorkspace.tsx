'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { CaptureSnapshot, ProgressProject, ProjectIssue } from '@/lib/types';
import { Icon } from './Icon';
import { StatusBadge } from './StatusBadge';
import { ProgressTimeline } from './ProgressTimeline';
import { ProgressCompareWorkspace } from './ProgressCompareWorkspace';

type WorkspaceTab = 'OVERVIEW' | 'TIMELINE' | 'REALITY' | 'DESIGN' | 'COMPARE' | 'ISSUES';

function fmt(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function captureLabel(snapshot: CaptureSnapshot) {
  return `${snapshot.sourceType === 'PROPERTY_TOUR' ? 'Mode A' : 'Mode B'} · ${fmt(snapshot.capturedAt)}`;
}

function SnapshotCard({ snapshot, active, onClick }: { snapshot: CaptureSnapshot; active?: boolean; onClick?: () => void }) {
  const spatialRooms = snapshot.capture.rooms.filter((room) => room.spatialRoomId).length;
  const panoramas = snapshot.capture.assets.filter((asset) => asset.kind === 'PANORAMA').length;
  const uploads = snapshot.capture.resumableUploads ?? [];
  const activeUploads = uploads.filter((upload) => !['COMPLETED','CANCELLED'].includes(upload.status));
  const quality = snapshot.qualityReport ?? {};
  const preflight = quality.preflight && typeof quality.preflight === 'object' ? quality.preflight as Record<string, unknown> : null;
  const preflightScore = typeof preflight?.score === 'number' ? preflight.score : null;
  return (
    <button className={`progress-snapshot-card ${active ? 'active' : ''}`} onClick={onClick} type="button">
      <div className="progress-snapshot-card-head">
        <strong>{snapshot.sourceType === 'PROPERTY_TOUR' ? 'Mode A · Reality' : 'Mode B · Spatial scan'}</strong>
        <StatusBadge status={snapshot.status}/>
      </div>
      <span>{fmt(snapshot.capturedAt)}</span>
      <small>{snapshot.floor?.name || 'Project scope'} · {spatialRooms}/{snapshot.capture.rooms.length} rooms spatially linked · {panoramas} panoramas</small>
      {(preflightScore !== null || uploads.length > 0) && <small className="capture-health-line">
        {preflightScore !== null ? `Preflight ${preflightScore}/100` : 'Preflight —'} · {uploads.length ? `${uploads.filter((upload) => upload.status === 'COMPLETED').length}/${uploads.length} reliable uploads complete` : 'no resumable uploads'}{activeUploads.length ? ` · ${activeUploads.length} active` : ''}
      </small>}
    </button>
  );
}

export function ProgressProjectWorkspace({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<ProgressProject | null>(null);
  const [timeline, setTimeline] = useState<CaptureSnapshot[]>([]);
  const [tab, setTab] = useState<WorkspaceTab>('OVERVIEW');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leftId, setLeftId] = useState('');
  const [rightId, setRightId] = useState('');
  const [issueTitle, setIssueTitle] = useState('');
  const [issueSeverity, setIssueSeverity] = useState('MEDIUM');
  const [issueSaving, setIssueSaving] = useState(false);
  const [timelineRoomId, setTimelineRoomId] = useState('');
  const [timelineSourceType, setTimelineSourceType] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [projectData, timelineData] = await Promise.all([
        api.getProgressProject(projectId),
        api.getProgressTimeline(projectId)
      ]);
      setProject(projectData);
      setTimeline(timelineData);
      if (!leftId && timelineData[1]) setLeftId(timelineData[1].id);
      if (!rightId && timelineData[0]) setRightId(timelineData[0].id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load spatial project.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [projectId]);

  const left = useMemo(() => timeline.find((item) => item.id === leftId), [timeline, leftId]);
  const right = useMemo(() => timeline.find((item) => item.id === rightId), [timeline, rightId]);
  const registration = useMemo(() => project?.registrations.find((item) =>
    (item.sourceSnapshotId === leftId && item.targetSnapshotId === rightId) ||
    (item.sourceSnapshotId === rightId && item.targetSnapshotId === leftId)
  ), [project, leftId, rightId]);

  async function addIssue() {
    if (!issueTitle.trim()) return;
    setIssueSaving(true);
    try {
      const issue = await api.createProgressIssue(projectId, { title: issueTitle.trim(), severity: issueSeverity });
      setProject((current) => current ? { ...current, issues: [issue, ...current.issues] } : current);
      setIssueTitle('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create issue.');
    } finally {
      setIssueSaving(false);
    }
  }

  if (loading) return <div className="progress-loading"><Icon name="spinner" className="spin"/><span>Loading Project Studio…</span></div>;
  if (error && !project) return <div className="progress-loading"><Icon name="warning"/><span>{error}</span><button className="button" onClick={() => void load()}>Retry</button></div>;
  if (!project) return null;

  const latest = timeline[0];
  const linkedRoomCount = new Set(timeline.flatMap((snapshot) => snapshot.capture.rooms.map((room) => room.spatialRoomId).filter(Boolean))).size;
  const designProjects = timeline.flatMap((snapshot) => snapshot.capture.designProjects ?? []).filter((item, index, all) => all.findIndex((row) => row.id === item.id) === index);
  const filteredTimeline = timeline.filter((snapshot) => (!timelineSourceType || snapshot.sourceType === timelineSourceType) && (!timelineRoomId || snapshot.capture.rooms.some((room) => room.spatialRoomId === timelineRoomId))); 

  return (
    <main className="progress-project-page">
      <header className="progress-project-header">
        <div>
          <Link href="/studio" className="progress-back">← Project Studio</Link>
          <p className="eyebrow">ProgressionAi spatial project</p>
          <h1>{project.name}</h1>
          <p>{project.unit.property.name} · {project.unit.label} · {project.unit.property.address}</p>
        </div>
        <div className="progress-header-meta">
          <StatusBadge status={project.status}/>
          <button className="button button-secondary" onClick={() => void load()}><Icon name="refresh"/>Refresh</button>
        </div>
      </header>

      {error && <div className="notice notice-error"><Icon name="warning"/>{error}</div>}

      <nav className="progress-tabs" aria-label="Project Studio sections">
        {(['OVERVIEW','TIMELINE','REALITY','DESIGN','COMPARE','ISSUES'] as WorkspaceTab[]).map((item) => (
          <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item[0] + item.slice(1).toLowerCase()}</button>
        ))}
      </nav>

      {tab === 'OVERVIEW' && (
        <section className="progress-panel-stack">
          <div className="stats-row progress-stats">
            <article><span>Snapshots</span><strong>{timeline.length}</strong><small>Mode A + Mode B history</small></article>
            <article><span>Spatial rooms</span><strong>{project.rooms.length}</strong><small>{linkedRoomCount} seen in captures</small></article>
            <article><span>Open issues</span><strong>{project.issues.filter((issue) => issue.status === 'OPEN').length}</strong><small>Human-owned project state</small></article>
            <article><span>AI observations</span><strong>{project.observations.length}</strong><small>Proposed until verified</small></article>
          </div>
          <section className="progress-card">
            <div className="progress-section-title"><div><p className="eyebrow">Unified spatial identity</p><h2>Floors and rooms</h2></div></div>
            <div className="spatial-room-grid">
              {project.floors.map((floor) => (
                <article key={floor.id}>
                  <strong>{floor.name}</strong>
                  <span>{project.rooms.filter((room) => room.floorId === floor.id).length} rooms</span>
                  <div>{project.rooms.filter((room) => room.floorId === floor.id).map((room) => <small key={room.id}>{room.name}</small>)}</div>
                </article>
              ))}
            </div>
          </section>
          <section className="progress-card">
            <div className="progress-section-title"><div><p className="eyebrow">Capture reliability</p><h2>Field health</h2></div></div>
            <div className="spatial-room-grid">
              {timeline.slice(0, 4).map((snapshot) => {
                const uploads = snapshot.capture.resumableUploads ?? [];
                const completed = uploads.filter((upload) => upload.status === 'COMPLETED').length;
                const quality = snapshot.qualityReport ?? {};
                const preflight = quality.preflight && typeof quality.preflight === 'object' ? quality.preflight as Record<string, unknown> : null;
                return <article key={snapshot.id}>
                  <strong>{captureLabel(snapshot)}</strong>
                  <span>{typeof preflight?.score === 'number' ? `Preflight ${preflight.score}/100` : 'Preflight not reported'}</span>
                  <div><small>{uploads.length ? `${completed}/${uploads.length} resumable uploads completed` : 'No resumable-upload sessions recorded'}</small></div>
                </article>;
              })}
              {!timeline.length && <p className="muted">Capture readiness and resumable upload telemetry will appear after the first mobile capture.</p>}
            </div>
          </section>
          <section className="progress-card">
            <p className="eyebrow">Latest reality</p>
            <h2>{latest ? captureLabel(latest) : 'No capture yet'}</h2>
            <p className="muted">Every new capture is immutable and belongs to the same persistent project/floor/room model.</p>
          </section>
        </section>
      )}

      {tab === 'TIMELINE' && (
        <ProgressTimeline snapshots={filteredTimeline} rooms={project.rooms} roomId={timelineRoomId} sourceType={timelineSourceType} onRoom={setTimelineRoomId} onSource={setTimelineSourceType}/>
      )}

      {tab === 'REALITY' && (
        <section className="progress-card">
          <div className="progress-section-title"><div><p className="eyebrow">Reality evidence</p><h2>Rooms across captures</h2></div></div>
          <div className="reality-room-grid">
            {project.rooms.map((spatialRoom) => {
              const appearances = timeline.flatMap((snapshot) => snapshot.capture.rooms.filter((room) => room.spatialRoomId === spatialRoom.id).map((room) => ({ snapshot, room })));
              return <article key={spatialRoom.id}><h3>{spatialRoom.name}</h3><p>{appearances.length} capture appearances</p>{appearances.slice(0,4).map(({ snapshot, room }) => <small key={room.id}>{snapshot.sourceType === 'PROPERTY_TOUR' ? 'Mode A' : 'Mode B'} · {fmt(snapshot.capturedAt)}{room.panoramaAssetId ? ' · panorama' : ''}</small>)}</article>;
            })}
          </div>
        </section>
      )}

      {tab === 'DESIGN' && (
        <section className="progress-card">
          <div className="progress-section-title"><div><p className="eyebrow">Design intent</p><h2>Connected design workspaces</h2></div></div>
          {designProjects.length ? <div className="project-grid compact-grid">{designProjects.map((design) => <Link className="project-card" href={`/studio/${design.id}`} key={design.id}><div className="project-card-body"><p className="project-type">Design version</p><h3>{design.name}</h3><p>{design.status}</p><small>Active version {design.activeVersion} · updated {fmt(design.updatedAt)}</small></div><span className="project-arrow"><Icon name="chevron"/></span></Link>)}</div> : <div className="empty-state"><Icon name="cube" size={48}/><h3>No design model linked yet</h3><p>Submit a Mode B scan to create an editable Design Studio project for this same property.</p></div>}
        </section>
      )}

      {tab === 'COMPARE' && (
        <ProgressCompareWorkspace projectId={projectId} snapshots={timeline} rooms={project.rooms} onRegistration={(next) => setProject((current) => current ? { ...current, registrations: [next, ...current.registrations.filter((item) => item.id !== next.id)] } : current)}/>
      )}

      {tab === 'ISSUES' && (
        <section className="progress-panel-stack">
          <section className="progress-card">
            <div className="progress-section-title"><div><p className="eyebrow">Human-owned truth</p><h2>Create issue</h2></div></div>
            <div className="issue-create-row"><input value={issueTitle} onChange={(event) => setIssueTitle(event.target.value)} placeholder="e.g. East window opening needs site verification"/><select value={issueSeverity} onChange={(event) => setIssueSeverity(event.target.value)}><option>INFO</option><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select><button className="button button-primary" disabled={!issueTitle.trim() || issueSaving} onClick={() => void addIssue()}>{issueSaving ? 'Saving…' : 'Add issue'}</button></div>
          </section>
          <section className="progress-card">
            <div className="progress-section-title"><div><p className="eyebrow">Issue register</p><h2>{project.issues.length} issues</h2></div></div>
            <div className="issue-list">{project.issues.map((issue: ProjectIssue) => <article key={issue.id}><div><strong>{issue.title}</strong><p>{issue.description || 'No description'}</p></div><div><span className={`severity severity-${issue.severity.toLowerCase()}`}>{issue.severity}</span><small>{issue.status}</small></div></article>)}{!project.issues.length && <p className="muted">No issues recorded yet.</p>}</div>
          </section>
        </section>
      )}
    </main>
  );
}
