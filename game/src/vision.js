// Line-of-sight and vision-cone helpers for Velvet Vault.
// Everything here is pure geometry: no game state, no drawing, no sound.
// Walls are axis-aligned rectangles {x, y, w, h}; points are {x, y}.

export function distanceBetween(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

export function angleTo(from, to) {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

// Smallest absolute difference between two angles, in radians.
export function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

// Does segment p1->p2 cross rectangle r? Uses the slab method on the
// segment's parametric form, so a segment that only grazes a corner counts.
export function segmentHitsRect(p1, p2, r) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  let tMin = 0;
  let tMax = 1;
  const slabs = [
    [p1.x, dx, r.x, r.x + r.w],
    [p1.y, dy, r.y, r.y + r.h],
  ];
  for (const [origin, delta, lo, hi] of slabs) {
    if (Math.abs(delta) < 1e-9) {
      if (origin < lo || origin > hi) return false;
    } else {
      let t0 = (lo - origin) / delta;
      let t1 = (hi - origin) / delta;
      if (t0 > t1) [t0, t1] = [t1, t0];
      tMin = Math.max(tMin, t0);
      tMax = Math.min(tMax, t1);
      if (tMin > tMax) return false;
    }
  }
  return true;
}

// True line of sight: nothing opaque between the two points.
export function hasLineOfSight(from, to, walls) {
  for (const wall of walls) {
    if (segmentHitsRect(from, to, wall)) return false;
  }
  return true;
}

// Is `target` inside a vision cone cast from `eye`? The cone has a facing
// angle, a half-angle, and a range; walls block sight entirely.
export function insideVisionCone(eye, facing, halfAngle, range, target, walls) {
  if (distanceBetween(eye, target) > range) return false;
  if (angleDifference(facing, angleTo(eye, target)) > halfAngle) return false;
  return hasLineOfSight(eye, target, walls);
}

// Is point p inside rectangle r (with a small margin so actors do not
// clip into walls)?
export function pointInRect(p, r, margin = 0) {
  return (
    p.x > r.x - margin &&
    p.x < r.x + r.w + margin &&
    p.y > r.y - margin &&
    p.y < r.y + r.h + margin
  );
}

// Push a circle (centre p, radius r) out of every wall it overlaps.
// Returns true when a correction was applied.
export function resolveCircleAgainstWalls(p, radius, walls) {
  let moved = false;
  for (const wall of walls) {
    const nearestX = Math.max(wall.x, Math.min(p.x, wall.x + wall.w));
    const nearestY = Math.max(wall.y, Math.min(p.y, wall.y + wall.h));
    const dx = p.x - nearestX;
    const dy = p.y - nearestY;
    const distSq = dx * dx + dy * dy;
    if (distSq >= radius * radius) continue;
    moved = true;
    if (distSq > 1e-6) {
      const dist = Math.sqrt(distSq);
      p.x = nearestX + (dx / dist) * radius;
      p.y = nearestY + (dy / dist) * radius;
    } else {
      // Centre is inside the wall: shove it out along the shallowest axis.
      const pushLeft = p.x - wall.x;
      const pushRight = wall.x + wall.w - p.x;
      const pushUp = p.y - wall.y;
      const pushDown = wall.y + wall.h - p.y;
      const least = Math.min(pushLeft, pushRight, pushUp, pushDown);
      if (least === pushLeft) p.x = wall.x - radius;
      else if (least === pushRight) p.x = wall.x + wall.w + radius;
      else if (least === pushUp) p.y = wall.y - radius;
      else p.y = wall.y + wall.h + radius;
    }
  }
  return moved;
}

// Clamp a point inside the playfield rectangle.
export function clampToPlayfield(p, bounds) {
  p.x = Math.max(bounds.x, Math.min(bounds.x + bounds.w, p.x));
  p.y = Math.max(bounds.y, Math.min(bounds.y + bounds.h, p.y));
}
