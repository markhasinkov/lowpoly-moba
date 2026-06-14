import * as THREE from 'three';
import { createScene, populateScatter } from './scene.js';
import { createHero, createMob, animateEntityVisual, playHeroAnim } from './entities.js';
import { EffectSystem } from './abilities.js';
import { updateMob, moveToward } from './ai.js';
import { UI } from './ui.js';
import { preloadHeroes, preloadNature, heroAssets } from './assets.js';
import {
  HERO_DEFS, getHeroDef, WORLD, scaleAbility, MAX_ABILITY_LEVEL, MAX_ULT_LEVEL, MAX_LEVEL,
  HERO_RESPAWN, xpForLevel, MOB_TYPES, MOB_GRADES, bossForDepth, DUNGEON, GRADE_COLOR,
} from './config.js';
import { generateItem, rollDrop, rarityById } from './loot.js';
import { initInventory, recomputeStats, addToInventory, equipItem, unequip, isUpgrade } from './inventory.js';
import { POTION, SHOP_GEAR } from './config.js';
import { initAudio, resumeAudio, sfx } from './audio.js';

const { scene, renderer, camera } = createScene();
const ui = new UI();
const fx = new EffectSystem(scene);

const entities = [];
const groundItems = [];
const pendingStrikes = [];
const fireZones = [];
let player = null;
let boss = null;
let quests = [];
let depth = 1, mobsAlive = 0, portalActive = false;
let started = false, gameEnded = false, matchTime = 0, hudTimer = 0;
const clock = new THREE.Clock();
const keys = {};
let camYaw = 0;
const CAM_DIST = 34, CAM_HEIGHT = 27;

function add(e) { entities.push(e); scene.add(e.mesh); return e; }
function removeEntity(e) { scene.remove(e.mesh); const i = entities.indexOf(e); if (i >= 0) entities.splice(i, 1); }

// ---------- input ----------
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (k === 'i' && started) { ui.toggleInventory(player); return; }
  if (!started || gameEnded || !player || !player.alive) return;
  if (k === 'h') { drinkPotion(); return; }
  if (k === 'v') { ui.toggleShop(player, depth); return; }
  if (['1', '2', '3', '4'].includes(k)) {
    const slot = { '1': 'Q', '2': 'W', '3': 'E', '4': 'R' }[k];
    if (e.shiftKey) levelAbility(player, slot); else castAbility(slot);
  }
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
window.addEventListener('mousedown', (e) => {
  if (!started || gameEnded || !player || !player.alive) return;
  if (e.button === 0) manualAttack();
});

function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
function clampArena(p) {
  const d = Math.hypot(p.x, p.z);
  if (d > WORLD.radius - 2) { p.x *= (WORLD.radius - 2) / d; p.z *= (WORLD.radius - 2) / d; }
}
function facingPoint(range) {
  const a = player.mesh.rotation.y;
  return new THREE.Vector3(player.pos.x + Math.sin(a) * range, 0, player.pos.z + Math.cos(a) * range);
}

// ---------- progression ----------
function levelAbility(hero, key) {
  if (hero.skillPoints <= 0) { ui.showToast('Нет очков умений', 1.1); return; }
  const isUlt = key === 'R';
  const cap = isUlt ? MAX_ULT_LEVEL : MAX_ABILITY_LEVEL;
  const cur = hero.abilityLevels[key] || 0;
  if (cur >= cap) { ui.showToast('Уже максимум', 1.0); return; }
  if (isUlt) {
    const req = (hero.abilities.R.ultReq || 6) + cur * 5;
    if (hero.level < req) { ui.showToast(`Ульта откроется на ур.${req}`, 1.6); return; }
  }
  hero.abilityLevels[key]++;
  hero.skillPoints--;
  ui.showToast(`${hero.abilities[key].name} ур.${hero.abilityLevels[key]}`, 1.2);
  refreshHud();
}

function grantXp(amount) {
  player.xp += Math.round(amount * (1 + (player.xpGain || 0)));
  let leveled = false;
  while (player.level < MAX_LEVEL && player.xp >= xpForLevel(player.level)) {
    player.xp -= xpForLevel(player.level);
    player.level++; player.skillPoints++; leveled = true;
  }
  if (leveled) {
    recomputeStats(player);
    player.hp = player.maxHp; player.mana = player.maxMana;
    ui.showToast(`Уровень ${player.level}!`, 1.6);
    sfx('level');
  }
}

// ---------- combat ----------
function attack(attacker, target) {
  if (attacker.attackCd > 0 || !target.alive) return;
  attacker.attackCd = 1 / attacker.attackSpeed;
  if (attacker.isGLTF) playHeroAnim(attacker, 'attack', Math.min(0.7, 1 / attacker.attackSpeed));
  let dmg = attacker.attackDamage;
  const isCrit = (attacker.critChance || 0) > 0 && Math.random() < attacker.critChance;
  if (isCrit) dmg *= (attacker.critMult || 1.8);
  const col = attacker.team === 'player' ? 0x8fd0ff : 0xffb088;
  sfx(isCrit ? 'crit' : 'attack');
  if (attacker.attackType === 'ranged') {
    fx.spawnBasic(attacker, target, dmg, col);
  } else {
    applyDamage(target, dmg, attacker);
    fx.spawnHit(target.pos, attacker.team === 'player' ? 0xbfe6ff : 0xff9966);
  }
  if (isCrit) fx.spawnImpact(target.pos, 0xffe066);
  if ((attacker.lifesteal || 0) > 0 && attacker.alive) attacker.hp = Math.min(attacker.maxHp, attacker.hp + dmg * attacker.lifesteal);
}

function manualAttack() {
  if (player.dash) return;
  const t = nearestEnemy(player.pos, player.attackRange * 1.3);
  if (t) { player.mesh.rotation.y = Math.atan2(t.pos.x - player.pos.x, t.pos.z - player.pos.z); attack(player, t); }
}

function applyDamage(target, amount, attacker) {
  const wasAlive = target.alive;
  target.takeDamage(amount, attacker);
  if (target === player) sfx('hit');
  if (target.isGLTF && target.alive && target.actions && target.actions.hit && target.oneShotT <= 0 && (target._hitCd || 0) <= 0) {
    playHeroAnim(target, 'hit', 0.4); target._hitCd = 0.9;
  }
  spawnDamageNumber(target.pos, amount, target === player ? 'taken' : (attacker === player ? 'player' : 'normal'));
  if (wasAlive && !target.alive) onKill(target, attacker);
}

function nearestEnemy(pos, range) {
  let best = null, bd = range;
  for (const e of entities) {
    if (!e.alive || e.team !== 'enemy') continue;
    const d = Math.hypot(e.pos.x - pos.x, e.pos.z - pos.z);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function onKill(victim, killer) {
  if (victim === player) {
    player.respawnTimer = HERO_RESPAWN;
    player.dying = true; player.deathT = 0;
    return;
  }
  if (victim.team === 'enemy') {
    grantXp(victim.xpBounty || 0);
    player.gold += victim.goldBounty || 0;
    const item = rollDrop(victim.isBoss ? 1 : victim.dropChance, victim.itemLevel || depth, victim.rarityBonus || 0, victim.dropRarityMin || null);
    if (item) spawnGroundItem(item, victim.pos);
    sfx('death');
    if (item && item.rarity === 'legendary') questProgress('legend');
    if (victim.grade && victim.grade !== 'trash') questProgress('champ');
    if (victim.isBoss) questProgress('boss');
    victim.dying = true; victim.deathT = 0;
    if (victim.isBoss) { boss = null; ui.updateBossBar(null); }
    else mobsAlive = Math.max(0, mobsAlive - 1);
    checkClear();
    refreshHud();
  }
}

function initQuests() {
  quests = [
    { id: 'champ', desc: 'Убить элиту/чемпионов', type: 'champ', target: 5, progress: 0, done: false, gold: 250, xp: 350 },
    { id: 'boss', desc: 'Убить боссов', type: 'boss', target: 3, progress: 0, done: false, gold: 400, xp: 700 },
    { id: 'depth', desc: 'Достичь глубины 5', type: 'depth', target: 5, progress: 1, done: false, gold: 350, xp: 600 },
    { id: 'legend', desc: 'Найти легендарный предмет', type: 'legend', target: 1, progress: 0, done: false, gold: 600, xp: 1000 },
  ];
  if (ui.renderQuests) ui.renderQuests(quests);
}
function completeQuest(q) {
  q.done = true; player.gold += q.gold; grantXp(q.xp);
  ui.showToast(`Квест выполнен: ${q.desc} (+${q.gold}💰)`, 2.6, '#ffd863'); sfx('quest');
}
function questProgress(type, amount = 1) {
  for (const q of quests) { if (q.done || q.type !== type) continue; q.progress = Math.min(q.target, q.progress + amount); if (q.progress >= q.target) completeQuest(q); }
  if (ui.renderQuests) ui.renderQuests(quests);
}
function setQuestDepth() {
  for (const q of quests) { if (q.done || q.type !== 'depth') continue; q.progress = Math.max(q.progress, depth); if (q.progress >= q.target) completeQuest(q); }
  if (ui.renderQuests) ui.renderQuests(quests);
}

// ---------- abilities ----------
function castAbility(key) { castForHero(player, key); }

function castForHero(hero, key) {
  const lvl = hero.abilityLevels[key] || 0;
  const ab = hero.abilities[key];
  if (lvl < 1) { ui.showToast(`Не изучено (Shift+${key === 'Q' ? 1 : key === 'W' ? 2 : key === 'E' ? 3 : 4})`, 1.5); return; }
  const cdKey = 'cd' + key;
  if (hero[cdKey] > 0) { ui.showToast('Перезарядка', 0.7); return; }
  const s = scaleAbility(ab, lvl);
  if (s.damage) s.damage *= (1 + (hero.spellAmp || 0));
  if (hero.mana < ab.manaCost) { ui.showToast('Мало маны', 0.9); return; }
  const accent = hero.accent;
  const aim = facingPoint(Math.min(s.range || 20, 26));
  const dir = new THREE.Vector3(Math.sin(hero.mesh.rotation.y), 0, Math.cos(hero.mesh.rotation.y));
  fx.spawnCastCircle(hero.pos, accent);
  sfx(ab.type === 'ultimate_guard' || ab.type === 'meteor' || ab.type === 'blink_strike' ? 'ult' : 'cast');

  switch (ab.type) {
    case 'projectile':
      fx.spawnBolt(hero, dir, entities, s.damage, { speed: s.speed, range: s.range, slow: ab.slow });
      break;
    case 'aoe':
      fx.spawnNova(hero, s.radius);
      for (const e of entities) if (e.alive && e.team === 'enemy' && hero.pos.distanceTo(e.pos) <= s.radius) {
        applyDamage(e, s.damage, hero);
        if (ab.slow) { e.slowT = ab.slow.dur; e.slowFactor = ab.slow.factor; }
      }
      break;
    case 'buff_speed':
      fx.spawnCastFlash(hero.pos, accent);
      hero.buffE = s.duration; hero.moveSpeed = hero.baseMoveSpeed + s.speedBonus;
      break;
    case 'buff_guard':
      fx.spawnCastFlash(hero.pos, accent);
      if (hero.guardT > 0) hero.armor -= (hero.guardBonus || 0);
      hero.guardBonus = s.armorBonus; hero.armor += s.armorBonus;
      hero.guardHeal = s.healPerSec; hero.guardT = s.duration;
      break;
    case 'dash': {
      const dist = Math.min(s.range, 22);
      const to = hero.pos.clone().addScaledVector(dir, dist);
      hero.dash = { from: hero.pos.clone(), to, dur: 0.2, t: 0, damage: s.damage, radius: s.radius, ghostT: 0 };
      break;
    }
    case 'blink':
      fx.spawnCastFlash(hero.pos, accent);
      hero.pos.addScaledVector(dir, Math.min(s.range, 28)); clampArena(hero.pos);
      fx.spawnCastFlash(hero.pos, accent);
      break;
    case 'ultimate_guard':
      fx.spawnCastFlash(hero.pos, accent); fx.spawnNova(hero, s.radius);
      for (const e of entities) if (e.alive && e.team === 'enemy' && hero.pos.distanceTo(e.pos) <= s.radius) {
        applyDamage(e, s.damage, hero);
        if (ab.slow) { e.slowT = ab.slow.dur; e.slowFactor = ab.slow.factor; }
      }
      if (hero.guardT > 0) hero.armor -= (hero.guardBonus || 0);
      hero.guardBonus = s.armorBonus; hero.armor += s.armorBonus;
      hero.guardHeal = s.healPerSec; hero.guardT = s.duration;
      ui.showToast('НЕСОКРУШИМЫЙ!', 1.3);
      break;
    case 'meteor': {
      const tp = hero.pos.clone().addScaledVector(dir, Math.min(s.range, 30));
      fx.spawnCastCircle(tp, accent);
      pendingStrikes.push({ pos: tp, t: ab.delay || 1.1, radius: s.radius, damage: s.damage, slow: ab.slow, color: accent, owner: hero });
      ui.showToast('Метеор!', 1.0);
      break;
    }
    case 'blink_strike': {
      hero.pos.addScaledVector(dir, Math.min(s.range, 26)); clampArena(hero.pos);
      fx.spawnCastFlash(hero.pos, accent);
      const t = nearestEnemy(hero.pos, s.radius);
      if (t) { fx.spawnImpact(t.pos, accent); applyDamage(t, s.damage, hero); }
      hero.buffE = Math.max(hero.buffE || 0, s.duration); hero.moveSpeed = hero.baseMoveSpeed + (s.speedBonus || 5);
      ui.showToast('ЖАТВА!', 1.3);
      break;
    }
  }
  hero.mana -= ab.manaCost;
  hero[cdKey] = ab.cooldown * (1 - Math.min(0.6, hero.cdr || 0));
  if (hero.isGLTF) playHeroAnim(hero, ab.type === 'dash' || ab.type === 'blink_strike' ? 'attack' : 'cast', 0.7);
  ui.flashAbility(key);
}

function updateDash(hero, dt) {
  const d = hero.dash; d.t += dt;
  const k = Math.min(1, d.t / d.dur);
  hero.pos.lerpVectors(d.from, d.to, k); clampArena(hero.pos);
  d.ghostT -= dt;
  if (d.ghostT <= 0) { fx.spawnGhost(hero.pos, hero.accent); d.ghostT = 0.04; }
  if (k >= 1) {
    fx.spawnCastFlash(hero.pos, hero.accent);
    for (const e of entities) if (e.alive && e.team === 'enemy' && hero.pos.distanceTo(e.pos) <= d.radius) applyDamage(e, d.damage, hero);
    hero.dash = null;
  }
}

// ---------- loot on ground ----------
function spawnGroundItem(item, pos) {
  const g = new THREE.Group();
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 0),
    new THREE.MeshStandardMaterial({ color: item.hex, emissive: item.hex, emissiveIntensity: 1.0, flatShading: true }));
  gem.position.y = 1.4; g.add(gem);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 5, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: item.hex, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
  beam.position.y = 2.6; g.add(beam);
  g.position.set(pos.x, 0, pos.z);
  scene.add(g);
  groundItems.push({ item, mesh: g, gem, pos: new THREE.Vector3(pos.x, 0, pos.z) });
}

function updateGroundItems(dt) {
  for (let i = groundItems.length - 1; i >= 0; i--) {
    const gi = groundItems[i];
    gi.gem.rotation.y += dt * 2;
    if (player.alive && Math.hypot(player.pos.x - gi.pos.x, player.pos.z - gi.pos.z) < 3.2) {
      if (addToInventory(player, gi.item)) {
        const up = isUpgrade(player, gi.item);
        ui.showToast(`${gi.item.name}${up ? ' ⬆' : ''}`, 1.6, gi.item.color);
        sfx('pickup');
        scene.remove(gi.mesh); groundItems.splice(i, 1);
        if (ui.isInventoryOpen()) ui.refreshInventory(player);
      }
    }
  }
}

// ---------- delayed strikes & fire zones ----------
function resolveStrike(st) {
  fx.spawnImpact(st.pos, st.color); fx.spawnCastFlash(st.pos, st.color);
  for (const e of entities) {
    if (!e.alive) continue;
    if (st.target === 'player' && e !== player) continue;
    if (st.target !== 'player' && e.team !== 'enemy') continue;
    if (Math.hypot(e.pos.x - st.pos.x, e.pos.z - st.pos.z) <= st.radius) {
      applyDamage(e, st.damage, st.owner);
      if (st.slow) { e.slowT = st.slow.dur; e.slowFactor = st.slow.factor; }
    }
  }
}
function spawnFireZone(pos, r, dur, dps) {
  const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 20),
    new THREE.MeshBasicMaterial({ color: 0xff5520, transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
  disc.rotation.x = -Math.PI / 2; disc.position.set(pos.x, 0.2, pos.z);
  scene.add(disc);
  fireZones.push({ mesh: disc, pos: new THREE.Vector3(pos.x, 0, pos.z), r, t: dur, dps, tick: 0 });
}
function updateHazards(dt) {
  for (let i = pendingStrikes.length - 1; i >= 0; i--) {
    const st = pendingStrikes[i]; st.t -= dt;
    if (st.t <= 0) { resolveStrike(st); pendingStrikes.splice(i, 1); }
  }
  for (let i = fireZones.length - 1; i >= 0; i--) {
    const fzz = fireZones[i]; fzz.t -= dt; fzz.tick -= dt;
    if (fzz.tick <= 0 && player.alive && Math.hypot(player.pos.x - fzz.pos.x, player.pos.z - fzz.pos.z) <= fzz.r) {
      applyDamage(player, fzz.dps, boss || null); fzz.tick = 0.5;
    }
    if (fzz.t <= 0) { scene.remove(fzz.mesh); fireZones.splice(i, 1); }
  }
}

// ---------- boss mechanics ----------
function updateBossMechanics(b, dt) {
  b._mt = (b._mt || 0) + dt;
  const hpPct = b.hp / b.maxHp;
  const mech = b.mechanic;
  b._slamT = (b._slamT || 0) - dt;
  b._barrageT = (b._barrageT || 0) - dt;
  b._fireT = (b._fireT || 0) - dt;
  const slam = () => {
    const tp = player.pos.clone();
    fx.spawnCastCircle(tp, 0xff5530);
    pendingStrikes.push({ pos: tp, t: 1.0, radius: 8, damage: b.attackDamage * 2.2, color: 0xff5530, owner: b, target: 'player' });
  };
  const barrage = () => {
    for (let i = 0; i < 3; i++) setTimeout(() => { if (b.alive && player.alive) fx.spawnBasic(b, player, b.attackDamage * 0.8, 0xff7755); }, i * 180);
  };
  const fires = () => { for (let i = 0; i < 3; i++) { const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * 10; spawnFireZone({ x: player.pos.x + Math.cos(a) * r, z: player.pos.z + Math.sin(a) * r }, 5, 5, b.attackDamage * 0.4); } };

  if (mech === 'slam' && b._slamT <= 0) { b._slamT = 4.5; slam(); }
  else if (mech === 'barrage' && b._barrageT <= 0) { b._barrageT = 2.6; barrage(); }
  else if (mech === 'firezones') { if (b._fireT <= 0) { b._fireT = 5; fires(); } if (b._slamT <= 0) { b._slamT = 6; slam(); } }
  else if (mech === 'phases') {
    if (b._slamT <= 0) { b._slamT = hpPct < 0.3 ? 2.8 : 4.5; slam(); }
    if (hpPct < 0.6 && b._barrageT <= 0) { b._barrageT = 3.2; barrage(); }
    if (hpPct < 0.3 && b._fireT <= 0) { b._fireT = 5; fires(); if (!b._enraged) { b._enraged = true; b.attackSpeed *= 1.5; ui.showToast('Босс в ярости!', 1.6); } }
  }
}

// ---------- dungeon ----------
function clearEnemies() {
  for (let i = entities.length - 1; i >= 0; i--) if (entities[i].team === 'enemy') removeEntity(entities[i]);
  for (const fzz of fireZones) scene.remove(fzz.mesh);
  fireZones.length = 0; pendingStrikes.length = 0;
}

function mobSpec(type, grade, x, z) {
  const g = MOB_GRADES[grade];
  const hpScale = 1 + depth * DUNGEON.hpPerDepth;
  const dmgScale = 1 + depth * DUNGEON.dmgPerDepth;
  return {
    model: type.model, x, z,
    grade, projectile: type.projectile || null,
    hp: Math.round(type.maxHp * g.hpMul * hpScale),
    attackDamage: Math.round(type.attackDamage * g.dmgMul * dmgScale),
    attackRange: type.attackRange, attackSpeed: type.attackSpeed,
    armor: type.armor + depth * 0.4, moveSpeed: type.moveSpeed, attackType: type.attackType,
    scale: g.scale, tint: g.tint,
    name: (g.name ? g.name + ' ' : '') + type.name,
    xp: Math.round(type.xp * (g.hpMul * 0.5 + 0.5)), gold: Math.round(type.gold * (g.hpMul * 0.5 + 0.5)),
    dropChance: g.dropChance, rarityBonus: g.rarityBonus, itemLevel: depth,
  };
}
function bossSpec(b, x, z) {
  return {
    model: b.model, x, z, isBoss: true, scale: b.scale,
    hp: Math.round(b.maxHp * (1 + depth * 0.12)), attackDamage: Math.round(b.attackDamage * (1 + depth * 0.1)),
    attackRange: b.attackRange, attackSpeed: b.attackSpeed, armor: b.armor, moveSpeed: b.moveSpeed,
    attackType: b.attackType || 'melee', name: b.name, xp: b.xp, gold: b.gold,
    dropChance: 1, rarityBonus: 3, itemLevel: depth + 2, dropRarityMin: b.dropRarityMin,
    mechanic: b.mechanic, tint: GRADE_COLOR[b.grade], gradeColor: GRADE_COLOR[b.grade],
  };
}

function spawnDungeon() {
  clearEnemies();
  portalActive = false;
  const count = Math.floor(DUNGEON.baseMobCount + depth * DUNGEON.mobPerDepth);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, r = 18 + Math.random() * (WORLD.radius - 24);
    let grade = 'trash';
    const roll = Math.random();
    if (roll > 0.96 - depth * 0.01) grade = 'champion';
    else if (roll > 0.82 - depth * 0.01) grade = 'elite';
    const type = MOB_TYPES[(Math.random() * MOB_TYPES.length) | 0];
    add(createMob(mobSpec(type, grade, Math.cos(a) * r, Math.sin(a) * r)));
  }
  mobsAlive = count;
  const b = bossForDepth(depth);
  boss = add(createMob(bossSpec(b, WORLD.portal.x, WORLD.portal.z - 6)));
  ui.updateBossBar(boss);
  sfx('boss');
  ui.showToast(`Глубина ${depth} — ${b.name} ждёт. Зачисти и войди в портал.`, 4);
  refreshHud();
  setQuestDepth();
}

function checkClear() {
  if (mobsAlive <= 0 && !boss) { portalActive = true; player.hp = player.maxHp; player.mana = player.maxMana; player.potions = POTION.max; sfx('portal'); ui.showToast('Глубина зачищена! Портал открыт ↓ (зелья пополнены)', 3); }
}

// ---------- floaters (DOM damage numbers) ----------
const floaters = [];
function spawnDamageNumber(pos, amount, kind) {
  const el = document.createElement('div');
  el.className = 'dmg ' + (kind || '');
  el.textContent = Math.round(amount);
  const layer = document.getElementById('fx-layer');
  if (layer) layer.appendChild(el);
  floaters.push({ el, pos: pos.clone(), t: 0 });
}
function updateFloaters(dt) {
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i]; f.t += dt;
    const p = f.pos.clone().add(new THREE.Vector3(0, 6, 0)); p.project(camera);
    const x = (p.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-p.y * 0.5 + 0.5) * window.innerHeight - f.t * 46;
    f.el.style.transform = `translate(${x}px, ${y}px)`;
    f.el.style.opacity = Math.max(0, 1 - f.t / 0.9);
    if (f.t > 0.9) { f.el.remove(); floaters.splice(i, 1); }
  }
}

// ---------- per-frame hero upkeep ----------
function tickCooldowns(hero, dt) {
  for (const k of ['cdQ', 'cdW', 'cdE', 'cdR']) hero[k] = Math.max(0, hero[k] - dt);
  if (hero._hitCd > 0) hero._hitCd -= dt;
  if (hero.potionCd > 0) hero.potionCd -= dt;
  if (hero.buffE > 0) { hero.buffE -= dt; if (hero.buffE <= 0) hero.moveSpeed = hero.baseMoveSpeed; }
  if (hero.slowT > 0) hero.slowT -= dt;
  if (hero.guardT > 0) {
    hero.guardT -= dt;
    hero.hp = Math.min(hero.maxHp, hero.hp + (hero.guardHeal || 0) * dt);
    if (hero.guardT <= 0) { hero.armor -= (hero.guardBonus || 0); hero.guardBonus = 0; }
  }
}

function drinkPotion() {
  if (!player || !player.alive) return;
  if (player.potions <= 0) { ui.showToast('Нет зелий', 0.9); return; }
  if (player.potionCd > 0) { ui.showToast('Зелье ещё не готово', 0.9); return; }
  if (player.hp >= player.maxHp) { ui.showToast('Здоровье полное', 0.9); return; }
  player.hp = Math.min(player.maxHp, player.hp + player.maxHp * POTION.heal);
  player.potions--; player.potionCd = POTION.cooldown;
  fx.spawnCastFlash(player.pos, 0x4fd66b); sfx('pickup'); refreshHud();
}
function buyPotion() {
  if (player.gold < POTION.cost) { ui.showToast('Мало золота', 1); return; }
  if (player.potions >= POTION.max) { ui.showToast('Зелья полны', 1); return; }
  player.gold -= POTION.cost; player.potions++; sfx('pickup'); refreshHud(); ui.renderShop(player, depth);
}
function buyGear(tier) {
  const g = SHOP_GEAR[tier]; if (!g) return;
  const cost = Math.round(g.cost * (1 + depth * 0.12));
  if (player.gold < cost) { ui.showToast('Мало золота', 1); return; }
  player.gold -= cost;
  const item = generateItem(depth + 1, Math.random, g.bonus);
  addToInventory(player, item);
  ui.showToast(`Куплено: ${item.name}`, 1.8, item.color); sfx('pickup');
  refreshHud(); ui.renderShop(player, depth); if (ui.isInventoryOpen()) ui.refreshInventory(player);
}
function regen(e, dt) {
  if (e.hpRegen) e.hp = Math.min(e.maxHp, e.hp + e.hpRegen * dt);
  if (e.manaRegen) e.mana = Math.min(e.maxMana, e.mana + e.manaRegen * dt);
}

// ---------- movement & camera ----------
function handleMovement(dt) {
  if (player.dash) return;
  const f = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
  const r = new THREE.Vector3(f.z, 0, -f.x);
  const mv = new THREE.Vector3();
  if (keys['w']) mv.add(f);
  if (keys['s']) mv.sub(f);
  if (keys['d']) mv.add(r);
  if (keys['a']) mv.sub(r);
  let turning = false;
  if (keys['q']) { camYaw += 1.8 * dt; turning = true; }
  if (keys['e']) { camYaw -= 1.8 * dt; turning = true; }
  if (mv.lengthSq() > 0.001) {
    mv.normalize();
    const spd = player.slowT > 0 ? player.moveSpeed * (player.slowFactor || 0.5) : player.moveSpeed;
    player.pos.x += mv.x * spd * dt; player.pos.z += mv.z * spd * dt;
    clampArena(player.pos);
    const heading = Math.atan2(mv.x, mv.z);
    player.mesh.rotation.y = heading;
    if (!turning) camYaw = lerpAngle(camYaw, heading, 1 - Math.pow(0.0009, dt));
    player.moving = true;
  } else {
    player.moving = false;
  }
}
function updateCamera(dt) {
  const f = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
  const desired = player.pos.clone().addScaledVector(f, -CAM_DIST); desired.y = CAM_HEIGHT;
  camera.position.lerp(desired, 1 - Math.pow(0.0025, dt));
  camera.lookAt(player.pos.x, 2.5, player.pos.z);
}

function refreshHud() { if (player) { ui.updateHud(player, depth); ui.updateAbilities(player); } }

function respawnPlayer() {
  player.hp = player.maxHp; player.mana = player.maxMana; player.alive = true;
  player.dying = false; player.deathT = 0; player.mesh.visible = true; player.mesh.scale.setScalar(1); player.mesh.rotation.z = 0;
  player.pos.set(0, 0, 8); player.mesh.position.copy(player.pos);
  if (player.isGLTF) { for (const k in player.actions) player.actions[k].stop(); player._deathStarted = false; player.oneShotT = 0; player.currentKey = 'idle'; if (player.actions.idle) player.actions.idle.reset().play(); }
  player.setHpBar();
}

// ---------- lifecycle ----------
function startGame(defId) {
  const def = getHeroDef(defId);
  player = add(createHero('player', def, heroAssets[defId]));
  player.pos.set(0, 0, 8); player.mesh.position.copy(player.pos);
  player.cdQ = 0; player.cdW = 0; player.cdE = 0; player.cdR = 0;
  player.abilityLevels = { Q: 0, W: 0, E: 0, R: 0 };
  player.skillPoints = 1; player.buffE = 0; player.guardT = 0; player.guardBonus = 0; player.slowT = 0;
  player.level = 1; player.xp = 0; player.gold = 0;
  initInventory(player, def);
  recomputeStats(player);
  player.hp = player.maxHp; player.mana = player.maxMana;
  player.potions = POTION.startCharges; player.potionCd = 0;
  ui.callbacks = {
    onEquip: (item) => { equipItem(player, item); ui.refreshInventory(player); refreshHud(); },
    onUnequip: (slot) => { unequip(player, slot); ui.refreshInventory(player); refreshHud(); },
    onLevelAbility: (key) => levelAbility(player, key),
    onBuyPotion: () => buyPotion(),
    onBuyGear: (tier) => buyGear(tier),
  };
  depth = 1;
  initAudio(); resumeAudio(); initQuests();
  spawnDungeon();
  camYaw = 0;
  ui.hideClassSelect();
  refreshHud();
  ui.showToast(`Ты — ${def.name}. WASD двигаться, Q/E поворот, ЛКМ атака, 1-4 умения, I инвентарь.`, 6);
  clock.getDelta();
  started = true;
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());
  matchTime += dt;
  if (scene.userData.update) scene.userData.update(matchTime);
  if (started && !gameEnded) update(dt);
  for (let i = entities.length - 1; i >= 0; i--) {
    const e = entities[i];
    animateEntityVisual(e, dt, camera);
    if (e.dying && e.deathT >= 0.5) {
      if (e === player) { if (!e.isGLTF) e.mesh.visible = false; }
      else removeEntity(e);
    }
  }
  updateFloaters(dt);
  if (started) updateCamera(dt);
  else { camera.position.set(Math.sin(matchTime * 0.15) * 70, 60, Math.cos(matchTime * 0.15) * 70); camera.lookAt(0, 0, 0); }
  renderer.render(scene, camera);
}

function update(dt) {
  if (player.alive) {
    handleMovement(dt);
    tickCooldowns(player, dt); regen(player, dt);
    if (player.dash) updateDash(player, dt);
    else if (!player.moving) { const t = nearestEnemy(player.pos, player.attackRange); if (t) { player.mesh.rotation.y = Math.atan2(t.pos.x - player.pos.x, t.pos.z - player.pos.z); attack(player, t); } }
    if (player.buffE > 0) { player._ghostT = (player._ghostT || 0) - dt; if (player._ghostT <= 0) { fx.spawnGhost(player.pos, player.accent); player._ghostT = 0.07; } }
    if (portalActive && Math.hypot(player.pos.x - WORLD.portal.x, player.pos.z - WORLD.portal.z) < 6) { depth++; spawnDungeon(); }
  } else {
    player.respawnTimer -= dt;
    if (player.respawnTimer <= 0) respawnPlayer();
  }

  for (const e of entities) { if (e.attackCd > 0) e.attackCd -= dt; if (e._hitCd > 0) e._hitCd -= dt; if (e.slowT > 0 && e.team === 'enemy') e.slowT -= dt; }

  for (const e of entities) {
    if (!e.alive || e.team !== 'enemy') continue;
    if (e.isBoss) { updateMob(e, player, dt, attack); updateBossMechanics(e, dt); }
    else updateMob(e, player, dt, attack);
  }

  updateHazards(dt);
  updateGroundItems(dt);
  fx.update(dt, entities, applyDamage);

  hudTimer -= dt;
  if (hudTimer <= 0) { ui.updateHud(player, depth); ui.updateAbilities(player); if (boss) ui.updateBossBar(boss); hudTimer = 0.2; }
  ui.updateToast(dt);
  if (!player.alive) ui.showToast(`Возрождение через ${Math.ceil(player.respawnTimer)}с`, 0.4);
}

document.getElementById('restart')?.addEventListener('click', () => location.reload());

animate();

(async () => {
  const loadingText = document.getElementById('loading-text');
  try { await preloadHeroes((d, t) => { if (loadingText) loadingText.textContent = `Загрузка моделей… ${d}/${t}`; }); }
  catch (e) { console.error('Модели не загрузились', e); }
  try { await preloadNature((d, t) => { if (loadingText) loadingText.textContent = `Загрузка окружения… ${d}/${t}`; }); }
  catch (e) { console.error('Природа не загрузилась', e); }
  populateScatter(scene);
  const ld = document.getElementById('loading');
  if (ld) ld.style.display = 'none';
  ui.showClassSelect(HERO_DEFS, (id) => startGame(id));
})();
