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
  { slot: 'weapon', name: 'Секира',   icon: '🪓', base: { attackDamage: 11 }, perLevel: { attackDamage: 3.6 } },
  { slot: 'weapon', name: 'Кинжал',   icon: '🔪', base: { attackDamage: 6, critChance: 0.05 }, perLevel: { attackDamage: 2, critChance: 0.004 } },
  { slot: 'weapon', name: 'Лук',      icon: '🏹', base: { attackDamage: 7, attackSpeedPct: 0.08 }, perLevel: { attackDamage: 2.4 } },
  { slot: 'helmet', name: 'Корона',   icon: '👑', base: { maxMana: 60, spellAmp: 0.04 }, perLevel: { maxMana: 18, spellAmp: 0.008 } },
  { slot: 'armor',  name: 'Мантия',   icon: '🧥', base: { maxMana: 60, spellAmp: 0.05, armor: 2 }, perLevel: { maxMana: 20, spellAmp: 0.012 } },
  { slot: 'armor',  name: 'Кожаный доспех', icon: '🦺', base: { armor: 3, maxHp: 30, moveSpeed: 0.4 }, perLevel: { armor: 1.3, maxHp: 16 } },
  { slot: 'boots',  name: 'Сапоги скорости', icon: '🥾', base: { moveSpeed: 1.1 }, perLevel: { moveSpeed: 0.03, armor: 0.6 } },
  { slot: 'ring',   name: 'Печатка',  icon: '💎', base: { attackDamage: 5 }, perLevel: { attackDamage: 1.6 } },
  { slot: 'ring',   name: 'Кольцо маны', icon: '🔮', base: { maxMana: 40, cdr: 0.03 }, perLevel: { maxMana: 14 } },
  { slot: 'amulet', name: 'Талисман', icon: '🧿', base: { maxHp: 50, armor: 2 }, perLevel: { maxHp: 18 } },
  { slot: 'amulet', name: 'Кулон вампира', icon: '🩸', base: { lifesteal: 0.05, attackDamage: 4 }, perLevel: { attackDamage: 1.2 } },
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
  { id: 'hpRegen',     label: '+{v} реген HP',          base: 2,    per: 0.6,  round: 1 },
  { id: 'manaRegen',   label: '+{v} реген маны',        base: 1.5,  per: 0.4,  round: 0.1 },
];

// ===== Unique legendaries — fixed special items (rolled on legendary drops) =====
export const UNIQUES = [
  { slot: 'weapon', name: 'Губитель Душ',     icon: '🗡️', base: { attackDamage: 20, lifesteal: 0.10, critChance: 0.06 }, perLevel: { attackDamage: 4 } },
  { slot: 'weapon', name: 'Посох Вечности',   icon: '🪄', base: { attackDamage: 10, spellAmp: 0.25, maxMana: 120 }, perLevel: { attackDamage: 2, spellAmp: 0.02 } },
  { slot: 'weapon', name: 'Клинки Бури',      icon: '🔪', base: { attackDamage: 12, attackSpeedPct: 0.25, critChance: 0.08 }, perLevel: { attackDamage: 3 } },
  { slot: 'armor',  name: 'Доспех Бессмертного', icon: '🥋', base: { armor: 12, maxHp: 300, hpRegen: 6 }, perLevel: { armor: 2, maxHp: 30 } },
  { slot: 'helmet', name: 'Венец Архонта',    icon: '👑', base: { maxMana: 150, spellAmp: 0.12, cdr: 0.08 }, perLevel: { maxMana: 20 } },
  { slot: 'boots',  name: 'Поступь Ветра',    icon: '🥾', base: { moveSpeed: 2.5, attackSpeedPct: 0.12 }, perLevel: {} },
  { slot: 'ring',   name: 'Печать Палача',    icon: '💍', base: { critChance: 0.10, critMult: 0.40 }, perLevel: {} },
  { slot: 'amulet', name: 'Сердце Дракона',   icon: '📿', base: { maxHp: 220, lifesteal: 0.12, attackDamage: 14 }, perLevel: { maxHp: 18, attackDamage: 2 } },
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
  { id: 'skmage',    name: 'Скелет-маг',    model: 'mage',    maxHp: 80,  attackDamage: 17, attackRange: 20, attackSpeed: 0.8, armor: 1, moveSpeed: 7, xp: 40, gold: 13, attackType: 'ranged', projectile: { speed: 34, color: 0xb96bff, radius: 1.1 } },
  { id: 'scout',     name: 'Скелет-разведчик', model: 'minion',  scale: 0.9,  maxHp: 60,  attackDamage: 11, attackRange: 5,  attackSpeed: 1.3, armor: 0, moveSpeed: 11, xp: 20, gold: 6,  attackType: 'melee', tint: 0x9be29b },
  { id: 'brute',     name: 'Костолом',        model: 'warrior', scale: 1.35, maxHp: 280, attackDamage: 30, attackRange: 5,  attackSpeed: 0.7, armor: 5, moveSpeed: 5.5, xp: 55, gold: 18, attackType: 'melee', tint: 0xff6a4a },
  { id: 'venom',     name: 'Ядовитый скелет', model: 'minion',  maxHp: 100, attackDamage: 16, attackRange: 5,  attackSpeed: 1.0, armor: 1, moveSpeed: 8,  xp: 28, gold: 9,  attackType: 'melee', tint: 0x6fdf3a, status: 'poison' },
  { id: 'hellhound', name: 'Адская гончая',   model: 'minion',  scale: 0.95, maxHp: 120, attackDamage: 22, attackRange: 5,  attackSpeed: 1.2, armor: 1, moveSpeed: 12, xp: 38, gold: 12, attackType: 'melee', tint: 0xff8a3a },
  { id: 'revenant',  name: 'Ревенант',        model: 'warrior', maxHp: 200, attackDamage: 26, attackRange: 5,  attackSpeed: 0.85, armor: 4, moveSpeed: 7, xp: 48, gold: 16, attackType: 'melee', tint: 0xb96bff },
  { id: 'archer',    name: 'Скелет-лучник',   model: 'mage',    maxHp: 70,  attackDamage: 15, attackRange: 22, attackSpeed: 1.0, armor: 0, moveSpeed: 8,  xp: 30, gold: 10, attackType: 'ranged', projectile: { speed: 40, color: 0xe0cf88, radius: 0.8 }, tint: 0xc9b27a },
  { id: 'frostmage', name: 'Ледяной маг',     model: 'mage',    maxHp: 90,  attackDamage: 20, attackRange: 20, attackSpeed: 0.8, armor: 1, moveSpeed: 7,  xp: 42, gold: 14, attackType: 'ranged', projectile: { speed: 32, color: 0x6fc6ff, radius: 1.1 }, tint: 0x8fd6ff, status: 'slow' },
];
export const MOB_BY_ID = Object.fromEntries(MOB_TYPES.map((t) => [t.id, t]));

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

// ===== Consumables & merchant =====
export const POTION = { heal: 0.4, cooldown: 8, startCharges: 3, max: 6, cost: 60 };

// Gear bundles sold by the merchant. cost scales with depth in main.js.
export const SHOP_GEAR = [
  { label: 'Снаряжение (обычный шанс)', bonus: 0, cost: 150 },
  { label: 'Снаряжение (хороший шанс)', bonus: 1, cost: 350 },
  { label: 'Снаряжение (отличный шанс)', bonus: 2, cost: 750 },
];

// ===== Talents — choice of permanent bonus at key levels =====
export const TALENT_LEVELS = [3, 6, 9, 12, 15, 18, 21, 24];
export const TALENTS = [
  { id: 'might',    name: 'Мощь',        icon: '🗡️', desc: '+22 к урону',          stats: { attackDamage: 22 } },
  { id: 'vigor',    name: 'Живучесть',   icon: '❤️', desc: '+220 к здоровью',       stats: { maxHp: 220 } },
  { id: 'fury',     name: 'Ярость',      icon: '⚡', desc: '+18% скорости атаки',  stats: { attackSpeedPct: 0.18 } },
  { id: 'deadly',   name: 'Смертоносность', icon: '💥', desc: '+12% шанс крита',     stats: { critChance: 0.12 } },
  { id: 'brutal',   name: 'Жестокость',  icon: '🎯', desc: '+40% урон крита',      stats: { critMult: 0.40 } },
  { id: 'vampiric', name: 'Вампиризм',    icon: '🦦', desc: '+12% вампиризм',       stats: { lifesteal: 0.12 } },
  { id: 'arcane',   name: 'Чародейство', icon: '✨', desc: '+20% урон умений',     stats: { spellAmp: 0.20 } },
  { id: 'swift',    name: 'Скорость',     icon: '👟', desc: '+1.5 к скорости',       stats: { moveSpeed: 1.5 } },
  { id: 'haste',    name: 'Ускорение',   icon: '⏱️', desc: '-12% перезарядка',       stats: { cdr: 0.12 } },
  { id: 'bulwark',  name: 'Оплот',       icon: '🛡️', desc: '+8 к броне',           stats: { armor: 8 } },
];

// ===== Per-class talent trees — one tier chosen at each TALENT_LEVELS milestone =====
export const CLASS_TALENTS = {
  guardian: [
    { name: 'Основа', options: [
      { id: 'g_might', name: 'Мощь', icon: '🗡️', desc: '+16 урон', stats: { attackDamage: 16 } },
      { id: 'g_vit', name: 'Стойкость', icon: '❤️', desc: '+180 HP', stats: { maxHp: 180 } },
      { id: 'g_arm', name: 'Закал', icon: '🛡️', desc: '+6 броня', stats: { armor: 6 } },
    ] },
    { name: 'Защита', options: [
      { id: 'g_aegis', name: 'Эгида', icon: '🛡️', desc: '+10 броня', stats: { armor: 10 } },
      { id: 'g_iron', name: 'Железная кожа', icon: '❤️', desc: '+260 HP', stats: { maxHp: 260 } },
      { id: 'g_regen', name: 'Регенерация', icon: '💗', desc: '+6 реген HP', stats: { hpRegen: 6 } },
    ] },
    { name: 'Натиск', options: [
      { id: 'g_crus', name: 'Крестоносец', icon: '⚔️', desc: '+26 урон', stats: { attackDamage: 26 } },
      { id: 'g_vamp', name: 'Жажда крови', icon: '🩸', desc: '+10% вампиризм', stats: { lifesteal: 0.10 } },
      { id: 'g_brut', name: 'Жестокость', icon: '💥', desc: '+35% урон крита', stats: { critMult: 0.35 } },
    ] },
    { name: 'Бастион', options: [
      { id: 'g_fort', name: 'Крепость', icon: '🏰', desc: '+14 броня, +200 HP', stats: { armor: 14, maxHp: 200 } },
      { id: 'g_haste', name: 'Натиск', icon: '⏱️', desc: '−14% перезарядка', stats: { cdr: 0.14 } },
      { id: 'g_swift', name: 'Поступь', icon: '👟', desc: '+1.5 скорость', stats: { moveSpeed: 1.5 } },
    ] },
    { name: 'Гнев', options: [
      { id: 'g_bers', name: 'Берсерк', icon: '🔥', desc: '+36 урон, +15% ск.атаки', stats: { attackDamage: 36, attackSpeedPct: 0.15 } },
      { id: 'g_drain', name: 'Кровопийца', icon: '🩸', desc: '+14% вампиризм', stats: { lifesteal: 0.14 } },
      { id: 'g_titan', name: 'Титан', icon: '❤️', desc: '+420 HP', stats: { maxHp: 420 } },
    ] },
    { name: 'Несокрушимость', options: [
      { id: 'g_jugg', name: 'Джагернаут', icon: '🛡️', desc: '+18 броня, +8 реген', stats: { armor: 18, hpRegen: 8 } },
      { id: 'g_war', name: 'Полководец', icon: '⚔️', desc: '+44 урон', stats: { attackDamage: 44 } },
      { id: 'g_guard', name: 'Защитник', icon: '💥', desc: '+8% крит, +24% урон крита', stats: { critChance: 0.08, critMult: 0.24 } },
    ] },
    { name: 'Легенда', options: [
      { id: 'g_col', name: 'Колосс', icon: '🏔️', desc: '+600 HP, +12 броня', stats: { maxHp: 600, armor: 12 } },
      { id: 'g_exec', name: 'Палач', icon: '💀', desc: '+60% урон крита', stats: { critMult: 0.60 } },
      { id: 'g_blood', name: 'Кровавая ярость', icon: '🩸', desc: '+20% вампиризм, +12% ск.атаки', stats: { lifesteal: 0.20, attackSpeedPct: 0.12 } },
    ] },
    { name: 'Аватар', options: [
      { id: 'g_ava', name: 'Аватар войны', icon: '⚔️', desc: '+70 урон, +400 HP', stats: { attackDamage: 70, maxHp: 400 } },
      { id: 'g_imm', name: 'Бессмертный', icon: '❤️', desc: '+900 HP, +12 реген', stats: { maxHp: 900, hpRegen: 12 } },
      { id: 'g_unstop', name: 'Неудержимый', icon: '🛡️', desc: '+24 броня, −18% перезарядка', stats: { armor: 24, cdr: 0.18 } },
    ] },
  ],
  mage: [
    { name: 'Искра', options: [
      { id: 'm_arc', name: 'Чародейство', icon: '✨', desc: '+12% урон умений', stats: { spellAmp: 0.12 } },
      { id: 'm_mana', name: 'Резерв', icon: '🔵', desc: '+120 мана', stats: { maxMana: 120 } },
      { id: 'm_foc', name: 'Фокус', icon: '🗡️', desc: '+14 урон', stats: { attackDamage: 14 } },
    ] },
    { name: 'Поток маны', options: [
      { id: 'm_chan', name: 'Поток', icon: '💧', desc: '+4 реген маны', stats: { manaRegen: 4 } },
      { id: 'm_haste', name: 'Ускорение', icon: '⏱️', desc: '−12% перезарядка', stats: { cdr: 0.12 } },
      { id: 'm_pow', name: 'Сила', icon: '✨', desc: '+16% урон умений', stats: { spellAmp: 0.16 } },
    ] },
    { name: 'Чары', options: [
      { id: 'm_prec', name: 'Точность', icon: '💥', desc: '+10% крит', stats: { critChance: 0.10 } },
      { id: 'm_amp', name: 'Усиление', icon: '✨', desc: '+20% урон умений', stats: { spellAmp: 0.20 } },
      { id: 'm_res', name: 'Океан маны', icon: '🔵', desc: '+200 мана', stats: { maxMana: 200 } },
    ] },
    { name: 'Мудрость', options: [
      { id: 'm_sch', name: 'Учёный', icon: '📚', desc: '+15% опыта', stats: { xpGain: 0.15 } },
      { id: 'm_blink', name: 'Мерцание', icon: '👟', desc: '+1.5 скорость', stats: { moveSpeed: 1.5 } },
      { id: 'm_alac', name: 'Проворство', icon: '⏱️', desc: '−16% перезарядка', stats: { cdr: 0.16 } },
    ] },
    { name: 'Стихия', options: [
      { id: 'm_elem', name: 'Стихийник', icon: '🔥', desc: '+26% урон умений', stats: { spellAmp: 0.26 } },
      { id: 'm_bm', name: 'Боевой маг', icon: '⚔️', desc: '+30 урон, +10% урон умений', stats: { attackDamage: 30, spellAmp: 0.10 } },
      { id: 'm_acrit', name: 'Магокрит', icon: '💥', desc: '+12% крит, +30% урон крита', stats: { critChance: 0.12, critMult: 0.30 } },
    ] },
    { name: 'Высшая магия', options: [
      { id: 'm_high', name: 'Высшая магия', icon: '✨', desc: '+30% урон умений, +200 мана', stats: { spellAmp: 0.30, maxMana: 200 } },
      { id: 'm_well', name: 'Источник', icon: '💧', desc: '+8 реген маны', stats: { manaRegen: 8 } },
      { id: 'm_quick', name: 'Скоротечность', icon: '⏱️', desc: '−20% перезарядка', stats: { cdr: 0.20 } },
    ] },
    { name: 'Архимаг', options: [
      { id: 'm_archi', name: 'Архимаг', icon: '🌟', desc: '+40% урон умений', stats: { spellAmp: 0.40 } },
      { id: 'm_void', name: 'Бездна', icon: '💥', desc: '+20% урон умений, +15% крит', stats: { spellAmp: 0.20, critChance: 0.15 } },
      { id: 'm_font', name: 'Бездонный', icon: '🔵', desc: '+400 мана, +6 реген маны', stats: { maxMana: 400, manaRegen: 6 } },
    ] },
    { name: 'Вознесение', options: [
      { id: 'm_asc', name: 'Вознесение', icon: '🌟', desc: '+55% урон умений', stats: { spellAmp: 0.55 } },
      { id: 'm_time', name: 'Властелин времени', icon: '⏱️', desc: '+30% урон умений, −20% перезарядка', stats: { spellAmp: 0.30, cdr: 0.20 } },
      { id: 'm_war', name: 'Боевой архонт', icon: '⚔️', desc: '+50 урон, +25% урон умений', stats: { attackDamage: 50, spellAmp: 0.25 } },
    ] },
  ],
  assassin: [
    { name: 'Клинок', options: [
      { id: 'a_crit', name: 'Точность', icon: '💥', desc: '+10% крит', stats: { critChance: 0.10 } },
      { id: 'a_as', name: 'Ловкость', icon: '⚡', desc: '+15% ск.атаки', stats: { attackSpeedPct: 0.15 } },
      { id: 'a_dmg', name: 'Заточка', icon: '🗡️', desc: '+14 урон', stats: { attackDamage: 14 } },
    ] },
    { name: 'Тень', options: [
      { id: 'a_move', name: 'Тень', icon: '👟', desc: '+1.5 скорость', stats: { moveSpeed: 1.5 } },
      { id: 'a_ls', name: 'Кровосос', icon: '🩸', desc: '+10% вампиризм', stats: { lifesteal: 0.10 } },
      { id: 'a_cm', name: 'Жестокость', icon: '💥', desc: '+30% урон крита', stats: { critMult: 0.30 } },
    ] },
    { name: 'Ловкость', options: [
      { id: 'a_as2', name: 'Вихрь', icon: '⚡', desc: '+20% ск.атаки', stats: { attackSpeedPct: 0.20 } },
      { id: 'a_crit2', name: 'Меткость', icon: '💥', desc: '+12% крит', stats: { critChance: 0.12 } },
      { id: 'a_dmg2', name: 'Резак', icon: '🗡️', desc: '+24 урон', stats: { attackDamage: 24 } },
    ] },
    { name: 'Жажда', options: [
      { id: 'a_ls2', name: 'Жажда', icon: '🩸', desc: '+14% вампиризм', stats: { lifesteal: 0.14 } },
      { id: 'a_cdr', name: 'Проворство', icon: '⏱️', desc: '−14% перезарядка', stats: { cdr: 0.14 } },
      { id: 'a_move2', name: 'Стремительность', icon: '👟', desc: '+2 скорость', stats: { moveSpeed: 2 } },
    ] },
    { name: 'Смертоносность', options: [
      { id: 'a_deadly', name: 'Смертоносность', icon: '💥', desc: '+15% крит, +30% урон крита', stats: { critChance: 0.15, critMult: 0.30 } },
      { id: 'a_flurry', name: 'Шквал', icon: '⚡', desc: '+25% ск.атаки', stats: { attackSpeedPct: 0.25 } },
      { id: 'a_blood', name: 'Кровавый клинок', icon: '🩸', desc: '+36 урон, +10% вампиризм', stats: { attackDamage: 36, lifesteal: 0.10 } },
    ] },
    { name: 'Убийца', options: [
      { id: 'a_exec', name: 'Палач', icon: '💀', desc: '+50% урон крита', stats: { critMult: 0.50 } },
      { id: 'a_relent', name: 'Неистовство', icon: '⚡', desc: '+22% ск.атаки, +10% крит', stats: { attackSpeedPct: 0.22, critChance: 0.10 } },
      { id: 'a_leech', name: 'Пиявка', icon: '🩸', desc: '+18% вампиризм', stats: { lifesteal: 0.18 } },
    ] },
    { name: 'Призрак', options: [
      { id: 'a_ghost', name: 'Призрак', icon: '💥', desc: '+18% крит, +40% урон крита', stats: { critChance: 0.18, critMult: 0.40 } },
      { id: 'a_storm', name: 'Буря клинков', icon: '⚡', desc: '+30% ск.атаки', stats: { attackSpeedPct: 0.30 } },
      { id: 'a_phantom', name: 'Фантом', icon: '👟', desc: '+2.5 скорость, +15% вампиризм', stats: { moveSpeed: 2.5, lifesteal: 0.15 } },
    ] },
    { name: 'Жнец', options: [
      { id: 'a_reaper', name: 'Жнец', icon: '💀', desc: '+20% крит, +60% урон крита', stats: { critChance: 0.20, critMult: 0.60 } },
      { id: 'a_assault', name: 'Шторм', icon: '⚔️', desc: '+60 урон, +20% ск.атаки', stats: { attackDamage: 60, attackSpeedPct: 0.20 } },
      { id: 'a_vamplord', name: 'Владыка крови', icon: '🩸', desc: '+25% вампиризм, +12% крит', stats: { lifesteal: 0.25, critChance: 0.12 } },
    ] },
  ],
};

// ===== Biomes — varied zones per depth =====
export const BIOMES = [
  { id: 'forest',    name: 'Лес',          radius: 58, ground: [0x4a7c3f, 0x36602f, 0x577f43], skyTop: 0x2f6ec4, skyHorizon: 0xcfe6f0, fog: { color: 0xcfe6f0, near: 110, far: 230 }, hemiSky: 0xbfe0ff, hemiGround: 0x4a6b3a, moon: 0xfff0d2, fill: 0x88aaff, density: 150, cats: ['trees', 'rocks', 'bushes', 'grass', 'mushrooms'] },
  { id: 'crypt',     name: 'Склеп',        radius: 40, ground: [0x3a3a44, 0x2a2a32, 0x44414f], skyTop: 0x0a0a14, skyHorizon: 0x241f33, fog: { color: 0x14101c, near: 36, far: 110 }, hemiSky: 0x8a86b0, hemiGround: 0x201c2a, moon: 0xb8a6ff, fill: 0x6655aa, density: 55, cats: ['rocks', 'mushrooms'] },
  { id: 'wasteland', name: 'Пустошь',     radius: 76, ground: [0x6b5a3a, 0x554629, 0x7a6440], skyTop: 0x7a4a2a, skyHorizon: 0xd9a86a, fog: { color: 0xc99a63, near: 130, far: 280 }, hemiSky: 0xffd9a0, hemiGround: 0x6b5333, moon: 0xffe0b0, fill: 0xff9a55, density: 70, cats: ['rocks', 'stumps', 'trees'] },
  { id: 'frost',     name: 'Мерзлота',     radius: 54, ground: [0xa9c4d6, 0x8aa6bd, 0xc6dcec], skyTop: 0x2a5a8a, skyHorizon: 0xd6ecf7, fog: { color: 0xd6ecf7, near: 90, far: 210 }, hemiSky: 0xd6ecff, hemiGround: 0x6a8499, moon: 0xffffff, fill: 0x9ac4ff, density: 85, cats: ['trees', 'rocks'] },
  { id: 'infernal',  name: 'Преисподняя', radius: 64, ground: [0x3a1f1f, 0x2a1414, 0x4a2424], skyTop: 0x1a0606, skyHorizon: 0x5a1a10, fog: { color: 0x2a0c08, near: 56, far: 160 }, hemiSky: 0xff8a5c, hemiGround: 0x2a1010, moon: 0xff7040, fill: 0xff4020, density: 75, cats: ['rocks', 'stumps'] },
];
export function biomeForDepth(depth) { return BIOMES[(depth - 1) % BIOMES.length]; }
export const BIOME_MOBS = {
  forest:    ['skeleton', 'scout', 'venom', 'warrior'],
  crypt:     ['skeleton', 'skmage', 'revenant', 'warrior'],
  wasteland: ['warrior', 'brute', 'archer', 'scout'],
  frost:     ['skeleton', 'frostmage', 'warrior', 'revenant'],
  infernal:  ['hellhound', 'brute', 'skmage', 'revenant'],
};

// chance per depth for secret content
export const SECRET = { bossChance: 0.3, chestChance: 0.45 };
