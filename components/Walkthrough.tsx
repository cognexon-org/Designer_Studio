'use client';

/**
 * First-person walkthrough of the canonical design model.
 *
 * Mode B (this component) is the interactive 3D shell: real geometry, furniture,
 * hinged doors, collision. Mode A is the captured 360 panorama, which is only
 * ever entered on demand — the operator taps the ◎ marker floating in a room and
 * that room's real photograph takes over the view. Leaving the panorama drops
 * the camera back exactly where it was standing.
 *
 * Rooms with no captured panorama still support the 360 view: the scene itself
 * is rendered into a cube map from the viewer's position, so the control reads
 * consistently everywhere and is clearly labelled as rendered rather than shot.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { normalizeFurniture, roomCenter } from '@/lib/model';
import type { DesignModel, FurnitureObject, OpeningModel, RoomModel, WallModel } from '@/lib/types';
import { lightingPreset as getLightingPreset, type LightingPresetName } from '@/lib/visual/lighting';
import { qualityProfile, type RenderQuality } from '@/lib/visual/quality';

interface Props {
  model: DesignModel;
  /** roomId -> equirectangular JPEG from the Mode A stitcher. */
  panoramas?: Record<string, string>;
  quality?: RenderQuality;
  lighting?: LightingPresetName;
  daylight?: number;
  onExit?: () => void;
}

type DoorRec = {
  pivot: THREE.Group; open: boolean; closedY: number; openY: number; cur: number;
  wx: number; wz: number; roomId: string; roomName: string;
};
type Seg = { ax: number; az: number; bx: number; bz: number; door: { cx: number; cz: number } | null };
type Obb = { x: number; z: number; w: number; d: number; r: number };
type Marker = { sprite: THREE.Sprite; roomId: string; roomName: string; x: number; z: number };

const EYE = 1.62;
const RADIUS = 0.3;
const WALK_SPEED = 1.55;
const RUN_SPEED = 3.4;

function pbr(cache: Map<string, THREE.Material>, hex: number, rough = 0.9, metal = 0) {
  const key = `${hex}-${rough}-${metal}`;
  let m = cache.get(key);
  if (!m) { m = new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal }); cache.set(key, m); }
  return m;
}

function colourOf(name = ''): number {
  const n = name.toLowerCase();
  if (n.includes('sage')) return 0x6f8067;
  if (n.includes('terracotta')) return 0xb77152;
  if (n.includes('charcoal')) return 0x34383d;
  if (n.includes('walnut')) return 0x6b3e25;
  if (n.includes('oak')) return 0xb48652;
  if (n.includes('sand')) return 0xc8ae8d;
  if (n.includes('blue')) return 0x426b83;
  if (n.includes('marble')) return 0xe9e6e0;
  if (n.includes('white')) return 0xf1eee9;
  return 0xd9d4cc;
}

function boxMesh(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.005, w), Math.max(0.005, h), Math.max(0.005, d)), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m;
}

function makeMarkerTexture(): THREE.Texture {
  const c = document.createElement('canvas'); c.width = c.height = 168;
  const g = c.getContext('2d')!;
  g.beginPath(); g.arc(84, 84, 66, 0, Math.PI * 2);
  g.fillStyle = 'rgba(232,141,67,.92)'; g.fill();
  g.lineWidth = 7; g.strokeStyle = 'rgba(255,255,255,.95)'; g.stroke();
  g.beginPath(); g.ellipse(84, 84, 46, 20, 0, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(84, 84, 46, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#fff'; g.font = 'bold 30px system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('360', 84, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function Walkthrough({ model, panoramas = {}, quality = 'BALANCED', lighting = 'DAYLIGHT', daylight = 1, onExit }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rt = useRef<any>(null);
  const [locked, setLocked] = useState(false);
  const [room, setRoom] = useState('');
  const [prompt, setPrompt] = useState<{ kind: 'DOOR' | 'PANO'; text: string } | null>(null);
  const [pano, setPano] = useState<{ roomName: string; real: boolean } | null>(null);
  const [notice, setNotice] = useState('');

  const rooms = useMemo(() => model.rooms ?? [], [model]);

  useEffect(() => {
    const host = hostRef.current; if (!host) return;

    const profile = qualityProfile(quality);
    const lights = getLightingPreset(lighting);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(lights.background);
    scene.fog = new THREE.FogExp2(lights.fog, lights.fogDensity);
    const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 400);
    const renderer = new THREE.WebGLRenderer({ antialias: profile.antialias, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, profile.maxPixelRatio));
    renderer.shadowMap.enabled = profile.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = lights.toneExposure;
    host.appendChild(renderer.domElement);

    const shell = new THREE.Group(); scene.add(shell);
    const markersGroup = new THREE.Group(); scene.add(markersGroup);

    scene.environmentIntensity = lights.environmentIntensity;
    scene.add(new THREE.HemisphereLight(lights.hemisphereSky, lights.hemisphereGround, lights.hemisphereIntensity * daylight));
    const sun = new THREE.DirectionalLight(lights.sunColor, lights.sunIntensity * daylight);
    sun.position.set(-9, 14, -6); sun.castShadow = profile.shadows;
    sun.shadow.mapSize.set(profile.shadowMapSize, profile.shadowMapSize);
    sun.shadow.camera.left = -18; sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 18; sun.shadow.camera.bottom = -18;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
    scene.add(sun);

    const matCache = new Map<string, THREE.Material>();
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0xbcd8f0, roughness: 0.06, transmission: 0.85, thickness: 0.35, transparent: true, opacity: 0.4
    });

    const doors: DoorRec[] = [];
    const walls: Seg[] = [];
    const obbs: Obb[] = [];
    const markers: Marker[] = [];
    const markerTex = makeMarkerTexture();

    /* ---------------- build shell ---------------- */
    const addWall = (w: WallModel, room: RoomModel, inward: [number, number]) => {
      const a = w.start, b = w.end;
      const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
      if (L < 0.02) return;
      const ang = Math.atan2(dz, dx);
      const H = w.heightM ?? room.heightM ?? 2.8;
      const t = Math.max(0.05, Math.min(0.14, w.thicknessM || 0.1));
      const grp = new THREE.Group();
      const mat = pbr(matCache, colourOf(w.material || w.materialId || ''), 0.95);
      const panel = (x0: number, x1: number, y0: number, y1: number) => {
        if (x1 - x0 <= 0.004 || y1 - y0 <= 0.004) return;
        grp.add(boxMesh(x1 - x0, y1 - y0, t, mat, x0 + (x1 - x0) / 2 - L / 2, y0 + (y1 - y0) / 2, 0));
      };
      const ux = dx / L, uz = dz / L;
      const seg = (s0: number, e0: number, door: Seg['door']) => {
        if (e0 - s0 <= 0.01) return;
        walls.push({ ax: a[0] + ux * s0, az: a[1] + uz * s0, bx: a[0] + ux * e0, bz: a[1] + uz * e0, door });
      };

      let cur = 0;
      const ops = [...(w.openings ?? [])].sort((p, q) => p.offsetM - q.offsetM);
      ops.forEach((o: OpeningModel) => {
        const s0 = Math.max(0, o.offsetM), e0 = Math.min(L, o.offsetM + o.widthM);
        if (e0 <= s0) return;
        panel(cur, s0, 0, H);
        const isWindow = String(o.type).toUpperCase().includes('WINDOW');
        const sill = isWindow ? (o.sillM ?? o.bottomM ?? 0.9) : (o.bottomM ?? 0);
        const top = Math.min(H, sill + o.heightM);
        if (sill > 0.01) panel(s0, e0, 0, sill);
        if (top < H - 0.01) panel(s0, e0, top, H);
        const cx = s0 + (e0 - s0) / 2 - L / 2;

        if (isWindow) {
          grp.add(boxMesh(e0 - s0 - 0.06, top - sill - 0.06, 0.014, glass, cx, sill + (top - sill) / 2, 0));
          const fr = pbr(matCache, 0x39424e, 0.55, 0.3);
          grp.add(boxMesh(e0 - s0, 0.05, t, fr, cx, sill, 0));
          grp.add(boxMesh(e0 - s0, 0.05, t, fr, cx, top, 0));
          seg(s0, e0, null); // wall below a window still blocks
        } else {
          const fr = pbr(matCache, 0xd8d2c8, 0.75);
          grp.add(boxMesh(0.05, top, t * 1.15, fr, cx - (e0 - s0) / 2, top / 2, 0));
          grp.add(boxMesh(0.05, top, t * 1.15, fr, cx + (e0 - s0) / 2, top / 2, 0));
          grp.add(boxMesh(e0 - s0 + 0.1, 0.05, t * 1.15, fr, cx, top, 0));
          const pivot = new THREE.Group();
          pivot.position.set(cx - (e0 - s0) / 2, 0, 0);
          const lw = (e0 - s0) - 0.03;
          pivot.add(boxMesh(lw, top - 0.05, 0.042, pbr(matCache, 0xb9a48a, 0.62), lw / 2, (top - 0.05) / 2, 0));
          grp.add(pivot);
          doors.push({
            pivot, open: false, closedY: 0, openY: -Math.PI * 0.52, cur: 0,
            wx: a[0] + ux * (s0 + e0) / 2, wz: a[1] + uz * (s0 + e0) / 2,
            roomId: room.id, roomName: room.name
          });
          seg(s0, e0, { cx: a[0] + ux * (s0 + e0) / 2, cz: a[1] + uz * (s0 + e0) / 2 });
        }
        cur = e0;
      });
      panel(cur, L, 0, H);
      seg(cur, L, null);
      if (cur === 0) { /* solid wall already pushed above */ }

      // push the wall inward so shared partitions sit back-to-back, not overlapping
      grp.position.set(a[0] + dx / 2 + inward[0] * t / 2, 0, a[1] + dz / 2 + inward[1] * t / 2);
      grp.rotation.y = -ang;
      shell.add(grp);
    };

    const buildFurniture = (o: FurnitureObject) => {
      const g = new THREE.Group();
      const [w, h, d] = o.size;
      const main = pbr(matCache, colourOf(o.material || o.materialId || ''), 0.85);
      const dark = pbr(matCache, 0x4a4038, 0.7);
      switch (o.type) {
        case 'SOFA':
          g.add(boxMesh(w, h * 0.34, d * 0.92, main, 0, h * 0.42, 0));
          g.add(boxMesh(w, h * 0.6, d * 0.2, main, 0, h * 0.72, -d * 0.36));
          [-1, 1].forEach(s => g.add(boxMesh(d * 0.2, h * 0.55, d * 0.9, main, s * (w / 2 - d * 0.1), h * 0.55, 0)));
          break;
        case 'BED':
          g.add(boxMesh(w, h * 0.3, d, dark, 0, h * 0.17, 0));
          g.add(boxMesh(w * 0.97, h * 0.3, d * 0.95, pbr(matCache, 0xf0ede8, 0.95), 0, h * 0.46, 0));
          g.add(boxMesh(w * 1.02, h * 0.9, d * 0.09, main, 0, h * 0.6, -d * 0.5));
          break;
        case 'TABLE':
          g.add(boxMesh(w, 0.06, d, main, 0, h, 0));
          [-1, 1].forEach(sx => [-1, 1].forEach(sz => g.add(boxMesh(0.06, h, 0.06, dark, sx * w * 0.42, h / 2, sz * d * 0.38))));
          break;
        case 'CHAIR':
          g.add(boxMesh(w, h * 0.09, d * 0.9, main, 0, h * 0.5, 0));
          g.add(boxMesh(w * 0.94, h * 0.46, d * 0.1, main, 0, h * 0.74, -d * 0.4));
          break;
        case 'TV_UNIT':
          g.add(boxMesh(w, h * 0.62, d, main, 0, h * 0.42, 0));
          g.add(boxMesh(w * 0.78, w * 0.44, 0.045, pbr(matCache, 0x0d1014, 0.2), 0, h * 1.3, -d * 0.1));
          break;
        case 'CABINET':
          g.add(boxMesh(w, h, d, main, 0, h / 2, 0));
          break;
        case 'RUG':
          g.add(boxMesh(w, 0.014, d, main, 0, 0.008, 0));
          break;
        case 'PLANT': {
          g.add(boxMesh(w * 0.5, h * 0.2, d * 0.5, pbr(matCache, 0xb5633d, 0.85), 0, h * 0.1, 0));
          for (let i = 0; i < 8; i++) {
            const a2 = i * 2.4, rr = w * 0.28;
            const leaf = new THREE.Mesh(new THREE.SphereGeometry(w * 0.18, 10, 7), pbr(matCache, 0x5f8a5f, 0.92));
            leaf.scale.set(0.5, 1.4, 0.3);
            leaf.position.set(Math.sin(a2) * rr, h * (0.34 + 0.06 * i), Math.cos(a2) * rr);
            leaf.castShadow = true; g.add(leaf);
          }
          break;
        }
        case 'LAMP':
          g.add(boxMesh(w * 0.5, 0.03, d * 0.5, dark, 0, 0.015, 0));
          g.add(boxMesh(0.04, h * 0.85, 0.04, dark, 0, h * 0.43, 0));
          g.add(boxMesh(w * 0.7, h * 0.16, d * 0.7, pbr(matCache, 0xf6e4c2, 0.85), 0, h * 0.92, 0));
          break;
        default:
          g.add(boxMesh(w, h, d, main, 0, h / 2, 0));
      }
      g.position.set(o.position[0], o.elevationM ?? 0, o.position[1]);
      g.rotation.y = o.rotationY || 0;
      return g;
    };

    rooms.forEach(r => {
      const poly = r.floorPolygon ?? [];
      if (poly.length < 3) return;
      const ctr: [number, number] = [
        poly.reduce((s, p) => s + p[0], 0) / poly.length,
        poly.reduce((s, p) => s + p[1], 0) / poly.length
      ];

      const shape = new THREE.Shape();
      poly.forEach((p, i) => (i ? shape.lineTo(p[0], p[1]) : shape.moveTo(p[0], p[1])));
      shape.closePath();

      const fg = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false });
      fg.rotateX(Math.PI / 2);
      const floor = new THREE.Mesh(fg, pbr(matCache, colourOf(r.floorId || 'oak'), 0.75));
      floor.receiveShadow = true; shell.add(floor);

      const cg = fg.clone();
      const ceil = new THREE.Mesh(cg, pbr(matCache, 0xf4f2ee, 0.98));
      ceil.position.y = r.heightM ?? 2.8; shell.add(ceil);

      const lamp = new THREE.PointLight(lights.warmColor, profile.maxDynamicRoomLights > 0 ? 8 * daylight : 0, 8, 2);
      lamp.position.set(ctr[0], (r.heightM ?? 2.8) - 0.45, ctr[1]); shell.add(lamp);

      (r.walls ?? []).forEach(w => {
        const mx = (w.start[0] + w.end[0]) / 2, mz = (w.start[1] + w.end[1]) / 2;
        let nx = ctr[0] - mx, nz = ctr[1] - mz;
        const ex = w.end[0] - w.start[0], ez = w.end[1] - w.start[1], eL2 = ex * ex + ez * ez || 1;
        const t = (nx * ex + nz * ez) / eL2; nx -= ex * t; nz -= ez * t;
        const nL = Math.hypot(nx, nz) || 1;
        addWall(w, r, [nx / nL, nz / nL]);
      });

      (r.objects ?? []).forEach(raw => {
        const o = normalizeFurniture(raw);
        if (!o || o.visible === false) return;
        shell.add(buildFurniture(o));
        if (o.type !== 'RUG') obbs.push({ x: o.position[0], z: o.position[1], w: o.size[0], d: o.size[2], r: o.rotationY || 0 });
      });

      // Mode A entry point for this room
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: markerTex, depthTest: false, transparent: true }));
      sprite.scale.set(0.5, 0.5, 1);
      sprite.position.set(ctr[0], 1.75, ctr[1]);
      markersGroup.add(sprite);
      markers.push({ sprite, roomId: r.id, roomName: r.name, x: ctr[0], z: ctr[1] });
    });

    /* ---------------- player ---------------- */
    const start = rooms.length ? roomCenter(rooms[0]) : [0, 0];
    const pos = new THREE.Vector3(start[0], EYE, start[1]);
    const look = { yaw: 0, pitch: 0 };
    const vel = { x: 0, z: 0 };
    let bob = 0;
    // Last position known to be inside a room. A real model has a front door
    // that opens onto nothing modelled, so without this the viewer can walk out
    // of the building and lose the scene entirely.
    const lastInside = new THREE.Vector3(start[0], EYE, start[1]);
    const keys: Record<string, boolean> = {};

    const inRoom = (x: number, z: number) => {
      for (const r of rooms) {
        const p = r.floorPolygon ?? []; let ins = false;
        for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
          if (((p[i][1] > z) !== (p[j][1] > z)) &&
            (x < (p[j][0] - p[i][0]) * (z - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0])) ins = !ins;
        }
        if (ins) return r;
      }
      return null;
    };

    const doorNear = (cx: number, cz: number) => doors.find(d => Math.hypot(d.wx - cx, d.wz - cz) < 0.4) || null;

    const resolveSeg = (p: THREE.Vector3, w: Seg) => {
      if (w.door) { const d = doorNear(w.door.cx, w.door.cz); if (d && d.cur < -0.55) return; }
      const ex = w.bx - w.ax, ez = w.bz - w.az, l2 = ex * ex + ez * ez;
      if (l2 < 1e-9) return;
      let t = ((p.x - w.ax) * ex + (p.z - w.az) * ez) / l2; t = Math.max(0, Math.min(1, t));
      const qx = w.ax + ex * t, qz = w.az + ez * t;
      let nx = p.x - qx, nz = p.z - qz; const dist = Math.hypot(nx, nz);
      const R = RADIUS + 0.03;
      if (dist < R) {
        if (dist < 1e-6) { nx = 1; nz = 0; } else { nx /= dist; nz /= dist; }
        p.x = qx + nx * R; p.z = qz + nz * R;
      }
    };
    const resolveObb = (p: THREE.Vector3, b: Obb) => {
      const c = Math.cos(-b.r), s = Math.sin(-b.r);
      const lx = (p.x - b.x) * c - (p.z - b.z) * s, lz = (p.x - b.x) * s + (p.z - b.z) * c;
      const hw = b.w / 2, hd = b.d / 2;
      const qx = Math.max(-hw, Math.min(hw, lx)), qz = Math.max(-hd, Math.min(hd, lz));
      let dx = lx - qx, dz = lz - qz; let dist = Math.hypot(dx, dz);
      if (dist > RADIUS) return;
      if (dist < 1e-6) {
        const px = hw - Math.abs(lx), pz = hd - Math.abs(lz);
        if (px < pz) { dx = Math.sign(lx) || 1; dz = 0; } else { dx = 0; dz = Math.sign(lz) || 1; }
        dist = 1;
      } else { dx /= dist; dz /= dist; }
      const nlx = qx + dx * RADIUS, nlz = qz + dz * RADIUS;
      const cc = Math.cos(b.r), ss = Math.sin(b.r);
      p.x = b.x + (nlx * cc - nlz * ss); p.z = b.z + (nlx * ss + nlz * cc);
    };
    const collide = (p: THREE.Vector3) => {
      for (let i = 0; i < 2; i++) { walls.forEach(w => resolveSeg(p, w)); obbs.forEach(b => resolveObb(p, b)); }
    };

    /* ---------------- panorama (Mode A) ---------------- */
    const cubeTarget = new THREE.WebGLCubeRenderTarget(1024, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
    const cubeCam = new THREE.CubeCamera(0.1, 200, cubeTarget);
    let panoActive = false;
    let savedBg: THREE.Texture | THREE.Color | null = null;

    const enterPano = (m: Marker) => {
      const url = panoramas[m.roomId];
      savedBg = scene.background as any;
      const finish = (real: boolean) => {
        shell.visible = false; markersGroup.visible = false;
        panoActive = true;
        setPano({ roomName: m.roomName, real });
      };
      if (url) {
        new THREE.TextureLoader().load(url, tex => {
          tex.mapping = THREE.EquirectangularReflectionMapping;
          tex.colorSpace = THREE.SRGBColorSpace;
          scene.background = tex;
          finish(true);
        }, undefined, () => setNotice('Could not load the captured 360 for this room.'));
      } else {
        cubeCam.position.set(m.x, EYE, m.z);
        markersGroup.visible = false;
        cubeCam.update(renderer, scene);
        scene.background = cubeTarget.texture;
        finish(false);
      }
    };
    const exitPano = () => {
      panoActive = false;
      scene.background = savedBg ?? new THREE.Color(0x0a0f18);
      shell.visible = true; markersGroup.visible = true;
      setPano(null);
    };

    /* ---------------- input ---------------- */
    const cv = renderer.domElement;
    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.code] = true;
      if (e.code === 'KeyE') interact();
      if (e.code === 'Escape' && panoActive) exitPano();
      if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => { keys[e.code] = false; };
    addEventListener('keydown', onKeyDown); addEventListener('keyup', onKeyUp);

    const onLockChange = () => setLocked(document.pointerLockElement === cv);
    document.addEventListener('pointerlockchange', onLockChange);
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== cv) return;
      look.yaw -= e.movementX * 0.0022;
      look.pitch = Math.max(-1.25, Math.min(1.25, look.pitch - e.movementY * 0.0022));
    };
    document.addEventListener('mousemove', onMove);
    const onClick = () => { if (!panoActive && document.pointerLockElement !== cv) cv.requestPointerLock(); };
    cv.addEventListener('click', onClick);

    // touch look for tablets
    let touch: { x: number; y: number } | null = null;
    const ts = (e: TouchEvent) => { touch = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
    const tm = (e: TouchEvent) => {
      if (!touch) return;
      const dx = e.touches[0].clientX - touch.x, dy = e.touches[0].clientY - touch.y;
      touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      look.yaw -= dx * 0.005;
      look.pitch = Math.max(-1.25, Math.min(1.25, look.pitch - dy * 0.005));
    };
    const te = () => { touch = null; };
    cv.addEventListener('touchstart', ts, { passive: true });
    cv.addEventListener('touchmove', tm, { passive: true });
    cv.addEventListener('touchend', te);

    function nearestMarker() {
      let best: Marker | null = null, bd = 1.9;
      for (const m of markers) { const d = Math.hypot(m.x - pos.x, m.z - pos.z); if (d < bd) { bd = d; best = m; } }
      return best;
    }
    function nearestDoor() {
      let best: DoorRec | null = null, bd = 1.9;
      for (const d of doors) { const dd = Math.hypot(d.wx - pos.x, d.wz - pos.z); if (dd < bd) { bd = dd; best = d; } }
      return best;
    }
    function interact() {
      if (panoActive) { exitPano(); return; }
      const m = nearestMarker();
      const d = nearestDoor();
      // whichever is closer wins, so a 360 marker never steals a doorway
      const dm = m ? Math.hypot(m.x - pos.x, m.z - pos.z) : 99;
      const dd = d ? Math.hypot(d.wx - pos.x, d.wz - pos.z) : 99;
      if (m && dm <= dd) { enterPano(m); return; }
      if (d) d.open = !d.open;
    }

    rt.current = { renderer, scene, camera, enterPanoByRoom: (id: string) => { const m = markers.find(x => x.roomId === id); if (m) { pos.set(m.x, EYE, m.z); enterPano(m); } }, exitPano, teleport: (id: string) => { const m = markers.find(x => x.roomId === id); if (m) { pos.set(m.x, EYE, m.z); vel.x = vel.z = 0; collide(pos); } }, markers };

    /* ---------------- loop ---------------- */
    const resize = () => {
      const w = host.clientWidth, h = host.clientHeight;
      renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(host);

    let last = performance.now(), raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now(); const dt = Math.min(0.05, (now - last) / 1000); last = now;

      doors.forEach(d => { const t = d.open ? d.openY : d.closedY; d.cur += (t - d.cur) * Math.min(1, dt * 7); d.pivot.rotation.y = d.cur; });

      if (!panoActive) {
        let fx = 0, fz = 0;
        if (keys['KeyW'] || keys['ArrowUp']) fz += 1;
        if (keys['KeyS'] || keys['ArrowDown']) fz -= 1;
        if (keys['KeyA'] || keys['ArrowLeft']) fx -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) fx += 1;
        const mag = Math.hypot(fx, fz);
        const speed = (keys['ShiftLeft'] || keys['ShiftRight']) ? RUN_SPEED : WALK_SPEED;
        let ax = 0, az = 0;
        if (mag > 0) {
          fx /= mag; fz /= mag;
          const sy = Math.sin(look.yaw), cy = Math.cos(look.yaw);
          ax = (fz * sy + fx * cy) * speed; az = (fz * cy - fx * sy) * speed;
        }
        const k = Math.min(1, dt * 12);
        vel.x += (ax - vel.x) * k; vel.z += (az - vel.z) * k;
        pos.x += vel.x * dt; pos.z += vel.z * dt;
        collide(pos);
        const sp = Math.hypot(vel.x, vel.z);
        bob += dt * sp * 7;
        pos.y = EYE + Math.sin(bob) * Math.min(0.035, sp * 0.012);

        const r = inRoom(pos.x, pos.z);
        if (r) { lastInside.set(pos.x, pos.y, pos.z); }
        else if (pos.distanceTo(lastInside) > 1.1) {
          // Outside every room and too far to be a doorway: pull back in.
          pos.copy(lastInside); vel.x = 0; vel.z = 0;
        }
        setRoom(r ? r.name : 'Doorway');

        const m = nearestMarker(), d = nearestDoor();
        const dm = m ? Math.hypot(m.x - pos.x, m.z - pos.z) : 99;
        const dd = d ? Math.hypot(d.wx - pos.x, d.wz - pos.z) : 99;
        if (m && dm <= dd) setPrompt({ kind: 'PANO', text: `View real 360° · ${m.roomName}` });
        else if (d) setPrompt({ kind: 'DOOR', text: d.open ? 'Close door' : 'Open door' });
        else setPrompt(null);

        markers.forEach((mk, i) => { mk.sprite.position.y = 1.75 + Math.sin(now / 600 + i) * 0.05; });
      }

      camera.position.copy(pos);
      const dir = new THREE.Vector3(
        Math.sin(look.yaw) * Math.cos(look.pitch),
        Math.sin(look.pitch),
        Math.cos(look.yaw) * Math.cos(look.pitch)
      );
      camera.lookAt(pos.clone().add(dir));
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      removeEventListener('keydown', onKeyDown); removeEventListener('keyup', onKeyUp);
      document.removeEventListener('pointerlockchange', onLockChange);
      document.removeEventListener('mousemove', onMove);
      cv.removeEventListener('click', onClick);
      cv.removeEventListener('touchstart', ts); cv.removeEventListener('touchmove', tm); cv.removeEventListener('touchend', te);
      if (document.pointerLockElement === cv) document.exitPointerLock();
      cubeTarget.dispose(); renderer.dispose();
      host.removeChild(cv);
    };
  }, [model, rooms, panoramas, quality, lighting, daylight]);

  const panoCount = rooms.filter(r => panoramas[r.id]).length;

  return (
    <div className="walk-root">
      <div className="walk-canvas" ref={hostRef} />

      <div className="walk-badge">
        <strong>{room || '—'}</strong>
        <span>{pano ? (pano.real ? 'Mode A · captured 360°' : 'Mode A · rendered 360°') : 'Mode B · interactive 3D'}</span>
      </div>

      {!pano && locked && <div className="walk-crosshair" />}

      {!pano && !locked && (
        <div className="walk-lockhint">
          <strong>Click to walk through</strong>
          <span>W A S D move · mouse look · Shift run · E open doors &amp; 360° · Esc release</span>
        </div>
      )}

      {!pano && prompt && locked && (
        <div className={`walk-prompt${prompt.kind === 'PANO' ? ' pano' : ''}`}>
          <b>E</b> {prompt.text}
        </div>
      )}

      {pano && (
        <div className="walk-pano-bar">
          <div>
            <strong>{pano.roomName}</strong>
            <span>{pano.real
              ? 'Captured panorama from the Mode A stitcher'
              : 'Rendered from the design model — no 360° capture for this room yet'}</span>
          </div>
          <button className="button button-secondary" onClick={() => rt.current?.exitPano()}>Back to 3D</button>
        </div>
      )}

      <div className="walk-rooms">
        {rooms.map(r => (
          <button key={r.id} onClick={() => rt.current?.teleport(r.id)}>
            {r.name}{panoramas[r.id] ? ' ◎' : ''}
          </button>
        ))}
        {onExit && <button className="walk-exit" onClick={onExit}>Exit walkthrough</button>}
      </div>

      <div className="walk-foot">
        {panoCount > 0
          ? `${panoCount} of ${rooms.length} rooms have a captured 360°`
          : 'No Mode A captures linked — 360° markers render from the model'}
        {notice && <em> · {notice}</em>}
      </div>
    </div>
  );
}
