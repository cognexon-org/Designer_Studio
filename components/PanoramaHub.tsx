'use client';

/**
 * Organisation-wide 360° library (`/studio/panoramas`).
 *
 * Every finished Mode A panorama the organisation has captured, browsable in
 * one place, with an attach flow that reaches into any design project: pick a
 * capture, pick a project, pick a room, and the link is written into that
 * project's canonical model as a new version. The per-project 360 tab inside
 * Studio does the same thing scoped to one open model; this page exists so a
 * designer can triage a whole day of site captures without opening each
 * project first.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { Pano360Viewer } from './Pano360Viewer';
import { cloneModel } from '@/lib/model';
import type { DesignProject, PanoramaAsset } from '@/lib/types';

type AttachState =
  | { step: 'IDLE' }
  | { step: 'PICK_ROOM'; project: DesignProject }
  | { step: 'SAVING'; project: DesignProject; roomId: string };

export function PanoramaHub() {
  const [panos, setPanos] = useState<PanoramaAsset[]>([]);
  const [projects, setProjects] = useState<DesignProject[]>([]);
  const [selected, setSelected] = useState<PanoramaAsset | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [projectId, setProjectId] = useState('');
  const [attach, setAttach] = useState<AttachState>({ step: 'IDLE' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [panoList, projectList] = await Promise.all([api.listPanoramas(), api.listProjects()]);
        if (!live) return;
        setPanos(panoList);
        setProjects(projectList);
        if (panoList.length) setSelected(panoList[0]);
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : 'Could not load the 360° library');
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, []);

  // Preview URL is presigned and short-lived, so it is fetched per selection.
  useEffect(() => {
    let live = true;
    setPreviewUrl(null);
    if (!selected) return;
    api.getCaptureAssetUrl(selected.captureId, selected.assetId)
      .then(r => { if (live) setPreviewUrl(r.url); })
      .catch(() => { if (live) setNotice('Preview unavailable for this capture'); });
    return () => { live = false; };
  }, [selected]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return panos;
    return panos.filter(p =>
      [p.roomName, p.propertyName, p.unitLabel].some(v => (v ?? '').toLowerCase().includes(q)));
  }, [panos, filter]);

  const beginAttach = useCallback(async () => {
    if (!selected || !projectId) return;
    try {
      const project = await api.getProject(projectId);
      setAttach({ step: 'PICK_ROOM', project });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open that project');
    }
  }, [selected, projectId]);

  const attachToRoom = useCallback(async (roomId: string) => {
    if (!selected || attach.step !== 'PICK_ROOM') return;
    const project = attach.project;
    setAttach({ step: 'SAVING', project, roomId });
    try {
      const url = (await api.getCaptureAssetUrl(selected.captureId, selected.assetId)).url;
      const model = cloneModel(project.model);
      const room = model.rooms.find(r => r.id === roomId);
      if (!room) throw new Error('Room no longer exists in that project');
      room.panoramaUrl = url;
      room.panoramaAssetId = selected.assetId;
      await api.updateModel(project.id, model, `Linked 360° capture to ${room.name}`);
      setNotice(`Linked to ${room.name} in “${project.name}” — new version saved`);
      setAttach({ step: 'IDLE' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Attach failed');
      setAttach({ step: 'PICK_ROOM', project });
    }
  }, [selected, attach]);

  return (
    <div className="pano-library pano-hub">
      <aside className="pano-list">
        <header>
          <div><small>Mode A</small><h3>360° captures</h3></div>
          <span className="pano-count">{panos.length}</span>
        </header>
        <input placeholder="Filter by room, property, unit…" value={filter} onChange={e => setFilter(e.target.value)} />
        {loading && <p className="pano-muted">Loading captures…</p>}
        {error && <p className="pano-error">{error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <p className="pano-muted">
            No stitched panoramas yet. Run a Mode A guided capture in the field app and it will appear here automatically.
          </p>
        )}
        <div className="pano-items">
          {filtered.map(p => (
            <button key={p.assetId} className={selected?.assetId === p.assetId ? 'active' : ''} onClick={() => setSelected(p)}>
              <strong>{p.roomName ?? 'Unnamed room'}</strong>
              <small>{[p.propertyName, p.unitLabel].filter(Boolean).join(' · ') || 'Unlinked capture'}</small>
              <span>
                <em className={p.status === 'APPROVED' ? 'ok' : 'warn'}>{p.status}</em>
                {p.qaScore != null && <em>QA {p.qaScore}</em>}
                {new Date(p.createdAt).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className="pano-stage">
        {selected && previewUrl ? (
          <Pano360Viewer url={previewUrl} caption={selected.roomName ?? 'panorama'} />
        ) : (
          <div className="pano-empty">
            <p>{loading ? 'Loading…' : selected ? 'Fetching preview…' : 'Select a capture to preview it'}</p>
          </div>
        )}
        {selected && (
          <div className="pano-stage-bar">
            <div>
              <strong>{selected.roomName ?? 'Unnamed room'}</strong>
              <span>{[selected.propertyName, selected.unitLabel].filter(Boolean).join(' · ')}</span>
            </div>
            <span className="pano-hint">Equirectangular · drag inside a project's Walkthrough for the immersive view</span>
          </div>
        )}
      </section>

      <aside className="pano-attach">
        <header><div><small>Use it</small><h3>Attach to a project</h3></div></header>
        {notice && <p className="pano-muted" style={{ color: '#4ecfa0' }}>{notice}</p>}

        {attach.step === 'IDLE' && (
          <>
            <p className="pano-muted">Linking writes the capture into the project's model as a new version, so the room's ◎ marker shows the real photograph in the walkthrough.</p>
            <div className="inspector-field" style={{ marginTop: 12 }}>
              <span>Design project</span>
              <select value={projectId} onChange={e => setProjectId(e.target.value)}>
                <option value="">Choose a project…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <button className="button" style={{ width: '100%', marginTop: 8 }}
              disabled={!selected || !projectId} onClick={() => void beginAttach()}>
              Choose the room →
            </button>
          </>
        )}

        {(attach.step === 'PICK_ROOM' || attach.step === 'SAVING') && (
          <>
            <p className="pano-muted">Rooms in <strong>{attach.project.name}</strong>:</p>
            <div className="pano-rooms">
              {attach.project.model.rooms.map(r => {
                const linked = Boolean(r.panoramaUrl || r.panoramaAssetId);
                const saving = attach.step === 'SAVING' && attach.roomId === r.id;
                return (
                  <div key={r.id} className={`pano-room${linked ? ' linked' : ''}`}>
                    <div>
                      <strong>{r.name}</strong>
                      <small>{linked ? 'Has a 360° — attaching replaces it' : 'No 360° linked'}</small>
                    </div>
                    <button className="button" disabled={attach.step === 'SAVING'} onClick={() => void attachToRoom(r.id)}>
                      {saving ? 'Saving…' : 'Attach'}
                    </button>
                  </div>
                );
              })}
            </div>
            <button className="button button-secondary" style={{ width: '100%', marginTop: 12 }}
              disabled={attach.step === 'SAVING'} onClick={() => setAttach({ step: 'IDLE' })}>
              Back
            </button>
          </>
        )}
      </aside>
    </div>
  );
}
