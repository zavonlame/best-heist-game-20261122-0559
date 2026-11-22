// The floor plan of the Aurora Grand: rooms, walls, loot, safes, cameras,
// guard patrols and the getaway car. All coordinates live in the same
// 1280x800 canvas space the renderer draws. The HUD occupies the top
// 56 pixels, so the playable floor starts below y = 64.

export const WORLD = { x: 16, y: 72, w: 1248, h: 712 };
export const LOOT_TARGET = 20000;
export const TIME_LIMIT_SECONDS = 240;

function wall(x, y, w, h) {
  return { x, y, w, h };
}

// A wall with a doorway cut through it: returns the wall in two pieces.
function wallWithDoor(x, y, w, h, doorStart, doorEnd, horizontal) {
  if (horizontal) {
    return [wall(x, y, doorStart - x, h), wall(doorEnd, y, x + w - doorEnd, h)];
  }
  return [wall(x, y, w, doorStart - y), wall(x, doorEnd, w, y + h - doorEnd)];
}

export function buildLevel() {
  const walls = [];
  const rooms = [
    { name: 'GALLERY', x: 16, y: 72, w: 414, h: 328, floor: '#1c2340', trim: '#3a4470' },
    { name: 'GRAND HALL', x: 430, y: 72, w: 420, h: 328, floor: '#232a4a', trim: '#454f7d' },
    { name: 'VAULT HALL', x: 850, y: 72, w: 414, h: 328, floor: '#2a2113', trim: '#6b5426' },
    { name: 'OFFICE', x: 16, y: 480, w: 344, h: 304, floor: '#1a2033', trim: '#333d5e' },
    { name: 'LOBBY', x: 360, y: 480, w: 560, h: 304, floor: '#20264a', trim: '#3f4a7a' },
    { name: 'SERVER ROOM', x: 920, y: 480, w: 344, h: 304, floor: '#14202a', trim: '#2c4a5e' },
  ];

  // Outer shell, with a driveway gap at the bottom centre for the getaway car.
  walls.push(wall(8, 64, 1264, 10)); // north
  walls.push(wall(8, 64, 10, 720)); // west
  walls.push(wall(1262, 64, 10, 720)); // east
  walls.push(wall(8, 774, 552, 10)); // south, west of the driveway
  walls.push(wall(720, 774, 552, 10)); // south, east of the driveway

  // Vertical dividers on the top row, each with a doorway.
  walls.push(...wallWithDoor(430, 72, 12, 328, 236, 316, false));
  walls.push(...wallWithDoor(850, 72, 12, 328, 236, 316, false));

  // Corridor walls (the corridor runs y 400..480 across the whole floor).
  walls.push(...wallWithDoor(16, 392, 1248, 10, 180, 260, true)); // north wall: gallery door
  walls.push(...wallWithDoor(16, 392, 1248, 10, 600, 680, true)); // north wall: hall door
  walls.push(...wallWithDoor(16, 392, 1248, 10, 1010, 1090, true)); // north wall: vault door
  walls.push(...wallWithDoor(16, 478, 1248, 10, 140, 220, true)); // south wall: office door
  walls.push(...wallWithDoor(16, 478, 1248, 10, 600, 680, true)); // south wall: lobby door
  walls.push(...wallWithDoor(16, 478, 1248, 10, 1040, 1120, true)); // south wall: server door

  // Vertical dividers on the bottom row, each with a doorway.
  walls.push(...wallWithDoor(360, 480, 12, 304, 600, 680, false));
  walls.push(...wallWithDoor(920, 480, 12, 304, 600, 680, false));

  // Cover: pillars in the Grand Hall, display cases in the Gallery,
  // desks in the Office, server racks in the Server Room. All of them
  // block movement and line of sight, so the player can hide behind them.
  walls.push(wall(520, 160, 30, 30));
  walls.push(wall(720, 160, 30, 30));
  walls.push(wall(620, 300, 30, 30));
  walls.push(wall(120, 150, 90, 26));
  walls.push(wall(120, 300, 90, 26));
  walls.push(wall(300, 150, 26, 90));
  walls.push(wall(80, 560, 110, 30));
  walls.push(wall(80, 680, 110, 30));
  walls.push(wall(260, 620, 30, 90));
  walls.push(wall(1000, 560, 26, 120));
  walls.push(wall(1120, 560, 26, 120));
  walls.push(wall(1000, 700, 130, 26));

  const loot = [
    // Gallery: framed paintings and a gem case.
    { id: 'painting-a', kind: 'painting', x: 165, y: 200, value: 1200, label: 'Painting' },
    { id: 'painting-b', kind: 'painting', x: 165, y: 280, value: 1200, label: 'Painting' },
    { id: 'gem-case', kind: 'gem', x: 350, y: 200, value: 3000, label: 'Gem case' },
    // Grand Hall: the cash cart by the pillar.
    { id: 'cash-cart', kind: 'cash', x: 680, y: 340, value: 1800, label: 'Cash cart' },
    // Vault Hall: gold bars stacked by the safes.
    { id: 'gold-a', kind: 'gold', x: 950, y: 330, value: 2500, label: 'Gold bar' },
    { id: 'gold-b', kind: 'gold', x: 1010, y: 330, value: 2500, label: 'Gold bar' },
    { id: 'gold-c', kind: 'gold', x: 1070, y: 330, value: 2500, label: 'Gold bar' },
    // Office: petty cash and bearer bonds.
    { id: 'petty-cash', kind: 'cash', x: 135, y: 620, value: 900, label: 'Petty cash' },
    { id: 'bonds', kind: 'cash', x: 320, y: 665, value: 600, label: 'Bearer bonds' },
    // Server Room: the cold wallet drive.
    { id: 'cold-wallet', kind: 'gem', x: 1065, y: 760, value: 3500, label: 'Cold wallet' },
    // Lobby: the tip jar, barely worth the risk.
    { id: 'tip-jar', kind: 'cash', x: 850, y: 700, value: 300, label: 'Tip jar' },
  ];

  const safes = [
    { id: 'safe-west', x: 960, y: 130, value: 8000, label: 'Vault safe', progress: 0, cracked: false },
    { id: 'safe-east', x: 1160, y: 130, value: 8000, label: 'Vault safe', progress: 0, cracked: false },
  ];

  const cameras = [
    {
      id: 'cam-gallery', x: 220, y: 96, baseAngle: Math.PI / 2,
      sweep: 0.9, speed: 0.55, phase: 0, range: 230, halfAngle: 0.52, disabledUntil: 0,
    },
    {
      id: 'cam-vault', x: 1060, y: 96, baseAngle: Math.PI / 2,
      sweep: 1.1, speed: 0.7, phase: 1.4, range: 250, halfAngle: 0.5, disabledUntil: 0,
    },
    {
      id: 'cam-corridor', x: 640, y: 404, baseAngle: Math.PI / 2,
      sweep: 1.2, speed: 0.45, phase: 2.6, range: 220, halfAngle: 0.55, disabledUntil: 0,
    },
  ];

  const guards = [
    {
      id: 'guard-marco', name: 'Marco', x: 220, y: 250,
      waypoints: [
        { x: 220, y: 250 }, { x: 380, y: 250 }, { x: 380, y: 276 },
        { x: 500, y: 276 }, { x: 670, y: 276 }, { x: 670, y: 340 },
        { x: 670, y: 440 }, { x: 220, y: 440 },
      ],
      waypointIndex: 0, speed: 62, facing: 0, state: 'patrol',
      detection: 0, lastSeen: null, investigateUntil: 0, pauseUntil: 0,
    },
    {
      id: 'guard-iris', name: 'Iris', x: 1060, y: 250,
      waypoints: [
        { x: 1060, y: 250 }, { x: 1200, y: 250 }, { x: 1200, y: 340 },
        { x: 950, y: 340 }, { x: 950, y: 250 }, { x: 1050, y: 250 },
        { x: 1050, y: 440 }, { x: 1050, y: 340 },
      ],
      waypointIndex: 0, speed: 66, facing: Math.PI, state: 'patrol',
      detection: 0, lastSeen: null, investigateUntil: 0, pauseUntil: 0,
    },
    {
      id: 'guard-bo', name: 'Bo', x: 480, y: 640,
      waypoints: [
        { x: 480, y: 640 }, { x: 700, y: 640 }, { x: 640, y: 440 },
        { x: 200, y: 440 }, { x: 200, y: 560 }, { x: 200, y: 700 },
        { x: 200, y: 640 }, { x: 420, y: 640 },
      ],
      waypointIndex: 0, speed: 58, facing: 0, state: 'patrol',
      detection: 0, lastSeen: null, investigateUntil: 0, pauseUntil: 0,
    },
  ];

  return {
    walls,
    rooms,
    loot,
    safes,
    cameras,
    guards,
    spawn: { x: 420, y: 720 },
    getaway: { x: 560, y: 726, w: 160, h: 52, label: 'GETAWAY CAR' },
  };
}
