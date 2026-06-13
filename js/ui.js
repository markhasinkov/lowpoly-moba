import { ABILITIES } from './config.js';

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
    this.abilityEls = {
      Q: document.getElementById('ab-Q'),
      W: document.getElementById('ab-W'),
      E: document.getElementById('ab-E'),
    };
    this.minimap = document.getElementById('minimap');
    this.mmCtx = this.minimap.getContext('2d');
    this._toastT = 0;
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
    this.hpText.textContent = `${Math.ceil(hero.hp)} / ${hero.maxHp}`;
    const mpr = Math.max(0, hero.mana / hero.maxMana);
    this.manaFill.style.width = (mpr * 100) + '%';
    this.manaText.textContent = `${Math.ceil(hero.mana)} / ${hero.maxMana}`;
    this.gold.textContent = Math.floor(hero.gold);
    this.lvl.textContent = hero.level;
    this.kda.textContent = `${hero.kills} / ${hero.deaths}`;
    this.xpFill.style.width = ((hero.xp % 220) / 220 * 100) + '%';
  }

  updateAbilities(cds) {
    for (const k of ['Q', 'W', 'E']) {
      const el = this.abilityEls[k];
      const cd = cds[k];
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
    }
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
    // lane line
    ctx.strokeStyle = '#c8a96a'; ctx.lineWidth = 3;
    ctx.beginPath();
    const [ax, az] = toPx(world.radiantBase.x, world.radiantBase.z);
    const [bx, bz] = toPx(world.direBase.x, world.direBase.z);
    ctx.moveTo(ax, az); ctx.lineTo(bx, bz); ctx.stroke();
    for (const e of entities) {
      if (!e.alive) continue;
      const [px, py] = toPx(e.pos.x, e.pos.z);
      let r = 2, color = e.team === 'radiant' ? '#3aa6ff' : '#ff4d4d';
      if (e.kind === 'hero') r = 4;
      if (e.kind === 'tower') { r = 3; }
      if (e.kind === 'base') { r = 5; }
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
