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
};

// World layout — diagonal single lane from Radiant base (-) to Dire base (+)
export const WORLD = {
  size: 120,
  radiantBase: { x: -46, z: 46 },
  direBase: { x: 46, z: -46 },
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

export const ABILITIES = {
  Q: {
    name: 'Bolt', key: 'Q', manaCost: 60, cooldown: 4,
    damage: 130, range: 38, speed: 42, type: 'projectile',
    desc: 'Запускает снаряд по направлению курсора.',
  },
  W: {
    name: 'Nova', key: 'W', manaCost: 90, cooldown: 9,
    damage: 110, radius: 13, type: 'aoe',
    desc: 'Взрыв вокруг героя, урон всем врагам рядом.',
  },
  E: {
    name: 'Surge', key: 'E', manaCost: 50, cooldown: 12,
    duration: 3, speedBonus: 7, type: 'buff',
    desc: 'Рывок скорости на 3 секунды.',
  },
};

export const XP_PER_LEVEL = 220;
export const HERO_RESPAWN = 7; // seconds base
