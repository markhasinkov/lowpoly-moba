import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// hero id -> KayKit character file
const CHAR_FILE = {
  guardian: 'Knight',
  mage: 'Mage',
  assassin: 'Rogue_Hooded',
};

export const heroAssets = {}; // id -> { scene, animations }

const loader = new GLTFLoader();

export async function preloadHeroes(onProgress) {
  const ids = Object.keys(CHAR_FILE);
  let done = 0;
  for (const id of ids) {
    const gltf = await loader.loadAsync(`assets/characters/${CHAR_FILE[id]}.glb`);
    heroAssets[id] = { scene: gltf.scene, animations: gltf.animations };
    done++;
    if (onProgress) onProgress(done, ids.length);
  }
  return heroAssets;
}
