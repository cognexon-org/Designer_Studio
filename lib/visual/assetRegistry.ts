import type { FurnitureObject } from '@/lib/types';

export const LOCAL_ASSET_ROOT = '/assets/realistic';

export type LocalAssetDescriptor = {
  id: string;
  url: string;
  dimensionsM?: [number, number, number];
  lods?: Array<{ level: 'HIGH' | 'MEDIUM' | 'LOW'; url: string; maxDistanceM?: number }>;
};

const MODEL = (name: string) => `${LOCAL_ASSET_ROOT}/models/${name}.glb`;

export const LOCAL_ASSET_REGISTRY: Record<string, LocalAssetDescriptor> = {
  sofa: { id: 'sofa', url: MODEL('sofa') },
  lounge_chair: { id: 'lounge_chair', url: MODEL('chair') },
  dining_chair: { id: 'dining_chair', url: MODEL('dining_chair') },
  task_chair: { id: 'task_chair', url: MODEL('task_chair') },
  coffee_table: { id: 'coffee_table', url: MODEL('coffee_table') },
  dining_table: { id: 'dining_table', url: MODEL('dining_table') },
  desk: { id: 'desk', url: MODEL('desk') },
  bed: { id: 'bed', url: MODEL('bed') },
  bed_queen: { id: 'bed_queen', url: MODEL('bed_queen') },
  wardrobe: { id: 'wardrobe', url: MODEL('wardrobe') },
  nightstand: { id: 'nightstand', url: MODEL('nightstand') },
  console: { id: 'console', url: MODEL('console') },
  tv_unit: { id: 'tv_unit', url: MODEL('tv_unit') },
  kitchen_counter: { id: 'kitchen_counter', url: MODEL('kitchen_counter') },
  kitchen_counter_short: { id: 'kitchen_counter_short', url: MODEL('kitchen_counter_short') },
  fridge: { id: 'fridge', url: MODEL('fridge') },
  vanity: { id: 'vanity', url: MODEL('vanity') },
  wc: { id: 'wc', url: MODEL('wc') },
  shower: { id: 'shower', url: MODEL('shower') },
  plant: { id: 'plant', url: MODEL('plant') },
  lamp: { id: 'lamp', url: MODEL('lamp') },
};

export function localAssetFor(item: FurnitureObject): LocalAssetDescriptor | null {
  if (item.assetUrl) return { id: item.catalogueAssetId ?? item.id, url: item.assetUrl };
  const name = item.name.toLowerCase();
  if (item.type === 'SOFA') return LOCAL_ASSET_REGISTRY.sofa;
  if (item.type === 'CHAIR') {
    if (name.includes('task') || name.includes('office')) return LOCAL_ASSET_REGISTRY.task_chair;
    if (name.includes('dining')) return LOCAL_ASSET_REGISTRY.dining_chair;
    return LOCAL_ASSET_REGISTRY.lounge_chair;
  }
  if (item.type === 'BED') return name.includes('queen') ? LOCAL_ASSET_REGISTRY.bed_queen : LOCAL_ASSET_REGISTRY.bed;
  if (item.type === 'TV_UNIT') return LOCAL_ASSET_REGISTRY.tv_unit;
  if (item.type === 'PLANT') return LOCAL_ASSET_REGISTRY.plant;
  if (item.type === 'LAMP') return LOCAL_ASSET_REGISTRY.lamp;
  if (item.type === 'TABLE') {
    if (name.includes('desk') || name.includes('study')) return LOCAL_ASSET_REGISTRY.desk;
    if (name.includes('coffee') || name.includes('low')) return LOCAL_ASSET_REGISTRY.coffee_table;
    return LOCAL_ASSET_REGISTRY.dining_table;
  }
  if (item.type === 'CABINET') {
    if (name.includes('refriger')) return LOCAL_ASSET_REGISTRY.fridge;
    if (name.includes('wardrobe')) return LOCAL_ASSET_REGISTRY.wardrobe;
    if (name.includes('return counter') || name.includes('short counter')) return LOCAL_ASSET_REGISTRY.kitchen_counter_short;
    if (name.includes('counter') || name.includes('base unit')) return LOCAL_ASSET_REGISTRY.kitchen_counter;
    if (name.includes('console')) return LOCAL_ASSET_REGISTRY.console;
    if (name.includes('vanity') || name.includes('basin')) return LOCAL_ASSET_REGISTRY.vanity;
    return LOCAL_ASSET_REGISTRY.nightstand;
  }
  if (item.type === 'CUSTOM') {
    if (name.includes('wc') || name.includes('toilet')) return LOCAL_ASSET_REGISTRY.wc;
    if (name.includes('shower')) return LOCAL_ASSET_REGISTRY.shower;
    if (name.includes('vanity')) return LOCAL_ASSET_REGISTRY.vanity;
  }
  return null;
}
