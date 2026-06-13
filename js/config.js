// Game configuration & balance constants

export const TEAM = {
  RADIANT: 'radiant', // player (blue)
  DIRE: 'dire',       // enemy (red)
};

export const COLORS = {
  radiant: 0x3aa6ff,
  dire: 0xff4d4d,
  ground: 0x3b6b3b,
  groundAlt: 0x356135,
  lane: 0xc8a96a,
  river: 0x2e6fa0,
  treeTrunk: 0x6b4a2b,
  treeLeaf: 0x4f8f3a,
  rock: 0x7d7d85,
  gold: 0xf5c542,
  fountain: 0x66e0ff,
};

// World layout — diagonal single lane from Radiant base (-) to Dire base (+)
export const WORLD = {
  size: 120,
  radiantBase: { x: -46, z: 46 },
  direBase: { x: 46, z: -46 },
  fountainRadius: 16, // shop + fast heal zone around own base
};

export const HERO = {
  radiant: {
    maxHp: 620, hpRegen: 2.5, maxMana: 300, manaRegen: 3,
    moveSpeed: 11, attackRange: 9, attackDamage: 52, attackSpeed: 1.0,
    armor: 4, name: 'Azure',
  },
  dire: {
    maxHp: 600, hpRegen: 2.2, maxMana: 280, manaRegen: 2.5,
    moveSpeed: 10.5, attackRange: 8.5, attackDamage: 50, attackSpeed: 1.05,
    armor: 3, name: 'Crimson',
  },
};

export const CREEP = {
  maxHp: 160, attackDamage: 16, attackRange: 6, attackSpeed: 1.0,
  moveSpeed: 7, armor: 1, goldBounty: 38, xpBounty: 40,
  spawnInterval: 22, perWave: 4,
};

export const TOWER = {
  maxHp: 1400, attackDamage: 80, attackRange: 22, attackSpeed: 1.0,
  armor: 8, goldBounty: 300,
};

export const BASE = {
  maxHp: 2600, armor: 10, goldBounty: 0,
};

// ---- Abilities with per-level scaling (levels 1..4) ----
export const ABILITIES = {
  Q: {
    name: 'Bolt', key: 'Q', manaCost: 60, cooldown: 4,
    damage: 90, damagePerLevel: 40, range: 38, speed: 42, type: 'projectile',
    desc: 'Снаряд по курсору. Урон растёт с уровнем.',
  },
  W: {
    name: 'Nova', key: 'W', manaCost: 90, cooldown: 9,
    damage: 65, damagePerLevel: 35, radius: 11, radiusPerLevel: 1, type: 'aoe',
    desc: 'Взрыв вокруг героя. Урон и радиус растут.',
  },
  E: {
    name: 'Surge', key: 'E', manaCost: 50, cooldown: 12,
    duration: 3, speedBonus: 4, speedBonusPerLevel: 1.5, type: 'buff',
    desc: 'Рывок скорости на 3 секунды. Бонус растёт.',
  },
};

export const MAX_ABILITY_LEVEL = 4;

// Compute effective ability values at a given learned level (1..4)
export function abilityStat(key, level) {
  const a = ABILITIES[key];
  const L = Math.max(1, level);
  return {
    key,
    name: a.name,
    type: a.type,
    manaCost: a.manaCost,
    cooldown: a.cooldown,
    damage: (a.damage || 0) + (a.damagePerLevel || 0) * (L - 1),
    radius: (a.radius || 0) + (a.radiusPerLevel || 0) * (L - 1),
    range: a.range,
    speed: a.speed,
    duration: a.duration,
    speedBonus: (a.speedBonus || 0) + (a.speedBonusPerLevel || 0) * (L - 1),
  };
}

// ---- Item shop ----
// stats are flat additive bonuses applied on purchase
export const ITEMS = [
  { id: 'boots',      name: 'Сапоги скорости', icon: '👢', cost: 450,  desc: '+3 к скорости',                stats: { moveSpeed: 3 } },
  { id: 'relic',      name: 'Реликвия',        icon: '💚', cost: 600,  desc: '+6 HP-реген',                  stats: { hpRegen: 6 } },
  { id: 'talisman',   name: 'Талисман разума', icon: '🔮', cost: 750,  desc: '+150 маны, +3 мана-реген',     stats: { maxMana: 150, manaRegen: 3 } },
  { id: 'plate',      name: 'Тяжёлые латы',    icon: '🛡️', cost: 850,  desc: '+6 брони',                     stats: { armor: 6 } },
  { id: 'blade',      name: 'Острый клинок',   icon: '🗡️', cost: 950,  desc: '+20 урона',                    stats: { attackDamage: 20 } },
  { id: 'vitality',   name: 'Сердце стража',   icon: '❤️', cost: 1150, desc: '+250 HP',                      stats: { maxHp: 250 } },
  { id: 'fury',       name: 'Клык ярости',     icon: '🔥', cost: 1300, desc: '+0.45 скорости атаки',         stats: { attackSpeed: 0.45 } },
  { id: 'greatsword', name: 'Эспадон',         icon: '⚔️', cost: 2100, desc: '+45 урона, +0.2 скор.атаки',   stats: { attackDamage: 45, attackSpeed: 0.2 } },
];

// AI buy priority (item ids in order)
export const AI_BUILD_ORDER = ['boots', 'blade', 'plate', 'vitality', 'fury', 'greatsword'];

export const XP_PER_LEVEL = 220;
export const HERO_RESPAWN = 7; // seconds base
export const MAX_LEVEL = 18;
export const MAX_ITEMS = 6;
