export type LightingPresetName = 'DAYLIGHT' | 'OVERCAST' | 'GOLDEN_HOUR' | 'EVENING' | 'INTERIOR';

export interface LightingPreset {
  id: LightingPresetName;
  label: string;
  background: number;
  fog: number;
  fogDensity: number;
  hemisphereSky: number;
  hemisphereGround: number;
  hemisphereIntensity: number;
  sunColor: number;
  sunIntensity: number;
  fillColor: number;
  fillIntensity: number;
  warmColor: number;
  warmIntensity: number;
  toneExposure: number;
  environmentIntensity: number;
  sunAzimuth: number;
  sunElevation: number;
}

export const LIGHTING_PRESETS: Record<LightingPresetName, LightingPreset> = {
  DAYLIGHT: {
    id: 'DAYLIGHT', label: 'Daylight', background: 0x0b1716, fog: 0x0b1716, fogDensity: 0.009,
    hemisphereSky: 0xe8fbff, hemisphereGround: 0x211810, hemisphereIntensity: 1.25,
    sunColor: 0xfff1d5, sunIntensity: 3.4, fillColor: 0xb7d7ff, fillIntensity: 2.7,
    warmColor: 0xffc982, warmIntensity: 3.1, toneExposure: 1.08, environmentIntensity: 1.0,
    sunAzimuth: -0.65, sunElevation: 1.1,
  },
  OVERCAST: {
    id: 'OVERCAST', label: 'Overcast', background: 0x11191b, fog: 0x11191b, fogDensity: 0.012,
    hemisphereSky: 0xe2edf0, hemisphereGround: 0x313236, hemisphereIntensity: 1.75,
    sunColor: 0xe8f0f2, sunIntensity: 0.85, fillColor: 0xc8dce4, fillIntensity: 3.2,
    warmColor: 0xf4d7ba, warmIntensity: 1.35, toneExposure: 1.02, environmentIntensity: 0.9,
    sunAzimuth: -0.3, sunElevation: 1.4,
  },
  GOLDEN_HOUR: {
    id: 'GOLDEN_HOUR', label: 'Golden hour', background: 0x1d1411, fog: 0x1d1411, fogDensity: 0.009,
    hemisphereSky: 0xffd6a3, hemisphereGround: 0x2c1610, hemisphereIntensity: 0.9,
    sunColor: 0xffad63, sunIntensity: 4.0, fillColor: 0x7e9fc8, fillIntensity: 1.65,
    warmColor: 0xffbd76, warmIntensity: 3.8, toneExposure: 1.04, environmentIntensity: 0.72,
    sunAzimuth: -1.0, sunElevation: 0.55,
  },
  EVENING: {
    id: 'EVENING', label: 'Evening', background: 0x070b14, fog: 0x070b14, fogDensity: 0.014,
    hemisphereSky: 0x7789b5, hemisphereGround: 0x100d0b, hemisphereIntensity: 0.55,
    sunColor: 0x91a6d5, sunIntensity: 0.28, fillColor: 0x7e9fd4, fillIntensity: 0.7,
    warmColor: 0xffb35f, warmIntensity: 5.2, toneExposure: 0.96, environmentIntensity: 0.38,
    sunAzimuth: 0.9, sunElevation: 0.32,
  },
  INTERIOR: {
    id: 'INTERIOR', label: 'Interior lights', background: 0x080d0d, fog: 0x080d0d, fogDensity: 0.012,
    hemisphereSky: 0xc8d7d7, hemisphereGround: 0x17110d, hemisphereIntensity: 0.7,
    sunColor: 0xf1e3cf, sunIntensity: 0.35, fillColor: 0xbacde2, fillIntensity: 1.05,
    warmColor: 0xffbd72, warmIntensity: 5.8, toneExposure: 1.0, environmentIntensity: 0.48,
    sunAzimuth: -0.4, sunElevation: 0.85,
  },
};

export function lightingPreset(name: LightingPresetName): LightingPreset {
  return LIGHTING_PRESETS[name] ?? LIGHTING_PRESETS.DAYLIGHT;
}
