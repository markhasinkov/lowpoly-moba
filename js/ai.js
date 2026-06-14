// ===== Enemy AI: mobs & bosses chase and attack the player =====

export function moveToward(self, target, dt, stopDist = 0.5) {
  const dx = target.x - self.pos.x, dz = target.z - self.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist <= stopDist) return true;
  const spd = self.slowT > 0 ? self.moveSpeed * (self.slowFactor || 0.5) : self.moveSpeed;
  const step = Math.min(dist - stopDist, spd * dt);
  const nx = dx / dist, nz = dz / dist;
  self.pos.x += nx * step; self.pos.z += nz * step;
  self.mesh.rotation.y = Math.atan2(nx, nz);
  return false;
}

export function updateMob(mob, player, dt, attack) {
  if (!player.alive) return;
  const d = mob.distanceTo(player);
  const aggro = mob.aggro || 48;
  if (d > aggro) {
    // light idle wander around spawn
    return;
  }
  if (d <= mob.attackRange) {
    mob.mesh.rotation.y = Math.atan2(player.pos.x - mob.pos.x, player.pos.z - mob.pos.z);
    attack(mob, player);
  } else {
    moveToward(mob, player.pos, dt, mob.attackRange * 0.9);
  }
}
