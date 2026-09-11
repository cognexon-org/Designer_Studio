'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { ProjectReport } from '@/lib/types';

function fmt(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function downloadJson(report: ProjectReport) {
  const blob = new Blob([JSON.stringify(report.content, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = `progression-report-${report.id}.json`; anchor.click();
  URL.revokeObjectURL(url);
}

export function ProgressReportsWorkspace({ projectId, initialReports = [], onReportsChanged }: { projectId: string; initialReports?: ProjectReport[]; onReportsChanged?: (rows: ProjectReport[]) => void }) {
  const [reports, setReports] = useState(initialReports);
  const [selected, setSelected] = useState<ProjectReport | null>(initialReports[0] ?? null);
  const [type, setType] = useState<'WEEKLY' | 'MILESTONE' | 'HANDOVER' | 'CUSTOM'>('MILESTONE');
  const [label, setLabel] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setReports(initialReports); if (!selected && initialReports[0]) setSelected(initialReports[0]); }, [initialReports]);

  async function generate() {
    setBusy(true); setError(null);
    try {
      const report = await api.createProgressReport(projectId, {
        reportType: type, label: label.trim() || undefined,
        periodStart: start ? new Date(`${start}T00:00:00`).toISOString() : undefined,
        periodEnd: end ? new Date(`${end}T23:59:59`).toISOString() : undefined
      });
      const next = [report, ...reports.filter((row) => row.id !== report.id)]; setReports(next); setSelected(report); onReportsChanged?.(next);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to generate report.'); }
    finally { setBusy(false); }
  }

  return <section className="progress-panel-stack report-workspace">
    {error && <div className="notice notice-error">{error}</div>}
    <section className="progress-card">
      <div className="progress-section-title"><div><p className="eyebrow">Reports v1</p><h2>Generate an evidence-bounded project review</h2></div></div>
      <div className="report-builder-row"><label>Type<select value={type} onChange={(e) => setType(e.target.value as typeof type)}><option>WEEKLY</option><option>MILESTONE</option><option>HANDOVER</option><option>CUSTOM</option></select></label><label>Label<input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Week 6 review"/></label><label>From<input type="date" value={start} onChange={(e) => setStart(e.target.value)}/></label><label>To<input type="date" value={end} onChange={(e) => setEnd(e.target.value)}/></label><button className="button button-primary" disabled={busy} onClick={() => void generate()}>{busy ? 'Generating…' : 'Generate report'}</button></div>
      <p className="muted">Reports separate verified human state from proposed observations and intentionally omit raw private evidence URLs.</p>
    </section>

    <section className="report-layout">
      <div className="progress-card report-list">{reports.map((report) => <button type="button" key={report.id} className={selected?.id === report.id ? 'active' : ''} onClick={() => setSelected(report)}><strong>{report.label || report.reportType}</strong><span>{fmt(report.createdAt)}</span><small>{report.content.counts.snapshots} captures · {report.content.counts.openIssues} open issues</small></button>)}{!reports.length && <p className="muted">No reports generated yet.</p>}</div>
      <div className="progress-card report-preview">
        {selected ? <>
          <div className="progress-section-title"><div><p className="eyebrow">{selected.reportType}</p><h2>{selected.label || selected.content.project.name}</h2></div><div className="report-actions"><button className="button button-secondary" onClick={() => downloadJson(selected)}>Download JSON</button><button className="button button-secondary" onClick={() => window.print()}>Print / Save PDF</button></div></div>
          <p>{selected.content.project.propertyName} · {selected.content.project.unitLabel}</p><p className="muted">Period {fmt(selected.content.period.start)} → {fmt(selected.content.period.end)}</p>
          <div className="stats-row report-stats"><article><span>Captures</span><strong>{selected.content.counts.snapshots}</strong></article><article><span>Open issues</span><strong>{selected.content.counts.openIssues}</strong></article><article><span>Resolved</span><strong>{selected.content.counts.resolvedIssues}</strong></article><article><span>Verified observations</span><strong>{selected.content.counts.verifiedObservations}</strong></article></div>
          <section className="report-section"><h3>Issues</h3>{selected.content.issues.map((issue) => <article key={issue.id}><div><span className={`severity severity-${issue.severity.toLowerCase()}`}>{issue.severity}</span><strong>{issue.title}</strong></div><p>{issue.status} · verification {issue.verification}</p></article>)}{!selected.content.issues.length && <p className="muted">No issues in this period.</p>}</section>
          <section className="report-section"><h3>Human-verified AI observations</h3>{selected.content.verifiedObservations.map((row) => <article key={row.id}><strong>{row.observationType.replaceAll('_',' ')}</strong><p>{row.status} · confidence {Math.round(row.confidence * 100)}%</p></article>)}{!selected.content.verifiedObservations.length && <p className="muted">No verified AI observations.</p>}</section>
          <section className="report-section proposed"><h3>Proposed / unverified observations</h3>{selected.content.proposedObservations.map((row) => <article key={row.id}><strong>{row.observationType.replaceAll('_',' ')}</strong><p>PROPOSED · confidence {Math.round(row.confidence * 100)}%</p></article>)}{!selected.content.proposedObservations.length && <p className="muted">No proposed observations.</p>}</section>
          <div className="report-disclaimer"><strong>Trust boundary</strong><p>{selected.content.disclaimer}</p></div>
        </> : <p className="muted">Generate or select a report.</p>}
      </div>
    </section>
  </section>;
}
