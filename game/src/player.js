// Wren, the thief: movement, sneaking, tools and interaction.
// The player owns no game state beyond its own body and kit; the main
// loop asks it to move, throw, jam and interact, and reads the results.

import { resolveCircleAgainstWalls, clampToPlayfield } from './vision.js';

export const PLAYER_RADIUS = 13;
export const WALK_SPEED = 165;
export const SNEAK_SPEED = 95;
export const PEBBLE_RANGE = 320;
export const JAMMER_RANGE = 260;
export const INTERACT_RADIUS = 46;

export function createPlayer(spawn) {
  return {
    x: spawn.x,
    y: spawn.y,
    facing: -Math.PI / 2,
    moving: false,
    sneaking: false,
    pebbles: 3,
    jammers: 2,
    loot: 0,
    lootCount: 0,
    stepTimer: 0,
  };
}

// Keyboard state: keys held by their code (KeyW, ArrowUp, ...).
export function createKeyState() {
  return { keys: new Set(), mouse: { x: 0, y: 0, clicked: false } };
}

export function movePlayer(player, keys, dt, walls, bounds, onStep) {
  let dx = 0;
  let dy = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) dy -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) dy += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) dx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) dx += 1;
  player.moving = dx !== 0 || dy !== 0;
  if (!player.moving) return;

  player.sneaking = keys.has('ShiftLeft') || keys.has('ShiftRight');
  const speed = player.sneaking ? SNEAK_SPEED : WALK_SPEED;
  const len = Math.hypot(dx, dy);
  player.x += (dx / len) * speed * dt;
  player.y += (dy / len) * speed * dt;
  player.facing = Math.atan2(dy, dx);
  resolveCircleAgainstWalls(player, PLAYER_RADIUS, walls);
  clampToPlayfield(player, bounds);

  player.stepTimer -= dt;
  if (player.stepTimer <= 0) {
    player.stepTimer = player.sneaking ? 0.55 : 0.34;
    if (onStep) onStep();
  }
}

// A pebble thrown toward the mouse: it lands at range (or at the mouse
// when closer) and rings there. Guards inside earshot walk over to look.
export function throwPebble(player, mouse, walls) {
  if (player.pebbles <= 0) return null;
  const dx = mouse.x - player.x;
  const dy = mouse.y - player.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return null;
  const reach = Math.min(dist, PEBBLE_RANGE);
  const landing = {
    x: player.x + (dx / dist) * reach,
    y: player.y + (dy / dist) * reach,
    radius: 260,
    ttl: 0.9,
  };
  clampToPlayfield(landing, { x: 16, y: 72, w: 1248, h: 712 });
  player.pebbles -= 1;
  return landing;
}

// The jammer blanks the nearest live camera inside range for 15 seconds.
export function useJammer(player, cameras, now) {
  if (player.jammers <= 0) return null;
  let best = null;
  let bestDist = JAMMER_RANGE;
  for (const cam of cameras) {
    if (cam.disabledUntil > now) continue;
    const d = Math.hypot(cam.x - player.x, cam.y - player.y);
    if (d < bestDist) {
      best = cam;
      bestDist = d;
    }
  }
  if (!best) return null;
  best.disabledUntil = now + 15;
  player.jammers -= 1;
  return best;
}

// Nearest grabbable thing: a loose loot item, an uncracked safe, or the
// getaway car. The main loop decides what the interaction does.
export function nearestInteractable(player, level) {
  let best = null;
  let bestDist = INTERACT_RADIUS;
  for (const item of level.loot) {
    if (item.taken) continue;
    const d = Math.hypot(item.x - player.x, item.y - player.y);
    if (d < bestDist) {
      best = { type: 'loot', ref: item };
      bestDist = d;
    }
  }
  for (const safe of level.safes) {
    if (safe.cracked) continue;
    const d = Math.hypot(safe.x - player.x, safe.y - player.y);
    if (d < bestDist) {
      best = { type: 'safe', ref: safe };
      bestDist = d;
    }
  }
  const car = level.getaway;
  const carCentre = { x: car.x + car.w / 2, y: car.y + car.h / 2 };
  const carDist = Math.hypot(carCentre.x - player.x, carCentre.y - player.y);
  if (carDist < 70) return { type: 'getaway', ref: car };
  return best;
}
