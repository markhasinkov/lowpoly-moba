import * as THREE from 'three';
import { ABILITIES } from './config.js';

// Active projectiles and visual effects, updated each frame.
export class EffectSystem {
  constructor(scene) {
    this.scene = scene;
    this.projectiles = [];
    this.effects = []; // transient visuals (expanding rings, etc.)
  }

  spawnBolt(caster, dir, enemies) {
    const a = ABILITIES.Q;
    const geo = new THREE.SphereGeometry(0.6, 8, 8);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: caster.team === 'radiant' ? 0x66ccff : 0xff8866,
      emissive: caster.team === 'radiant' ? 0x3399ff : 0xff5533, emissiveIntensity: 1.2, flatShading: true,
    }));
    const start = caster.pos.clone(); start.y = 2.2;
    m.position.copy(start);
    this.scene.add(m);
    this.projectiles.push({
      mesh: m, dir: dir.clone().normalize(), speed: a.speed,
      traveled: 0, range: a.range, damage: a.damage,
      team: caster.team, caster, enemies, radius: 1.6,
    });
  }

  spawnNova(caster) {
    const a = ABILITIES.W;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 1.2, 24),
      new THREE.MeshBasicMaterial({
        color: caster.team === 'radiant' ? 0x66ccff : 0xff6644,
        side: THREE.DoubleSide, transparent: true, opacity: 0.9,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(caster.pos); ring.position.y = 0.2;
    this.scene.add(ring);
    this.effects.push({ mesh: ring, t: 0, dur: 0.5, maxScale: a.radius });
    return a;
  }

  update(dt, allEntities, onDamage) {
    // Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const step = p.speed * dt;
      p.mesh.position.addScaledVector(p.dir, step);
      p.traveled += step;
      let hit = false;
      for (const e of p.enemies) {
        if (!e.alive || e.team === p.team) continue;
        if (e.pos.distanceTo(p.mesh.position) <= (p.radius + (e.radius || 1))) {
          onDamage(e, p.damage, p.caster);
          hit = true;
          break;
        }
      }
      if (hit || p.traveled >= p.range) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
    // Effects
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const fx = this.effects[i];
      fx.t += dt;
      const k = fx.t / fx.dur;
      const s = fx.maxScale * Math.min(1, k);
      fx.mesh.scale.set(s, s, s);
      fx.mesh.material.opacity = Math.max(0, 0.9 * (1 - k));
      if (fx.t >= fx.dur) {
        this.scene.remove(fx.mesh);
        this.effects.splice(i, 1);
      }
    }
  }
}

export { ABILITIES };
