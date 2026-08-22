import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import '../index.css';
import './ui.css';
import ShareButton from '../shared/ShareButton';
import { sfx } from '../shared/sfx';
import {
  createBladeGeometry, createGlowTexture, createMossling, createPlantingRing, createRainbow,
  createSeed, createTree, flat, makeSway, Mossling, rand, updateMossling,
} from './models';
import {
  buildWorld, DISCOVERIES, dominantRegion, isWater, PLANT_SPOTS, Region, REGIONS,
  regionWeights, SEED_SPOTS, terrainHeight, trailDistance,
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
// ?hq=1 pins full quality — useful when capturing stills on a machine whose
// frame rate would otherwise trip the degradation watchdog.
const hq = new URLSearchParams(location.search).has('hq');
const WALK_SPEED = 9.5;
const GRAVITY = -30;
const JUMP_V = 10;


// --- Icons -------------------------------------------------------------
// Hairline glyphs drawn inline: emoji render differently on every platform
// and drag the whole interface down with them.
const Icon: React.FC<{ path: React.ReactNode; className?: string }> = ({ path, className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"
    strokeLinecap="round" strokeLinejoin="round" className={className ?? 'w-4 h-4'} aria-hidden="true">
    {path}
  </svg>
);

const SeedIcon = () => <Icon path={<><ellipse cx="12" cy="13.5" rx="5" ry="6.5" /><path d="M12 7V4M9.5 5.5 12 4l2.5 1.5" /></>} />;
const SproutIcon = () => <Icon path={<><path d="M12 20v-7" /><path d="M12 13c0-3 2.2-5 5-5 0 3-2.2 5-5 5Z" /><path d="M12 15c0-2.6-1.9-4.4-4.4-4.4 0 2.6 1.9 4.4 4.4 4.4Z" /></>} />;
const BookIcon = () => <Icon path={<><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H5.5A1.5 1.5 0 0 1 4 15.5Z" /><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h4.5a1.5 1.5 0 0 0 1.5-1.5Z" /></>} />;
const SunIcon = () => <Icon path={<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" /></>} />;
const MoonIcon = () => <Icon path={<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />} />;
const SoundOnIcon = () => <Icon path={<><path d="M4 9.5v5h3.5L12 18V6L7.5 9.5Z" /><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10" /></>} />;
const SoundOffIcon = () => <Icon path={<><path d="M4 9.5v5h3.5L12 18V6L7.5 9.5Z" /><path d="m16 10 4 4M20 10l-4 4" /></>} />;
const JumpIcon = () => <Icon path={<><path d="M12 19V6" /><path d="m7 11 5-5 5 5" /></>} className="w-6 h-6" />;

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
  const [toast, setToast] = useState<{ title: string; note: string } | null>(null);
  const [prompt, setPrompt] = useState<Prompt>(null);
  const [codexOpen, setCodexOpen] = useState(false);
  const [sitting, setSitting] = useState(false);
  const [muted, setMuted] = useState(sfx.isMuted);
  const fadeRef = useRef<HTMLDivElement>(null);

  const startedRef = useRef(false);
  startedRef.current = started;
  const controls = useRef<{ interact: () => void; jump: () => void; sit: () => void }>({
    interact: () => {}, jump: () => {}, sit: () => {},
  });

  const persist = useCallback(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(saved.current)); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // --- Renderer, scene, camera ----------------------------------------
    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Filmic response instead of raw linear output: highlights roll off
    // instead of clipping to white, which is most of the "cheap render" look.
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.32;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xc4dbdd, 72, 190);
    const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 700);

    // Gradient sky dome that follows the camera.
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: new THREE.Color(0x5f97c9) },
        uBottom: { value: new THREE.Color(0xcfe6ea) },
        uSunDir: { value: new THREE.Vector3(0.5, 0.55, 0.35).normalize() },
        uSunColor: { value: new THREE.Color(0xffcf94) },
        uNight: { value: 0 },
      },
      vertexShader: 'varying vec3 vP;\nvoid main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec3 vP;
        uniform vec3 uTop; uniform vec3 uBottom; uniform vec3 uSunColor; uniform vec3 uSunDir;
        uniform float uNight;
        void main(){
          vec3 dir = normalize(vP);
          float h = dir.y * 0.5 + 0.5;
          // Three stops: haze at the horizon, mid band, deeper zenith.
          vec3 mid = mix(uBottom, uTop, 0.55);
          vec3 col = mix(uBottom, mid, smoothstep(0.44, 0.62, h));
          col = mix(col, uTop, smoothstep(0.6, 0.98, h));
          // Warm band along the horizon, strongest on the sun's side.
          vec3 sunFlat = normalize(vec3(uSunDir.x, 0.0, uSunDir.z));
          float toSun = max(dot(normalize(vec3(dir.x, 0.0, dir.z)), sunFlat), 0.0);
          float horizon = 1.0 - smoothstep(0.0, 0.28, abs(dir.y));
          col = mix(col, uSunColor, horizon * pow(toSun, 1.6) * 0.55 * (1.0 - uNight));
          // Broad glow around the sun, plus a tighter core.
          float sd = max(dot(dir, normalize(uSunDir)), 0.0);
          col += uSunColor * pow(sd, 5.0) * 0.4 * (1.0 - uNight);
          col += uSunColor * pow(sd, 90.0) * 1.1 * (1.0 - uNight);
          // Ordered dither breaks up gradient banding on wide skies.
          float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
          gl_FragColor = vec4(col + dither * 0.006, 1.0);
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
    const starMat = new THREE.PointsMaterial({
      color: 0xfff6e0, size: 2.4, sizeAttenuation: false, transparent: true, opacity: 0, fog: false,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Three-light rig: warm key that casts, cool sky fill, cool rim from
    // behind to separate the character from the background.
    const hemi = new THREE.HemisphereLight(0xc2d8ea, 0x8f8552, 1.5);
    scene.add(hemi);

    // Late afternoon: the sun sits low, so everything casts a long shadow and
    // the light rakes across the valley instead of falling flat from above.
    const SUN_OFFSET = new THREE.Vector3(62, 21, 34);
    const sun = new THREE.DirectionalLight(0xffd7a1, 2.7);
    sun.position.copy(SUN_OFFSET);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 220;
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 0.06;
    scene.add(sun);
    scene.add(sun.target);

    // Cool bounce from the opposite side keeps shadowed faces from going muddy.
    const rim = new THREE.DirectionalLight(0x9ec2e0, 0.6);
    rim.position.set(-46, 24, -38);
    scene.add(rim);

    // Drifting clouds, drawn as soft sprites — faceted geometry up there
    // reads as floating rocks.
    const cloudCanvas = document.createElement('canvas');
    cloudCanvas.width = cloudCanvas.height = 256;
    const cc = cloudCanvas.getContext('2d')!;
    for (let i = 0; i < 26; i++) {
      const cx = rand(60, 196);
      const cy = rand(96, 160);
      const cr = rand(24, 62);
      const grad = cc.createRadialGradient(cx, cy, 0, cx, cy, cr);
      grad.addColorStop(0, 'rgba(255,255,255,0.5)');
      grad.addColorStop(0.6, 'rgba(255,255,255,0.22)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      cc.fillStyle = grad;
      cc.beginPath();
      cc.arc(cx, cy, cr, 0, Math.PI * 2);
      cc.fill();
    }
    const cloudTex = new THREE.CanvasTexture(cloudCanvas);
    const cloudMat = new THREE.SpriteMaterial({
      map: cloudTex, transparent: true, opacity: 0.85, depthWrite: false, fog: false,
    });
    const clouds: THREE.Sprite[] = [];
    for (let i = 0; i < 18; i++) {
      const cl = new THREE.Sprite(cloudMat);
      cl.position.set(rand(-240, 240), rand(52, 88), rand(-240, 240));
      const w = rand(50, 110);
      cl.scale.set(w, w * rand(0.3, 0.45), 1);
      scene.add(cl);
      clouds.push(cl);
    }

    // --- World -----------------------------------------------------------
    const world = buildWorld();
    // Props cast and receive; ground receives; vegetation instances only
    // receive, since thousands of shadow casters is where the budget goes.
    world.group.traverse(o => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const isInstanced = (mesh as unknown as THREE.InstancedMesh).isInstancedMesh;
      const mat = mesh.material as THREE.Material & { transparent?: boolean };
      if (mat?.transparent) return;           // water surfaces
      mesh.receiveShadow = true;
      mesh.castShadow = !isInstanced;
    });
    if (world.rice) world.rice.userData.full = world.rice.count;
    for (const f of world.flowers) f.userData.full = f.count;
    scene.add(world.group);

    const mossling: Mossling = createMossling();
    mossling.group.traverse(o => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; }
    });
    scene.add(mossling.group);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.1, 24),
      new THREE.MeshBasicMaterial({ color: 0x24341f, transparent: true, opacity: 0.16 }),
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

    // --- Post-processing --------------------------------------------------
    // Bloom for the fireflies and wet highlights, then a light grade:
    // vignette, a touch of contrast, split-toned shadows and grain.
    const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(
      window.innerWidth, window.innerHeight, { samples: 4, type: THREE.HalfFloatType },
    ));
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight), 0.32, 0.75, 0.82,
    );
    composer.addPass(bloomPass);
    const gradePass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uVignette: { value: 1 },
      },
      vertexShader: 'varying vec2 vUv;\nvoid main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime; uniform float uVignette;
        varying vec2 vUv;
        void main(){
          vec4 c = texture2D(tDiffuse, vUv);
          float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
          c.rgb = mix(vec3(l), c.rgb, 1.06);          // gentle saturation
          c.rgb = (c.rgb - 0.5) * 1.02 + 0.5;          // gentle contrast
          c.rgb += vec3(-0.008, 0.0, 0.016) * (1.0 - l); // cool shadows
          c.rgb += vec3(0.016, 0.008, -0.010) * l;       // warm highlights
          vec2 d = vUv - 0.5;
          float v = smoothstep(1.6, 0.15, dot(d, d) * 2.0);
          c.rgb *= mix(1.0, v, uVignette * 0.35);
          float grain = fract(sin(dot(vUv * (1.0 + uTime), vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
          c.rgb += grain * 0.012;
          gl_FragColor = c;
        }`,
    });
    composer.addPass(gradePass);
    composer.addPass(new OutputPass());

    // --- Grass carpet -----------------------------------------------------
    // Dense short grass is only ever drawn near the player: blades that fall
    // behind are recycled to a fresh spot inside the disc, which keeps the
    // ground lush without paying for a whole valley of instances.
    const GRASS = 14000;
    let GRASS_LIVE = GRASS;
    const GRASS_R = 22;
    const grassGeo = createBladeGeometry(0.4, 0.042, 0.24, 4);
    const grassMat = flat(0xffffff, { vertexColors: true, side: THREE.DoubleSide });
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
      const under = isWater(x, z) || trailDistance(x, z) < 2.6;
      const region = dominantRegion(x, z);
      // Rice stands far taller than pasture grass; same blades, longer scale.
      const tall = region.id === 'paddy' ? 2.5 : 1;
      gp.set(x, terrainHeight(x, z) - 0.04, z);
      gq.setFromEuler(new THREE.Euler(rand(-0.2, 0.2), rand(0, 6.28), rand(-0.2, 0.2)));
      const slim = tall > 1 ? 0.5 : 1;
      gs.set(rand(0.75, 1.25) * slim, under ? 0 : rand(0.55, 1.15) * tall, rand(0.75, 1.25) * slim);
      grass.setMatrixAt(i, gm.compose(gp, gq, gs));
      const patch = Math.sin(x * 0.09) * Math.cos(z * 0.11) * 0.06 + Math.sin((x - z) * 0.05) * 0.04;
      gTint.set(region.grass)
        .offsetHSL(rand(-0.02, 0.02) + patch * 0.15, rand(-0.05, 0.05) + patch, rand(0.02, 0.14) + patch);
      grass.setColorAt(i, gTint);
    };

    // --- Fireflies & pollen ----------------------------------------------
    const glowTex = createGlowTexture();
    const makeMotes = (count: number, size: number, color: number, opacity: number) => {
      const geo = new THREE.BufferGeometry();
      const arr = new Float32Array(count * 3);
      geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      const mat = new THREE.PointsMaterial({
        size, map: glowTex, color, transparent: true, opacity, fog: false,
        depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const pts = new THREE.Points(geo, mat);
      scene.add(pts);
      return { pts, arr, mat };
    };
    const creek = REGIONS.find(r => r.id === 'creek')!;
    const fireflies = makeMotes(160, 0.6, 0xfff3a8, 0);
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

    // --- Rainbow ----------------------------------------------------------
    const rainbow = createRainbow();
    scene.add(rainbow);

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
      sitting: false, sitT: 0, wetness: 0, rainbowT: 0,
      nightT: saved.current.night ? 1 : 0,
      time: 0,
    };
    const keys = new Set<string>();
    const joy = { active: false, id: -1, ox: 0, oy: 0, dx: 0, dy: 0 };
    const drag = { active: false, id: -1, x: 0 };

    let lastGrassX = 0;
    let lastGrassZ = 56;
    for (let i = 0; i < GRASS; i++) placeBlade(i, 0, 56);

    // Keeps the carpet centred on whatever the camera is following. Blades
    // left behind are recycled a few hundred per frame; a big jump (teleport,
    // or the title camera handing over to the player) outruns that budget, so
    // there the whole carpet is reseeded at once.
    const syncGrass = (cx: number, cz: number) => {
      const jumped = Math.hypot(cx - lastGrassX, cz - lastGrassZ) > GRASS_R * 0.5;
      lastGrassX = cx;
      lastGrassZ = cz;
      let recycled = 0;
      for (let i = 0; i < GRASS_LIVE; i++) {
        const dx = grassXZ[i * 2] - cx;
        const dz = grassXZ[i * 2 + 1] - cz;
        if (dx * dx + dz * dz > GRASS_R * GRASS_R) {
          placeBlade(i, cx, cz);
          recycled++;
          if (!jumped && recycled >= 900) break;
        }
      }
      if (recycled > 0) {
        grass.instanceMatrix.needsUpdate = true;
        if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
      }
    };
    grass.instanceMatrix.needsUpdate = true;
    if (grass.instanceColor) grass.instanceColor.needsUpdate = true;

    let currentRegion: Region = dominantRegion(P.x, P.z);
    setRegionName(`${currentRegion.nameZh} · ${currentRegion.name}`);

    const showToast = (title: string, note: string) => {
      setToast({ title, note });
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
      showToast('种子发芽了', '一棵新的小树。它会自己长大,你随时可以回来看它。');
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

    const sit = () => {
      if (!startedRef.current || P.napping) return;
      P.sitting = !P.sitting;
      P.sitT = 0;
      sfx.play('click');
      setSitting(P.sitting);
    };

    const jump = () => {
      if (!startedRef.current || P.airborne || P.napping) return;
      if (P.sitting) { P.sitting = false; setSitting(false); return; }
      P.vy = JUMP_V;
      P.airborne = true;
      sfx.play('blip');
    };
    controls.current = { interact, jump, sit };

    // --- Input ------------------------------------------------------------
    const onKeyDown = (e: KeyboardEvent) => {
      keys.add(e.key.toLowerCase());
      if (e.key === ' ') { e.preventDefault(); jump(); }
      if (e.key.toLowerCase() === 'e' || e.key === 'Enter') { e.preventDefault(); interact(); }
      if (e.key.toLowerCase() === 'c') { e.preventDefault(); sit(); }
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
      composer.setSize(window.innerWidth, window.innerHeight);
      bloomPass.setSize(window.innerWidth, window.innerHeight);
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
    // Measured in seconds of slow rendering, not frames: at 2 fps a frame
    // count threshold would take half a minute to trip.
    let slowTime = 0;
    let quality = 1;
    // Graceful degradation, cheapest-looking losses first.
    let tier = 0;
    const downgrade = () => {
      tier += 1;
      if (tier === 1) {
        bloomPass.enabled = false;
      } else if (tier === 2) {
        sun.shadow.mapSize.set(1024, 1024);
        sun.shadow.map?.dispose();
        sun.shadow.map = null;
      } else if (tier === 3) {
        renderer.shadowMap.enabled = false;
        scene.traverse(o => {
          const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
          if (Array.isArray(m)) m.forEach(x => { x.needsUpdate = true; });
          else if (m) m.needsUpdate = true;
        });
      } else {
        quality /= 2;
        GRASS_LIVE = Math.floor(GRASS * quality);
        grass.count = GRASS_LIVE;
        if (world.rice) world.rice.count = Math.floor((world.rice.userData.full as number) * quality);
        for (const f of world.flowers) f.count = Math.floor((f.userData.full as number) * quality);
        renderer.setPixelRatio(Math.max(0.75, Math.min(2, window.devicePixelRatio || 1) * quality));
        composer.setPixelRatio?.(Math.max(0.75, Math.min(2, window.devicePixelRatio || 1) * quality));
      }
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
      if (P.sitting && mag > 0.15) { P.sitting = false; setSitting(false); }
      P.moving = mag > 0.15 && !P.sitting;
      if (P.sitting) { mx = 0; mz = 0; P.sitT += dt; }
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
      // Aerial perspective at golden hour: haze warms toward the sun and
      // stays cool away from it.
      const GOLD = new THREE.Color(0xf6c98d);
      const COOL = new THREE.Color(0x9fb6c9);
      skyBottom.lerp(GOLD, 0.34);
      skyTop.lerp(COOL, 0.16);
      fogColor.lerp(GOLD, 0.2);
      skyTop.lerp(nightTop, P.nightT);
      skyBottom.lerp(nightBottom, P.nightT);
      fogColor.lerp(nightFog, P.nightT);
      (skyMat.uniforms.uTop.value as THREE.Color).copy(skyTop);
      (skyMat.uniforms.uBottom.value as THREE.Color).copy(skyBottom);
      (scene.fog as THREE.Fog).color.copy(fogColor);
      renderer.setClearColor(fogColor);
      // A 2048 shadow map only looks sharp if its frustum travels with you.
      sun.position.set(P.x + SUN_OFFSET.x, SUN_OFFSET.y, P.z + SUN_OFFSET.z);
      sun.target.position.set(P.x, 0, P.z);
      sun.target.updateMatrixWorld();
      sun.intensity = THREE.MathUtils.lerp(2.7, 0.55, P.nightT);
      sun.color.lerpColors(new THREE.Color(0xffd7a1), new THREE.Color(0x9fb3e0), P.nightT);
      rim.intensity = THREE.MathUtils.lerp(0.6, 0.45, P.nightT);
      hemi.intensity = THREE.MathUtils.lerp(1.5, 0.5, P.nightT);
      renderer.toneMappingExposure = THREE.MathUtils.lerp(1.32, 1.04, P.nightT);
      skyMat.uniforms.uNight.value = P.nightT;
      (skyMat.uniforms.uSunDir.value as THREE.Vector3).copy(SUN_OFFSET).normalize();
      starMat.opacity = P.nightT;
      cloudMat.opacity = THREE.MathUtils.lerp(0.8, 0.12, P.nightT);
      cloudMat.color.copy(skyBottom).lerp(new THREE.Color(0xffffff), 0.55);

      const rainAmount = REGIONS.reduce((acc, r, i) => acc + r.rain * weights[i], 0);
      rainMat.opacity = rainAmount * 0.45;

      // Walking out of the rain into daylight hangs a rainbow over the valley.
      P.wetness = rainAmount > 0.45
        ? Math.min(1, P.wetness + dt * 0.5)
        : Math.max(0, P.wetness - dt * 0.06);
      const wantRainbow = P.wetness > 0.35 && rainAmount < 0.2 && P.nightT < 0.3;
      P.rainbowT = THREE.MathUtils.clamp(P.rainbowT + (wantRainbow ? dt * 0.4 : -dt * 0.5), 0, 1);
      rainbow.visible = P.rainbowT > 0.01;
      if (rainbow.visible) {
        // The arch always stands out ahead of the camera, like the real thing:
        // its plane is square to the view, so it reads as an arc, not an edge.
        rainbow.position.set(P.x + Math.sin(P.camYaw) * 170, 1.5, P.z + Math.cos(P.camYaw) * 170);
        rainbow.rotation.set(0, P.camYaw, 0);
        rainbow.children.forEach(band => {
          ((band as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.3 * P.rainbowT;
        });
      }

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
        raining: rainAmount > 0.35, napping: P.napping, sitting: P.sitting,
      });
      shadow.position.set(P.x, groundY + 0.06, P.z);
      const lift = Math.max(0, P.y - groundY);
      shadow.scale.setScalar(1 / (1 + lift * 0.3));
      (shadow.material as THREE.MeshBasicMaterial).opacity = 0.16 / (1 + lift * 0.5);

      // --- Camera ---
      // On the title screen the camera drifts slowly around the great tree
      // instead of staring at the grass in front of the player.
      if (!startedRef.current) {
        const a = t * 0.04 + 2.4;
        const cx = Math.sin(a) * 30;
        const cz = 56 + Math.cos(a) * 30;
        // Low and close, so the grass and the raking light do the work.
        camera.position.set(cx, terrainHeight(cx, cz) + 5.5, cz);
        // Aim a little off the trunk so the tree sits off-centre rather than
        // squarely behind the title.
        camera.lookAt(-7, 9, 57);
        syncGrass(camera.position.x, camera.position.z);
        for (const u of world.sway) u.value = t;
        grassSway.value = t;
        sky.position.copy(camera.position);
        stars.position.copy(camera.position);
        gradePass.uniforms.uTime.value = t % 100;
        composer.render();
        if (dt > 0.034) slowTime += dt; else slowTime = Math.max(0, slowTime - dt * 2);
        if (slowTime > 1.0 && quality > 0.12 && !hq) { downgrade(); slowTime = 0; }
        return;
      }

      // Yaw eases toward where the mossling is heading, so it feels guided
      // rather than glued; dragging overrides it.
      if (P.moving && !drag.active) {
        let d = P.facing - P.camYaw;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        P.camYaw += d * Math.min(1, dt * 0.9);
      }
      // Sitting eases the camera back and a little lower, like settling in.
      const camDist = P.sitting ? 11 + Math.min(4.5, P.sitT * 1.6) : 11;
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
          showToast(d.name, d.note);
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
      for (const w of world.water) {
        w.uniforms.uTime.value = t;
        (w.uniforms.uSky.value as THREE.Color).copy(skyBottom);
        // Unlit water would stay noon-bright after dark, so tint it by hand.
        (w.uniforms.uTint.value as THREE.Color)
          .setRGB(1, 1, 1)
          .lerp(new THREE.Color(0x3f5f80), P.nightT);
      }

      syncGrass(P.x, P.z);

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
        (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.32 - rt * 0.09) * (1 - P.nightT * 0.55);
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

      if (dt > 0.034) slowTime += dt; else slowTime = Math.max(0, slowTime - dt * 2);
      if (slowTime > 1.0 && quality > 0.12 && !hq) { downgrade(); slowTime = 0; }

      gradePass.uniforms.uTime.value = t % 100;
      composer.render();
    };
    raf = requestAnimationFrame(frame);

    // ?debug=1 exposes state so automated tests can walk around and look.
    if (new URLSearchParams(location.search).has('debug')) {
      (window as unknown as { __mossling?: unknown }).__mossling = {
        P, keys, teleport: (x: number, z: number) => { P.x = x; P.z = z; P.y = terrainHeight(x, z); },
        setNight: (v: boolean) => { saved.current.night = v; setNight(v); },
        grass, world, renderer, scene, getTier: () => tier,
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

  const stat = (icon: React.ReactNode, value: React.ReactNode, label: string, testid?: string) => (
    <div className="flex items-center gap-2 px-3">
      <span className="text-[#c7d6b4]">{icon}</span>
      <span className="ms-serif text-[15px] leading-none text-[#f2f6ea]" data-testid={testid}>{value}</span>
      <span className="ms-sans text-[9px] ms-track uppercase text-[#c7d6b4]/50 hidden sm:inline">{label}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 select-none ms-sans text-[#f2f6ea]"
      style={{ touchAction: 'none', background: '#c4dbdd' }}>
      <div ref={mountRef} className="absolute inset-0" />
      {/* Sleep fade — driven straight from the loop, no re-render per frame. */}
      <div ref={fadeRef} className="absolute inset-0 bg-[#0e1a13] pointer-events-none" style={{ opacity: 0 }} />

      {/* Top bar: one quiet strip rather than a row of boxes */}
      {started && (
        <div className="absolute top-4 left-4 right-4 flex items-start justify-between pointer-events-none ms-fade">
          <div className="ms-panel rounded-full py-2 flex items-center divide-x divide-[#e2f0d6]/12">
            {stat(<SeedIcon />, seeds, '种子', 'seeds')}
            {stat(<SproutIcon />, planted, '种下', 'planted')}
            {stat(night ? <MoonIcon /> : <SunIcon />, night ? '夜' : '昼', '此刻')}
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => { sfx.play('click'); setCodexOpen(o => !o); }}
              data-testid="codex-button"
              title="森林手帐"
              className="ms-panel rounded-full h-10 px-4 flex items-center gap-2 text-[#e6efdc] hover:text-white transition-colors"
            >
              <BookIcon />
              <span className="ms-serif text-[15px] leading-none" data-testid="found">{found.length}<span className="text-[#c7d6b4]/55 text-[12px]">/{total}</span></span>
            </button>
            <button
              onClick={() => setMuted(sfx.toggle())}
              title={muted ? '打开声音' : '静音'}
              data-testid="sound-toggle"
              className="ms-panel rounded-full w-10 h-10 flex items-center justify-center text-[#c7d6b4] hover:text-white transition-colors"
            >
              {muted ? <SoundOffIcon /> : <SoundOnIcon />}
            </button>
          </div>
        </div>
      )}

      {/* Region title */}
      {started && (
        <div key={regionName} className="absolute top-[14%] left-0 right-0 text-center pointer-events-none ms-region">
          <div className="ms-serif text-2xl sm:text-[28px] text-white/95" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.45)' }}
            data-testid="region">
            {regionName.split(' · ')[0]}
          </div>
          <div className="ms-hair w-40 mx-auto my-2" />
          <div className="ms-sans text-[10px] ms-track uppercase text-white/60">
            {regionName.split(' · ')[1]}
          </div>
        </div>
      )}

      {/* Discovery card */}
      {toast && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-[min(92vw,25rem)] pointer-events-none ms-rise">
          <div className="ms-panel rounded-2xl px-6 py-5 text-center">
            <div className="ms-sans text-[9px] ms-track uppercase text-[#c7d6b4]/60">记入手帐</div>
            <div className="ms-serif text-lg mt-2 text-[#f6faf0]" data-testid="toast-title">{toast.title}</div>
            <div className="ms-hair w-24 mx-auto my-3" />
            <div className="text-[13px] leading-relaxed text-[#dfe9d4]/85">{toast.note}</div>
          </div>
        </div>
      )}

      {/* Bottom centre: whatever the moment offers */}
      {started && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
          {sitting && (
            <p className="ms-serif text-[15px] text-white/80 ms-fade text-center px-6"
              style={{ textShadow: '0 2px 16px rgba(0,0,0,0.5)' }}>
              风在竹子和稻子中间来回走。什么都不用做。
            </p>
          )}
          {prompt ? (
            <button
              data-testid="interact"
              onPointerDown={e => e.stopPropagation()}
              onClick={() => controls.current.interact()}
              className="ms-panel rounded-full pl-3 pr-5 py-2.5 flex items-center gap-3 hover:border-[#e2f0d6]/40 transition-colors ms-rise"
              style={{ borderColor: 'rgba(232, 201, 138, 0.45)' }}
            >
              <span className="ms-key">E</span>
              <span className="ms-serif text-[15px] text-[#f6e7c6]">{prompt.label}</span>
            </button>
          ) : (
            <button
              data-testid="sit"
              onPointerDown={e => e.stopPropagation()}
              onClick={() => controls.current.sit()}
              className="ms-panel rounded-full pl-3 pr-5 py-2 flex items-center gap-3 text-[#dfe9d4]/80 hover:text-white transition-colors"
            >
              <span className="ms-key">C</span>
              <span className="ms-serif text-[14px]">{sitting ? '起来走走' : '坐下歇会儿'}</span>
            </button>
          )}
        </div>
      )}

      {/* Touch-only jump */}
      {started && (
        <button
          onPointerDown={e => { e.stopPropagation(); controls.current.jump(); }}
          className="ms-panel absolute bottom-8 right-6 w-14 h-14 rounded-full flex items-center justify-center text-[#dfe9d4] sm:hidden"
          aria-label="跳"
        >
          <JumpIcon />
        </button>
      )}

      {/* Journal */}
      {codexOpen && (
        <div className="absolute inset-0 bg-[#0b1610]/80 backdrop-blur-md overflow-y-auto ms-scroll ms-fade px-5 py-10"
          onClick={() => setCodexOpen(false)}>
          <div className="max-w-xl mx-auto" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-8">
              <h2 className="ms-serif text-3xl text-[#f6faf0]">森林手帐</h2>
              <div className="ms-hair w-32 mx-auto my-4" />
              <p className="ms-sans text-[10px] ms-track uppercase text-[#c7d6b4]/60">
                {found.length} of {total} found
              </p>
            </div>

            <div className="flex flex-col">
              {DISCOVERIES.map((d, i) => {
                const got = found.includes(d.id);
                return (
                  <div key={d.id}
                    className={`py-4 border-t border-[#e2f0d6]/10 flex gap-4 ${got ? '' : 'opacity-35'}`}>
                    <div className="ms-serif text-[13px] text-[#c7d6b4]/60 pt-0.5 w-7 shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div className="min-w-0">
                      <div className={`ms-serif text-[17px] ${got ? 'text-[#f6faf0]' : 'text-[#c7d6b4]'}`}>
                        {got ? d.name : '还没走到'}
                      </div>
                      {got && (
                        <p className="text-[13px] leading-relaxed text-[#dfe9d4]/75 mt-1.5">{d.note}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button onClick={() => setCodexOpen(false)}
              className="mt-8 mx-auto block ms-sans text-[10px] ms-track uppercase text-[#c7d6b4]/70 hover:text-white transition-colors">
              合上手帐
            </button>
          </div>
        </div>
      )}

      {/* Title */}
      {!started && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
          style={{ background: 'radial-gradient(130% 85% at 50% 42%, rgba(10,22,15,0.12) 0%, rgba(8,18,13,0.62) 100%)' }}>
          <div className="ms-rise ms-delay-1">
            <h1 className="ms-serif text-5xl sm:text-6xl tracking-[0.12em] text-[#f6faf0]"
              style={{ textShadow: '0 4px 40px rgba(0,0,0,0.6)' }}>
              苔灵漫游
            </h1>
          </div>
          <div className="ms-hair w-48 my-6 ms-rise ms-delay-2" />
          <p className="ms-sans text-[10px] ms-track uppercase text-[#c7d6b4]/80 ms-rise ms-delay-2">
            Mossling Wander
          </p>

          <p className="ms-serif text-[15px] leading-[2] text-[#e8f0de]/90 max-w-md mt-8 ms-rise ms-delay-3">
            一只背上长着苔藓和小蘑菇的森林精灵,<br />
            住在一片有六种风景的山谷里。<br />
            没有敌人,没有计时,也不会失败。
          </p>

          <button
            data-testid="start"
            onPointerDown={e => e.stopPropagation()}
            onClick={() => { sfx.play('click'); setStarted(true); }}
            className="mt-10 px-10 py-3.5 rounded-full border border-[#e8c98a]/50 text-[#f6e7c6] ms-serif text-[17px] tracking-[0.2em]
              hover:bg-[#e8c98a]/12 hover:border-[#e8c98a]/80 transition-colors ms-rise ms-delay-3"
          >
            出发散步
          </button>

          <div className="mt-10 flex flex-wrap justify-center items-center gap-x-5 gap-y-3 text-[11px] text-[#c7d6b4]/70 ms-rise ms-delay-4">
            <span className="flex items-center gap-1.5"><span className="ms-key">W A S D</span>走路</span>
            <span className="flex items-center gap-1.5"><span className="ms-key">空格</span>跳</span>
            <span className="flex items-center gap-1.5"><span className="ms-key">E</span>互动</span>
            <span className="flex items-center gap-1.5"><span className="ms-key">C</span>坐下</span>
            <span className="flex items-center gap-1.5"><span className="ms-key">拖动</span>转视角</span>
          </div>
          <p className="mt-3 text-[10px] text-[#c7d6b4]/45 ms-rise ms-delay-4">
            手机:左半屏拖动走路,右半屏拖动转视角
          </p>

          {found.length > 0 && (
            <div className="mt-8 ms-rise ms-delay-4">
              <ShareButton text={`我在《苔灵漫游》的山谷里找到了 ${found.length}/${total} 处风景,种下了 ${planted} 棵树`} />
            </div>
          )}

          <div className="absolute bottom-6 left-0 right-0 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[10px] ms-track uppercase text-[#c7d6b4]/35 ms-fade ms-delay-4">
            <a href="../" className="hover:text-[#c7d6b4]/80 transition-colors">Chroma Cosmos</a>
            <a href="../astro-merge/" className="hover:text-[#c7d6b4]/80 transition-colors">Astro Merge</a>
            <a href="../orbit-dash/" className="hover:text-[#c7d6b4]/80 transition-colors">Orbit Dash</a>
            <a href="../star-serpent/" className="hover:text-[#c7d6b4]/80 transition-colors">Star Serpent</a>
          </div>
        </div>
      )}
    </div>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element');
ReactDOM.createRoot(rootElement).render(<App />);
