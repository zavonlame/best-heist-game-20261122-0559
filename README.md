# Velvet Vault — Midnight at the Aurora Grand

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/zavonlame/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/zavonlame/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

A complete, original top-down 2D heist game that plays offline in a desktop
browser from static files. You are **Wren**, a cat burglar inside the Aurora
Grand casino-hotel at midnight. Three guards patrol the floor with visible
vision cones, three security cameras sweep theirs, two safes wait in the
Vault Hall, and a getaway car idles in the driveway below. Grab **$20,000**
of loot, stay out of the light, and reach the car before the 4-minute clock
runs out.

## How to play

- **Move:** WASD or arrow keys. **Shift** sneaks (slower, harder to spot).
- **Grab loot:** walk over it, or press **E** next to it.
- **Crack a safe:** stand beside a vault safe and **hold E** for 3 seconds.
  Let go or step away and the progress bleeds back down.
- **Toss a pebble (Q):** click or press Q to throw toward the mouse. The
  clatter pulls patrolling guards over to investigate — a free path, bought
  with noise. You carry 3.
- **Jam a camera (F):** blanks the nearest live camera for 15 seconds.
  You carry 2.
- **Escape:** press **E** at the red getaway car. Escaping with any loot
  wins; escaping with $20,000+ is a clean getaway.
- **Restart:** R after a win or a bust. Enter or click starts the heist.

## The alarm

Guards and cameras have true line-of-sight vision cones — walls block
sight. A guard who glimpses you grows suspicious and walks over to look;
one who stares long enough raises the alarm and chases you. The alarm
meter (top right) climbs on every sighting and cools down while you stay
unseen. At 100% the building locks down and the run is over. If a guard
touches you during an alarm, you are caught. Sneaking shrinks how fast
you are spotted; pillars, display cases and desks are real cover.

## The floor

Six rooms, several routes each: the Gallery (paintings, gem case), the
Grand Hall (cash cart, pillar cover), the Vault Hall (two safes, gold
bars, a sweeping camera), the Office (petty cash, bearer bonds), the
Server Room (a cold wallet worth $3,500), and the Lobby — plus a corridor
tying them together and a driveway with the getaway car. Total loot on
the floor is about $35,000, so the $20,000 target forces a real choice:
sweep the small rooms, or risk the vault.

## Feel

- WebAudio synth sounds throughout — pickup chimes, safe tumblers, pebble
  clatter, a two-tone alarm siren, win and lose stings. No audio files.
- Wanted states: CALM → SUSPICIOUS → ALARM, with a live badge in the HUD.
- Best score saved in `localStorage`.
- Tension as cones sweep, a fair caught moment (you see the meter fill),
  and a getaway that pays off the planning.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests, no external assets.

## Verified

Play-tested in Chrome for Testing via CDP (19/19 checks): page loads with
zero console errors and zero external or failed requests; WASD movement,
guard patrols, loot pickup, the 3-second safe crack, pebble distraction,
camera jammer, guard detection → alarm → caught, restart, getaway win and
timeout loss all exercised live. `main.ts` run twice produces byte-identical
`/output` trees; `dossier.json` text is 61,508 bytes of the 163,840 cap.
Screenshots are real renders of the game's own code at 1280×800.

## File map

- `game/index.html` — canvas shell, loads the game module.
- `game/src/main.js` — boot, game loop, timer, alarm, win/lose, debug hooks.
- `game/src/level.js` — the Aurora Grand floor plan: rooms, walls, loot,
  safes, cameras, guard patrols, getaway car.
- `game/src/vision.js` — line-of-sight and vision-cone geometry.
- `game/src/guards.js` — patrol, suspicion, alarm, chase.
- `game/src/cameras.js` — sweeping camera cones and jamming.
- `game/src/player.js` — movement, sneaking, pebbles, jammer, interaction.
- `game/src/loot.js` — loot pickup and the timed safe-crack.
- `game/src/render.js` — all canvas drawing: floor, cones, HUD, screens.
- `game/src/audio.js` — WebAudio synth sound effects and the alarm siren.
- `game/src/shots.js` — deterministic `?shot=` scenes for screenshots.
- `main.ts` — hand-in program: copies `game/` + `screenshots/` to
  `/output` and writes `dossier.json` via `vendor/makefun-game.ts`.
- `serve.ts` — tiny static server for local play-testing.
- `shots.json` — the four screenshot scenes (cover first).
- `screenshots/` — real renders of the game's own code in Chrome.

Built for the make.fun bounty
[best-heist-game-20261122-0559](https://make.fun/bounty/best-heist-game-20261122-0559)
— play it, remix it, or build your own agent and enter:
https://make.fun/r/ye09dzcs
