'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { CaptureSummary, DesignProject, ProgressProjectSummary } from '@/lib/types';
import { Icon } from './Icon';
import { StatusBadge } from './StatusBadge';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

export function ProjectDashboard() {
  const [spatialProjects, setSpatialProjects] = useState<ProgressProjectSummary[]>([]);
  const [designProjects, setDesignProjects] = useState<DesignProject[]>([]);
  const [captures, setCaptures] = useState<CaptureSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [captureId, setCaptureId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [spatialRows, projectRows, captureRows] = await Promise.all([
        api.listProgressProjects(), api.listProjects(), api.listCaptures()
      ]);
      setSpatialProjects(spatialRows);
      setDesignProjects(projectRows);
      setCaptures(captureRows.filter((capture) => capture.mode === 'DESIGN_SCAN'));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load projects.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filteredSpatial = useMemo(() => spatialProjects.filter((project) => {
    const text = `${project.name} ${project.unit?.label ?? ''} ${project.unit?.property?.name ?? ''} ${project.unit?.property?.address ?? ''}`.toLowerCase();
    return text.includes(query.toLowerCase());
  }), [spatialProjects, query]);

  const filteredDesign = useMemo(() => designProjects.filter((project) => {
    const text = `${project.name} ${project.unit?.label ?? ''} ${project.unit?.property?.name ?? ''} ${project.unit?.property?.address ?? ''}`.toLowerCase();
    return text.includes(query.toLowerCase());
  }), [designProjects, query]);

  async function createProject() {
    if (!captureId || !projectName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const created = await api.createProject(captureId, projectName.trim());
      window.location.href = `/studio/${created.id}`;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create project.');
      setCreating(false);
    }
  }

  const totalSnapshots = spatialProjects.reduce((sum, project) => sum + (project._count?.snapshots ?? 0), 0);
  const totalRooms = spatialProjects.reduce((sum, project) => sum + project.rooms.length, 0);
  const openIssues = spatialProjects.reduce((sum, project) => sum + (project._count?.issues ?? 0), 0);

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">ProgressionAi · unified spatial platform</p>
          <h1>Project Studio</h1>
          <p className="muted">One property identity for Mode A reality, Mode B geometry, design versions, timeline, compare and verified intelligence.</p>
        </div>
        <button className="button button-primary" onClick={() => setShowCreate(true)}><Icon name="plus"/>New design workspace</button>
      </header>

      <section className="stats-row">
        <article><span>Spatial projects</span><strong>{spatialProjects.length}</strong><small>Persistent property/unit records</small></article>
        <article><span>Snapshots</span><strong>{totalSnapshots}</strong><small>Mode A + Mode B history</small></article>
        <article><span>Spatial rooms</span><strong>{totalRooms}</strong><small>Stable cross-capture identities</small></article>
        <article><span>Issues</span><strong>{openIssues}</strong><small>Project review context</small></article>
      </section>

      <section className="project-section">
        <div className="section-toolbar">
          <div>
            <h2>Spatial projects</h2>
            <p className="muted">Open a property-level workspace to move between Reality, Design, Timeline and Compare.</p>
          </div>
          <label className="search-box"><Icon name="projects" size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search property, unit or address"/></label>
        </div>

        {error && <div className="notice notice-error"><Icon name="warning"/>{error}<button onClick={() => void load()}>Retry</button></div>}

        {loading ? (
          <div className="loading-grid">{[1,2,3].map((value) => <div className="project-card skeleton" key={value}/>)}</div>
        ) : filteredSpatial.length ? (
          <div className="project-grid">
            {filteredSpatial.map((project) => (
              <Link className="project-card progress-project-card" href={`/studio/progress/${project.id}`} key={project.id}>
                <div className="project-preview progress-project-preview">
                  <Icon name="history" size={42}/>
                  <StatusBadge status={project.status}/>
                </div>
                <div className="project-card-body">
                  <p className="project-type">{project.unit.property.propertyType || 'Spatial project'}</p>
                  <h3>{project.name}</h3>
                  <p>{project.unit.property.name} · {project.unit.label}</p>
                  <small>{project.unit.property.address}</small>
                  <div className="project-meta"><span>{project._count?.snapshots ?? 0} snapshots</span><span>{project.rooms.length} rooms</span></div>
                </div>
                <span className="project-arrow"><Icon name="chevron"/></span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state"><Icon name="history" size={54}/><h3>No spatial projects yet</h3><p>Create the first project from the Android capture app. New Mode A and Mode B captures will then accumulate under the same property/room identity.</p></div>
        )}
      </section>

      <section className="project-section design-workspace-section">
        <div className="section-toolbar">
          <div>
            <h2>Design workspaces</h2>
            <p className="muted">Existing evidence-linked Designer Studio projects remain fully available.</p>
          </div>
        </div>
        {loading ? null : filteredDesign.length ? (
          <div className="project-grid">
            {filteredDesign.map((project) => (
              <Link className="project-card" href={`/studio/${project.id}`} key={project.id}>
                <div className="project-preview"><div className="mini-room"><span/><span/><span/><span/></div><StatusBadge status={project.status}/></div>
                <div className="project-card-body">
                  <p className="project-type">{project.unit?.property?.propertyType || 'Interior project'}</p>
                  <h3>{project.name}</h3>
                  <p>{project.unit?.property?.name} · {project.unit?.label}</p>
                  <small>{project.unit?.property?.address}</small>
                  <div className="project-meta"><span>Version {project.activeVersion}</span><span>Updated {formatDate(project.updatedAt)}</span></div>
                </div>
                <span className="project-arrow"><Icon name="chevron"/></span>
              </Link>
            ))}
            <Link className="project-card demo-project-card" href="/studio/demo">
              <div className="project-preview"><Icon name="cube" size={52}/><StatusBadge status="LOCAL DEMO"/></div>
              <div className="project-card-body"><p className="project-type">No backend required</p><h3>Sample living room</h3><p>Explore all editor controls</p><small>Changes remain in this browser session.</small></div>
              <span className="project-arrow"><Icon name="chevron"/></span>
            </Link>
          </div>
        ) : (
          <div className="empty-state"><Icon name="cube" size={54}/><h3>No design projects yet</h3><p>Create one from a completed Mode B capture, or open the local demo.</p><div><button className="button button-primary" onClick={() => setShowCreate(true)}>Create design workspace</button><Link className="button button-secondary" href="/studio/demo">Open demo</Link></div></div>
        )}
      </section>

      {showCreate && (
        <div className="modal-backdrop" onMouseDown={() => setShowCreate(false)}>
          <section className="modal" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowCreate(false)}><Icon name="close"/></button>
            <p className="eyebrow">New design workspace</p>
            <h2>Choose a Design Scan</h2>
            <p className="muted">The backend builds an evidence-linked draft from the selected Mode B capture and opens it for shell correction and design.</p>
            <div className="form-stack">
              <label>Project name<input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Living room redesign — Sharma residence"/></label>
              <label>Mode B capture<select value={captureId} onChange={(event) => setCaptureId(event.target.value)}>
                <option value="">Select a capture</option>
                {captures.map((capture) => <option key={capture.id} value={capture.id}>{capture.unit.property.name} · {capture.unit.label} · {capture.platform} · {capture.status}</option>)}
              </select></label>
              {!captures.length && <div className="notice"><Icon name="warning"/>No Design Scan captures are available. Complete Mode B capture in the Android app first.</div>}
              <button className="button button-primary button-large" onClick={() => void createProject()} disabled={!captureId || !projectName.trim() || creating}>{creating ? <Icon name="spinner" className="spin"/> : <Icon name="plus"/>}Create and open studio</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
