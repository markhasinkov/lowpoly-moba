import * as THREE from 'three';
import { WORLD } from './config.js';

// Find nearest living enemy within range from a list
export function nearestEnemy(self, entities, range, skipNeutral = false) {
  let best = null, bestD = Infinity;
  for (const e of entities) {
    if (!e.alive || e.team === self.team) continue;
    if (skipNeutral && e.team === 'neutral') continue;
    const d = self.pos.distanceTo(e.pos);
    if (d <= range && d < bestD) { bestD = d; best = e; }
  }
  return best;
}

// Priority target for creeps/towers: nearest enemy in range, ignoring jungle neutrals
export function pickAttackTarget(self, entities, range) {
  return nearestEnemy(self, entities, range, true);
}

// Neutral camp creep: stationary, strikes anything (radiant or dire) in range
export function updateNeutral(neutral, entities, attack) {
  const foe = nearestEnemy(neutral, entities, neutral.attackRange);
  if (foe) {
    neutral.mesh.rotation.y = Math.atan2(foe.pos.x - neutral.pos.x, foe.pos.z - neutral.pos.z);
    attack(neutral, foe);
  }
}

// Move entity toward a point, returns true if arrived within stopDist
export function moveToward(self, targetVec, dt, stopDist = 0.5) {
  const dir = new THREE.Vector3().subVectors(targetVec, self.pos);
  dir.y = 0;
  const dist = dir.length();
  if (dist <= stopDist) return true;
  dir.normalize();
  const spd = self.slowT > 0 ? self.moveSpeed * (self.slowFactor || 0.5) : self.moveSpeed;
  const step = Math.min(spd * dt, dist);
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

// Enemy hero AI — generic over the hero's own ability kit.
// `cast(key, aimPos)` resolves the ability type (projectile/aoe/buff/dash/blink).
export function updateEnemyHero(hero, ctx, dt, attack, cast) {
  const { entities, player } = ctx;
  const myBase = WORLD.direBase, enemyBase = WORLD.radiantBase;

  if (hero.hp < hero.maxHp * 0.28) hero.state = 'retreat';
  else if (hero.state === 'retreat' && hero.hp > hero.maxHp * 0.62) hero.state = 'push';

  const lvl = k => hero.abilityLevels[k] || 0;
  const ready = k => lvl(k) > 0 && (hero['cd' + k] || 0) <= 0 && hero.mana >= (hero.abilities[k].manaCost || 0);
  const dPlayer = player && player.alive ? hero.pos.distanceTo(player.pos) : Infinity;

  // ---- Retreat: escape with blink / speed, run home ----
  if (hero.state === 'retreat') {
    for (const k of ['E', 'Q', 'W']) {
      if (!ready(k)) continue;
      const t = hero.abilities[k].type;
      if (t === 'blink') { cast(k, new THREE.Vector3(myBase.x, 0, myBase.z)); break; }
      if (t === 'buff_speed') { cast(k, hero.pos); break; }
    }
    moveToward(hero, new THREE.Vector3(myBase.x, 0, myBase.z), dt, 8);
    return;
  }

  // ---- Defensive guard buff when pressured ----
  for (const k of ['Q', 'W', 'E']) {
    if (ready(k) && hero.abilities[k].type === 'buff_guard' && hero.hp < hero.maxHp * 0.6 && dPlayer < 24) cast(k, hero.pos);
  }

  // ---- Offensive casts vs the player hero ----
  if (player && player.alive) {
    for (const k of ['Q', 'W', 'E']) {
      if (!ready(k)) continue;
      const ab = hero.abilities[k];
      if (ab.type === 'projectile' && dPlayer < (ab.range || 30) * 0.85) cast(k, player.pos);
      else if (ab.type === 'aoe' && dPlayer < (ab.radius || 10) + 1) cast(k, player.pos);
      else if (ab.type === 'dash' && dPlayer > 9 && dPlayer < (ab.range || 24)) cast(k, player.pos);
      else if (ab.type === 'buff_speed' && dPlayer > 14 && dPlayer < 42) cast(k, player.pos);
    }
  }

  const targets = entities.filter(e => e.alive && e.team !== hero.team && e.team !== 'neutral');
  const foe = nearestEnemy(hero, targets, hero.attackRange);
  if (foe) {
    hero.mesh.rotation.y = Math.atan2(foe.pos.x - hero.pos.x, foe.pos.z - hero.pos.z);
    attack(hero, foe);
    return;
  }

  let nearest = null, nd = Infinity;
  for (const e of targets) { const d = hero.pos.distanceTo(e.pos); if (d < nd) { nd = d; nearest = e; } }
  const goal = nearest && nd < 40 ? nearest.pos : new THREE.Vector3(enemyBase.x, 0, enemyBase.z);
  moveToward(hero, goal, dt, hero.attackRange * 0.8);
}
