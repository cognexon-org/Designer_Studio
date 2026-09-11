'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { AiObservation, ProgressTeamMember, ProjectIssue, SpatialRoomSummary } from '@/lib/types';

function fmt(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function nameFor(team: ProgressTeamMember[], id?: string | null) {
  if (!id) return 'Unassigned';
  const member = team.find((row) => row.id === id);
  return member?.name || member?.phone || id;
}

export function ProgressIssuesWorkspace({
  projectId, issues: initialIssues, observations, rooms, onIssuesChanged, onObservationsChanged
}: {
  projectId: string;
  issues: ProjectIssue[];
  observations: AiObservation[];
  rooms: SpatialRoomSummary[];
  onIssuesChanged?: (issues: ProjectIssue[]) => void;
  onObservationsChanged?: (observations: AiObservation[]) => void;
}) {
  const [issues, setIssues] = useState(initialIssues);
  const [team, setTeam] = useState<ProgressTeamMember[]>([]);
  const [selectedId, setSelectedId] = useState(initialIssues[0]?.id ?? '');
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [roomId, setRoomId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [newSeverity, setNewSeverity] = useState('MEDIUM');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [observationRows, setObservationRows] = useState(observations);

  useEffect(() => { setIssues(initialIssues); }, [initialIssues]);
  useEffect(() => { setObservationRows(observations); }, [observations]);
  useEffect(() => { void api.getProgressTeam(projectId).then(setTeam).catch(() => setTeam([])); }, [projectId]);

  const filtered = useMemo(() => issues.filter((issue) =>
    (!status || issue.status === status) && (!severity || issue.severity === severity) &&
    (!roomId || issue.spatialRoomId === roomId) && (!assigneeId || issue.assigneeId === assigneeId)
  ), [issues, status, severity, roomId, assigneeId]);
  const selected = issues.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  function commit(next: ProjectIssue[]) {
    setIssues(next);
    onIssuesChanged?.(next);
  }

  async function createIssue() {
    if (!title.trim()) return;
    setBusy(true); setError(null);
    try {
      const issue = await api.createProgressIssue(projectId, { title: title.trim(), description: description.trim() || undefined, severity: newSeverity });
      const next = [issue, ...issues]; commit(next); setSelectedId(issue.id); setTitle(''); setDescription('');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to create issue.'); }
    finally { setBusy(false); }
  }

  async function patchSelected(body: Parameters<typeof api.updateProgressIssue>[1]) {
    if (!selected) return;
    setBusy(true); setError(null);
    try {
      const updated = await api.updateProgressIssue(selected.id, body);
      commit(issues.map((row) => row.id === updated.id ? updated : row));
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to update issue.'); }
    finally { setBusy(false); }
  }

  async function verify(decision: 'VERIFIED' | 'REJECTED' | 'CORRECTED') {
    if (!selected) return;
    setBusy(true); setError(null);
    try {
      const updated = await api.decideProgressIssue(selected.id, { decision, note: comment.trim() || undefined });
      commit(issues.map((row) => row.id === updated.id ? updated : row));
      setComment('');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to record verification.'); }
    finally { setBusy(false); }
  }

  async function addComment() {
    if (!selected || !comment.trim()) return;
    setBusy(true); setError(null);
    try {
      await api.addProgressIssueEvent(selected.id, { eventType: 'COMMENT', note: comment.trim() });
      const refreshed = await api.listProgressIssues(projectId);
      commit(refreshed); setComment('');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to add note.'); }
    finally { setBusy(false); }
  }

  async function decideObservation(observation: AiObservation, decision: 'CONFIRMED' | 'REJECTED') {
    setBusy(true); setError(null);
    try {
      await api.decideProgressObservation(observation.id, { decision });
      const next = observationRows.map((row) => row.id === observation.id ? { ...row, status: decision } : row);
      setObservationRows(next); onObservationsChanged?.(next);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to decide observation.'); }
    finally { setBusy(false); }
  }

  return <section className="progress-panel-stack">
    {error && <div className="notice notice-error">{error}</div>}
    <section className="progress-card">
      <div className="progress-section-title"><div><p className="eyebrow">Issue register</p><h2>Human-owned project state</h2></div><strong>{issues.filter((row) => ['OPEN','IN_REVIEW'].includes(row.status)).length} active</strong></div>
      <div className="issue-create-grid">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Issue title"/>
        <select value={newSeverity} onChange={(e) => setNewSeverity(e.target.value)}><option>INFO</option><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select>
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description / review context"/>
        <button className="button button-primary" disabled={busy || !title.trim()} onClick={() => void createIssue()}>Create issue</button>
      </div>
      <div className="issue-filter-row">
        <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option><option>OPEN</option><option>IN_REVIEW</option><option>RESOLVED</option><option>REJECTED</option></select>
        <select value={severity} onChange={(e) => setSeverity(e.target.value)}><option value="">All severities</option><option>INFO</option><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select>
        <select value={roomId} onChange={(e) => setRoomId(e.target.value)}><option value="">All rooms</option>{rooms.map((row) => <option value={row.id} key={row.id}>{row.name}</option>)}</select>
        <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}><option value="">All assignees</option>{team.map((row) => <option value={row.id} key={row.id}>{row.name || row.phone}</option>)}</select>
      </div>
    </section>

    <section className="issue-workspace-grid">
      <div className="progress-card issue-register-list">
        {filtered.map((issue) => <button key={issue.id} type="button" className={`issue-register-card ${selected?.id === issue.id ? 'active' : ''}`} onClick={() => setSelectedId(issue.id)}>
          <div><span className={`severity severity-${issue.severity.toLowerCase()}`}>{issue.severity}</span><strong>{issue.title}</strong></div>
          <p>{issue.description || 'No description'}</p><small>{issue.status} · {issue.verification} · {nameFor(team, issue.assigneeId)}</small>
        </button>)}
        {!filtered.length && <p className="muted">No issues match these filters.</p>}
      </div>

      <div className="progress-card issue-inspector">
        {selected ? <>
          <div className="progress-section-title"><div><p className="eyebrow">Issue inspector</p><h2>{selected.title}</h2></div><span className={`severity severity-${selected.severity.toLowerCase()}`}>{selected.severity}</span></div>
          <p>{selected.description || 'No description.'}</p>
          <div className="issue-meta-grid">
            <label>Status<select value={selected.status} onChange={(e) => void patchSelected({ status: e.target.value as 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED', note: `Status updated to ${e.target.value}` })}><option>OPEN</option><option>IN_REVIEW</option><option>RESOLVED</option><option>REJECTED</option></select></label>
            <label>Assignee<select value={selected.assigneeId || ''} onChange={(e) => void patchSelected({ assigneeId: e.target.value || null })}><option value="">Unassigned</option>{team.map((row) => <option value={row.id} key={row.id}>{row.name || row.phone} · {row.role}</option>)}</select></label>
            <label>Due date<input type="date" value={selected.dueAt?.slice(0,10) || ''} onChange={(e) => void patchSelected({ dueAt: e.target.value ? new Date(`${e.target.value}T18:00:00`).toISOString() : null })}/></label>
            <label>Verification<input value={selected.verification} readOnly/></label>
          </div>
          <div className="verification-actions"><button className="button button-primary" disabled={busy} onClick={() => void verify('VERIFIED')}>Verify</button><button className="button button-secondary" disabled={busy} onClick={() => void verify('CORRECTED')}>Corrected</button><button className="button button-secondary" disabled={busy} onClick={() => void verify('REJECTED')}>Reject evidence</button></div>
          <div className="issue-comment-row"><textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add review note, correction context or resolution evidence…"/><button className="button button-secondary" disabled={busy || !comment.trim()} onClick={() => void addComment()}>Add note</button></div>
          <div className="issue-event-list"><h3>Audit history</h3>{selected.events?.map((event) => <article key={event.id}><strong>{event.eventType.replaceAll('_',' ')}</strong><span>{fmt(event.createdAt)}</span>{event.note && <p>{event.note}</p>}</article>)}{!selected.events?.length && <p className="muted">No event history loaded.</p>}</div>
          {!!selected.evidenceRefs?.length && <div className="evidence-ref-list"><h3>Evidence references</h3>{selected.evidenceRefs.map((ref) => <code key={ref}>{ref}</code>)}</div>}
        </> : <p className="muted">Select an issue to inspect.</p>}
      </div>
    </section>

    <section className="progress-card">
      <div className="progress-section-title"><div><p className="eyebrow">Observation verification</p><h2>Machine proposals remain non-authoritative</h2></div><strong>{observationRows.filter((row) => row.status === 'PROPOSED').length} proposed</strong></div>
      <div className="observation-review-list">{observationRows.map((row) => <article key={row.id}><div><strong>{row.observationType.replaceAll('_',' ')}</strong><p>Confidence {Math.round(row.confidence * 100)}% · {row.status}</p></div>{row.status === 'PROPOSED' && <div><button className="button button-primary" disabled={busy} onClick={() => void decideObservation(row, 'CONFIRMED')}>Confirm</button><button className="button button-secondary" disabled={busy} onClick={() => void decideObservation(row, 'REJECTED')}>Reject</button></div>}</article>)}{!observationRows.length && <p className="muted">No AI observations yet. Patch 07 will begin creating controlled progress observations.</p>}</div>
    </section>
  </section>;
}
