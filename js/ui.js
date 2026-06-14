import { scaleAbility, MAX_ABILITY_LEVEL, MAX_ULT_LEVEL, xpForLevel, SLOTS, SLOT_NAMES } from './config.js';
import { statLines } from './loot.js';

const CAST_KEY = { Q: '1', W: '2', E: '3', R: '4' };

export class UI {
  constructor() {
    this.hpFill = document.getElementById('hp-fill');
    this.hpText = document.getElementById('hp-text');
    this.manaFill = document.getElementById('mana-fill');
    this.manaText = document.getElementById('mana-text');
    this.xpFill = document.getElementById('xp-fill');
    this.levelEl = document.getElementById('level');
    this.goldEl = document.getElementById('gold');
    this.depthEl = document.getElementById('depth');
    this.spEl = document.getElementById('skillpoints');
    this.toast = document.getElementById('toast');
    this.classSelect = document.getElementById('class-select');
    this.classCards = document.getElementById('class-cards');
    this.bossBar = document.getElementById('boss-bar');
    this.bossName = document.getElementById('boss-name');
    this.bossHp = document.getElementById('boss-hp-fill');
    this.invPanel = document.getElementById('inventory-panel');
    this.equipGrid = document.getElementById('equip-grid');
    this.invGrid = document.getElementById('inv-grid');
    this.charStats = document.getElementById('char-stats');
    this.abilityEls = { Q: document.getElementById('ab-Q'), W: document.getElementById('ab-W'), E: document.getElementById('ab-E'), R: document.getElementById('ab-R') };
    this._toastT = 0;
    this._invOpen = false;
    this.callbacks = { onEquip: () => {}, onUnequip: () => {}, onLevelAbility: () => {} };
    for (const k of ['Q', 'W', 'E', 'R']) {
      const btn = this.abilityEls[k] && this.abilityEls[k].querySelector('.levelup');
      if (btn) btn.addEventListener('click', (e) => { e.stopPropagation(); this.callbacks.onLevelAbility(k); });
    }
  }

  showClassSelect(defs, onPick) {
    if (!this.classCards) return;
    const colors = { Warrior: '#8fe0ff', Mage: '#c08bff', Rogue: '#ffd24f' };
    let html = '';
    for (const d of defs) {
      const c = colors[d.role] || '#7fe0a8';
      html += `<div class="hero-card" data-id="${d.id}" style="--accent:${c}">
        <div class="hc-name">${d.name}</div><div class="hc-role">${d.role}</div>
        <div class="hc-desc">${d.desc}</div>
        <div class="hc-stats"><span>❤️ ${d.maxHp}</span><span>🗡️ ${d.attackDamage}</span><span>🛡️ ${d.armor}</span></div>
        <button class="hc-pick">Играть</button></div>`;
    }
    this.classCards.innerHTML = html;
    this.classCards.querySelectorAll('.hero-card').forEach(el => el.addEventListener('click', () => onPick(el.dataset.id)));
    this.classSelect.style.display = 'flex';
  }
  hideClassSelect() { if (this.classSelect) this.classSelect.style.display = 'none'; }

  showToast(msg, dur = 2.0, color) {
    if (!this.toast) return;
    this.toast.textContent = msg;
    this.toast.style.color = color || '#eaf2ff';
    this.toast.classList.add('show');
    this._toastT = dur;
  }
  updateToast(dt) { if (this._toastT > 0) { this._toastT -= dt; if (this._toastT <= 0) this.toast.classList.remove('show'); } }

  updateHud(p, depth) {
    if (!p) return;
    this.hpFill.style.width = Math.max(0, p.hp / p.maxHp * 100) + '%';
    this.hpText.textContent = `${Math.ceil(p.hp)} / ${Math.round(p.maxHp)}`;
    this.manaFill.style.width = Math.max(0, p.mana / p.maxMana * 100) + '%';
    this.manaText.textContent = `${Math.ceil(p.mana)} / ${Math.round(p.maxMana)}`;
    const need = xpForLevel(p.level);
    this.xpFill.style.width = Math.min(100, p.xp / need * 100) + '%';
    this.levelEl.textContent = p.level;
    this.goldEl.textContent = Math.floor(p.gold);
    if (this.depthEl) this.depthEl.textContent = depth;
    if (this.spEl) { this.spEl.textContent = p.skillPoints; this.spEl.parentElement.style.visibility = p.skillPoints > 0 ? 'visible' : 'hidden'; }
  }

  updateAbilities(p) {
    if (!p.abilities) return;
    for (const k of ['Q', 'W', 'E', 'R']) {
      const el = this.abilityEls[k]; if (!el) continue;
      const ab = p.abilities[k];
      const lvl = p.abilityLevels ? (p.abilityLevels[k] || 0) : 0;
      const cd = p['cd' + k] || 0;
      const cover = el.querySelector('.cd-cover'), label = el.querySelector('.cd-label'), nameEl = el.querySelector('.name');
      if (nameEl) nameEl.textContent = `${ab.icon}`;
      const max = ab.cooldown || 1;
      if (cd > 0) { cover.style.height = Math.min(100, cd / max * 100) + '%'; label.textContent = cd.toFixed(1); el.classList.add('on-cd'); }
      else { cover.style.height = '0%'; label.textContent = ''; el.classList.remove('on-cd'); }
      const pips = el.querySelectorAll('.pip');
      pips.forEach((pp, i) => pp.classList.toggle('filled', i < lvl));
      const cap = k === 'R' ? MAX_ULT_LEVEL : MAX_ABILITY_LEVEL;
      let canLevel = p.skillPoints > 0 && lvl < cap;
      if (k === 'R' && canLevel && p.level < ((ab.ultReq || 6) + lvl * 5)) canLevel = false;
      const btn = el.querySelector('.levelup');
      if (btn) btn.style.display = canLevel ? 'flex' : 'none';
      el.classList.toggle('learnable', canLevel);
      el.classList.toggle('locked', lvl < 1);
      el.title = this._abTip(k, p, lvl);
    }
  }
  _abTip(key, p, lvl) {
    const ab = p.abilities[key];
    const s = scaleAbility(ab, Math.max(1, lvl));
    const head = lvl < 1 ? `${ab.icon} ${ab.name} — НЕ ИЗУЧЕНО` : `${ab.icon} ${ab.name} — ур.${lvl}`;
    const dmg = s.damage ? `\nУрон ${Math.round(s.damage)}` : '';
    return `${head} [${CAST_KEY[key]}]\n${ab.desc}${dmg}\nМана ${ab.manaCost} · КД ${ab.cooldown}с`;
  }
  flashAbility(key) {
    const el = this.abilityEls[key]; if (!el) return;
    el.classList.remove('cast'); void el.offsetWidth; el.classList.add('cast');
    setTimeout(() => el.classList.remove('cast'), 320);
  }

  updateBossBar(boss) {
    if (!this.bossBar) return;
    if (!boss || !boss.alive) { this.bossBar.style.display = 'none'; return; }
    this.bossBar.style.display = 'block';
    this.bossName.textContent = boss.name;
    if (boss.gradeColor) this.bossName.style.color = '#' + boss.gradeColor.toString(16).padStart(6, '0');
    this.bossHp.style.width = Math.max(0, boss.hp / boss.maxHp * 100) + '%';
  }

  isInventoryOpen() { return this._invOpen; }
  toggleInventory(p) { this._invOpen = !this._invOpen; this.invPanel.style.display = this._invOpen ? 'flex' : 'none'; if (this._invOpen) this.refreshInventory(p); }

  _itemTip(it) {
    const lines = statLines(it.stats).join('\n');
    const affs = it.affixes && it.affixes.length ? '\n' + it.affixes.map(a => a.label).join('\n') : '';
    return `${it.name} (ур.${it.ilvl})\n${lines}${affs}`;
  }
  refreshInventory(p) {
    if (!this.equipGrid) return;
    let eq = '';
    for (const s of SLOTS) {
      const it = p.equipment[s];
      eq += `<div class="eq-slot ${it ? 'filled' : ''}" data-slot="${s}" title="${it ? this._itemTip(it) : SLOT_NAMES[s]}" style="${it ? `--rc:${it.color}` : ''}">
        <span class="eq-label">${SLOT_NAMES[s]}</span><span class="eq-icon">${it ? it.icon : ''}</span></div>`;
    }
    this.equipGrid.innerHTML = eq;
    this.equipGrid.querySelectorAll('.eq-slot').forEach(el => el.addEventListener('click', () => this.callbacks.onUnequip(el.dataset.slot)));

    let inv = '';
    p.inventory.forEach((it, i) => {
      inv += `<div class="inv-slot" data-i="${i}" title="${this._itemTip(it)}" style="--rc:${it.color}"><span>${it.icon}</span></div>`;
    });
    this.invGrid.innerHTML = inv;
    this.invGrid.querySelectorAll('.inv-slot').forEach(el => el.addEventListener('click', () => {
      const it = p.inventory[parseInt(el.dataset.i, 10)]; if (it) this.callbacks.onEquip(it);
    }));

    if (this.charStats) {
      this.charStats.innerHTML = [
        `❤️ HP ${Math.round(p.maxHp)}`, `🔵 Мана ${Math.round(p.maxMana)}`,
        `🗡️ Урон ${Math.round(p.attackDamage)}`, `🛡️ Броня ${p.armor.toFixed(1)}`,
        `⚡ Скор.атаки ${p.attackSpeed.toFixed(2)}`, `👟 Скорость ${p.baseMoveSpeed.toFixed(1)}`,
        `💥 Крит ${Math.round((p.critChance || 0) * 100)}%`, `🩸 Вампиризм ${Math.round((p.lifesteal || 0) * 100)}%`,
        `⏱️ КД −${Math.round((p.cdr || 0) * 100)}%`, `✨ Урон умений +${Math.round((p.spellAmp || 0) * 100)}%`,
      ].map(s => `<span>${s}</span>`).join('');
    }
  }

  showGameOver(win) {
    const go = document.getElementById('gameover');
    if (!go) return;
    go.style.display = 'flex';
    go.querySelector('h1').textContent = win ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ';
  }
}
