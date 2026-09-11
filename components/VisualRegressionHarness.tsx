'use client';

import { useEffect, useState } from 'react';
import { ScenePreview } from './ScenePreview';
import { sampleDesignModel } from '@/lib/sample-model';
import { LIGHTING_PRESETS, type LightingPresetName } from '@/lib/visual/lighting';
import { RENDER_QUALITY_PROFILES, type RenderQuality } from '@/lib/visual/quality';
import type { RenderTelemetry } from '@/lib/visual/performance';

function queryValue<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const value = new URLSearchParams(window.location.search).get(key) as T | null;
  return value && allowed.includes(value) ? value : fallback;
}

export function VisualRegressionHarness() {
  const [quality, setQuality] = useState<RenderQuality>('CINEMATIC');
  const [lighting, setLighting] = useState<LightingPresetName>('DAYLIGHT');
  const [telemetry, setTelemetry] = useState<RenderTelemetry | null>(null);
  const [snapshot, setSnapshot] = useState(0);

  useEffect(() => {
    setQuality(queryValue('quality', Object.keys(RENDER_QUALITY_PROFILES) as RenderQuality[], 'CINEMATIC'));
    setLighting(queryValue('lighting', Object.keys(LIGHTING_PRESETS) as LightingPresetName[], 'DAYLIGHT'));
  }, []);

  return (
    <main className="visual-regression-page" data-visual-regression-ready={telemetry ? 'true' : 'false'}>
      <header>
        <div>
          <span>ProgressionAi Visual Engine v1</span>
          <h1>Deterministic visual regression fixture</h1>
        </div>
        <div className="visual-regression-controls">
          <label>Quality<select value={quality} onChange={(event) => setQuality(event.target.value as RenderQuality)}>{Object.values(RENDER_QUALITY_PROFILES).map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}</select></label>
          <label>Lighting<select value={lighting} onChange={(event) => setLighting(event.target.value as LightingPresetName)}>{Object.values(LIGHTING_PRESETS).map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}</select></label>
          <button onClick={() => setSnapshot(Date.now())}>Download PNG</button>
        </div>
      </header>
      <section className="visual-regression-canvas">
        <ScenePreview
          model={sampleDesignModel}
          selection={null}
          cameraMode="ORBIT"
          transformMode="translate"
          showCeiling={false}
          quality={quality}
          lighting={lighting}
          snapshotToken={snapshot}
          onTelemetry={setTelemetry}
        />
      </section>
      <footer>
        <code>quality={quality} lighting={lighting}</code>
        <span>{telemetry ? `${telemetry.frameMs} ms · ${telemetry.calls} calls · ${telemetry.triangles} triangles · ${telemetry.textures} textures` : 'waiting for first frame'}</span>
      </footer>
    </main>
  );
}
