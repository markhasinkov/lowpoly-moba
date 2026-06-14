// ===== Low-Poly ARPG — configuration & balance =====

export const COLORS = {
  player: 0x3aa6ff,
  enemy: 0xff5b4d,
  gold: 0xf5c542,
  fountain: 0x66e0ff,
};

// Bounded play arena (an outdoor dungeon clearing). Player spawns at centre.
export const WORLD = {
  size: 120,
  radius: 58,           // playable circle radius
  portal: { x: 0, z: -44 }, // exit portal to next depth
};

// ---- Player classes (reuse KayKit hero models + ability kits) ----
export const HERO_DEFS = [
  {
    id: 'guardian', name: 'Воин', role: 'Warrior', accent: 0x8fe0ff,
    desc: 'Ближний бой, много HP и брони. Танкует и бьёт по площади.',
    maxHp: 900, hpRegen: 5, maxMana: 240, manaRegen: 3,
    moveSpeed: 11, attackRange: 6, attackDamage: 46, attackSpeed: 1.0, armor: 8,
    attackType: 'melee',
    abilities: {
      Q: { key: 'Q', name: 'Вихрь', icon: '🌀', type: 'aoe', manaCost: 50, cooldown: 5,
        damage: 60, damagePerLevel: 30, radius: 9, radiusPerLevel: 0.8,
        desc: 'Удар по площади вокруг себя.' },
      W: { key: 'W', name: 'Бастион', icon: '🛡️', type: 'buff_guard', manaCost: 70, cooldown: 14,
        armorBonus: 10, armorPerLevel: 5, healPerSec: 30, healPerLevel: 16, duration: 5,
        desc: '+броня и лечение 5с.' },
      E: { key: 'E', name: 'Рывок-таран', icon: '💥', type: 'dash', manaCost: 60, cooldown: 10,
        damage: 70, damagePerLevel: 35, range: 24, radius: 6,
        desc: 'Рывок вперёд, урон в точке прибытия.' },
      R: { key: 'R', name: 'Несокрушимый', icon: '⚜️', type: 'ultimate_guard', manaCost: 130, cooldown: 60, ultReq: 6,
        damage: 180, damagePerLevel: 130, radius: 14, slow: { factor: 0.45, dur: 2.5 },
        armorBonus: 24, armorPerLevel: 12, healPerSec: 80, healPerLevel: 45, duration: 7,
        desc: 'Удар по площади с замедлением, затем мощная защита и лечение.' },
    },
  },
  {
    id: 'mage', name: 'Маг', role: 'Mage', accent: 0xc08bff,
    desc: 'Дальний кастер. Снаряды, контроль и телепорт.',
    maxHp: 560, hpRegen: 3, maxMana: 480, manaRegen: 6,
    moveSpeed: 11, attackRange: 18, attackDamage: 38, attackSpeed: 0.9, armor: 3,
    attackType: 'ranged', projectile: { speed: 42, color: 0xc08bff, radius: 1.2 },
    abilities: {
      Q: { key: 'Q', name: 'Ледяная стрела', icon: '❄️', type: 'projectile', manaCost: 55, cooldown: 3,
        damage: 95, damagePerLevel: 50, range: 40, speed: 46, slow: { factor: 0.5, dur: 1.8 },
        desc: 'Дальний снаряд, бьёт и замедляет.' },
      W: { key: 'W', name: 'Метель', icon: '🌪️', type: 'aoe', manaCost: 85, cooldown: 8,
        damage: 70, damagePerLevel: 38, radius: 13, radiusPerLevel: 1,
        desc: 'Взрыв холода вокруг себя.' },
      E: { key: 'E', name: 'Блинк', icon: '✨', type: 'blink', manaCost: 50, cooldown: 9,
        range: 28, desc: 'Мгновенный телепорт вперёд.' },
      R: { key: 'R', name: 'Метеор', icon: '☄️', type: 'meteor', manaCost: 160, cooldown: 70, ultReq: 6,
        damage: 320, damagePerLevel: 190, range: 46, radius: 12, delay: 1.1, slow: { factor: 0.5, dur: 2 },
        desc: 'Метеор в точку — огромный урон по площади через 1.1с.' },
    },
  },
  {
    id: 'assassin', name: 'Разбойник', role: 'Rogue', accent: 0xffd24f,
    desc: 'Быстрый ближний бой. Рывки, веер клинков, ускорение.',
    maxHp: 640, hpRegen: 4, maxMana: 300, manaRegen: 4,
    moveSpeed: 12.5, attackRange: 6, attackDamage: 52, attackSpeed: 1.25, armor: 4,
    attackType: 'melee',
    abilities: {
      Q: { key: 'Q', name: 'Теневой бросок', icon: '🗡️', type: 'dash', manaCost: 45, cooldown: 6,
        damage: 95, damagePerLevel: 48, range: 22, radius: 4.5,
        desc: 'Рывок с бурст-уроном в точке.' },
      W: { key: 'W', name: 'Веер клинков', icon: '🌀', type: 'aoe', manaCost: 65, cooldown: 7,
        damage: 60, damagePerLevel: 32, radius: 9,
        desc: 'Клинки во все стороны.' },
      E: { key: 'E', name: 'Тень', icon: '👻', type: 'buff_speed', manaCost: 40, cooldown: 10,
        speedBonus: 6, speedBonusPerLevel: 2, duration: 3.5,
        desc: 'Резкое ускорение.' },
      R: { key: 'R', name: 'Жатва', icon: '☠️', type: 'blink_strike', manaCost: 110, cooldown: 55, ultReq: 6,
        damage: 360, damagePerLevel: 220, range: 30, radius: 6.5, speedBonus: 5, duration: 3,
        desc: 'Телепорт + казнящий удар по ближайшему врагу.' },
    },
  },
];

export function getHeroDef(id) {
  return HERO_DEFS.find(h => h.id === id) || HERO_DEFS[0];
}

export const HERO_ANIMS = {
  guardian: { idle: 'Idle', run: 'Running_A', death: 'Death_A', hit: 'Hit_A', attack: '2H_Melee_Attack_Chop', cast: 'Spellcast_Shoot' },
  mage: { idle: 'Idle', run: 'Running_A', death: 'Death_A', hit: 'Hit_A', attack: 'Spellcast_Shoot', cast: 'Spellcast_Shoot' },
  assassin: { idle: 'Idle', run: 'Running_A', death: 'Death_A', hit: 'Hit_A', attack: 'Dualwield_Melee_Attack_Slice', cast: 'Spellcast_Shoot' },
};

export const MAX_ABILITY_LEVEL = 4;
export const MAX_ULT_LEVEL = 3;
export const MAX_LEVEL = 30;
export const HERO_RESPAWN = 4;

// XP needed to go from level L to L+1
export function xpForLevel(level) { return Math.round(120 * Math.pow(1.18, level - 1)); }

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

// ===== Loot system =====
// Rarity grades — color, affix count, drop weight, name.
export const RARITY = [
  { id: 'common',    name: 'Обычный',      color: '#cfd6e0', hex: 0xcfd6e0, affixes: 0, weight: 100 },
  { id: 'rare',      name: 'Редкий',       color: '#4fd66b', hex: 0x4fd66b, affixes: 1, weight: 55 },
  { id: 'magic',     name: 'Магический',   color: '#4f9dff', hex: 0x4f9dff, affixes: 2, weight: 28 },
  { id: 'epic',      name: 'Эпический',    color: '#b96bff', hex: 0xb96bff, affixes: 3, weight: 11 },
  { id: 'legendary', name: 'Легендарный',  color: '#ff9b2e', hex: 0xff9b2e, affixes: 4, weight: 3 },
];

export const SLOTS = ['weapon', 'helmet', 'armor', 'boots', 'ring', 'amulet'];
export const SLOT_NAMES = { weapon: 'Оружие', helmet: 'Шлем', armor: 'Броня', boots: 'Сапоги', ring: 'Кольцо', amulet: 'Амулет' };

// Base item templates per slot. baseStats scale with item level.
export const ITEM_BASES = [
  { slot: 'weapon', name: 'Клинок',   icon: '🗡️', base: { attackDamage: 8 }, perLevel: { attackDamage: 3 } },
  { slot: 'weapon', name: 'Посох',    icon: '🪄', base: { attackDamage: 6, spellAmp: 0.05 }, perLevel: { attackDamage: 2, spellAmp: 0.02 } },
  { slot: 'helmet', name: 'Шлем',     icon: '⛑️', base: { armor: 3, maxHp: 30 }, perLevel: { armor: 1.5, maxHp: 14 } },
  { slot: 'armor',  name: 'Доспех',   icon: '🥋', base: { armor: 5, maxHp: 50 }, perLevel: { armor: 2, maxHp: 22 } },
  { slot: 'boots',  name: 'Сапоги',   icon: '👢', base: { moveSpeed: 0.6, armor: 1 }, perLevel: { armor: 1 } },
  { slot: 'ring',   name: 'Кольцо',   icon: '💍', base: { critChance: 0.03 }, perLevel: { critChance: 0.01 } },
  { slot: 'amulet', name: 'Амулет',   icon: '📿', base: { maxMana: 30, manaRegen: 1 }, perLevel: { maxMana: 14 } },
];

// Affix pool — rolled onto rare+ items. value = base + perLevel*itemLevel, jittered.
export const AFFIXES = [
  { id: 'attackDamage', label: '+{v} к урону',            base: 4,    per: 2.2,  round: 1 },
  { id: 'maxHp',        label: '+{v} к здоровью',         base: 25,   per: 12,   round: 1 },
  { id: 'armor',        label: '+{v} к броне',            base: 3,    per: 1.4,  round: 1 },
  { id: 'critChance',   label: '+{v}% шанс крита',        base: 4,    per: 1.3,  pct: true, round: 1 },
  { id: 'critMult',     label: '+{v}% урон крита',        base: 12,   per: 3,    pct: true, round: 1, mult: true },
  { id: 'attackSpeed',  label: '+{v}% скор. атаки',       base: 6,    per: 1.5,  pct: true, round: 1, asMult: true },
  { id: 'moveSpeed',    label: '+{v} к скорости',         base: 0.5,  per: 0.12, round: 0.1 },
  { id: 'lifesteal',    label: '+{v}% вампиризм',         base: 4,    per: 1,    pct: true, round: 1 },
  { id: 'maxMana',      label: '+{v} к мане',             base: 30,   per: 14,   round: 1 },
  { id: 'cdr',          label: '-{v}% перезарядка',       base: 4,    per: 1,    pct: true, round: 1 },
  { id: 'spellAmp',     label: '+{v}% урон умений',       base: 6,    per: 1.6,  pct: true, round: 1 },
  { id: 'xpGain',       label: '+{v}% опыта',             base: 6,    per: 1.2,  pct: true, round: 1 },
];

// ===== Mobs (KayKit skeletons). grade affects HP/dmg/scale/drops =====
export const MOB_GRADES = {
  trash:    { name: '',          hpMul: 1.0, dmgMul: 1.0, scale: 1.0,  dropChance: 0.20, rarityBonus: 0, tint: null },
  elite:    { name: 'Элитный',   hpMul: 2.4, dmgMul: 1.5, scale: 1.25, dropChance: 0.6,  rarityBonus: 1, tint: 0xffd24f },
  champion: { name: 'Чемпион',   hpMul: 4.5, dmgMul: 2.1, scale: 1.5,  dropChance: 1.0,  rarityBonus: 2, tint: 0xff7bff },
};

// model: which creepAssets key (minion/warrior). attackType.
export const MOB_TYPES = [
  { id: 'skeleton',  name: 'Скелет',        model: 'minion',  maxHp: 90,  attackDamage: 14, attackRange: 5, attackSpeed: 1.0, armor: 1, moveSpeed: 8,  xp: 22, gold: 6, attackType: 'melee' },
  { id: 'warrior',   name: 'Скелет-воин',   model: 'warrior', maxHp: 150, attackDamage: 20, attackRange: 5, attackSpeed: 0.9, armor: 3, moveSpeed: 7,  xp: 34, gold: 10, attackType: 'melee' },
];

// ===== Bosses — graded, leveled, distinct mechanics =====
// mechanic: 'slam' | 'barrage' | 'firezones' | 'phases'
export const BOSSES = [
  { id: 'boneLord',  name: 'Костяной Лорд',   grade: 'rare',      model: 'warrior', scale: 2.2, maxHp: 1400, attackDamage: 36, attackRange: 7,  attackSpeed: 0.8, armor: 6,  moveSpeed: 7,  xp: 260, gold: 120, mechanic: 'slam',      dropRarityMin: 'rare' },
  { id: 'necromancer', name: 'Некромант',      grade: 'magic',    model: 'minion',  scale: 2.3, maxHp: 1900, attackDamage: 30, attackRange: 22, attackSpeed: 1.0, armor: 5,  moveSpeed: 7,  xp: 380, gold: 180, mechanic: 'barrage',   dropRarityMin: 'magic',  attackType: 'ranged' },
  { id: 'infernalKnight', name: 'Адский Рыцарь', grade: 'epic',   model: 'warrior', scale: 2.6, maxHp: 3000, attackDamage: 48, attackRange: 8,  attackSpeed: 0.9, armor: 10, moveSpeed: 8,  xp: 600, gold: 320, mechanic: 'firezones', dropRarityMin: 'epic' },
  { id: 'deathTitan', name: 'Титан Смерти',    grade: 'legendary', model: 'warrior', scale: 3.2, maxHp: 5200, attackDamage: 58, attackRange: 9,  attackSpeed: 0.85, armor: 14, moveSpeed: 8, xp: 1100, gold: 650, mechanic: 'phases',    dropRarityMin: 'legendary' },
];

export const GRADE_COLOR = { rare: 0x4fd66b, magic: 0x4f9dff, epic: 0xb96bff, legendary: 0xff9b2e };

// ===== Dungeon depth scaling =====
export const DUNGEON = {
  baseMobCount: 6,
  mobPerDepth: 1.5,
  hpPerDepth: 0.22,      // +22% mob HP per depth
  dmgPerDepth: 0.16,
  itemLevelPerDepth: 1.0,
  // boss appears every depth; pick boss by depth tier
};

export function bossForDepth(depth) {
  if (depth >= 12) return BOSSES[3];
  if (depth >= 8) return BOSSES[2];
  if (depth >= 4) return BOSSES[1];
  return BOSSES[0];
}
