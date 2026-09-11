'use client';

import type { RenderTelemetry } from '@/lib/visual/performance';

export function VisualPerformanceHud({ telemetry }: { telemetry: RenderTelemetry | null }) {
  if (!telemetry) return <div className="visual-hud visual-hud-idle">Waiting for renderer…</div>;
  const triangleLabel = telemetry.triangles >= 1_000_000
    ? `${(telemetry.triangles / 1_000_000).toFixed(1)}M`
    : telemetry.triangles >= 1_000 ? `${Math.round(telemetry.triangles / 1000)}k` : String(telemetry.triangles);
  return (
    <div className={`visual-hud${telemetry.degraded ? ' visual-hud-warning' : ''}`}>
      <strong>{telemetry.quality}</strong>
      <span>{telemetry.fps || '—'} fps</span>
      <span>{telemetry.frameMs || '—'} ms</span>
      <span>{telemetry.calls} calls</span>
      <span>{triangleLabel} tris</span>
      <span>{telemetry.textures} tex</span>
      <span>{telemetry.pixelRatio.toFixed(2)}× DPR</span>
      {telemetry.degraded && <em>adaptive fallback active</em>}
    </div>
  );
}
