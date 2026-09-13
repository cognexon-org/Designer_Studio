import type { CatalogueAsset, FurnitureObject, ProductRecord } from '@/lib/types';
import { LOCAL_ASSET_ROOT } from './assetRegistry';

type StaticRegistryLod = {
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  file: string;
  maxDistanceM?: number;
  maxTriangles?: number;
};

type StaticRegistryModel = {
  id: string;
  category: string;
  primary: string;
  nativeBoundsM: [number, number, number]; // [width, height, depth]
  fit?: 'UNIFORM_CONTAIN' | 'EXACT_SIZE' | 'NATIVE';
  coordinateSystem?: 'Y_UP' | 'Z_UP';
  unit?: 'metre' | 'centimetre' | 'millimetre';
  collision?: Record<string, unknown>;
  lods?: StaticRegistryLod[];
  castShadow?: boolean;
  receiveShadow?: boolean;
  tags?: string[];
};

type StaticRegistry = { models?: StaticRegistryModel[] };

function title(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function url(file: string): string {
  return `${LOCAL_ASSET_ROOT}/${file.replace(/^\/+/, '')}`;
}

export function catalogueFurnitureType(category = '', name = ''): FurnitureObject['type'] {
  const value = `${category} ${name}`.toLowerCase();
  if (value.includes('sofa') || value.includes('sectional')) return 'SOFA';
  if (value.includes('chair') || value.includes('stool')) return 'CHAIR';
  if (value.includes('bed')) return 'BED';
  if (value.includes('table')) return 'TABLE';
  if (value.includes('island') || value.includes('cabinet') || value.includes('wardrobe') || value.includes('vanity')) return 'CABINET';
  if (value.includes('lamp') || value.includes('light') || value.includes('pendant')) return 'LAMP';
  if (value.includes('plant')) return 'PLANT';
  if (value.includes('tv')) return 'TV_UNIT';
  return 'CUSTOM';
}

export async function loadBundledPremiumCatalogue(): Promise<{ assets: CatalogueAsset[]; products: ProductRecord[] }> {
  const response = await fetch(`${LOCAL_ASSET_ROOT}/VISUAL_REGISTRY.json`, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`Bundled visual registry failed (${response.status})`);
  const registry = await response.json() as StaticRegistry;
  const premium = (registry.models ?? []).filter((model) => model.tags?.includes('premium'));

  const assets: CatalogueAsset[] = premium.map((model) => {
    const [width, height, depth] = model.nativeBoundsM;
    const primaryUrl = url(model.primary);
    const visual = {
      fit: model.fit ?? 'UNIFORM_CONTAIN',
      coordinateSystem: model.coordinateSystem ?? 'Y_UP',
      unit: model.unit ?? 'metre',
      lods: (model.lods ?? [{ level: 'HIGH', file: model.primary }]).map((lod) => ({
        level: lod.level,
        url: url(lod.file),
        maxDistanceM: lod.maxDistanceM,
        maxTriangles: lod.maxTriangles,
      })),
      collision: model.collision ?? { shape: 'BOX', boundsM: { width, depth, height }, centerM: [0, height / 2, 0] },
      castShadow: model.castShadow !== false,
      receiveShadow: model.receiveShadow !== false,
      tags: model.tags ?? [],
    };
    return {
      id: `builtin:${model.id}`,
      name: title(model.id),
      category: model.category,
      glbObjectKey: primaryUrl,
      dimensionsM: { width, depth, height },
      metadata: {
        url: primaryUrl,
        localAssetId: model.id,
        premium: true,
        visual,
      },
    };
  });

  const products: ProductRecord[] = premium.map((model) => ({
    id: `builtin-product:${model.id}`,
    sku: `PREMIUM-${model.id.toUpperCase()}`,
    name: title(model.id),
    category: model.category,
    supplier: 'Studio Premium',
    catalogueAssetId: `builtin:${model.id}`,
    metadata: { premium: true, localAssetId: model.id },
    variants: [{
      id: `builtin-variant:${model.id}`,
      name: 'Default',
      availability: 'AVAILABLE',
      metadata: { bundled: true },
    }],
  }));

  return { assets, products };
}

export function mergeCatalogue<T extends { id: string }>(primary: T[], secondary: T[]): T[] {
  const map = new Map<string, T>();
  for (const entry of [...primary, ...secondary]) map.set(entry.id, entry);
  return [...map.values()];
}
