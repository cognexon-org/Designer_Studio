export type RenderQuality = 'PERFORMANCE' | 'BALANCED' | 'HIGH' | 'CINEMATIC';

export interface RenderQualityProfile {
  id: RenderQuality;
  label: string;
  maxPixelRatio: number;
  antialias: boolean;
  shadows: boolean;
  shadowMapSize: number;
  postProcessing: 'OFF' | 'SSAO' | 'SSAO_SMAA';
  maxAnisotropy: number;
  maxDynamicRoomLights: number;
  textureBias: number;
}

export const RENDER_QUALITY_PROFILES: Record<RenderQuality, RenderQualityProfile> = {
  PERFORMANCE: {
    id: 'PERFORMANCE', label: 'Performance', maxPixelRatio: 1, antialias: false, shadows: false,
    shadowMapSize: 1024, postProcessing: 'OFF', maxAnisotropy: 2, maxDynamicRoomLights: 0, textureBias: 2,
  },
  BALANCED: {
    id: 'BALANCED', label: 'Balanced', maxPixelRatio: 1.25, antialias: true, shadows: true,
    shadowMapSize: 1536, postProcessing: 'OFF', maxAnisotropy: 6, maxDynamicRoomLights: 2, textureBias: 1,
  },
  HIGH: {
    id: 'HIGH', label: 'High', maxPixelRatio: 1.5, antialias: true, shadows: true,
    shadowMapSize: 2048, postProcessing: 'SSAO', maxAnisotropy: 10, maxDynamicRoomLights: 4, textureBias: 0,
  },
  CINEMATIC: {
    id: 'CINEMATIC', label: 'Cinematic', maxPixelRatio: 2, antialias: true, shadows: true,
    shadowMapSize: 4096, postProcessing: 'SSAO_SMAA', maxAnisotropy: 16, maxDynamicRoomLights: 8, textureBias: 0,
  },
};

export function qualityProfile(value: RenderQuality): RenderQualityProfile {
  return RENDER_QUALITY_PROFILES[value] ?? RENDER_QUALITY_PROFILES.BALANCED;
}

export function legacyQuality(value: string | undefined): RenderQuality {
  if (value === 'LOW') return 'PERFORMANCE';
  if (value === 'MEDIUM') return 'BALANCED';
  if (value === 'HIGH') return 'HIGH';
  if (value === 'CINEMATIC') return 'CINEMATIC';
  if (value === 'PERFORMANCE' || value === 'BALANCED') return value;
  return 'BALANCED';
}
