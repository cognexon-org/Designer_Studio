'use client';
import type { CaptureSnapshot, SpatialRoomSummary } from '@/lib/types';
import { StatusBadge } from './StatusBadge';

function fmt(value: string) { return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
export function ProgressTimeline({ snapshots, rooms, roomId, sourceType, onRoom, onSource }: { snapshots: CaptureSnapshot[]; rooms: SpatialRoomSummary[]; roomId: string; sourceType: string; onRoom: (v:string)=>void; onSource:(v:string)=>void }) {
  return <section className="progress-card">
    <div className="progress-section-title"><div><p className="eyebrow">Project history</p><h2>Capture timeline</h2></div><span>{snapshots.length} snapshots</span></div>
    <div className="timeline-filters"><label>Room<select value={roomId} onChange={e=>onRoom(e.target.value)}><option value="">All rooms</option>{rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label><label>Capture type<select value={sourceType} onChange={e=>onSource(e.target.value)}><option value="">Mode A + Mode B</option><option value="PROPERTY_TOUR">Mode A · Reality</option><option value="DESIGN_SCAN">Mode B · Spatial scan</option></select></label></div>
    <div className="progress-timeline rich-timeline">{snapshots.map(s=><article key={s.id} className="timeline-event"><div className="timeline-dot"/><div><div className="timeline-event-head"><strong>{s.sourceType === 'PROPERTY_TOUR' ? 'Mode A · Reality' : 'Mode B · Spatial scan'}</strong><StatusBadge status={s.status}/></div><span>{fmt(s.capturedAt)} · {s.floor?.name ?? 'Project scope'}</span><small>{s.capture.rooms.length} capture rooms · {s.capture.assets.length} assets · {s.capture.designProjects?.length ?? 0} design workspaces</small></div></article>)}</div>
  </section>;
}
