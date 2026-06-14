import * as THREE from 'three';
import { WORLD } from './config.js';
import { natureAssets } from './assets.js';

let zoneGroup = null;
let lights = {};

export function createScene() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x10131c, 90, 200);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.getElementById('game').appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 600);

  const hemi = new THREE.HemisphereLight(0x9fb4e0, 0x2a2030, 0.7);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(0xdfe6ff, 1.05);
  moon.position.set(40, 80, 30);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.radius = 4; moon.shadow.bias = -0.0004;
  const d = 100;
  moon.shadow.camera.left = -d; moon.shadow.camera.right = d;
  moon.shadow.camera.top = d; moon.shadow.camera.bottom = -d;
  moon.shadow.camera.far = 300;
  scene.add(moon);
  const fill = new THREE.DirectionalLight(0xff8a5c, 0.3);
  fill.position.set(-50, 30, -40);
  scene.add(fill);
  lights = { hemi, moon, fill };

  zoneGroup = new THREE.Group();
  scene.add(zoneGroup);

  scene.userData.buildZone = (biome) => buildZone(scene, biome);
  scene.userData.update = (t) => {
    const animated = zoneGroup.userData.animated || [];
    for (const a of animated) {
      if (a.kind === 'motes') {
        const arr = a.geo.attributes.position.array;
        for (let i = 0; i < a.count; i++) {
          const j = i * 3;
          arr[j] = a.base[j] + Math.sin(t * 0.5 + i) * 1.6;
          arr[j + 1] = a.base[j + 1] + Math.sin(t * 0.9 + i * 1.7) * 0.8;
          arr[j + 2] = a.base[j + 2] + Math.cos(t * 0.4 + i * 0.6) * 1.6;
        }
        a.geo.attributes.position.needsUpdate = true;
      } else if (a.kind === 'portal') {
        a.mesh.rotation.z += 0.02;
        a.mesh.material.emissiveIntensity = 1.1 + Math.sin(t * 3) * 0.4;
        if (a.disc) a.disc.material.opacity = 0.3 + Math.sin(t * 2) * 0.12;
      }
    }
  };

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, renderer, camera };
}

function mat(color) {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, metalness: 0.05 });
}

function disposeGroup(g) {
  g.traverse((o) => {
    if (o.geometry) o.geometry.dispose && o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose && m.dispose());
  });
  while (g.children.length) g.remove(g.children[0]);
}

function pick(arr, rng) { return arr[(rng() * arr.length) | 0]; }

// Rebuild the whole playable zone for a biome. Called on every depth change.
function buildZone(scene, biome) {
  disposeGroup(zoneGroup);
  zoneGroup.userData.animated = [];
  const animated = zoneGroup.userData.animated;

  WORLD.radius = biome.radius;
  WORLD.portal = { x: 0, z: -(biome.radius - 12) };

  // lights + fog tint
  scene.fog.color.setHex(biome.fog.color);
  scene.fog.near = biome.fog.near; scene.fog.far = biome.fog.far;
  scene.background = new THREE.Color(biome.skyTop);
  lights.hemi.color.setHex(biome.hemiSky);
  lights.hemi.groundColor.setHex(biome.hemiGround);
  lights.moon.color.setHex(biome.moon);
  lights.fill.color.setHex(biome.fill);

  const span = biome.radius * 2.6;

  // sky dome
  const skyGeo = new THREE.SphereGeometry(320, 32, 18);
  const top = new THREE.Color(biome.skyTop), hor = new THREE.Color(biome.skyHorizon);
  const sc = [];
  const sp = skyGeo.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const y = sp.getY(i) / 320;
    const t = THREE.MathUtils.clamp(y * 1.1 + 0.25, 0, 1);
    const c = hor.clone().lerp(top, t);
    sc.push(c.r, c.g, c.b);
  }
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
  zoneGroup.add(new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })));

  // ground
  const seg = 56;
  const groundGeo = new THREE.PlaneGeometry(span, span, seg, seg);
  const gpos = groundGeo.attributes.position;
  const cA = new THREE.Color(biome.ground[0]), cB = new THREE.Color(biome.ground[1]), cC = new THREE.Color(biome.ground[2]);
  const gcolors = [];
  for (let i = 0; i < gpos.count; i++) {
    const x = gpos.getX(i), y = gpos.getY(i);
    const n = Math.sin(x * 0.12) * Math.cos(y * 0.11) + Math.sin((x + y) * 0.05) * 0.6;
    const t = THREE.MathUtils.clamp(n * 0.5 + 0.5, 0, 1);
    const c = (t < 0.5 ? cB.clone().lerp(cA, t * 2) : cA.clone().lerp(cC, (t - 0.5) * 2));
    gpos.setZ(i, Math.sin(x * 0.25) * Math.cos(y * 0.22) * 0.5);
    gcolors.push(c.r, c.g, c.b);
  }
  groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(gcolors, 3));
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  zoneGroup.add(ground);

  // boundary stones
  const R = biome.radius;
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const rr = R + (Math.random() - 0.5) * 2;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(2 + Math.random() * 2.5, 0), mat(biome.ground[1]));
    rock.position.set(Math.cos(a) * rr, Math.random() * 1.5, Math.sin(a) * rr);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.scale.y = 1.4 + Math.random();
    rock.castShadow = true; rock.receiveShadow = true;
    zoneGroup.add(rock);
  }

  // portal
  const portal = new THREE.Group();
  const torus = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.5, 10, 32),
    new THREE.MeshStandardMaterial({ color: 0x7fd6ff, emissive: 0x39b6ff, emissiveIntensity: 1.4, flatShading: true }));
  torus.position.y = 3.6; portal.add(torus);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(3.0, 24),
    new THREE.MeshBasicMaterial({ color: 0x39b6ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
  disc.position.y = 3.6; portal.add(disc);
  portal.position.set(WORLD.portal.x, 0, WORLD.portal.z);
  zoneGroup.add(portal);
  animated.push({ kind: 'portal', mesh: torus, disc });

  // scatter nature props for the biome
  const N = natureAssets;
  if (N.trees && N.trees.length) {
    let seed = 1337 + biome.radius;
    const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const cats = biome.cats.filter((c) => N[c] && N[c].length);
    for (let i = 0; i < biome.density; i++) {
      const a = rng() * Math.PI * 2;
      const r = 10 + rng() * (R - 12);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.hypot(x, z) < 12) continue;
      if (Math.hypot(x - WORLD.portal.x, z - WORLD.portal.z) < 9) continue;
      const cat = pick(cats, rng);
      const proto = pick(N[cat], rng);
      const scale = cat === 'trees' ? 4.0 + rng() * 3.0 : cat === 'rocks' ? 2.4 + rng() * 2.6 : 3.0 + rng() * 2.2;
      const g = new THREE.Group();
      g.add(proto.clone(true));
      g.position.set(x, 0, z); g.scale.setScalar(scale); g.rotation.y = rng() * Math.PI * 2;
      zoneGroup.add(g);
    }
  }

  // motes / embers
  const M = 70;
  const fpos = new Float32Array(M * 3), fbase = new Float32Array(M * 3);
  for (let i = 0; i < M; i++) {
    const x = (Math.random() - 0.5) * span * 0.7, z = (Math.random() - 0.5) * span * 0.7, y = 2 + Math.random() * 9;
    fpos[i * 3] = x; fpos[i * 3 + 1] = y; fpos[i * 3 + 2] = z;
    fbase[i * 3] = x; fbase[i * 3 + 1] = y; fbase[i * 3 + 2] = z;
  }
  const fgeo = new THREE.BufferGeometry();
  fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
  zoneGroup.add(new THREE.Points(fgeo, new THREE.PointsMaterial({ color: biome.moon, size: 0.7, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
  animated.push({ kind: 'motes', geo: fgeo, base: fbase, count: M });
}

// kept for API compatibility (zone scatter now happens inside buildZone)
export function populateScatter() {}
