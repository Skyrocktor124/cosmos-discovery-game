// Procedural, asset-free models for Forest Spirit Run.
// Every mesh is built from primitives at runtime — no textures to download,
// no GLTF files, so the whole game still ships as a few KB of JS.
import * as THREE from 'three';

// --- Cel-shading helper ------------------------------------------------
// A 4-step gradient ramp gives every material a flat, hand-painted look
// instead of the default smooth photographic falloff.
const RAMP = new THREE.DataTexture(new Uint8Array([90, 150, 205, 255]), 4, 1, THREE.RedFormat);
RAMP.minFilter = THREE.NearestFilter;
RAMP.magFilter = THREE.NearestFilter;
RAMP.needsUpdate = true;

export const toon = (color: number, opts: THREE.MeshToonMaterialParameters = {}) =>
  new THREE.MeshToonMaterial({ color, gradientMap: RAMP, ...opts });

// MeshToonMaterial has no flat shading, so faceted props (foliage, rocks,
// soot balls) use a Lambert material instead — same painted feel, hard edges.
export const flat = (color: number) => new THREE.MeshLambertMaterial({ color, flatShading: true });

const rand = (a: number, b: number) => a + Math.random() * (b - a);

// --- The forest spirit -------------------------------------------------
export interface Spirit {
  group: THREE.Group;
  body: THREE.Mesh;
  earL: THREE.Mesh;
  earR: THREE.Mesh;
  armL: THREE.Mesh;
  armR: THREE.Mesh;
  eyeL: THREE.Mesh;
  eyeR: THREE.Mesh;
  tail: THREE.Mesh;
  umbrella: THREE.Group;
  blink: number;
  squash: number; // >0 right after a landing
}

export const createSpirit = (): Spirit => {
  const group = new THREE.Group();

  const fur = toon(0x8d94a3);
  const cream = toon(0xeee6d4);
  const dark = toon(0x2f3440);

  // Torso — the classic pear-shaped fluff ball.
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), fur);
  body.scale.set(1.02, 1.12, 0.94);
  body.position.y = 1.15;
  group.add(body);

  // Cream belly plate, sunk slightly into the torso.
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.66, 24, 18), cream);
  belly.scale.set(1, 1.18, 0.62);
  belly.position.set(0, -0.28, 0.62);
  body.add(belly);

  // Row of chevron markings across the chest.
  const chevron = new THREE.ConeGeometry(0.13, 0.2, 3);
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(chevron, toon(0x5a6070));
    m.position.set((i - 1) * 0.3, -0.18 - Math.abs(i - 1) * 0.06, 0.94);
    m.rotation.set(Math.PI / 2, 0, Math.PI);
    body.add(m);
  }

  // Ears.
  const earGeo = new THREE.ConeGeometry(0.17, 0.52, 12);
  const earL = new THREE.Mesh(earGeo, fur);
  earL.position.set(-0.42, 0.92, 0);
  earL.rotation.z = 0.3;
  const earR = earL.clone() as THREE.Mesh;
  earR.position.x = 0.42;
  earR.rotation.z = -0.3;
  body.add(earL, earR);

  // Eyes with pupils.
  const eyeGeo = new THREE.SphereGeometry(0.15, 16, 12);
  const pupilGeo = new THREE.SphereGeometry(0.075, 12, 10);
  const eyeL = new THREE.Mesh(eyeGeo, cream);
  eyeL.position.set(-0.33, 0.6, 0.78);
  const eyeR = eyeL.clone() as THREE.Mesh;
  eyeR.position.x = 0.31;
  const pupilL = new THREE.Mesh(pupilGeo, dark);
  pupilL.position.z = 0.1;
  eyeL.add(pupilL);
  eyeR.add(pupilL.clone());
  body.add(eyeL, eyeR);

  // Nose + whiskers.
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), dark);
  nose.position.set(0, 0.38, 0.9);
  body.add(nose);

  const whiskerGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.72, 5);
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 3; i++) {
      const w = new THREE.Mesh(whiskerGeo, cream);
      w.position.set(side * 0.5, 0.34 + i * 0.11, 0.7);
      w.rotation.z = side * (Math.PI / 2 - 0.25 + i * 0.18);
      body.add(w);
    }
  }

  // Arms and feet.
  const armGeo = new THREE.CapsuleGeometry(0.2, 0.34, 6, 12);
  const armL = new THREE.Mesh(armGeo, fur);
  armL.position.set(-1.03, 1.15, 0.14);
  armL.rotation.z = 0.25;
  const armR = armL.clone() as THREE.Mesh;
  armR.position.x = 1.03;
  armR.rotation.z = -0.25;
  group.add(armL, armR);

  const footGeo = new THREE.SphereGeometry(0.3, 16, 12);
  for (const x of [-0.42, 0.42]) {
    const f = new THREE.Mesh(footGeo, dark);
    f.scale.set(1, 0.6, 1.35);
    f.position.set(x, 0.2, 0.16);
    group.add(f);
  }

  // Tail.
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.6, 10), fur);
  tail.position.set(0, 0.85, -0.95);
  tail.rotation.x = 1.9;
  group.add(tail);

  // Leaf umbrella — only visible while shielded.
  const umbrella = createUmbrella();
  umbrella.position.set(0, 3.15, 0);
  umbrella.visible = false;
  group.add(umbrella);

  return { group, body, earL, earR, armL, armR, eyeL, eyeR, tail, umbrella, blink: 2, squash: 0 };
};

export const createUmbrella = (): THREE.Group => {
  const g = new THREE.Group();
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.72, 8), toon(0x4f8a58, { side: THREE.DoubleSide }));
  canopy.position.y = 0.5;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.93, 0.04, 6, 8), toon(0x35633c));
  rim.position.y = 0.16;
  rim.rotation.x = Math.PI / 2;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 8), toon(0x8a6a44));
  handle.position.y = -0.45;
  g.add(canopy, rim, handle);
  return g;
};

// Animates the spirit: hop cycle, ear wiggle, arm swing, blinking, lean.
export const updateSpirit = (
  s: Spirit,
  dt: number,
  t: number,
  st: { running: boolean; airborne: boolean; vy: number; lean: number; shielded: boolean; dead: boolean },
): void => {
  const gait = st.running && !st.airborne ? t * 11 : t * 3;

  // Hop cycle + landing squash.
  s.squash = Math.max(0, s.squash - dt * 5);
  const stretch = st.airborne ? THREE.MathUtils.clamp(st.vy * 0.03, -0.12, 0.12) : 0;
  const squash = s.squash * 0.22;
  s.body.scale.set(
    1.02 * (1 - stretch + squash),
    1.12 * (1 + stretch - squash),
    0.94 * (1 - stretch + squash),
  );
  s.body.position.y = 1.15 + (st.running && !st.airborne ? Math.abs(Math.sin(gait)) * 0.1 : 0);

  // Ears flap against the run, extra flutter in the air.
  const flap = st.airborne ? 0.5 : 0.16;
  s.earL.rotation.z = 0.3 + Math.sin(gait * 0.9) * flap;
  s.earR.rotation.z = -0.3 - Math.sin(gait * 0.9 + 0.4) * flap;

  // Arms: swing while running, thrown up mid-jump.
  const swing = st.airborne ? -1.3 : Math.sin(gait) * 0.7;
  s.armL.rotation.x = swing;
  s.armR.rotation.x = st.airborne ? -1.3 : -swing;
  s.armL.position.y = s.armR.position.y = s.body.position.y;

  // Tail counter-sway.
  s.tail.rotation.z = Math.sin(gait * 0.5) * 0.25;

  // Blink.
  s.blink -= dt;
  const lidding = s.blink < 0.12 ? 0.12 : 1;
  s.eyeL.scale.y = s.eyeR.scale.y = st.dead ? 0.12 : lidding;
  if (s.blink < 0) s.blink = rand(2.2, 5);

  // Body lean into lane changes.
  s.group.rotation.z = THREE.MathUtils.lerp(s.group.rotation.z, -st.lean * 0.3, dt * 10);
  s.group.rotation.y = THREE.MathUtils.lerp(s.group.rotation.y, st.lean * 0.35, dt * 10);

  // Umbrella hovers and spins while the shield is up.
  s.umbrella.visible = st.shielded;
  if (st.shielded) {
    s.umbrella.rotation.y += dt * 2.2;
    s.umbrella.position.y = 3.15 + Math.sin(t * 3) * 0.08;
  }
};

// --- Scenery -----------------------------------------------------------
const TRUNK = toon(0x6b4f3a);
const LEAF_COLORS = [0x3f7a43, 0x4c8f4a, 0x2f6b3f, 0x62a355];

export const createTree = (): THREE.Group => {
  const g = new THREE.Group();
  const h = rand(3.2, 6.5);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.34, h, 7), TRUNK);
  trunk.position.y = h / 2;
  g.add(trunk);
  const canopyGeo = new THREE.IcosahedronGeometry(1, 0);
  const mat = flat(LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)]);
  for (let i = 0; i < 3; i++) {
    const blob = new THREE.Mesh(canopyGeo, mat);
    blob.position.set(rand(-0.6, 0.6), h - 0.3 + i * rand(0.5, 0.9), rand(-0.6, 0.6));
    blob.scale.setScalar(rand(0.9, 1.7) * (1 - i * 0.15));
    blob.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
    g.add(blob);
  }
  return g;
};

export const createBush = (): THREE.Group => {
  const g = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(0.5, 0);
  const mat = flat(LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)]);
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(geo, mat);
    b.position.set(rand(-0.4, 0.4), rand(0.15, 0.45), rand(-0.4, 0.4));
    b.scale.setScalar(rand(0.6, 1.2));
    g.add(b);
  }
  return g;
};

// --- Gameplay props ----------------------------------------------------
export const createAcorn = (): THREE.Group => {
  const g = new THREE.Group();
  const nut = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 14), toon(0xd9a441, { emissive: 0x4a2f00 }));
  nut.scale.y = 1.25;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x7a4f2a));
  cap.position.y = 0.16;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.16, 6), toon(0x5c3a1e));
  stem.position.y = 0.34;
  g.add(nut, cap, stem);
  return g;
};

export type ObstacleKind = 'stump' | 'rock' | 'log';

export const createObstacle = (kind: ObstacleKind): THREE.Group => {
  const g = new THREE.Group();
  if (kind === 'stump') {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 1.1, 10), TRUNK);
    body.position.y = 0.55;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 10), toon(0xa07d55));
    top.position.y = 1.12;
    const moss = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), flat(0x4c8f4a));
    moss.position.set(0.3, 1.05, 0.2);
    moss.scale.set(1, 0.4, 1);
    g.add(body, top, moss);
  } else if (kind === 'rock') {
    const r = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 0), flat(0x7c8794));
    r.position.y = 0.55;
    r.scale.set(1.1, 0.9, 1);
    r.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
    g.add(r);
  } else {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 2.1, 10), TRUNK);
    l.rotation.z = Math.PI / 2;
    l.position.y = 0.45;
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.8, 6), TRUNK);
    branch.position.set(0.3, 0.85, 0);
    branch.rotation.z = 0.7;
    g.add(l, branch);
  }
  return g;
};

// Little soot-ball wanderers that drift through the forest as set dressing.
export const createSootSprite = (): THREE.Group => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), flat(0x1b1b22));
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), toon(0xffffff));
  eye.position.set(-0.09, 0.06, 0.19);
  const eye2 = eye.clone() as THREE.Mesh;
  eye2.position.x = 0.09;
  g.add(body, eye, eye2);
  // Spiky fuzz.
  const spike = new THREE.ConeGeometry(0.03, 0.14, 4);
  const spikeMat = toon(0x1b1b22);
  for (let i = 0; i < 10; i++) {
    const s = new THREE.Mesh(spike, spikeMat);
    const a = (i / 10) * Math.PI * 2;
    s.position.set(Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0);
    s.rotation.z = a - Math.PI / 2;
    g.add(s);
  }
  return g;
};
