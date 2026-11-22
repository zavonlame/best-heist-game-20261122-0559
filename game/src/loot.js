// Loot and safes: what the thief can grab, and the timed safe-crack.
// Loose loot is picked up on touch (or with E). A safe needs the thief
// to stand beside it and hold E: the crack takes three steady seconds,
// and letting go or stepping away bleeds the progress back down.

export const SAFE_CRACK_SECONDS = 3;
export const SAFE_HOLD_RADIUS = 52;
export const LOOT_PICKUP_RADIUS = 34;

export function collectNearbyLoot(player, level, onCollect) {
  for (const item of level.loot) {
    if (item.taken) continue;
    const d = Math.hypot(item.x - player.x, item.y - player.y);
    if (d < LOOT_PICKUP_RADIUS) {
      item.taken = true;
      player.loot += item.value;
      player.lootCount += 1;
      if (onCollect) onCollect(item);
    }
  }
}

// Advance the safe crack while the player holds the interact key beside
// an uncracked safe. Returns the safe being cracked, or null.
export function advanceSafeCrack(player, level, holding, dt, onTick, onCracked) {
  let active = null;
  for (const safe of level.safes) {
    if (safe.cracked) continue;
    const d = Math.hypot(safe.x - player.x, safe.y - player.y);
    if (d < SAFE_HOLD_RADIUS) {
      active = safe;
      break;
    }
  }
  if (!active) {
    for (const safe of level.safes) {
      if (!safe.cracked && safe.progress > 0) safe.progress = Math.max(0, safe.progress - dt * 0.5);
    }
    return null;
  }
  if (holding) {
    const before = active.progress;
    active.progress = Math.min(1, active.progress + dt / SAFE_CRACK_SECONDS);
    if (Math.floor(active.progress * 8) !== Math.floor(before * 8) && onTick) onTick(active);
    if (active.progress >= 1) {
      active.cracked = true;
      player.loot += active.value;
      player.lootCount += 1;
      if (onCracked) onCracked(active);
    }
  } else {
    active.progress = Math.max(0, active.progress - dt * 0.5);
  }
  return active;
}

export function totalLootAvailable(level) {
  let total = 0;
  for (const item of level.loot) total += item.value;
  for (const safe of level.safes) total += safe.value;
  return total;
}

export function lootRemaining(level) {
  let total = 0;
  for (const item of level.loot) if (!item.taken) total += item.value;
  for (const safe of level.safes) if (!safe.cracked) total += safe.value;
  return total;
}
