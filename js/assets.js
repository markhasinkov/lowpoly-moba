import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// hero id -> KayKit character file
const CHAR_FILE = {
  guardian: 'Knight',
  mage: 'Mage',
  assassin: 'Rogue_Hooded',
};

export const heroAssets = {}; // id -> { scene, animations }
export const creepAssets = {}; // 'minion' / 'warrior' -> { scene, animations }

const loader = new GLTFLoader();

export async function preloadHeroes(onProgress) {
  const ids = Object.keys(CHAR_FILE);
  const total = ids.length + 2;
  let done = 0;
  for (const id of ids) {
    const gltf = await loader.loadAsync(`assets/characters/${CHAR_FILE[id]}.glb`);
    heroAssets[id] = { scene: gltf.scene, animations: gltf.animations };
    done++;
    if (onProgress) onProgress(done, total);
  }
  for (const [key, file] of [['minion', 'Skeleton_Minion'], ['warrior', 'Skeleton_Warrior']]) {
    try {
      const m = await loader.loadAsync(`assets/characters/${file}.glb`);
      creepAssets[key] = { scene: m.scene, animations: m.animations };
    } catch (e) {
      console.warn('Не удалось загрузить модель', file, e);
    }
    done++;
    if (onProgress) onProgress(done, total);
  }
  return heroAssets;
}

// ---- Nature props (Kenney Nature Kit, CC0) ----
const NATURE_FILES = {
  trees: ['tree_default', 'tree_oak', 'tree_fat', 'tree_tall', 'tree_detailed', 'tree_thin', 'tree_pineRoundC', 'tree_pineTallC_detailed'],
  rocks: ['rock_largeA', 'rock_largeC', 'rock_smallB', 'rock_smallE', 'rock_tallC'],
  bushes: ['plant_bush', 'plant_bushDetailed', 'plant_bushLarge'],
  mushrooms: ['mushroom_redGroup', 'mushroom_tanGroup'],
  grass: ['grass_large', 'grass_leafsLarge'],
  stumps: ['stump_round'],
};

export const natureAssets = { trees: [], rocks: [], bushes: [], mushrooms: [], grass: [], stumps: [] };

export async function preloadNature(onProgress) {
  const jobs = [];
  for (const [cat, names] of Object.entries(NATURE_FILES)) {
    for (const n of names) jobs.push([cat, n]);
  }
  let done = 0;
  for (const [cat, n] of jobs) {
    try {
      const gltf = await loader.loadAsync(`assets/nature/${n}.glb`);
      const obj = gltf.scene;
      obj.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          if (o.material) o.material.flatShading = true;
        }
      });
      natureAssets[cat].push(obj);
    } catch (e) {
      console.warn('Не удалось загрузить модель природы', n, e);
    }
    done++;
    if (onProgress) onProgress(done, jobs.length);
  }
  return natureAssets;
}
