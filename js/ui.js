import { scaleAbility, MAX_ABILITY_LEVEL, MAX_ULT_LEVEL, xpForLevel, SLOTS, SLOT_NAMES, POTION, SHOP_GEAR } from './config.js';
import { arenaRadiusMul, ARENA_SHAPE_NAMES } from './config.js';
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
    this._shopOpen = false;
    this._forgeOpen = false;
    this.npcPrompt = document.getElementById('npc-prompt');
    this.minimap = document.getElementById('minimap');
    this.miniCtx = this.minimap ? this.minimap.getContext('2d') : null;
    this.miniLabel = document.getElementById('minimap-label');
    this.callbacks = { onEquip: () => {}, onUnequip: () => {}, onLevelAbility: () => {}, onBuyPotion: () => {}, onBuyGear: () => {}, onSell: () => {}, isUpgrade: () => false, onSharpen: () => {}, onCombine: () => {} };
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
    const pc = document.getElementById('potion-count'); if (pc) pc.textContent = p.potions != null ? p.potions : 0;
  }

  isShopOpen() { return this._shopOpen; }
  toggleShop(p, depth) { this._shopOpen = !this._shopOpen; const el = document.getElementById('shop-panel'); if (el) el.style.display = this._shopOpen ? 'flex' : 'none'; if (this._shopOpen) this.renderShop(p, depth); }
  renderShop(p, depth) {
    const el = document.getElementById('shop-panel'); if (!el) return;
    let html = '<h3>\u0422\u043e\u0440\u0433\u043e\u0432\u0435\u0446 \u2014 \u0437\u043e\u043b\u043e\u0442\u043e: ' + Math.floor(p.gold) + '\ud83d\udcb0</h3>';
    html += `<div class="shop-item" data-buy="potion"><span>\ud83e\uddea \u0417\u0435\u043b\u044c\u0435 (+${Math.round(POTION.heal*100)}% HP) \u2014 ${p.potions}/${POTION.max}</span><span class="si-cost">${POTION.cost}\ud83d\udcb0</span></div>`;
    SHOP_GEAR.forEach((g, i) => {
      const cost = Math.round(g.cost * (1 + depth * 0.12));
      html += `<div class="shop-item" data-gear="${i}"><span>${g.label} (\u0443\u0440.${depth + 1})</span><span class="si-cost">${cost}\ud83d\udcb0</span></div>`;
    });
    html += '<div class="inv-hint">V \u2014 \u0437\u0430\u043a\u0440\u044b\u0442\u044c</div>';
    el.innerHTML = html;
    el.querySelectorAll('[data-buy="potion"]').forEach(b => b.addEventListener('click', () => this.callbacks.onBuyPotion()));
    el.querySelectorAll('[data-gear]').forEach(b => b.addEventListener('click', () => this.callbacks.onBuyGear(parseInt(b.dataset.gear, 10))));
  }

  isForgeOpen() { return this._forgeOpen; }
  toggleForge(p, depth) { this._forgeOpen = !this._forgeOpen; const el = document.getElementById('forge-panel'); if (el) el.style.display = this._forgeOpen ? 'flex' : 'none'; if (this._forgeOpen) this.renderForge(p, depth); }
  renderForge(p, depth) {
    const el = document.getElementById('forge-panel'); if (!el) return;
    const weapons = [];
    if (p.equipment.weapon) weapons.push({ it: p.equipment.weapon, where: 'надето' });
    p.inventory.forEach((it) => { if (it.slot === 'weapon') weapons.push({ it, where: 'сумка' }); });
    let html = '<h3>🔨 Кузница — золото: ' + Math.floor(p.gold) + '💰</h3>';
    html += '<div class="forge-hint">Заточка усиливает оружие (+урон, +крит). Макс +10.</div>';
    if (!weapons.length) html += '<div class="shop-item"><span>Нет оружия для заточки</span></div>';
    weapons.forEach((w, i) => {
      const lvl = w.it.sharpen || 0;
      const cost = Math.round(70 * (lvl + 1) * (1 + depth * 0.12));
      const max = lvl >= 10;
      html += `<div class="shop-item" data-sharp="${i}" style="--rc:${w.it.color}"><span>${w.it.icon} ${w.it.name} <span class="forge-where">(${w.where}, урон ${Math.round(w.it.stats.attackDamage || 0)})</span></span><span class="si-cost">${max ? 'МАКС' : cost + '💰'}</span></div>`;
    });
    const groups = {};
    p.inventory.forEach((it) => {
      if (it.unique || !['common', 'rare', 'magic', 'epic'].includes(it.rarity)) return;
      const key = it.base + '|' + it.rarity;
      (groups[key] = groups[key] || []).push(it);
    });
    const combos = Object.entries(groups).filter(([, arr]) => arr.length >= 3);
    if (combos.length) {
      html += '<div class="forge-hint" style="margin-top:8px">⚒ Ковка: 3 одинаковых → ранг выше (до легендарки с умением)</div>';
      combos.forEach(([key, arr]) => {
        const it = arr[0];
        html += `<div class="shop-item" data-combine="${key}" style="--rc:${it.color}"><span>⚒ ${it.icon} 3× ${it.rarityName} ${it.base}</span><span class="si-cost">${arr.length} шт</span></div>`;
      });
    }
    html += '<div class="inv-hint">F — закрыть</div>';
    el.innerHTML = html;
    const list = weapons.map(w => w.it);
    el.querySelectorAll('[data-sharp]').forEach(b => b.addEventListener('click', () => { const it = list[parseInt(b.dataset.sharp, 10)]; if (it) this.callbacks.onSharpen(it); }));
    el.querySelectorAll('[data-combine]').forEach(b => b.addEventListener('click', () => this.callbacks.onCombine(b.dataset.combine)));
  }
  showNpcPrompt(text) { const el = this.npcPrompt || document.getElementById('npc-prompt'); if (!el) return; el.textContent = text; el.style.display = 'block'; }
  hideNpcPrompt() { const el = this.npcPrompt || document.getElementById('npc-prompt'); if (el) el.style.display = 'none'; }

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
    const ench = it.enchant ? `\n⚡ ${it.enchant.name}: ${it.enchant.desc}` : '';
    return `${it.name} (ур.${it.ilvl})\n${lines}${affs}${ench}`;
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
      const up = this.callbacks.isUpgrade && this.callbacks.isUpgrade(it) ? ' upgrade' : '';
      inv += `<div class="inv-slot${up}" data-i="${i}" title="${this._itemTip(it)}\n[ПКМ — продать]" style="--rc:${it.color}"><span>${it.icon}</span></div>`;
    });
    this.invGrid.innerHTML = inv;
    this.invGrid.querySelectorAll('.inv-slot').forEach(el => {
      el.addEventListener('click', () => { const it = p.inventory[parseInt(el.dataset.i, 10)]; if (it) this.callbacks.onEquip(it); });
      el.addEventListener('contextmenu', (e) => { e.preventDefault(); const it = p.inventory[parseInt(el.dataset.i, 10)]; if (it && this.callbacks.onSell) this.callbacks.onSell(it); });
    });

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

  renderQuests(quests) {
    const el = document.getElementById('quest-tracker');
    if (!el) return;
    el.innerHTML = '<h4>Квесты</h4>' + quests.map(q =>
      `<div class="quest ${q.done ? 'done' : ''}">${q.done ? '✔' : ''} ${q.desc} <span>${Math.min(q.progress, q.target)}/${q.target}</span></div>`
    ).join('');
  }

  showTalentChoice(opts, onPick, subtitle) {
    const ov = document.getElementById('talent-overlay');
    if (!ov) { onPick(opts[0]); return; }
    ov.innerHTML = '<h2>Древо талантов</h2>' + (subtitle ? `<div class="talent-sub">${subtitle}</div>` : '') + '<div class="talent-row">' +
      opts.map((t, i) => `<div class="talent-card" data-i="${i}"><div class="tc-icon">${t.icon}</div><div class="tc-name">${t.name}</div><div class="tc-desc">${t.desc}</div></div>`).join('') +
      '</div>';
    ov.style.display = 'flex';
    ov.querySelectorAll('.talent-card').forEach(el => el.addEventListener('click', () => onPick(opts[parseInt(el.dataset.i, 10)])));
  }
  hideTalentChoice() { const ov = document.getElementById('talent-overlay'); if (ov) ov.style.display = 'none'; }

  showGameOver(win) {
    const go = document.getElementById('gameover');
    if (!go) return;
    go.style.display = 'flex';
    go.querySelector('h1').textContent = win ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ';
  }

  updateMinimap(player, entities, portal, npcs, shape, radius) {
    const ctx = this.miniCtx;
    if (!ctx || !player) return;
    const W = this.minimap.width, H = this.minimap.height;
    const cx = W / 2, cy = H / 2;
    const pad = 12;
    const sc = (W / 2 - pad) / (radius * 1.85);
    const toX = (x) => cx + x * sc;
    const toY = (z) => cy + z * sc;
    ctx.clearRect(0, 0, W, H);

    // arena boundary for current shape
    ctx.beginPath();
    const N = 72;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const r = radius * arenaRadiusMul(shape || 'circle', a);
      const x = toX(Math.cos(a) * r), y = toY(Math.sin(a) * r);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(90,120,170,0.16)';
    ctx.strokeStyle = 'rgba(170,200,240,0.7)';
    ctx.lineWidth = 1.5;
    ctx.fill(); ctx.stroke();

    const dot = (x, z, col, r2) => { ctx.beginPath(); ctx.fillStyle = col; ctx.arc(toX(x), toY(z), r2, 0, Math.PI * 2); ctx.fill(); };

    // portal
    if (portal) { ctx.beginPath(); ctx.strokeStyle = '#5ec8ff'; ctx.lineWidth = 2; ctx.arc(toX(portal.x), toY(portal.z), 4, 0, Math.PI * 2); ctx.stroke(); }

    // enemies
    for (const e of entities) {
      if (!e.alive || e.team !== 'enemy') continue;
      if (e.isBoss) dot(e.pos.x, e.pos.z, e.isSecret ? '#ff5bd0' : '#ff8a2e', 4);
      else dot(e.pos.x, e.pos.z, '#ff5b4d', 2);
    }
    // npcs
    if (npcs) for (const n of npcs) { if (n.mesh) dot(n.mesh.position.x, n.mesh.position.z, '#ffd24f', 2.5); }

    // player + facing
    const px = toX(player.pos.x), py = toY(player.pos.z);
    const ang = player.mesh.rotation.y;
    ctx.beginPath(); ctx.strokeStyle = '#9be0ff'; ctx.lineWidth = 1.6;
    ctx.moveTo(px, py); ctx.lineTo(px + Math.sin(ang) * 9, py + Math.cos(ang) * 9); ctx.stroke();
    dot(player.pos.x, player.pos.z, '#3aa6ff', 3.5);
    ctx.beginPath(); ctx.strokeStyle = '#dff0ff'; ctx.lineWidth = 1; ctx.arc(px, py, 3.5, 0, Math.PI * 2); ctx.stroke();

    if (this.miniLabel) this.miniLabel.textContent = ARENA_SHAPE_NAMES[shape] || 'круглая';
  }
}
