import type { FurnitureObject } from '@/lib/types';
import type { RenderQuality } from './quality';

export const LOCAL_ASSET_ROOT = '/assets/realistic';

export type LocalAssetDescriptor = {
  id: string;
  url: string;
  dimensionsM?: [number, number, number];
  lods?: Array<{ level: 'HIGH' | 'MEDIUM' | 'LOW'; url: string; maxDistanceM?: number }>;
};

const MODEL = (name: string) => `${LOCAL_ASSET_ROOT}/models/${name}.glb`;

export const LOCAL_ASSET_REGISTRY: Record<string, LocalAssetDescriptor> = {
  sofa: { id: 'sofa', url: MODEL('sofa'), lods: [
    { level: 'HIGH', url: MODEL('sofa'), maxDistanceM: 8 },
    { level: 'MEDIUM', url: MODEL('sofa_medium'), maxDistanceM: 16 },
    { level: 'LOW', url: MODEL('sofa_low'), maxDistanceM: 100 },
  ] },
  sectional_sofa: { id: 'sectional_sofa', url: MODEL('sectional_sofa'), lods: [
    { level: 'HIGH', url: MODEL('sectional_sofa'), maxDistanceM: 8 },
    { level: 'MEDIUM', url: MODEL('sectional_sofa_medium'), maxDistanceM: 16 },
    { level: 'LOW', url: MODEL('sectional_sofa_low'), maxDistanceM: 100 },
  ] },
  lounge_chair: { id: 'lounge_chair', url: MODEL('chair'), lods: [
    { level: 'HIGH', url: MODEL('chair'), maxDistanceM: 8 },
    { level: 'MEDIUM', url: MODEL('chair_medium'), maxDistanceM: 16 },
    { level: 'LOW', url: MODEL('chair_low'), maxDistanceM: 100 },
  ] },
  accent_chair: { id: 'accent_chair', url: MODEL('accent_chair'), lods: [
    { level: 'HIGH', url: MODEL('accent_chair'), maxDistanceM: 8 },
    { level: 'MEDIUM', url: MODEL('accent_chair_medium'), maxDistanceM: 16 },
    { level: 'LOW', url: MODEL('accent_chair_low'), maxDistanceM: 100 },
  ] },
  bar_stool: { id: 'bar_stool', url: MODEL('bar_stool'), lods: [
    { level: 'HIGH', url: MODEL('bar_stool'), maxDistanceM: 7 },
    { level: 'MEDIUM', url: MODEL('bar_stool_medium'), maxDistanceM: 14 },
    { level: 'LOW', url: MODEL('bar_stool_low'), maxDistanceM: 100 },
  ] },
  dining_chair: { id: 'dining_chair', url: MODEL('dining_chair') },
  task_chair: { id: 'task_chair', url: MODEL('task_chair') },
  coffee_table: { id: 'coffee_table', url: MODEL('coffee_table') },
  dining_table: { id: 'dining_table', url: MODEL('dining_table'), lods: [
    { level: 'HIGH', url: MODEL('dining_table'), maxDistanceM: 8 },
    { level: 'MEDIUM', url: MODEL('dining_table_medium'), maxDistanceM: 16 },
    { level: 'LOW', url: MODEL('dining_table_low'), maxDistanceM: 100 },
  ] },
  round_dining_table: { id: 'round_dining_table', url: MODEL('round_dining_table'), lods: [
    { level: 'HIGH', url: MODEL('round_dining_table'), maxDistanceM: 8 },
    { level: 'MEDIUM', url: MODEL('round_dining_table_medium'), maxDistanceM: 16 },
    { level: 'LOW', url: MODEL('round_dining_table_low'), maxDistanceM: 100 },
  ] },
  side_table: { id: 'side_table', url: MODEL('side_table'), lods: [
    { level: 'HIGH', url: MODEL('side_table'), maxDistanceM: 7 },
    { level: 'MEDIUM', url: MODEL('side_table_medium'), maxDistanceM: 14 },
    { level: 'LOW', url: MODEL('side_table_low'), maxDistanceM: 100 },
  ] },
  desk: { id: 'desk', url: MODEL('desk') },
  bed: { id: 'bed', url: MODEL('bed') },
  bed_queen: { id: 'bed_queen', url: MODEL('bed_queen'), lods: [
    { level: 'HIGH', url: MODEL('bed_queen'), maxDistanceM: 8 },
    { level: 'MEDIUM', url: MODEL('bed_queen_medium'), maxDistanceM: 16 },
    { level: 'LOW', url: MODEL('bed_queen_low'), maxDistanceM: 100 },
  ] },
  king_bed: { id: 'king_bed', url: MODEL('king_bed'), lods: [
    { level: 'HIGH', url: MODEL('king_bed'), maxDistanceM: 8 },
    { level: 'MEDIUM', url: MODEL('king_bed_medium'), maxDistanceM: 16 },
    { level: 'LOW', url: MODEL('king_bed_low'), maxDistanceM: 100 },
  ] },
  wardrobe: { id: 'wardrobe', url: MODEL('wardrobe'), lods: [
    { level: 'HIGH', url: MODEL('wardrobe'), maxDistanceM: 8 },
    { level: 'MEDIUM', url: MODEL('wardrobe_medium'), maxDistanceM: 16 },
    { level: 'LOW', url: MODEL('wardrobe_low'), maxDistanceM: 100 },
  ] },
  nightstand: { id: 'nightstand', url: MODEL('nightstand') },
  console: { id: 'console', url: MODEL('console') },
  tv_unit: { id: 'tv_unit', url: MODEL('tv_unit') },
  kitchen_counter: { id: 'kitchen_counter', url: MODEL('kitchen_counter') },
  kitchen_counter_short: { id: 'kitchen_counter_short', url: MODEL('kitchen_counter_short') },
  kitchen_island: { id: 'kitchen_island', url: MODEL('kitchen_island'), lods: [
    { level: 'HIGH', url: MODEL('kitchen_island'), maxDistanceM: 8 },
    { level: 'MEDIUM', url: MODEL('kitchen_island_medium'), maxDistanceM: 16 },
    { level: 'LOW', url: MODEL('kitchen_island_low'), maxDistanceM: 100 },
  ] },
  fridge: { id: 'fridge', url: MODEL('fridge') },
  vanity: { id: 'vanity', url: MODEL('vanity') },
  wc: { id: 'wc', url: MODEL('wc') },
  shower: { id: 'shower', url: MODEL('shower') },
  freestanding_tub: { id: 'freestanding_tub', url: MODEL('freestanding_tub'), lods: [
    { level: 'HIGH', url: MODEL('freestanding_tub'), maxDistanceM: 8 },
    { level: 'MEDIUM', url: MODEL('freestanding_tub_medium'), maxDistanceM: 16 },
    { level: 'LOW', url: MODEL('freestanding_tub_low'), maxDistanceM: 100 },
  ] },
  plant: { id: 'plant', url: MODEL('plant'), lods: [
    { level: 'HIGH', url: MODEL('plant'), maxDistanceM: 7 },
    { level: 'MEDIUM', url: MODEL('plant_medium'), maxDistanceM: 14 },
    { level: 'LOW', url: MODEL('plant_low'), maxDistanceM: 100 },
  ] },
  lamp: { id: 'lamp', url: MODEL('lamp') },
  pendant_light: { id: 'pendant_light', url: MODEL('pendant_light'), lods: [
    { level: 'HIGH', url: MODEL('pendant_light'), maxDistanceM: 7 },
    { level: 'MEDIUM', url: MODEL('pendant_light_medium'), maxDistanceM: 14 },
    { level: 'LOW', url: MODEL('pendant_light_low'), maxDistanceM: 100 },
  ] },
};

export function localAssetFor(item: FurnitureObject): LocalAssetDescriptor | null {
  if (item.catalogueAssetId?.startsWith('builtin:')) {
    const localId = item.catalogueAssetId.slice('builtin:'.length);
    const bundled = LOCAL_ASSET_REGISTRY[localId];
    if (bundled) return bundled;
  }
  if (item.assetUrl) return { id: item.catalogueAssetId ?? item.id, url: item.assetUrl };
  const name = item.name.toLowerCase();
  if (item.type === 'SOFA') return name.includes('sectional') || name.includes('chaise') ? LOCAL_ASSET_REGISTRY.sectional_sofa : LOCAL_ASSET_REGISTRY.sofa;
  if (item.type === 'CHAIR') {
    if (name.includes('task') || name.includes('office')) return LOCAL_ASSET_REGISTRY.task_chair;
    if (name.includes('bar') || name.includes('stool')) return LOCAL_ASSET_REGISTRY.bar_stool;
    if (name.includes('dining')) return LOCAL_ASSET_REGISTRY.dining_chair;
    if (name.includes('accent')) return LOCAL_ASSET_REGISTRY.accent_chair;
    return LOCAL_ASSET_REGISTRY.lounge_chair;
  }
  if (item.type === 'BED') {
    if (name.includes('king')) return LOCAL_ASSET_REGISTRY.king_bed;
    return name.includes('queen') ? LOCAL_ASSET_REGISTRY.bed_queen : LOCAL_ASSET_REGISTRY.bed;
  }
  if (item.type === 'TV_UNIT') return LOCAL_ASSET_REGISTRY.tv_unit;
  if (item.type === 'PLANT') return LOCAL_ASSET_REGISTRY.plant;
  if (item.type === 'LAMP') return name.includes('pendant') ? LOCAL_ASSET_REGISTRY.pendant_light : LOCAL_ASSET_REGISTRY.lamp;
  if (item.type === 'TABLE') {
    if (name.includes('desk') || name.includes('study')) return LOCAL_ASSET_REGISTRY.desk;
    if (name.includes('side') || name.includes('end table')) return LOCAL_ASSET_REGISTRY.side_table;
    if (name.includes('round')) return LOCAL_ASSET_REGISTRY.round_dining_table;
    if (name.includes('coffee') || name.includes('low')) return LOCAL_ASSET_REGISTRY.coffee_table;
    return LOCAL_ASSET_REGISTRY.dining_table;
  }
  if (item.type === 'CABINET') {
    if (name.includes('island')) return LOCAL_ASSET_REGISTRY.kitchen_island;
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
    if (name.includes('tub') || name.includes('bath')) return LOCAL_ASSET_REGISTRY.freestanding_tub;
    if (name.includes('vanity')) return LOCAL_ASSET_REGISTRY.vanity;
  }
  return null;
}

export function localAssetUrlFor(item: FurnitureObject, quality: RenderQuality): string | null {
  const descriptor = localAssetFor(item);
  if (!descriptor) return null;
  const lods = descriptor.lods ?? [];
  if (!lods.length) return descriptor.url;
  const preferred = quality === 'PERFORMANCE' ? 'LOW' : quality === 'BALANCED' ? 'MEDIUM' : 'HIGH';
  return lods.find((lod) => lod.level === preferred)?.url
    ?? lods.find((lod) => lod.level === 'HIGH')?.url
    ?? lods[0]?.url
    ?? descriptor.url;
}
