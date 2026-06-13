import * as THREE from 'three';
// Abilities are defined per-hero in config; this module only renders visuals.

const RAD = 0x66ccff, DIRE = 0xff7755;
function teamColor(t) { return t === 'radiant' ? RAD : DIRE; }

// ---- small effect factories (each returns { tick(dt)->done, dispose() }) ----
function growFade(scene, mesh, dur, maxScale, startScale = 0.1, startOpacity = 0.95) {
  return {
    life: 0, dur,
    tick(dt) {
      this.life += dt; const k = this.life / dur;
      const s = startScale + (maxScale - startScale) * Math.min(1, k);
      mesh.scale.set(s, s, s);
      if (mesh.material) mesh.material.opacity = Math.max(0, startOpacity * (1 - k));
      return this.life >= dur;
    },
    dispose() { scene.remove(mesh); mesh.geometry?.dispose?.(); mesh.material?.dispose?.(); },
  };
}

function spark(scene, pos, color, speed = 9) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.22, 0.22),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
  );
  m.position.copy(pos); m.position.y += 1.4;
  const v = new THREE.Vector3((Math.random() - 0.5) * speed, Math.random() * speed * 0.7 + 3, (Math.random() - 0.5) * speed);
  scene.add(m);
  const dur = 0.45 + Math.random() * 0.35;
  return {
    life: 0,
    tick(dt) {
      this.life += dt; v.y -= 20 * dt;
      m.position.addScaledVector(v, dt);
      m.rotation.x += dt * 9; m.rotation.y += dt * 9;
      m.material.opacity = Math.max(0, 1 - this.life / dur);
      return this.life >= dur;
    },
    dispose() { scene.remove(m); m.geometry.dispose(); m.material.dispose(); },
  };
}

function shard(scene, pos, color, dir) {
  const m = new THREE.Mesh(
    new THREE.TetrahedronGeometry(0.45, 0),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, flatShading: true, transparent: true, opacity: 1 })
  );
  m.position.copy(pos); m.position.y += 0.8;
  const v = dir.clone().multiplyScalar(10 + Math.random() * 6); v.y = 5 + Math.random() * 3;
  scene.add(m);
  const dur = 0.6;
  return {
    life: 0,
    tick(dt) {
      this.life += dt; v.y -= 22 * dt;
      m.position.addScaledVector(v, dt);
      m.rotation.x += dt * 6; m.rotation.z += dt * 6;
      m.material.opacity = Math.max(0, 1 - this.life / dur);
      return this.life >= dur;
    },
    dispose() { scene.remove(m); m.geometry.dispose(); m.material.dispose(); },
  };
}

export class EffectSystem {
  constructor(scene) {
    this.scene = scene;
    this.projectiles = [];
    this.effects = [];
  }

  // ---- Q: Bolt projectile with glowing core + trailing cone ----
  spawnBolt(caster, dir, enemies, damage, opts = {}) {
    const col = teamColor(caster.team);
    const g = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.7, 0),
      new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.7, flatShading: true })
    );
    const tail = new THREE.Mesh(
      new THREE.ConeGeometry(0.6, 2.8, 7),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.45 })
    );
    tail.rotation.x = -Math.PI / 2;   // apex points backward (-z)
    tail.position.z = -1.5;
    g.add(core); g.add(tail);
    const start = caster.pos.clone(); start.y = 2.2;
    g.position.copy(start);
    const d = dir.clone().setY(0).normalize();
    g.lookAt(start.clone().add(d));
    this.scene.add(g);
    this.projectiles.push({
      group: g, core, dir: d, speed: opts.speed || 42, traveled: 0, range: opts.range || 38,
      damage: damage != null ? damage : 90, slow: opts.slow || null,
      team: caster.team, caster, enemies, radius: 1.8, color: col,
    });
    this.spawnCastFlash(caster.pos, col);
  }

  // ---- W: Nova shockwave + ground ring + flying shards ----
  spawnNova(caster, radius) {
    const r = radius != null ? radius : 11;
    const col = teamColor(caster.team);

    const wave = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 1.4, 32),
      new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide, transparent: true, opacity: 0.95 })
    );
    wave.rotation.x = -Math.PI / 2;
    wave.position.copy(caster.pos); wave.position.y = 0.25;
    this.scene.add(wave);
    this.effects.push(growFade(this.scene, wave, 0.5, r, 0.4));

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
    );
    dome.position.copy(caster.pos); dome.position.y = 0.2;
    this.scene.add(dome);
    this.effects.push(growFade(this.scene, dome, 0.45, r * 0.85, 0.4, 0.4));

    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2;
      const dir = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang));
      this.effects.push(shard(this.scene, caster.pos, col, dir));
    }
    return { radius: r };
  }

  // ---- impact burst when a bolt connects ----
  spawnImpact(pos, color) {
    const shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.7, 0),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 })
    );
    shell.position.copy(pos); shell.position.y = 2.0;
    this.scene.add(shell);
    this.effects.push(growFade(this.scene, shell, 0.3, 3.2, 0.5));
    for (let i = 0; i < 7; i++) this.effects.push(spark(this.scene, pos, color, 11));
  }

  // ---- quick flash under a caster when an ability fires ----
  spawnCastFlash(pos, color) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 1.0, 24),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
    );
    ring.rotation.x = -Math.PI / 2; ring.position.copy(pos); ring.position.y = 0.15;
    this.scene.add(ring);
    this.effects.push(growFade(this.scene, ring, 0.35, 4, 0.4));
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.9, 4, 10, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    pillar.position.copy(pos); pillar.position.y = 2;
    this.scene.add(pillar);
    this.effects.push(growFade(this.scene, pillar, 0.3, 1.6, 1, 0.5));
  }

  // ---- small spark on a melee/auto-attack hit ----
  spawnHit(pos, color) {
    for (let i = 0; i < 4; i++) this.effects.push(spark(this.scene, pos, color, 7));
  }

  // ---- afterimage disc left behind by a surging hero ----
  spawnGhost(pos, color) {
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(1.3, 18),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    disc.rotation.x = -Math.PI / 2; disc.position.copy(pos); disc.position.y = 0.12;
    this.scene.add(disc);
    this.effects.push(growFade(this.scene, disc, 0.4, 1.6, 1.4, 0.5));
  }

  // ---- basic ranged auto-attack: homing orb ----
  spawnBasic(caster, target, damage, color) {
    const g = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 8, 8),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.3, flatShading: true })
    );
    g.add(core);
    g.position.copy(caster.pos); g.position.y = 2.2;
    this.scene.add(g);
    this.projectiles.push({
      group: g, core, homing: true, target,
      speed: (caster.projectile && caster.projectile.speed) || 38,
      traveled: 0, range: 70, damage, team: caster.team, caster, radius: 1.1, color,
    });
  }

  update(dt, allEntities, onDamage) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.homing) {
        if (!p.target || !p.target.alive) { this.scene.remove(p.group); this.projectiles.splice(i, 1); continue; }
        const aim = p.target.pos.clone(); aim.y = 2.0;
        const dir = aim.sub(p.group.position); const dist = dir.length(); dir.normalize();
        p.group.position.addScaledVector(dir, Math.min(p.speed * dt, dist));
        p.traveled += p.speed * dt;
        p.core.rotation.y += dt * 9;
        if (p.group.position.distanceTo(p.target.pos) <= (p.radius + (p.target.radius || 1))) {
          onDamage(p.target, p.damage, p.caster);
          this.spawnHit(p.target.pos, p.color);
          this.scene.remove(p.group); this.projectiles.splice(i, 1); continue;
        }
        if (p.traveled >= p.range) { this.scene.remove(p.group); this.projectiles.splice(i, 1); }
        continue;
      }
      const step = p.speed * dt;
      p.group.position.addScaledVector(p.dir, step);
      p.traveled += step;
      p.core.rotation.x += dt * 12; p.core.rotation.y += dt * 9;
      let hit = false;
      for (const e of p.enemies) {
        if (!e.alive || e.team === p.team) continue;
        if (e.pos.distanceTo(p.group.position) <= (p.radius + (e.radius || 1))) {
          onDamage(e, p.damage, p.caster);
          if (p.slow) { e.slowT = p.slow.dur; e.slowFactor = p.slow.factor; }
          hit = true; break;
        }
      }
      if (hit || p.traveled >= p.range) {
        this.spawnImpact(p.group.position.clone(), p.color);
        this.scene.remove(p.group);
        this.projectiles.splice(i, 1);
      }
    }
    for (let i = this.effects.length - 1; i >= 0; i--) {
      if (this.effects[i].tick(dt)) { this.effects[i].dispose(); this.effects.splice(i, 1); }
    }
  }
}

