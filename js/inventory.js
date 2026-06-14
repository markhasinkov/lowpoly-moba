// ===== Inventory, equipment, and stat aggregation =====
import { SLOTS } from './config.js';

export const INVENTORY_CAP = 28;

// Per-level growth (applied for level-1 levels gained)
const GROW = { maxHp: 42, maxMana: 14, attackDamage: 4, armor: 0.6 };

export function initInventory(player, def) {
  player.baseStats = {
    maxHp: def.maxHp, hpRegen: def.hpRegen, maxMana: def.maxMana, manaRegen: def.manaRegen,
    moveSpeed: def.moveSpeed, attackRange: def.attackRange, attackDamage: def.attackDamage,
    attackSpeed: def.attackSpeed, armor: def.armor,
  };
  player.equipment = {};
  for (const s of SLOTS) player.equipment[s] = null;
  player.inventory = [];
}

export function recomputeStats(player) {
  const b = player.baseStats;
  const lv = Math.max(0, (player.level || 1) - 1);
  const t = {};
  const add = (k, v) => { t[k] = (t[k] || 0) + v; };
  for (const s of SLOTS) {
    const it = player.equipment[s];
    if (!it) continue;
    for (const [k, v] of Object.entries(it.stats)) add(k, v);
  }
  if (player.talentStats) for (const [k, v] of Object.entries(player.talentStats)) add(k, v);

  const prevMaxHp = player.maxHp || b.maxHp;
  const prevMaxMana = player.maxMana || b.maxMana;
  const hpRatio = player.hp != null ? player.hp / prevMaxHp : 1;
  const manaRatio = player.mana != null ? player.mana / prevMaxMana : 1;

  player.maxHp = Math.round(b.maxHp + lv * GROW.maxHp + (t.maxHp || 0));
  player.maxMana = Math.round(b.maxMana + lv * GROW.maxMana + (t.maxMana || 0));
  player.attackDamage = Math.round(b.attackDamage + lv * GROW.attackDamage + (t.attackDamage || 0));
  player.armor = Math.round((b.armor + lv * GROW.armor + (t.armor || 0)) * 10) / 10;
  player.hpRegen = b.hpRegen + (t.hpRegen || 0);
  player.manaRegen = b.manaRegen + (t.manaRegen || 0);
  player.baseMoveSpeed = b.moveSpeed + (t.moveSpeed || 0);
  if (!(player.buffE > 0)) player.moveSpeed = player.baseMoveSpeed;
  player.attackSpeed = Math.round(b.attackSpeed * (1 + (t.attackSpeedPct || 0)) * 100) / 100;
  player.critChance = t.critChance || 0;
  player.critMult = 1.8 + (t.critMult || 0);
  player.lifesteal = t.lifesteal || 0;
  player.cdr = Math.min(0.6, t.cdr || 0);
  player.spellAmp = t.spellAmp || 0;
  player.xpGain = t.xpGain || 0;

  player.hp = Math.min(player.maxHp, Math.max(1, Math.round(player.maxHp * hpRatio)));
  player.mana = Math.min(player.maxMana, Math.round(player.maxMana * manaRatio));
}

export function addToInventory(player, item) {
  if (player.inventory.length >= INVENTORY_CAP) return false;
  player.inventory.push(item);
  return true;
}

// Compare two items in the same slot by total weighted stat value (for "is it an upgrade?").
function itemScore(it) {
  if (!it) return 0;
  let s = 0;
  for (const [k, v] of Object.entries(it.stats)) {
    if (['critChance', 'critMult', 'attackSpeedPct', 'lifesteal', 'cdr', 'spellAmp', 'xpGain'].includes(k)) s += v * 600;
    else if (k === 'maxHp') s += v * 0.5;
    else if (k === 'moveSpeed') s += v * 30;
    else s += v;
  }
  return s;
}

export function isUpgrade(player, item) {
  return itemScore(item) > itemScore(player.equipment[item.slot]);
}

export function equipItem(player, item) {
  const slot = item.slot;
  const idx = player.inventory.indexOf(item);
  if (idx >= 0) player.inventory.splice(idx, 1);
  const prev = player.equipment[slot];
  player.equipment[slot] = item;
  if (prev) player.inventory.push(prev);
  recomputeStats(player);
  return prev;
}

export function unequip(player, slot) {
  const it = player.equipment[slot];
  if (!it) return;
  if (player.inventory.length >= INVENTORY_CAP) return;
  player.equipment[slot] = null;
  player.inventory.push(it);
  recomputeStats(player);
}

export function dropFromInventory(player, item) {
  const idx = player.inventory.indexOf(item);
  if (idx >= 0) player.inventory.splice(idx, 1);
}
