// Everything the player sees: the casino floor, vision cones, the thief,
// the guards and cameras, the loot, the getaway car, the HUD, and the
// title / win / lose screens. All drawing is plain canvas 2D, no images.

import { cameraFacing } from './cameras.js';
import { LOOT_TARGET } from './level.js';

const W = 1280;
const H = 800;
const HUD_H = 56;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCone(ctx, x, y, facing, halfAngle, range, fill, edge) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, facing - halfAngle, facing + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawFloor(ctx, level) {
  ctx.fillStyle = '#0b0e1c';
  ctx.fillRect(0, HUD_H, W, H - HUD_H);
  for (const room of level.rooms) {
    ctx.fillStyle = room.floor;
    ctx.fillRect(room.x, room.y, room.w, room.h);
    // Faint checker tiles so each room reads as a real floor.
    ctx.strokeStyle = 'rgba(255,255,255,0.045)';
    ctx.lineWidth = 1;
    for (let x = room.x + 40; x < room.x + room.w; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, room.y); ctx.lineTo(x, room.y + room.h); ctx.stroke();
    }
    for (let y = room.y + 40; y < room.y + room.h; y += 40) {
      ctx.beginPath(); ctx.moveTo(room.x, y); ctx.lineTo(room.x + room.w, y); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.font = '600 15px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(room.name, room.x + 12, room.y + 24);
  }
  // The corridor between the two rows, carpeted in deep red.
  ctx.fillStyle = '#3a1520';
  ctx.fillRect(16, 402, 1248, 76);
  ctx.fillStyle = 'rgba(212,175,55,0.35)';
  ctx.fillRect(16, 402, 1248, 3);
  ctx.fillRect(16, 475, 1248, 3);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.font = '600 13px "Trebuchet MS", sans-serif';
  ctx.fillText('CORRIDOR', 24, 428);
}

function drawWalls(ctx, level) {
  for (const wall of level.walls) {
    ctx.fillStyle = '#12152a';
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(wall.x + 0.75, wall.y + 0.75, wall.w - 1.5, wall.h - 1.5);
  }
}

function drawLoot(ctx, level, now) {
  const bob = Math.sin(now * 2.4) * 2;
  for (const item of level.loot) {
    if (item.taken) continue;
    const pulse = 0.55 + Math.sin(now * 3 + item.x) * 0.2;
    ctx.save();
    ctx.translate(item.x, item.y + bob);
    ctx.shadowColor = '#ffd94d';
    ctx.shadowBlur = 14 * pulse;
    if (item.kind === 'painting') {
      ctx.fillStyle = '#8a6d2f';
      ctx.fillRect(-14, -10, 28, 20);
      ctx.fillStyle = '#3f6db5';
      ctx.fillRect(-11, -7, 22, 14);
      ctx.fillStyle = '#e8d9a0';
      ctx.fillRect(-11, -7, 22, 4);
    } else if (item.kind === 'gem') {
      ctx.fillStyle = '#7de3ff';
      ctx.beginPath();
      ctx.moveTo(0, -12); ctx.lineTo(10, 0); ctx.lineTo(0, 12); ctx.lineTo(-10, 0);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.moveTo(0, -12); ctx.lineTo(5, -2); ctx.lineTo(0, 2); ctx.lineTo(-5, -2);
      ctx.closePath(); ctx.fill();
    } else if (item.kind === 'gold') {
      ctx.fillStyle = '#ffd94d';
      ctx.beginPath();
      ctx.moveTo(-12, 6); ctx.lineTo(-8, -6); ctx.lineTo(8, -6); ctx.lineTo(12, 6);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b8860b';
      ctx.fillRect(-8, -2, 16, 2);
    } else {
      ctx.fillStyle = '#4caf50';
      ctx.fillRect(-12, -7, 24, 14);
      ctx.fillStyle = '#c8e6c9';
      ctx.fillRect(-9, -4, 18, 8);
      ctx.fillStyle = '#2e7d32';
      ctx.font = 'bold 9px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', 0, 4);
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,217,77,0.9)';
    ctx.font = '600 10px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`$${item.value.toLocaleString('en-US')}`, item.x, item.y + 26);
  }
}

function drawSafes(ctx, level, now) {
  for (const safe of level.safes) {
    ctx.save();
    ctx.translate(safe.x, safe.y);
    ctx.fillStyle = safe.cracked ? '#3d4a2a' : '#4a4f63';
    roundRect(ctx, -26, -22, 52, 44, 6);
    ctx.fill();
    ctx.strokeStyle = safe.cracked ? '#9acd32' : '#c9cedb';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#232637';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd94d';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(now * 0.8) * 8, Math.sin(now * 0.8) * 8);
    ctx.stroke();
    ctx.fillStyle = safe.cracked ? '#9acd32' : '#ffd94d';
    ctx.font = '600 10px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(safe.cracked ? 'OPEN' : `$${safe.value.toLocaleString('en-US')}`, 0, 36);
    if (safe.progress > 0 && !safe.cracked) {
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(0, 0, 32, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#ffd94d';
      ctx.beginPath(); ctx.arc(0, 0, 32, -Math.PI / 2, -Math.PI / 2 + safe.progress * Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
}

function drawGetawayCar(ctx, level, now) {
  const car = level.getaway;
  const glow = 0.5 + Math.sin(now * 2) * 0.25;
  ctx.save();
  ctx.shadowColor = '#ff5252';
  ctx.shadowBlur = 24 * glow;
  ctx.fillStyle = '#c62828';
  roundRect(ctx, car.x, car.y, car.w, car.h, 14);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#7f0000';
  roundRect(ctx, car.x + 18, car.y + 8, car.w - 36, car.h - 16, 8);
  ctx.fill();
  ctx.fillStyle = '#b3e5fc';
  ctx.fillRect(car.x + 34, car.y + 12, 34, 12);
  ctx.fillRect(car.x + car.w - 68, car.y + 12, 34, 12);
  ctx.fillStyle = '#ffeb3b';
  ctx.beginPath(); ctx.arc(car.x + 8, car.y + 12, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(car.x + 8, car.y + car.h - 12, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(car.x + car.w - 8, car.y + 12, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(car.x + car.w - 8, car.y + car.h - 12, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 13px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GETAWAY CAR  —  ESCAPE HERE', car.x + car.w / 2, car.y - 8);
}

function drawCameras(ctx, level, now) {
  for (const cam of level.cameras) {
    const live = cam.disabledUntil <= now;
    const facing = cameraFacing(cam, now);
    if (live) {
      drawCone(ctx, cam.x, cam.y, facing, cam.halfAngle, cam.range,
        'rgba(255,60,60,0.13)', 'rgba(255,80,80,0.45)');
    }
    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.fillStyle = live ? '#b71c1c' : '#616161';
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.rotate(facing);
    ctx.fillStyle = live ? '#ff5252' : '#9e9e9e';
    ctx.fillRect(6, -3, 12, 6);
    ctx.restore();
    if (!live) {
      ctx.fillStyle = '#e0e0e0';
      ctx.font = '700 10px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('JAMMED', cam.x, cam.y - 14);
    }
  }
}

function drawGuards(ctx, guards, now) {
  for (const guard of guards) {
    const coneFill = guard.state === 'alarm'
      ? 'rgba(255,40,40,0.22)'
      : guard.state === 'suspicious'
        ? 'rgba(255,180,40,0.16)'
        : 'rgba(255,220,90,0.10)';
    const coneEdge = guard.state === 'alarm'
      ? 'rgba(255,60,60,0.6)'
      : 'rgba(255,220,90,0.4)';
    drawCone(ctx, guard.x, guard.y, guard.facing, 0.61, 195, coneFill, coneEdge);
  }
  for (const guard of guards) {
    ctx.save();
    ctx.translate(guard.x, guard.y);
    ctx.fillStyle = guard.state === 'alarm' ? '#7f1d1d' : '#1e3a5f';
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#e3f2fd';
    ctx.beginPath(); ctx.arc(0, -2, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, -2, 6, 0, Math.PI * 2); ctx.stroke();
    // Facing tick so the patrol direction reads at a glance.
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(guard.facing) * 14, Math.sin(guard.facing) * 14);
    ctx.lineTo(Math.cos(guard.facing) * 22, Math.sin(guard.facing) * 22);
    ctx.stroke();
    ctx.restore();
    // Detection meter above the guard's head.
    if (guard.detection > 0.05) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(guard.x - 18, guard.y - 30, 36, 6);
      ctx.fillStyle = guard.detection > 0.55 ? '#ff5252' : '#ffb300';
      ctx.fillRect(guard.x - 17, guard.y - 29, 34 * guard.detection, 4);
    }
    if (guard.state !== 'patrol') {
      ctx.fillStyle = guard.state === 'alarm' ? '#ff5252' : '#ffb300';
      ctx.font = '700 12px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(guard.state === 'alarm' ? '!' : '?', guard.x, guard.y - 34);
    }
  }
}

function drawPlayer(ctx, player, now) {
  const bob = player.moving ? Math.sin(now * 14) * 1.5 : 0;
  ctx.save();
  ctx.translate(player.x, player.y + bob);
  ctx.shadowColor = '#4dd0e1';
  ctx.shadowBlur = player.sneaking ? 6 : 14;
  ctx.fillStyle = '#0e4d5c';
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffd94d';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#e0f7fa';
  ctx.beginPath(); ctx.arc(0, -1, 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffd94d';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(Math.cos(player.facing) * 13, Math.sin(player.facing) * 13);
  ctx.lineTo(Math.cos(player.facing) * 20, Math.sin(player.facing) * 20);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#b2ebf2';
  ctx.font = '700 11px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(player.sneaking ? 'WREN · SNEAKING' : 'WREN', player.x, player.y - 22);
}

function drawPebbleRipples(ctx, ripples, now) {
  for (const ripple of ripples) {
    const age = now - ripple.born;
    const progress = Math.min(1, age / 0.9);
    ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - progress)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ripple.x, ripple.y, 8 + progress * 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(ripple.x, ripple.y, 3, 0, Math.PI * 2); ctx.fill();
  }
}

function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return `${m}:${rest.toString().padStart(2, '0')}`;
}

function drawHud(ctx, s) {
  ctx.fillStyle = '#0d1024';
  ctx.fillRect(0, 0, W, HUD_H);
  ctx.fillStyle = '#d4af37';
  ctx.fillRect(0, HUD_H - 3, W, 3);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd94d';
  ctx.font = '700 20px "Trebuchet MS", sans-serif';
  ctx.fillText('VELVET VAULT', 16, 26);
  ctx.fillStyle = '#b0bec5';
  ctx.font = '600 12px "Trebuchet MS", sans-serif';
  ctx.fillText('Midnight at the Aurora Grand', 16, 44);

  // Loot counter.
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 19px "Trebuchet MS", sans-serif';
  ctx.fillText(`LOOT  $${s.player.loot.toLocaleString('en-US')}`, 300, 26);
  ctx.fillStyle = s.player.loot >= LOOT_TARGET ? '#9acd32' : '#90a4ae';
  ctx.font = '600 12px "Trebuchet MS", sans-serif';
  ctx.fillText(`target $${LOOT_TARGET.toLocaleString('en-US')}  ·  ${s.player.lootCount} items`, 300, 44);

  // Timer.
  const lowTime = s.timeLeft <= 30;
  ctx.fillStyle = lowTime ? '#ff5252' : '#ffffff';
  ctx.font = '700 22px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(formatTime(s.timeLeft), 640, 28);
  ctx.fillStyle = '#90a4ae';
  ctx.font = '600 11px "Trebuchet MS", sans-serif';
  ctx.fillText('TIME LEFT', 640, 45);

  // Alarm meter.
  const meterX = 760;
  const meterW = 220;
  ctx.fillStyle = '#90a4ae';
  ctx.font = '700 12px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', meterX, 18);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  roundRect(ctx, meterX, 24, meterW, 16, 4);
  ctx.fill();
  const alarmFill = s.alarm / 100;
  ctx.fillStyle = s.alarm >= 75 ? '#ff1744' : s.alarm >= 40 ? '#ff9100' : '#ffd94d';
  if (alarmFill > 0) {
    roundRect(ctx, meterX, 24, meterW * alarmFill, 16, 4);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 12px "Trebuchet MS", sans-serif';
  ctx.fillText(`${Math.round(s.alarm)}%`, meterX + meterW + 8, 37);

  // Wanted state badge.
  const stateText = s.phase === 'won' ? 'ESCAPED' : s.phase === 'lost' ? 'BUSTED' : s.wanted;
  const stateColor = stateText === 'ALARM' || stateText === 'BUSTED' ? '#ff1744'
    : stateText === 'SUSPICIOUS' ? '#ff9100'
    : stateText === 'ESCAPED' ? '#9acd32' : '#4dd0e1';
  ctx.fillStyle = stateColor;
  roundRect(ctx, 1060, 12, 110, 32, 6);
  ctx.fill();
  ctx.fillStyle = '#0b0e1c';
  ctx.font = '700 14px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(stateText, 1115, 33);

  // Tools, kept short so the line fits inside the HUD.
  ctx.fillStyle = '#b0bec5';
  ctx.font = '600 12px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Q pebble ×${s.player.pebbles}`, 1180, 26);
  ctx.fillText(`F jammer ×${s.player.jammers}`, 1180, 44);
  ctx.textAlign = 'left';
}

function drawHintBar(ctx, s) {
  if (s.phase !== 'playing') return;
  let hint = 'WASD move · Shift sneak · Q toss a pebble (lure guards) · F jam the nearest camera · E grab / crack';
  if (s.nearSafe) hint = 'Hold E — cracking the safe… stay still, stay unseen!';
  else if (s.nearLoot) hint = 'Press E — grab the loot!';
  else if (s.nearGetaway) hint = 'Press E — jump in the getaway car and escape!';
  ctx.fillStyle = 'rgba(8,10,22,0.82)';
  ctx.fillRect(0, H - 30, W, 30);
  ctx.fillStyle = '#ffe082';
  ctx.font = '600 14px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(hint, W / 2, H - 10);
}

function drawToast(ctx, s) {
  if (!s.message || s.now > s.messageUntil) return;
  ctx.fillStyle = 'rgba(8,10,22,0.85)';
  const text = s.message;
  ctx.font = '700 17px "Trebuchet MS", sans-serif';
  const w = ctx.measureText(text).width + 36;
  roundRect(ctx, (W - w) / 2, 70, w, 34, 8);
  ctx.fill();
  ctx.fillStyle = '#ffd94d';
  ctx.textAlign = 'center';
  ctx.fillText(text, W / 2, 93);
}

function drawTitle(ctx, s) {
  ctx.fillStyle = 'rgba(5,7,16,0.78)';
  ctx.fillRect(0, HUD_H, W, H - HUD_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd94d';
  ctx.font = '700 54px Georgia, serif';
  ctx.fillText('VELVET VAULT', W / 2, 220);
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 22px "Trebuchet MS", sans-serif';
  ctx.fillText('Midnight at the Aurora Grand', W / 2, 258);
  ctx.fillStyle = '#b0bec5';
  ctx.font = '16px "Trebuchet MS", sans-serif';
  ctx.fillText('One thief. Three guards. Three cameras. Two safes. One getaway car.', W / 2, 300);
  ctx.fillText('Grab $20,000 of loot and reach the car before the clock runs out —', W / 2, 326);
  ctx.fillText('and never let a cone of light settle on you.', W / 2, 350);
  ctx.fillStyle = '#e0f7fa';
  ctx.font = '600 16px "Trebuchet MS", sans-serif';
  ctx.fillText('WASD / arrows — move      Shift — sneak      Q — toss a pebble', W / 2, 410);
  ctx.fillText('F — jam the nearest camera      E — grab loot / crack a safe (hold)', W / 2, 436);
  ctx.fillText('Mouse — aim your pebble      R — restart after a win or a bust', W / 2, 462);
  const pulse = 0.65 + Math.sin(s.now * 3) * 0.35;
  ctx.fillStyle = `rgba(255,217,77,${pulse})`;
  ctx.font = '700 22px "Trebuchet MS", sans-serif';
  ctx.fillText('CLICK OR PRESS ENTER TO START', W / 2, 540);
  if (s.best > 0) {
    ctx.fillStyle = '#9acd32';
    ctx.font = '700 16px "Trebuchet MS", sans-serif';
    ctx.fillText(`Best score so far: $${s.best.toLocaleString('en-US')}`, W / 2, 580);
  }
  ctx.fillStyle = '#78909c';
  ctx.font = '13px "Trebuchet MS", sans-serif';
  ctx.fillText('Wren the cat burglar vs. the Aurora Grand — an original game, no network needed.', W / 2, 700);
}

function drawEndScreen(ctx, s) {
  const won = s.phase === 'won';
  ctx.fillStyle = won ? 'rgba(10,26,10,0.82)' : 'rgba(26,8,8,0.82)';
  ctx.fillRect(0, HUD_H, W, H - HUD_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? '#9acd32' : '#ff5252';
  ctx.font = '700 52px Georgia, serif';
  ctx.fillText(won ? 'CLEAN GETAWAY!' : 'BUSTED!', W / 2, 260);
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 22px "Trebuchet MS", sans-serif';
  ctx.fillText(won ? s.winLine : s.loseLine, W / 2, 306);
  ctx.fillStyle = '#ffd94d';
  ctx.font = '700 26px "Trebuchet MS", sans-serif';
  ctx.fillText(`Loot: $${s.player.loot.toLocaleString('en-US')}  ·  ${s.player.lootCount} items`, W / 2, 360);
  ctx.fillStyle = '#b0bec5';
  ctx.font = '16px "Trebuchet MS", sans-serif';
  ctx.fillText(`Time left: ${formatTime(Math.max(0, s.timeLeft))}   ·   Best score: $${s.best.toLocaleString('en-US')}`, W / 2, 394);
  if (won && s.player.loot >= LOOT_TARGET) {
    ctx.fillStyle = '#9acd32';
    ctx.font = '700 18px "Trebuchet MS", sans-serif';
    ctx.fillText('Target met — the crew eats tonight.', W / 2, 430);
  } else if (won) {
    ctx.fillStyle = '#ffb300';
    ctx.font = '700 18px "Trebuchet MS", sans-serif';
    ctx.fillText('You escaped — but the target was $20,000. Come back richer.', W / 2, 430);
  }
  const pulse = 0.65 + Math.sin(s.now * 3) * 0.35;
  ctx.fillStyle = `rgba(255,217,77,${pulse})`;
  ctx.font = '700 20px "Trebuchet MS", sans-serif';
  ctx.fillText('PRESS R TO RUN IT AGAIN', W / 2, 500);
}

export function drawScene(ctx, s) {
  ctx.clearRect(0, 0, W, H);
  drawFloor(ctx, s.level);
  drawGetawayCar(ctx, s.level, s.now);
  drawLoot(ctx, s.level, s.now);
  drawSafes(ctx, s.level, s.now);
  drawCameras(ctx, s.level, s.now);
  drawGuards(ctx, s.level.guards, s.now);
  drawPlayer(ctx, s.player, s.now);
  drawPebbleRipples(ctx, s.ripples, s.now);
  drawWalls(ctx, s.level);
  drawHud(ctx, s);
  drawHintBar(ctx, s);
  drawToast(ctx, s);
  if (s.phase === 'title') drawTitle(ctx, s);
  if (s.phase === 'won' || s.phase === 'lost') drawEndScreen(ctx, s);
}
