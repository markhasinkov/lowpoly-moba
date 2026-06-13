import * as THREE from 'three';
import { TEAM, COLORS, CREEP, TOWER, BASE, NEUTRAL } from './config.js';

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
  }

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
    if (this.hp <= 0) { this.hp = 0; this.alive = false; }
  }

  distanceTo(other) {
    return this.pos.distanceTo(other.pos);
  }
}

export function createHero(team, def) {
  const color = COLORS[team];
  const accent = def.accent;
  const g = new THREE.Group();

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 2.2, 7), mat(color));
  torso.position.y = 2.1; torso.castShadow = true; g.add(torso);

  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 0), mat(0xf0d6b0));
  head.position.y = 3.6; head.castShadow = true; g.add(head);

  // shoulders / cape accent (team-tinted)
  const cape = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.4, 5), mat(color === COLORS.radiant ? 0x1f6fbf : 0xb02b2b));
  cape.position.set(0, 2.0, -0.7); cape.castShadow = true; g.add(cape);

  // hero-specific accent gem floating above (distinguishes the 3 heroes)
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0),
    new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.7, flatShading: true }));
  gem.position.y = 4.9; g.add(gem);
  g.userData.gem = gem;

  // weapon — longer for casters, blade for the rest
  const weapon = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, def.id === 'mage' ? 3.6 : 3, 5), mat(0xcfcfcf));
  weapon.position.set(1.1, 2.4, 0.2); weapon.rotation.z = Math.PI / 7; g.add(weapon);

  const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.2, 16),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 }));
  ring.position.y = 0.11; g.add(ring);

  const bar = makeBar(4);
  bar.position.y = 5.6; g.add(bar);

  return new Entity({
    kind: 'hero', team, mesh: g, hpBar: bar,
    hp: def.maxHp, maxHp: def.maxHp,
    mana: def.maxMana, maxMana: def.maxMana,
    moveSpeed: def.moveSpeed, baseMoveSpeed: def.moveSpeed,
    attackRange: def.attackRange, attackDamage: def.attackDamage,
    attackSpeed: def.attackSpeed, armor: def.armor,
    hpRegen: def.hpRegen, manaRegen: def.manaRegen,
    name: def.name, role: def.role, defId: def.id,
    abilityMods: def.abilityMods,
    level: 1, xp: 0, gold: 600, kills: 0, deaths: 0,
    respawnTimer: 0, radius: 1.4,
    x: 0, z: 0,
  });
}

export function createNeutral(x, z) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.DodecahedronGeometry(1.0, 0), mat(0x9c7a3c));
  body.position.y = 1.1; body.castShadow = true; g.add(body);
  const spike = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 5), mat(0x6f5527));
  spike.position.y = 2.4; spike.castShadow = true; g.add(spike);
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
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.4, 1.1), mat(color));
  body.position.y = 1.0; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), mat(0xe0c090));
  head.position.y = 2.0; head.castShadow = true; g.add(head);
  const bar = makeBar(2);
  bar.position.y = 2.9; g.add(bar);

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
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, 2, 6), mat(0x8a8a92));
  base.position.y = 1; base.castShadow = true; g.add(base);
  const mid = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.0, 4, 6), mat(0xa0a0a8));
  mid.position.y = 4; mid.castShadow = true; g.add(mid);
  const top = new THREE.Mesh(new THREE.ConeGeometry(2.0, 2.4, 6), mat(color));
  top.position.y = 7.2; top.castShadow = true; g.add(top);
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.9, 0),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, flatShading: true }));
  crystal.position.y = 8.8; g.add(crystal);
  const bar = makeBar(4.5);
  bar.position.y = 10.5; g.add(bar);

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
