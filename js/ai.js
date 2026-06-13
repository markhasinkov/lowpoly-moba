import * as THREE from 'three';
import { WORLD } from './config.js';

// Find nearest living enemy within range from a list
export function nearestEnemy(self, entities, range) {
  let best = null, bestD = Infinity;
  for (const e of entities) {
    if (!e.alive || e.team === self.team) continue;
    const d = self.pos.distanceTo(e.pos);
    if (d <= range && d < bestD) { bestD = d; best = e; }
  }
  return best;
}

// Priority target for creeps/towers: heroes < creeps unless creep closer (simple aggro)
export function pickAttackTarget(self, entities, range) {
  // Towers prioritise creeps then heroes; keep it simple: nearest enemy in range
  return nearestEnemy(self, entities, range);
}

// Move entity toward a point, returns true if arrived within stopDist
export function moveToward(self, targetVec, dt, stopDist = 0.5) {
  const dir = new THREE.Vector3().subVectors(targetVec, self.pos);
  dir.y = 0;
  const dist = dir.length();
  if (dist <= stopDist) return true;
  dir.normalize();
  const step = Math.min(self.moveSpeed * dt, dist);
  self.pos.addScaledVector(dir, step);
  // face movement direction
  self.mesh.rotation.y = Math.atan2(dir.x, dir.z);
  return false;
}

// Creep behavior: march along lane toward enemy base, fight enemies in range
export function updateCreep(creep, entities, dt, attack) {
  const enemyBase = creep.team === 'radiant' ? WORLD.direBase : WORLD.radiantBase;
  const goal = new THREE.Vector3(enemyBase.x, 0, enemyBase.z);

  const foe = pickAttackTarget(creep, entities, creep.attackRange + 2);
  if (foe) {
    if (creep.pos.distanceTo(foe.pos) <= creep.attackRange) {
      creep.mesh.rotation.y = Math.atan2(foe.pos.x - creep.pos.x, foe.pos.z - creep.pos.z);
      attack(creep, foe);
    } else {
      moveToward(creep, foe.pos, dt, creep.attackRange * 0.8);
    }
    return;
  }
  moveToward(creep, goal, dt, 1.5);
}

// Tower behavior: attack nearest enemy in range (creeps first by closeness)
export function updateTower(tower, entities, dt, attack) {
  const foe = pickAttackTarget(tower, entities, tower.attackRange);
  if (foe) {
    tower.mesh.rotation.y = Math.atan2(foe.pos.x - tower.pos.x, foe.pos.z - tower.pos.z);
    attack(tower, foe);
  }
}

// Enemy hero AI: simple state machine — push lane, fight, retreat when low
export function updateEnemyHero(hero, ctx, dt, attack, castNova, castBolt) {
  const { entities } = ctx;
  const myBase = WORLD.direBase;
  const enemyBase = WORLD.radiantBase;

  // Retreat if low HP
  if (hero.hp < hero.maxHp * 0.28) {
    hero.state = 'retreat';
  } else if (hero.state === 'retreat' && hero.hp > hero.maxHp * 0.65) {
    hero.state = 'push';
  }

  if (hero.state === 'retreat') {
    moveToward(hero, new THREE.Vector3(myBase.x, 0, myBase.z), dt, 8);
    return;
  }

  // Find best target: enemy hero in range, else nearest enemy creep/tower
  const player = ctx.player;
  const targets = entities.filter(e => e.alive && e.team !== hero.team);

  // Cast abilities opportunistically
  if (player && player.alive) {
    const dToPlayer = hero.pos.distanceTo(player.pos);
    if (dToPlayer < 13 && hero.mana >= 90 && hero.cdW <= 0 && player.hp < player.maxHp * 0.6) {
      castNova(hero);
    } else if (dToPlayer < 36 && hero.mana >= 60 && hero.cdQ <= 0) {
      const dir = new THREE.Vector3().subVectors(player.pos, hero.pos).setY(0).normalize();
      castBolt(hero, dir);
    }
  }

  let foe = nearestEnemy(hero, targets, hero.attackRange);
  if (foe) {
    hero.mesh.rotation.y = Math.atan2(foe.pos.x - hero.pos.x, foe.pos.z - hero.pos.z);
    attack(hero, foe);
    return;
  }

  // March toward nearest enemy or enemy base
  let nearest = null, nd = Infinity;
  for (const e of targets) {
    const d = hero.pos.distanceTo(e.pos);
    if (d < nd) { nd = d; nearest = e; }
  }
  const goal = nearest && nd < 40
    ? nearest.pos
    : new THREE.Vector3(enemyBase.x, 0, enemyBase.z);
  moveToward(hero, goal, dt, hero.attackRange * 0.8);
}
