// ===== Loot generation: bases + rarity + affixes =====
import { ITEM_BASES, AFFIXES, RARITY } from './config.js';

let _uid = 1;

export function rollRarity(bonus = 0, rng = Math.random) {
  const total = RARITY.reduce((s, r) => s + r.weight, 0);
  let roll = rng() * total, idx = 0;
  for (let i = 0; i < RARITY.length; i++) { roll -= RARITY[i].weight; if (roll <= 0) { idx = i; break; } }
  for (let b = 0; b < bonus; b++) { if (rng() < 0.55 && idx < RARITY.length - 1) idx++; }
  return RARITY[idx];
}

export function rarityById(id) { return RARITY.find(r => r.id === id) || RARITY[0]; }
export function rarityIndex(id) { return RARITY.findIndex(r => r.id === id); }

// Generate an item. minRarityId forces at least that grade (for boss drops).
export function generateItem(ilvl, rng = Math.random, rarityBonus = 0, minRarityId = null) {
  const baseT = ITEM_BASES[(rng() * ITEM_BASES.length) | 0];
  let rarity = rollRarity(rarityBonus, rng);
  if (minRarityId) {
    const minIdx = rarityIndex(minRarityId);
    if (rarityIndex(rarity.id) < minIdx) rarity = RARITY[minIdx];
  }
  const stats = {};
  const add = (k, v) => { stats[k] = (stats[k] || 0) + v; };
  for (const [k, v] of Object.entries(baseT.base || {})) add(k, v);
  for (const [k, v] of Object.entries(baseT.perLevel || {})) add(k, v * ilvl);

  const affixes = [];
  const pool = AFFIXES.slice();
  for (let i = 0; i < rarity.affixes && pool.length; i++) {
    const a = pool.splice((rng() * pool.length) | 0, 1)[0];
    const raw = (a.base + a.per * ilvl) * (0.85 + rng() * 0.3);
    const step = a.round || 1;
    const disp = Math.max(step, Math.round(raw / step) * step);
    const key = a.asMult ? 'attackSpeedPct' : a.id;
    const val = a.pct ? disp / 100 : disp;
    add(key, val);
    affixes.push({ id: a.id, label: a.label.replace('{v}', step < 1 ? disp.toFixed(1) : disp) });
  }

  // tidy flat stats for clean tooltips
  for (const k of Object.keys(stats)) {
    if (['attackDamage', 'maxHp', 'armor', 'maxMana'].includes(k)) stats[k] = Math.round(stats[k]);
    else stats[k] = Math.round(stats[k] * 1000) / 1000;
  }

  return {
    uid: _uid++,
    slot: baseT.slot,
    icon: baseT.icon,
    rarity: rarity.id,
    rarityName: rarity.name,
    color: rarity.color,
    hex: rarity.hex,
    ilvl,
    stats,
    affixes,
    name: (rarity.id === 'common' ? '' : rarity.name + ' ') + baseT.name,
  };
}

// Roll a possible drop. Returns item or null.
export function rollDrop(dropChance, ilvl, rarityBonus = 0, minRarityId = null, rng = Math.random) {
  if (!minRarityId && rng() > dropChance) return null;
  return generateItem(ilvl, rng, rarityBonus, minRarityId);
}

// Human-readable stat lines for a stats map (used in tooltips).
const STAT_LABEL = {
  attackDamage: (v) => `+${Math.round(v)} урон`,
  maxHp: (v) => `+${Math.round(v)} HP`,
  armor: (v) => `+${Math.round(v)} броня`,
  maxMana: (v) => `+${Math.round(v)} мана`,
  manaRegen: (v) => `+${v.toFixed(1)} реген маны`,
  moveSpeed: (v) => `+${v.toFixed(1)} скорость`,
  critChance: (v) => `+${Math.round(v * 100)}% крит`,
  critMult: (v) => `+${Math.round(v * 100)}% урон крита`,
  attackSpeedPct: (v) => `+${Math.round(v * 100)}% скор. атаки`,
  lifesteal: (v) => `+${Math.round(v * 100)}% вампиризм`,
  cdr: (v) => `-${Math.round(v * 100)}% перезарядка`,
  spellAmp: (v) => `+${Math.round(v * 100)}% урон умений`,
  xpGain: (v) => `+${Math.round(v * 100)}% опыт`,
};

export function statLines(stats) {
  const out = [];
  for (const [k, v] of Object.entries(stats)) {
    if (!v) continue;
    out.push(STAT_LABEL[k] ? STAT_LABEL[k](v) : `+${v} ${k}`);
  }
  return out;
}
