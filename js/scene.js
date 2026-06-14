import * as THREE from 'three';
import { COLORS, WORLD } from './config.js';
import { natureAssets } from './assets.js';

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
  const d = 90;
  moon.shadow.camera.left = -d; moon.shadow.camera.right = d;
  moon.shadow.camera.top = d; moon.shadow.camera.bottom = -d;
  moon.shadow.camera.far = 260;
  scene.add(moon);
  const fill = new THREE.DirectionalLight(0xff8a5c, 0.3);
  fill.position.set(-50, 30, -40);
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

function mat(color, flat = true, rough = 0.9) {
  return new THREE.MeshStandardMaterial({ color, flatShading: flat, roughness: rough, metalness: 0.05 });
}

function addSky(scene) {
  const geo = new THREE.SphereGeometry(320, 32, 20);
  const top = new THREE.Color(0x0a0e1a);
  const horizon = new THREE.Color(0x2a2740);
  const colors = [];
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 320;
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

  // ground
  const seg = 56;
  const groundGeo = new THREE.PlaneGeometry(s * 1.6, s * 1.6, seg, seg);
  const gpos = groundGeo.attributes.position;
  const cA = new THREE.Color(0x39402f), cB = new THREE.Color(0x2b3326), cC = new THREE.Color(0x45422f);
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
  const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // boundary ring of stones
  const R = WORLD.radius;
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const rr = R + (Math.random() - 0.5) * 2;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(2 + Math.random() * 2.5, 0), mat(0x4a4a52));
    rock.position.set(Math.cos(a) * rr, Math.random() * 1.5, Math.sin(a) * rr);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.scale.y = 1.4 + Math.random();
    rock.castShadow = true; rock.receiveShadow = true;
    scene.add(rock);
  }

  // exit portal
  const portal = new THREE.Group();
  const torus = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.5, 10, 32),
    new THREE.MeshStandardMaterial({ color: 0x7fd6ff, emissive: 0x39b6ff, emissiveIntensity: 1.4, flatShading: true }));
  torus.position.y = 3.6; portal.add(torus);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(3.0, 24),
    new THREE.MeshBasicMaterial({ color: 0x39b6ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
  disc.position.set(0, 3.6, 0); portal.add(disc);
  portal.position.set(WORLD.portal.x, 0, WORLD.portal.z);
  scene.add(portal);
  animated.push({ kind: 'portal', mesh: torus, disc });

  // fireflies / embers
  const N = 80;
  const fpos = new Float32Array(N * 3);
  const fbase = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const x = (Math.random() - 0.5) * s * 1.1;
    const z = (Math.random() - 0.5) * s * 1.1;
    const y = 2 + Math.random() * 9;
    fpos[i * 3] = x; fpos[i * 3 + 1] = y; fpos[i * 3 + 2] = z;
    fbase[i * 3] = x; fbase[i * 3 + 1] = y; fbase[i * 3 + 2] = z;
  }
  const fgeo = new THREE.BufferGeometry();
  fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
  const fmat = new THREE.PointsMaterial({ color: 0xffb060, size: 0.7, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, fog: false });
  const fireflies = new THREE.Points(fgeo, fmat);
  scene.add(fireflies);
  animated.push({ kind: 'motes', geo: fgeo, base: fbase, count: N });

  scene.userData.update = (t) => {
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
}

function pick(arr, rng) { return arr[(rng() * arr.length) | 0]; }
function placeModel(scene, proto, x, z, scale, rng) {
  const g = new THREE.Group();
  g.add(proto.clone(true));
  g.position.set(x, 0, z);
  g.scale.setScalar(scale);
  g.rotation.y = rng() * Math.PI * 2;
  scene.add(g);
}

// Scatter nature props (called after preloadNature). Avoids centre spawn + portal.
export function populateScatter(scene) {
  const N = natureAssets;
  const hasModels = N.trees && N.trees.length > 0;
  if (!hasModels) return;
  let seed = 1337;
  const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const R = WORLD.radius;
  for (let i = 0; i < 160; i++) {
    const a = rng() * Math.PI * 2;
    const r = 10 + rng() * (R - 12);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x, z) < 12) continue; // keep spawn clear
    if (Math.hypot(x - WORLD.portal.x, z - WORLD.portal.z) < 9) continue;
    const k = rng();
    if (k > 0.55) placeModel(scene, pick(N.trees, rng), x, z, 4.0 + rng() * 3.0, rng);
    else if (k > 0.36) placeModel(scene, pick(N.rocks, rng), x, z, 2.4 + rng() * 2.6, rng);
    else if (k > 0.2) placeModel(scene, pick(N.bushes, rng), x, z, 3.0 + rng() * 2.0, rng);
    else if (k > 0.1 && N.grass.length) placeModel(scene, pick(N.grass, rng), x, z, 4.0 + rng() * 2.0, rng);
    else if (N.mushrooms.length) placeModel(scene, pick(N.mushrooms, rng), x, z, 4.0 + rng() * 2.0, rng);
  }
}
