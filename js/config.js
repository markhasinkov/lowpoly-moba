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

// Selectable heroes — each has a distinct model, attack type and a unique 3-ability kit.
export const HERO_DEFS = [
  {
    id: 'guardian', name: 'Guardian', role: 'Танк', accent: 0x8fe0ff,
    desc: 'Ближний бой. Много HP/брони, защитный баф и рывок-таран.',
    maxHp: 820, hpRegen: 3.4, maxMana: 260, manaRegen: 2.6,
    moveSpeed: 10.5, attackRange: 6, attackDamage: 50, attackSpeed: 0.95, armor: 7,
    attackType: 'melee',
    abilities: {
      Q: { key: 'Q', name: 'Удар о землю', icon: '🌋', type: 'aoe', manaCost: 70, cooldown: 6,
        damage: 70, damagePerLevel: 35, radius: 9, radiusPerLevel: 0.8,
        desc: 'Смаш вокруг себя, урон всем рядом.' },
      W: { key: 'W', name: 'Бастион', icon: '🛡️', type: 'buff_guard', manaCost: 80, cooldown: 16,
        armorBonus: 8, armorPerLevel: 4, healPerSec: 24, healPerLevel: 14, duration: 5,
        desc: '+броня и лечение в течение 5с.' },
      E: { key: 'E', name: 'Рывок-таран', icon: '💥', type: 'dash', manaCost: 70, cooldown: 12,
        damage: 60, damagePerLevel: 30, range: 26, radius: 6,
        desc: 'Рывок к курсору, урон в точке прибытия.' },
    },
  },
  {
    id: 'mage', name: 'Arcanist', role: 'Маг', accent: 0xc08bff,
    desc: 'Дальний кастер. Бьёт с дистанции, сильные снаряды и блинк.',
    maxHp: 540, hpRegen: 2.0, maxMana: 460, manaRegen: 4.8,
    moveSpeed: 10.5, attackRange: 17, attackDamage: 40, attackSpeed: 0.85, armor: 3,
    attackType: 'ranged', projectile: { speed: 40, color: 0xc08bff, radius: 1.2 },
    abilities: {
      Q: { key: 'Q', name: 'Ледяная стрела', icon: '❄️', type: 'projectile', manaCost: 70, cooldown: 4,
        damage: 110, damagePerLevel: 50, range: 40, speed: 46, slow: { factor: 0.5, dur: 1.8 },
        desc: 'Дальний снаряд, бьёт и замедляет.' },
      W: { key: 'W', name: 'Метель', icon: '🌀', type: 'aoe', manaCost: 100, cooldown: 9,
        damage: 70, damagePerLevel: 35, radius: 13, radiusPerLevel: 1,
        desc: 'Большой взрыв вокруг себя.' },
      E: { key: 'E', name: 'Блинк', icon: '✨', type: 'blink', manaCost: 60, cooldown: 11,
        range: 28, desc: 'Мгновенный телепорт к курсору.' },
    },
  },
  {
    id: 'assassin', name: 'Stalker', role: 'Убийца', accent: 0xffd24f,
    desc: 'Быстрый ближний бой. Прыжок-удар, веер клинков, стелс-рывок.',
    maxHp: 600, hpRegen: 2.5, maxMana: 300, manaRegen: 3.0,
    moveSpeed: 12, attackRange: 6, attackDamage: 56, attackSpeed: 1.2, armor: 4,
    attackType: 'melee',
    abilities: {
      Q: { key: 'Q', name: 'Теневой бросок', icon: '🗡️', type: 'dash', manaCost: 60, cooldown: 7,
        damage: 90, damagePerLevel: 45, range: 22, radius: 4.5,
        desc: 'Рывок с бурст-уроном в точке.' },
      W: { key: 'W', name: 'Веер клинков', icon: '🌀', type: 'aoe', manaCost: 80, cooldown: 8,
        damage: 55, damagePerLevel: 30, radius: 9,
        desc: 'Клинки во все стороны вокруг себя.' },
      E: { key: 'E', name: 'Тень', icon: '👻', type: 'buff_speed', manaCost: 50, cooldown: 11,
        speedBonus: 6, speedBonusPerLevel: 2, duration: 3.5,
        desc: 'Резкое ускорение на 3.5с.' },
    },
  },
];

export function getHeroDef(id) {
  return HERO_DEFS.find(h => h.id === id) || HERO_DEFS[0];
}

// Neutral jungle creeps (stationary camps that respawn)
export const NEUTRAL = {
  maxHp: 280, attackDamage: 22, attackRange: 7, attackSpeed: 1.0,
  armor: 3, goldBounty: 55, xpBounty: 70, respawn: 35,
};

// Camp anchor points (off-lane). Lane runs top-left to bottom-right.
export const CAMPS = [
  { x: 26, z: 26, size: 3 },
  { x: -26, z: -26, size: 3 },
  { x: 6, z: -30, size: 2 },
  { x: -6, z: 30, size: 2 },
];

export const CREEP = {
  maxHp: 150, attackDamage: 16, attackRange: 6, attackSpeed: 1.0,
  moveSpeed: 7, armor: 1, goldBounty: 45, xpBounty: 48,
  spawnInterval: 22, perWave: 4,
};

export const TOWER = {
  maxHp: 1400, attackDamage: 80, attackRange: 22, attackSpeed: 1.0,
  armor: 8, goldBounty: 300,
};

export const BASE = {
  maxHp: 2600, armor: 10, goldBounty: 0,
};

export const MAX_ABILITY_LEVEL = 4;

// Compute effective values of a hero ability object at a given learned level (1..4).
export function scaleAbility(ab, level) {
  const L = Math.max(1, level);
  const s = Object.assign({}, ab);
  if (ab.damagePerLevel != null) s.damage = (ab.damage || 0) + ab.damagePerLevel * (L - 1);
  if (ab.radiusPerLevel != null) s.radius = (ab.radius || 0) + ab.radiusPerLevel * (L - 1);
  if (ab.speedBonusPerLevel != null) s.speedBonus = (ab.speedBonus || 0) + ab.speedBonusPerLevel * (L - 1);
  if (ab.armorPerLevel != null) s.armorBonus = (ab.armorBonus || 0) + ab.armorPerLevel * (L - 1);
  if (ab.healPerLevel != null) s.healPerSec = (ab.healPerSec || 0) + ab.healPerLevel * (L - 1);
  return s;
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

// KayKit animation clip names mapped to game states (all 3 characters share the same set)
export const HERO_ANIMS = {
  guardian: { idle: 'Idle', run: 'Running_A', death: 'Death_A', hit: 'Hit_A', attack: '2H_Melee_Attack_Chop', cast: 'Spellcast_Shoot' },
  mage: { idle: 'Idle', run: 'Running_A', death: 'Death_A', hit: 'Hit_A', attack: 'Spellcast_Shoot', cast: 'Spellcast_Shoot' },
  assassin: { idle: 'Idle', run: 'Running_A', death: 'Death_A', hit: 'Hit_A', attack: 'Dualwield_Melee_Attack_Slice', cast: 'Spellcast_Shoot' },
};
