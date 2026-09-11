import { LOCAL_ASSET_ROOT } from './assetRegistry';

export type PbrChannel = 'baseColor' | 'normal' | 'roughness' | 'metallic' | 'ao' | 'height';
export type PbrDescriptor = {
  id: string;
  root: string;
  realWorldSizeM: [number, number];
  channels: Partial<Record<PbrChannel, string>>;
};

const descriptor = (id: string, size: [number, number]): PbrDescriptor => {
  const root = `${LOCAL_ASSET_ROOT}/pbr/${id}`;
  return {
    id,
    root,
    realWorldSizeM: size,
    channels: {
      baseColor: `${root}/basecolor.webp`, normal: `${root}/normal.webp`, roughness: `${root}/roughness.webp`, ao: `${root}/ao.webp`,
    },
  };
};

export const PBR_MATERIAL_REGISTRY = {
  oak: descriptor('oak', [1.8, 1.8]),
  walnut: descriptor('walnut', [1.6, 1.6]),
  marble: descriptor('marble', [2.4, 2.4]),
  tile: descriptor('tile', [1.2, 1.2]),
  plaster: descriptor('plaster', [2.2, 2.2]),
  fabricSand: descriptor('fabric_sand', [0.55, 0.55]),
  fabricCharcoal: descriptor('fabric_charcoal', [0.55, 0.55]),
  rug: descriptor('rug', [1.1, 1.1]),
  metal: descriptor('brushed_metal', [0.45, 0.45]),
} as const;

export type LocalPbrId = keyof typeof PBR_MATERIAL_REGISTRY;
