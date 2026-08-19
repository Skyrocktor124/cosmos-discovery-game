import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import * as THREE from 'three';
import '../index.css';
import SoundToggle from '../shared/SoundToggle';
import ShareButton from '../shared/ShareButton';
import { sfx } from '../shared/sfx';
import {
  createAcorn, createBush, createObstacle, createSootSprite, createSpirit, createTree,
  createUmbrella, toon, updateSpirit, ObstacleKind, Spirit,
} from './models';

const BEST_KEY = 'forest-spirit-best-v1';

type Phase = 'ready' | 'playing' | 'over';
type EntityKind = 'obstacle' | 'acorn' | 'umbrella' | 'tree' | 'bush' | 'soot';

interface Entity {
  kind: EntityKind;
  obj: THREE.Object3D;
  height: number; // clearance needed to jump over it
  taken: boolean;
  phase: number;  // per-entity animation offset
}

const LANES = [-2.4, 0, 2.4];
const GRAVITY = -34;
const JUMP_V = 12.4;
const ROAR_COST = 12;      // acorns needed to charge a roar
const ROAR_TIME = 2.2;     // seconds the roar keeps clearing the path
const SHIELD_TIME = 9;     // seconds an umbrella lasts
const DESPAWN_Z = 12;
const SPAWN_Z = -100;

// Time-scale hook for automated testing (?speed=3 → 3x faster).
const SPEED_MULT = Math.max(1, Math.min(10, Number(new URLSearchParams(location.search).get('speed')) || 1));

const loadBest = (): number => {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);

// Scrolling ground texture, painted once into a canvas — keeps the build
// asset-free while still giving the path a sense of speed.
const groundTexture = (base: string, fleck: string, dots: number): THREE.CanvasTexture => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = fleck;
  for (let i = 0; i < dots; i++) {
    const r = rand(1, 4);
    g.globalAlpha = rand(0.15, 0.5);
    g.beginPath();
    g.arc(rand(0, 128), rand(0, 128), r, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};

const App: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('ready');
  const [score, setScore] = useState(0);
  const [acorns, setAcorns] = useState(0);
  const [charge, setCharge] = useState(0);
  const [shielded, setShielded] = useState(false);
  const [best, setBest] = useState<number>(loadBest);
  const phaseRef = useRef<Phase>('ready');
  phaseRef.current = phase;
  // Filled in by the three.js effect so the React overlay can drive the game.
  const api = useRef<{ start: () => void; jump: () => void; steer: (d: -1 | 1) => void; roar: () => void }>({
    start: () => {}, jump: () => {}, steer: () => {}, roar: () => {},
  });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // --- Renderer / scene -------------------------------------------------
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const FOG_CLEAR = new THREE.Color(0x9fb6c4);
    const FOG_ROAR = new THREE.Color(0xdfeef5);
    scene.fog = new THREE.Fog(FOG_CLEAR.getHex(), 22, 92);

    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 3.9, 7.8);
    camera.lookAt(0, 1.5, -4);

    scene.add(new THREE.HemisphereLight(0xcfe4ef, 0x3c4a35, 2.1));
    const sun = new THREE.DirectionalLight(0xfff3d6, 1.5);
    sun.position.set(6, 12, 5);
    scene.add(sun);

    // --- Ground -----------------------------------------------------------
    const pathTex = groundTexture('#7a6248', '#5b4732', 260);
    pathTex.repeat.set(2, 24);
    const path = new THREE.Mesh(new THREE.PlaneGeometry(9, 400), new THREE.MeshToonMaterial({ map: pathTex }));
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.01, -180);
    scene.add(path);

    const grassTex = groundTexture('#4f8449', '#3d6b3a', 400);
    grassTex.repeat.set(14, 40);
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(160, 400), new THREE.MeshToonMaterial({ map: grassTex }));
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(0, 0, -180);
    scene.add(grass);

    // The guardian tree in the mist — a landmark the path never quite reaches.
    const landmark = createTree();
    landmark.scale.setScalar(4.2);
    landmark.position.set(-25, 0, -38);
    scene.add(landmark);
    const landmark2 = createTree();
    landmark2.scale.setScalar(3.6);
    landmark2.position.set(27, 0, -46);
    scene.add(landmark2);

    // --- Spirit + blob shadow --------------------------------------------
    const spirit: Spirit = createSpirit();
    scene.add(spirit.group);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.05, 24),
      new THREE.MeshBasicMaterial({ color: 0x1d2b1c, transparent: true, opacity: 0.32 }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    scene.add(shadow);

    // --- Rain -------------------------------------------------------------
    const DROPS = 1400;
    const rainPos = new Float32Array(DROPS * 6);
    const rainSeed = new Float32Array(DROPS);
    const resetDrop = (i: number, top = false) => {
      const x = rand(-34, 34);
      const y = top ? rand(18, 34) : rand(0, 34);
      const z = rand(-80, 12);
      rainSeed[i] = rand(0.7, 1.4);
      rainPos.set([x, y, z, x + 0.05, y - 0.55 * rainSeed[i], z], i * 6);
    };
    for (let i = 0; i < DROPS; i++) resetDrop(i);
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rain = new THREE.LineSegments(
      rainGeo,
      new THREE.LineBasicMaterial({ color: 0xd8eefb, transparent: true, opacity: 0.4 }),
    );
    scene.add(rain);

    // --- Roar shockwave ---------------------------------------------------
    const wave = new THREE.Mesh(
      new THREE.RingGeometry(0.82, 1.3, 48),
      new THREE.MeshBasicMaterial({ color: 0xeafff2, transparent: true, opacity: 0, side: THREE.DoubleSide }),
    );
    wave.rotation.x = -Math.PI / 2;
    scene.add(wave);

    // --- Leaf burst particles --------------------------------------------
    const leafGeo = new THREE.TetrahedronGeometry(0.18);
    const leafMats = [toon(0x8fd06a), toon(0xe0b545), toon(0xd97b4a)];
    interface Leaf { mesh: THREE.Mesh; vel: THREE.Vector3; life: number; }
    const leaves: Leaf[] = [];
    for (let i = 0; i < 90; i++) {
      const mesh = new THREE.Mesh(leafGeo, leafMats[i % leafMats.length]);
      mesh.visible = false;
      scene.add(mesh);
      leaves.push({ mesh, vel: new THREE.Vector3(), life: 0 });
    }
    let leafCursor = 0;
    const burst = (at: THREE.Vector3, count: number, power = 1) => {
      for (let i = 0; i < count; i++) {
        const l = leaves[leafCursor];
        leafCursor = (leafCursor + 1) % leaves.length;
        l.mesh.position.copy(at);
        l.mesh.visible = true;
        l.vel.set(rand(-4, 4) * power, rand(2, 8) * power, rand(-4, 4) * power);
        l.life = rand(0.6, 1.1);
      }
    };

    // --- Entity pools -----------------------------------------------------
    const pools: Record<string, THREE.Object3D[]> = {};
    const factories: Record<string, () => THREE.Object3D> = {
      stump: () => createObstacle('stump'),
      rock: () => createObstacle('rock'),
      log: () => createObstacle('log'),
      acorn: createAcorn,
      umbrella: createUmbrella,
      tree: createTree,
      bush: createBush,
      soot: createSootSprite,
    };
    const take = (key: string): THREE.Object3D => {
      const pool = pools[key] ?? (pools[key] = []);
      const obj = pool.pop() ?? factories[key]();
      obj.visible = true;
      if (!obj.parent) scene.add(obj);
      return obj;
    };
    const give = (key: string, obj: THREE.Object3D) => {
      obj.visible = false;
      (pools[key] ?? (pools[key] = [])).push(obj);
    };
    const poolKey = (e: Entity): string =>
      e.kind === 'obstacle' ? (e.obj.userData.kind as string) : e.kind;

    const entities: Entity[] = [];
    const add = (kind: EntityKind, key: string, x: number, z: number, height = 0): Entity => {
      const obj = take(key);
      obj.position.set(x, 0, z);
      if (kind === 'obstacle') obj.userData.kind = key;
      const e: Entity = { kind, obj, height, taken: false, phase: rand(0, 6.28) };
      entities.push(e);
      return e;
    };

    // --- Game state -------------------------------------------------------
    const G = {
      speed: 15,
      dist: 0,
      acorns: 0,
      charge: 0,
      lane: 1,
      x: 0,
      y: 0,
      vy: 0,
      airborne: false,
      jumpBuffer: 0,
      shieldT: 0,
      roarT: 0,
      waveR: 0,
      shakeT: 0,
      deathT: 0,
      sinceObstacle: 0,
      sinceScenery: 0,
      nextObstacleGap: 12,
      elapsed: 0,
    };

    const scoreOf = () => Math.floor(G.dist) + G.acorns * 10;

    const clearEntities = () => {
      for (const e of entities) give(poolKey(e), e.obj);
      entities.length = 0;
    };

    const seedScenery = () => {
      for (let z = 8; z > SPAWN_Z; z -= rand(3, 6)) {
        for (const side of [-1, 1]) {
          if (Math.random() < 0.75) add('tree', 'tree', side * rand(6, 20), z);
          if (Math.random() < 0.5) add('bush', 'bush', side * rand(5, 14), z + rand(-2, 2));
        }
      }
    };

    const reset = () => {
      clearEntities();
      Object.assign(G, {
        speed: 15, dist: 0, acorns: 0, charge: 0, lane: 1, x: 0, y: 0, vy: 0,
        airborne: false, jumpBuffer: 0, shieldT: 0, roarT: 0, waveR: 0, shakeT: 0,
        deathT: 0, sinceObstacle: 0, sinceScenery: 0, nextObstacleGap: 12,
      });
      spirit.group.rotation.set(0, 0, 0);
      seedScenery();
      // Pre-populate the visible stretch so the run starts with something to do.
      for (let z = -34; z > SPAWN_Z; z -= 16) spawnRow(z);
      setScore(0);
      setAcorns(0);
      setCharge(0);
      setShielded(false);
    };

    const start = () => { sfx.play('click'); reset(); setPhase('playing'); phaseRef.current = 'playing'; };

    const die = () => {
      sfx.play('crash');
      G.shakeT = 0.5;
      G.deathT = 0;
      burst(spirit.group.position.clone().setY(1.2), 18, 1.4);
      setPhase('over');
      phaseRef.current = 'over';
      const s = scoreOf();
      setBest(prev => {
        const nb = Math.max(prev, s);
        try { localStorage.setItem(BEST_KEY, String(nb)); } catch { /* ignore */ }
        return nb;
      });
    };

    const jump = () => {
      if (phaseRef.current !== 'playing') { start(); return; }
      if (G.airborne) { G.jumpBuffer = 0.16; return; }
      G.vy = JUMP_V;
      G.airborne = true;
      sfx.play('blip');
    };

    const steer = (d: -1 | 1) => {
      if (phaseRef.current !== 'playing') return;
      const next = THREE.MathUtils.clamp(G.lane + d, 0, LANES.length - 1);
      if (next !== G.lane) { G.lane = next; sfx.play('click'); }
    };

    const roar = () => {
      if (phaseRef.current !== 'playing' || G.charge < ROAR_COST) return;
      G.charge -= ROAR_COST;
      G.roarT = ROAR_TIME;
      G.waveR = 1;
      G.shakeT = 0.35;
      setCharge(G.charge);
      sfx.play('warp');
    };

    api.current = { start, jump, steer, roar };
    // ?debug=1 exposes live state so automated tests can inspect the run.
    if (new URLSearchParams(location.search).has('debug')) {
      (window as unknown as { __forestSpirit?: unknown }).__forestSpirit = { G, entities, LANES, api: api.current };
    }

    // --- Spawning ---------------------------------------------------------
    const spawnRow = (z = SPAWN_Z) => {
      const blocked = new Set<number>();
      const count = G.speed > 22 && Math.random() < 0.55 ? 2 : 1;
      while (blocked.size < count) blocked.add(Math.floor(Math.random() * 3));
      const kinds: ObstacleKind[] = ['stump', 'rock', 'log'];
      for (const lane of blocked) {
        const kind = kinds[Math.floor(Math.random() * kinds.length)];
        add('obstacle', kind, LANES[lane], z, kind === 'log' ? 1.0 : 1.35);
      }
      const open = [0, 1, 2].filter(l => !blocked.has(l));
      const lane = open[Math.floor(Math.random() * open.length)];
      if (Math.random() < 0.08) {
        add('umbrella', 'umbrella', LANES[lane], z - 4);
      } else {
        const n = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) add('acorn', 'acorn', LANES[lane], z - 4 - i * 3);
      }
      // Occasional soot sprite drifting past the treeline.
      if (Math.random() < 0.25) add('soot', 'soot', rand(4, 9) * (Math.random() < 0.5 ? -1 : 1), z);
    };

    // --- Input ------------------------------------------------------------
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft': case 'a': case 'A': e.preventDefault(); steer(-1); break;
        case 'ArrowRight': case 'd': case 'D': e.preventDefault(); steer(1); break;
        case 'ArrowUp': case 'w': case 'W': case ' ': case 'Enter':
          e.preventDefault(); jump(); break;
        case 'ArrowDown': case 's': case 'S': case 'r': case 'R':
          e.preventDefault(); if (phaseRef.current === 'playing') roar(); else start(); break;
      }
    };
    let sx = 0, sy = 0, st = 0;
    const onDown = (e: PointerEvent) => { sx = e.clientX; sy = e.clientY; st = performance.now(); };
    const onUp = (e: PointerEvent) => {
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (phaseRef.current !== 'playing') { start(); return; }
      if (Math.hypot(dx, dy) < 24 && performance.now() - st < 400) { jump(); return; }
      if (Math.abs(dx) > Math.abs(dy)) steer(dx > 0 ? 1 : -1);
      else if (dy < 0) jump();
      else roar();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    seedScenery();

    // --- Frame loop -------------------------------------------------------
    let raf = 0;
    let last = performance.now();
    let hudAcc = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, ((now - last) / 1000) * SPEED_MULT);
      last = now;
      G.elapsed += dt;
      const playing = phaseRef.current === 'playing';

      // World scroll — everything moves toward the camera.
      const scroll = playing ? G.speed : G.speed * 0.15;
      if (playing) {
        G.dist += G.speed * dt;
        G.speed = Math.min(31, G.speed + dt * 0.42);
        G.sinceObstacle += G.speed * dt;
        G.sinceScenery += G.speed * dt;
        if (G.sinceObstacle >= G.nextObstacleGap) {
          G.sinceObstacle = 0;
          G.nextObstacleGap = rand(11, 18) - Math.min(5, G.speed * 0.15);
          spawnRow();
        }
        if (G.sinceScenery >= 4) {
          G.sinceScenery = 0;
          for (const side of [-1, 1]) {
            if (Math.random() < 0.8) add('tree', 'tree', side * rand(6, 20), SPAWN_Z);
            if (Math.random() < 0.55) add('bush', 'bush', side * rand(5, 14), SPAWN_Z);
          }
        }
      }
      pathTex.offset.y -= scroll * dt * 0.05;
      grassTex.offset.y -= scroll * dt * 0.08;

      // Player physics.
      if (playing) {
        G.x = THREE.MathUtils.lerp(G.x, LANES[G.lane], Math.min(1, dt * 12));
        if (G.airborne) {
          G.vy += GRAVITY * dt;
          G.y += G.vy * dt;
          if (G.y <= 0) {
            G.y = 0;
            G.vy = 0;
            G.airborne = false;
            spirit.squash = 1;
            if (G.jumpBuffer > 0) { G.jumpBuffer = 0; jump(); }
          }
        }
        G.jumpBuffer = Math.max(0, G.jumpBuffer - dt);
        if (G.shieldT > 0) {
          G.shieldT -= dt;
          if (G.shieldT <= 0) setShielded(false);
        }
        if (G.roarT > 0) G.roarT -= dt;
      } else if (phaseRef.current === 'over') {
        // Tumble backwards after a crash.
        G.deathT += dt;
        spirit.group.rotation.x = THREE.MathUtils.lerp(spirit.group.rotation.x, -1.1, dt * 5);
        G.y = Math.max(0, G.y - dt * 2);
      }

      const lean = THREE.MathUtils.clamp((LANES[G.lane] - G.x) * 0.6, -1, 1);
      spirit.group.position.set(G.x, G.y, 0);
      updateSpirit(spirit, dt, G.elapsed, {
        running: playing, airborne: G.airborne, vy: G.vy, lean,
        shielded: G.shieldT > 0, dead: phaseRef.current === 'over',
      });
      shadow.position.x = G.x;
      const shrink = 1 / (1 + G.y * 0.35);
      shadow.scale.setScalar(shrink);
      (shadow.material as THREE.MeshBasicMaterial).opacity = 0.32 * shrink;

      // Entities: scroll, animate, collide, recycle.
      for (let i = entities.length - 1; i >= 0; i--) {
        const e = entities[i];
        const o = e.obj;
        o.position.z += scroll * dt;

        if (e.kind === 'acorn') {
          o.rotation.y += dt * 2.5;
          o.position.y = 0.85 + Math.sin(G.elapsed * 3 + e.phase) * 0.18;
        } else if (e.kind === 'umbrella') {
          o.rotation.y += dt * 1.6;
          o.position.y = 1.3 + Math.sin(G.elapsed * 2 + e.phase) * 0.2;
        } else if (e.kind === 'soot') {
          o.position.y = 1.1 + Math.sin(G.elapsed * 2.2 + e.phase) * 0.5;
          o.rotation.z = Math.sin(G.elapsed * 4 + e.phase) * 0.3;
          o.position.x += Math.sin(G.elapsed + e.phase) * dt * 0.6;
        }

        // Roar blows away everything in the lane ahead.
        if (G.roarT > 0 && e.kind === 'obstacle' && !e.taken && o.position.z > SPAWN_Z && o.position.z < 4) {
          e.taken = true;
          burst(o.position.clone().setY(0.9), 8, 1.2);
          G.dist += 12; // roaring past an obstacle still counts as progress
          give(poolKey(e), o);
          entities.splice(i, 1);
          continue;
        }

        // Collisions happen in a thin slab around the spirit at z = 0.
        if (!e.taken && Math.abs(o.position.z) < 1.1 && Math.abs(o.position.x - G.x) < 1.5) {
          if (e.kind === 'acorn') {
            e.taken = true;
            G.acorns += 1;
            G.charge = Math.min(ROAR_COST, G.charge + 1);
            sfx.play('pickup');
            burst(o.position.clone(), 5, 0.7);
            give(poolKey(e), o);
            entities.splice(i, 1);
            continue;
          }
          if (e.kind === 'umbrella') {
            e.taken = true;
            G.shieldT = SHIELD_TIME;
            setShielded(true);
            sfx.play('merge');
            burst(o.position.clone(), 8, 0.9);
            give(poolKey(e), o);
            entities.splice(i, 1);
            continue;
          }
          if (e.kind === 'obstacle' && playing && G.y < e.height) {
            if (G.shieldT > 0) {
              // The umbrella eats one hit and pops.
              G.shieldT = 0;
              setShielded(false);
              sfx.play('crash');
              G.shakeT = 0.25;
              burst(o.position.clone().setY(1), 12, 1.1);
              give(poolKey(e), o);
              entities.splice(i, 1);
              continue;
            }
            die();
          }
        }

        if (o.position.z > DESPAWN_Z) {
          give(poolKey(e), o);
          entities.splice(i, 1);
        }
      }

      // Leaves.
      for (const l of leaves) {
        if (l.life <= 0) continue;
        l.life -= dt;
        l.vel.y += GRAVITY * 0.35 * dt;
        l.mesh.position.addScaledVector(l.vel, dt);
        l.mesh.position.z += scroll * dt;
        l.mesh.rotation.x += dt * 6;
        l.mesh.rotation.y += dt * 4;
        if (l.life <= 0) l.mesh.visible = false;
      }

      // Rain: fall, drift with the world, wrap around the camera.
      const rainFall = 26 + G.speed * 0.4;
      for (let i = 0; i < DROPS; i++) {
        const o = i * 6;
        const fall = rainFall * rainSeed[i] * dt;
        rainPos[o + 1] -= fall;
        rainPos[o + 4] -= fall;
        const drift = scroll * dt * 0.35;
        rainPos[o + 2] += drift;
        rainPos[o + 5] += drift;
        if (rainPos[o + 1] < 0 || rainPos[o + 2] > 14) resetDrop(i, true);
      }
      rainGeo.attributes.position.needsUpdate = true;
      (rain.material as THREE.LineBasicMaterial).opacity = G.roarT > 0 ? 0.75 : 0.4;

      // Roar shockwave + sky flash.
      if (G.waveR > 0) {
        G.waveR += dt * 38;
        wave.position.set(G.x, 0.2, -G.waveR * 0.5);
        wave.scale.setScalar(G.waveR);
        (wave.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.7 - G.waveR * 0.014);
        if (G.waveR > 50) { G.waveR = 0; (wave.material as THREE.MeshBasicMaterial).opacity = 0; }
      }
      const fogTarget = G.roarT > 0 ? FOG_ROAR : FOG_CLEAR;
      (scene.fog as THREE.Fog).color.lerp(fogTarget, dt * 4);

      // Camera: follow the lane, shake on impact.
      G.shakeT = Math.max(0, G.shakeT - dt);
      const shake = G.shakeT * 0.9;
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, G.x * 0.4, dt * 5) + rand(-shake, shake);
      camera.position.y = 3.9 + G.y * 0.18 + rand(-shake, shake);
      camera.lookAt(G.x * 0.35, 1.5 + G.y * 0.35, -4);

      // HUD updates a few times a second — no need to re-render every frame.
      hudAcc += dt;
      if (hudAcc > 0.1) {
        hudAcc = 0;
        if (playing) {
          setScore(scoreOf());
          setAcorns(G.acorns);
          setCharge(G.charge);
        }
      }

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('resize', onResize);
      scene.traverse(o => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach(x => x.dispose());
        else mat?.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chargePct = Math.round((charge / ROAR_COST) * 100);
  const ready = charge >= ROAR_COST;

  return (
    <div
      className="fixed inset-0 select-none"
      style={{ background: 'linear-gradient(#7fa7bd 0%, #a8c3d0 45%, #cfe0dd 100%)', touchAction: 'none' }}
    >
      <div ref={mountRef} className="absolute inset-0" />

      {/* HUD */}
      <div className="absolute top-4 left-0 right-0 flex justify-center items-center gap-3 pointer-events-none font-mono">
        <div className="bg-slate-900/70 border border-slate-700 rounded-lg px-4 py-1.5 text-center backdrop-blur-sm">
          <div className="text-[10px] uppercase text-slate-400">Score</div>
          <div className="text-lg font-bold text-emerald-300" data-testid="score">{score}</div>
        </div>
        <div className="bg-slate-900/70 border border-slate-700 rounded-lg px-4 py-1.5 text-center backdrop-blur-sm">
          <div className="text-[10px] uppercase text-slate-400">Acorns</div>
          <div className="text-lg font-bold text-amber-300" data-testid="acorns">🌰 {acorns}</div>
        </div>
        <div className="bg-slate-900/70 border border-slate-700 rounded-lg px-4 py-1.5 text-center backdrop-blur-sm">
          <div className="text-[10px] uppercase text-slate-400">Best</div>
          <div className="text-lg font-bold text-sky-200">{best}</div>
        </div>
        <SoundToggle />
      </div>

      {/* Roar meter */}
      {phase === 'playing' && (
        <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-2">
          <div className="w-44 h-2.5 rounded-full bg-slate-900/60 border border-slate-700 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-lime-300 transition-[width] duration-200"
              style={{ width: `${chargePct}%` }}
            />
          </div>
          <button
            data-testid="roar-button"
            disabled={!ready}
            onPointerDown={e => { e.stopPropagation(); api.current.roar(); }}
            onPointerUp={e => e.stopPropagation()}
            className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors pointer-events-auto border ${
              ready
                ? 'bg-emerald-600/90 border-emerald-300 text-white animate-pulse'
                : 'bg-slate-900/50 border-slate-700 text-slate-500'
            }`}
          >
            {ready ? '🌀 Roar!' : `Roar ${charge}/${ROAR_COST}`}
          </button>
          {shielded && <div className="text-xs font-bold text-emerald-200 drop-shadow">☂️ Umbrella up</div>}
        </div>
      )}

      {/* Overlays */}
      {phase !== 'playing' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/45 backdrop-blur-[2px] px-4">
          <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-lime-200 text-center">
            FOREST SPIRIT RUN
          </h1>
          {phase === 'over' ? (
            <div className="text-center flex flex-col items-center gap-3">
              <div>
                <div className="text-xl font-bold text-white mb-1" data-testid="gameover">THE RAIN WINS</div>
                <div className="text-sm text-slate-300">Score {score} · 🌰 {acorns} · Best {best}</div>
              </div>
              <ShareButton text={`My forest spirit scored ${score} in the rain 🌧️🌰 Can you beat it?`} />
            </div>
          ) : (
            <p className="text-sm text-slate-100 max-w-xs text-center leading-relaxed">
              Dash down the rainy forest path.<br />
              <span className="text-emerald-300 font-bold">←/→</span> or swipe to switch lanes ·
              <span className="text-emerald-300 font-bold"> Space</span> or tap to jump<br />
              Collect <span className="text-amber-300 font-bold">acorns</span>, grab the
              <span className="text-emerald-300 font-bold"> umbrella</span>, then
              <span className="text-emerald-300 font-bold"> ROAR</span> to blow the path clear.
            </p>
          )}
          <div className="px-6 py-2.5 rounded-xl bg-emerald-600 font-bold text-sm uppercase tracking-wider animate-pulse">
            {phase === 'over' ? 'Tap to retry' : 'Tap to start'}
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-300 uppercase font-bold mt-2">
            <a href="../" className="hover:text-cyan-300 transition-colors pointer-events-auto" onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()}>▶ Chroma Cosmos</a>
            <a href="../astro-merge/" className="hover:text-fuchsia-300 transition-colors pointer-events-auto" onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()}>▶ Astro Merge</a>
            <a href="../orbit-dash/" className="hover:text-amber-300 transition-colors pointer-events-auto" onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()}>▶ Orbit Dash</a>
            <a href="../star-serpent/" className="hover:text-lime-300 transition-colors pointer-events-auto" onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()}>▶ Star Serpent</a>
          </div>
        </div>
      )}
    </div>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element');
ReactDOM.createRoot(rootElement).render(<App />);
