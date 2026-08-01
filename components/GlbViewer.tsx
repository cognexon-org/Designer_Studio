'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function GlbViewer({ url }: { url: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const host = container;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1efe9);
    const camera = new THREE.PerspectiveCamera(44, 1, 0.05, 500);
    camera.position.set(6, 5, 7);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    host.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.49;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x5c6470, 2.5));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(8, 12, 7);
    light.castShadow = true;
    scene.add(light);
    const grid = new THREE.GridHelper(30, 30, 0xb5b0a6, 0xd6d2ca);
    scene.add(grid);

    const loader = new GLTFLoader();
    let loaded: any = null;
    loader.load(url, (gltf: any) => {
      loaded = gltf.scene;
      loaded.traverse((object: any) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
      scene.add(loaded);
      const box = new THREE.Box3().setFromObject(loaded);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const span = Math.max(size.x, size.y, size.z, 2);
      camera.position.set(center.x + span * 1.15, center.y + span * 0.9, center.z + span * 1.2);
      controls.target.copy(center);
      controls.update();
      setProgress(100);
    }, (event: any) => {
      if (event.total) setProgress(Math.round((event.loaded / event.total) * 100));
    }, (caught: any) => setError(caught instanceof Error ? caught.message : 'Unable to load model.'));

    function resize() {
      const width = host.clientWidth;
      const height = host.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    }
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    let frame = 0;
    function render() { controls.update(); renderer.render(scene, camera); frame = requestAnimationFrame(render); }
    render();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      if (loaded) scene.remove(loaded);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [url]);

  return <div className="public-glb-viewer" ref={ref}>{progress < 100 && !error && <div className="model-loader"><div className="loader-ring"/><strong>Loading design model</strong><span>{progress || 1}%</span></div>}{error && <div className="model-error"><strong>Model could not be loaded</strong><p>{error}</p><a href={url}>Download GLB</a></div>}<div className="public-viewer-tip">Drag to rotate · Scroll to zoom</div></div>;
}
