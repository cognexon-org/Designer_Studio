'use client';

/**
 * Equirectangular 360° viewer.
 *
 * One viewer used everywhere a panorama appears (project 360 tab, org-wide
 * library, anywhere else), so the interaction is identical across the product:
 *
 *  - drag to look, with velocity carried into a damped glide on release
 *  - vertical look is clamped short of the poles so the image never flips
 *  - wheel / pinch zooms by narrowing the field of view, like a lens
 *  - gentle auto-pan until the person first touches it, then it is theirs
 *  - double-click / double-tap recentres and resets zoom
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface Props {
  url: string;
  /** Optional label shown while the image streams in. */
  caption?: string;
  className?: string;
}

const MIN_FOV = 34;
const MAX_FOV = 95;
const DEFAULT_FOV = 74;

export function Pano360Viewer({ url, caption, className }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    setLoading(true); setFailed(false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(DEFAULT_FOV, 1, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    host.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.cursor = 'grab';

    const geometry = new THREE.SphereGeometry(10, 64, 42);
    geometry.scale(-1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x141c26 });
    scene.add(new THREE.Mesh(geometry, material));

    let disposed = false;
    new THREE.TextureLoader().load(
      url,
      texture => {
        if (disposed) return;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.generateMipmaps = true;
        material.map = texture; material.color.set(0xffffff); material.needsUpdate = true;
        setLoading(false);
      },
      undefined,
      () => { if (!disposed) { setLoading(false); setFailed(true); } }
    );

    /* ---- look state ---- */
    const look = { yaw: 0, pitch: 0 };
    const velocity = { yaw: 0, pitch: 0 };
    let fov = DEFAULT_FOV;
    let idle = true;               // auto-pan until first interaction
    let pointer: { x: number; y: number } | null = null;
    let lastTap = 0;
    let pinch: number | null = null;

    const PITCH_LIMIT = Math.PI / 2 - 0.06;
    // Drag speed scales with zoom so a zoomed-in view doesn't feel twitchy.
    const dragScale = () => (fov / DEFAULT_FOV) * 0.0042;

    const el = renderer.domElement;

    const onDown = (e: PointerEvent) => {
      idle = false;
      pointer = { x: e.clientX, y: e.clientY };
      velocity.yaw = velocity.pitch = 0;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = 'grabbing';
      const now = performance.now();
      if (now - lastTap < 320) { // double tap: recentre
        look.yaw = 0; look.pitch = 0; fov = DEFAULT_FOV;
        velocity.yaw = velocity.pitch = 0;
      }
      lastTap = now;
    };
    const onUp = (e: PointerEvent) => {
      pointer = null;
      el.releasePointerCapture(e.pointerId);
      el.style.cursor = 'grab';
    };
    const onMove = (e: PointerEvent) => {
      if (!pointer) return;
      const dx = e.clientX - pointer.x, dy = e.clientY - pointer.y;
      pointer = { x: e.clientX, y: e.clientY };
      const s = dragScale();
      look.yaw -= dx * s;
      look.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, look.pitch + dy * s));
      // Remember the release velocity for the glide.
      velocity.yaw = -dx * s;
      velocity.pitch = dy * s;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      idle = false;
      fov = Math.max(MIN_FOV, Math.min(MAX_FOV, fov + Math.sign(e.deltaY) * 4));
    };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinch = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (pinch !== null && e.touches.length === 2) {
        e.preventDefault();
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        fov = Math.max(MIN_FOV, Math.min(MAX_FOV, fov * (pinch / d)));
        pinch = d;
      }
    };
    const onTouchEnd = () => { pinch = null; };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);

    const resize = () => {
      const w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (idle) {
        look.yaw += 0.00085; // slow shop-window drift before first touch
      } else if (!pointer) {
        // damped glide after release
        look.yaw += velocity.yaw;
        look.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, look.pitch + velocity.pitch));
        velocity.yaw *= 0.93;
        velocity.pitch *= 0.93;
      }
      camera.fov += (fov - camera.fov) * 0.18;
      camera.updateProjectionMatrix();
      camera.lookAt(
        Math.sin(look.yaw) * Math.cos(look.pitch) * 10,
        Math.sin(look.pitch) * 10,
        Math.cos(look.yaw) * Math.cos(look.pitch) * 10
      );
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      material.map?.dispose();
      geometry.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement);
    };
  }, [url]);

  return (
    <div className={`pano360 ${className ?? ''}`} ref={hostRef}>
      {loading && <div className="pano360-status">Loading {caption ?? 'panorama'}…</div>}
      {failed && <div className="pano360-status">Could not load this panorama.</div>}
      {!loading && !failed && (
        <div className="pano360-hint">Drag to look · scroll or pinch to zoom · double-tap to recentre</div>
      )}
    </div>
  );
}
