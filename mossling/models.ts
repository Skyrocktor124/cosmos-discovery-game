// Procedural, asset-free models for Mossling Wander.
// Everything is built from primitives at runtime — no textures, no GLTF —
// so the whole game still ships as a couple hundred KB of JS.
import * as THREE from 'three';

// --- Cel shading -------------------------------------------------------
// A 4-step gradient ramp gives every surface a flat, storybook look.
const RAMP = new THREE.DataTexture(new Uint8Array([95, 155, 210, 255]), 4, 1, THREE.RedFormat);
RAMP.minFilter = THREE.NearestFilter;
RAMP.magFilter = THREE.NearestFilter;
RAMP.needsUpdate = true;

export const toon = (color: number, opts: THREE.MeshToonMaterialParameters = {}) =>
  new THREE.MeshToonMaterial({ color, gradientMap: RAMP, ...opts });

// MeshToonMaterial has no flat shading, so faceted props (rocks, foliage)
// use a Lambert material instead — same painted feel, hard edges.
export const flat = (color: number, opts: THREE.MeshLambertMaterialParameters = {}) =>
  new THREE.MeshLambertMaterial({ color, flatShading: true, ...opts });

export const rand = (a: number, b: number) => a + Math.random() * (b - a);

// Patches a material so instanced foliage bends in the wind. Returns the
// time uniform — the caller ticks it once per frame.
export const makeSway = (mat: THREE.Material, amount = 0.13): { value: number } => {
  const uTime = { value: 0 };
  mat.onBeforeCompile = shader => {
    shader.uniforms.uTime = uTime;
    shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float swayPhase = instanceMatrix[3].x * 0.6 + instanceMatrix[3].z * 0.8;
      #else
        float swayPhase = 0.0;
      #endif
      float swayUp = max(transformed.y, 0.0);
      transformed.x += sin(uTime * 1.5 + swayPhase) * swayUp * ${amount.toFixed(3)};
      transformed.z += cos(uTime * 1.1 + swayPhase) * swayUp * ${(amount * 0.6).toFixed(3)};`,
    );
  };
  mat.needsUpdate = true;
  return uTime;
};

// --- The mossling ------------------------------------------------------
// A round, moss-furred woodland creature: rounded ears, a sprout on its
// head, moss patches and tiny mushrooms growing on its back.
export interface Mossling {
  group: THREE.Group;
  body: THREE.Mesh;
  earL: THREE.Mesh;
  earR: THREE.Mesh;
  armL: THREE.Mesh;
  armR: THREE.Mesh;
  eyeL: THREE.Mesh;
  eyeR: THREE.Mesh;
  sprout: THREE.Group;
  tail: THREE.Mesh;
  hat: THREE.Group;
  blink: number;
  step: number;
}

const FUR = 0x7d9a5e;
const FUR_DARK = 0x5c7a44;
const CHEST = 0xc8d6a2;

export const createMossling = (): Mossling => {
  const group = new THREE.Group();
  const fur = toon(FUR);
  const moss = flat(FUR_DARK);
  const dark = toon(0x26301c);

  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), fur);
  body.scale.set(1.02, 1.06, 0.96);
  body.position.y = 1.12;
  group.add(body);

  // Softer, smaller chest fur than a full belly plate.
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 16), toon(CHEST));
  chest.scale.set(1, 1.1, 0.5);
  chest.position.set(0, -0.22, 0.72);
  body.add(chest);

  // Moss growing across its back and shoulders.
  const mossBlob = new THREE.IcosahedronGeometry(0.3, 0);
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(mossBlob, moss);
    const a = rand(-0.9, 0.9);
    m.position.set(Math.sin(a) * 0.75, rand(0.1, 0.75), -Math.cos(a) * 0.8);
    m.scale.set(rand(0.7, 1.3), rand(0.35, 0.55), rand(0.7, 1.3));
    body.add(m);
  }

  // Two little mushrooms sprouting from its back.
  for (const side of [-1, 1]) {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.28, 8), toon(0xefe6cf));
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xc9695f));
    cap.position.y = 0.14;
    cap.scale.y = 0.85;
    for (let i = 0; i < 3; i++) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), toon(0xf6efe0));
      dot.position.set(rand(-0.1, 0.1), rand(0.02, 0.11), rand(-0.1, 0.1));
      cap.add(dot);
    }
    const shroom = new THREE.Group();
    shroom.add(stem, cap);
    shroom.position.set(side * 0.34, 0.72, -0.62);
    shroom.rotation.z = side * 0.25;
    shroom.rotation.x = -0.35;
    body.add(shroom);
  }

  // Rounded ears — no cat points.
  const earGeo = new THREE.SphereGeometry(0.27, 16, 12);
  const earL = new THREE.Mesh(earGeo, fur);
  earL.scale.set(1, 1, 0.55);
  earL.position.set(-0.72, 0.62, 0);
  const earR = earL.clone() as THREE.Mesh;
  earR.position.x = 0.72;
  body.add(earL, earR);

  // A sprout on top of its head.
  const sprout = new THREE.Group();
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.4, 6), toon(0x6fa04a));
  stalk.position.y = 0.2;
  sprout.add(stalk);
  for (const side of [-1, 1]) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), toon(0x7fbb4f));
    leaf.scale.set(1, 0.18, 0.6);
    leaf.position.set(side * 0.2, 0.4, 0);
    leaf.rotation.z = side * 0.5;
    sprout.add(leaf);
  }
  sprout.position.y = 0.98;
  body.add(sprout);

  // Big, friendly eyes with a highlight.
  const eyeGeo = new THREE.SphereGeometry(0.2, 18, 14);
  const eyeL = new THREE.Mesh(eyeGeo, dark);
  eyeL.position.set(-0.34, 0.32, 0.74);
  const glint = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), toon(0xffffff));
  glint.position.set(-0.06, 0.07, 0.15);
  eyeL.add(glint);
  const eyeR = eyeL.clone() as THREE.Mesh;
  eyeR.position.x = 0.34;
  body.add(eyeL, eyeR);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), dark);
  nose.position.set(0, 0.09, 0.94);
  body.add(nose);

  // Blush.
  for (const side of [-1, 1]) {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), toon(0xdb9a92));
    cheek.scale.set(1, 0.6, 0.25);
    cheek.position.set(side * 0.6, 0.06, 0.66);
    body.add(cheek);
  }

  const armGeo = new THREE.CapsuleGeometry(0.19, 0.3, 6, 12);
  const armL = new THREE.Mesh(armGeo, fur);
  armL.position.set(-1.0, 1.1, 0.12);
  armL.rotation.z = 0.28;
  const armR = armL.clone() as THREE.Mesh;
  armR.position.x = 1.0;
  armR.rotation.z = -0.28;
  group.add(armL, armR);

  const footGeo = new THREE.SphereGeometry(0.3, 16, 12);
  for (const x of [-0.4, 0.4]) {
    const f = new THREE.Mesh(footGeo, toon(0x4c6438));
    f.scale.set(1, 0.55, 1.3);
    f.position.set(x, 0.18, 0.14);
    group.add(f);
  }

  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), fur);
  tail.position.set(0, 0.72, -0.95);
  group.add(tail);

  // Lotus-leaf hat, raised when it rains.
  const hat = createLotusLeaf();
  hat.position.set(0, 2.55, 0);
  hat.visible = false;
  group.add(hat);

  return { group, body, earL, earR, armL, armR, eyeL, eyeR, sprout, tail, hat, blink: 2, step: 0 };
};

export const createLotusLeaf = (): THREE.Group => {
  const g = new THREE.Group();
  const leaf = new THREE.Mesh(
    new THREE.SphereGeometry(1.05, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2.3),
    toon(0x5fa055, { side: THREE.DoubleSide }),
  );
  leaf.scale.y = 0.38;
  const veinMat = toon(0x4a8544);
  for (let i = 0; i < 7; i++) {
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 1.0), veinMat);
    v.rotation.y = (i / 7) * Math.PI * 2;
    v.position.y = 0.16;
    v.position.x = Math.sin(v.rotation.y) * 0.5;
    v.position.z = Math.cos(v.rotation.y) * 0.5;
    g.add(v);
  }
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.1, 8), toon(0x6b8f4a));
  stem.position.y = -0.5;
  g.add(leaf, stem);
  return g;
};

// Walk cycle, breathing, ear jiggle, blinking, wind in the sprout.
export const updateMossling = (
  m: Mossling,
  dt: number,
  t: number,
  st: { moving: boolean; airborne: boolean; vy: number; turn: number; raining: boolean; napping: boolean },
): void => {
  if (st.napping) {
    // Curled up asleep: slow breathing, ears drooped.
    m.body.scale.set(1.1, 0.9, 1.02);
    m.body.position.y = 0.92 + Math.sin(t * 1.4) * 0.05;
    m.group.rotation.z = THREE.MathUtils.lerp(m.group.rotation.z, 0.12, dt * 3);
    m.earL.rotation.z = THREE.MathUtils.lerp(m.earL.rotation.z, -0.5, dt * 3);
    m.earR.rotation.z = THREE.MathUtils.lerp(m.earR.rotation.z, 0.5, dt * 3);
    m.eyeL.scale.y = m.eyeR.scale.y = 0.12;
    m.armL.rotation.x = m.armR.rotation.x = 0.5;
    m.hat.visible = false;
    return;
  }

  m.step += dt * (st.moving && !st.airborne ? 8.5 : 0);
  const breathe = Math.sin(t * 2) * 0.02;
  const bob = st.moving && !st.airborne ? Math.abs(Math.sin(m.step)) * 0.12 : 0;
  const stretch = st.airborne ? THREE.MathUtils.clamp(st.vy * 0.025, -0.1, 0.1) : 0;

  m.body.scale.set(1.02 * (1 - stretch + breathe), 1.06 * (1 + stretch + breathe), 0.96 * (1 - stretch));
  m.body.position.y = 1.12 + bob;
  m.armL.position.y = m.armR.position.y = 1.1 + bob;

  // Ears lag half a beat behind the bounce.
  const jiggle = Math.sin(m.step - 0.6) * (st.airborne ? 0.35 : 0.14);
  m.earL.rotation.z = jiggle;
  m.earR.rotation.z = -jiggle;

  const swing = st.airborne ? -1.1 : Math.sin(m.step) * 0.55;
  m.armL.rotation.x = swing;
  m.armR.rotation.x = -swing;

  // The sprout always drifts in the breeze.
  m.sprout.rotation.z = Math.sin(t * 1.7) * 0.16 - st.turn * 0.3;
  m.sprout.rotation.x = Math.cos(t * 1.3) * 0.1;
  m.tail.position.y = 0.72 + bob * 0.4;

  m.blink -= dt;
  m.eyeL.scale.y = m.eyeR.scale.y = m.blink < 0.13 ? 0.12 : 1;
  if (m.blink < 0) m.blink = rand(2.4, 6);

  // Lean into turns.
  m.group.rotation.z = THREE.MathUtils.lerp(m.group.rotation.z, -st.turn * 0.22, dt * 8);

  m.hat.visible = st.raining;
  if (st.raining) {
    m.hat.rotation.y += dt * 0.5;
    m.hat.position.y = 2.55 + bob + Math.sin(t * 2.2) * 0.05;
    m.hat.rotation.z = Math.sin(t * 1.1) * 0.06;
  }
};

// --- Scenery -----------------------------------------------------------
export interface TreePalette { trunk: number; leaves: number[]; }

export const createTree = (p: TreePalette, scale = 1): THREE.Group => {
  const g = new THREE.Group();
  const h = rand(3.4, 6.8) * scale;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.36 * scale, h, 7), toon(p.trunk));
  trunk.position.y = h / 2;
  g.add(trunk);
  const canopyGeo = new THREE.IcosahedronGeometry(1, 0);
  const mat = flat(p.leaves[Math.floor(Math.random() * p.leaves.length)]);
  for (let i = 0; i < 3; i++) {
    const blob = new THREE.Mesh(canopyGeo, mat);
    blob.position.set(rand(-0.6, 0.6) * scale, h - 0.3 * scale + i * rand(0.5, 0.9) * scale, rand(-0.6, 0.6) * scale);
    blob.scale.setScalar(rand(0.9, 1.7) * scale * (1 - i * 0.14));
    blob.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
    g.add(blob);
  }
  return g;
};

export const createBush = (leaves: number[]): THREE.Group => {
  const g = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(0.5, 0);
  const mat = flat(leaves[Math.floor(Math.random() * leaves.length)]);
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(geo, mat);
    b.position.set(rand(-0.4, 0.4), rand(0.15, 0.45), rand(-0.4, 0.4));
    b.scale.setScalar(rand(0.6, 1.2));
    g.add(b);
  }
  return g;
};

// The old tree at the heart of the clearing, with a hollow you can nap in.
export const createGreatTree = (): THREE.Group => {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 4.4, 17, 14), toon(0x6d5136));
  trunk.position.y = 8.5;
  g.add(trunk);

  // Hollow: a dark recess in the trunk facing the path.
  const hollow = new THREE.Mesh(new THREE.SphereGeometry(1.9, 18, 14), toon(0x241a12));
  hollow.scale.set(1, 1.5, 0.7);
  hollow.position.set(0, 3.1, 3.1);
  g.add(hollow);
  const rimGeo = new THREE.TorusGeometry(1.85, 0.32, 8, 20);
  const rim = new THREE.Mesh(rimGeo, toon(0x7d6042));
  rim.scale.set(1, 1.5, 1);
  rim.position.set(0, 3.1, 3.3);
  g.add(rim);

  // Buttress roots.
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const root = new THREE.Mesh(new THREE.ConeGeometry(1.1, 4.2, 6), toon(0x6d5136));
    root.position.set(Math.sin(a) * 3.4, 1.6, Math.cos(a) * 3.4);
    root.rotation.set(Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5);
    g.add(root);
  }

  // Canopy.
  const leafMat = flat(0x4d8a45);
  const blobGeo = new THREE.IcosahedronGeometry(1, 0);
  for (let i = 0; i < 12; i++) {
    const b = new THREE.Mesh(blobGeo, leafMat);
    const a = rand(0, Math.PI * 2);
    const r = rand(0, 7);
    b.position.set(Math.sin(a) * r, rand(16, 22), Math.cos(a) * r);
    b.scale.setScalar(rand(2.6, 5));
    b.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
    g.add(b);
  }
  return g;
};

export const createScarecrow = (): THREE.Group => {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 7), toon(0x8a6a44));
  post.position.y = 1.3;
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.8, 6), toon(0x8a6a44));
  bar.rotation.z = Math.PI / 2;
  bar.position.y = 1.9;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), toon(0xd9c489));
  head.position.y = 2.5;
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.34, 12), toon(0xbfa26a));
  hat.position.y = 2.76;
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.12), toon(0x7c93b8));
  cloth.position.y = 1.6;
  for (const x of [-0.11, 0.11]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), toon(0x33302a));
    eye.position.set(x, 2.54, 0.3);
    g.add(eye);
  }
  g.add(post, bar, head, hat, cloth);
  return g;
};

export const createFence = (segments = 4): THREE.Group => {
  const g = new THREE.Group();
  const wood = toon(0x9c7a4f);
  for (let i = 0; i <= segments; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.3, 6), wood);
    post.position.set(i * 2 - segments, 0.65, 0);
    g.add(post);
  }
  for (const y of [0.55, 1.0]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(segments * 2, 0.09, 0.09), wood);
    rail.position.set(0, y, 0);
    g.add(rail);
  }
  return g;
};

export const createSteppingStone = (): THREE.Mesh => {
  const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 0), flat(0x8d9099));
  s.scale.set(rand(0.9, 1.3), 0.4, rand(0.9, 1.3));
  s.rotation.y = rand(0, 3);
  return s;
};

export const createRock = (): THREE.Mesh => {
  const r = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(0.6, 1.4), 0), flat(0x7f8a92));
  r.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
  r.scale.y = rand(0.6, 0.9);
  return r;
};

export const createMushroomCluster = (): THREE.Group => {
  const g = new THREE.Group();
  const caps = [0xc9695f, 0xd8a24e, 0xe0d6c0];
  for (let i = 0; i < 5; i++) {
    const h = rand(0.2, 0.5);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, h, 7), toon(0xefe6cf));
    stem.position.y = h / 2;
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(rand(0.16, 0.3), 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      toon(caps[i % caps.length]),
    );
    cap.position.y = h;
    cap.scale.y = 0.8;
    const one = new THREE.Group();
    one.add(stem, cap);
    one.position.set(rand(-0.5, 0.5), 0, rand(-0.5, 0.5));
    g.add(one);
  }
  return g;
};

// A seed of light: what the mossling gathers and plants.
export const createSeed = (): THREE.Group => {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), toon(0xf3e08a, { emissive: 0x8a7118 }));
  core.scale.y = 1.3;
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xfff4bd, transparent: true, opacity: 0.22 }),
  );
  g.add(core, halo);
  return g;
};

// The glowing ring that marks somewhere a seed can be planted.
export const createPlantingRing = (): THREE.Mesh => {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.1, 1.45, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  return ring;
};

export const createButterfly = (color: number): THREE.Group => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.16, 4, 6), toon(0x3b3327));
  const wingGeo = new THREE.CircleGeometry(0.22, 12);
  const mat = toon(color, { side: THREE.DoubleSide });
  const wl = new THREE.Mesh(wingGeo, mat);
  const wr = new THREE.Mesh(wingGeo, mat);
  wl.position.set(-0.14, 0.05, 0);
  wr.position.set(0.14, 0.05, 0);
  wl.scale.set(0.9, 0.6, 1);
  wr.scale.set(0.9, 0.6, 1);
  wl.rotation.z = 0.35;
  wr.rotation.z = -0.35;
  g.add(body, wl, wr);
  g.userData.wings = [wl, wr];
  return g;
};

export const createDragonfly = (): THREE.Group => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.5, 4, 6), toon(0x5b8fb0));
  body.rotation.x = Math.PI / 2;
  const wingGeo = new THREE.CircleGeometry(0.3, 10);
  const mat = new THREE.MeshBasicMaterial({ color: 0xdfeffa, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
  const wings: THREE.Mesh[] = [];
  for (const [x, z] of [[-1, 0.1], [1, 0.1], [-1, -0.15], [1, -0.15]] as const) {
    const w = new THREE.Mesh(wingGeo, mat);
    w.scale.set(1, 0.35, 1);
    w.position.set(x * 0.28, 0.02, z);
    w.rotation.x = -Math.PI / 2;
    wings.push(w);
    g.add(w);
  }
  g.add(body);
  g.userData.wings = wings;
  return g;
};

// A drifting glow used for fireflies and pollen motes.
export const createGlowTexture = (): THREE.CanvasTexture => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,246,180,0.75)');
  grad.addColorStop(1, 'rgba(255,240,150,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
};

export const createLantern = (): THREE.Group => {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.5, 8), flat(0x8d9099));
  base.position.y = 0.25;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.9, 8), flat(0x8d9099));
  shaft.position.y = 0.9;
  const house = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.7), flat(0x9aa2a8));
  house.position.y = 1.6;
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xffe6a8, transparent: true, opacity: 0.9 }),
  );
  glow.position.y = 1.6;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.72, 0.42, 4), flat(0x7e878d));
  roof.position.y = 2.05;
  roof.rotation.y = Math.PI / 4;
  g.add(base, shaft, house, glow, roof);
  g.userData.glow = glow;
  return g;
};
