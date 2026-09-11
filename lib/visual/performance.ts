import type * as THREE from 'three';
import type { RenderQuality } from './quality';

export interface RenderTelemetry {
  quality: RenderQuality;
  frameMs: number;
  fps: number;
  calls: number;
  triangles: number;
  lines: number;
  points: number;
  geometries: number;
  textures: number;
  pixelRatio: number;
  degraded: boolean;
  capturedAt: number;
}

export function rendererTelemetry(
  renderer: THREE.WebGLRenderer,
  quality: RenderQuality,
  frameMs: number,
  degraded = false,
): RenderTelemetry {
  const info = renderer.info;
  return {
    quality,
    frameMs: Math.round(frameMs * 10) / 10,
    fps: frameMs > 0 ? Math.round(1000 / frameMs) : 0,
    calls: info.render.calls,
    triangles: info.render.triangles,
    lines: info.render.lines,
    points: info.render.points,
    geometries: info.memory.geometries,
    textures: info.memory.textures,
    pixelRatio: renderer.getPixelRatio(),
    degraded,
    capturedAt: Date.now(),
  };
}
