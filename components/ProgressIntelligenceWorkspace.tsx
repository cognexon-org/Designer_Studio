'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type {
  AiObservation, CaptureRegistration, CaptureSnapshot, ProgressAnalysisRun,
  ProgressChangeType, ProgressDifferenceRegion, ProgressSemanticHint, SpatialRoomSummary
} from '@/lib/types';
import { StatusBadge } from './StatusBadge';

const CHANGE_TYPES: ProgressChangeType[] = ['ADDED','REMOVED','MOVED','SURFACE_CHANGED','APPEARANCE_CHANGED','GEOMETRY_CHANGED','UNCERTAIN'];
const SEMANTICS: ProgressSemanticHint[] = ['PARTITION_WALL','WALL','FLOORING','CEILING','DOOR','WINDOW','OPENING','ELECTRICAL','PLUMBING','FIXTURE','FURNITURE','SURFACE','UNKNOWN'];

function fmt(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function newRegion(sourceSnapshotId = '', targetSnapshotId = ''): ProgressDifferenceRegion {
  return {
    id: `region-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    changeType: 'ADDED', semanticHint: 'UNKNOWN', geometricConfidence: 0.85, semanticConfidence: 0.8,
    evidenceRefs: [sourceSnapshotId && `snapshot:${sourceSnapshotId}`, targetSnapshotId && `snapshot:${targetSnapshotId}`].filter(Boolean) as string[],
    spatialRef: { type: 'REVIEW_REGION' }
  };
}

function pairRegistration(registrations: CaptureRegistration[], sourceId: string, targetId: string) {
  return registrations.find((item) => item.status === 'VERIFIED' && (
    (item.sourceSnapshotId === sourceId && item.targetSnapshotId === targetId) ||
    (item.sourceSnapshotId === targetId && item.targetSnapshotId === sourceId)
  ));
}

export function ProgressIntelligenceWorkspace({
  projectId, snapshots, rooms, registrations, initialRuns, onRunsChanged, onObservationsChanged
}: {
  projectId: string;
  snapshots: CaptureSnapshot[];
  rooms: SpatialRoomSummary[];
  registrations: CaptureRegistration[];
  initialRuns: ProgressAnalysisRun[];
  onRunsChanged: (runs: ProgressAnalysisRun[]) => void;
  onObservationsChanged: (observations: AiObservation[]) => void;
}) {
  const [runs, setRuns] = useState(initialRuns);
  const [sourceId, setSourceId] = useState(snapshots[1]?.id ?? '');
  const [targetId, setTargetId] = useState(snapshots[0]?.id ?? '');
  const [roomId, setRoomId] = useState('');
  const [regions, setRegions] = useState<ProgressDifferenceRegion[]>(() => [newRegion(snapshots[1]?.id, snapshots[0]?.id)]);
  const [minConfidence, setMinConfidence] = useState(0.55);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setRuns(initialRuns), [initialRuns]);
  const registration = useMemo(() => pairRegistration(registrations, sourceId, targetId), [registrations, sourceId, targetId]);
  const latest = runs[0];

  function updateRegion(index: number, patch: Partial<ProgressDifferenceRegion>) {
    setRegions((current) => current.map((item, i) => i === index ? { ...item, ...patch } : item));
  }

  function removeRegion(index: number) {
    setRegions((current) => current.filter((_, i) => i !== index));
  }

  async function refreshRun(runId: string) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const run = await api.getProgressAnalysisRun(runId);
      setRuns((current) => [run, ...current.filter((item) => item.id !== run.id)]);
      if (run.status === 'SUCCEEDED' || run.status === 'FAILED') return run;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return api.getProgressAnalysisRun(runId);
  }

  async function analyze() {
    if (!sourceId || !targetId || sourceId === targetId) return setError('Choose two different snapshots.');
    if (!registration) return setError('A human-verified registration is required before AI interpretation.');
    if (!regions.length) return setError('Add at least one bounded difference region.');
    setBusy(true); setError(null);
    try {
      const created = await api.createProgressAnalysisRun(projectId, {
        sourceSnapshotId: sourceId, targetSnapshotId: targetId, registrationId: registration.id,
        spatialRoomId: roomId || undefined, regions,
        policy: { minConfidence, includeUncertainRegions: false }
      });
      setRuns((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      const completed = await refreshRun(created.id);
      const refreshed = await api.listProgressAnalysisRuns(projectId);
      setRuns(refreshed); onRunsChanged(refreshed);
      if (completed.observations?.length) onObservationsChanged(completed.observations);
      if (completed.status === 'FAILED') setError(completed.error || 'Progress analysis failed.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to run progress intelligence.');
    } finally { setBusy(false); }
  }

  async function decide(observation: AiObservation, decision: 'CONFIRMED' | 'REJECTED') {
    setBusy(true); setError(null);
    try {
      await api.decideProgressObservation(observation.id, { decision });
      setRuns((current) => current.map((run) => ({ ...run, observations: run.observations.map((item) => item.id === observation.id ? { ...item, status: decision } : item) })));
      onObservationsChanged([{ ...observation, status: decision }]);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save review decision.'); }
    finally { setBusy(false); }
  }

  return <section className="progress-panel-stack intelligence-workspace">
    <section className="progress-card">
      <div className="progress-section-title"><div><p className="eyebrow">Patch 07 · bounded intelligence</p><h2>AI Progress Intelligence</h2></div></div>
      <p className="muted">AI interprets bounded difference-region evidence only after a human-verified registration. Output stays <strong>PROPOSED</strong> until an authorised reviewer confirms, rejects or corrects it.</p>
      {error && <div className="notice notice-error">{error}</div>}
      <div className="intelligence-pair-grid">
        <label>Earlier snapshot<select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>{snapshots.map((snapshot) => <option key={snapshot.id} value={snapshot.id}>{fmt(snapshot.capturedAt)} · {snapshot.sourceType}</option>)}</select></label>
        <label>Later snapshot<select value={targetId} onChange={(e) => setTargetId(e.target.value)}>{snapshots.map((snapshot) => <option key={snapshot.id} value={snapshot.id}>{fmt(snapshot.capturedAt)} · {snapshot.sourceType}</option>)}</select></label>
        <label>Room / zone<select value={roomId} onChange={(e) => setRoomId(e.target.value)}><option value="">Whole selected scope</option>{rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label>
        <label>Minimum confidence<input type="number" min="0" max="1" step="0.05" value={minConfidence} onChange={(e) => setMinConfidence(Number(e.target.value))}/></label>
      </div>
      <div className={`registration-gate ${registration ? 'verified' : 'blocked'}`}>
        {registration ? <>Verified registration · {(registration.confidence * 100).toFixed(0)}% confidence · {registration.method}</> : <>Blocked: verify the selected capture registration in Compare first.</>}
      </div>
    </section>

    <section className="progress-card">
      <div className="progress-section-title"><div><p className="eyebrow">Difference evidence</p><h2>Bounded regions</h2></div><button className="button button-secondary" type="button" onClick={() => setRegions((current) => [...current, newRegion(sourceId, targetId)])}>+ Add region</button></div>
      <p className="muted">Patch 07 does not ask a language model to invent geometry. Each region carries a deterministic change class, bounded semantic hint and confidence.</p>
      <div className="intelligence-region-list">
        {regions.map((region, index) => <article className="intelligence-region" key={region.id}>
          <div className="intelligence-region-head"><strong>Region {index + 1}</strong><button type="button" className="text-button" onClick={() => removeRegion(index)} disabled={regions.length === 1}>Remove</button></div>
          <div className="intelligence-region-grid">
            <label>Change<select value={region.changeType} onChange={(e) => updateRegion(index, { changeType: e.target.value as ProgressChangeType })}>{CHANGE_TYPES.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Semantic hint<select value={region.semanticHint} onChange={(e) => updateRegion(index, { semanticHint: e.target.value as ProgressSemanticHint })}>{SEMANTICS.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Geometry confidence<input type="number" min="0" max="1" step="0.05" value={region.geometricConfidence} onChange={(e) => updateRegion(index, { geometricConfidence: Number(e.target.value) })}/></label>
            <label>Semantic confidence<input type="number" min="0" max="1" step="0.05" value={region.semanticConfidence ?? 0.8} onChange={(e) => updateRegion(index, { semanticConfidence: Number(e.target.value) })}/></label>
          </div>
        </article>)}
      </div>
      <button className="button" type="button" disabled={busy || !registration} onClick={() => void analyze()}>{busy ? 'Analysing…' : 'Generate proposed observations'}</button>
    </section>

    <section className="progress-card">
      <div className="progress-section-title"><div><p className="eyebrow">Review queue</p><h2>Analysis runs</h2></div></div>
      {!runs.length && <p className="muted">No AI progress analysis has been run for this project yet.</p>}
      <div className="analysis-run-list">
        {runs.map((run) => <article className="analysis-run-card" key={run.id}>
          <div className="analysis-run-head"><div><strong>{fmt(run.createdAt)}</strong><small>{run.engineVersion} · {run.policyVersion}</small></div><StatusBadge status={run.status}/></div>
          <p className="muted">{run.inputRegions?.length ?? 0} input region(s) · {run.observations?.length ?? 0} proposed observation(s)</p>
          {run.error && <div className="notice notice-error">{run.error}</div>}
          <div className="observation-grid">
            {(run.observations ?? []).map((observation) => {
              const evidence = observation.structuredEvidence ?? {};
              const reasons = Array.isArray(evidence.uncertaintyReasons) ? evidence.uncertaintyReasons as string[] : [];
              return <article className="observation-card" key={observation.id}>
                <div className="observation-title"><strong>{observation.observationType.replaceAll('_', ' ')}</strong><StatusBadge status={observation.status}/></div>
                <div className="confidence-line"><span>Confidence</span><strong>{Math.round(observation.confidence * 100)}%</strong></div>
                <small>Region {String(evidence.regionId ?? '—')} · {String(evidence.changeType ?? '—')} · {String(evidence.semanticHint ?? 'UNKNOWN')}</small>
                {reasons.length > 0 && <ul className="uncertainty-list">{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
                {observation.status === 'PROPOSED' && <div className="observation-actions"><button className="button button-secondary" disabled={busy} onClick={() => void decide(observation, 'REJECTED')}>Reject</button><button className="button" disabled={busy} onClick={() => void decide(observation, 'CONFIRMED')}>Confirm</button></div>}
              </article>;
            })}
          </div>
        </article>)}
      </div>
      {latest && <p className="truth-boundary">AI output is a review candidate, not certified progress, defect detection, compliance status or payment certification.</p>}
    </section>
  </section>;
}
