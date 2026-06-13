import * as THREE from 'three';
import { createScene } from './scene.js';
import {
  createHero, createCreep, createTower, createBase,
} from './entities.js';
import { EffectSystem, ABILITIES } from './abilities.js';
import {
  updateCreep, updateTower, updateEnemyHero, moveToward, nearestEnemy,
} from './ai.js';
import { UI } from './ui.js';
import { TEAM, WORLD, CREEP, XP_PER_LEVEL, HERO_RESPAWN } from './config.js';

const { scene, renderer, camera } = createScene();
const ui = new UI();
const fx = new EffectSystem(scene);

// ---- World entities ----
const entities = [];
function add(e) { scene.add(e.mesh); entities.push(e); return e; }

// Bases
const radiantBase = add(createBase(TEAM.RADIANT, WORLD.radiantBase.x, WORLD.radiantBase.z));
const direBase = add(createBase(TEAM.DIRE, WORLD.direBase.x, WORLD.direBase.z));

// Towers along the lane (two per side)
function lanePoint(t) {
  return {
    x: WORLD.radiantBase.x + (WORLD.direBase.x - WORLD.radiantBase.x) * t,
    z: WORLD.radiantBase.z + (WORLD.direBase.z - WORLD.radiantBase.z) * t,
  };
}
const tRad2 = lanePoint(0.18), tRad1 = lanePoint(0.36);
const tDire1 = lanePoint(0.64), tDire2 = lanePoint(0.82);
add(createTower(TEAM.RADIANT, tRad2.x, tRad2.z));
add(createTower(TEAM.RADIANT, tRad1.x, tRad1.z));
add(createTower(TEAM.DIRE, tDire1.x, tDire1.z));
add(createTower(TEAM.DIRE, tDire2.x, tDire2.z));

// Heroes
const player = add(createHero(TEAM.RADIANT));
player.pos.set(WORLD.radiantBase.x + 4, 0, WORLD.radiantBase.z + 4);
player.mesh.position.copy(player.pos);
player.cdQ = 0; player.cdW = 0; player.cdE = 0; player.buffE = 0;

const enemy = add(createHero(TEAM.DIRE));
enemy.pos.set(WORLD.direBase.x - 4, 0, WORLD.direBase.z - 4);
enemy.mesh.position.copy(enemy.pos);
enemy.cdQ = 0; enemy.cdW = 0; enemy.cdE = 0; enemy.state = 'push';

// ---- Camera follow ----
const camOffset = new THREE.Vector3(0, 46, 38);
function updateCamera() {
  const desired = player.pos.clone().add(camOffset);
  camera.position.lerp(desired, 0.12);
  camera.lookAt(player.pos.x, 0, player.pos.z);
}
camera.position.copy(player.pos.clone().add(camOffset));

// ---- Input ----
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let pointerWorld = new THREE.Vector3();

function screenToGround(clientX, clientY) {
  mouse.x = (clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hit = new THREE.Vector3();
  raycaster.ray.intersectPlane(groundPlane, hit);
  return hit;
}

renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
renderer.domElement.addEventListener('pointerdown', (e) => {
  if (!player.alive || gameEnded) return;
  const hit = screenToGround(e.clientX, e.clientY);
  if (!hit) return;
  if (e.button === 2) {
    // right-click: move or attack-target
    const foe = nearestEnemyAtPoint(hit, 3.5);
    if (foe) { player.attackTarget = foe; player.target = null; }
    else { player.target = hit.clone(); player.attackTarget = null; }
  }
});
renderer.domElement.addEventListener('pointermove', (e) => {
  const hit = screenToGround(e.clientX, e.clientY);
  if (hit) pointerWorld.copy(hit);
});

window.addEventListener('keydown', (e) => {
  if (gameEnded || !player.alive) return;
  const k = e.key.toLowerCase();
  if (k === 'q') castAbility('Q');
  else if (k === 'w') castAbility('W');
  else if (k === 'e') castAbility('E');
  else if (k === 's') { player.target = null; player.attackTarget = null; } // stop
});

function nearestEnemyAtPoint(point, radius) {
  let best = null, bd = radius;
  for (const e of entities) {
    if (!e.alive || e.team === player.team) continue;
    const d = Math.hypot(e.pos.x - point.x, e.pos.z - point.z);
    if (d <= (radius + (e.radius || 1)) && d < bd) { bd = d; best = e; }
  }
  return best;
}

// ---- Abilities ----
function castAbility(key) {
  const a = ABILITIES[key];
  const cdKey = 'cd' + key;
  if (player[cdKey] > 0 || player.mana < a.manaCost) {
    if (player.mana < a.manaCost) ui.showToast('Недостаточно маны', 1);
    return;
  }
  if (key === 'Q') {
    const dir = new THREE.Vector3().subVectors(pointerWorld, player.pos).setY(0);
    if (dir.lengthSq() < 0.01) return;
    player.mesh.rotation.y = Math.atan2(dir.x, dir.z);
    fx.spawnBolt(player, dir, entities);
  } else if (key === 'W') {
    const ab = fx.spawnNova(player);
    for (const e of entities) {
      if (e.alive && e.team !== player.team && player.pos.distanceTo(e.pos) <= ab.radius) {
        applyDamage(e, ab.damage, player);
      }
    }
  } else if (key === 'E') {
    player.buffE = a.duration;
    player.moveSpeed = player.baseMoveSpeed + a.speedBonus;
    ui.showToast('Рывок!', 1);
  }
  player.mana -= a.manaCost;
  player[cdKey] = a.cooldown;
}

// AI ability casts
function aiCastNova(hero) {
  const a = fx.spawnNova(hero);
  for (const e of entities) {
    if (e.alive && e.team !== hero.team && hero.pos.distanceTo(e.pos) <= a.radius) {
      applyDamage(e, a.damage, hero);
    }
  }
  hero.mana -= ABILITIES.W.manaCost; hero.cdW = ABILITIES.W.cooldown;
}
function aiCastBolt(hero, dir) {
  hero.mesh.rotation.y = Math.atan2(dir.x, dir.z);
  fx.spawnBolt(hero, dir, entities);
  hero.mana -= ABILITIES.Q.manaCost; hero.cdQ = ABILITIES.Q.cooldown;
}

// ---- Combat ----
function attack(attacker, target) {
  if (attacker.attackCd > 0 || !target.alive) return;
  applyDamage(target, attacker.attackDamage, attacker);
  attacker.attackCd = 1 / attacker.attackSpeed;
  // muzzle pulse
  attacker.mesh.scale.y = 1.08;
}

function applyDamage(target, amount, attacker) {
  const wasAlive = target.alive;
  target.takeDamage(amount, attacker);
  if (wasAlive && !target.alive) onKill(target, attacker);
}

function grantXp(hero, amount) {
  hero.xp += amount;
  const newLevel = Math.min(18, 1 + Math.floor(hero.xp / XP_PER_LEVEL));
  while (hero.level < newLevel) {
    hero.level++;
    hero.maxHp += 55; hero.hp += 55;
    hero.maxMana += 20; hero.mana += 20;
    hero.attackDamage += 6;
    if (hero === player) ui.showToast(`Уровень ${hero.level}!`, 1.6);
  }
}

function onKill(victim, killer) {
  victim.mesh.visible = false;
  if (victim.kind === 'creep' || victim.kind === 'tower') {
    if (killer && killer.kind === 'hero') {
      killer.gold += victim.goldBounty;
      grantXp(killer, victim.xpBounty || 60);
      if (killer === player && victim.kind === 'creep') ui.showToast(`+${victim.goldBounty} золота (ластхит)`, 0.9);
      if (victim.kind === 'tower') ui.showToast(killer === player ? 'Башня уничтожена! +300' : 'Наша башня пала', 1.8);
    }
    // remove from list
    removeEntity(victim);
  } else if (victim.kind === 'hero') {
    if (killer && killer.kind === 'hero') {
      killer.kills++; killer.gold += 250; grantXp(killer, 180);
      ui.showToast(killer === player ? 'Убийство героя! +250' : `${player.name} убит`, 2);
    }
    victim.deaths++;
    victim.respawnTimer = HERO_RESPAWN + victim.level * 1.5;
  } else if (victim.kind === 'base') {
    endGame(victim.team !== player.team);
  }
}

function removeEntity(e) {
  scene.remove(e.mesh);
  const i = entities.indexOf(e);
  if (i >= 0) entities.splice(i, 1);
}

function respawnHero(hero) {
  hero.hp = hero.maxHp; hero.mana = hero.maxMana; hero.alive = true;
  hero.mesh.visible = true;
  const base = hero.team === 'radiant' ? WORLD.radiantBase : WORLD.direBase;
  hero.pos.set(base.x + (Math.random() - 0.5) * 6, 0, base.z + (Math.random() - 0.5) * 6);
  hero.mesh.position.copy(hero.pos);
  hero.target = null; hero.attackTarget = null;
  hero.setHpBar();
}

// ---- Creep waves ----
let waveTimer = 3;
function spawnWave() {
  for (const team of [TEAM.RADIANT, TEAM.DIRE]) {
    const base = team === 'radiant' ? WORLD.radiantBase : WORLD.direBase;
    for (let i = 0; i < CREEP.perWave; i++) {
      const c = createCreep(team, base.x + (Math.random() - 0.5) * 6, base.z + (Math.random() - 0.5) * 6);
      add(c);
    }
  }
}

// ---- Game loop ----
let gameEnded = false;
let matchTime = 0;
const clock = new THREE.Clock();

function tickCooldowns(hero, dt) {
  for (const k of ['cdQ', 'cdW', 'cdE']) hero[k] = Math.max(0, hero[k] - dt);
  if (hero.buffE > 0) {
    hero.buffE -= dt;
    if (hero.buffE <= 0) hero.moveSpeed = hero.baseMoveSpeed;
  }
}

function regen(e, dt) {
  if (e.hpRegen) e.hp = Math.min(e.maxHp, e.hp + e.hpRegen * dt);
  if (e.manaRegen) e.mana = Math.min(e.maxMana, e.mana + e.manaRegen * dt);
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());
  if (!gameEnded) update(dt);
  // billboards
  for (const e of entities) {
    if (e.hpBar) e.hpBar.quaternion.copy(camera.quaternion);
    if (e.mesh.scale.y > 1) e.mesh.scale.y = Math.max(1, e.mesh.scale.y - dt * 0.6);
  }
  updateCamera();
  renderer.render(scene, camera);
}

function update(dt) {
  matchTime += dt;
  ui.updateTimer(matchTime);

  waveTimer -= dt;
  if (waveTimer <= 0) { spawnWave(); waveTimer = CREEP.spawnInterval; }

  // attack cooldown tick
  for (const e of entities) if (e.attackCd > 0) e.attackCd -= dt;

  // Player control
  if (player.alive) {
    tickCooldowns(player, dt);
    regen(player, dt);
    if (player.attackTarget && player.attackTarget.alive) {
      const d = player.distanceTo(player.attackTarget);
      if (d <= player.attackRange) {
        player.mesh.rotation.y = Math.atan2(
          player.attackTarget.pos.x - player.pos.x, player.attackTarget.pos.z - player.pos.z);
        attack(player, player.attackTarget);
      } else {
        moveToward(player, player.attackTarget.pos, dt, player.attackRange * 0.85);
      }
    } else if (player.target) {
      if (moveToward(player, player.target, dt, 0.6)) player.target = null;
    }
    player.mesh.position.copy(player.pos);
  } else {
    player.respawnTimer -= dt;
    if (player.respawnTimer <= 0) respawnHero(player);
  }

  // Enemy hero AI
  if (enemy.alive) {
    tickCooldowns(enemy, dt);
    regen(enemy, dt);
    updateEnemyHero(enemy, { entities, player }, dt, attack, aiCastNova, aiCastBolt);
    enemy.mesh.position.copy(enemy.pos);
  } else {
    enemy.respawnTimer -= dt;
    if (enemy.respawnTimer <= 0) respawnHero(enemy);
  }

  // Creeps & towers
  for (const e of entities) {
    if (!e.alive) continue;
    if (e.kind === 'creep') {
      updateCreep(e, entities, dt, attack);
      e.mesh.position.copy(e.pos);
    } else if (e.kind === 'tower') {
      updateTower(e, entities, dt, attack);
    }
  }

  fx.update(dt, entities, applyDamage);

  // UI
  ui.updateHero(player);
  ui.updateAbilities({ Q: player.cdQ, W: player.cdW, E: player.cdE });
  ui.drawMinimap(entities, player, WORLD);
  ui.updateToast(dt);

  if (!player.alive) ui.showToast(`Возрождение через ${Math.ceil(player.respawnTimer)}с`, 0.4);
}

function endGame(playerWon) {
  gameEnded = true;
  ui.showGameOver(playerWon);
}

document.getElementById('restart')?.addEventListener('click', () => location.reload());

ui.showToast('ЛКМ/ПКМ — движение и атака. Q/W/E — способности. Уничтожь вражеский трон!', 4);
animate();
