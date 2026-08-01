'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { CaptureSummary, DesignProject } from '@/lib/types';
import { Icon } from './Icon';
import { StatusBadge } from './StatusBadge';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

export function ProjectDashboard() {
  const [projects, setProjects] = useState<DesignProject[]>([]);
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
      const [projectRows, captureRows] = await Promise.all([api.listProjects(), api.listCaptures()]);
      setProjects(projectRows);
      setCaptures(captureRows.filter((capture) => capture.mode === 'DESIGN_SCAN'));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load projects.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => projects.filter((project) => {
    const text = `${project.name} ${project.unit?.label ?? ''} ${project.unit?.property?.name ?? ''} ${project.unit?.property?.address ?? ''}`.toLowerCase();
    return text.includes(query.toLowerCase());
  }), [projects, query]);

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

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Interior design workspace</p>
          <h1>Design projects</h1>
          <p className="muted">Correct captured room shells, prepare concepts and share client-ready 3D proposals.</p>
        </div>
        <button className="button button-primary" onClick={() => setShowCreate(true)}><Icon name="plus"/>New design project</button>
      </header>

      <section className="stats-row">
        <article><span>Total projects</span><strong>{projects.length}</strong><small>Across your organisation</small></article>
        <article><span>Ready to share</span><strong>{projects.filter((project) => project.status === 'READY' || project.status === 'PUBLISHED').length}</strong><small>GLB model generated</small></article>
        <article><span>Published concepts</span><strong>{projects.filter((project) => project.status === 'PUBLISHED').length}</strong><small>Customer links active</small></article>
        <article><span>Available scans</span><strong>{captures.length}</strong><small>Mode B capture sessions</small></article>
      </section>

      <section className="project-section">
        <div className="section-toolbar">
          <div>
            <h2>Recent projects</h2>
            <p className="muted">Every save creates a new immutable design version.</p>
          </div>
          <label className="search-box"><Icon name="projects" size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search project, unit or address"/></label>
        </div>

        {error && <div className="notice notice-error"><Icon name="warning"/>{error}<button onClick={() => void load()}>Retry</button></div>}

        {loading ? (
          <div className="loading-grid">{[1,2,3].map((value) => <div className="project-card skeleton" key={value}/>)}</div>
        ) : filtered.length ? (
          <div className="project-grid">
            {filtered.map((project) => (
              <Link className="project-card" href={`/studio/${project.id}`} key={project.id}>
                <div className="project-preview">
                  <div className="mini-room"><span/><span/><span/><span/></div>
                  <StatusBadge status={project.status}/>
                </div>
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
          <div className="empty-state"><Icon name="projects" size={54}/><h3>No design projects yet</h3><p>Create a project from a completed Mode B capture, or open the local demo.</p><div><button className="button button-primary" onClick={() => setShowCreate(true)}>Create project</button><Link className="button button-secondary" href="/studio/demo">Open demo</Link></div></div>
        )}
      </section>

      {showCreate && (
        <div className="modal-backdrop" onMouseDown={() => setShowCreate(false)}>
          <section className="modal" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowCreate(false)}><Icon name="close"/></button>
            <p className="eyebrow">New design project</p>
            <h2>Choose a Design Scan</h2>
            <p className="muted">The backend builds an evidence-linked draft from the selected capture, then opens it for shell correction and design.</p>
            <div className="form-stack">
              <label>Project name<input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Living room redesign — Sharma residence"/></label>
              <label>Mode B capture<select value={captureId} onChange={(event) => setCaptureId(event.target.value)}>
                <option value="">Select a capture</option>
                {captures.map((capture) => <option key={capture.id} value={capture.id}>{capture.unit.property.name} · {capture.unit.label} · {capture.platform} · {capture.status}</option>)}
              </select></label>
              {!captures.length && <div className="notice"><Icon name="warning"/>No Design Scan captures are available. Complete Mode B capture in the Android or iOS app first.</div>}
              <button className="button button-primary button-large" onClick={() => void createProject()} disabled={!captureId || !projectName.trim() || creating}>{creating ? <Icon name="spinner" className="spin"/> : <Icon name="plus"/>}Create and open studio</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
