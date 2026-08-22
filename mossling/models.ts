// Procedural, asset-free models for Mossling Wander.
// Everything is built from primitives at runtime — no textures, no GLTF —
// so the whole game still ships as a couple hundred KB of JS.
import * as THREE from 'three';

// --- Cel shading -------------------------------------------------------
// A 4-step gradient ramp gives every surface a flat, storybook look.
const RAMP = new THREE.DataTexture(new Uint8Array([88, 138, 182, 218, 245, 255]), 6, 1, THREE.RedFormat);
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
  rig: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Group;
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
  headLag: number;
}

// Warm taupe rather than leaf green: a green creature standing in green grass
// has no silhouette. The moss stays, as patches on its back.
const FUR = 0xa8926f;
const FUR_SHADE = 0x8a7454;
const MOSS = 0x5d7c46;
const CHEST = 0xe7dcc0;
const DARK = 0x33291d;

export const createMossling = (): Mossling => {
  const group = new THREE.Group();
  const rig = new THREE.Group();      // everything that bobs while walking
  group.add(rig);

  const fur = toon(FUR, { emissive: 0x1a140c });
  const furShade = toon(FUR_SHADE);
  const moss = flat(MOSS);
  const dark = toon(DARK);

  // --- Body ---
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), fur);
  body.scale.set(1, 0.94, 0.94);
  body.position.y = 1.0;
  rig.add(body);

  // Inverted hull: a slightly larger back-facing shell reads as a soft ink
  // line around the silhouette and lifts the character off the background.
  const outlineMat = new THREE.MeshBasicMaterial({ color: 0x2e2418, side: THREE.BackSide });
  const bodyOutline = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), outlineMat);
  bodyOutline.scale.setScalar(1.03);
  body.add(bodyOutline);

  // Darker haunches, so the body has a top and a bottom.
  const haunch = new THREE.Mesh(new THREE.SphereGeometry(0.96, 24, 16), furShade);
  haunch.scale.set(1, 0.6, 0.98);
  haunch.position.y = -0.42;
  body.add(haunch);

  // Cream chest.
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.56, 20, 16), toon(CHEST));
  chest.scale.set(1, 1.15, 0.5);
  chest.position.set(0, -0.16, 0.74);
  body.add(chest);

  // Moss growing across its back, with two little mushrooms.
  const mossBlob = new THREE.IcosahedronGeometry(0.3, 0);
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(mossBlob, moss);
    const a = rand(-1.1, 1.1);
    m.position.set(Math.sin(a) * 0.72, rand(0.05, 0.7), -Math.cos(a) * 0.78);
    m.scale.set(rand(0.7, 1.35), rand(0.32, 0.5), rand(0.7, 1.35));
    body.add(m);
  }
  for (const side of [-1, 1]) {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.26, 8), toon(0xefe6cf));
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xc06a58));
    cap.position.y = 0.13;
    cap.scale.y = 0.85;
    for (let i = 0; i < 3; i++) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), toon(0xf6efe0));
      dot.position.set(rand(-0.09, 0.09), rand(0.02, 0.1), rand(-0.09, 0.09));
      cap.add(dot);
    }
    const shroom = new THREE.Group();
    shroom.add(stem, cap);
    shroom.position.set(side * 0.32, 0.62, -0.6);
    shroom.rotation.set(-0.35, 0, side * 0.25);
    body.add(shroom);
  }

  // --- Head: a separate mass, which is what gives the silhouette a reading ---
  const head = new THREE.Group();
  head.position.set(0, 1.86, 0.06);
  rig.add(head);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.72, 28, 22), fur);
  skull.scale.set(1.06, 0.98, 0.98);
  head.add(skull);
  const headOutline = new THREE.Mesh(new THREE.SphereGeometry(0.72, 22, 16), outlineMat);
  headOutline.scale.setScalar(1.04);
  skull.add(headOutline);

  // Ears: big and rounded, tilted out — the clearest part of the outline.
  const earGeo = new THREE.SphereGeometry(0.3, 18, 14);
  const earL = new THREE.Mesh(earGeo, fur);
  earL.scale.set(1.02, 1.3, 0.44);
  earL.position.set(-0.66, 0.52, -0.04);
  earL.rotation.z = 0.4;
  const innerL = new THREE.Mesh(earGeo, toon(0xcf9d90));
  innerL.scale.set(0.62, 0.78, 0.4);
  innerL.position.z = 0.1;
  earL.add(innerL);
  const earR = earL.clone(true) as THREE.Mesh;
  earR.position.x = 0.62;
  earR.rotation.z = -0.42;
  head.add(earL, earR);

  // Face.
  const eyeGeo = new THREE.SphereGeometry(0.155, 18, 14);
  const eyeL = new THREE.Mesh(eyeGeo, dark);
  eyeL.position.set(-0.26, 0.06, 0.61);
  const glint = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), toon(0xffffff));
  glint.position.set(-0.05, 0.06, 0.12);
  eyeL.add(glint);
  const eyeR = eyeL.clone(true) as THREE.Mesh;
  eyeR.position.x = 0.26;
  head.add(eyeL, eyeR);

  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 14), toon(CHEST));
  muzzle.scale.set(1, 0.7, 0.55);
  muzzle.position.set(0, -0.22, 0.55);
  head.add(muzzle);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), dark);
  nose.position.set(0, -0.14, 0.78);
  head.add(nose);

  for (const side of [-1, 1]) {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), toon(0xd79a8c));
    cheek.scale.set(1, 0.62, 0.22);
    cheek.position.set(side * 0.47, -0.1, 0.48);
    head.add(cheek);
  }

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
  sprout.position.y = 0.6;
  head.add(sprout);

  // --- Limbs ---
  const armGeo = new THREE.CapsuleGeometry(0.17, 0.28, 6, 12);
  const armL = new THREE.Mesh(armGeo, furShade);
  armL.position.set(-0.95, 1.12, 0.1);
  armL.rotation.z = 0.3;
  const armR = armL.clone() as THREE.Mesh;
  armR.position.x = 0.95;
  armR.rotation.z = -0.3;
  rig.add(armL, armR);

  const footGeo = new THREE.SphereGeometry(0.3, 16, 12);
  for (const x of [-0.4, 0.4]) {
    const f = new THREE.Mesh(footGeo, toon(0x6b5a44));
    f.scale.set(1, 0.5, 1.25);
    f.position.set(x, 0.17, 0.16);
    rig.add(f);
  }

  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), toon(CHEST));
  tail.position.set(0, 0.78, -0.95);
  rig.add(tail);

  // Lotus-leaf hat, raised when it rains.
  const hat = createLotusLeaf();
  hat.position.set(0, 2.95, 0);
  hat.visible = false;
  group.add(hat);

  return {
    group, rig, body, head, earL, earR, armL, armR, eyeL, eyeR, sprout, tail, hat,
    blink: 2, step: 0, headLag: 0,
  };
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

// Walk cycle, breathing, ear jiggle, blinking, wind in the sprout, and a
// head that lags a beat behind the body — the follow-through is most of what
// makes it feel alive rather than rigid.
export const updateMossling = (
  m: Mossling,
  dt: number,
  t: number,
  st: { moving: boolean; airborne: boolean; vy: number; turn: number; raining: boolean; napping: boolean; sitting?: boolean },
): void => {
  if (st.napping) {
    m.rig.position.y = THREE.MathUtils.lerp(m.rig.position.y, -0.34, dt * 3);
    m.body.scale.set(1.12, 0.82, 0.98);
    m.head.rotation.x = THREE.MathUtils.lerp(m.head.rotation.x, 0.5, dt * 3);
    m.head.position.y = THREE.MathUtils.lerp(m.head.position.y, 1.6, dt * 3);
    m.earL.rotation.z = THREE.MathUtils.lerp(m.earL.rotation.z, -0.2, dt * 3);
    m.earR.rotation.z = THREE.MathUtils.lerp(m.earR.rotation.z, 0.2, dt * 3);
    m.eyeL.scale.y = m.eyeR.scale.y = 0.12;
    m.armL.rotation.x = m.armR.rotation.x = 0.5;
    m.group.rotation.z = THREE.MathUtils.lerp(m.group.rotation.z, 0.1, dt * 3);
    m.hat.visible = false;
    return;
  }

  if (st.sitting) {
    m.rig.position.y = THREE.MathUtils.lerp(m.rig.position.y, -0.26, dt * 4);
    const breath = Math.sin(t * 1.8) * 0.02;
    m.body.scale.set(1.08, 0.9 + breath, 1.0);
    m.head.position.y = THREE.MathUtils.lerp(m.head.position.y, 1.7, dt * 4);
    m.head.rotation.x = THREE.MathUtils.lerp(m.head.rotation.x, -0.06, dt * 4);
    m.armL.rotation.x = m.armR.rotation.x = THREE.MathUtils.lerp(m.armL.rotation.x, 0.4, dt * 4);
    m.earL.rotation.z = THREE.MathUtils.lerp(m.earL.rotation.z, 0.42, dt * 3);
    m.earR.rotation.z = THREE.MathUtils.lerp(m.earR.rotation.z, -0.42, dt * 3);
    m.sprout.rotation.z = Math.sin(t * 1.4) * 0.2;
    m.group.rotation.z = THREE.MathUtils.lerp(m.group.rotation.z, 0, dt * 4);
    m.blink -= dt;
    m.eyeL.scale.y = m.eyeR.scale.y = m.blink < 0.13 ? 0.12 : 1;
    if (m.blink < 0) m.blink = rand(2.4, 6);
    m.hat.visible = st.raining;
    return;
  }

  m.step += dt * (st.moving && !st.airborne ? 8.5 : 0);
  const breathe = Math.sin(t * 2) * 0.018;
  const bob = st.moving && !st.airborne ? Math.abs(Math.sin(m.step)) * 0.11 : 0;
  const stretch = st.airborne ? THREE.MathUtils.clamp(st.vy * 0.025, -0.1, 0.1) : 0;

  m.rig.position.y = THREE.MathUtils.lerp(m.rig.position.y, bob, dt * 18);
  m.body.scale.set(1 * (1 - stretch + breathe), 0.94 * (1 + stretch + breathe), 0.94 * (1 - stretch));

  // The head trails the bob by a fraction of a beat.
  m.headLag = THREE.MathUtils.lerp(m.headLag, bob, dt * 9);
  m.head.position.y = 1.86 + m.headLag * 0.6;
  m.head.rotation.x = THREE.MathUtils.lerp(m.head.rotation.x, st.airborne ? -0.16 : (m.headLag - bob) * 1.6, dt * 8);
  m.head.rotation.z = THREE.MathUtils.lerp(m.head.rotation.z, -st.turn * 0.18, dt * 7);

  const jiggle = Math.sin(m.step - 0.7) * (st.airborne ? 0.3 : 0.12);
  m.earL.rotation.z = 0.42 + jiggle;
  m.earR.rotation.z = -0.42 - jiggle;

  const swing = st.airborne ? -1.0 : Math.sin(m.step) * 0.5;
  m.armL.rotation.x = swing;
  m.armR.rotation.x = -swing;

  m.sprout.rotation.z = Math.sin(t * 1.7) * 0.16 - st.turn * 0.3;
  m.sprout.rotation.x = Math.cos(t * 1.3) * 0.1;
  m.tail.position.y = 0.78 + bob * 0.3;

  m.blink -= dt;
  m.eyeL.scale.y = m.eyeR.scale.y = m.blink < 0.13 ? 0.12 : 1;
  if (m.blink < 0) m.blink = rand(2.4, 6);

  m.group.rotation.z = THREE.MathUtils.lerp(m.group.rotation.z, -st.turn * 0.2, dt * 8);

  m.hat.visible = st.raining;
  if (st.raining) {
    m.hat.rotation.y += dt * 0.5;
    m.hat.position.y = 2.95 + bob + Math.sin(t * 2.2) * 0.05;
    m.hat.rotation.z = Math.sin(t * 1.1) * 0.06;
  }
};

// --- Scenery -----------------------------------------------------------
export interface TreePalette { trunk: number; leaves: number[]; }

export const createTree = (p: TreePalette, scale = 1): THREE.Group => {
  const g = new THREE.Group();
  const h = rand(3.4, 6.8) * scale;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * scale, 0.38 * scale, h, 8), toon(p.trunk));
  trunk.position.y = h / 2;
  trunk.rotation.z = rand(-0.05, 0.05);
  g.add(trunk);

  // A couple of branches lifting into the canopy.
  for (let i = 0; i < 2; i++) {
    const a = rand(0, Math.PI * 2);
    const branch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055 * scale, 0.1 * scale, h * 0.42, 6), toon(p.trunk));
    branch.position.set(Math.sin(a) * 0.3 * scale, h * 0.72, Math.cos(a) * 0.3 * scale);
    branch.rotation.set(Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5);
    g.add(branch);
  }

  // Canopy: a cluster of blobs, each its own shade, with a darker underside
  // so the crown has some volume instead of reading as one flat mass.
  const canopyGeo = new THREE.IcosahedronGeometry(1, 0);
  const base = new THREE.Color(p.leaves[Math.floor(Math.random() * p.leaves.length)]);
  const crown = h + rand(0.1, 0.5) * scale;
  for (let i = 0; i < 7; i++) {
    const shade = base.clone().offsetHSL(rand(-0.02, 0.02), rand(-0.06, 0.06), rand(-0.09, 0.07));
    const blob = new THREE.Mesh(canopyGeo, flat(shade.getHex()));
    const a = rand(0, Math.PI * 2);
    const r = rand(0, 0.85) * scale;
    blob.position.set(Math.sin(a) * r, crown - rand(0, 1.5) * scale, Math.cos(a) * r);
    blob.scale.setScalar(rand(0.7, 1.45) * scale);
    blob.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
    g.add(blob);
  }
  const under = new THREE.Mesh(canopyGeo, flat(base.clone().offsetHSL(0, 0.02, -0.14).getHex()));
  under.position.y = crown - 1.15 * scale;
  under.scale.set(1.5 * scale, 0.75 * scale, 1.5 * scale);
  g.add(under);
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
  const barkLight = toon(0x7a5b3c);
  const barkDark = toon(0x59422c);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 4.4, 17, 16), barkLight);
  trunk.position.y = 8.5;
  g.add(trunk);

  // Bark ridges: thin slabs running up the trunk so it is not a bare cylinder.
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + rand(-0.08, 0.08);
    const h = rand(9, 16);
    const ridge = new THREE.Mesh(
      new THREE.BoxGeometry(rand(0.3, 0.7), h, 0.42),
      i % 3 === 0 ? barkDark : barkLight,
    );
    const r = 3.1 + (1 - h / 17) * 0.7;
    ridge.position.set(Math.sin(a) * r, h / 2 + rand(0, 1.4), Math.cos(a) * r);
    ridge.rotation.y = -a;
    ridge.rotation.z = rand(-0.03, 0.03);
    g.add(ridge);
  }

  // Moss creeping up from the roots.
  for (let i = 0; i < 12; i++) {
    const a = rand(0, Math.PI * 2);
    const moss = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(0.5, 1.1), 0), flat(0x527f43));
    moss.position.set(Math.sin(a) * 3.6, rand(0.2, 3.4), Math.cos(a) * 3.6);
    moss.scale.set(1, rand(0.5, 1.2), 0.45);
    g.add(moss);
  }

  // Hollow: a dark recess in the trunk facing the path.
  const hollow = new THREE.Mesh(new THREE.SphereGeometry(1.9, 18, 14), toon(0x3a2a1c));
  hollow.scale.set(1, 1.5, 0.7);
  hollow.position.set(0, 3.1, 3.1);
  g.add(hollow);
  // A little straw catching the light inside, so the opening has depth.
  const straw = new THREE.Mesh(new THREE.SphereGeometry(1.25, 14, 10), toon(0x9c7f4d));
  straw.scale.set(1, 0.42, 0.5);
  straw.position.set(0, 1.95, 3.5);
  g.add(straw);
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

  // Hanging vines.
  for (let i = 0; i < 8; i++) {
    const a = rand(0, Math.PI * 2);
    const r = rand(3.5, 6.5);
    const len = rand(2.5, 6);
    const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, len, 5), toon(0x63834a));
    vine.position.set(Math.sin(a) * r, 16.5 - len / 2, Math.cos(a) * r);
    g.add(vine);
    const tuft = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), flat(0x5f9a4c));
    tuft.position.set(vine.position.x, 16.5 - len, vine.position.z);
    tuft.scale.set(1, 0.7, 1);
    g.add(tuft);
  }

  // Canopy: many blobs, shaded from a sunlit crown down to a darker underside.
  const blobGeo = new THREE.IcosahedronGeometry(1, 0);
  const crownBase = new THREE.Color(0x4d8a45);
  for (let i = 0; i < 22; i++) {
    const a = rand(0, Math.PI * 2);
    const r = Math.sqrt(Math.random()) * 7.5;
    const y = rand(15.5, 22.5);
    const lift = (y - 15.5) / 7;
    const shade = crownBase.clone().offsetHSL(rand(-0.02, 0.02), rand(-0.05, 0.05), -0.1 + lift * 0.16);
    const b = new THREE.Mesh(blobGeo, flat(shade.getHex()));
    b.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
    b.scale.setScalar(rand(2.2, 4.6));
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

// Stylised water: fresnel toward the sky colour, drifting ripple bands and
// a glint where the ripples peak. Cheaper than a reflection probe and it
// keeps the painted look.
export const createWaterMaterial = (
  deep = 0x2c5f7d, shallow = 0x63a6bb, opacity = 0.78, shape: 'disc' | 'strip' = 'disc',
): THREE.ShaderMaterial =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(deep) },
      uShallow: { value: new THREE.Color(shallow) },
      uSky: { value: new THREE.Color(0xdceaf0) },
      uOpacity: { value: opacity },
      uTint: { value: new THREE.Color(0xffffff) },
      uStrip: { value: shape === 'strip' ? 1 : 0 },
    },
    vertexShader: `varying vec3 vW; varying vec2 vUvW;
      void main(){
        vUvW = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `uniform float uTime; uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uSky;
      uniform float uOpacity; uniform vec3 uTint; uniform float uStrip;
      varying vec3 vW; varying vec2 vUvW;
      void main(){
        vec3 V = normalize(cameraPosition - vW);
        float fres = pow(1.0 - clamp(V.y, 0.0, 1.0), 3.0);
        // Two slow bands plus a finer one, so highlights are streaks and not
        // round blobs of white.
        float r1 = sin(vW.x * 0.55 + uTime * 0.8) * sin(vW.z * 0.47 - uTime * 0.6);
        float r2 = sin((vW.x + vW.z) * 0.85 - uTime * 1.3);
        float r3 = sin(vW.x * 2.7 - vW.z * 1.9 + uTime * 2.1);
        float ripple = r1 * 0.5 + r2 * 0.25 + r3 * 0.12;
        vec3 col = mix(uDeep, uShallow, clamp(0.45 + ripple * 0.3, 0.0, 1.0));
        col = mix(col, uSky, fres * 0.3);
        col += smoothstep(0.93, 1.0, ripple + 0.42) * 0.16;
        col *= uTint;
        // Feather the waterline so the surface does not end on a hard polygon
        // edge against the bank.
        float edge = uStrip > 0.5
          ? smoothstep(0.0, 0.3, min(vUvW.y, 1.0 - vUvW.y)) *
            smoothstep(0.0, 0.09, min(vUvW.x, 1.0 - vUvW.x))
          : smoothstep(1.0, 0.72, length(vUvW - 0.5) * 2.0);
        gl_FragColor = vec4(col, clamp(uOpacity + fres * 0.18, 0.0, 1.0) * edge);
      }`,
  });

// A single blade of grass: a tapered strip that curves as it rises, with a
// dark-root-to-pale-tip gradient baked in. Cones read as spikes; this reads
// as grass.
export const createBladeGeometry = (
  height = 0.55, width = 0.055, bend = 0.3, segments = 4,
): THREE.BufferGeometry => {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const w = width * Math.pow(1 - t, 0.65) + 0.004;
    const y = height * t;
    const z = bend * t * t;
    positions.push(-w, y, z, w, y, z);
    const shade = 0.86 + t * 0.46;
    for (let k = 0; k < 2; k++) colors.push(shade * 0.93, shade, shade * 0.82);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
};

// Bakes a base-to-tip gradient into a blade so grass is not a flat colour.
export const shadeBlade = (geo: THREE.BufferGeometry, height: number): THREE.BufferGeometry => {
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.clamp(pos.getY(i) / height, 0, 1);
    const v = 0.62 + t * 0.62;
    colors[i * 3] = v;
    colors[i * 3 + 1] = v * 1.02;
    colors[i * 3 + 2] = v * 0.92;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
};

// --- Countryside vignettes ---------------------------------------------
// A stalk of bamboo: segmented culm plus a few leaf sprays near the top.
export const createBamboo = (): THREE.Group => {
  const g = new THREE.Group();
  const h = rand(7, 13);
  const culm = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, h, 7), toon(0x8fae5c));
  culm.position.y = h / 2;
  g.add(culm);
  // Node rings.
  for (let y = 1.2; y < h; y += rand(1.4, 2.2)) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.028, 5, 8), toon(0x6f8f45));
    ring.position.y = y;
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
  }
  const leafGeo = new THREE.SphereGeometry(0.5, 8, 5);
  for (let i = 0; i < 5; i++) {
    const spray = new THREE.Mesh(leafGeo, flat(0x77a84a));
    spray.scale.set(rand(0.8, 1.6), 0.2, rand(0.5, 0.9));
    const a = rand(0, Math.PI * 2);
    spray.position.set(Math.sin(a) * 0.6, h - rand(0.4, 3), Math.cos(a) * 0.6);
    spray.rotation.set(rand(-0.3, 0.3), a, rand(-0.4, 0.4));
    g.add(spray);
  }
  g.rotation.z = rand(-0.06, 0.06);
  return g;
};

// A plank bridge with handrails, for crossing the stream.
export const createBridge = (): THREE.Group => {
  const g = new THREE.Group();
  const wood = toon(0x9c7a4f);
  const dark = toon(0x7a5c39);
  for (let i = 0; i < 9; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.13, 0.52), wood);
    plank.position.set(0, 0.9 + Math.sin((i / 8) * Math.PI) * 0.35, (i - 4) * 0.62);
    g.add(plank);
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.1, 6), dark);
      post.position.set(side * 1.15, 1.3 + Math.sin((i / 4) * Math.PI) * 0.3, (i - 2) * 1.24);
      g.add(post);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 5.6), dark);
    rail.position.set(side * 1.15, 1.95, 0);
    g.add(rail);
  }
  return g;
};

// An old farmhouse with a wooden veranda you can sit on.
export const createFarmhouse = (): THREE.Group => {
  const g = new THREE.Group();
  const wall = toon(0xd8c9a8);
  const beam = toon(0x6b4f36);
  const body = new THREE.Mesh(new THREE.BoxGeometry(7, 3.2, 5.4), wall);
  body.position.y = 1.9;
  g.add(body);

  // Thatched roof: two slabs meeting in a ridge.
  const roofMat = toon(0x8a7448);
  for (const side of [-1, 1]) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.5, 3.9), roofMat);
    slab.position.set(0, 4.5, side * 1.65);
    slab.rotation.x = side * 0.42;
    g.add(slab);
  }
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.42, 0.6), toon(0x6f5c38));
  ridge.position.y = 5.35;
  g.add(ridge);

  // Veranda (engawa) along the front.
  const deck = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.22, 1.6), toon(0xb99a66));
  deck.position.set(0, 0.95, 3.4);
  g.add(deck);
  for (const x of [-3.2, 0, 3.2]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.95, 6), beam);
    leg.position.set(x, 0.47, 4.05);
    g.add(leg);
  }
  // Paper doors.
  for (const x of [-1.7, 0, 1.7]) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.1, 0.1), toon(0xf1ead6));
    door.position.set(x, 2, 2.72);
    g.add(door);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.07, 0.13), beam);
    frame.position.set(x, 2, 2.75);
    g.add(frame);
  }
  // Corner posts.
  for (const [x, z] of [[-3.5, 2.7], [3.5, 2.7], [-3.5, -2.7], [3.5, -2.7]] as const) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.4, 0.28), beam);
    post.position.set(x, 1.9, z);
    g.add(post);
  }
  return g;
};

// Wooden power pole with a couple of crossarms — the shape that says
// "country road" more than any amount of grass.
export const createPowerPole = (): THREE.Group => {
  const g = new THREE.Group();
  const wood = toon(0x8a6f4d);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.19, 8.5, 7), wood);
  pole.position.y = 4.25;
  g.add(pole);
  for (const y of [7.4, 6.6]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 0.12), wood);
    arm.position.y = y;
    g.add(arm);
    for (const x of [-0.75, 0.75]) {
      const insulator = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.18, 6), toon(0xe2e8ea));
      insulator.position.set(x, y + 0.14, 0);
      g.add(insulator);
    }
  }
  return g;
};

// A rainbow that hangs over the valley once the rain has passed.
export const createRainbow = (): THREE.Group => {
  const g = new THREE.Group();
  const bands = [0xff9b8a, 0xffca7a, 0xfff09a, 0x9fe0a0, 0x93c9f0, 0xc0a8ee];
  bands.forEach((color, i) => {
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(74 - i * 2.1, 1.05, 6, 64, Math.PI),
      new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.32, depthWrite: false, fog: false, side: THREE.DoubleSide,
      }),
    );
    band.renderOrder = -1;
    g.add(band);
  });
  g.visible = false;
  return g;
};

// Mossy stone steps climbing the slope — somewhere to go up.
export const createStoneSteps = (count = 7): THREE.Group => {
  const g = new THREE.Group();
  const stone = flat(0x8d9099);
  const moss = flat(0x5f8a4a);
  for (let i = 0; i < count; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, 0.9), stone);
    step.position.set(rand(-0.12, 0.12), i * 0.34, -i * 0.95);
    g.add(step);
    if (Math.random() < 0.6) {
      const patch = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), moss);
      patch.scale.set(rand(0.6, 1.4), 0.25, rand(0.5, 1));
      patch.position.set(rand(-1, 1), i * 0.34 + 0.16, -i * 0.95 + rand(-0.3, 0.3));
      g.add(patch);
    }
  }
  return g;
};
