import { ABILITIES, abilityStat, ITEMS, MAX_ABILITY_LEVEL } from './config.js';

export class UI {
  constructor() {
    this.gold = document.getElementById('gold');
    this.lvl = document.getElementById('level');
    this.kda = document.getElementById('kda');
    this.hpFill = document.getElementById('hp-fill');
    this.hpText = document.getElementById('hp-text');
    this.manaFill = document.getElementById('mana-fill');
    this.manaText = document.getElementById('mana-text');
    this.xpFill = document.getElementById('xp-fill');
    this.timer = document.getElementById('match-timer');
    this.toast = document.getElementById('toast');
    this.gameover = document.getElementById('gameover');
    this.skillPointsEl = document.getElementById('skillpoints');
    this.inventoryEl = document.getElementById('inventory');
    this.shopEl = document.getElementById('shop');
    this.shopGrid = document.getElementById('shop-grid');
    this.shopHint = document.getElementById('shop-hint');
    this.abilityEls = {
      Q: document.getElementById('ab-Q'),
      W: document.getElementById('ab-W'),
      E: document.getElementById('ab-E'),
    };
    this.heroSelect = document.getElementById('hero-select');
    this.heroCards = document.getElementById('hero-cards');
    this.minimap = document.getElementById('minimap');
    this.mmCtx = this.minimap.getContext('2d');
    this._toastT = 0;
    this.shopOpen = false;
    this.callbacks = { onBuy: () => {}, onLevel: () => {} };

    // ability level-up buttons
    for (const k of ['Q', 'W', 'E']) {
      const btn = this.abilityEls[k].querySelector('.levelup');
      if (btn) btn.addEventListener('click', (e) => { e.stopPropagation(); this.callbacks.onLevel(k); });
    }
    document.getElementById('shop-toggle')?.addEventListener('click', () => this.toggleShop());
    document.getElementById('shop-close')?.addEventListener('click', () => this.toggleShop());
  }

  toggleShop() {
    this.shopOpen = !this.shopOpen;
    this.shopEl.style.display = this.shopOpen ? 'block' : 'none';
  }

  showHeroSelect(defs, onPick) {
    if (!this.heroCards) return;
    const roleColor = { 'Танк': '#8fe0ff', 'Маг': '#c08bff', 'Убийца': '#ffd24f' };
    let html = '';
    for (const d of defs) {
      const c = roleColor[d.role] || '#7fe0a8';
      html += `<div class="hero-card" data-id="${d.id}" style="--accent:${c}">
        <div class="hc-gem"></div>
        <div class="hc-name">${d.name}</div>
        <div class="hc-role">${d.role}</div>
        <div class="hc-desc">${d.desc}</div>
        <div class="hc-stats">
          <span>❤️ ${d.maxHp}</span><span>🗡️ ${d.attackDamage}</span>
          <span>🛡️ ${d.armor}</span><span>👟 ${d.moveSpeed}</span>
        </div>
        <button class="hc-pick">Играть</button>
      </div>`;
    }
    this.heroCards.innerHTML = html;
    this.heroCards.querySelectorAll('.hero-card').forEach(el => {
      el.addEventListener('click', () => onPick(el.dataset.id));
    });
    this.heroSelect.style.display = 'flex';
  }

  hideHeroSelect() {
    if (this.heroSelect) this.heroSelect.style.display = 'none';
  }

  showToast(msg, dur = 2.2) {
    this.toast.textContent = msg;
    this.toast.classList.add('show');
    this._toastT = dur;
  }

  updateToast(dt) {
    if (this._toastT > 0) {
      this._toastT -= dt;
      if (this._toastT <= 0) this.toast.classList.remove('show');
    }
  }

  updateHero(hero) {
    if (!hero) return;
    const hpr = Math.max(0, hero.hp / hero.maxHp);
    this.hpFill.style.width = (hpr * 100) + '%';
    this.hpText.textContent = `${Math.ceil(hero.hp)} / ${Math.round(hero.maxHp)}`;
    const mpr = Math.max(0, hero.mana / hero.maxMana);
    this.manaFill.style.width = (mpr * 100) + '%';
    this.manaText.textContent = `${Math.ceil(hero.mana)} / ${Math.round(hero.maxMana)}`;
    this.gold.textContent = Math.floor(hero.gold);
    this.lvl.textContent = hero.level;
    this.kda.textContent = `${hero.kills} / ${hero.deaths}`;
    this.xpFill.style.width = ((hero.xp % 220) / 220 * 100) + '%';
    if (this.skillPointsEl) {
      this.skillPointsEl.textContent = hero.skillPoints;
      this.skillPointsEl.parentElement.style.visibility = hero.skillPoints > 0 ? 'visible' : 'hidden';
    }
  }

  updateAbilities(hero) {
    for (const k of ['Q', 'W', 'E']) {
      const el = this.abilityEls[k];
      const lvl = hero.abilityLevels ? hero.abilityLevels[k] : 0;
      const cd = hero['cd' + k] || 0;
      const cover = el.querySelector('.cd-cover');
      const label = el.querySelector('.cd-label');
      const max = ABILITIES[k].cooldown;
      if (cd > 0) {
        cover.style.height = Math.min(100, (cd / max) * 100) + '%';
        label.textContent = cd.toFixed(1);
        el.classList.add('on-cd');
      } else {
        cover.style.height = '0%';
        label.textContent = '';
        el.classList.remove('on-cd');
      }
      // pips
      const pips = el.querySelectorAll('.pip');
      pips.forEach((p, i) => p.classList.toggle('filled', i < lvl));
      // level-up button
      const btn = el.querySelector('.levelup');
      const canLevel = hero.skillPoints > 0 && lvl < MAX_ABILITY_LEVEL;
      if (btn) btn.style.display = canLevel ? 'flex' : 'none';
      el.classList.toggle('learnable', canLevel);
      el.classList.toggle('learnable', canLevel);
      el.classList.toggle('locked', lvl < 1);
      el.title = this.abilityTooltip(k, hero, lvl, canLevel);
    }
  }

  abilityTooltip(key, hero, lvl, canLevel) {
    const a = ABILITIES[key];
    const mod = (hero.abilityMods && hero.abilityMods[key]) || 1;
    const shown = abilityStat(key, Math.max(1, lvl));
    const hot = key === 'Q' ? 'Q (прокачка 1)' : key === 'W' ? 'W (прокачка 2)' : 'E (прокачка 3)';
    let effect;
    if (key === 'E') effect = `Скорость +${Math.round(shown.speedBonus * mod)} на ${shown.duration}с`;
    else effect = `Урон ${Math.round(shown.damage * mod)}${key === 'W' ? `, радиус ${Math.round(shown.radius)}` : ''}`;
    const head = lvl < 1 ? `${a.name} — НЕ ИЗУЧЕНА` : `${a.name} — ур.${lvl}/${MAX_ABILITY_LEVEL}`;
    const learn = canLevel ? `\n► Можно прокачать (нажми ${key === 'Q' ? '1' : key === 'W' ? '2' : '3'})` : '';
    return `${head}\n${a.desc}\n${effect}\nМана: ${a.manaCost} · Кулдаун: ${a.cooldown}с\nКлавиша: ${hot}${learn}`;
  }

  flashAbility(key) {
    const el = this.abilityEls[key];
    if (!el) return;
    el.classList.remove('cast');
    void el.offsetWidth;
    el.classList.add('cast');
    setTimeout(() => el.classList.remove('cast'), 360);
  }

  updateInventory(hero) {
    if (!this.inventoryEl) return;
    const slots = this.inventoryEl.querySelectorAll('.slot');
    slots.forEach((s, i) => {
      const id = hero.items[i];
      if (id) {
        const def = ITEMS.find(d => d.id === id);
        s.textContent = def ? def.icon : '?';
        s.title = def ? `${def.name} — ${def.desc}` : '';
        s.classList.add('filled');
      } else {
        s.textContent = '';
        s.title = '';
        s.classList.remove('filled');
      }
    });
  }

  renderShop(items, hero, canShop) {
    if (!this.shopGrid) return;
    this.shopHint.textContent = canShop
      ? 'Ты у фонтана — можно покупать'
      : 'Подойди к своей базе (синяя зона), чтобы покупать';
    this.shopHint.style.color = canShop ? '#7fe0a8' : '#ffb37f';
    let html = '';
    for (const it of items) {
      const owned = hero.items.filter(x => x === it.id).length;
      const afford = hero.gold >= it.cost;
      const disabled = !afford || !canShop || hero.items.length >= 6;
      html += `<div class="shop-item ${disabled ? 'disabled' : ''}" data-id="${it.id}">
        <div class="si-icon">${it.icon}</div>
        <div class="si-body">
          <div class="si-name">${it.name}${owned ? ` ×${owned}` : ''}</div>
          <div class="si-desc">${it.desc}</div>
        </div>
        <div class="si-cost ${afford ? '' : 'no'}">💰${it.cost}</div>
      </div>`;
    }
    this.shopGrid.innerHTML = html;
    this.shopGrid.querySelectorAll('.shop-item').forEach(el => {
      el.addEventListener('click', () => this.callbacks.onBuy(el.dataset.id));
    });
  }

  updateTimer(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    this.timer.textContent = `${m}:${s.toString().padStart(2, '0')}`;
  }

  drawMinimap(entities, player, world) {
    const ctx = this.mmCtx;
    const W = this.minimap.width, H = this.minimap.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#1c2a1c';
    ctx.fillRect(0, 0, W, H);
    const half = world.size * 0.75;
    const toPx = (x, z) => [((x + half) / (2 * half)) * W, ((z + half) / (2 * half)) * H];
    ctx.strokeStyle = '#c8a96a'; ctx.lineWidth = 3;
    ctx.beginPath();
    const [ax, az] = toPx(world.radiantBase.x, world.radiantBase.z);
    const [bx, bz] = toPx(world.direBase.x, world.direBase.z);
    ctx.moveTo(ax, az); ctx.lineTo(bx, bz); ctx.stroke();
    for (const e of entities) {
      if (!e.alive) continue;
      const [px, py] = toPx(e.pos.x, e.pos.z);
      let r = 2;
      const color = e.team === 'radiant' ? '#3aa6ff' : '#ff4d4d';
      if (e.kind === 'hero') r = 4;
      if (e.kind === 'tower') r = 3;
      if (e.kind === 'base') r = 5;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      if (e === player) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); }
    }
  }

  showGameOver(win) {
    this.gameover.style.display = 'flex';
    this.gameover.querySelector('h1').textContent = win ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ';
    this.gameover.querySelector('h1').style.color = win ? '#66dd77' : '#ff5555';
  }
}
