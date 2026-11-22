// Deterministic screenshot scenes, staged through ?shot=<name>.
// Each scene freezes the game into one composed, legible frame: the cover
// shows the thief mid-room with guard cones, a camera, a loot target and
// the alarm meter all in view. Scenes never depend on the clock or on
// random input, so the same URL always renders the same frame.

export function stageShotScene(name, state) {
  const { level, player } = state;
  const guards = level.guards;
  const setGuard = (i, x, y, facing, detection, guardState) => {
    const g = guards[i];
    g.x = x;
    g.y = y;
    g.facing = facing;
    g.detection = detection;
    g.state = guardState;
    g.lastSeen = null;
  };

  if (name === 'start') {
    state.phase = 'title';
    state.timeLeft = 240;
    state.alarm = 0;
    state.wanted = 'CALM';
    player.x = level.spawn.x;
    player.y = level.spawn.y;
    setGuard(0, 220, 250, 0.3, 0, 'patrol');
    setGuard(1, 1060, 250, Math.PI, 0, 'patrol');
    setGuard(2, 480, 640, 0, 0, 'patrol');
    return true;
  }

  if (name === 'play') {
    // The cover: Wren crossing the Grand Hall toward the vault door,
    // Marco's cone sweeping past her, Iris patrolling the vault, Bo below,
    // the vault camera live, gold bars and a safe ahead, alarm at 12%.
    state.phase = 'playing';
    state.timeLeft = 187;
    state.alarm = 12;
    state.wanted = 'CALM';
    state.frozen = true;
    player.x = 640;
    player.y = 350;
    player.facing = 0.5;
    player.loot = 3600;
    player.lootCount = 3;
    player.pebbles = 2;
    player.jammers = 1;
    setGuard(0, 520, 300, 0.9, 0.2, 'patrol');
    setGuard(1, 980, 300, -0.4, 0, 'patrol');
    setGuard(2, 640, 700, -Math.PI / 2, 0, 'patrol');
    level.loot.find((i) => i.id === 'cash-cart').taken = true;
    level.loot.find((i) => i.id === 'painting-a').taken = true;
    level.loot.find((i) => i.id === 'gem-case').taken = true;
    return true;
  }

  if (name === 'alarm') {
    // The tense moment: Wren spotted in the Vault Hall, Iris on the chase,
    // the vault camera red, alarm at 68%, a safe half-cracked behind her.
    state.phase = 'playing';
    state.timeLeft = 96;
    state.alarm = 68;
    state.wanted = 'ALARM';
    state.frozen = true;
    player.x = 1000;
    player.y = 260;
    player.facing = Math.PI;
    player.loot = 12400;
    player.lootCount = 6;
    player.pebbles = 1;
    player.jammers = 0;
    setGuard(0, 700, 330, 0.2, 0.6, 'suspicious');
    setGuard(1, 930, 300, 0.5, 1, 'alarm');
    setGuard(2, 700, 640, -Math.PI / 2, 0.35, 'suspicious');
    level.safes[0].progress = 0.55;
    level.loot.find((i) => i.id === 'gold-a').taken = true;
    level.loot.find((i) => i.id === 'gold-b').taken = true;
    level.loot.find((i) => i.id === 'cash-cart').taken = true;
    level.loot.find((i) => i.id === 'painting-a').taken = true;
    level.loot.find((i) => i.id === 'gem-case').taken = true;
    return true;
  }

  if (name === 'end') {
    // The payoff: Wren at the getaway car, loot over target, clock to spare.
    state.phase = 'won';
    state.timeLeft = 41;
    state.alarm = 8;
    state.wanted = 'ESCAPED';
    state.winLine = 'Wren slips into the night with the Aurora Grand\'s gold.';
    player.x = 640;
    player.y = 752;
    player.facing = Math.PI / 2;
    player.loot = 21400;
    player.lootCount = 8;
    player.pebbles = 0;
    player.jammers = 0;
    // A real win with this take would set the best score to the take.
    state.best = Math.max(state.best, 21400);
    setGuard(0, 380, 340, 2.6, 0, 'patrol');
    setGuard(1, 1150, 340, 2.2, 0, 'patrol');
    setGuard(2, 420, 620, 0, 0, 'patrol');
    for (const item of level.loot) item.taken = true;
    level.safes[0].cracked = true;
    level.safes[1].cracked = true;
    return true;
  }

  return false;
}
