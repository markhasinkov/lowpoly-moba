import * as THREE from 'three';
import { COLORS, HERO_ANIMS } from './config.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { creepAssets } from './assets.js';

function mat(color, flat = true) {
  return new THREE.MeshStandardMaterial({ color, flatShading: flat, roughness: 0.85, metalness: 0.1 });
}

// Floating HP bar attached to an entity (always faces camera in main loop)
function makeBar(width = 3) {
  const group = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.4), new THREE.MeshBasicMaterial({ color: 0x111111, depthTest: false }));
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.4), new THREE.MeshBasicMaterial({ color: 0x33dd44, depthTest: false }));
  fill.position.z = 0.01;
  bg.renderOrder = 998; fill.renderOrder = 999;
  group.add(bg); group.add(fill);
  group.userData = { width, fill };
  return group;
}

export class Entity {
  constructor(opts) {
    Object.assign(this, opts);
    this.alive = true;
    this.attackCd = 0;
    this.lastAttacker = null;
    this.pos = new THREE.Vector3(opts.x, 0, opts.z);
    this.target = null;
    this.attackTarget = null;
    this.mesh.position.copy(this.pos);
    this.flashT = 0; this.atkAnim = 0; this.walkPhase = Math.random() * 6;
    this.dying = false; this.deathT = 0; this._lastPos = this.pos.clone();
  }

  flash(d = 0.18) { this.flashT = d; }

  setHpBar() {
    if (!this.hpBar) return;
    const r = Math.max(0, this.hp / this.maxHp);
    const w = this.hpBar.userData.width;
    const fill = this.hpBar.userData.fill;
    fill.scale.x = r;
    fill.position.x = -(w * (1 - r)) / 2;
    fill.material.color.setHex(r > 0.5 ? 0x33dd44 : r > 0.25 ? 0xddaa22 : 0xdd3333);
  }

  takeDamage(amount, attacker) {
    if (!this.alive) return;
    const reduced = amount * (1 - (this.armor * 0.06) / (1 + this.armor * 0.06));
    this.hp -= Math.max(1, reduced);
    this.lastAttacker = attacker;
    this.setHpBar();
    this.flash();
    if (this.hp <= 0) { this.hp = 0; this.alive = false; }
  }

  distanceTo(other) { return this.pos.distanceTo(other.pos); }
}

// ===== Primitive hero fallbacks (used only if glTF fails) =====
function buildGuardian(color, accent) {
  const g = new THREE.Group();
  const steel = 0x9aa0a8;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.2, 1.3), mat(color));
  torso.position.y = 2.1; torso.castShadow = true; g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.0), mat(steel));
  head.position.y = 3.9; head.castShadow = true; g.add(head);
  const weapon = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 3.2, 6), mat(0x6b4a2b));
  handle.position.y = 1.2; weapon.add(handle);
  const hammerHead = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 1.1), mat(steel));
  hammerHead.position.y = 2.7; weapon.add(hammerHead);
  weapon.position.set(1.3, 2.0, 0.2); g.add(weapon);
  return { group: g, weapon, flashParts: [torso, head] };
}
function buildMage(color, accent) {
  const g = new THREE.Group();
  const robe = new THREE.Mesh(new THREE.ConeGeometry(1.35, 2.8, 9), mat(color));
  robe.position.y = 1.4; robe.castShadow = true; g.add(robe);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 0), mat(0xf0d6b0));
  head.position.y = 3.95; head.castShadow = true; g.add(head);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.7, 9), mat(accent));
  hat.position.y = 5.0; hat.castShadow = true; g.add(hat);
  const weapon = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4.0, 6), mat(0x7a5a32));
  shaft.position.y = 1.6; weapon.add(shaft);
  weapon.position.set(1.05, 1.4, 0.25); g.add(weapon);
  return { group: g, weapon, flashParts: [robe, head] };
}
function buildAssassin(color, accent) {
  const g = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.78, 2.0, 7), mat(color));
  torso.position.y = 2.0; torso.castShadow = true; g.add(torso);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.68, 0), mat(0xf0d6b0));
  head.position.y = 3.4; head.castShadow = true; g.add(head);
  const weapon = new THREE.Group();
  const bladeR = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.3, 4), mat(0xdfe6ee));
  bladeR.position.y = 0.6; weapon.add(bladeR);
  weapon.position.set(0.95, 2.3, 0.3); weapon.rotation.x = Math.PI; g.add(weapon);
  return { group: g, weapon, flashParts: [torso, head] };
}

export function createHero(team, def, asset) {
  if (asset) return createGLTFHero(team, def, asset);
  const color = COLORS.player;
  const accent = def.accent;
  const built = def.id === 'mage' ? buildMage(color, accent)
    : def.id === 'assassin' ? buildAssassin(color, accent)
    : buildGuardian(color, accent);
  const g = built.group;
  if (built.weapon) { built.weapon.rotation.z = Math.PI / 7; g.userData.weapon = built.weapon; }
  g.userData.flashParts = built.flashParts;
  const bar = makeBar(4); bar.position.y = 6.6; g.add(bar);
  return new Entity({
    kind: 'hero', team, mesh: g, hpBar: bar,
    hp: def.maxHp, maxHp: def.maxHp, mana: def.maxMana, maxMana: def.maxMana,
    moveSpeed: def.moveSpeed, baseMoveSpeed: def.moveSpeed,
    attackRange: def.attackRange, attackDamage: def.attackDamage,
    attackSpeed: def.attackSpeed, armor: def.armor,
    hpRegen: def.hpRegen, manaRegen: def.manaRegen,
    name: def.name, role: def.role, defId: def.id,
    attackType: def.attackType || 'melee', projectile: def.projectile || null,
    abilities: def.abilities, accent, level: 1, xp: 0, gold: 0, kills: 0, deaths: 0,
    respawnTimer: 0, radius: 1.4, slowT: 0, x: 0, z: 0,
  });
}

function attachWeapons(model, id, accent) {
  const bones = {};
  model.traverse((o) => { if (o.name === 'handslot.r') bones.r = o; else if (o.name === 'handslot.l') bones.l = o; });
  const steel = 0xc2cad6, wood = 0x6b4a2b;
  const wmat = (c, emis) => new THREE.MeshStandardMaterial({ color: c, emissive: emis || 0x000000, emissiveIntensity: emis ? 1.1 : 0, flatShading: true, roughness: 0.55, metalness: 0.2 });
  const piece = (geo, c, emis) => { const m = new THREE.Mesh(geo, wmat(c, emis)); m.castShadow = true; return m; };
  if (id === 'guardian' && bones.r) {
    const w = new THREE.Group();
    const handle = piece(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 6), wood); handle.position.y = 0.45; w.add(handle);
    const hammer = piece(new THREE.BoxGeometry(0.3, 0.34, 0.42), steel); hammer.position.y = 1.0; w.add(hammer);
    bones.r.add(w);
  } else if (id === 'mage' && bones.r) {
    const w = new THREE.Group();
    const shaft = piece(new THREE.CylinderGeometry(0.035, 0.045, 1.5, 6), wood); shaft.position.y = 0.7; w.add(shaft);
    const orb = piece(new THREE.IcosahedronGeometry(0.17, 0), accent, accent); orb.position.y = 1.55; w.add(orb);
    bones.r.add(w);
  } else if (id === 'assassin') {
    const dagger = () => { const w = new THREE.Group(); const bl = piece(new THREE.ConeGeometry(0.06, 0.55, 4), steel); bl.position.y = 0.3; w.add(bl); w.add(piece(new THREE.BoxGeometry(0.2, 0.06, 0.06), 0x3a2a18)); return w; };
    if (bones.r) bones.r.add(dagger());
    if (bones.l) bones.l.add(dagger());
  }
}

function createGLTFHero(team, def, asset) {
  const color = COLORS.player;
  const accent = def.accent;
  const g = new THREE.Group();
  const model = cloneSkinned(asset.scene);
  let box = new THREE.Box3().setFromObject(model);
  const h = (box.max.y - box.min.y) || 1;
  model.scale.setScalar(5.0 / h);
  box = new THREE.Box3().setFromObject(model);
  model.position.y = -box.min.y;
  model.rotation.y = 0;
  const teamTint = new THREE.Color(0xbcd2ff);
  const flashMeshes = [];
  model.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true; o.frustumCulled = false;
      if (o.material) { o.material = o.material.clone(); if (o.material.color) o.material.color.multiply(teamTint); flashMeshes.push(o); }
    }
  });
  g.add(model);
  attachWeapons(model, def.id, accent);

  const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.18, 22),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4 }));
  ring.position.y = 0.1; g.add(ring);
  const aura = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.18, 8, 28),
    new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.85 }));
  aura.rotation.x = -Math.PI / 2; aura.position.y = 0.4; aura.visible = false;
  g.add(aura); g.userData.aura = aura;
  const bar = makeBar(4.2); bar.position.y = 7.0; g.add(bar);

  const mixer = new THREE.AnimationMixer(model);
  const map = HERO_ANIMS[def.id] || HERO_ANIMS.guardian;
  const byName = {}; asset.animations.forEach(a => { byName[a.name] = a; });
  const actions = {};
  for (const [k, name] of Object.entries(map)) { if (byName[name]) actions[k] = mixer.clipAction(byName[name]); }
  if (actions.idle) actions.idle.play();

  const ent = new Entity({
    kind: 'hero', team, mesh: g, hpBar: bar,
    hp: def.maxHp, maxHp: def.maxHp, mana: def.maxMana, maxMana: def.maxMana,
    moveSpeed: def.moveSpeed, baseMoveSpeed: def.moveSpeed,
    attackRange: def.attackRange, attackDamage: def.attackDamage,
    attackSpeed: def.attackSpeed, armor: def.armor,
    hpRegen: def.hpRegen, manaRegen: def.manaRegen,
    name: def.name, role: def.role, defId: def.id,
    attackType: def.attackType || 'melee', projectile: def.projectile || null,
    abilities: def.abilities, accent,
    level: 1, xp: 0, gold: 0, kills: 0, deaths: 0, respawnTimer: 0, radius: 1.4, slowT: 0,
    x: 0, z: 0,
  });
  ent.isGLTF = true; ent.mixer = mixer; ent.actions = actions; ent.currentKey = 'idle';
  ent.flashMeshes = flashMeshes; ent.oneShotT = 0; ent._deathStarted = false;
  return ent;
}

// ===== Mobs & Bosses (KayKit skeleton models) =====
const MOB_ATTACK = { minion: '1H_Melee_Attack_Chop', warrior: '2H_Melee_Attack_Chop' };

function buildSkeleton(spec) {
  const asset = creepAssets[spec.model] || creepAssets.minion || creepAssets.warrior;
  const g = new THREE.Group();
  let isGLTF = false, mixer = null, actions = {}, flashMeshes = [];
  const targetH = 3.4 * (spec.scale || 1);
  if (asset) {
    const model = cloneSkinned(asset.scene);
    let box = new THREE.Box3().setFromObject(model);
    const h = (box.max.y - box.min.y) || 1;
    model.scale.setScalar(targetH / h);
    box = new THREE.Box3().setFromObject(model);
    model.position.y = -box.min.y;
    if (spec.tint) {
      const tint = new THREE.Color(spec.tint);
      model.traverse((o) => { if (o.isMesh && o.material) { o.material = o.material.clone(); if (o.material.color) o.material.color.multiply(tint); } });
    }
    model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; if (o.material) { if (spec.tint == null) o.material = o.material.clone(); flashMeshes.push(o); } } });
    g.add(model);
    mixer = new THREE.AnimationMixer(model);
    const byName = {}; asset.animations.forEach((a) => { byName[a.name] = a; });
    const map = { idle: 'Idle', run: 'Running_A', death: 'Death_A', hit: 'Hit_A', attack: MOB_ATTACK[spec.model] || '1H_Melee_Attack_Chop', cast: 'Spellcast_Shoot' };
    for (const [k, name] of Object.entries(map)) { if (byName[name]) actions[k] = mixer.clipAction(byName[name]); }
    if (actions.idle) actions.idle.play();
    isGLTF = true;
  } else {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.6 * (spec.scale || 1), 0.8 * (spec.scale || 1), 2.2 * (spec.scale || 1), 8), mat(spec.tint || 0xcfd0cc));
    body.position.y = 1.1 * (spec.scale || 1); body.castShadow = true; g.add(body);
    g.userData.flashParts = [body];
  }
  return { g, isGLTF, mixer, actions, flashMeshes };
}

export function createMob(spec) {
  const { g, isGLTF, mixer, actions, flashMeshes } = buildSkeleton(spec);
  const barW = spec.isBoss ? 5 : 2;
  const bar = makeBar(barW); bar.position.y = (spec.isBoss ? 9 : 4.2) * (spec.scale || 1); g.add(bar);
  const ent = new Entity({
    kind: spec.isBoss ? 'boss' : 'mob', team: 'enemy', mesh: g, hpBar: bar,
    hp: spec.hp, maxHp: spec.hp,
    moveSpeed: spec.moveSpeed, baseMoveSpeed: spec.moveSpeed,
    attackRange: spec.attackRange, attackDamage: spec.attackDamage,
    attackSpeed: spec.attackSpeed, armor: spec.armor,
    attackType: spec.attackType || 'melee', projectile: spec.projectile || null,
    radius: (spec.isBoss ? 2.4 : 0.9) * (spec.scale || 1), slowT: 0, x: spec.x, z: spec.z,
  });
  ent.name = spec.name || 'Враг';
  ent.xpBounty = spec.xp || 0;
  ent.goldBounty = spec.gold || 0;
  ent.dropChance = spec.dropChance != null ? spec.dropChance : 0.2;
  ent.rarityBonus = spec.rarityBonus || 0;
  ent.itemLevel = spec.itemLevel || 1;
  ent.isBoss = !!spec.isBoss;
  ent.mechanic = spec.mechanic || null;
  ent.dropRarityMin = spec.dropRarityMin || null;
  ent.gradeColor = spec.gradeColor || null;
  if (isGLTF) { ent.isGLTF = true; ent.mixer = mixer; ent.actions = actions; ent.currentKey = 'idle'; ent.flashMeshes = flashMeshes; ent.oneShotT = 0; ent._deathStarted = false; }
  return ent;
}

function setLoopAction(e, key) {
  if (e.currentKey === key) return;
  const next = e.actions[key];
  if (!next) return;
  const prev = e.actions[e.currentKey];
  next.enabled = true; next.setLoop(THREE.LoopRepeat, Infinity); next.reset(); next.fadeIn(0.2); next.play();
  if (prev && prev !== next) prev.fadeOut(0.2);
  e.currentKey = key;
}

export function playHeroAnim(e, key, dur = 0.6) {
  if (!e || !e.isGLTF) return;
  const a = e.actions[key];
  if (!a) return;
  a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.enabled = true; a.fadeIn(0.06); a.play();
  const cur = e.actions[e.currentKey];
  if (cur && cur !== a) cur.fadeOut(0.06);
  e.currentKey = key; e.oneShotT = dur;
}

function animateGLTFHero(e, dt, camera) {
  e.mixer.update(dt);
  const ud = e.mesh.userData;
  if (e.hpBar) e.hpBar.quaternion.copy(camera.quaternion);
  if (ud.aura) { const on = e.buffE > 0; ud.aura.visible = on; if (on) ud.aura.rotation.z += dt * 4; }
  if (e.flashT > 0) {
    e.flashT -= dt; const k = Math.max(0, e.flashT / 0.18) * 0.8;
    for (const m of e.flashMeshes) if (m.material && m.material.emissive) m.material.emissive.setRGB(k, k, k);
  }
  e.mesh.position.set(e.pos.x, 0, e.pos.z);
  if (e.dying) {
    if (!e._deathStarted) { playHeroAnim(e, 'death', 999); e._deathStarted = true; }
    if (!e._lastPos) e._lastPos = e.pos.clone(); else e._lastPos.copy(e.pos);
    return;
  }
  e._deathStarted = false;
  e.oneShotT -= dt;
  if (e.oneShotT <= 0) {
    const moved = e._lastPos ? e.pos.distanceTo(e._lastPos) : 0;
    setLoopAction(e, moved > 0.02 ? 'run' : 'idle');
  }
  if (!e._lastPos) e._lastPos = e.pos.clone(); else e._lastPos.copy(e.pos);
}

export function animateEntityVisual(e, dt, camera) {
  const ud = e.mesh.userData;
  if (e.isGLTF) { animateGLTFHero(e, dt, camera); return; }
  if (e.hpBar) e.hpBar.quaternion.copy(camera.quaternion);
  if (e.flashT > 0) {
    e.flashT -= dt;
    const k = Math.max(0, e.flashT / 0.18) * 0.9;
    for (const p of ud.flashParts || []) if (p.material && p.material.emissive) p.material.emissive.setRGB(k, k, k);
  }
  if (e.dying) {
    e.deathT += dt;
    const k = Math.min(1, e.deathT / 0.5);
    e.mesh.scale.setScalar(Math.max(0.02, 1 - k));
    e.mesh.rotation.z = k * 1.5;
    e.mesh.position.set(e.pos.x, -k * 1.0, e.pos.z);
    return;
  }
  let bob = 0;
  const moved = e._lastPos ? e.pos.distanceTo(e._lastPos) : 0;
  if (moved > 0.015) { e.walkPhase += dt * 13; bob = Math.abs(Math.sin(e.walkPhase)) * 0.2; }
  e.mesh.position.set(e.pos.x, bob, e.pos.z);
  if (!e._lastPos) e._lastPos = e.pos.clone(); else e._lastPos.copy(e.pos);
}
