'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { modelBounds, normalizeFurniture, wallLength } from '@/lib/model';
import { localAssetFor, LOCAL_ASSET_ROOT } from '@/lib/visual/assetRegistry';
import { PBR_MATERIAL_REGISTRY, type LocalPbrId } from '@/lib/visual/materialRegistry';
import { lightingPreset as getLightingPreset, type LightingPresetName } from '@/lib/visual/lighting';
import { qualityProfile, type RenderQuality } from '@/lib/visual/quality';
import { rendererTelemetry, type RenderTelemetry } from '@/lib/visual/performance';
import type {
  CameraMode,
  DesignModel,
  FurnitureObject,
  OpeningModel,
  Selection,
  TransformMode,
  WallModel,
} from '@/lib/types';

interface Props {
  model: DesignModel;
  selection: Selection;
  cameraMode: CameraMode;
  transformMode: TransformMode;
  showCeiling?: boolean;
  isolateRoomId?: string | null;
  hiddenWallIds?: string[];
  snapshotToken?: number;
  quality?: RenderQuality;
  lighting?: LightingPresetName;
  daylight?: number;
  onTelemetry?: (telemetry: RenderTelemetry) => void;
  onSelect?: (selection: Selection) => void;
  onChangeObject?: (roomId: string, object: FurnitureObject) => void;
}

type MaterialKind =
  | 'wall'
  | 'floor'
  | 'fabric'
  | 'wood'
  | 'metal'
  | 'glass'
  | 'mirror'
  | 'ceramic'
  | 'rug'
  | 'leaf'
  | 'terracotta'
  | 'emissive';

type Runtime = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer | null;
  ssao: SSAOPass | null;
  needsRender: boolean;
  invalidate?: () => void;
  lastFrameAt?: number;
  frameCostEma?: number;
  slowFrameStreak?: number;
  degradeStep?: number;
  smaa: SMAAPass | null;
  controls: OrbitControls;
  transform: TransformControls;
  transformHelper: THREE.Object3D;
  box: THREE.BoxHelper | null;
  roomsRoot: THREE.Group;
  roomGroups: Map<string, THREE.Group>;
  signatures: Map<string, string>;
  objectMap: Map<string, { group: THREE.Group; roomId: string; object: FurnitureObject }>;
  selectionMap: Map<string, Selection>;
  materialCache: Map<string, THREE.Material>;
  textureCache: Map<string, THREE.Texture>;
  assetCache: Map<string, Promise<THREE.Object3D>>;
  assetGeometries: Set<THREE.BufferGeometry>;
  assetMaterials: Set<THREE.Material>;
  gltf: GLTFLoader;
  pmrem: THREE.PMREMGenerator;
  environmentTarget: THREE.WebGLRenderTarget;
  sun: THREE.DirectionalLight;
  sunTarget: THREE.Object3D;
  fill: THREE.PointLight;
  warm: THREE.PointLight;
  hemisphere: THREE.HemisphereLight;
  maxAnisotropy: number;
  quality: RenderQuality;
  lastTelemetryAt?: number;
};

function stable(value: unknown): string {
  return JSON.stringify(value);
}

function colour(name = ''): number {
  const n = name.toLowerCase();
  if (n.includes('sage')) return 0xbfcabb;
  if (n.includes('terracotta') || n.includes('clay')) return 0xc9805b;
  if (n.includes('charcoal')) return 0x3d4449;
  if (n.includes('slate')) return 0x58636d;
  if (n.includes('ink') || n.includes('blue')) return 0x48647a;
  if (n.includes('walnut')) return 0x7d5535;
  if (n.includes('oak')) return 0xb8895a;
  if (n.includes('sand')) return 0xd2b999;
  if (n.includes('linen')) return 0xe8ddcc;
  if (n.includes('blush')) return 0xe6cec6;
  if (n.includes('olive')) return 0x7d8259;
  if (n.includes('metal')) return 0xa9b0b4;
  if (n.includes('glass')) return 0xbde7f1;
  if (n.includes('marble')) return 0xf0eee8;
  return 0xeeeae2;
}

function rounded(
  size: [number, number, number],
  material: THREE.Material,
  radius = 0.04,
): THREE.Mesh {
  const geometry = new RoundedBoxGeometry(
    Math.max(0.01, size[0]),
    Math.max(0.01, size[1]),
    Math.max(0.01, size[2]),
    5,
    Math.min(radius, Math.min(...size) / 3),
  );
  ensureAoUv(geometry);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addMesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0],
): THREE.Mesh {
  ensureAoUv(geometry);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function ensureAoUv(geometry: THREE.BufferGeometry): void {
  let uv = geometry.getAttribute('uv');
  if (!uv) {
    const position = geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (position) {
      if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
      const normal = geometry.getAttribute('normal') as THREE.BufferAttribute | undefined;
      geometry.computeBoundingBox();
      const bounds = geometry.boundingBox;
      if (bounds) {
        const size = bounds.getSize(new THREE.Vector3());
        const values = new Float32Array(position.count * 2);
        for (let index = 0; index < position.count; index += 1) {
          const x = position.getX(index);
          const y = position.getY(index);
          const z = position.getZ(index);
          const nx = normal ? Math.abs(normal.getX(index)) : 0;
          const ny = normal ? Math.abs(normal.getY(index)) : 1;
          const nz = normal ? Math.abs(normal.getZ(index)) : 0;
          let u = 0;
          let v = 0;
          if (nx >= ny && nx >= nz) {
            u = (z - bounds.min.z) / Math.max(size.z, 0.0001);
            v = (y - bounds.min.y) / Math.max(size.y, 0.0001);
          } else if (ny >= nx && ny >= nz) {
            u = (x - bounds.min.x) / Math.max(size.x, 0.0001);
            v = (z - bounds.min.z) / Math.max(size.z, 0.0001);
          } else {
            u = (x - bounds.min.x) / Math.max(size.x, 0.0001);
            v = (y - bounds.min.y) / Math.max(size.y, 0.0001);
          }
          values[index * 2] = u;
          values[index * 2 + 1] = v;
        }
        geometry.setAttribute('uv', new THREE.BufferAttribute(values, 2));
        uv = geometry.getAttribute('uv');
      }
    }
  }
  if (uv && !geometry.getAttribute('uv1')) geometry.setAttribute('uv1', uv.clone());
}

function shapeFromPoints(points: [number, number][]): THREE.Shape {
  const shape = new THREE.Shape();
  points.forEach(([x, z], index) => (index ? shape.lineTo(x, z) : shape.moveTo(x, z)));
  shape.closePath();
  return shape;
}

function floorGeometry(points: [number, number][]): THREE.ShapeGeometry {
  const geometry = new THREE.ShapeGeometry(shapeFromPoints(points));
  geometry.rotateX(Math.PI / 2);
  ensureAoUv(geometry);
  return geometry;
}

function floorBaseGeometry(points: [number, number][]): THREE.ExtrudeGeometry {
  const geometry = new THREE.ExtrudeGeometry(shapeFromPoints(points), {
    depth: 0.055,
    bevelEnabled: false,
  });
  geometry.rotateX(Math.PI / 2);
  ensureAoUv(geometry);
  return geometry;
}

function wallSegments(
  wall: WallModel,
  height: number,
): Array<{ x: number; width: number; bottom: number; height: number; opening?: OpeningModel }> {
  const length = wallLength(wall);
  const openings = [...wall.openings].sort((a, b) => a.offsetM - b.offsetM);
  const spans: Array<{ x: number; width: number; bottom: number; height: number; opening?: OpeningModel }> = [];
  let cursor = 0;
  for (const opening of openings) {
    const start = Math.max(0, Math.min(length, opening.offsetM));
    const end = Math.max(start, Math.min(length, opening.offsetM + opening.widthM));
    if (start > cursor + 0.01) spans.push({ x: (cursor + start) / 2, width: start - cursor, bottom: 0, height });
    const bottom = opening.bottomM ?? opening.sillM ?? 0;
    if (bottom > 0.01) spans.push({ x: (start + end) / 2, width: end - start, bottom: 0, height: bottom, opening });
    const top = bottom + opening.heightM;
    if (top < height - 0.01) spans.push({ x: (start + end) / 2, width: end - start, bottom: top, height: height - top, opening });
    cursor = end;
  }
  if (cursor < length - 0.01) spans.push({ x: (cursor + length) / 2, width: length - cursor, bottom: 0, height });
  return spans;
}

function texture(
  runtime: Runtime,
  path: string,
  colorTexture: boolean,
  repeat: [number, number] = [3.5, 3.5],
): THREE.Texture {
  const key = `${path}:${repeat[0]}:${repeat[1]}`;
  const cached = runtime.textureCache.get(key);
  if (cached) return cached;
  const loaded = new THREE.TextureLoader().load(path);
  loaded.wrapS = THREE.RepeatWrapping;
  loaded.wrapT = THREE.RepeatWrapping;
  loaded.repeat.set(repeat[0], repeat[1]);
  loaded.anisotropy = Math.min(runtime.maxAnisotropy, qualityProfile(runtime.quality).maxAnisotropy);
  if (colorTexture) loaded.colorSpace = THREE.SRGBColorSpace;
  runtime.textureCache.set(key, loaded);
  return loaded;
}

function pbrMaps(runtime: Runtime, set: LocalPbrId, repeat?: [number, number]) {
  const descriptor = PBR_MATERIAL_REGISTRY[set];
  return {
    map: descriptor.channels.baseColor ? texture(runtime, descriptor.channels.baseColor, true, repeat) : undefined,
    normalMap: descriptor.channels.normal ? texture(runtime, descriptor.channels.normal, false, repeat) : undefined,
    roughnessMap: descriptor.channels.roughness ? texture(runtime, descriptor.channels.roughness, false, repeat) : undefined,
    aoMap: descriptor.channels.ao ? texture(runtime, descriptor.channels.ao, false, repeat) : undefined,
  };
}

function material(
  runtime: Runtime,
  name = 'Warm White',
  kind: MaterialKind = 'wall',
): THREE.Material {
  const key = `${kind}:${name}`;
  const cached = runtime.materialCache.get(key);
  if (cached) return cached;

  let result: THREE.Material;
  const lower = name.toLowerCase();

  if (kind === 'glass') {
    result = new THREE.MeshPhysicalMaterial({
      color: 0xc9edf2,
      roughness: 0.06,
      metalness: 0,
      transmission: runtime.quality === 'PERFORMANCE' ? 0.35 : 0.82,
      transparent: true,
      opacity: runtime.quality === 'PERFORMANCE' ? 0.38 : 0.55,
      thickness: 0.08,
      ior: 1.47,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  } else if (kind === 'mirror') {
    result = new THREE.MeshPhysicalMaterial({
      color: 0xd9e9ef,
      roughness: 0.08,
      metalness: 0.92,
      clearcoat: 0.6,
      clearcoatRoughness: 0.08,
    });
  } else if (kind === 'emissive') {
    result = new THREE.MeshStandardMaterial({
      color: 0xffedbd,
      emissive: 0xffc86c,
      emissiveIntensity: 2.4,
      roughness: 0.32,
      metalness: 0,
    });
  } else if (kind === 'leaf') {
    result = new THREE.MeshPhysicalMaterial({
      color: 0x5f8a5f,
      roughness: 0.82,
      metalness: 0,
      sheen: 0.18,
      sheenColor: new THREE.Color(0xa9d7a4),
    });
  } else if (kind === 'terracotta') {
    result = new THREE.MeshPhysicalMaterial({
      color: 0xb5633d,
      roughness: 0.88,
      metalness: 0,
      clearcoat: 0.04,
    });
  } else if (kind === 'ceramic') {
    result = new THREE.MeshPhysicalMaterial({
      color: 0xf6f4ef,
      roughness: 0.25,
      metalness: 0,
      clearcoat: 0.55,
      clearcoatRoughness: 0.2,
    });
  } else if (kind === 'metal') {
    result = new THREE.MeshPhysicalMaterial({
      ...pbrMaps(runtime, 'metal', [2, 5]),
      color: lower.includes('dark') ? 0x596064 : 0xffffff,
      roughness: 0.32,
      metalness: 0.84,
      normalScale: new THREE.Vector2(0.34, 0.34),
      clearcoat: 0.18,
    });
  } else if (kind === 'rug') {
    result = new THREE.MeshPhysicalMaterial({
      ...pbrMaps(runtime, 'rug', [2.2, 1.8]),
      color: lower.includes('charcoal') ? 0x73777a : 0xffffff,
      roughness: 0.96,
      metalness: 0,
      normalScale: new THREE.Vector2(0.45, 0.45),
      sheen: 0.35,
      sheenColor: new THREE.Color(0xdad2c7),
    });
  } else if (kind === 'fabric') {
    const set = lower.includes('charcoal') || lower.includes('slate') || lower.includes('ink') ? 'fabricCharcoal' : 'fabricSand';
    result = new THREE.MeshPhysicalMaterial({
      ...pbrMaps(runtime, set, [4.5, 4.5]),
      color: lower.includes('white') || lower.includes('linen') ? 0xf4f0e8 : colour(name),
      roughness: 0.92,
      metalness: 0,
      normalScale: new THREE.Vector2(0.38, 0.38),
      sheen: 0.55,
      sheenColor: new THREE.Color(0xf5eee5),
      sheenRoughness: 0.8,
    });
  } else if (kind === 'wood') {
    const set = lower.includes('walnut') || lower.includes('dark') ? 'walnut' : 'oak';
    result = new THREE.MeshPhysicalMaterial({
      ...pbrMaps(runtime, set, [2.8, 2.8]),
      color: 0xffffff,
      roughness: set === 'walnut' ? 0.58 : 0.66,
      metalness: 0,
      normalScale: new THREE.Vector2(0.38, 0.38),
      clearcoat: 0.08,
      clearcoatRoughness: 0.7,
    });
  } else if (kind === 'floor') {
    const set = lower.includes('marble')
      ? 'marble'
      : lower.includes('tile') || lower.includes('granite') || lower.includes('terraz') || lower.includes('concrete')
        ? 'tile'
        : lower.includes('walnut')
          ? 'walnut'
          : 'oak';
    result = new THREE.MeshPhysicalMaterial({
      ...pbrMaps(runtime, set, set === 'tile' ? [4, 4] : [3.7, 3.7]),
      color: 0xffffff,
      roughness: set === 'marble' ? 0.34 : set === 'tile' ? 0.5 : 0.68,
      metalness: 0,
      normalScale: new THREE.Vector2(set === 'marble' ? 0.16 : 0.42, set === 'marble' ? 0.16 : 0.42),
      clearcoat: set === 'marble' ? 0.34 : set === 'tile' ? 0.18 : 0.05,
      clearcoatRoughness: 0.48,
    });
  } else {
    result = new THREE.MeshPhysicalMaterial({
      ...pbrMaps(runtime, 'plaster', [5, 5]),
      color: colour(name),
      roughness: 0.9,
      metalness: 0,
      normalScale: new THREE.Vector2(0.18, 0.18),
      clearcoat: 0.01,
    });
  }

  runtime.materialCache.set(key, result);
  return result;
}

function assignSelectable(root: THREE.Object3D, key: string, selection: Selection, runtime: Runtime): void {
  root.traverse((node) => {
    node.userData.selectionKey = key;
  });
  runtime.selectionMap.set(key, selection);
}

function disposeObject(root: THREE.Object3D, runtime: Runtime): void {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    if (!runtime.assetGeometries.has(node.geometry)) node.geometry.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((entry) => {
      if (![...runtime.materialCache.values()].includes(entry) && !runtime.assetMaterials.has(entry)) entry.dispose();
    });
  });
  root.removeFromParent();
}

function assetFor(item: FurnitureObject): string | null {
  return localAssetFor(item)?.url ?? null;
}


function fallbackFurniture(runtime: Runtime, item: FurnitureObject): THREE.Group {
  const group = new THREE.Group();
  const [width, depth, height] = item.size;
  const main = material(
    runtime,
    item.material,
    item.type === 'SOFA' || item.type === 'CHAIR' || item.type === 'BED' ? 'fabric' : item.type === 'LAMP' ? 'metal' : 'wood',
  );
  const dark = material(runtime, 'Charcoal Fabric', 'fabric');
  const light = material(runtime, 'Warm Linen', 'fabric');
  const metal = material(runtime, 'Brushed Metal', 'metal');

  switch (item.type) {
    case 'SOFA': {
      const seat = rounded([width, height * 0.38, depth], main, 0.11);
      seat.position.y = height * 0.25;
      group.add(seat);
      const back = rounded([width, height * 0.66, depth * 0.18], main, 0.075);
      back.position.set(0, height * 0.68, -depth * 0.4);
      back.rotation.x = -0.1;
      group.add(back);
      [-1, 1].forEach((side) => {
        const arm = rounded([depth * 0.18, height * 0.54, depth], main, 0.07);
        arm.position.set(side * width * 0.47, height * 0.48, 0);
        group.add(arm);
      });
      [-0.31, 0, 0.31].forEach((x) => {
        const cushion = rounded([width * 0.29, height * 0.13, depth * 0.68], light, 0.06);
        cushion.position.set(x * width, height * 0.51, 0.02);
        group.add(cushion);
      });
      break;
    }
    case 'CHAIR': {
      const seat = rounded([width * 0.9, height * 0.15, depth * 0.86], main, 0.07);
      seat.position.y = height * 0.45;
      group.add(seat);
      const back = rounded([width * 0.9, height * 0.58, depth * 0.16], main, 0.07);
      back.position.set(0, height * 0.7, -depth * 0.36);
      back.rotation.x = -0.12;
      group.add(back);
      [-1, 1].forEach((x) => [-1, 1].forEach((z) => addMesh(group, new THREE.CylinderGeometry(0.022, 0.034, height * 0.44, 12), metal, [x * width * 0.34, height * 0.22, z * depth * 0.33])));
      break;
    }
    case 'BED': {
      const base = rounded([width, height * 0.3, depth], dark, 0.075);
      base.position.y = height * 0.18;
      group.add(base);
      const mattress = rounded([width * 0.96, height * 0.28, depth * 0.94], light, 0.095);
      mattress.position.y = height * 0.43;
      group.add(mattress);
      const head = rounded([width, height * 1.15, depth * 0.13], main, 0.07);
      head.position.set(0, height * 0.62, -depth * 0.46);
      group.add(head);
      [-0.25, 0.25].forEach((x) => {
        const pillow = rounded([width * 0.38, height * 0.15, depth * 0.28], light, 0.07);
        pillow.position.set(x * width, height * 0.72, -depth * 0.24);
        group.add(pillow);
      });
      break;
    }
    case 'TABLE': {
      const roundTable = item.name.toLowerCase().includes('coffee');
      if (roundTable) {
        addMesh(group, new THREE.CylinderGeometry(width * 0.5, width * 0.5, height * 0.12, 64), main, [0, height * 0.88, 0]);
        addMesh(group, new THREE.CylinderGeometry(0.07, 0.18, height * 0.76, 28), metal, [0, height * 0.43, 0]);
      } else {
        const top = rounded([width, height * 0.12, depth], main, 0.045);
        top.position.y = height * 0.9;
        group.add(top);
        [-1, 1].forEach((x) => [-1, 1].forEach((z) => addMesh(group, new THREE.CylinderGeometry(0.035, 0.045, height * 0.86, 12), dark, [x * width * 0.4, height * 0.43, z * depth * 0.38])));
      }
      break;
    }
    case 'PLANT': {
      addMesh(group, new THREE.CylinderGeometry(width * 0.25, width * 0.34, height * 0.28, 24), material(runtime, 'Terracotta', 'terracotta'), [0, height * 0.14, 0]);
      addMesh(group, new THREE.CylinderGeometry(0.018, 0.03, height * 0.62, 10), material(runtime, 'Leaf', 'leaf'), [0, height * 0.47, 0]);
      for (let index = 0; index < 12; index += 1) {
        const leaf = addMesh(
          group,
          new THREE.SphereGeometry(width * 0.22, 18, 12),
          material(runtime, 'Leaf', 'leaf'),
          [Math.sin(index * 2.4) * width * 0.22, height * 0.38 + (index % 4) * height * 0.15, Math.cos(index * 2.4) * depth * 0.22],
        );
        leaf.scale.set(0.52, 1.55, 0.32);
      }
      break;
    }
    case 'LAMP': {
      addMesh(group, new THREE.CylinderGeometry(width * 0.28, width * 0.32, height * 0.04, 32), dark, [0, height * 0.02, 0]);
      addMesh(group, new THREE.CylinderGeometry(0.025, 0.035, height * 0.78, 12), metal, [0, height * 0.39, 0]);
      addMesh(group, new THREE.ConeGeometry(width * 0.32, height * 0.28, 36, 1, true), material(runtime, 'Lamp shade', 'fabric'), [0, height * 0.86, 0]);
      addMesh(group, new THREE.SphereGeometry(0.055, 18, 18), material(runtime, 'Bulb', 'emissive'), [0, height * 0.83, 0]);
      break;
    }
    case 'RUG': {
      const rug = rounded([width, Math.max(0.016, height), depth], material(runtime, item.material, 'rug'), 0.018);
      rug.position.y = Math.max(0.012, height / 2);
      rug.castShadow = false;
      group.add(rug);
      break;
    }
    default: {
      const body = rounded([width, height, depth], main, 0.055);
      body.position.y = height / 2;
      group.add(body);
    }
  }

  return group;
}

function createFurniture(runtime: Runtime, item: FurnitureObject): THREE.Group {
  const group = new THREE.Group();
  group.name = item.name;
  group.userData.objectId = item.id;
  group.userData.object = item;
  group.position.set(item.position[0], item.elevationM ?? 0, item.position[1]);
  group.rotation.y = item.rotationY;
  group.visible = item.visible !== false;
  group.add(fallbackFurniture(runtime, item));
  return group;
}

function materialForAssetMesh(runtime: Runtime, meshName: string, item: FurnitureObject): THREE.Material {
  const name = meshName.toUpperCase();
  if (name.includes('FABRIC_SHADE')) {
    const key = 'asset:lamp-shade';
    const cached = runtime.materialCache.get(key);
    if (cached) return cached;
    const shade = new THREE.MeshPhysicalMaterial({
      color: 0xf0dfc6,
      roughness: 0.84,
      metalness: 0,
      side: THREE.DoubleSide,
      emissive: 0xffc778,
      emissiveIntensity: 0.22,
      sheen: 0.18,
      sheenColor: new THREE.Color(0xfff0d2),
    });
    runtime.materialCache.set(key, shade);
    return shade;
  }
  if (name.includes('GLASS')) return material(runtime, 'Clear Glass', 'glass');
  if (name.includes('MIRROR')) return material(runtime, 'Mirror', 'mirror');
  if (name.includes('CERAMIC')) return material(runtime, 'Ceramic White', 'ceramic');
  if (name.includes('MARBLE')) return material(runtime, 'Italian Marble', 'floor');
  if (name.includes('METAL_DARK')) return material(runtime, 'Dark Brushed Metal', 'metal');
  if (name.includes('METAL')) return material(runtime, 'Brushed Metal', 'metal');
  if (name.includes('EMISSIVE')) return material(runtime, 'Bulb', 'emissive');
  if (name.includes('GREEN')) return material(runtime, 'Leaf', 'leaf');
  if (name.includes('TERRACOTTA')) return material(runtime, 'Terracotta', 'terracotta');
  if (name.includes('DARK')) return material(runtime, 'Charcoal Fabric', 'fabric');
  if (name.includes('FABRIC_LIGHT')) return material(runtime, 'Warm Linen', 'fabric');
  if (name.includes('FABRIC_ACCENT2')) return material(runtime, 'Sage Accent', 'fabric');
  if (name.includes('FABRIC_ACCENT')) return material(runtime, 'Terracotta Accent', 'fabric');
  if (name.includes('FABRIC')) return material(runtime, item.material || 'Sand Weave', 'fabric');
  if (name.includes('WOOD_DARK')) return material(runtime, 'Walnut', 'wood');
  if (name.includes('WOOD')) return material(runtime, item.material || 'Engineered Oak', 'wood');
  if (name.includes('CABINET')) return material(runtime, item.material || 'Warm Linen', item.material?.toLowerCase().includes('charcoal') ? 'metal' : 'wood');
  return material(runtime, item.material || 'Warm White', 'wood');
}

async function loadAsset(runtime: Runtime, url: string, item: FurnitureObject): Promise<THREE.Object3D> {
  let cached = runtime.assetCache.get(url);
  if (!cached) {
    cached = new Promise((resolve, reject) => {
      runtime.gltf.load(
        url,
        (gltf) => {
          gltf.scene.traverse((node) => {
            if (!(node instanceof THREE.Mesh)) return;
            runtime.assetGeometries.add(node.geometry);
            ensureAoUv(node.geometry);
            const originals = Array.isArray(node.material) ? node.material : [node.material];
            originals.forEach((entry) => runtime.assetMaterials.add(entry));
          });
          resolve(gltf.scene);
        },
        undefined,
        reject,
      );
    });
    runtime.assetCache.set(url, cached);
  }
  const source = await cached;
  const instance = source.clone(true);
  const bundled = url.startsWith(ASSET_ROOT);
  instance.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    if (bundled) node.material = materialForAssetMesh(runtime, node.name || node.parent?.name || '', item);
    else {
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((entry) => {
        if (entry instanceof THREE.MeshStandardMaterial) entry.envMapIntensity = 1.05;
      });
    }
    node.castShadow = true;
    node.receiveShadow = true;
  });
  return instance;
}

function fitAsset(asset: THREE.Object3D, item: FurnitureObject): void {
  // FurnitureObject.size is [width, depth, height] in metres.
  // glTF is Y-up, therefore the target bounds are [width, height, depth].
  // Uniform contain scaling is essential: independent X/Y/Z stretching turns
  // cylinders into ellipses and destroys authored furniture proportions.
  const initial = new THREE.Box3().setFromObject(asset);
  const size = initial.getSize(new THREE.Vector3());
  const scale = Math.min(
    item.size[0] / Math.max(size.x, 0.001),
    item.size[2] / Math.max(size.y, 0.001),
    item.size[1] / Math.max(size.z, 0.001),
  );
  asset.scale.setScalar(Number.isFinite(scale) && scale > 0 ? scale : 1);

  const fitted = new THREE.Box3().setFromObject(asset);
  const center = fitted.getCenter(new THREE.Vector3());
  asset.position.set(-center.x, -fitted.min.y, -center.z);
}

function roomCentroid(points: [number, number][]): [number, number] {
  if (!points.length) return [0, 0];
  return [
    points.reduce((sum, point) => sum + point[0], 0) / points.length,
    points.reduce((sum, point) => sum + point[1], 0) / points.length,
  ];
}

function windowCurtainGeometry(width: number, height: number, side: -1 | 1): THREE.PlaneGeometry {
  const geometry = new THREE.PlaneGeometry(width, height, 8, 18);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    position.setZ(index, Math.sin((x + side * 0.23) * 18) * 0.032);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  ensureAoUv(geometry);
  return geometry;
}

function buildRoom(
  runtime: Runtime,
  room: DesignModel['rooms'][number],
  showCeiling: boolean,
  hiddenWallIds: Set<string>,
): THREE.Group {
  const group = new THREE.Group();
  group.name = room.name;
  assignSelectable(group, `room:${room.id}`, { kind: 'ROOM', roomId: room.id }, runtime);

  const floorBase = new THREE.Mesh(floorBaseGeometry(room.floorPolygon), material(runtime, 'Charcoal', 'metal'));
  floorBase.position.y = 0.015;
  floorBase.receiveShadow = true;
  floorBase.castShadow = true;
  floorBase.userData.selectionKey = `room:${room.id}`;
  group.add(floorBase);

  const floor = new THREE.Mesh(floorGeometry(room.floorPolygon), material(runtime, room.floorId || 'Engineered Oak', 'floor'));
  floor.position.y = 0.022;
  floor.receiveShadow = true;
  floor.userData.selectionKey = `room:${room.id}`;
  group.add(floor);

  const centroid = roomCentroid(room.floorPolygon);
  const cityTexture = texture(runtime, `${LOCAL_ASSET_ROOT}/misc/city_day.webp`, true, [1, 1]);
  cityTexture.wrapS = THREE.ClampToEdgeWrapping;
  cityTexture.wrapT = THREE.ClampToEdgeWrapping;

  room.walls.forEach((wall) => {
    const length = wallLength(wall) || 0.01;
    const dx = wall.end[0] - wall.start[0];
    const dz = wall.end[1] - wall.start[1];
    const angle = -Math.atan2(dz, dx);
    const midpointX = (wall.start[0] + wall.end[0]) / 2;
    const midpointZ = (wall.start[1] + wall.end[1]) / 2;
    let inwardX = centroid[0] - midpointX;
    let inwardZ = centroid[1] - midpointZ;
    const along = (inwardX * dx + inwardZ * dz) / Math.max(length * length, 0.001);
    inwardX -= along * dx;
    inwardZ -= along * dz;
    const inwardLength = Math.hypot(inwardX, inwardZ) || 1;
    inwardX /= inwardLength;
    inwardZ /= inwardLength;
    const localPositiveZ = new THREE.Vector2(-dz / length, dx / length);
    const inwardLocalSign = localPositiveZ.dot(new THREE.Vector2(inwardX, inwardZ)) >= 0 ? 1 : -1;
    const visualThickness = Math.max(0.045, Math.min(0.085, wall.thicknessM * 0.55));

    const wallGroup = new THREE.Group();
    wallGroup.position.set(
      wall.start[0] + inwardX * visualThickness / 2,
      0,
      wall.start[1] + inwardZ * visualThickness / 2,
    );
    wallGroup.rotation.y = angle;
    wallGroup.visible = !hiddenWallIds.has(wall.id);
    const wallKey = `wall:${room.id}:${wall.id}`;
    assignSelectable(wallGroup, wallKey, { kind: 'WALL', roomId: room.id, wallId: wall.id }, runtime);

    wallSegments(wall, room.heightM).forEach((segment) => {
      const wallMesh = rounded([segment.width, segment.height, visualThickness], material(runtime, wall.material, 'wall'), 0.012);
      wallMesh.position.set(segment.x, segment.bottom + segment.height / 2, 0);
      wallMesh.userData.selectionKey = wallKey;
      wallGroup.add(wallMesh);
    });

    wall.openings.forEach((opening) => {
      const openingKey = `opening:${room.id}:${wall.id}:${opening.id}`;
      const frameMaterial = material(runtime, 'Cool White', 'wall');
      const start = opening.offsetM;
      const bottom = opening.bottomM ?? opening.sillM ?? 0;
      const frame = new THREE.Group();
      frame.position.set(start + opening.widthM / 2, bottom, 0);
      assignSelectable(frame, openingKey, { kind: 'OPENING', roomId: room.id, wallId: wall.id, openingId: opening.id }, runtime);
      const side = 0.05;
      [-1, 1].forEach((edge) => {
        const frameSide = rounded([side, opening.heightM, visualThickness * 1.35], frameMaterial, 0.009);
        frameSide.position.set(edge * opening.widthM / 2, opening.heightM / 2, 0);
        frame.add(frameSide);
      });
      const frameTop = rounded([opening.widthM + side * 2, side, visualThickness * 1.35], frameMaterial, 0.009);
      frameTop.position.set(0, opening.heightM, 0);
      frame.add(frameTop);

      if (opening.type === 'WINDOW') {
        const outside = addMesh(
          frame,
          new THREE.PlaneGeometry(opening.widthM * 0.98, opening.heightM * 0.98),
          new THREE.MeshBasicMaterial({ map: cityTexture, toneMapped: false }),
          [0, opening.heightM / 2, -inwardLocalSign * (visualThickness / 2 + 0.035)],
          [0, inwardLocalSign < 0 ? Math.PI : 0, 0],
        );
        outside.castShadow = false;
        outside.receiveShadow = false;

        const glass = rounded([opening.widthM * 0.97, opening.heightM * 0.97, 0.018], material(runtime, 'Clear Glass', 'glass'), 0.004);
        glass.position.set(0, opening.heightM / 2, inwardLocalSign * 0.006);
        frame.add(glass);

        const sill = rounded([opening.widthM + 0.14, 0.045, visualThickness * 2.8], frameMaterial, 0.012);
        sill.position.set(0, -0.02, inwardLocalSign * (visualThickness / 2 + 0.035));
        frame.add(sill);

        if (opening.widthM > 0.8 && room.roomType !== 'BATH') {
          const curtainMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xe2e2dc,
            roughness: 0.96,
            transparent: true,
            opacity: 0.74,
            side: THREE.DoubleSide,
            transmission: 0.03,
          });
          const curtainWidth = Math.min(0.5, opening.widthM * 0.25);
          [-1, 1].forEach((curtainSide) => {
            const curtain = addMesh(
              frame,
              windowCurtainGeometry(curtainWidth, opening.heightM + 0.32, curtainSide as -1 | 1),
              curtainMaterial,
              [curtainSide * (opening.widthM / 2 + curtainWidth * 0.2), opening.heightM / 2, inwardLocalSign * (visualThickness / 2 + 0.11)],
              [0, inwardLocalSign < 0 ? Math.PI : 0, 0],
            );
            curtain.castShadow = true;
          });
        }
      }

      if (opening.type === 'DOOR') {
        const door = rounded([opening.widthM * 0.96, opening.heightM * 0.98, 0.045], material(runtime, 'Walnut', 'wood'), 0.014);
        const rightHinge = opening.swing?.includes('RIGHT');
        door.position.set(rightHinge ? -opening.widthM * 0.48 : opening.widthM * 0.48, opening.heightM / 2, inwardLocalSign * 0.035);
        door.rotation.y = (opening.swing?.includes('OUT') ? -0.34 : 0.34) * inwardLocalSign;
        frame.add(door);
        addMesh(frame, new THREE.CylinderGeometry(0.014, 0.014, 0.12, 12), material(runtime, 'Brushed Metal', 'metal'), [rightHinge ? -opening.widthM * 0.88 : opening.widthM * 0.88, opening.heightM * 0.48, inwardLocalSign * 0.07], [Math.PI / 2, 0, 0]);
      }

      wallGroup.add(frame);
    });

    const skirting = rounded([length, 0.09, 0.055], material(runtime, 'Cool White', 'wall'), 0.012);
    skirting.position.set(length / 2, 0.07, inwardLocalSign * (visualThickness / 2 + 0.022));
    wallGroup.add(skirting);
    group.add(wallGroup);
  });

  /* Warm ceiling glow only — never a shadow caster. A point-light shadow is a
     cube map: SIX extra renders of the entire scene per light per frame. Three
     qualifying rooms used to add eighteen hidden scene renders every frame.
     The sun already provides the directional shadows that sell the depth. */
  const roomLight = new THREE.PointLight(0xffe4bd, qualityProfile(runtime.quality).maxDynamicRoomLights > 0 ? (runtime.quality === 'CINEMATIC' ? 3.6 : 2.5) : 0, 8.5, 2);
  roomLight.position.set(centroid[0], Math.max(1.8, room.heightM - 0.48), centroid[1]);
  roomLight.castShadow = false;
  group.add(roomLight);

  if (showCeiling) {
    const ceilingMaterial = material(runtime, 'Warm White', 'wall').clone() as THREE.MeshStandardMaterial;
    ceilingMaterial.side = THREE.DoubleSide;
    const ceiling = new THREE.Mesh(floorGeometry(room.floorPolygon), ceilingMaterial);
    ceiling.position.y = room.heightM;
    ceiling.receiveShadow = true;
    group.add(ceiling);
    const ring = addMesh(
      group,
      new THREE.TorusGeometry(0.34, 0.018, 10, 52),
      material(runtime, 'Ceiling fixture', 'emissive'),
      [centroid[0], room.heightM - 0.035, centroid[1]],
      [Math.PI / 2, 0, 0],
    );
    ring.castShadow = false;
  }

  room.objects.forEach((raw) => {
    const item = normalizeFurniture(raw);
    if (!item) return;
    const objectGroup = createFurniture(runtime, item);
    objectGroup.userData.roomId = room.id;
    const key = `object:${room.id}:${item.id}`;
    assignSelectable(objectGroup, key, { kind: 'OBJECT', roomId: room.id, objectId: item.id }, runtime);
    group.add(objectGroup);
    runtime.objectMap.set(item.id, { group: objectGroup, roomId: room.id, object: item });

    const url = assetFor(item);
    if (url) {
      void loadAsset(runtime, url, item)
        .then((asset) => {
          if (!objectGroup.parent) return;
          fitAsset(asset, item);
          objectGroup.children.forEach((child) => {
            child.visible = false;
          });
          objectGroup.add(asset);
          assignSelectable(asset, key, { kind: 'OBJECT', roomId: room.id, objectId: item.id }, runtime);
          if (item.type === 'LAMP' && !objectGroup.userData.fixtureLight) {
            const bulb = new THREE.PointLight(0xffd39b, qualityProfile(runtime.quality).maxDynamicRoomLights > 0 ? (runtime.quality === 'CINEMATIC' ? 4.8 : 2.8) : 0, 4.8, 2);
            bulb.position.set(item.size[0] * 0.32, item.size[2] * 0.82, 0);
            bulb.castShadow = false;
            objectGroup.add(bulb);
            objectGroup.userData.fixtureLight = true;
          }
        })
        .catch(() => {
          // The detailed procedural fallback remains visible when a catalogue asset cannot load.
        });
    }
  });

  return group;
}

function render(runtime: Runtime): void {
  if (runtime.composer) runtime.composer.render();
  else runtime.renderer.render(runtime.scene, runtime.camera);
}

/**
 * If drawing still can't keep up (old integrated GPU, 4K screen), shed load
 * once instead of letting the whole interface stutter: drop the render
 * resolution first, then shadows. Runs on rendered frames only, so an idle
 * viewer is never penalised for being idle.
 */
function watchFrameCost(runtime: Runtime, cost: number): void {
  if (cost <= 0 || cost > 250) return;
  runtime.frameCostEma = runtime.frameCostEma == null ? cost : runtime.frameCostEma * 0.9 + cost * 0.1;
  if ((runtime.degradeStep ?? 0) >= 2 || (runtime.frameCostEma ?? 0) < 34) { runtime.slowFrameStreak = 0; return; }
  runtime.slowFrameStreak = (runtime.slowFrameStreak ?? 0) + 1;
  if (runtime.slowFrameStreak < 45) return;
  runtime.slowFrameStreak = 0;
  runtime.degradeStep = (runtime.degradeStep ?? 0) + 1;
  if (runtime.degradeStep === 1) {
    runtime.renderer.setPixelRatio(1);
    runtime.composer?.setPixelRatio(1);
    console.info('[ScenePreview] GPU is struggling — render resolution reduced to keep the editor responsive.');
  } else {
    runtime.sun.castShadow = false;
    runtime.renderer.shadowMap.enabled = false;
    console.info('[ScenePreview] Shadows disabled to keep the editor responsive.');
  }
  runtime.needsRender = true;
}

export function ScenePreview({
  model,
  selection,
  cameraMode,
  transformMode,
  showCeiling = false,
  isolateRoomId = null,
  hiddenWallIds = [],
  snapshotToken = 0,
  quality = 'BALANCED',
  lighting = 'DAYLIGHT',
  daylight = 1,
  onTelemetry,
  onSelect,
  onChangeObject,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const selectRef = useRef(onSelect);
  const changeRef = useRef(onChangeObject);
  const telemetryRef = useRef(onTelemetry);
  selectRef.current = onSelect;
  changeRef.current = onChangeObject;
  telemetryRef.current = onTelemetry;
  const hiddenSet = useMemo(() => new Set(hiddenWallIds), [hiddenWallIds]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x091311);
    scene.fog = new THREE.FogExp2(0x091311, 0.012);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.04, 300);
    const profile = qualityProfile(quality);
    const renderer = new THREE.WebGLRenderer({
      antialias: profile.antialias,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    const pixelRatio = Math.min(window.devicePixelRatio || 1, profile.maxPixelRatio);
    renderer.setPixelRatio(pixelRatio);
    renderer.shadowMap.enabled = profile.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = getLightingPreset(lighting).toneExposure;
    host.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnvironment = new RoomEnvironment();
    let environmentTarget = pmrem.fromScene(roomEnvironment, 0.035);
    scene.environment = environmentTarget.texture;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.minDistance = 0.7;
    controls.maxDistance = 80;
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.screenSpacePanning = true;

    const roomsRoot = new THREE.Group();
    scene.add(roomsRoot);

    const transform = new TransformControls(camera, renderer.domElement);
    const transformHelper = transform.getHelper();
    scene.add(transformHelper);

    const sunTarget = new THREE.Object3D();
    scene.add(sunTarget);
    const sun = new THREE.DirectionalLight(0xfff1d5, 3.4);
    sun.position.set(-5, 11, 7);
    sun.target = sunTarget;
    sun.castShadow = profile.shadows;
    const shadowSize = profile.shadowMapSize;
    sun.shadow.mapSize.set(shadowSize, shadowSize);
    sun.shadow.camera.near = 0.4;
    sun.shadow.camera.far = 60;
    sun.shadow.bias = -0.00035;
    sun.shadow.normalBias = 0.025;

    const hemisphere = new THREE.HemisphereLight(0xe5fbff, 0x17130f, 1.35);
    scene.add(hemisphere, sun);

    const fill = new THREE.PointLight(0xb7d7ff, 2.7, 28, 2);
    const warm = new THREE.PointLight(0xffc982, 3.2, 24, 2);
    scene.add(fill, warm);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 140),
      new THREE.MeshPhysicalMaterial({ color: 0x07100e, roughness: 0.82, metalness: 0.08 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.085;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(70, 100, 0x4e9b82, 0x1b342d);
    grid.position.y = -0.015;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.075;
    scene.add(grid);

    const gltf = new GLTFLoader();
    gltf.setMeshoptDecoder(MeshoptDecoder);
    const dracoPath = process.env.NEXT_PUBLIC_DRACO_DECODER_PATH;
    if (dracoPath) {
      const draco = new DRACOLoader();
      draco.setDecoderPath(dracoPath);
      gltf.setDRACOLoader(draco);
    }
    const ktxPath = process.env.NEXT_PUBLIC_KTX2_TRANSCODER_PATH;
    if (ktxPath) {
      const ktx = new KTX2Loader();
      ktx.setTranscoderPath(ktxPath);
      ktx.detectSupport(renderer);
      gltf.setKTX2Loader(ktx);
    }

    let composer: EffectComposer | null = null;
    let ssao: SSAOPass | null = null;
    let smaa: SMAAPass | null = null;
    /* Post-processing exists only at HIGH now. SSAO renders depth and normals
       for the whole scene, then samples a noise kernel per pixel; at the old
       settings (enabled at MEDIUM too, at up to 2x device pixel ratio) it
       multiplied every frame's cost roughly fourfold. MEDIUM — the default —
       renders directly with tone mapping and shadows, which reads nearly
       identically in a lit interior and is dramatically cheaper on iGPUs. */
    if (profile.postProcessing !== 'OFF') {
      composer = new EffectComposer(renderer);
      composer.setPixelRatio(Math.min(pixelRatio, 1.5));
      composer.addPass(new RenderPass(scene, camera));
      ssao = new SSAOPass(scene, camera, 1, 1);
      ssao.kernelRadius = 10;
      ssao.minDistance = 0.0015;
      ssao.maxDistance = 0.1;
      composer.addPass(ssao);
      if (profile.postProcessing === 'SSAO_SMAA') {
        smaa = new SMAAPass();
        composer.addPass(smaa);
      }
      composer.addPass(new OutputPass());
    }

    const runtime: Runtime = {
      scene,
      camera,
      renderer,
      composer,
      ssao,
      smaa,
      needsRender: true,
      degradeStep: 0,
      slowFrameStreak: 0,
      controls,
      transform,
      transformHelper,
      box: null,
      roomsRoot,
      roomGroups: new Map(),
      signatures: new Map(),
      objectMap: new Map(),
      selectionMap: new Map(),
      materialCache: new Map(),
      textureCache: new Map(),
      assetCache: new Map(),
      assetGeometries: new Set(),
      assetMaterials: new Set(),
      gltf,
      pmrem,
      environmentTarget,
      sun,
      sunTarget,
      fill,
      warm,
      hemisphere,
      maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
      quality,
    };
    runtimeRef.current = runtime;
    const invalidate = () => { runtime.needsRender = true; };
    runtime.invalidate = invalidate;
    // Any async asset finishing (PBR maps, GLB furniture, SMAA area textures)
    // must trigger one redraw or it pops in only on the next interaction.
    THREE.DefaultLoadingManager.onLoad = invalidate;
    invalidate();

    new RGBELoader().load(
      `${LOCAL_ASSET_ROOT}/hdri/studio_day_1k.hdr`,
      (hdr) => {
        if (runtimeRef.current !== runtime) {
          hdr.dispose();
          return;
        }
        hdr.mapping = THREE.EquirectangularReflectionMapping;
        const nextTarget = pmrem.fromEquirectangular(hdr);
        hdr.dispose();
        runtime.environmentTarget.dispose();
        runtime.environmentTarget = nextTarget;
        environmentTarget = nextTarget;
        scene.environment = nextTarget.texture;
        invalidate();
      },
      undefined,
      () => {
        // RoomEnvironment remains active as a no-network fallback.
      },
    );

    const onDragging = (event: { value: unknown }) => {
      controls.enabled = !event.value;
      invalidate();
    };
    const onObjectChange = () => { runtime.box?.update(); invalidate(); };
    const onTransformMouseUp = () => {
      const object = transform.object;
      if (!object) return;
      const objectId = object.userData.objectId as string | undefined;
      const found = objectId ? runtime.objectMap.get(objectId) : undefined;
      if (!found || !changeRef.current) return;
      const scale = object.scale;
      changeRef.current(found.roomId, {
        ...found.object,
        position: [object.position.x, object.position.z],
        elevationM: object.position.y,
        rotationY: object.rotation.y,
        size: [
          found.object.size[0] * scale.x,
          found.object.size[1] * scale.z,
          found.object.size[2] * scale.y,
        ],
      });
      object.scale.set(1, 1, 1);
    };
    transform.addEventListener('dragging-changed', onDragging as never);
    transform.addEventListener('objectChange', onObjectChange);
    transform.addEventListener('mouseUp', onTransformMouseUp);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const click = (event: PointerEvent) => {
      if ((event.target as HTMLElement).closest('.scene-overlay-control')) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(roomsRoot.children, true);
      for (const hit of hits) {
        let node: THREE.Object3D | null = hit.object;
        while (node && !node.userData.selectionKey) node = node.parent;
        const key = node?.userData.selectionKey as string | undefined;
        if (key) {
          selectRef.current?.(runtime.selectionMap.get(key) ?? null);
          return;
        }
      }
      selectRef.current?.(null);
    };
    renderer.domElement.addEventListener('pointerdown', click);

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      composer?.setSize(width, height);
      ssao?.setSize(width, height);
      smaa?.setSize(width * pixelRatio, height * pixelRatio);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(() => { resize(); invalidate(); });
    observer.observe(host);
    resize();

    /* On-demand rendering.
       The old loop ran the full pipeline (SSAO + SMAA at up to 2x pixel ratio)
       sixty times a second even while nothing moved, pegging the GPU
       permanently — that is what made the whole app feel laggy, not the model.
       Now a frame is drawn only when something invalidated it: camera motion
       (OrbitControls.update() returns true while moving or damping), a gizmo
       drag, a model rebuild, a texture or HDR finishing, or a resize. */
    let frame = 0;
    const animate = () => {
      if (document.hidden) { frame = requestAnimationFrame(animate); return; }
      const cameraMoved = controls.update();
      if (cameraMoved || runtime.needsRender) {
        runtime.needsRender = false;
        runtime.box?.update();
        const startedAt = performance.now();
        render(runtime);
        const frameCost = performance.now() - startedAt;
        watchFrameCost(runtime, frameCost);
        const now = performance.now();
        if (telemetryRef.current && now - (runtime.lastTelemetryAt ?? 0) >= 500) {
          runtime.lastTelemetryAt = now;
          telemetryRef.current(rendererTelemetry(runtime.renderer, runtime.quality, runtime.frameCostEma ?? frameCost, (runtime.degradeStep ?? 0) > 0));
        }
      }
      frame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', click);
      transform.removeEventListener('dragging-changed', onDragging as never);
      transform.removeEventListener('objectChange', onObjectChange);
      transform.removeEventListener('mouseUp', onTransformMouseUp);
      transform.detach();
      transform.dispose();
      controls.dispose();
      [...runtime.roomGroups.values()].forEach((room) => disposeObject(room, runtime));
      runtime.assetGeometries.forEach((geometry) => geometry.dispose());
      runtime.assetMaterials.forEach((entry) => entry.dispose());
      runtime.materialCache.forEach((entry) => entry.dispose());
      runtime.textureCache.forEach((entry) => entry.dispose());
      environmentTarget.dispose();
      pmrem.dispose();
      composer?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      runtimeRef.current = null;
    };
  }, [quality]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    const clearRoomMaps = (roomId: string) => {
      for (const [id, value] of runtime.objectMap) if (value.roomId === roomId) runtime.objectMap.delete(id);
      for (const [key, value] of runtime.selectionMap) if (value?.roomId === roomId) runtime.selectionMap.delete(key);
    };

    const liveRooms = new Set(model.rooms.map((room) => room.id));
    for (const [id, group] of runtime.roomGroups) {
      if (!liveRooms.has(id)) {
        clearRoomMaps(id);
        disposeObject(group, runtime);
        runtime.roomGroups.delete(id);
        runtime.signatures.delete(id);
      }
    }

    model.rooms.forEach((room) => {
      const signature = stable({
        room,
        showCeiling,
        hidden: [...hiddenSet].filter((id) => room.walls.some((wall) => wall.id === id)),
      });
      if (runtime.signatures.get(room.id) === signature) {
        const existing = runtime.roomGroups.get(room.id);
        if (existing) existing.visible = !isolateRoomId || isolateRoomId === room.id;
        return;
      }
      const old = runtime.roomGroups.get(room.id);
      if (old) {
        clearRoomMaps(room.id);
        disposeObject(old, runtime);
      }
      const group = buildRoom(runtime, room, showCeiling, hiddenSet);
      group.visible = !isolateRoomId || isolateRoomId === room.id;
      runtime.roomsRoot.add(group);
      runtime.roomGroups.set(room.id, group);
      runtime.signatures.set(room.id, signature);
    });
    runtimeRef.current?.invalidate?.();
  }, [model, showCeiling, isolateRoomId, hiddenSet]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.transform.detach();
    if (runtime.box) {
      runtime.box.removeFromParent();
      runtime.box.geometry.dispose();
      (runtime.box.material as THREE.Material).dispose();
      runtime.box = null;
    }

    if (selection?.kind === 'OBJECT') {
      const found = runtime.objectMap.get(selection.objectId);
      if (found && !found.object.locked) {
        runtime.transform.attach(found.group);
        runtime.transform.setMode(transformMode);
        runtime.transform.setSpace('local');
        runtime.transform.setSize(0.72);
      }
      if (found) {
        runtime.box = new THREE.BoxHelper(found.group, new THREE.Color(0x6effcf));
        runtime.scene.add(runtime.box);
      }
      return;
    }

    if (selection) {
      let key = '';
      if (selection.kind === 'ROOM') key = `room:${selection.roomId}`;
      if (selection.kind === 'WALL') key = `wall:${selection.roomId}:${selection.wallId}`;
      if (selection.kind === 'OPENING') key = `opening:${selection.roomId}:${selection.wallId}:${selection.openingId}`;
      if (key) {
        let target: THREE.Object3D | undefined;
        runtime.scene.traverse((node) => {
          if (!target && node.userData.selectionKey === key) target = node;
        });
        if (target) {
          runtime.box = new THREE.BoxHelper(target, new THREE.Color(0xffaa63));
          runtime.scene.add(runtime.box);
        }
      }
    }
    runtimeRef.current?.invalidate?.();
  }, [selection, transformMode, model]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const activeRooms = isolateRoomId ? model.rooms.filter((room) => room.id === isolateRoomId) : model.rooms;
    const cameraModel: DesignModel = { ...model, rooms: activeRooms.length ? activeRooms : model.rooms };
    const bounds = modelBounds(cameraModel);
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerZ = (bounds.minY + bounds.maxY) / 2;
    const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY, 4);

    runtime.controls.target.set(centerX, 1.12, centerZ);
    runtime.controls.enableRotate = true;
    runtime.camera.fov = cameraMode === 'WALKTHROUGH' ? 66 : cameraMode === 'TOP' ? 34 : 42;
    runtime.camera.updateProjectionMatrix();

    if (cameraMode === 'TOP') {
      runtime.camera.position.set(centerX, Math.max(8, span * 1.58), centerZ + 0.01);
      runtime.controls.enableRotate = false;
    } else if (cameraMode === 'FRONT') {
      runtime.camera.position.set(centerX, 1.65, centerZ + span * 1.55);
      runtime.controls.target.set(centerX, 1.3, centerZ);
    } else if (cameraMode === 'SIDE') {
      runtime.camera.position.set(centerX + span * 1.55, 1.65, centerZ);
      runtime.controls.target.set(centerX, 1.3, centerZ);
    } else if (cameraMode === 'WALKTHROUGH') {
      runtime.camera.position.set(centerX, 1.58, centerZ + span * 0.3);
      runtime.controls.target.set(centerX, 1.34, centerZ - span * 0.52);
      runtime.controls.maxPolarAngle = Math.PI * 0.62;
    } else {
      runtime.camera.position.set(centerX + span * 0.9, span * 0.58 + 2.1, centerZ + span * 1.0);
      runtime.controls.maxPolarAngle = Math.PI * 0.495;
    }

    const lights = getLightingPreset(lighting);
    runtime.scene.background = new THREE.Color(lights.background);
    runtime.scene.fog = new THREE.FogExp2(lights.fog, lights.fogDensity);
    runtime.renderer.toneMappingExposure = lights.toneExposure;
    runtime.scene.environmentIntensity = lights.environmentIntensity;
    runtime.hemisphere.color.setHex(lights.hemisphereSky);
    runtime.hemisphere.groundColor.setHex(lights.hemisphereGround);
    runtime.hemisphere.intensity = lights.hemisphereIntensity * daylight;
    runtime.fill.color.setHex(lights.fillColor);
    runtime.fill.intensity = lights.fillIntensity * daylight;
    runtime.fill.position.set(centerX + span * 0.38, 2.6, centerZ - span * 0.32);
    runtime.warm.color.setHex(lights.warmColor);
    runtime.warm.intensity = lights.warmIntensity;
    runtime.warm.position.set(centerX - span * 0.34, 1.9, centerZ + span * 0.34);
    runtime.sun.color.setHex(lights.sunColor);
    runtime.sun.position.set(centerX + span * lights.sunAzimuth, Math.max(6, span * lights.sunElevation), centerZ + span * 0.55);
    runtime.sunTarget.position.set(centerX, 0.8, centerZ);
    runtime.sun.intensity = lights.sunIntensity * daylight;
    runtime.sun.target.updateMatrixWorld();

    const shadowRadius = Math.max(5, span * 0.66);
    const shadowCamera = runtime.sun.shadow.camera;
    shadowCamera.left = -shadowRadius;
    shadowCamera.right = shadowRadius;
    shadowCamera.top = shadowRadius;
    shadowCamera.bottom = -shadowRadius;
    shadowCamera.far = Math.max(30, span * 4);
    shadowCamera.updateProjectionMatrix();
    runtime.sun.shadow.needsUpdate = true;
    runtime.controls.update();
    runtimeRef.current?.invalidate?.();
  }, [cameraMode, model, daylight, lighting, isolateRoomId]);

  useEffect(() => {
    if (!snapshotToken) return;
    const runtime = runtimeRef.current;
    if (!runtime) return;
    requestAnimationFrame(() => {
      runtime.needsRender = false;
      render(runtime);
      const anchor = document.createElement('a');
      anchor.download = `propertytour360-view-${snapshotToken}.png`;
      anchor.href = runtime.renderer.domElement.toDataURL('image/png');
      anchor.click();
    });
  }, [snapshotToken]);

  return (
    <div className="scene-preview scene-preview-v3" ref={hostRef}>
      <div className="scene-tip">Visual Engine v1 · PBR registry · lighting presets · LOD-ready assets · adaptive quality</div>
    </div>
  );
}
