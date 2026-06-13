import * as THREE from 'three';
import { createScene } from './scene.js';
import {
  createHero, createCreep, createTower, createBase, createNeutral, animateEntityVisual, playHeroAnim,
} from './entities.js';
import { EffectSystem } from './abilities.js';
import {
  updateCreep, updateTower, updateEnemyHero, updateNeutral, moveToward, nearestEnemy,
} from './ai.js';
import { UI } from './ui.js';
import { preloadHeroes, heroAssets } from './assets.js';
import {
  TEAM, WORLD, CREEP, scaleAbility, ITEMS, AI_BUILD_ORDER,
  HERO_DEFS, getHeroDef, NEUTRAL, CAMPS,
  XP_PER_LEVEL, HERO_RESPAWN, MAX_LEVEL, MAX_ABILITY_LEVEL, MAX_ITEMS,
} from './config.js';

const { scene, renderer, camera } = createScene();
const ui = new UI();
const fx = new EffectSystem(scene);

// ---- State ----
const entities = [];
const camps = [];
let player = null, enemy = null;
let started = false, gameEnded = false;
let matchTime = 0, waveTimer = 3, hudTimer = 0;
const clock = new THREE.Clock();
const camOffset = new THREE.Vector3(0, 46, 38);

function add(e) { scene.add(e.mesh); entities.push(e); return e; }

camera.position.set(0, 95, 70);
camera.lookAt(0, 0, 0);

// ---- Floating damage numbers (DOM overlay projected from world space) ----
const fxLayer = document.getElementById('fx-layer');
const floaters = [];
function spawnDamageNumber(worldPos, amount, kind) {
  if (!fxLayer) return;
  const el = document.createElement('div');
  el.className = 'dmg ' + (kind || '');
  el.textContent = Math.round(amount);
  fxLayer.appendChild(el);
  floaters.push({
    el, pos: worldPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 3.2, 0)),
    vy: 2.0, t: 0, dur: 0.95,
  });
}
function updateFloaters() {
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.t += 0.016; f.pos.y += f.vy * 0.016;
    const v = f.pos.clone().project(camera);
    if (v.z > 1) { f.el.style.display = 'none'; }
    else {
      const x = (v.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
      f.el.style.display = 'block';
      f.el.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) scale(${1 + (1 - f.t / f.dur) * 0.4})`;
      f.el.style.opacity = String(Math.max(0, 1 - f.t / f.dur));
    }
    if (f.t >= f.dur) { f.el.remove(); floaters.splice(i, 1); }
  }
}

// ---- Aim line for Q ----
const aimLine = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
  new THREE.LineBasicMaterial({ color: 0x8fe0ff, transparent: true, opacity: 0 })
);
aimLine.frustumCulled = false;
scene.add(aimLine);
function updateAim() {
  const qAb = player && player.abilities ? player.abilities.Q : null;
  const directional = qAb && (qAb.type === 'projectile' || qAb.type === 'dash');
  if (!started || !player || !player.alive || gameEnded || (player.abilityLevels.Q || 0) < 1 || !directional) {
    aimLine.material.opacity = 0; return;
  }
  const a = scaleAbility(qAb, player.abilityLevels.Q);
  const dir = new THREE.Vector3().subVectors(pointerWorld, player.pos).setY(0);
  if (dir.lengthSq() < 0.01) { aimLine.material.opacity = 0; return; }
  dir.normalize();
  const from = player.pos.clone(); from.y = 2.2;
  const reach = a.range || 30;
  const to = from.clone().addScaledVector(dir, Math.min(reach, 34));
  const pos = aimLine.geometry.attributes.position;
  pos.setXYZ(0, from.x, from.y, from.z); pos.setXYZ(1, to.x, to.y, to.z); pos.needsUpdate = true;
  const ready = player.cdQ <= 0 && player.mana >= a.manaCost;
  aimLine.material.opacity = ready ? 0.6 : 0.18;
  aimLine.material.color.setHex(ready ? 0x8fe0ff : 0x5e7a88);
}

// ---- Input ----
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const pointerWorld = new THREE.Vector3();

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
  if (!started || !player || !player.alive || gameEnded) return;
  const hit = screenToGround(e.clientX, e.clientY);
  if (!hit) return;
  const foe = nearestEnemyAtPoint(hit, 3.5);
  if (foe) { player.attackTarget = foe; player.target = null; }
  else { player.target = hit.clone(); player.attackTarget = null; }
});
renderer.domElement.addEventListener('pointermove', (e) => {
  const hit = screenToGround(e.clientX, e.clientY);
  if (hit) pointerWorld.copy(hit);
});

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'b' && started) { ui.toggleShop(); return; }
  if (!started || gameEnded || !player || !player.alive) return;
  if (e.shiftKey && (k === 'q' || k === 'w' || k === 'e')) { levelAbility(player, k.toUpperCase()); return; }
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

// ---- Progression ----
function levelAbility(hero, key) {
  if (hero.skillPoints <= 0) { if (hero === player) ui.showToast('Нет очков умений — получи уровень', 1.3); return; }
  if (hero.abilityLevels[key] >= MAX_ABILITY_LEVEL) { if (hero === player) ui.showToast('Способность уже максимальна', 1.2); return; }
  hero.abilityLevels[key]++;
  hero.skillPoints--;
  if (hero === player) { ui.showToast(`${ABILITIES[key].name} прокачан до ур.${hero.abilityLevels[key]}`, 1.3); refreshHud(); }
}

function applyItemStats(hero, stats, sign = 1) {
  for (const [k, v] of Object.entries(stats)) {
    const delta = v * sign;
    if (k === 'maxHp') { hero.maxHp += delta; hero.hp += delta; }
    else if (k === 'maxMana') { hero.maxMana += delta; hero.mana += delta; }
    else if (k === 'moveSpeed') {
      hero.baseMoveSpeed += delta;
      if (hero.buffE <= 0) hero.moveSpeed = hero.baseMoveSpeed; else hero.moveSpeed += delta;
    } else { hero[k] = (hero[k] || 0) + delta; }
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
  hero.gold -= item.cost; hero.items.push(item.id);
  applyItemStats(hero, item.stats, 1);
  if (hero === player) { ui.showToast(`Куплено: ${item.name}`, 1.2); refreshHud(); }
  return true;
}

ui.callbacks = {
  onBuy: (itemId) => { const it = ITEMS.find(i => i.id === itemId); if (it) buyItem(player, it); },
  onLevel: (key) => levelAbility(player, key),
};

function refreshHud() {
  if (!player) return;
  ui.updateHero(player); ui.updateAbilities(player); ui.updateInventory(player);
  ui.renderShop(ITEMS, player, nearOwnFountain(player));
}

// ---- Abilities (unified for player & AI) ----
function teamHex(team) { return team === 'radiant' ? 0x66ccff : 0xff7755; }

function castForHero(hero, key, aimPos, isPlayer) {
  const lvl = hero.abilityLevels[key] || 0;
  const ab = hero.abilities[key];
  if (lvl < 1) { if (isPlayer) ui.showToast(`Способность не изучена — нажми ${key === 'Q' ? '1' : key === 'W' ? '2' : '3'}`, 1.8); return false; }
  const s = scaleAbility(ab, lvl);
  const cdKey = 'cd' + key;
  if (hero[cdKey] > 0) { if (isPlayer) ui.showToast('На перезарядке', 0.8); return false; }
  if (hero.mana < s.manaCost) { if (isPlayer) ui.showToast('Недостаточно маны', 1); return false; }
  const col = teamHex(hero.team);
  const dir = new THREE.Vector3().subVectors(aimPos, hero.pos).setY(0);

  fx.spawnCastCircle(hero.pos, hero.accent);

  switch (ab.type) {
    case 'projectile': {
      if (dir.lengthSq() < 0.01) return false;
      dir.normalize(); hero.mesh.rotation.y = Math.atan2(dir.x, dir.z);
      fx.spawnBolt(hero, dir, entities, s.damage, { speed: s.speed, range: s.range, slow: ab.slow });
      break;
    }
    case 'aoe': {
      fx.spawnCastFlash(hero.pos, col);
      fx.spawnNova(hero, s.radius);
      for (const e of entities) {
        if (e.alive && e.team !== hero.team && e.team !== 'neutral' && hero.pos.distanceTo(e.pos) <= s.radius)
          applyDamage(e, s.damage, hero);
      }
      break;
    }
    case 'buff_speed': {
      fx.spawnCastFlash(hero.pos, hero.accent);
      hero.buffE = s.duration;
      hero.moveSpeed = hero.baseMoveSpeed + s.speedBonus;
      if (isPlayer) ui.showToast('Ускорение!', 1);
      break;
    }
    case 'buff_guard': {
      fx.spawnCastFlash(hero.pos, hero.accent);
      if (hero.guardT > 0) hero.armor -= (hero.guardBonus || 0);
      hero.guardBonus = s.armorBonus; hero.armor += s.armorBonus;
      hero.guardHeal = s.healPerSec; hero.guardT = s.duration;
      if (isPlayer) ui.showToast('Бастион: +броня и лечение', 1.2);
      break;
    }
    case 'dash': {
      if (dir.lengthSq() < 0.01) return false;
      const dist = Math.min(s.range, dir.length()); dir.normalize();
      hero.mesh.rotation.y = Math.atan2(dir.x, dir.z);
      const to = hero.pos.clone().addScaledVector(dir, dist);
      hero.dash = { from: hero.pos.clone(), to, dur: 0.2, t: 0, damage: s.damage, radius: s.radius, ghostT: 0 };
      hero.target = null; hero.attackTarget = null;
      break;
    }
    case 'blink': {
      if (dir.lengthSq() < 0.01) return false;
      const dist = Math.min(s.range, dir.length()); dir.normalize();
      fx.spawnCastFlash(hero.pos, hero.accent);
      hero.pos.addScaledVector(dir, dist);
      fx.spawnCastFlash(hero.pos, hero.accent);
      hero.target = null; hero.attackTarget = null;
      break;
    }
  }
  hero.mana -= s.manaCost;
  hero[cdKey] = s.cooldown;
  if (hero.isGLTF) playHeroAnim(hero, ab.type === 'dash' ? 'attack' : 'cast', 0.7);
  if (isPlayer) ui.flashAbility(key);
  return true;
}

function castAbility(key) { castForHero(player, key, pointerWorld, true); }

function updateDash(hero, dt) {
  const d = hero.dash;
  d.t += dt;
  const k = Math.min(1, d.t / d.dur);
  hero.pos.lerpVectors(d.from, d.to, k);
  d.ghostT -= dt;
  if (d.ghostT <= 0) { fx.spawnGhost(hero.pos, hero.accent); d.ghostT = 0.04; }
  if (k >= 1) {
    fx.spawnCastFlash(hero.pos, hero.accent);
    for (const e of entities) {
      if (e.alive && e.team !== hero.team && e.team !== 'neutral' && hero.pos.distanceTo(e.pos) <= d.radius)
        applyDamage(e, d.damage, hero);
    }
    hero.dash = null;
  }
}

// ---- Combat ----
function attack(attacker, target) {
  if (attacker.attackCd > 0 || !target.alive) return;
  attacker.attackCd = 1 / attacker.attackSpeed;
  attacker.atkAnim = 0.25;
  if (attacker.isGLTF) playHeroAnim(attacker, 'attack', Math.min(0.7, 1 / attacker.attackSpeed));
  if (attacker.attackType === 'ranged') {
    fx.spawnBasic(attacker, target, attacker.attackDamage, attacker.team === 'radiant' ? 0x8fd0ff : 0xffb088);
  } else {
    applyDamage(target, attacker.attackDamage, attacker);
    if (attacker.kind === 'hero' || attacker.kind === 'creep')
      fx.spawnHit(target.pos, attacker.team === 'dire' ? 0xff9966 : 0xbfe6ff);
  }
}

function applyDamage(target, amount, attacker) {
  const wasAlive = target.alive;
  target.takeDamage(amount, attacker);
  const kind = target === player ? 'taken' : (attacker === player ? 'player' : 'normal');
  spawnDamageNumber(target.pos, amount, kind);
  if (wasAlive && !target.alive) onKill(target, attacker);
}

function grantXp(hero, amount) {
  hero.xp += amount;
  const newLevel = Math.min(MAX_LEVEL, 1 + Math.floor(hero.xp / XP_PER_LEVEL));
  while (hero.level < newLevel) {
    hero.level++;
    hero.maxHp += 55; hero.hp += 55; hero.maxMana += 20; hero.mana += 20;
    hero.attackDamage += 6; hero.skillPoints++;
    if (hero === player) ui.showToast(`Уровень ${hero.level}! +1 очко умений`, 1.6);
    else spendEnemySkillPoints(hero);
  }
  if (hero === player) refreshHud();
}

function spendEnemySkillPoints(hero) {
  const order = ['Q', 'W', 'Q', 'E', 'Q', 'W', 'Q', 'W', 'E', 'W', 'E', 'E'];
  while (hero.skillPoints > 0) {
    let learned = false;
    for (const key of order) {
      if (hero.abilityLevels[key] < MAX_ABILITY_LEVEL) { hero.abilityLevels[key]++; hero.skillPoints--; learned = true; break; }
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
    hero.gold -= item.cost; hero.items.push(item.id);
    applyItemStats(hero, item.stats, 1); hero.aiBuyIndex++;
  }
}

const XP_RADIUS = 30;        // proximity XP range around a dying enemy unit
const GOLD_PER_SEC = 1.6;     // passive income so the shop is always reachable

// Gold to the last-hitter; XP to every opposing hero nearby; small assist gold if you were near but didn't last-hit.
function awardKillRewards(victim, killer) {
  const bounty = victim.goldBounty || 0;
  const xp = victim.xpBounty || 60;
  if (killer && killer.kind === 'hero') killer.gold += bounty;
  for (const h of [player, enemy]) {
    if (!h || !h.alive || h.team === victim.team) continue;
    if (h.pos.distanceTo(victim.pos) > XP_RADIUS) continue;
    grantXp(h, xp);
    let gained = 0;
    if (h === killer) gained = bounty;
    else { gained = Math.round(bounty * 0.4); h.gold += gained; }
    if (h === player && gained > 0) {
      const tag = victim.kind === 'neutral' ? 'лес' : victim.kind === 'tower' ? 'башня' : (h === killer ? 'ластхит' : 'рядом');
      ui.showToast(`+${gained} золота (${tag})`, 0.8);
    }
  }
}

function onKill(victim, killer) {
  if (victim.kind === 'creep' || victim.kind === 'tower' || victim.kind === 'neutral') {
    awardKillRewards(victim, killer);
    if (victim.kind === 'tower') ui.showToast(killer === player ? 'Башня уничтожена! +золото' : 'Наша башня пала', 1.8);
    victim.dying = true; victim.deathT = 0;
  } else if (victim.kind === 'hero') {
    if (killer && killer.kind === 'hero') {
      killer.kills++; killer.gold += 250; grantXp(killer, 180);
      ui.showToast(killer === player ? 'Убийство героя! +250' : `${player.name} убит`, 2);
    }
    victim.deaths++;
    victim.respawnTimer = HERO_RESPAWN + victim.level * 1.5;
    victim.dying = true; victim.deathT = 0;
  } else if (victim.kind === 'base') {
    victim.dying = true; victim.deathT = 0;
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
  hero.dying = false; hero.deathT = 0;
  hero.mesh.visible = true; hero.mesh.scale.setScalar(1); hero.mesh.rotation.z = 0;
  const base = hero.team === 'radiant' ? WORLD.radiantBase : WORLD.direBase;
  hero.pos.set(base.x + (Math.random() - 0.5) * 6, 0, base.z + (Math.random() - 0.5) * 6);
  hero.mesh.position.copy(hero.pos);
  hero.target = null; hero.attackTarget = null;
  hero.dash = null; hero.slowT = 0;
  if (hero.guardT > 0) { hero.armor -= (hero.guardBonus || 0); hero.guardBonus = 0; hero.guardT = 0; }
  if (hero.isGLTF) {
    for (const k in hero.actions) hero.actions[k].stop();
    hero._deathStarted = false; hero.oneShotT = 0; hero.currentKey = 'idle';
    if (hero.actions.idle) hero.actions.idle.reset().play();
  }
  hero.setHpBar();
}

// ---- Creep waves ----
function spawnWave() {
  for (const team of [TEAM.RADIANT, TEAM.DIRE]) {
    const base = team === 'radiant' ? WORLD.radiantBase : WORLD.direBase;
    for (let i = 0; i < CREEP.perWave; i++) {
      add(createCreep(team, base.x + (Math.random() - 0.5) * 6, base.z + (Math.random() - 0.5) * 6));
    }
  }
}

// ---- Jungle camps ----
function spawnCamp(camp) {
  for (let i = 0; i < camp.size; i++) {
    const ang = (i / camp.size) * Math.PI * 2;
    const n = createNeutral(camp.x + Math.cos(ang) * 2.6, camp.z + Math.sin(ang) * 2.6);
    camp.members.push(n); add(n);
  }
  camp.respawnTimer = 0;
}
function updateCamps(dt) {
  for (const camp of camps) {
    const cleared = camp.members.length > 0 && camp.members.every(m => !m.alive);
    if (cleared) {
      camp.respawnTimer += dt;
      if (camp.respawnTimer >= NEUTRAL.respawn) { camp.members = []; spawnCamp(camp); }
    }
    for (const n of camp.members) if (n.alive) updateNeutral(n, entities, attack);
  }
}

// ---- Lifecycle ----
function initHero(hero) {
  hero.cdQ = 0; hero.cdW = 0; hero.cdE = 0; hero.buffE = 0;
  hero.abilityLevels = { Q: 0, W: 0, E: 0 };
  hero.skillPoints = 1; hero.items = []; hero.aiBuyIndex = 0; hero._ghostT = 0;
  hero.dash = null; hero.guardT = 0; hero.guardBonus = 0; hero.slowT = 0;
}

function lanePoint(t) {
  return {
    x: WORLD.radiantBase.x + (WORLD.direBase.x - WORLD.radiantBase.x) * t,
    z: WORLD.radiantBase.z + (WORLD.direBase.z - WORLD.radiantBase.z) * t,
  };
}

function startGame(playerDefId) {
  const playerDef = getHeroDef(playerDefId);
  const others = HERO_DEFS.filter(h => h.id !== playerDef.id);
  const enemyDef = others[Math.floor(Math.random() * others.length)];

  add(createBase(TEAM.RADIANT, WORLD.radiantBase.x, WORLD.radiantBase.z));
  add(createBase(TEAM.DIRE, WORLD.direBase.x, WORLD.direBase.z));
  const t = [lanePoint(0.18), lanePoint(0.36), lanePoint(0.64), lanePoint(0.82)];
  add(createTower(TEAM.RADIANT, t[0].x, t[0].z));
  add(createTower(TEAM.RADIANT, t[1].x, t[1].z));
  add(createTower(TEAM.DIRE, t[2].x, t[2].z));
  add(createTower(TEAM.DIRE, t[3].x, t[3].z));

  player = add(createHero(TEAM.RADIANT, playerDef, heroAssets[playerDef.id]));
  player.pos.set(WORLD.radiantBase.x + 4, 0, WORLD.radiantBase.z + 4);
  player.mesh.position.copy(player.pos);
  initHero(player);

  enemy = add(createHero(TEAM.DIRE, enemyDef, heroAssets[enemyDef.id]));
  enemy.pos.set(WORLD.direBase.x - 4, 0, WORLD.direBase.z - 4);
  enemy.mesh.position.copy(enemy.pos);
  initHero(enemy);
  enemy.state = 'push';
  spendEnemySkillPoints(enemy);

  for (const c of CAMPS) { const camp = { ...c, members: [], respawnTimer: 0 }; camps.push(camp); spawnCamp(camp); }

  camera.position.copy(player.pos.clone().add(camOffset));
  ui.hideHeroSelect();
  ui.renderShop(ITEMS, player, nearOwnFountain(player));
  refreshHud();
  ui.showToast(`Ты — ${playerDef.name} (${playerDef.role}). Прокачай способность (1/2/3) и в бой!`, 5);

  clock.getDelta();
  started = true;
}

function updateCamera() {
  const desired = player.pos.clone().add(camOffset);
  camera.position.lerp(desired, 0.12);
  camera.lookAt(player.pos.x, 0, player.pos.z);
}

function tickCooldowns(hero, dt) {
  for (const k of ['cdQ', 'cdW', 'cdE']) hero[k] = Math.max(0, hero[k] - dt);
  if (hero.buffE > 0) { hero.buffE -= dt; if (hero.buffE <= 0) hero.moveSpeed = hero.baseMoveSpeed; }
  if (hero.slowT > 0) hero.slowT -= dt;
  if (hero.guardT > 0) {
    hero.guardT -= dt;
    hero.hp = Math.min(hero.maxHp, hero.hp + (hero.guardHeal || 0) * dt);
    if (hero.guardT <= 0) { hero.armor -= (hero.guardBonus || 0); hero.guardBonus = 0; }
  }
}

function regen(e, dt) {
  let hpReg = e.hpRegen || 0, mpReg = e.manaRegen || 0;
  if (e.kind === 'hero' && nearOwnFountain(e)) { hpReg += e.maxHp * 0.12; mpReg += e.maxMana * 0.1; }
  if (hpReg) e.hp = Math.min(e.maxHp, e.hp + hpReg * dt);
  if (mpReg) e.mana = Math.min(e.maxMana, e.mana + mpReg * dt);
}

function surgeTrail(hero, dt) {
  if (hero.buffE > 0) {
    hero._ghostT -= dt;
    if (hero._ghostT <= 0) { fx.spawnGhost(hero.pos, hero.accent); hero._ghostT = 0.07; }
  }
}

let idleAngle = 0, sceneTime = 0;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());
  sceneTime += dt;
  if (scene.userData.update) scene.userData.update(sceneTime);
  if (started && !gameEnded) update(dt);

  for (let i = entities.length - 1; i >= 0; i--) {
    const e = entities[i];
    animateEntityVisual(e, dt, camera);
    if (e.dying && e.deathT >= 0.5) {
      if (e.kind === 'hero') { if (!e.isGLTF) e.mesh.visible = false; }
      else { removeEntity(e); }
    }
  }

  updateFloaters();
  if (started) { updateAim(); updateCamera(); }
  else {
    idleAngle += dt * 0.15;
    camera.position.set(Math.sin(idleAngle) * 80, 90, Math.cos(idleAngle) * 80);
    camera.lookAt(0, 0, 0);
  }
  renderer.render(scene, camera);
}

function update(dt) {
  matchTime += dt;
  ui.updateTimer(matchTime);

  waveTimer -= dt;
  if (waveTimer <= 0) { spawnWave(); waveTimer = CREEP.spawnInterval; }

  for (const e of entities) { if (e.attackCd > 0) e.attackCd -= dt; if (e.slowT > 0 && e.kind !== 'hero') e.slowT -= dt; }
  if (player.alive) player.gold += GOLD_PER_SEC * dt;
  if (enemy.alive) enemy.gold += GOLD_PER_SEC * dt;

  if (player.alive) {
    tickCooldowns(player, dt); regen(player, dt); surgeTrail(player, dt);
    if (player.dash) {
      updateDash(player, dt);
    } else if (player.attackTarget && player.attackTarget.alive) {
      const d = player.distanceTo(player.attackTarget);
      if (d <= player.attackRange) {
        player.mesh.rotation.y = Math.atan2(player.attackTarget.pos.x - player.pos.x, player.attackTarget.pos.z - player.pos.z);
        attack(player, player.attackTarget);
      } else { moveToward(player, player.attackTarget.pos, dt, player.attackRange * 0.85); }
    } else if (player.target) {
      if (moveToward(player, player.target, dt, 0.6)) player.target = null;
    }
  } else {
    player.respawnTimer -= dt;
    if (player.respawnTimer <= 0) respawnHero(player);
  }

  if (enemy.alive) {
    tickCooldowns(enemy, dt); regen(enemy, dt); surgeTrail(enemy, dt); enemyAutoBuy(enemy);
    if (enemy.dash) updateDash(enemy, dt);
    else updateEnemyHero(enemy, { entities, player }, dt, attack, (key, aimPos) => castForHero(enemy, key, aimPos, false));
  } else {
    enemy.respawnTimer -= dt;
    if (enemy.respawnTimer <= 0) respawnHero(enemy);
  }

  for (const e of entities) {
    if (!e.alive) continue;
    if (e.kind === 'creep') updateCreep(e, entities, dt, attack);
    else if (e.kind === 'tower') updateTower(e, entities, dt, attack);
  }

  updateCamps(dt);
  fx.update(dt, entities, applyDamage);

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

animate();

(async () => {
  const loadingText = document.getElementById('loading-text');
  try {
    await preloadHeroes((done, total) => {
      if (loadingText) loadingText.textContent = `Загрузка моделей… ${done}/${total}`;
    });
  } catch (e) {
    console.error('Не удалось загрузить модели, использую запасные примитивы', e);
  }
  const ld = document.getElementById('loading');
  if (ld) ld.style.display = 'none';
  ui.showHeroSelect(HERO_DEFS, (id) => startGame(id));
})();
