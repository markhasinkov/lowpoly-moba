import * as THREE from 'three';
import { createScene } from './scene.js';
import {
  createHero, createCreep, createTower, createBase,
} from './entities.js';
import { EffectSystem } from './abilities.js';
import {
  updateCreep, updateTower, updateEnemyHero, moveToward, nearestEnemy,
} from './ai.js';
import { UI } from './ui.js';
import {
  TEAM, WORLD, CREEP, ABILITIES, abilityStat, ITEMS, AI_BUILD_ORDER,
  XP_PER_LEVEL, HERO_RESPAWN, MAX_LEVEL, MAX_ABILITY_LEVEL, MAX_ITEMS,
} from './config.js';

const { scene, renderer, camera } = createScene();
const ui = new UI();
const fx = new EffectSystem(scene);

// ---- World entities ----
const entities = [];
function add(e) { scene.add(e.mesh); entities.push(e); return e; }

const radiantBase = add(createBase(TEAM.RADIANT, WORLD.radiantBase.x, WORLD.radiantBase.z));
const direBase = add(createBase(TEAM.DIRE, WORLD.direBase.x, WORLD.direBase.z));

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

// ---- Heroes ----
function initHero(hero) {
  hero.cdQ = 0; hero.cdW = 0; hero.cdE = 0; hero.buffE = 0;
  hero.abilityLevels = { Q: 0, W: 0, E: 0 };
  hero.skillPoints = 1; // level-1 point
  hero.items = [];
  hero.aiBuyIndex = 0;
}

const player = add(createHero(TEAM.RADIANT));
player.pos.set(WORLD.radiantBase.x + 4, 0, WORLD.radiantBase.z + 4);
player.mesh.position.copy(player.pos);
initHero(player);

const enemy = add(createHero(TEAM.DIRE));
enemy.pos.set(WORLD.direBase.x - 4, 0, WORLD.direBase.z - 4);
enemy.mesh.position.copy(enemy.pos);
initHero(enemy);
enemy.state = 'push';
spendEnemySkillPoints(enemy); // learn level-1 ability

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
  if (e.button === 2 || e.button === 0) {
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
  const k = e.key.toLowerCase();
  if (k === 'b') { ui.toggleShop(); return; }
  if (gameEnded || !player.alive) return;
  if (e.shiftKey && (k === 'q' || k === 'w' || k === 'e')) {
    levelAbility(player, k.toUpperCase());
    return;
  }
  if (k === 'q') castAbility('Q');
  else if (k === 'w') castAbility('W');
  else if (k === 'e') castAbility('E');
  else if (k === '1') levelAbility(player, 'Q');
  else if (k === '2') levelAbility(player, 'W');
  else if (k === '3') levelAbility(player, 'E');
  else if (k === 's') { player.target = null; player.attackTarget = null; }
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

// ---- Progression: abilities & items ----
function levelAbility(hero, key) {
  if (hero.skillPoints <= 0) { if (hero === player) ui.showToast('Нет очков умений', 1); return; }
  if (hero.abilityLevels[key] >= MAX_ABILITY_LEVEL) { if (hero === player) ui.showToast('Способность максимальна', 1); return; }
  hero.abilityLevels[key]++;
  hero.skillPoints--;
  if (hero === player) {
    ui.showToast(`${ABILITIES[key].name} → ур.${hero.abilityLevels[key]}`, 1.2);
    refreshHud();
  }
}

function applyItemStats(hero, stats, sign = 1) {
  for (const [k, v] of Object.entries(stats)) {
    const delta = v * sign;
    if (k === 'maxHp') { hero.maxHp += delta; hero.hp += delta; }
    else if (k === 'maxMana') { hero.maxMana += delta; hero.mana += delta; }
    else if (k === 'moveSpeed') {
      hero.baseMoveSpeed += delta;
      if (hero.buffE <= 0) hero.moveSpeed = hero.baseMoveSpeed;
      else hero.moveSpeed += delta;
    } else {
      hero[k] = (hero[k] || 0) + delta;
    }
  }
}

function nearOwnFountain(hero) {
  const base = hero.team === 'radiant' ? WORLD.radiantBase : WORLD.direBase;
  return Math.hypot(hero.pos.x - base.x, hero.pos.z - base.z) <= WORLD.fountainRadius;
}

function buyItem(hero, item) {
  if (hero.items.length >= MAX_ITEMS) { if (hero === player) ui.showToast('Инвентарь полон', 1.2); return false; }
  if (hero.gold < item.cost) { if (hero === player) ui.showToast('Недостаточно золота', 1.2); return false; }
  if (hero === player && !nearOwnFountain(hero)) { ui.showToast('Покупать можно только у своей базы (фонтан)', 1.6); return false; }
  hero.gold -= item.cost;
  hero.items.push(item.id);
  applyItemStats(hero, item.stats, 1);
  if (hero === player) { ui.showToast(`Куплено: ${item.name}`, 1.2); refreshHud(); }
  return true;
}

ui.callbacks = {
  onBuy: (itemId) => { const it = ITEMS.find(i => i.id === itemId); if (it) buyItem(player, it); },
  onLevel: (key) => levelAbility(player, key),
};

function refreshHud() {
  ui.updateHero(player);
  ui.updateAbilities(player);
  ui.updateInventory(player);
  ui.renderShop(ITEMS, player, nearOwnFountain(player));
}

// ---- Abilities ----
function castAbility(key) {
  const lvl = player.abilityLevels[key];
  if (lvl < 1) { ui.showToast('Сначала изучи способность (1/2/3 или Shift)', 1.4); return; }
  const s = abilityStat(key, lvl);
  const cdKey = 'cd' + key;
  if (player[cdKey] > 0) return;
  if (player.mana < s.manaCost) { ui.showToast('Недостаточно маны', 1); return; }

  if (key === 'Q') {
    const dir = new THREE.Vector3().subVectors(pointerWorld, player.pos).setY(0);
    if (dir.lengthSq() < 0.01) return;
    player.mesh.rotation.y = Math.atan2(dir.x, dir.z);
    fx.spawnBolt(player, dir, entities, s.damage);
  } else if (key === 'W') {
    fx.spawnNova(player, s.radius);
    for (const e of entities) {
      if (e.alive && e.team !== player.team && player.pos.distanceTo(e.pos) <= s.radius) {
        applyDamage(e, s.damage, player);
      }
    }
  } else if (key === 'E') {
    player.buffE = s.duration;
    player.moveSpeed = player.baseMoveSpeed + s.speedBonus;
    ui.showToast('Рывок!', 1);
  }
  player.mana -= s.manaCost;
  player[cdKey] = s.cooldown;
}

function aiCastNova(hero) {
  const lvl = hero.abilityLevels.W;
  if (lvl < 1) return;
  const s = abilityStat('W', lvl);
  if (hero.mana < s.manaCost) return;
  fx.spawnNova(hero, s.radius);
  for (const e of entities) {
    if (e.alive && e.team !== hero.team && hero.pos.distanceTo(e.pos) <= s.radius) {
      applyDamage(e, s.damage, hero);
    }
  }
  hero.mana -= s.manaCost; hero.cdW = s.cooldown;
}
function aiCastBolt(hero, dir) {
  const lvl = hero.abilityLevels.Q;
  if (lvl < 1) return;
  const s = abilityStat('Q', lvl);
  if (hero.mana < s.manaCost) return;
  hero.mesh.rotation.y = Math.atan2(dir.x, dir.z);
  fx.spawnBolt(hero, dir, entities, s.damage);
  hero.mana -= s.manaCost; hero.cdQ = s.cooldown;
}

// ---- Combat ----
function attack(attacker, target) {
  if (attacker.attackCd > 0 || !target.alive) return;
  applyDamage(target, attacker.attackDamage, attacker);
  attacker.attackCd = 1 / attacker.attackSpeed;
  attacker.mesh.scale.y = 1.08;
}

function applyDamage(target, amount, attacker) {
  const wasAlive = target.alive;
  target.takeDamage(amount, attacker);
  if (wasAlive && !target.alive) onKill(target, attacker);
}

function grantXp(hero, amount) {
  hero.xp += amount;
  const newLevel = Math.min(MAX_LEVEL, 1 + Math.floor(hero.xp / XP_PER_LEVEL));
  while (hero.level < newLevel) {
    hero.level++;
    hero.maxHp += 55; hero.hp += 55;
    hero.maxMana += 20; hero.mana += 20;
    hero.attackDamage += 6;
    hero.skillPoints++;
    if (hero === player) ui.showToast(`Уровень ${hero.level}! +1 очко умений`, 1.6);
    else spendEnemySkillPoints(hero);
  }
  if (hero === player) refreshHud();
}

// Enemy AI: spend skill points by priority and auto-buy items
function spendEnemySkillPoints(hero) {
  const order = ['Q', 'W', 'Q', 'E', 'Q', 'W', 'Q', 'W', 'E', 'W', 'E', 'E'];
  while (hero.skillPoints > 0) {
    let learned = false;
    for (const key of order) {
      if (hero.abilityLevels[key] < MAX_ABILITY_LEVEL) {
        // respect natural progression: don't overspend one ability past availability
        hero.abilityLevels[key]++;
        hero.skillPoints--;
        learned = true;
        break;
      }
    }
    if (!learned) break;
  }
}

function enemyAutoBuy(hero) {
  if (hero.items.length >= MAX_ITEMS) return;
  const nextId = AI_BUILD_ORDER[hero.aiBuyIndex];
  if (!nextId) return;
  const item = ITEMS.find(i => i.id === nextId);
  if (item && hero.gold >= item.cost) {
    hero.gold -= item.cost;
    hero.items.push(item.id);
    applyItemStats(hero, item.stats, 1);
    hero.aiBuyIndex++;
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
  let hpReg = e.hpRegen || 0, mpReg = e.manaRegen || 0;
  if (e.kind === 'hero' && nearOwnFountain(e)) { hpReg += e.maxHp * 0.12; mpReg += e.maxMana * 0.1; }
  if (hpReg) e.hp = Math.min(e.maxHp, e.hp + hpReg * dt);
  if (mpReg) e.mana = Math.min(e.maxMana, e.mana + mpReg * dt);
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());
  if (!gameEnded) update(dt);
  for (const e of entities) {
    if (e.hpBar) e.hpBar.quaternion.copy(camera.quaternion);
    if (e.mesh.scale.y > 1) e.mesh.scale.y = Math.max(1, e.mesh.scale.y - dt * 0.6);
  }
  updateCamera();
  renderer.render(scene, camera);
}

let hudTimer = 0;
function update(dt) {
  matchTime += dt;
  ui.updateTimer(matchTime);

  waveTimer -= dt;
  if (waveTimer <= 0) { spawnWave(); waveTimer = CREEP.spawnInterval; }

  for (const e of entities) if (e.attackCd > 0) e.attackCd -= dt;

  // Player
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

  // Enemy
  if (enemy.alive) {
    tickCooldowns(enemy, dt);
    regen(enemy, dt);
    enemyAutoBuy(enemy);
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

  // UI (throttle heavy HUD updates a bit)
  hudTimer -= dt;
  ui.updateHero(player);
  ui.updateAbilities(player);
  ui.drawMinimap(entities, player, WORLD);
  ui.updateToast(dt);
  if (hudTimer <= 0) {
    ui.updateInventory(player);
    if (ui.shopOpen) ui.renderShop(ITEMS, player, nearOwnFountain(player));
    hudTimer = 0.3;
  }

  if (!player.alive) ui.showToast(`Возрождение через ${Math.ceil(player.respawnTimer)}с`, 0.4);
}

function endGame(playerWon) {
  gameEnded = true;
  ui.showGameOver(playerWon);
}

document.getElementById('restart')?.addEventListener('click', () => location.reload());

ui.renderShop(ITEMS, player, nearOwnFountain(player));
ui.updateInventory(player);
ui.updateAbilities(player);
ui.showToast('ЛКМ/ПКМ — идти/атаковать. Q/W/E — способности, 1/2/3 (или Shift) — прокачать. B — магазин.', 5);
animate();
