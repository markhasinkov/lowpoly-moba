import * as THREE from 'three';
import { COLORS, WORLD } from './config.js';

export function createScene() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfe6f0, 110, 230);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.getElementById('game').appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(
    52, window.innerWidth / window.innerHeight, 0.1, 600
  );

  // ---- Lights: warm key sun + cool fill + soft sky/ground bounce ----
  const hemi = new THREE.HemisphereLight(0xbfe0ff, 0x4a6b3a, 0.75);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff0d2, 1.25);
  sun.position.set(48, 86, 36);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 4;
  sun.shadow.bias = -0.0004;
  const d = 95;
  sun.shadow.camera.left = -d; sun.shadow.camera.right = d;
  sun.shadow.camera.top = d; sun.shadow.camera.bottom = -d;
  sun.shadow.camera.far = 280;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x88aaff, 0.35);
  fill.position.set(-50, 40, -30);
  scene.add(fill);

  addSky(scene);
  buildArena(scene);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, renderer, camera };
}

function mat(color, flat = true, rough = 0.85) {
  return new THREE.MeshStandardMaterial({ color, flatShading: flat, roughness: rough, metalness: 0.04 });
}

// ---- Gradient sky dome (vertex-colored, plays nice with color management) ----
function addSky(scene) {
  const geo = new THREE.SphereGeometry(320, 32, 20);
  const top = new THREE.Color(0x2f6ec4);
  const horizon = new THREE.Color(0xd7eef7);
  const colors = [];
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 320;          // -1..1
    const t = THREE.MathUtils.clamp(y * 1.1 + 0.25, 0, 1);
    const c = horizon.clone().lerp(top, t);
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const sky = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }));
  scene.add(sky);
}

function buildArena(scene) {
  const s = WORLD.size;
  const animated = [];

  // ---- Ground: subdivided plane with patchy grass color + flat-shaded facets ----
  const seg = 56;
  const groundGeo = new THREE.PlaneGeometry(s * 1.5, s * 1.5, seg, seg);
  const gpos = groundGeo.attributes.position;
  const cA = new THREE.Color(0x4a7c3f), cB = new THREE.Color(0x36602f), cC = new THREE.Color(0x577f43);
  const gcolors = [];
  for (let i = 0; i < gpos.count; i++) {
    const x = gpos.getX(i), y = gpos.getY(i);
    const n = Math.sin(x * 0.12) * Math.cos(y * 0.11) + Math.sin((x + y) * 0.05) * 0.6 + Math.sin(x * 0.31 + y * 0.27) * 0.3;
    const t = THREE.MathUtils.clamp(n * 0.5 + 0.5, 0, 1);
    const c = (t < 0.5 ? cB.clone().lerp(cA, t * 2) : cA.clone().lerp(cC, (t - 0.5) * 2));
    // gentle micro-displacement away from play area for texture
    const edge = Math.min(1, Math.hypot(x, y) / (s * 0.55));
    gpos.setZ(i, Math.sin(x * 0.25) * Math.cos(y * 0.22) * 0.6 * edge);
    gcolors.push(c.r, c.g, c.b);
  }
  groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(gcolors, 3));
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const angle = Math.atan2(WORLD.direBase.x - WORLD.radiantBase.x, WORLD.direBase.z - WORLD.radiantBase.z);

  // ---- Lane: warm path with soft glowing edge strips ----
  const laneLen = Math.hypot(WORLD.direBase.x - WORLD.radiantBase.x, WORLD.direBase.z - WORLD.radiantBase.z) + 30;
  const lane = new THREE.Mesh(new THREE.PlaneGeometry(15, laneLen),
    new THREE.MeshStandardMaterial({ color: 0xcdb07a, roughness: 0.95, flatShading: true }));
  lane.rotation.x = -Math.PI / 2; lane.position.y = 0.03; lane.rotation.z = -angle;
  lane.receiveShadow = true;
  scene.add(lane);
  for (const off of [-7.8, 7.8]) {
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.7, laneLen),
      new THREE.MeshBasicMaterial({ color: 0xe8d49a, transparent: true, opacity: 0.55 }));
    edge.rotation.x = -Math.PI / 2; edge.rotation.z = -angle; edge.position.y = 0.05;
    edge.position.x = Math.cos(-angle) * off; edge.position.z = -Math.sin(-angle) * off;
    scene.add(edge);
  }

  // ---- Fountain zones ----
  for (const [base, col] of [[WORLD.radiantBase, COLORS.radiant], [WORLD.direBase, COLORS.dire]]) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(WORLD.fountainRadius - 0.7, WORLD.fountainRadius, 48),
      new THREE.MeshBasicMaterial({ color: COLORS.fountain, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
    );
    ring.rotation.x = -Math.PI / 2; ring.position.set(base.x, 0.06, base.z);
    scene.add(ring);
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(WORLD.fountainRadius, 48),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.1 })
    );
    disc.rotation.x = -Math.PI / 2; disc.position.set(base.x, 0.045, base.z);
    scene.add(disc);
  }

  // ---- River: flat-shaded water with animated CPU ripples ----
  const riverGeo = new THREE.PlaneGeometry(s * 1.5, 13, 70, 6);
  const riverBase = riverGeo.attributes.position.array.slice();
  const river = new THREE.Mesh(riverGeo, new THREE.MeshStandardMaterial({
    color: 0x2f78ad, emissive: 0x10334f, emissiveIntensity: 0.5,
    flatShading: true, roughness: 0.25, metalness: 0.35, transparent: true, opacity: 0.9,
  }));
  river.rotation.x = -Math.PI / 2; river.position.y = 0.18; river.rotation.z = angle;
  scene.add(river);
  animated.push({ kind: 'water', geo: riverGeo, base: riverBase });

  // ---- Decorative scatter ----
  const onLane = (x, z) => {
    const ax = WORLD.radiantBase.x, az = WORLD.radiantBase.z;
    const bx = WORLD.direBase.x, bz = WORLD.direBase.z;
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    const px = ax + t * dx, pz = az + t * dz;
    return Math.hypot(x - px, z - pz) < 11;
  };
  const nearBase = (x, z) => Math.hypot(x - WORLD.radiantBase.x, z - WORLD.radiantBase.z) < WORLD.fountainRadius + 4
    || Math.hypot(x - WORLD.direBase.x, z - WORLD.direBase.z) < WORLD.fountainRadius + 4;

  const rng = mulberry32(20260613);
  for (let i = 0; i < 220; i++) {
    const x = (rng() - 0.5) * s * 1.35;
    const z = (rng() - 0.5) * s * 1.35;
    if (onLane(x, z) || nearBase(x, z)) continue;
    const r = rng();
    if (r > 0.55) addTree(scene, x, z, 0.7 + rng() * 1.0, rng);
    else if (r > 0.34) addRock(scene, x, z, 0.5 + rng() * 1.1, rng);
    else if (r > 0.16) addBush(scene, x, z, 0.7 + rng() * 0.7, rng);
    else addFlower(scene, x, z, rng);
  }

  // ---- Fireflies / floating motes for atmosphere ----
  const N = 90;
  const fpos = new Float32Array(N * 3);
  const fbase = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const x = (rng() - 0.5) * s * 1.2;
    const z = (rng() - 0.5) * s * 1.2;
    const y = 2 + rng() * 10;
    fpos[i * 3] = x; fpos[i * 3 + 1] = y; fpos[i * 3 + 2] = z;
    fbase[i * 3] = x; fbase[i * 3 + 1] = y; fbase[i * 3 + 2] = z;
  }
  const fgeo = new THREE.BufferGeometry();
  fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
  const fmat = new THREE.PointsMaterial({
    color: 0xfff2b0, size: 0.7, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, fog: false,
  });
  const fireflies = new THREE.Points(fgeo, fmat);
  scene.add(fireflies);
  animated.push({ kind: 'motes', geo: fgeo, base: fbase, count: N });

  // ---- per-frame animation hook ----
  scene.userData.update = (t) => {
    for (const a of animated) {
      if (a.kind === 'water') {
        const arr = a.geo.attributes.position.array;
        for (let i = 0; i < arr.length; i += 3) {
          const bx = a.base[i], by = a.base[i + 1];
          arr[i + 2] = Math.sin(bx * 0.35 + t * 1.7) * 0.32 + Math.cos(by * 0.7 + t * 1.3) * 0.22;
        }
        a.geo.attributes.position.needsUpdate = true;
        a.geo.computeVertexNormals();
      } else if (a.kind === 'motes') {
        const arr = a.geo.attributes.position.array;
        for (let i = 0; i < a.count; i++) {
          const j = i * 3;
          arr[j] = a.base[j] + Math.sin(t * 0.5 + i) * 1.6;
          arr[j + 1] = a.base[j + 1] + Math.sin(t * 0.9 + i * 1.7) * 0.8;
          arr[j + 2] = a.base[j + 2] + Math.cos(t * 0.4 + i * 0.6) * 1.6;
        }
        a.geo.attributes.position.needsUpdate = true;
      }
    }
  };
}

function addTree(scene, x, z, scale, rng) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 2.6, 6), mat(0x6b4a2b));
  trunk.position.y = 1.3; trunk.castShadow = true; g.add(trunk);

  const leafBase = new THREE.Color().setHSL(0.28 + (rng() - 0.5) * 0.06, 0.5, 0.36 + rng() * 0.08);
  const blobs = [
    { r: 2.2, y: 3.8, c: leafBase },
    { r: 1.7, y: 5.2, c: leafBase.clone().offsetHSL(0, 0, 0.06) },
    { r: 1.2, y: 6.3, c: leafBase.clone().offsetHSL(0, 0, 0.12) },
  ];
  for (const b of blobs) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(b.r, 0), mat(b.c.getHex()));
    leaf.position.y = b.y; leaf.castShadow = true;
    leaf.rotation.set(rng() * 3, rng() * 3, rng() * 3);
    g.add(leaf);
  }
  g.position.set(x, 0, z);
  g.scale.setScalar(scale);
  g.rotation.y = rng() * Math.PI;
  scene.add(g);
}

function addBush(scene, x, z, scale, rng) {
  const g = new THREE.Group();
  const col = new THREE.Color().setHSL(0.27 + (rng() - 0.5) * 0.05, 0.45, 0.34 + rng() * 0.06).getHex();
  for (let i = 0; i < 3; i++) {
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 + rng() * 0.4, 0), mat(col));
    blob.position.set((rng() - 0.5) * 1.4, 0.7 + rng() * 0.3, (rng() - 0.5) * 1.4);
    blob.castShadow = true; g.add(blob);
  }
  g.position.set(x, 0, z); g.scale.setScalar(scale);
  scene.add(g);
}

function addFlower(scene, x, z, rng) {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 4), mat(0x4f8f3a));
  stem.position.y = 0.55; g.add(stem);
  const palette = [0xff6b6b, 0xffd24f, 0xff8ad8, 0x8ab4ff, 0xffffff];
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0),
    new THREE.MeshStandardMaterial({ color: palette[(rng() * palette.length) | 0], flatShading: true, roughness: 0.6, emissive: 0x111111 }));
  head.position.y = 1.15; g.add(head);
  g.position.set(x, 0, z); g.scale.setScalar(0.8 + rng() * 0.8);
  scene.add(g);
}

function addRock(scene, x, z, scale, rng) {
  const tint = new THREE.Color().setHSL(0.62, 0.05, 0.45 + rng() * 0.12).getHex();
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1, 0), mat(tint));
  rock.position.set(x, 0.4 * scale, z);
  rock.scale.set(scale, scale * (0.6 + rng() * 0.6), scale);
  rock.rotation.set(rng(), rng(), rng());
  rock.castShadow = true; rock.receiveShadow = true;
  scene.add(rock);
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
