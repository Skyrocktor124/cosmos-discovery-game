import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import * as THREE from 'three';
import '../index.css';
import SoundToggle from '../shared/SoundToggle';
import ShareButton from '../shared/ShareButton';
import { sfx } from '../shared/sfx';
import {
  createGlowTexture, createMossling, createPlantingRing, createSeed, createTree, flat, makeSway,
  Mossling, rand, updateMossling,
} from './models';
import {
  buildWorld, DISCOVERIES, dominantRegion, isWater, PLANT_SPOTS, Region, REGIONS,
  regionWeights, SEED_SPOTS, terrainHeight,
} from './world';

const SAVE_KEY = 'mossling-save-v1';

interface SaveData {
  seeds: number;
  collected: string[];
  planted: string[];
  found: string[];
  night: boolean;
}

const loadSave = (): SaveData => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<SaveData>;
      return {
        seeds: s.seeds ?? 0,
        collected: s.collected ?? [],
        planted: s.planted ?? [],
        found: s.found ?? [],
        night: s.night ?? false,
      };
    }
  } catch { /* ignore */ }
  return { seeds: 0, collected: [], planted: [], found: [], night: false };
};

const NIGHT = { top: 0x0d1730, bottom: 0x2a3d55, fog: 0x203247 };
const WALK_SPEED = 9.5;
const GRAVITY = -30;
const JUMP_V = 10;

type Prompt = { kind: 'plant' | 'nap'; label: string } | null;

const App: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const saved = useRef<SaveData>(loadSave());

  const [started, setStarted] = useState(false);
  const [seeds, setSeeds] = useState(saved.current.seeds);
  const [planted, setPlanted] = useState(saved.current.planted.length);
  const [found, setFound] = useState<string[]>(saved.current.found);
  const [regionName, setRegionName] = useState('');
  const [night, setNight] = useState(saved.current.night);
  const [toast, setToast] = useState<{ icon: string; title: string; note: string } | null>(null);
  const [prompt, setPrompt] = useState<Prompt>(null);
  const [codexOpen, setCodexOpen] = useState(false);
  const fadeRef = useRef<HTMLDivElement>(null);

  const startedRef = useRef(false);
  startedRef.current = started;
  const controls = useRef<{ interact: () => void; jump: () => void }>({ interact: () => {}, jump: () => {} });

  const persist = useCallback(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(saved.current)); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // --- Renderer, scene, camera ----------------------------------------
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xc4dbdd, 45, 165);
    const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 700);

    // Gradient sky dome that follows the camera.
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { uTop: { value: new THREE.Color(0x5f97c9) }, uBottom: { value: new THREE.Color(0xcfe6ea) } },
      vertexShader: 'varying vec3 vP;\nvoid main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec3 vP;
        uniform vec3 uTop; uniform vec3 uBottom;
        void main(){
          float h = normalize(vP).y * 0.5 + 0.5;
          gl_FragColor = vec4(mix(uBottom, uTop, smoothstep(0.42, 0.96, h)), 1.0);
        }`,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(320, 24, 16), skyMat);
    scene.add(sky);

    // Stars, only visible after dark.
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(700 * 3);
    for (let i = 0; i < 700; i++) {
      const a = rand(0, Math.PI * 2);
      const y = rand(0.05, 1);
      const r = Math.sqrt(1 - y * y);
      starPos.set([Math.sin(a) * r * 290, y * 290, Math.cos(a) * r * 290], i * 3);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.6, sizeAttenuation: false, transparent: true, opacity: 0 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    const hemi = new THREE.HemisphereLight(0xd6ecf5, 0x4a5c3a, 2.0);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
    sun.position.set(40, 70, 30);
    scene.add(sun);

    // Drifting clouds.
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
    const clouds: THREE.Mesh[] = [];
    for (let i = 0; i < 14; i++) {
      const cl = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(6, 13), 0), cloudMat);
      cl.position.set(rand(-220, 220), rand(48, 78), rand(-220, 220));
      cl.scale.y = 0.35;
      scene.add(cl);
      clouds.push(cl);
    }

    // --- World -----------------------------------------------------------
    const world = buildWorld();
    if (world.rice) world.rice.userData.full = world.rice.count;
    for (const f of world.flowers) f.userData.full = f.count;
    scene.add(world.group);

    const mossling: Mossling = createMossling();
    scene.add(mossling.group);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.1, 24),
      new THREE.MeshBasicMaterial({ color: 0x24341f, transparent: true, opacity: 0.3 }),
    );
    shadow.rotation.x = -Math.PI / 2;
    scene.add(shadow);

    // --- Seeds, planting rings, grown trees -------------------------------
    interface SeedObj { id: string; obj: THREE.Group; x: number; z: number; }
    const seedObjs: SeedObj[] = [];
    for (const spot of SEED_SPOTS) {
      if (saved.current.collected.includes(spot.id)) continue;
      const obj = createSeed();
      obj.position.set(spot.x, terrainHeight(spot.x, spot.z) + 1.1, spot.z);
      scene.add(obj);
      seedObjs.push({ id: spot.id, obj, x: spot.x, z: spot.z });
    }

    interface PlantObj { id: string; ring: THREE.Mesh; x: number; z: number; grown: THREE.Group | null; grow: number; }
    const plantObjs: PlantObj[] = PLANT_SPOTS.map(spot => {
      const ring = createPlantingRing();
      ring.position.set(spot.x, terrainHeight(spot.x, spot.z) + 0.07, spot.z);
      scene.add(ring);
      const done = saved.current.planted.includes(spot.id);
      const p: PlantObj = { id: spot.id, ring, x: spot.x, z: spot.z, grown: null, grow: done ? 1 : 0 };
      if (done) {
        const region = dominantRegion(spot.x, spot.z);
        const tree = createTree(region.trees, 1.15);
        tree.position.set(spot.x, terrainHeight(spot.x, spot.z), spot.z);
        scene.add(tree);
        p.grown = tree;
        ring.visible = false;
      }
      return p;
    });

    // --- Grass carpet -----------------------------------------------------
    // Dense short grass is only ever drawn near the player: blades that fall
    // behind are recycled to a fresh spot inside the disc, which keeps the
    // ground lush without paying for a whole valley of instances.
    const GRASS = 6000;
    let GRASS_LIVE = GRASS;
    const GRASS_R = 26;
    const grassGeo = new THREE.ConeGeometry(0.075, 0.38, 3);
    grassGeo.translate(0, 0.19, 0);
    const grassMat = flat(0xffffff);
    const grassSway = makeSway(grassMat, 0.11);
    const grass = new THREE.InstancedMesh(grassGeo, grassMat, GRASS);
    grass.frustumCulled = false;
    scene.add(grass);
    const grassXZ = new Float32Array(GRASS * 2);
    const gm = new THREE.Matrix4();
    const gq = new THREE.Quaternion();
    const gs = new THREE.Vector3();
    const gp = new THREE.Vector3();
    const gTint = new THREE.Color();
    const placeBlade = (i: number, cx: number, cz: number) => {
      const a = rand(0, Math.PI * 2);
      const r = Math.sqrt(Math.random()) * GRASS_R;
      const x = cx + Math.sin(a) * r;
      const z = cz + Math.cos(a) * r;
      grassXZ[i * 2] = x;
      grassXZ[i * 2 + 1] = z;
      const under = isWater(x, z);
      gp.set(x, terrainHeight(x, z) - 0.04, z);
      gq.setFromEuler(new THREE.Euler(rand(-0.2, 0.2), rand(0, 6.28), rand(-0.2, 0.2)));
      gs.set(rand(0.7, 1.5), under ? 0 : rand(0.6, 1.6), rand(0.7, 1.5));
      grass.setMatrixAt(i, gm.compose(gp, gq, gs));
      gTint.set(dominantRegion(x, z).grass).offsetHSL(rand(-0.03, 0.03), rand(-0.07, 0.07), rand(-0.02, 0.12));
      grass.setColorAt(i, gTint);
    };

    // --- Fireflies & pollen ----------------------------------------------
    const glowTex = createGlowTexture();
    const makeMotes = (count: number, size: number, color: number, opacity: number) => {
      const geo = new THREE.BufferGeometry();
      const arr = new Float32Array(count * 3);
      geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      const mat = new THREE.PointsMaterial({
        size, map: glowTex, color, transparent: true, opacity,
        depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const pts = new THREE.Points(geo, mat);
      scene.add(pts);
      return { pts, arr, mat };
    };
    const creek = REGIONS.find(r => r.id === 'creek')!;
    const fireflies = makeMotes(160, 1.0, 0xfff3a8, 0);
    const fireflyPhase = new Float32Array(160);
    for (let i = 0; i < 160; i++) {
      const a = rand(0, Math.PI * 2);
      const r = Math.sqrt(Math.random()) * 34;
      fireflies.arr.set([creek.x + Math.sin(a) * r, rand(0.6, 5), creek.z + Math.cos(a) * r], i * 3);
      fireflyPhase[i] = rand(0, 6.28);
    }
    const POLLEN = 90;
    const pollen = makeMotes(POLLEN, 0.28, 0xfff8dc, 0.4);
    const pollenPhase = new Float32Array(POLLEN);
    const pollenOffset = new Float32Array(POLLEN * 3);
    for (let i = 0; i < POLLEN; i++) {
      pollenPhase[i] = rand(0, 6.28);
      pollenOffset.set([rand(-16, 16), rand(0.4, 6), rand(-16, 16)], i * 3);
    }

    // --- Rain -------------------------------------------------------------
    const DROPS = 1200;
    const rainPos = new Float32Array(DROPS * 6);
    const rainSeed = new Float32Array(DROPS);
    const rainMat = new THREE.LineBasicMaterial({ color: 0xd8eefb, transparent: true, opacity: 0 });
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rain = new THREE.LineSegments(rainGeo, rainMat);
    rain.frustumCulled = false;
    scene.add(rain);

    // --- Leaf burst for planting -----------------------------------------
    const leafGeo = new THREE.TetrahedronGeometry(0.2);
    const leafMats = [new THREE.MeshToonMaterial({ color: 0x8fd06a }), new THREE.MeshToonMaterial({ color: 0xe0b545 })];
    interface Leaf { mesh: THREE.Mesh; vel: THREE.Vector3; life: number; }
    const leaves: Leaf[] = [];
    for (let i = 0; i < 60; i++) {
      const mesh = new THREE.Mesh(leafGeo, leafMats[i % 2]);
      mesh.visible = false;
      scene.add(mesh);
      leaves.push({ mesh, vel: new THREE.Vector3(), life: 0 });
    }
    let leafCursor = 0;
    const burst = (at: THREE.Vector3, count: number) => {
      for (let i = 0; i < count; i++) {
        const l = leaves[leafCursor];
        leafCursor = (leafCursor + 1) % leaves.length;
        l.mesh.position.copy(at);
        l.mesh.visible = true;
        l.vel.set(rand(-3, 3), rand(3, 7), rand(-3, 3));
        l.life = rand(0.8, 1.4);
      }
    };

    // --- Player state -----------------------------------------------------
    const P = {
      x: 0, z: 14, y: 0, vy: 0, airborne: false,
      facing: Math.PI, camYaw: Math.PI, moving: false, turn: 0,
      napT: 0, napping: false, napFlipped: false, fade: 0,
      nightT: saved.current.night ? 1 : 0,
      time: 0,
    };
    const keys = new Set<string>();
    const joy = { active: false, id: -1, ox: 0, oy: 0, dx: 0, dy: 0 };
    const drag = { active: false, id: -1, x: 0 };

    for (let i = 0; i < GRASS; i++) placeBlade(i, 0, 14);
    grass.instanceMatrix.needsUpdate = true;
    if (grass.instanceColor) grass.instanceColor.needsUpdate = true;

    let currentRegion: Region = dominantRegion(P.x, P.z);
    setRegionName(`${currentRegion.nameZh} · ${currentRegion.name}`);

    const showToast = (icon: string, title: string, note: string) => {
      setToast({ icon, title, note });
      window.setTimeout(() => setToast(t => (t && t.title === title ? null : t)), 5200);
    };

    // --- Interactions -----------------------------------------------------
    let promptState: Prompt = null;
    const setPromptOnce = (p: Prompt) => {
      const same = (a: Prompt, b: Prompt) => (!a && !b) || (!!a && !!b && a.kind === b.kind);
      if (!same(p, promptState)) { promptState = p; setPrompt(p); }
    };

    const plantSeed = (spot: PlantObj) => {
      if (saved.current.seeds <= 0) return;
      saved.current.seeds -= 1;
      saved.current.planted.push(spot.id);
      persist();
      setSeeds(saved.current.seeds);
      setPlanted(saved.current.planted.length);
      const region = dominantRegion(spot.x, spot.z);
      const tree = createTree(region.trees, 1.15);
      tree.position.set(spot.x, terrainHeight(spot.x, spot.z), spot.z);
      tree.scale.setScalar(0.01);
      scene.add(tree);
      spot.grown = tree;
      spot.grow = 0.001;
      spot.ring.visible = false;
      burst(new THREE.Vector3(spot.x, terrainHeight(spot.x, spot.z) + 1, spot.z), 14);
      sfx.play('merge');
      showToast('🌱', '种子发芽了', '一棵新的小树。它会自己长大,你随时可以回来看它。');
    };

    const napInHollow = () => {
      if (P.napping) return;
      P.napping = true;
      P.napT = 0;
      P.napFlipped = false;
      sfx.play('warp');
    };

    const interact = () => {
      if (!startedRef.current) return;
      if (promptState?.kind === 'nap') { napInHollow(); return; }
      if (promptState?.kind === 'plant') {
        const near = plantObjs.find(p => !p.grown && Math.hypot(p.x - P.x, p.z - P.z) < 4);
        if (near) plantSeed(near);
      }
    };

    const jump = () => {
      if (!startedRef.current || P.airborne || P.napping) return;
      P.vy = JUMP_V;
      P.airborne = true;
      sfx.play('blip');
    };
    controls.current = { interact, jump };

    // --- Input ------------------------------------------------------------
    const onKeyDown = (e: KeyboardEvent) => {
      keys.add(e.key.toLowerCase());
      if (e.key === ' ') { e.preventDefault(); jump(); }
      if (e.key.toLowerCase() === 'e' || e.key === 'Enter') { e.preventDefault(); interact(); }
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());

    const onPointerDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('button, a')) return;
      if (e.clientX < window.innerWidth * 0.5 && !joy.active) {
        joy.active = true; joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.dx = 0; joy.dy = 0;
      } else if (!drag.active) {
        drag.active = true; drag.id = e.pointerId; drag.x = e.clientX;
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (joy.active && e.pointerId === joy.id) {
        joy.dx = THREE.MathUtils.clamp((e.clientX - joy.ox) / 70, -1, 1);
        joy.dy = THREE.MathUtils.clamp((e.clientY - joy.oy) / 70, -1, 1);
      } else if (drag.active && e.pointerId === drag.id) {
        P.camYaw -= (e.clientX - drag.x) * 0.006;
        drag.x = e.clientX;
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId === joy.id) { joy.active = false; joy.id = -1; joy.dx = 0; joy.dy = 0; }
      if (e.pointerId === drag.id) { drag.active = false; drag.id = -1; }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // --- Colour helpers ---------------------------------------------------
    const skyTop = new THREE.Color();
    const skyBottom = new THREE.Color();
    const fogColor = new THREE.Color();
    const tmpColor = new THREE.Color();
    const nightTop = new THREE.Color(NIGHT.top);
    const nightBottom = new THREE.Color(NIGHT.bottom);
    const nightFog = new THREE.Color(NIGHT.fog);

    const blendRegionColor = (target: THREE.Color, weights: number[], key: 'skyTop' | 'skyBottom' | 'fog') => {
      target.setRGB(0, 0, 0);
      for (let i = 0; i < REGIONS.length; i++) {
        tmpColor.set(REGIONS[i][key]);
        target.r += tmpColor.r * weights[i];
        target.g += tmpColor.g * weights[i];
        target.b += tmpColor.b * weights[i];
      }
    };

    // --- Frame loop -------------------------------------------------------
    let raf = 0;
    let last = performance.now();
    let hudAcc = 0;
    // Frame-time watchdog: on a weak device, thin out the vegetation and
    // drop the pixel ratio rather than letting the walk turn to slideshow.
    let slowFrames = 0;
    let quality = 1;
    const downgrade = () => {
      quality /= 2;
      GRASS_LIVE = Math.floor(GRASS * quality);
      grass.count = Math.floor(GRASS * quality);
      if (world.rice) world.rice.count = Math.floor((world.rice.userData.full as number) * quality);
      for (const f of world.flowers) f.count = Math.floor((f.userData.full as number) * quality);
      renderer.setPixelRatio(Math.max(1, Math.min(2, window.devicePixelRatio || 1) * quality));
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      P.time += dt;
      const t = P.time;

      // --- Movement ---
      let mx = 0;
      let mz = 0;
      if (startedRef.current && !P.napping) {
        if (keys.has('w') || keys.has('arrowup')) mz -= 1;
        if (keys.has('s') || keys.has('arrowdown')) mz += 1;
        if (keys.has('a') || keys.has('arrowleft')) mx -= 1;
        if (keys.has('d') || keys.has('arrowright')) mx += 1;
        if (keys.has('q')) P.camYaw += dt * 1.6;
        if (keys.has('r')) P.camYaw -= dt * 1.6;
        if (joy.active) { mx += joy.dx; mz += joy.dy; }
      }
      const mag = Math.hypot(mx, mz);
      P.moving = mag > 0.15;
      if (P.moving) {
        const nx = mx / mag;
        const nz = mz / mag;
        // Movement is relative to where the camera is looking.
        const cos = Math.cos(P.camYaw);
        const sin = Math.sin(P.camYaw);
        const wx = nx * cos + nz * sin;
        const wz = -nx * sin + nz * cos;
        const wading = isWater(P.x, P.z);
        const speed = WALK_SPEED * (wading ? 0.55 : 1) * Math.min(1, mag);
        P.x += wx * speed * dt;
        P.z += wz * speed * dt;
        const targetFacing = Math.atan2(wx, wz);
        let diff = targetFacing - P.facing;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        P.turn = THREE.MathUtils.clamp(diff, -1, 1);
        P.facing += diff * Math.min(1, dt * 9);
      } else {
        P.turn *= 0.9;
      }
      // Keep the wanderer inside the valley.
      const fromHome = Math.hypot(P.x, P.z);
      if (fromHome > 170) {
        P.x *= 170 / fromHome;
        P.z *= 170 / fromHome;
      }

      // Jump / ground.
      const groundY = Math.max(terrainHeight(P.x, P.z), isWater(P.x, P.z) ? -0.6 : -99);
      if (P.airborne) {
        P.vy += GRAVITY * dt;
        P.y += P.vy * dt;
        if (P.y <= groundY) { P.y = groundY; P.vy = 0; P.airborne = false; }
      } else {
        P.y = THREE.MathUtils.lerp(P.y, groundY, Math.min(1, dt * 14));
      }

      // --- Nap in the tree hollow ---
      if (P.napping) {
        P.napT += dt;
        P.fade = P.napT < 1.2 ? P.napT / 1.2 : Math.max(0, 1 - (P.napT - 2.4) / 1.2);
        // Flip exactly once, at the darkest point of the fade.
        if (!P.napFlipped && P.napT > 1.2) {
          P.napFlipped = true;
          saved.current.night = !saved.current.night;
          persist();
          setNight(saved.current.night);
        }
        if (P.napT > 3.8) { P.napping = false; P.fade = 0; }
      }
      if (fadeRef.current) fadeRef.current.style.opacity = String(P.fade);
      P.nightT = THREE.MathUtils.lerp(P.nightT, saved.current.night ? 1 : 0, dt * 1.1);

      // --- Region blending: sky, fog, light, rain ---
      const weights = regionWeights(P.x, P.z);
      blendRegionColor(skyTop, weights, 'skyTop');
      blendRegionColor(skyBottom, weights, 'skyBottom');
      blendRegionColor(fogColor, weights, 'fog');
      skyTop.lerp(nightTop, P.nightT);
      skyBottom.lerp(nightBottom, P.nightT);
      fogColor.lerp(nightFog, P.nightT);
      (skyMat.uniforms.uTop.value as THREE.Color).copy(skyTop);
      (skyMat.uniforms.uBottom.value as THREE.Color).copy(skyBottom);
      (scene.fog as THREE.Fog).color.copy(fogColor);
      renderer.setClearColor(fogColor);
      sun.intensity = THREE.MathUtils.lerp(1.6, 0.35, P.nightT);
      sun.color.setHex(P.nightT > 0.5 ? 0xaebfe6 : 0xfff2d8);
      hemi.intensity = THREE.MathUtils.lerp(2.0, 0.7, P.nightT);
      starMat.opacity = P.nightT * 0.9;
      cloudMat.opacity = THREE.MathUtils.lerp(0.75, 0.25, P.nightT);

      const rainAmount = REGIONS.reduce((acc, r, i) => acc + r.rain * weights[i], 0);
      rainMat.opacity = rainAmount * 0.45;

      // --- Rain particles (only stepped when it is actually raining) ---
      if (rainAmount > 0.02) {
        for (let i = 0; i < DROPS; i++) {
          const o = i * 6;
          if (rainPos[o + 1] === 0 && rainPos[o + 4] === 0) {
            rainSeed[i] = rand(0.7, 1.4);
            rainPos[o] = P.x + rand(-26, 26);
            rainPos[o + 1] = rand(2, 26);
            rainPos[o + 2] = P.z + rand(-26, 26);
            rainPos[o + 3] = rainPos[o] + 0.06;
            rainPos[o + 4] = rainPos[o + 1] - 0.6 * rainSeed[i];
            rainPos[o + 5] = rainPos[o + 2];
          }
          const fall = 30 * rainSeed[i] * dt;
          rainPos[o + 1] -= fall;
          rainPos[o + 4] -= fall;
          if (rainPos[o + 1] < terrainHeight(rainPos[o], rainPos[o + 2]) ||
              Math.hypot(rainPos[o] - P.x, rainPos[o + 2] - P.z) > 34) {
            rainPos[o] = P.x + rand(-26, 26);
            rainPos[o + 1] = rand(14, 28);
            rainPos[o + 2] = P.z + rand(-26, 26);
            rainPos[o + 3] = rainPos[o] + 0.06;
            rainPos[o + 4] = rainPos[o + 1] - 0.6 * rainSeed[i];
            rainPos[o + 5] = rainPos[o + 2];
          }
        }
        rainGeo.attributes.position.needsUpdate = true;
      }

      // --- Character ---
      mossling.group.position.set(P.x, P.y, P.z);
      mossling.group.rotation.y = P.facing;
      updateMossling(mossling, dt, t, {
        moving: P.moving, airborne: P.airborne, vy: P.vy, turn: P.turn,
        raining: rainAmount > 0.35, napping: P.napping,
      });
      shadow.position.set(P.x, groundY + 0.06, P.z);
      const lift = Math.max(0, P.y - groundY);
      shadow.scale.setScalar(1 / (1 + lift * 0.3));
      (shadow.material as THREE.MeshBasicMaterial).opacity = 0.3 / (1 + lift * 0.5);

      // --- Camera ---
      // Yaw eases toward where the mossling is heading, so it feels guided
      // rather than glued; dragging overrides it.
      if (P.moving && !drag.active) {
        let d = P.facing - P.camYaw;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        P.camYaw += d * Math.min(1, dt * 0.9);
      }
      const camDist = 11;
      const camX = P.x - Math.sin(P.camYaw) * camDist;
      const camZ = P.z - Math.cos(P.camYaw) * camDist;
      const camY = Math.max(terrainHeight(camX, camZ) + 2.6, P.y + 4.6);
      camera.position.lerp(new THREE.Vector3(camX, camY, camZ), Math.min(1, dt * 3.4));
      camera.lookAt(P.x, P.y + 1.7, P.z);
      sky.position.copy(camera.position);
      stars.position.copy(camera.position);

      // --- Seeds ---
      for (let i = seedObjs.length - 1; i >= 0; i--) {
        const s = seedObjs[i];
        s.obj.rotation.y += dt * 1.6;
        s.obj.position.y = terrainHeight(s.x, s.z) + 1.1 + Math.sin(t * 2 + s.x) * 0.18;
        if (Math.hypot(s.x - P.x, s.z - P.z) < 2.2) {
          scene.remove(s.obj);
          seedObjs.splice(i, 1);
          saved.current.seeds += 1;
          saved.current.collected.push(s.id);
          persist();
          setSeeds(saved.current.seeds);
          sfx.play('pickup');
          burst(s.obj.position.clone(), 4);
        }
      }

      // --- Planting rings & growth ---
      let nearPlant = false;
      for (const p of plantObjs) {
        if (p.grown && p.grow < 1) {
          p.grow = Math.min(1, p.grow + dt * 0.7);
          const e = 1 - Math.pow(1 - p.grow, 3);
          p.grown.scale.setScalar(e * (1 + Math.sin(p.grow * Math.PI) * 0.12));
        } else if (!p.grown) {
          const d = Math.hypot(p.x - P.x, p.z - P.z);
          const mat = p.ring.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.35 + Math.sin(t * 2) * 0.12 + (d < 4 ? 0.25 : 0);
          p.ring.scale.setScalar(d < 4 ? 1.1 : 1);
          if (d < 4) nearPlant = true;
        }
      }

      // --- Discoveries ---
      for (const d of DISCOVERIES) {
        if (saved.current.found.includes(d.id)) continue;
        if (Math.hypot(d.x - P.x, d.z - P.z) < d.radius) {
          saved.current.found.push(d.id);
          persist();
          setFound([...saved.current.found]);
          sfx.play('chime');
          showToast(d.icon, d.name, d.note);
        }
      }

      // --- Context prompt ---
      const nearHollow = Math.hypot(P.x - 0, P.z - 64) < 9;
      if (nearHollow && !P.napping) setPromptOnce({ kind: 'nap', label: '在树洞里打个盹' });
      else if (nearPlant && saved.current.seeds > 0) setPromptOnce({ kind: 'plant', label: '种下一颗种子' });
      else setPromptOnce(null);

      // --- Living things ---
      for (const b of world.butterflies) {
        const home = b.userData.home as THREE.Vector3;
        const ph = b.userData.phase as number;
        const r = b.userData.radius as number;
        const a = t * 0.4 + ph;
        b.position.set(home.x + Math.sin(a) * r, 0, home.z + Math.cos(a * 1.3) * r);
        b.position.y = terrainHeight(b.position.x, b.position.z) + 1.4 + Math.sin(t * 2 + ph) * 0.5;
        b.rotation.y = -a;
        const flap = Math.sin(t * 14 + ph) * 0.9;
        const wings = b.userData.wings as THREE.Mesh[];
        wings[0].rotation.y = flap;
        wings[1].rotation.y = -flap;
      }
      for (const d of world.dragonflies) {
        const home = d.userData.home as THREE.Vector3;
        const ph = d.userData.phase as number;
        const r = d.userData.radius as number;
        const a = t * 0.7 + ph;
        d.position.set(home.x + Math.sin(a) * r, 0, home.z + Math.cos(a) * r);
        d.position.y = terrainHeight(d.position.x, d.position.z) + 2 + Math.sin(t * 3 + ph) * 0.4;
        d.rotation.y = -a + Math.PI / 2;
        const wings = d.userData.wings as THREE.Mesh[];
        const flap = Math.sin(t * 40 + ph) * 0.5;
        wings.forEach((w, i) => { w.rotation.x = -Math.PI / 2 + flap * (i % 2 ? -1 : 1); });
      }
      for (const u of world.sway) u.value = t;
      grassSway.value = t;

      // Recycle grass blades that the wanderer has left behind.
      let recycled = 0;
      for (let i = 0; i < GRASS_LIVE && recycled < 400; i++) {
        const dx = grassXZ[i * 2] - P.x;
        const dz = grassXZ[i * 2 + 1] - P.z;
        if (dx * dx + dz * dz > GRASS_R * GRASS_R) { placeBlade(i, P.x, P.z); recycled++; }
      }
      if (recycled > 0) {
        grass.instanceMatrix.needsUpdate = true;
        if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
      }

      // Swing sways in the wind.
      (world.swing.userData.rope as THREE.Group).rotation.x = Math.sin(t * 0.9) * 0.12;

      // Pond ripples.
      for (const ring of world.ripples) {
        ring.userData.t += dt;
        const rt = ring.userData.t as number;
        if (rt > 4) {
          ring.userData.t = 0;
          ring.position.x = 95 + rand(-12, 12);
          ring.position.z = 25 + rand(-12, 12);
        }
        ring.scale.setScalar(0.4 + rt * 1.5);
        (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.5 - rt * 0.13);
      }

      // Fireflies drift and glow after dark; pollen drifts by day.
      fireflies.mat.opacity = P.nightT * 0.95;
      if (P.nightT > 0.02) {
        for (let i = 0; i < 160; i++) {
          const o = i * 3;
          fireflies.arr[o] += Math.sin(t * 0.6 + fireflyPhase[i]) * dt * 0.7;
          fireflies.arr[o + 1] += Math.sin(t * 1.3 + fireflyPhase[i] * 2) * dt * 0.5;
          fireflies.arr[o + 2] += Math.cos(t * 0.5 + fireflyPhase[i]) * dt * 0.7;
        }
        fireflies.pts.geometry.attributes.position.needsUpdate = true;
      }
      pollen.mat.opacity = (1 - P.nightT) * 0.35;
      for (let i = 0; i < POLLEN; i++) {
        const o = i * 3;
        const ph = pollenPhase[i];
        pollen.arr[o] = P.x + pollenOffset[o] + Math.sin(t * 0.35 + ph) * 1.6;
        pollen.arr[o + 1] = P.y + pollenOffset[o + 1] + Math.sin(t * 0.5 + ph * 2) * 0.9;
        pollen.arr[o + 2] = P.z + pollenOffset[o + 2] + Math.cos(t * 0.3 + ph) * 1.6;
      }
      pollen.pts.geometry.attributes.position.needsUpdate = true;

      // Lantern flicker.
      for (const g of world.lanternGlow) {
        (g.material as THREE.MeshBasicMaterial).opacity = 0.6 + Math.sin(t * 6) * 0.08 + P.nightT * 0.3;
      }

      // Leaves.
      for (const l of leaves) {
        if (l.life <= 0) continue;
        l.life -= dt;
        l.vel.y += GRAVITY * 0.3 * dt;
        l.mesh.position.addScaledVector(l.vel, dt);
        l.mesh.rotation.x += dt * 5;
        l.mesh.rotation.y += dt * 3;
        if (l.life <= 0) l.mesh.visible = false;
      }

      // Clouds drift.
      for (const cl of clouds) {
        cl.position.x += dt * 0.6;
        if (cl.position.x > 230) cl.position.x = -230;
      }

      // --- HUD (a few times a second) ---
      hudAcc += dt;
      if (hudAcc > 0.25) {
        hudAcc = 0;
        const r = dominantRegion(P.x, P.z);
        if (r.id !== currentRegion.id) {
          currentRegion = r;
          setRegionName(`${r.nameZh} · ${r.name}`);
        }
      }

      if (dt > 0.034) slowFrames++; else slowFrames = Math.max(0, slowFrames - 2);
      if (slowFrames > 45 && quality > 0.12) { downgrade(); slowFrames = 0; }

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    // ?debug=1 exposes state so automated tests can walk around and look.
    if (new URLSearchParams(location.search).has('debug')) {
      (window as unknown as { __mossling?: unknown }).__mossling = {
        P, keys, teleport: (x: number, z: number) => { P.x = x; P.z = z; P.y = terrainHeight(x, z); },
        setNight: (v: boolean) => { saved.current.night = v; setNight(v); },
        grass, world, renderer, scene,
        save: saved.current, interact, jump,
      };
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('resize', onResize);
      scene.traverse(o => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach(x => x.dispose());
        else mat?.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = DISCOVERIES.length;

  return (
    <div className="fixed inset-0 select-none" style={{ touchAction: 'none', background: '#c4dbdd' }}>
      <div ref={mountRef} className="absolute inset-0" />
      {/* Sleep fade — driven straight from the loop, no re-render per frame. */}
      <div ref={fadeRef} className="absolute inset-0 bg-emerald-950 pointer-events-none transition-none" style={{ opacity: 0 }} />

      {/* HUD */}
      <div className="absolute top-3 left-0 right-0 flex justify-center items-center gap-2 pointer-events-none font-mono px-3">
        <div className="bg-emerald-950/45 border border-emerald-200/25 rounded-xl px-3 py-1.5 text-center backdrop-blur-sm">
          <div className="text-[10px] uppercase text-emerald-100/60">种子</div>
          <div className="text-base font-bold text-amber-200" data-testid="seeds">🌰 {seeds}</div>
        </div>
        <div className="bg-emerald-950/45 border border-emerald-200/25 rounded-xl px-3 py-1.5 text-center backdrop-blur-sm">
          <div className="text-[10px] uppercase text-emerald-100/60">种下</div>
          <div className="text-base font-bold text-lime-200" data-testid="planted">🌱 {planted}</div>
        </div>
        <button
          onClick={() => { sfx.play('click'); setCodexOpen(o => !o); }}
          data-testid="codex-button"
          className="bg-emerald-950/45 border border-emerald-200/25 rounded-xl px-3 py-1.5 text-center backdrop-blur-sm pointer-events-auto hover:border-emerald-200/60 transition-colors"
        >
          <div className="text-[10px] uppercase text-emerald-100/60">发现</div>
          <div className="text-base font-bold text-sky-100" data-testid="found">📖 {found.length}/{total}</div>
        </button>
        <div className="bg-emerald-950/45 border border-emerald-200/25 rounded-xl px-3 py-1.5 text-center backdrop-blur-sm">
          <div className="text-[10px] uppercase text-emerald-100/60">此刻</div>
          <div className="text-base font-bold text-white">{night ? '🌙 夜' : '☀️ 昼'}</div>
        </div>
        <SoundToggle className="pointer-events-auto" />
      </div>

      {/* Region name */}
      {started && (
        <div key={regionName} className="absolute top-24 left-0 right-0 text-center pointer-events-none animate-in fade-in zoom-in">
          <div className="inline-block text-white/90 text-lg font-bold tracking-wide drop-shadow-lg" data-testid="region">
            {regionName}
          </div>
        </div>
      )}

      {/* Discovery toast */}
      {toast && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-[min(92vw,26rem)] pointer-events-none animate-in fade-in zoom-in">
          <div className="bg-emerald-950/75 border border-emerald-200/30 rounded-2xl px-4 py-3 backdrop-blur-sm text-center">
            <div className="text-2xl mb-1">{toast.icon}</div>
            <div className="text-sm font-bold text-lime-100" data-testid="toast-title">{toast.title}</div>
            <div className="text-xs text-emerald-50/80 mt-1 leading-relaxed">{toast.note}</div>
          </div>
        </div>
      )}

      {/* Context action */}
      {started && prompt && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <button
            data-testid="interact"
            onPointerDown={e => e.stopPropagation()}
            onClick={() => controls.current.interact()}
            className="px-6 py-3 rounded-2xl bg-lime-600/90 border border-lime-200/50 text-white font-bold text-sm tracking-wide backdrop-blur-sm animate-pulse"
          >
            {prompt.label} <span className="opacity-70 text-xs">(E)</span>
          </button>
        </div>
      )}

      {/* Mobile helpers */}
      {started && (
        <button
          onPointerDown={e => { e.stopPropagation(); controls.current.jump(); }}
          className="absolute bottom-8 right-6 w-16 h-16 rounded-full bg-emerald-800/50 border border-emerald-200/40 text-2xl backdrop-blur-sm sm:hidden"
          aria-label="Jump"
        >
          ⤴️
        </button>
      )}

      {/* Codex */}
      {codexOpen && (
        <div className="absolute inset-0 bg-emerald-950/70 backdrop-blur-sm overflow-y-auto p-4 sm:p-8" onClick={() => setCodexOpen(false)}>
          <div className="max-w-lg mx-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-black text-lime-100 mb-1">森林手帐</h2>
            <p className="text-xs text-emerald-100/60 mb-4">走到它们旁边就会自己记下来 · {found.length}/{total}</p>
            <div className="flex flex-col gap-2">
              {DISCOVERIES.map(d => {
                const got = found.includes(d.id);
                return (
                  <div key={d.id} className={`rounded-xl px-4 py-3 border ${got ? 'bg-emerald-900/60 border-emerald-300/30' : 'bg-emerald-950/50 border-emerald-100/10'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{got ? d.icon : '·'}</span>
                      <span className={`font-bold text-sm ${got ? 'text-lime-100' : 'text-emerald-100/30'}`}>
                        {got ? d.name : '还没找到'}
                      </span>
                    </div>
                    {got && <p className="text-xs text-emerald-50/70 mt-1.5 leading-relaxed">{d.note}</p>}
                  </div>
                );
              })}
            </div>
            <button onClick={() => setCodexOpen(false)} className="mt-5 w-full py-2.5 rounded-xl bg-lime-600/80 text-white font-bold text-sm">
              合上手帐
            </button>
          </div>
        </div>
      )}

      {/* Title screen */}
      {!started && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-emerald-950/55 backdrop-blur-[2px] px-6 text-center">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-lime-200 to-emerald-300">
            苔灵漫游
          </h1>
          <p className="text-emerald-100/70 text-xs uppercase tracking-[0.3em]">Mossling Wander</p>
          <p className="text-sm text-emerald-50/90 max-w-sm leading-relaxed">
            一只背上长着苔藓和小蘑菇的森林精灵,住在一片有五种风景的山谷里。<br />
            没有敌人,没有计时,也不会失败 —— 走走看看,捡起会发光的种子,把它们种回土里。
          </p>
          <div className="text-xs text-emerald-100/70 leading-relaxed">
            <span className="text-lime-200 font-bold">WASD / 方向键</span> 走路 ·
            <span className="text-lime-200 font-bold"> 空格</span> 跳 ·
            <span className="text-lime-200 font-bold"> E</span> 互动 ·
            <span className="text-lime-200 font-bold"> 拖动鼠标 / Q R</span> 转视角<br />
            手机:左半屏拖动走路,右半屏拖动转视角
          </div>
          <button
            data-testid="start"
            onPointerDown={e => e.stopPropagation()}
            onClick={() => { sfx.play('click'); setStarted(true); }}
            className="px-8 py-3 rounded-2xl bg-lime-600 hover:bg-lime-500 transition-colors font-bold text-white tracking-wide"
          >
            出发散步
          </button>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-emerald-100/50 uppercase font-bold mt-2">
            <a href="../" className="hover:text-cyan-200 transition-colors">▶ Chroma Cosmos</a>
            <a href="../astro-merge/" className="hover:text-fuchsia-200 transition-colors">▶ Astro Merge</a>
            <a href="../orbit-dash/" className="hover:text-amber-200 transition-colors">▶ Orbit Dash</a>
            <a href="../star-serpent/" className="hover:text-lime-200 transition-colors">▶ Star Serpent</a>
          </div>
          {found.length > 0 && (
            <ShareButton text={`我在《苔灵漫游》的山谷里找到了 ${found.length}/${total} 处风景,种下了 ${planted} 棵树 🌱`} />
          )}
        </div>
      )}
    </div>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element');
ReactDOM.createRoot(rootElement).render(<App />);
