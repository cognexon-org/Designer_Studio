'use client';

/**
 * Mode A panorama library.
 *
 * Every stitched 360 the organisation owns, browsable and attachable to a room
 * of the open design project. Attaching is what makes the ◎ marker in the
 * walkthrough show a real photograph instead of a render of the model.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { Pano360Viewer } from './Pano360Viewer';
import { Icon } from './Icon';
import type { DesignModel, PanoramaAsset } from '@/lib/types';

interface Props {
  model: DesignModel;
  /** roomId -> signed URL, already resolved by Studio. */
  attached: Record<string, string>;
  onAttach: (roomId: string, assetId: string, url: string) => void;
  onDetach: (roomId: string) => void;
}

export function PanoramaLibrary({ model, attached, onAttach, onDetach }: Props) {
  const [items, setItems] = useState<PanoramaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [active, setActive] = useState<PanoramaAsset | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await api.listPanoramas();
        if (!alive) return;
        setItems(list); setLoading(false);
        if (list.length) void openOne(list[0]);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : 'Could not load panoramas');
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  async function resolve(item: PanoramaAsset): Promise<string> {
    if (urls[item.assetId]) return urls[item.assetId];
    const { url } = await api.getCaptureAssetUrl(item.captureId, item.assetId);
    setUrls(u => ({ ...u, [item.assetId]: url }));
    return url;
  }
  async function openOne(item: PanoramaAsset) {
    try { await resolve(item); setActive(item); }
    catch { setError('Could not fetch a link for that panorama.'); }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i => `${i.roomName ?? ''} ${i.propertyName ?? ''} ${i.unitLabel ?? ''}`.toLowerCase().includes(q));
  }, [items, query]);

  const attachedCount = Object.keys(attached).length;

  return (
    <div className="pano-library">
      <aside className="pano-list">
        <header>
          <div>
            <small>MODE A</small>
            <h3>360° library</h3>
          </div>
          <span className="pano-count">{items.length}</span>
        </header>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search room, property or unit" />
        {loading && <p className="pano-muted">Loading captured panoramas…</p>}
        {!loading && !items.length && !error && (
          <p className="pano-muted">
            No stitched panoramas yet. Run a Mode A capture and stitch it, then it appears here.
          </p>
        )}
        {error && <p className="pano-error">{error}</p>}
        <div className="pano-items">
          {filtered.map(item => (
            <button
              key={item.assetId}
              className={active?.assetId === item.assetId ? 'active' : ''}
              onClick={() => void openOne(item)}
            >
              <strong>{item.roomName ?? 'Unassigned room'}</strong>
              <small>{[item.propertyName, item.unitLabel].filter(Boolean).join(' · ') || 'Unknown unit'}</small>
              <span>
                {item.qaScore != null && <em className={item.qaScore >= 70 ? 'ok' : 'warn'}>QA {item.qaScore}</em>}
                {new Date(item.createdAt).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className="pano-stage">
        {active && urls[active.assetId] ? (
          <>
            <Pano360Viewer caption={active?.roomName ?? 'panorama'} url={urls[active.assetId]} />
            <div className="pano-stage-bar">
              <div>
                <strong>{active.roomName ?? 'Unassigned room'}</strong>
                <span>{[active.propertyName, active.unitLabel].filter(Boolean).join(' · ')}</span>
              </div>
              <span className="pano-hint">Drag to look around</span>
            </div>
          </>
        ) : (
          <div className="pano-empty">
            <Icon name="cube" size={38} />
            <p>{items.length ? 'Select a panorama to preview it.' : 'Nothing to preview yet.'}</p>
          </div>
        )}
      </section>

      <aside className="pano-attach">
        <header>
          <small>ATTACH TO ROOM</small>
          <h3>{attachedCount} of {model.rooms.length} linked</h3>
        </header>
        <p className="pano-muted">
          Linking a panorama makes the ◎ marker in that room show the real photograph
          during walkthrough instead of a render of the model.
        </p>
        <div className="pano-rooms">
          {model.rooms.map(room => {
            const has = attached[room.id];
            return (
              <div key={room.id} className={`pano-room${has ? ' linked' : ''}`}>
                <div>
                  <strong>{room.name}</strong>
                  <small>{has ? 'Panorama linked' : 'No 360° linked'}</small>
                </div>
                {has ? (
                  <button className="button button-secondary" onClick={() => onDetach(room.id)}>Unlink</button>
                ) : (
                  <button
                    className="button button-primary"
                    disabled={!active || !urls[active.assetId]}
                    onClick={() => active && onAttach(room.id, active.assetId, urls[active.assetId])}
                  >
                    Link selected
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
