import * as THREE from 'three';
import { COLORS, WORLD } from './config.js';

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9ec9e8);
  scene.fog = new THREE.Fog(0x9ec9e8, 90, 200);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('game').appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(
    55, window.innerWidth / window.innerHeight, 0.1, 500
  );

  // Lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0x556b2f, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d6, 1.05);
  sun.position.set(40, 80, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const d = 90;
  sun.shadow.camera.left = -d;
  sun.shadow.camera.right = d;
  sun.shadow.camera.top = d;
  sun.shadow.camera.bottom = -d;
  sun.shadow.camera.far = 250;
  scene.add(sun);

  buildArena(scene);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, renderer, camera };
}

function mat(color, flat = true) {
  return new THREE.MeshStandardMaterial({
    color, flatShading: flat, roughness: 0.9, metalness: 0.05,
  });
}

function buildArena(scene) {
  const s = WORLD.size;

  // Ground
  const groundGeo = new THREE.PlaneGeometry(s * 1.4, s * 1.4, 1, 1);
  const ground = new THREE.Mesh(groundGeo, mat(COLORS.ground));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Lane: a wide diagonal strip from radiant to dire base
  const laneLen = Math.hypot(WORLD.direBase.x - WORLD.radiantBase.x, WORLD.direBase.z - WORLD.radiantBase.z) + 30;
  const laneGeo = new THREE.PlaneGeometry(16, laneLen, 1, 1);
  const lane = new THREE.Mesh(laneGeo, mat(COLORS.lane));
  lane.rotation.x = -Math.PI / 2;
  lane.position.y = 0.02;
  const angle = Math.atan2(WORLD.direBase.x - WORLD.radiantBase.x, WORLD.direBase.z - WORLD.radiantBase.z);
  lane.rotation.z = -angle;
  scene.add(lane);

  // River across the middle (perpendicular)
  const riverGeo = new THREE.PlaneGeometry(s * 1.4, 12, 1, 1);
  const river = new THREE.Mesh(riverGeo, new THREE.MeshStandardMaterial({
    color: COLORS.river, flatShading: true, roughness: 0.4, metalness: 0.2, transparent: true, opacity: 0.85,
  }));
  river.rotation.x = -Math.PI / 2;
  river.position.y = 0.03;
  river.rotation.z = angle;
  scene.add(river);

  // Decorative scatter: trees + rocks (avoid the lane)
  const onLane = (x, z) => {
    // distance from the lane center line
    const ax = WORLD.radiantBase.x, az = WORLD.radiantBase.z;
    const bx = WORLD.direBase.x, bz = WORLD.direBase.z;
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    const px = ax + t * dx, pz = az + t * dz;
    return Math.hypot(x - px, z - pz) < 12;
  };

  const rng = mulberry32(1337);
  for (let i = 0; i < 140; i++) {
    const x = (rng() - 0.5) * s * 1.3;
    const z = (rng() - 0.5) * s * 1.3;
    if (onLane(x, z)) continue;
    if (rng() > 0.35) addTree(scene, x, z, 0.7 + rng() * 0.9);
    else addRock(scene, x, z, 0.6 + rng() * 1.2);
  }
}

function addTree(scene, x, z, scale) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 2.4, 6), mat(COLORS.treeTrunk));
  trunk.position.y = 1.2;
  trunk.castShadow = true;
  g.add(trunk);
  const leaf = new THREE.Mesh(new THREE.ConeGeometry(2, 4.2, 7), mat(COLORS.treeLeaf));
  leaf.position.y = 4;
  leaf.castShadow = true;
  g.add(leaf);
  g.position.set(x, 0, z);
  g.scale.setScalar(scale);
  g.rotation.y = Math.random() * Math.PI;
  scene.add(g);
}

function addRock(scene, x, z, scale) {
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1, 0), mat(COLORS.rock));
  rock.position.set(x, 0.4 * scale, z);
  rock.scale.setScalar(scale);
  rock.rotation.set(Math.random(), Math.random(), Math.random());
  rock.castShadow = true;
  rock.receiveShadow = true;
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
