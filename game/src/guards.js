// Guards: patrol routes, vision cones, suspicion and the chase.
// A guard is always in one state:
//   patrol      — walks its waypoint loop, pausing at each stop
//   suspicious  — saw something briefly; walks to the last seen point
//   alarm       — has the thief dead to rights; chases and raises the alarm
// Detection fills while the thief stands inside the guard's cone with a
// clear line of sight, faster up close and slower while the thief sneaks.

import { distanceBetween, angleTo, angleDifference, insideVisionCone, resolveCircleAgainstWalls } from './vision.js';

export const GUARD_RADIUS = 14;
export const GUARD_VIEW_RANGE = 195;
export const GUARD_VIEW_HALF_ANGLE = 0.61;
export const GUARD_CATCH_RADIUS = 26;
const SUSPICION_THRESHOLD = 0.55;
const ALARM_THRESHOLD = 1.0;

export function guardSeesPlayer(guard, player, walls) {
  const seen = insideVisionCone(
    guard, guard.facing, GUARD_VIEW_HALF_ANGLE, GUARD_VIEW_RANGE, player, walls,
  );
  if (!seen) return 0;
  const dist = distanceBetween(guard, player);
  const closeness = 1 - dist / GUARD_VIEW_RANGE;
  const sneakFactor = player.sneaking ? 0.45 : 1;
  return (0.55 + closeness * 0.9) * sneakFactor;
}

// One guard, one tick. `events` collects what the main loop must react to:
// spotted (first frame of a fresh sighting), alarm (detection maxed),
// caught (the guard reached the thief during an alarm).
export function updateGuard(guard, player, walls, dt, now, events, noise) {
  const seenRate = guardSeesPlayer(guard, player, walls);
  const wasAlarmed = guard.state === 'alarm';

  if (seenRate > 0) {
    const before = guard.detection;
    guard.detection = Math.min(ALARM_THRESHOLD, guard.detection + seenRate * dt);
    guard.lastSeen = { x: player.x, y: player.y };
    if (before < SUSPICION_THRESHOLD && guard.detection >= SUSPICION_THRESHOLD) {
      events.push({ type: 'spotted', guard });
    }
    if (guard.detection >= ALARM_THRESHOLD && guard.state !== 'alarm') {
      guard.state = 'alarm';
      events.push({ type: 'alarm', guard });
    }
  } else {
    guard.detection = Math.max(0, guard.detection - dt * 0.22);
    if (guard.state === 'alarm' && guard.detection <= 0.15) {
      guard.state = 'suspicious';
      guard.investigateUntil = now + 5;
    }
  }

  // A thrown pebble pulls a patrolling or suspicious guard to the noise.
  if (noise && guard.state !== 'alarm') {
    const d = distanceBetween(guard, noise);
    if (d < noise.radius) {
      guard.state = 'suspicious';
      guard.lastSeen = { x: noise.x, y: noise.y };
      guard.investigateUntil = now + 4;
      guard.detection = Math.max(guard.detection, 0.3);
    }
  }

  if (guard.state === 'patrol') {
    stepAlongPatrol(guard, walls, dt, now);
  } else if (guard.state === 'suspicious') {
    if (guard.lastSeen) {
      const arrived = stepToward(guard, guard.lastSeen, guard.speed * 1.15, walls, dt);
      if (arrived || now > guard.investigateUntil) {
        guard.state = 'patrol';
        guard.lastSeen = null;
        guard.pauseUntil = now + 1.2;
      }
    } else {
      guard.state = 'patrol';
    }
  } else if (guard.state === 'alarm') {
    stepToward(guard, player, guard.speed * 1.75, walls, dt);
    if (distanceBetween(guard, player) < GUARD_CATCH_RADIUS) {
      events.push({ type: 'caught', guard });
    }
  }

  if (wasAlarmed && guard.state !== 'alarm' && guard.detection <= 0) {
    guard.state = 'patrol';
  }
}

function stepAlongPatrol(guard, walls, dt, now) {
  if (now < guard.pauseUntil) return;
  const target = guard.waypoints[guard.waypointIndex];
  const arrived = stepToward(guard, target, guard.speed, walls, dt);
  if (arrived) {
    guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
    guard.pauseUntil = now + 1.6;
  }
}

// Walk toward a point, turning to face the direction of travel.
// Returns true when the point is reached this tick.
function stepToward(guard, target, speed, walls, dt) {
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 6) return true;
  const step = Math.min(dist, speed * dt);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  guard.facing = angleTo(guard, target);
  resolveCircleAgainstWalls(guard, GUARD_RADIUS, walls);
  return dist - step < 6;
}

// How alarmed the floor is, for the HUD: the highest guard detection.
export function highestDetection(guards) {
  let top = 0;
  for (const guard of guards) top = Math.max(top, guard.detection);
  return top;
}

export function anyGuardAlarmed(guards) {
  return guards.some((g) => g.state === 'alarm');
}

export function anyGuardSuspicious(guards) {
  return guards.some((g) => g.state === 'suspicious' || (g.detection >= SUSPICION_THRESHOLD && g.state !== 'alarm'));
}
