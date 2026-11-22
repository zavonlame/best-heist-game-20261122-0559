// Security cameras: fixed mounts that sweep their vision cone back and
// forth. A camera that spots the thief feeds the alarm meter directly;
// a jammed camera is blind until its timer runs out.

import { insideVisionCone } from './vision.js';

export const CAMERA_VIEW_RANGE = 235;

export function cameraAngleAt(camera, now) {
  return camera.baseAngle + Math.sin(now * camera.speed + camera.phase) * camera.sweep;
}

export function cameraIsLive(camera, now) {
  return camera.disabledUntil <= now;
}

// Returns true when this camera has the thief in its cone this tick.
export function cameraSpotsPlayer(camera, player, walls, now) {
  if (!cameraIsLive(camera, now)) return false;
  const facing = cameraAngleAt(camera, now);
  return insideVisionCone(
    camera, facing, camera.halfAngle, camera.range, player, walls,
  );
}

// The cone's current facing, for the renderer.
export function cameraFacing(camera, now) {
  return cameraAngleAt(camera, now);
}

// Rising-edge detector: returns true only on the first tick a camera
// that was blind gains sight of the thief, so the game can play a
// warning cue once instead of once a frame.
export function markCameraSpotting(camera, spotting) {
  const wasSpotting = camera.spotting === true;
  camera.spotting = spotting;
  return spotting && !wasSpotting;
}
