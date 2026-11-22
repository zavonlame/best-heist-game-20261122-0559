// Velvet Vault — Midnight at the Aurora Grand.
// Boot, game loop and the rules that tie the systems together: the timer,
// the alarm meter, wanted states, win/lose, best score and the debug hooks
// the play-test driver uses. The game itself lives in the other modules;
// this file only wires them up and keeps time.

import { buildLevel, LOOT_TARGET, TIME_LIMIT_SECONDS, WORLD } from './level.js';
import { createPlayer, createKeyState, movePlayer, throwPebble, useJammer, nearestInteractable } from './player.js';
import { updateGuard, highestDetection, anyGuardAlarmed, anyGuardSuspicious } from './guards.js';
import { cameraSpotsPlayer, markCameraSpotting } from './cameras.js';
import { collectNearbyLoot, advanceSafeCrack } from './loot.js';
import { drawScene } from './render.js';
import { stageShotScene } from './shots.js';
import {
  ensureAudio, playPickup, playGoldPickup, playSafeClick, playSafeCracked,
  playPebble, playJammer, playSpotted, playCameraSpot, playCaught, playWin, playLose,
  playStep, playTick, startAlarm, stopAlarm,
} from './audio.js';

const BEST_KEY = 'velvet-vault-best-loot';
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function loadBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY) || 0) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch { /* private mode: best score just does not persist */ }
}

function freshState() {
  const level = buildLevel();
  return {
    phase: 'title',
    level,
    player: createPlayer(level.spawn),
    keys: createKeyState(),
    timeLeft: TIME_LIMIT_SECONDS,
    alarm: 0,
    wanted: 'CALM',
    now: 0,
    frozen: false,
    ripples: [],
    activeNoise: null,
    message: '',
    messageUntil: 0,
    winLine: '',
    loseLine: '',
    best: loadBest(),
    nearLoot: false,
    nearSafe: false,
    nearGetaway: false,
    crackingSafe: null,
    lastTickSecond: -1,
    stats: { spotted: 0, alarms: 0, safesCracked: 0, pebblesThrown: 0, jammersUsed: 0 },
  };
}

let state = freshState();

function showMessage(text, seconds = 2.6) {
  state.message = text;
  state.messageUntil = state.now + seconds;
}

function startHeist() {
  state = freshState();
  state.phase = 'playing';
  ensureAudio();
  showMessage('Get $20,000, then reach the getaway car. Stay out of the light.');
}

function endHeist(won, line) {
  state.phase = won ? 'won' : 'lost';
  state.winLine = won ? line : '';
  state.loseLine = won ? '' : line;
  if (won) {
    playWin();
    if (state.player.loot > state.best) {
      state.best = state.player.loot;
      saveBest(state.best);
    }
  } else {
    playLose();
  }
  stopAlarm();
}

function updateWanted() {
  if (state.phase !== 'playing') return;
  if (anyGuardAlarmed(state.level.guards) || state.alarm >= 75) state.wanted = 'ALARM';
  else if (anyGuardSuspicious(state.level.guards) || state.alarm >= 40 || highestDetection(state.level.guards) >= 0.55) state.wanted = 'SUSPICIOUS';
  else state.wanted = 'CALM';
  if (state.wanted === 'ALARM') startAlarm();
  else stopAlarm();
}

function handleGuardEvents(events) {
  for (const event of events) {
    if (event.type === 'spotted') {
      state.stats.spotted += 1;
      state.alarm = Math.min(100, state.alarm + 12);
      playSpotted();
      showMessage(`${event.guard.name} saw something…`);
    } else if (event.type === 'alarm') {
      state.stats.alarms += 1;
      state.alarm = Math.min(100, state.alarm + 25);
      playSpotted();
      showMessage(`${event.guard.name} raised the alarm! Run!`, 3);
    } else if (event.type === 'caught') {
      playCaught();
      endHeist(false, `${event.guard.name} grabbed Wren in the ${state.alarm >= 100 ? 'lockdown' : 'dark'}. The crew never saw her again.`);
      return;
    }
  }
}

function updatePlaying(dt) {
  const { level, player } = state;
  state.timeLeft -= dt;
  const wholeSecond = Math.ceil(state.timeLeft);
  if (wholeSecond !== state.lastTickSecond) {
    state.lastTickSecond = wholeSecond;
    if (wholeSecond <= 10 && wholeSecond > 0) playTick();
  }
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    endHeist(false, 'The clock hit zero and the vault sealed itself. Wren slipped out empty-handed.');
    return;
  }

  movePlayer(player, state.keys.keys, dt, level.walls, WORLD, playStep);

  // Cameras feed the alarm meter while the thief is in their cone,
  // with a warning blip the first moment one gains sight.
  for (const cam of level.cameras) {
    const spotting = cameraSpotsPlayer(cam, player, level.walls, state.now);
    if (markCameraSpotting(cam, spotting)) playCameraSpot();
    if (spotting) {
      state.alarm = Math.min(100, state.alarm + 26 * dt);
    }
  }

  // The alarm cools down slowly while nobody can see the thief.
  const seen = highestDetection(level.guards) > 0.05
    || level.cameras.some((c) => cameraSpotsPlayer(c, player, level.walls, state.now));
  if (!seen) state.alarm = Math.max(0, state.alarm - 2.2 * dt);
  if (state.alarm >= 100) {
    playCaught();
    endHeist(false, 'The alarm hit 100% — lockdown. Steel shutters, sirens, and nowhere left to run.');
    return;
  }

  // Loot on touch, safes on a held E.
  collectNearbyLoot(player, level, (item) => {
    if (item.kind === 'gold' || item.kind === 'gem') playGoldPickup();
    else playPickup();
    showMessage(`+ $${item.value.toLocaleString('en-US')} — ${item.label}`);
  });
  const holdingE = state.keys.keys.has('KeyE');
  state.crackingSafe = advanceSafeCrack(player, level, holdingE, dt, playSafeClick, (safe) => {
    state.stats.safesCracked += 1;
    playSafeCracked();
    showMessage(`Safe cracked! + $${safe.value.toLocaleString('en-US')}`, 3);
  });

  // Pebble ripples fade; the noise they carry is live for under a second.
  state.ripples = state.ripples.filter((r) => state.now - r.born < 0.9);
  const noise = state.activeNoise && state.now - state.activeNoise.born < 0.9
    ? state.activeNoise : null;
  state.activeNoise = noise;

  const events = [];
  for (const guard of level.guards) {
    updateGuard(guard, player, level.walls, dt, state.now, events, noise);
  }
  handleGuardEvents(events);
  if (state.phase !== 'playing') return;

  // What is the thief standing next to? Drives the hint bar.
  const near = nearestInteractable(player, level);
  state.nearLoot = near?.type === 'loot';
  state.nearSafe = near?.type === 'safe';
  state.nearGetaway = near?.type === 'getaway';

  updateWanted();
}

function tryInteract() {
  if (state.phase !== 'playing') return;
  const near = nearestInteractable(state.player, state.level);
  if (!near) return;
  if (near.type === 'getaway') {
    const line = state.player.loot >= LOOT_TARGET
      ? 'Wren slides into the driver’s seat as the Aurora Grand’s lights flare behind her.'
      : 'Wren peels away into the night — the job is done, even if the take was light.';
    endHeist(true, line);
  }
}

function onKeyDown(event) {
  const code = event.code;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
    event.preventDefault();
  }
  if (event.repeat) return;
  state.keys.keys.add(code);
  ensureAudio();
  if (state.phase === 'title' && (code === 'Enter' || code === 'Space')) {
    startHeist();
    return;
  }
  if ((state.phase === 'won' || state.phase === 'lost') && code === 'KeyR') {
    startHeist();
    return;
  }
  if (state.phase !== 'playing') return;
  if (code === 'KeyQ') {
    const landing = throwPebble(state.player, state.keys.mouse, state.level.walls);
    if (landing) {
      landing.born = state.now;
      state.ripples.push(landing);
      state.activeNoise = landing;
      state.stats.pebblesThrown += 1;
      playPebble();
    }
  } else if (code === 'KeyF') {
    const jammed = useJammer(state.player, state.level.cameras, state.now);
    if (jammed) {
      state.stats.jammersUsed += 1;
      playJammer();
      showMessage('Camera jammed for 15 seconds.');
    }
  } else if (code === 'KeyE') {
    tryInteract();
  }
}

function onKeyUp(event) {
  state.keys.keys.delete(event.code);
}

function onMouseMove(event) {
  const rect = canvas.getBoundingClientRect();
  state.keys.mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  state.keys.mouse.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
}

function onMouseDown(event) {
  ensureAudio();
  onMouseMove(event);
  state.keys.mouse.clicked = true;
  if (state.phase === 'title') {
    startHeist();
    return;
  }
  if (state.phase === 'playing' && event.button === 0) {
    // Clicking near the thief throws a pebble toward the click.
    const landing = throwPebble(state.player, state.keys.mouse, state.level.walls);
    if (landing) {
      landing.born = state.now;
      state.ripples.push(landing);
      state.activeNoise = landing;
      state.stats.pebblesThrown += 1;
      playPebble();
    }
  }
}

canvas.addEventListener('mousemove', onMouseMove);
canvas.addEventListener('mousedown', onMouseDown);
window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', onKeyUp);

// Deterministic screenshot scenes: ?shot=start | play | alarm | end.
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  stageShotScene(shot, state);
  state.frozen = state.phase === 'playing';
}

// Debug hooks for the play-test driver: read state and drive the game
// without a human hand. Harmless in normal play; never used by the game.
window.__heist = {
  get state() { return state; },
  start: startHeist,
  press(code) { onKeyDown({ code, repeat: false, preventDefault() {} }); },
  release(code) { onKeyUp({ code }); },
  clickAt(x, y) { state.keys.mouse.x = x; state.keys.mouse.y = y; onMouseDown({ button: 0, clientX: 0, clientY: 0 }); },
  teleport(x, y) { state.player.x = x; state.player.y = y; },
  setAlarm(v) { state.alarm = v; },
};

// The loop: fixed wall-clock steps, so the game runs the same on any machine.
let last = performance.now();
function frame(nowMs) {
  const dt = Math.min(0.05, (nowMs - last) / 1000);
  last = nowMs;
  if (!state.frozen) {
    state.now += dt;
    if (state.phase === 'playing') updatePlaying(dt);
  }
  drawScene(ctx, state);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
