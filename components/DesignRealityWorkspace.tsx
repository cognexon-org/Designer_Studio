'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type {
  CaptureSnapshot, DesignRealityAlignment, DesignRealityDeviationCandidate, DesignRealityEvaluation,
  Point2, ProgressDesignIntent, ProjectIssue, RegistrationAnchor, SpatialRoomSummary
} from '@/lib/types';

const defaultAnchors: RegistrationAnchor[] = [0, 1, 2].map(() => ({ source: [0, 0, 0], target: [0, 0, 0] }));

function PlanOverlay({ design, reality }: { design: Point2[]; reality: Point2[] }) {
  const all = [...design, ...reality];
  if (!all.length) return <div className="design-reality-overlay-empty">No overlay geometry.</div>;
  const xs = all.map((p) => p[0]); const ys = all.map((p) => p[1]);
  const minX = Math.min(...xs); const maxX = Math.max(...xs); const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const width = Math.max(0.5, maxX - minX); const height = Math.max(0.5, maxY - minY); const pad = Math.max(width, height) * 0.12;
  const points = (polygon: Point2[]) => polygon.map(([x, y]) => `${x},${y}`).join(' ');
  return <div className="design-reality-overlay-wrap"><svg className="design-reality-overlay" viewBox={`${minX-pad} ${minY-pad} ${width+pad*2} ${height+pad*2}`} preserveAspectRatio="xMidYMid meet">
    <polygon className="reality-polygon" points={points(reality)}/>
    <polygon className="design-polygon" points={points(design)}/>
  </svg><div className="design-reality-legend"><span><i className="legend-design"/>Design</span><span><i className="legend-reality"/>Reality</span></div></div>;
}

function fmtM(value: number) { return `${Math.round(value * 1000)} mm`; }

export function DesignRealityWorkspace({
  projectId, snapshots, rooms, alignments, onAlignment, onIssue
}: {
  projectId: string; snapshots: CaptureSnapshot[]; rooms: SpatialRoomSummary[]; alignments: DesignRealityAlignment[];
  onAlignment?: (alignment: DesignRealityAlignment) => void; onIssue?: (issue: ProjectIssue) => void;
}) {
  const [intents, setIntents] = useState<ProgressDesignIntent[]>([]);
  const [designId, setDesignId] = useState(''); const [version, setVersion] = useState<number>(0);
  const [snapshotId, setSnapshotId] = useState(''); const [roomId, setRoomId] = useState('');
  const [anchors, setAnchors] = useState<RegistrationAnchor[]>(defaultAnchors);
  const [alignment, setAlignment] = useState<DesignRealityAlignment | null>(null);
  const [evaluation, setEvaluation] = useState<DesignRealityEvaluation | null>(null);
  const [boundaryMm, setBoundaryMm] = useState(50); const [areaPct, setAreaPct] = useState(3); const [heightMm, setHeightMm] = useState(30);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);

  useEffect(() => { api.listProgressDesignIntents(projectId).then((rows) => {
    setIntents(rows); const first = rows[0]; if (first) { setDesignId((v) => v || first.id); setVersion((v) => v || first.activeVersion); }
  }).catch((caught) => setError(caught instanceof Error ? caught.message : 'Unable to load design intents.')); }, [projectId]);

  const intent = useMemo(() => intents.find((row) => row.id === designId), [intents, designId]);
  const eligibleRooms = useMemo(() => rooms.filter((room) => !intent || intent.roomMappings.some((mapping) => mapping.spatialRoomId === room.id)), [rooms, intent]);
  const eligibleSnapshots = useMemo(() => snapshots.filter((snapshot) => snapshot.capture.rooms.some((room) => !roomId || room.spatialRoomId === roomId)), [snapshots, roomId]);

  useEffect(() => {
    if (intent && !intent.versions.some((row) => row.version === version)) setVersion(intent.activeVersion);
    if (eligibleRooms.length && !eligibleRooms.some((row) => row.id === roomId)) setRoomId(eligibleRooms[0].id);
  }, [intent, version, eligibleRooms, roomId]);
  useEffect(() => { if (eligibleSnapshots.length && !eligibleSnapshots.some((row) => row.id === snapshotId)) setSnapshotId(eligibleSnapshots[0].id); }, [eligibleSnapshots, snapshotId]);

  useEffect(() => {
    const existing = alignments.find((row) => row.designProjectId === designId && row.designVersion === version && row.realitySnapshotId === snapshotId && row.spatialRoomId === roomId) ?? null;
    setAlignment(existing); setEvaluation(existing?.evaluations?.[0] ?? null);
  }, [alignments, designId, version, snapshotId, roomId]);

  function updateAnchor(index: number, side: 'source' | 'target', axis: number, value: string) {
    setAnchors((current) => current.map((anchor, i) => i === index ? { ...anchor, [side]: anchor[side].map((v, j) => j === axis ? (Number(value) || 0) : v) as [number, number, number] } : anchor));
  }

  async function estimate() {
    if (!designId || !version || !snapshotId || !roomId) return;
    setBusy(true); setError(null); setEvaluation(null);
    try {
      const next = await api.assistDesignRealityAlignment(projectId, { designProjectId: designId, designVersion: version, realitySnapshotId: snapshotId, spatialRoomId: roomId, anchors, version: 'design-reality-anchor-v1' });
      setAlignment(next); onAlignment?.(next);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Alignment failed.'); } finally { setBusy(false); }
  }

  async function decide(decision: 'VERIFIED' | 'REJECTED') {
    if (!alignment) return; setBusy(true); setError(null);
    try { const next = await api.decideDesignRealityAlignment(alignment.id, decision); setAlignment(next); onAlignment?.(next); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to update alignment.'); } finally { setBusy(false); }
  }

  async function evaluate() {
    if (!alignment) return; setBusy(true); setError(null);
    try {
      const next = await api.evaluateDesignRealityAlignment(alignment.id, { boundaryM: boundaryMm / 1000, areaRatio: areaPct / 100, ceilingHeightM: heightMm / 1000 });
      setEvaluation(next);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Deviation evaluation failed.'); } finally { setBusy(false); }
  }

  async function createIssue(candidate: DesignRealityDeviationCandidate) {
    const severity = candidate.severity === 'HIGH' ? 'HIGH' : candidate.severity === 'MEDIUM' ? 'MEDIUM' : 'LOW';
    const issue = await api.createProgressIssue(projectId, {
      title: candidate.title, description: `${candidate.description}\n\nTolerance: ${candidate.unit === 'm' ? fmtM(candidate.tolerance) : `${Math.round(candidate.tolerance * 1000) / 10}%`}.`, severity,
      spatialRoomId: roomId, captureSnapshotId: snapshotId, spatialRef: candidate.spatialRef,
      evidenceRefs: evaluation ? [`designRealityEvaluation:${evaluation.id}`, `designRealityAlignment:${alignment?.id}`] : undefined
    });
    onIssue?.(issue);
  }

  return <section className="progress-panel-stack">
    <section className="progress-card"><div className="progress-section-title"><div><p className="eyebrow">Design ↔ Reality v1</p><h2>Align approved intent to captured geometry</h2></div><strong>{alignment ? `${Math.round(alignment.confidence * 100)}% · ${alignment.status}` : 'Not aligned'}</strong></div>
      <p className="muted">Select a design version, a later reality capture and the same persistent spatial room. Alignment is scale-locked; deviations are not evaluated until a human verifies the transform.</p>
      <div className="compare-selectors design-reality-selectors">
        <label>Design intent<select value={designId} onChange={(e) => setDesignId(e.target.value)}><option value="">Select design</option>{intents.map((row) => <option key={row.id} value={row.id}>{row.name} · {row.verificationStatus}</option>)}</select></label>
        <label>Design version<select value={version || ''} onChange={(e) => setVersion(Number(e.target.value))}>{intent?.versions.map((row) => <option key={row.version} value={row.version}>v{row.version}{row.label ? ` · ${row.label}` : ''}</option>)}</select></label>
        <label>Reality capture<select value={snapshotId} onChange={(e) => setSnapshotId(e.target.value)}>{eligibleSnapshots.map((row) => <option key={row.id} value={row.id}>{new Date(row.capturedAt).toLocaleString()} · {row.sourceType}</option>)}</select></label>
        <label>Spatial room<select value={roomId} onChange={(e) => setRoomId(e.target.value)}>{eligibleRooms.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
      </div>
      {!intents.length && <div className="notice">No design intent exists for this unit yet. Create/confirm a Mode B design project first.</div>}
      {error && <div className="notice notice-error">{error}</div>}
    </section>

    <section className="progress-card"><div className="progress-section-title"><div><p className="eyebrow">Design → Reality transform</p><h2>Three-point assisted alignment</h2></div></div>
      <p className="muted">Use the same physical points in the design and captured room coordinate systems, in metres. Three or more anchors estimate a rigid transform; fewer anchors intentionally reduce confidence.</p>
      <div className="anchor-grid">{anchors.map((anchor, i) => <div className="anchor-row" key={i}><strong>Anchor {i + 1}</strong>{(['source', 'target'] as const).map((side) => <div key={side}><span>{side === 'source' ? 'design' : 'reality'}</span>{[0,1,2].map((axis) => <input key={axis} type="number" step="0.01" value={anchor[side][axis]} onChange={(e) => updateAnchor(i, side, axis, e.target.value)}/>)}</div>)}</div>)}</div>
      <div className="registration-actions"><button className="button button-primary" disabled={busy || !designId || !version || !snapshotId || !roomId} onClick={() => void estimate()}>{busy ? 'Working…' : 'Estimate alignment'}</button>{alignment && <><button className="button button-secondary" disabled={busy} onClick={() => void decide('VERIFIED')}>Verify alignment</button><button className="button button-secondary" disabled={busy} onClick={() => void decide('REJECTED')}>Reject</button></>}</div>
    </section>

    <section className="progress-card"><div className="progress-section-title"><div><p className="eyebrow">Tolerance policy</p><h2>Deterministic deviation check</h2></div><button className="button button-primary" disabled={!alignment || alignment.status !== 'VERIFIED' || busy} onClick={() => void evaluate()}>Evaluate verified alignment</button></div>
      <div className="deviation-tolerances"><label>Boundary<input type="number" min="1" max="1000" value={boundaryMm} onChange={(e) => setBoundaryMm(Number(e.target.value) || 1)}/><span>mm</span></label><label>Area<input type="number" min="0.1" max="100" step="0.5" value={areaPct} onChange={(e) => setAreaPct(Number(e.target.value) || 0.1)}/><span>%</span></label><label>Ceiling<input type="number" min="1" max="1000" value={heightMm} onChange={(e) => setHeightMm(Number(e.target.value) || 1)}/><span>mm</span></label></div>
      {!alignment || alignment.status !== 'VERIFIED' ? <p className="muted">Verify the alignment before calculating geometric differences.</p> : null}
    </section>

    {evaluation && <><section className="progress-card"><div className="progress-section-title"><div><p className="eyebrow">Geometry overlay</p><h2>{evaluation.report.designRoom.name ?? 'Design'} ↔ {evaluation.report.realityRoom.name ?? 'Reality'}</h2></div></div>
      <PlanOverlay design={evaluation.report.overlay.transformedDesignPolygon} reality={evaluation.report.overlay.realityPolygon}/>
      <div className="stats-row deviation-metrics"><article><span>Boundary max</span><strong>{fmtM(evaluation.report.metrics.boundary.maxM)}</strong><small>P95 {fmtM(evaluation.report.metrics.boundary.p95M)}</small></article><article><span>Area delta</span><strong>{Math.round(evaluation.report.metrics.area.deltaRatio * 1000) / 10}%</strong><small>{evaluation.report.metrics.area.designM2} → {evaluation.report.metrics.area.realityM2} m²</small></article><article><span>Ceiling delta</span><strong>{evaluation.report.metrics.ceilingHeight ? fmtM(Math.abs(evaluation.report.metrics.ceilingHeight.deltaM)) : '—'}</strong><small>{evaluation.report.metrics.ceilingHeight ? `${evaluation.report.metrics.ceilingHeight.designM} → ${evaluation.report.metrics.ceilingHeight.realityM} m` : 'No comparable height'}</small></article></div>
      <p className="muted">{evaluation.report.disclaimer}</p></section>
      <section className="progress-card"><div className="progress-section-title"><div><p className="eyebrow">Review candidates</p><h2>{evaluation.report.deviations.length} deviations over tolerance</h2></div></div><div className="design-reality-deviation-list">{evaluation.report.deviations.map((candidate, index) => <article key={`${candidate.kind}-${index}`}><div><span className={`severity severity-${candidate.severity.toLowerCase()}`}>{candidate.severity}</span><strong>{candidate.title}</strong><p>{candidate.description}</p></div><button className="button button-secondary" onClick={() => void createIssue(candidate)}>Create issue</button></article>)}{!evaluation.report.deviations.length && <p className="muted">No deterministic room-geometry metric exceeded the selected tolerances.</p>}</div></section></>}
  </section>;
}
