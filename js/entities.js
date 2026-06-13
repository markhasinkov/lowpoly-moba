import * as THREE from 'three';
import { TEAM, COLORS, CREEP, TOWER, BASE, NEUTRAL, HERO_ANIMS } from './config.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

function mat(color, flat = true) {
  return new THREE.MeshStandardMaterial({ color, flatShading: flat, roughness: 0.85, metalness: 0.1 });
}

// Floating HP bar attached to an entity (always faces camera in main loop)
function makeBar(width = 3) {
  const group = new THREE.Group();
  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(width, 0.4),
    new THREE.MeshBasicMaterial({ color: 0x111111, depthTest: false })
  );
  const fill = new THREE.Mesh(
    new THREE.PlaneGeometry(width, 0.4),
    new THREE.MeshBasicMaterial({ color: 0x33dd44, depthTest: false })
  );
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
    this.target = null;       // movement target (Vector3) or null
    this.attackTarget = null; // entity to attack
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

  distanceTo(other) {
    return this.pos.distanceTo(other.pos);
  }
}

function buildGuardian(color, accent) {
  const g = new THREE.Group();
  const skin = 0xf0d6b0, steel = 0x9aa0a8;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.2, 1.3), mat(color));
  torso.position.y = 2.1; torso.castShadow = true; g.add(torso);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.5, 1.4), mat(0x4a3520));
  belt.position.y = 1.1; g.add(belt);
  const lP = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 1.5), mat(accent));
  lP.position.set(-1.2, 3.1, 0); lP.castShadow = true; g.add(lP);
  const rP = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 1.5), mat(accent));
  rP.position.set(1.2, 3.1, 0); rP.castShadow = true; g.add(rP);
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.0), mat(steel));
  head.position.y = 3.9; head.castShadow = true; g.add(head);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.25, 1.02), mat(accent));
  visor.position.y = 3.95; g.add(visor);
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.2, 1.7), mat(steel));
  shield.position.set(-1.7, 2.2, 0); shield.rotation.x = 0.1; shield.castShadow = true; g.add(shield);
  const shieldBoss = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 0), mat(accent));
  shieldBoss.position.set(-1.85, 2.2, 0); g.add(shieldBoss);
  // warhammer
  const weapon = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 3.2, 6), mat(0x6b4a2b));
  handle.position.y = 1.2; weapon.add(handle);
  const hammerHead = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 1.1), mat(steel));
  hammerHead.position.y = 2.7; weapon.add(hammerHead);
  weapon.position.set(1.3, 2.0, 0.2); weapon.castShadow = true; g.add(weapon);
  return { group: g, weapon, flashParts: [torso, head, lP, rP] };
}

function buildMage(color, accent) {
  const g = new THREE.Group();
  const robe = new THREE.Mesh(new THREE.ConeGeometry(1.35, 2.8, 9), mat(color));
  robe.position.y = 1.4; robe.castShadow = true; g.add(robe);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 1.3, 8), mat(color));
  torso.position.y = 3.0; torso.castShadow = true; g.add(torso);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 0), mat(0xf0d6b0));
  head.position.y = 3.95; head.castShadow = true; g.add(head);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.7, 9), mat(accent));
  hat.position.y = 5.0; hat.castShadow = true; g.add(hat);
  // staff with orb
  const weapon = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4.0, 6), mat(0x7a5a32));
  shaft.position.y = 1.6; weapon.add(shaft);
  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0),
    new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 1.1, flatShading: true }));
  orb.position.y = 3.7; weapon.add(orb);
  weapon.position.set(1.05, 1.4, 0.25); g.add(weapon);
  return { group: g, weapon, flashParts: [robe, torso, head] };
}

function buildAssassin(color, accent) {
  const g = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.78, 2.0, 7), mat(color));
  torso.position.y = 2.0; torso.castShadow = true; g.add(torso);
  const cape = new THREE.Mesh(new THREE.ConeGeometry(1.0, 2.4, 5), mat(color === COLORS.radiant ? 0x1f6fbf : 0xb02b2b));
  cape.position.set(0, 2.0, -0.6); cape.castShadow = true; g.add(cape);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.68, 0), mat(0xf0d6b0));
  head.position.y = 3.4; head.castShadow = true; g.add(head);
  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.4, 7), mat(accent));
  hood.position.y = 3.7; hood.rotation.x = -0.15; hood.castShadow = true; g.add(hood);
  const weapon = new THREE.Group();
  const bladeR = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.3, 4), mat(0xdfe6ee));
  bladeR.position.y = 0.6; weapon.add(bladeR);
  weapon.position.set(0.95, 2.3, 0.3); weapon.rotation.x = Math.PI; g.add(weapon);
  const bladeL = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.3, 4), mat(0xdfe6ee));
  bladeL.position.set(-0.95, 1.7, 0.3); bladeL.rotation.x = Math.PI; g.add(bladeL);
  return { group: g, weapon, flashParts: [torso, head, cape] };
}

export function createHero(team, def, asset) {
  if (asset) return createGLTFHero(team, def, asset);
  const color = COLORS[team];
  const accent = def.accent;
  const built = def.id === 'mage' ? buildMage(color, accent)
    : def.id === 'assassin' ? buildAssassin(color, accent)
    : buildGuardian(color, accent);
  const g = built.group;
  if (built.weapon) { built.weapon.rotation.z = Math.PI / 7; g.userData.weapon = built.weapon; }
  g.userData.flashParts = built.flashParts;

  // class emblem gem
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0),
    new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.8, flatShading: true }));
  gem.position.y = 6.0; g.add(gem); g.userData.gem = gem;

  const aura = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.16, 8, 24),
    new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.85 }));
  aura.rotation.x = -Math.PI / 2; aura.position.y = 0.35; aura.visible = false;
  g.add(aura); g.userData.aura = aura;

  const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.2, 16),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 }));
  ring.position.y = 0.11; g.add(ring);

  const bar = makeBar(4);
  bar.position.y = 6.6; g.add(bar);

  return new Entity({
    kind: 'hero', team, mesh: g, hpBar: bar,
    hp: def.maxHp, maxHp: def.maxHp,
    mana: def.maxMana, maxMana: def.maxMana,
    moveSpeed: def.moveSpeed, baseMoveSpeed: def.moveSpeed,
    attackRange: def.attackRange, attackDamage: def.attackDamage,
    attackSpeed: def.attackSpeed, armor: def.armor,
    hpRegen: def.hpRegen, manaRegen: def.manaRegen,
    name: def.name, role: def.role, defId: def.id,
    attackType: def.attackType || 'melee', projectile: def.projectile || null,
    abilities: def.abilities, accent,
    level: 1, xp: 0, gold: 600, kills: 0, deaths: 0,
    respawnTimer: 0, radius: 1.4,
    slowT: 0,
    x: 0, z: 0,
  });
}

export function createNeutral(x, z) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.DodecahedronGeometry(1.0, 0), mat(0x9c7a3c));
  body.position.y = 1.1; body.castShadow = true; g.add(body);
  const spike = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 5), mat(0x6f5527));
  spike.position.y = 2.4; spike.castShadow = true; g.add(spike);
  g.userData.flashParts = [body, spike];
  const bar = makeBar(2.4);
  bar.position.y = 3.2; g.add(bar);

  return new Entity({
    kind: 'neutral', team: 'neutral', mesh: g, hpBar: bar,
    hp: NEUTRAL.maxHp, maxHp: NEUTRAL.maxHp,
    moveSpeed: 0, baseMoveSpeed: 0,
    attackRange: NEUTRAL.attackRange, attackDamage: NEUTRAL.attackDamage,
    attackSpeed: NEUTRAL.attackSpeed, armor: NEUTRAL.armor,
    goldBounty: NEUTRAL.goldBounty, xpBounty: NEUTRAL.xpBounty,
    radius: 1.0, x, z,
  });
}

export function createCreep(team, x, z) {
  const color = COLORS[team];
  const g = new THREE.Group();
  const accentC = team === 'radiant' ? 0x2b6fbf : 0xa83232;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 1.2, 8), mat(color));
  body.position.y = 0.95; body.castShadow = true; g.add(body);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.25, 8), mat(0x3a2a18));
  belt.position.y = 0.5; g.add(belt);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), mat(0xe8c79a));
  head.position.y = 1.85; head.castShadow = true; g.add(head);
  const helm = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.6, 8), mat(accentC));
  helm.position.y = 2.15; helm.castShadow = true; g.add(helm);
  const club = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 1.1, 5), mat(0x6b4a2b));
  club.position.set(0.6, 1.1, 0.2); club.rotation.z = -0.5; g.add(club);
  g.userData.flashParts = [body, head, helm];
  const bar = makeBar(2);
  bar.position.y = 2.7; g.add(bar);

  return new Entity({
    kind: 'creep', team, mesh: g, hpBar: bar,
    hp: CREEP.maxHp, maxHp: CREEP.maxHp,
    moveSpeed: CREEP.moveSpeed, baseMoveSpeed: CREEP.moveSpeed,
    attackRange: CREEP.attackRange, attackDamage: CREEP.attackDamage,
    attackSpeed: CREEP.attackSpeed, armor: CREEP.armor,
    goldBounty: CREEP.goldBounty, xpBounty: CREEP.xpBounty,
    radius: 0.8, x, z,
  });
}

export function createTower(team, x, z) {
  const color = COLORS[team];
  const g = new THREE.Group();
  const stone = 0x8c93a0, stoneDark = 0x6f7682;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.5, 1.6, 8), mat(stoneDark));
  base.position.y = 0.8; base.receiveShadow = true; base.castShadow = true; g.add(base);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.5, 6.2, 8), mat(stone));
  shaft.position.y = 4.6; shaft.castShadow = true; g.add(shaft);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.2, 0.7, 8), mat(stoneDark));
  cap.position.y = 7.9; cap.castShadow = true; g.add(cap);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.7), mat(stone));
    m.position.set(Math.cos(a) * 2.2, 8.7, Math.sin(a) * 2.2); m.castShadow = true; g.add(m);
  }
  const top = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.0, 8), mat(color));
  top.position.y = 9.6; top.castShadow = true; g.add(top);
  g.userData.flashParts = [base, shaft, cap];
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 0),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9, flatShading: true }));
  crystal.position.y = 8.6; g.add(crystal); g.userData.gem = crystal;
  const bar = makeBar(4.5);
  bar.position.y = 11.2; g.add(bar);

  return new Entity({
    kind: 'tower', team, mesh: g, hpBar: bar,
    hp: TOWER.maxHp, maxHp: TOWER.maxHp,
    attackRange: TOWER.attackRange, attackDamage: TOWER.attackDamage,
    attackSpeed: TOWER.attackSpeed, armor: TOWER.armor,
    goldBounty: TOWER.goldBounty, moveSpeed: 0,
    radius: 2.8, x, z,
  });
}

export function createBase(team, x, z) {
  const color = COLORS[team];
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.5, 1.2, 8), mat(0x77777f));
  ring.position.y = 0.6; ring.receiveShadow = true; g.add(ring);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(3.2, 0),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, flatShading: true }));
  core.position.y = 4; core.castShadow = true; g.add(core);
  g.userData.flashParts = [ring];
  g.userData.core = core;
  const bar = makeBar(7);
  bar.position.y = 9; g.add(bar);

  return new Entity({
    kind: 'base', team, mesh: g, hpBar: bar,
    hp: BASE.maxHp, maxHp: BASE.maxHp, armor: BASE.armor,
    attackRange: 0, attackDamage: 0, moveSpeed: 0,
    radius: 6, x, z,
  });
}

export { TEAM };

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


// ---- glTF (KayKit) hero: detailed rigged model with skeletal animations ----
function createGLTFHero(team, def, asset) {
  const color = COLORS[team];
  const accent = def.accent;
  const g = new THREE.Group();

  const model = cloneSkinned(asset.scene);
  let box = new THREE.Box3().setFromObject(model);
  const h = (box.max.y - box.min.y) || 1;
  const s = 5.0 / h;
  model.scale.setScalar(s);
  box = new THREE.Box3().setFromObject(model);
  model.position.y = -box.min.y;
  model.rotation.y = 0; // KayKit models face +Z natively, matches atan2(dir.x,dir.z) facing

  const teamTint = new THREE.Color(team === 'radiant' ? 0xbcd2ff : 0xffc2c2);
  const flashMeshes = [];
  model.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true; o.frustumCulled = false;
      if (o.material) {
        o.material = o.material.clone();
        if (o.material.color) o.material.color.multiply(teamTint);
        flashMeshes.push(o);
      }
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

  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0),
    new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.85, flatShading: true }));
  gem.position.y = 6.4; g.add(gem); g.userData.gem = gem;

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
    level: 1, xp: 0, gold: 600, kills: 0, deaths: 0, respawnTimer: 0, radius: 1.4, slowT: 0,
    x: 0, z: 0,
  });
  ent.isGLTF = true; ent.mixer = mixer; ent.actions = actions; ent.currentKey = 'idle';
  ent.flashMeshes = flashMeshes; ent.oneShotT = 0; ent._deathStarted = false;
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
  if (ud.gem) ud.gem.rotation.y += dt * 2;
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


// Per-frame visual animation: billboarding, flash, attack swing/lunge, walk bob, death, surge aura.
export function animateEntityVisual(e, dt, camera) {
  const ud = e.mesh.userData;
  if (e.isGLTF) { animateGLTFHero(e, dt, camera); return; }
  if (e.hpBar) e.hpBar.quaternion.copy(camera.quaternion);
  if (ud.gem) ud.gem.rotation.y += dt * 2;

  if (e.flashT > 0) {
    e.flashT -= dt;
    const k = Math.max(0, e.flashT / 0.18) * 0.9;
    for (const p of ud.flashParts || []) p.material.emissive.setRGB(k, k, k);
  }

  if (ud.aura) {
    const on = e.buffE > 0;
    ud.aura.visible = on;
    if (on) { ud.aura.rotation.z += dt * 4; const s = 1 + Math.sin(e.walkPhase * 2) * 0.08; ud.aura.scale.set(s, s, s); }
  }

  if (e.dying) {
    e.deathT += dt;
    const k = Math.min(1, e.deathT / 0.5);
    e.mesh.scale.setScalar(Math.max(0.02, 1 - k));
    e.mesh.rotation.z = k * 1.5;
    e.mesh.position.set(e.pos.x, -k * 1.0, e.pos.z);
    return;
  }

  let offx = 0, offz = 0, bob = 0;
  const fx = Math.sin(e.mesh.rotation.y), fz = Math.cos(e.mesh.rotation.y);
  if (e.atkAnim > 0) {
    e.atkAnim -= dt;
    const p = 1 - Math.max(0, e.atkAnim) / 0.25;
    const s = Math.sin(p * Math.PI);
    offx = fx * s * 0.6; offz = fz * s * 0.6;
    if (ud.weapon) ud.weapon.rotation.z = Math.PI / 7 - s * 1.5;
  } else if (ud.weapon) {
    ud.weapon.rotation.z += (Math.PI / 7 - ud.weapon.rotation.z) * Math.min(1, dt * 12);
  }

  if (e.kind === 'hero' || e.kind === 'creep') {
    const moved = e._lastPos ? e.pos.distanceTo(e._lastPos) : 0;
    if (moved > 0.015) { e.walkPhase += dt * 13; bob = Math.abs(Math.sin(e.walkPhase)) * 0.2; }
  }

  e.mesh.position.set(e.pos.x + offx, bob, e.pos.z + offz);
  if (!e._lastPos) e._lastPos = e.pos.clone(); else e._lastPos.copy(e.pos);
}
