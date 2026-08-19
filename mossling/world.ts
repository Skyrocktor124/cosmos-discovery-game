// The world of Mossling Wander: rolling terrain, five regions that blend
// into one another, and the landmarks scattered through them.
import * as THREE from 'three';
import {
  createBamboo, createBridge, createBush, createButterfly, createDragonfly, createFarmhouse,
  createFence, createGreatTree, createLantern, createMushroomCluster, createPowerPole, createRock,
  createScarecrow, createStoneSteps, createSteppingStone, createTree,
  flat, makeSway, rand, toon, TreePalette,
} from './models';

export interface Region {
  id: string;
  name: string;
  nameZh: string;
  blurb: string;
  x: number;
  z: number;
  radius: number;
  skyTop: number;
  skyBottom: number;
  fog: number;
  ground: number;
  rain: number;      // 0..1, how hard it rains here
  trees: TreePalette;
  grass: number;     // blade colour
  density: number;   // trees per region
}

export const REGIONS: Region[] = [
  {
    id: 'clearing', name: 'Great Tree Clearing', nameZh: '大树空地',
    blurb: '一棵很老很老的树,树洞里刚好够打个盹。',
    x: 0, z: 55, radius: 62,
    skyTop: 0x5f97c9, skyBottom: 0xcfe6ea, fog: 0xc4dbdd, ground: 0x74a05a, rain: 0,
    trees: { trunk: 0x6d5136, leaves: [0x4d8a45, 0x5f9c4e, 0x3f7a43] }, grass: 0x7bab5e, density: 26,
  },
  {
    id: 'paddy', name: 'Terraced Paddies', nameZh: '稻田梯田',
    blurb: '风一过,整片稻子就像水一样翻过去。',
    x: 0, z: -95, radius: 66,
    skyTop: 0x6aa6d4, skyBottom: 0xf2e3c0, fog: 0xe4dcbb, ground: 0xbfa15c, rain: 0,
    trees: { trunk: 0x7d6142, leaves: [0x7fa851, 0x93b85c] }, grass: 0xd9bf62, density: 10,
  },
  {
    id: 'rain', name: 'Rain Woods', nameZh: '雨林小径',
    blurb: '雨点打在叶子上,像有人在很远的地方弹琴。',
    x: -95, z: -10, radius: 60,
    skyTop: 0x6f8496, skyBottom: 0xb9cbd2, fog: 0xa9bfc6, ground: 0x4f7a48, rain: 1,
    trees: { trunk: 0x5b4535, leaves: [0x2f6b3f, 0x3d7c47, 0x275c39] }, grass: 0x5c8a52, density: 44,
  },
  {
    id: 'creek', name: 'Firefly Hollow', nameZh: '萤火池畔',
    blurb: '天一黑,池子上面就浮起一整片会呼吸的光。',
    x: 95, z: 25, radius: 58,
    skyTop: 0x4d7ab0, skyBottom: 0xd6e7e2, fog: 0xbcd6d6, ground: 0x6a9a68, rain: 0,
    trees: { trunk: 0x66503a, leaves: [0x468a63, 0x57a06f] }, grass: 0x74a878, density: 22,
  },
  {
    id: 'bamboo', name: 'Bamboo Grove', nameZh: '竹林小径',
    blurb: '风从竹子中间穿过去的时候,整片林子都在轻轻响。',
    x: -70, z: 78, radius: 52,
    skyTop: 0x6f9fbe, skyBottom: 0xdcecd8, fog: 0xc8ddcb, ground: 0x6f8f52, rain: 0.15,
    trees: { trunk: 0x6b5945, leaves: [0x7fa84e, 0x6f9a45] }, grass: 0x86a85e, density: 8,
  },
  {
    id: 'meadow', name: 'Flower Slope', nameZh: '花田山坡',
    blurb: '躺下来的话,能听见蝴蝶翅膀擦过花瓣。',
    x: 70, z: -85, radius: 58,
    skyTop: 0x77aede, skyBottom: 0xfae3ea, fog: 0xe8dbe2, ground: 0x88b060, rain: 0,
    trees: { trunk: 0x7d6142, leaves: [0x86bb5c, 0xa8cc6a] }, grass: 0x93bd68, density: 14,
  },
];

// --- Terrain -----------------------------------------------------------
const POND = { x: 95, z: 25, r: 24, floor: -1.2 };
// A stream runs west out of the pond; the plank bridge crosses it.
const STREAM = { ax: 74, az: 20, bx: 30, bz: 44, width: 3.4, floor: -1.0 };

const distToSegment = (x: number, z: number, ax: number, az: number, bx: number, bz: number): number => {
  const dx = bx - ax;
  const dz = bz - az;
  const t = THREE.MathUtils.clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
  return Math.hypot(x - (ax + dx * t), z - (az + dz * t));
};

const smoothstep = (a: number, b: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export const terrainHeight = (x: number, z: number): number => {
  let h = Math.sin(x * 0.032) * 1.7 + Math.cos(z * 0.026) * 1.5 + Math.sin((x + z) * 0.015) * 1.2;
  // Terraces in the paddy region — shallow steps instead of smooth hills.
  const paddy = 1 - smoothstep(30, 66, Math.hypot(x - 0, z + 95));
  if (paddy > 0) h = THREE.MathUtils.lerp(h, Math.round(h * 1.4) / 1.4 + 0.4, paddy);
  // The hollow that holds the pond.
  const pond = 1 - smoothstep(POND.r * 0.55, POND.r * 1.25, Math.hypot(x - POND.x, z - POND.z));
  h = THREE.MathUtils.lerp(h, POND.floor, pond);
  // The stream channel.
  const stream = 1 - smoothstep(STREAM.width, STREAM.width * 2.6,
    distToSegment(x, z, STREAM.ax, STREAM.az, STREAM.bx, STREAM.bz));
  h = THREE.MathUtils.lerp(h, STREAM.floor, stream * 0.9);
  return h;
};

export const isWater = (x: number, z: number): boolean =>
  (Math.hypot(x - POND.x, z - POND.z) < POND.r * 0.82 && terrainHeight(x, z) < -0.35) ||
  distToSegment(x, z, STREAM.ax, STREAM.az, STREAM.bx, STREAM.bz) < STREAM.width * 0.85;

// Influence of each region at a point, normalised so the weights sum to 1.
export const regionWeights = (x: number, z: number): number[] => {
  const raw = REGIONS.map(r => {
    const d = Math.hypot(x - r.x, z - r.z) / r.radius;
    return Math.exp(-d * d * 1.15);
  });
  const sum = raw.reduce((a, b) => a + b, 0) || 1;
  return raw.map(v => v / sum);
};

export const dominantRegion = (x: number, z: number): Region => {
  const w = regionWeights(x, z);
  let best = 0;
  for (let i = 1; i < w.length; i++) if (w[i] > w[best]) best = i;
  return REGIONS[best];
};

// --- Discoveries -------------------------------------------------------
export interface Discovery {
  id: string;
  icon: string;
  name: string;
  note: string;
  x: number;
  z: number;
  radius: number;
}

export const DISCOVERIES: Discovery[] = [
  { id: 'great-tree', icon: '🌳', name: '老树的树洞', note: '树洞里有干草和一点点阳光。可以在这里睡一觉,醒来天就变了。', x: 0, z: 62, radius: 9 },
  { id: 'swing', icon: '🪢', name: '藤蔓秋千', note: '不知道谁挂上去的,绳子已经被磨得很光滑了。', x: -18, z: 46, radius: 6 },
  { id: 'scarecrow', icon: '🧑‍🌾', name: '稻草人', note: '它站在这里很多年了,帽子歪着,好像在打瞌睡。', x: -14, z: -88, radius: 7 },
  { id: 'dragonflies', icon: '🪰', name: '蜻蜓群', note: '傍晚的稻田上,蜻蜓会一圈一圈地绕着你飞。', x: 16, z: -104, radius: 9 },
  { id: 'puddle', icon: '💧', name: '林间水洼', note: '低头能看见自己,还有一整片被雨打碎的天空。', x: -88, z: 4, radius: 6 },
  { id: 'mushroom-ring', icon: '🍄', name: '蘑菇圈', note: '一圈红伞蘑菇。老人家说,踩进去会被森林记住名字。', x: -104, z: -26, radius: 6 },
  { id: 'stones', icon: '🪨', name: '踏脚石', note: '一块一块跳过去,水面就会跟着晃。', x: 76, z: 12, radius: 8 },
  { id: 'fireflies', icon: '✨', name: '萤火虫', note: '它们只在夜里出来。站着别动,就会有几只停在你头上的芽上。', x: 100, z: 30, radius: 12 },
  { id: 'lantern', icon: '🏮', name: '苔藓石灯', note: '灯里的火不知道是谁点的,但从来没灭过。', x: 112, z: 6, radius: 6 },
  { id: 'butterflies', icon: '🦋', name: '蝴蝶花海', note: '花开得太密了,风一吹分不清哪些是花瓣哪些是翅膀。', x: 70, z: -85, radius: 12 },
  { id: 'bamboo', icon: '🎋', name: '竹林小径', note: '抬头只看得见一条细细的天。风穿过来的时候,竹子会一起点头。', x: -70, z: 78, radius: 14 },
  { id: 'bridge', icon: '🌉', name: '小木桥', note: '桥板被踩得发亮。站在中间往下看,水里有云在走。', x: 52, z: 32, radius: 7 },
  { id: 'farmhouse', icon: '🏡', name: '山边的老房子', note: '没有人在,但廊下扫得很干净。坐一会儿也没关系。', x: 34, z: 66, radius: 10 },
  { id: 'poles', icon: '🪵', name: '田埂上的电线杆', note: '一根接着一根走到很远的地方,电线上停着看不清的小鸟。', x: -34, z: -58, radius: 9 },
  { id: 'steps', icon: '🪜', name: '长苔的石阶', note: '不知道通向哪里,但每一级都有人踩过的凹痕。', x: -84, z: 52, radius: 7 },
];

// --- Seeds & planting spots -------------------------------------------
export interface Spot { id: string; x: number; z: number; }

const seedRing = (region: Region, count: number, radius: number, offset: number): Spot[] =>
  Array.from({ length: count }, (_, i) => {
    const a = offset + (i / count) * Math.PI * 2;
    return {
      id: `${region.id}-seed-${i}`,
      x: region.x + Math.sin(a) * radius * (0.55 + ((i * 37) % 45) / 100),
      z: region.z + Math.cos(a) * radius * (0.55 + ((i * 53) % 45) / 100),
    };
  });

export const SEED_SPOTS: Spot[] = REGIONS.flatMap((r, i) => seedRing(r, 6, r.radius * 0.75, i * 1.1));

export const PLANT_SPOTS: Spot[] = REGIONS.flatMap(r => [
  { id: `${r.id}-plant-0`, x: r.x + 11, z: r.z + 9 },
  { id: `${r.id}-plant-1`, x: r.x - 13, z: r.z - 7 },
]);

// --- World construction ------------------------------------------------
export interface World {
  group: THREE.Group;
  sway: { value: number }[];
  rice: THREE.InstancedMesh | null;
  flowers: THREE.InstancedMesh[];
  bridge: THREE.Group;
  farmhouse: THREE.Group;
  butterflies: THREE.Group[];
  dragonflies: THREE.Group[];
  lanternGlow: THREE.Mesh[];
  pond: THREE.Mesh;
  ripples: THREE.Mesh[];
  swing: THREE.Group;
}

const scatter = (region: Region, count: number, fn: (x: number, z: number) => THREE.Object3D | null, parent: THREE.Group) => {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2);
    const r = Math.sqrt(Math.random()) * region.radius;
    const x = region.x + Math.sin(a) * r;
    const z = region.z + Math.cos(a) * r;
    if (isWater(x, z)) continue;
    const obj = fn(x, z);
    if (!obj) continue;
    obj.position.set(x, terrainHeight(x, z), z);
    parent.add(obj);
  }
};

export const buildWorld = (): World => {
  const group = new THREE.Group();
  const sway: { value: number }[] = [];
  let rice: THREE.InstancedMesh | null = null;

  // --- Ground: one big mesh, vertex-coloured by region weights ---
  const SIZE = 460;
  const SEG = 150;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const regionColors = REGIONS.map(r => new THREE.Color(r.ground));
  const base = new THREE.Color(0x7fa85e);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, terrainHeight(x, z));
    const w = regionWeights(x, z);
    c.copy(base).multiplyScalar(0.25);
    let acc = 0.25;
    for (let k = 0; k < REGIONS.length; k++) {
      c.r += regionColors[k].r * w[k];
      c.g += regionColors[k].g * w[k];
      c.b += regionColors[k].b * w[k];
      acc += w[k];
    }
    c.multiplyScalar(1 / acc);
    // Gentle mottling so the ground is never a flat wash of one colour.
    const mottle = Math.sin(x * 0.9) * Math.cos(z * 0.7) * 0.05 + Math.sin((x + z) * 0.31) * 0.04;
    c.offsetHSL(0, 0, mottle);
    // Wet, darker soil under the pond.
    if (terrainHeight(x, z) < -0.6) c.lerp(new THREE.Color(0x5d7a5a), 0.5);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  group.add(ground);

  // --- Per-region planting ---
  for (const region of REGIONS) {
    scatter(region, region.density, () => createTree(region.trees), group);
    scatter(region, Math.round(region.density * 0.8), () => createBush(region.trees.leaves), group);
    scatter(region, 6, () => createRock(), group);

    // Only the tall rice is placed statically — it defines the paddies from
    // far away. Short grass is a carpet that follows the player (see main).
    if (region.id !== 'paddy') continue;
    const bladeCount = 6000;
    const bladeGeo = new THREE.ConeGeometry(0.05, 1.15, 3);
    bladeGeo.translate(0, 0.58, 0);
    const bladeMat = flat(0xffffff);
    sway.push(makeSway(bladeMat, 0.22));
    const blades = new THREE.InstancedMesh(bladeGeo, bladeMat, bladeCount);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3();
    const p = new THREE.Vector3();
    const tint = new THREE.Color();
    let placed = 0;
    for (let i = 0; i < bladeCount; i++) {
      const a = rand(0, Math.PI * 2);
      const r = Math.sqrt(Math.random()) * region.radius * 1.05;
      const x = region.x + Math.sin(a) * r;
      const z = region.z + Math.cos(a) * r;
      if (isWater(x, z)) continue;
      p.set(x, terrainHeight(x, z) - 0.04, z);
      q.setFromEuler(new THREE.Euler(rand(-0.18, 0.18), rand(0, 6.28), rand(-0.18, 0.18)));
      sc.set(rand(0.7, 1.4), rand(0.6, 1.5), rand(0.7, 1.4));
      blades.setMatrixAt(placed, m.compose(p, q, sc));
      tint.set(region.grass).offsetHSL(rand(-0.03, 0.03), rand(-0.08, 0.08), rand(-0.09, 0.09));
      blades.setColorAt(placed, tint);
      placed++;
    }
    blades.count = placed;
    blades.instanceMatrix.needsUpdate = true;
    if (blades.instanceColor) blades.instanceColor.needsUpdate = true;
    group.add(blades);
    rice = blades;
  }

  // --- Flowers on the slope: a green stem plus a coloured blossom, drawn
  // as two instanced meshes that share the same transforms ---
  const meadow = REGIONS.find(r => r.id === 'meadow')!;
  const FLOWERS = 3000;
  const stemGeo = new THREE.CylinderGeometry(0.022, 0.03, 0.62, 3, 1, true);
  stemGeo.translate(0, 0.31, 0);
  const stemMat = flat(0x6d9a4c);
  sway.push(makeSway(stemMat, 0.16));
  const stems = new THREE.InstancedMesh(stemGeo, stemMat, FLOWERS);

  // Blossom: an octahedron squashed flat — eight triangles per flower, which
  // matters when there are thousands of them.
  const blossomGeo = new THREE.OctahedronGeometry(0.2, 0);
  blossomGeo.scale(1, 0.42, 1);
  blossomGeo.translate(0, 0.66, 0);
  const blossomMat = flat(0xffffff);
  sway.push(makeSway(blossomMat, 0.16));
  const blossoms = new THREE.InstancedMesh(blossomGeo, blossomMat, FLOWERS);

  const palette = [0xf2a6c4, 0xf7d774, 0xd9a8ef, 0xfff1f4, 0xf28b82, 0xa8d5f2];
  const fm = new THREE.Matrix4();
  const fq = new THREE.Quaternion();
  const fs = new THREE.Vector3();
  const fp = new THREE.Vector3();
  // Clump centres: flowers grow in patches, not an even sprinkle.
  const clumps = Array.from({ length: 90 }, () => {
    const a = rand(0, Math.PI * 2);
    const r = Math.sqrt(Math.random()) * meadow.radius;
    return { x: meadow.x + Math.sin(a) * r, z: meadow.z + Math.cos(a) * r };
  });
  for (let i = 0; i < FLOWERS; i++) {
    const clump = clumps[i % clumps.length];
    const a = rand(0, Math.PI * 2);
    const r = Math.sqrt(Math.random()) * 4.5;
    const x = clump.x + Math.sin(a) * r;
    const z = clump.z + Math.cos(a) * r;
    fp.set(x, terrainHeight(x, z), z);
    fq.setFromEuler(new THREE.Euler(rand(-0.15, 0.15), rand(0, 6.28), rand(-0.15, 0.15)));
    fs.setScalar(rand(0.75, 1.35));
    fm.compose(fp, fq, fs);
    stems.setMatrixAt(i, fm);
    blossoms.setMatrixAt(i, fm);
    blossoms.setColorAt(i, new THREE.Color(palette[i % palette.length]));
  }
  stems.instanceMatrix.needsUpdate = true;
  blossoms.instanceMatrix.needsUpdate = true;
  if (blossoms.instanceColor) blossoms.instanceColor.needsUpdate = true;
  group.add(stems, blossoms);

  // --- Landmarks ---
  const place = (obj: THREE.Object3D, x: number, z: number, yOffset = 0) => {
    obj.position.set(x, terrainHeight(x, z) + yOffset, z);
    group.add(obj);
    return obj;
  };

  const greatTree = createGreatTree();
  place(greatTree, 0, 62);

  // Vine swing hanging from a big tree at the edge of the clearing.
  const swing = new THREE.Group();
  const swingTree = createTree(REGIONS[0].trees, 1.6);
  swing.add(swingTree);
  const rope = new THREE.Group();
  for (const x of [-0.5, 0.5]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.4, 5), toon(0x6f8f4a));
    r.position.set(x, 1.7, 0);
    rope.add(r);
  }
  const plank = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.5), toon(0x9c7a4f));
  rope.add(plank);
  rope.position.set(0.4, 5.2, 1.6);
  swing.add(rope);
  swing.userData.rope = rope;
  place(swing, -18, 46);

  place(createScarecrow(), -14, -88);
  for (let i = 0; i < 4; i++) {
    const f = createFence(3);
    f.rotation.y = i * 1.1;
    place(f, -30 + i * 22, -70 - (i % 2) * 14);
  }
  place(createMushroomCluster(), -104, -26);
  for (let i = 0; i < 5; i++) place(createMushroomCluster(), -104 + Math.sin(i * 1.26) * 3.5, -26 + Math.cos(i * 1.26) * 3.5);

  // Forest puddle.
  const puddle = new THREE.Mesh(
    new THREE.CircleGeometry(3.2, 28),
    new THREE.MeshBasicMaterial({ color: 0x9dc4d6, transparent: true, opacity: 0.6 }),
  );
  puddle.rotation.x = -Math.PI / 2;
  place(puddle, -88, 4, 0.08);

  const lantern = createLantern();
  place(lantern, 112, 6);

  // Bamboo grove: dense stalks, thicker toward the middle of the region.
  const bambooRegion = REGIONS.find(r => r.id === 'bamboo')!;
  for (let i = 0; i < 190; i++) {
    const a = rand(0, Math.PI * 2);
    const r = Math.sqrt(Math.random()) * bambooRegion.radius * 0.85;
    const x = bambooRegion.x + Math.sin(a) * r;
    const z = bambooRegion.z + Math.cos(a) * r;
    place(createBamboo(), x, z);
  }
  place(createStoneSteps(9), -84, 52);

  // The stream, the bridge over it, and the farmhouse on the near bank.
  // The plane is laid flat in its own geometry, then yawed to follow the
  // channel — rotating x and z on the mesh would twist it instead.
  const streamAngle = Math.atan2(STREAM.bz - STREAM.az, STREAM.bx - STREAM.ax);
  const streamGeo = new THREE.PlaneGeometry(
    Math.hypot(STREAM.bx - STREAM.ax, STREAM.bz - STREAM.az) + 14, STREAM.width * 2.1, 1, 1);
  streamGeo.rotateX(-Math.PI / 2);
  const stream = new THREE.Mesh(streamGeo, new THREE.MeshLambertMaterial({
    color: 0x6fb0c4, transparent: true, opacity: 0.75,
  }));
  stream.rotation.y = -streamAngle;
  stream.position.set((STREAM.ax + STREAM.bx) / 2, -0.42, (STREAM.az + STREAM.bz) / 2);
  group.add(stream);

  const bridge = createBridge();
  bridge.rotation.y = -streamAngle;
  bridge.position.set(52, -0.75, 32);
  group.add(bridge);

  const farmhouse = createFarmhouse();
  farmhouse.rotation.y = -0.5;
  place(farmhouse, 34, 66);

  // Power poles marching along the paddy edge.
  for (let i = 0; i < 6; i++) place(createPowerPole(), -34 + i * 15, -58 - i * 6);

  // Pond + stepping stones.
  const pond = new THREE.Mesh(
    new THREE.CircleGeometry(POND.r * 0.85, 56),
    new THREE.MeshLambertMaterial({ color: 0x6fb0c4, transparent: true, opacity: 0.78 }),
  );
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(POND.x, -0.45, POND.z);
  group.add(pond);

  const ripples: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.05, 30),
      new THREE.MeshBasicMaterial({ color: 0xdff2f7, transparent: true, opacity: 0, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(POND.x + rand(-12, 12), -0.4, POND.z + rand(-12, 12));
    ring.userData.t = rand(0, 4);
    group.add(ring);
    ripples.push(ring);
  }

  for (let i = 0; i < 9; i++) {
    const stone = createSteppingStone();
    const x = 74 + i * 2.6;
    const z = 12 + Math.sin(i * 0.8) * 3.5;
    stone.position.set(x, Math.max(terrainHeight(x, z), -0.55) + 0.25, z);
    group.add(stone);
  }

  // --- Small living things ---
  const butterflies: THREE.Group[] = [];
  const wingColors = [0xf2a6c4, 0xf7d774, 0xd9a8ef, 0xf6a35c];
  for (let i = 0; i < 16; i++) {
    const b = createButterfly(wingColors[i % wingColors.length]);
    b.userData.home = new THREE.Vector3(meadow.x + rand(-30, 30), 0, meadow.z + rand(-30, 30));
    b.userData.phase = rand(0, 6.28);
    b.userData.radius = rand(2, 7);
    group.add(b);
    butterflies.push(b);
  }

  const dragonflies: THREE.Group[] = [];
  for (let i = 0; i < 10; i++) {
    const d = createDragonfly();
    d.userData.home = new THREE.Vector3(16 + rand(-14, 14), 0, -104 + rand(-14, 14));
    d.userData.phase = rand(0, 6.28);
    d.userData.radius = rand(3, 9);
    group.add(d);
    dragonflies.push(d);
  }

  return {
    group, sway, rice, flowers: [stems, blossoms], bridge, farmhouse, butterflies, dragonflies,
    lanternGlow: [lantern.userData.glow as THREE.Mesh],
    pond, ripples, swing,
  };
};
