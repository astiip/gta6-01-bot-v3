// NEON HARBOR: RAIN HEIST — every tuning number, colour and story beat in one place.
// Original game written for make.fun gta6-01. Meridian Bay is a fictional city; no real
// places, brands or licensed material appear anywhere in this game.

export const STEP = 1 / 60;

export const WORLD = {
  streetStep: 60, // distance between parallel streets, in metres
  streetHalf: 300, // streets run from -300 to +300 on both axes
  roadWidth: 14,
  waterZ: 322, // south of this line the harbour begins
  pierZ: 330,
};

export const PLAYER = {
  walkSpeed: 6.5,
  runSpeed: 9.5,
  radius: 0.55,
  hp: 100,
};

export const CAR = {
  accel: 26,
  brake: 42,
  reverseAccel: 14,
  maxSpeed: 62, // ~223 km/h, the NIGHTHAWK's top end
  maxReverse: 12,
  steer: 1.9,
  grip: 2.6, // wet-road grip; lower = more slide in the rain
  hp: 100,
};

export const WEAPONS = [
  { name: 'PISTOL', damage: 34, rate: 0.28, range: 60, spread: 0.012 },
  { name: 'SMG', damage: 16, rate: 0.09, range: 48, spread: 0.05 },
  { name: 'SHOTGUN', damage: 22, rate: 0.85, range: 26, spread: 0.09, pellets: 6 },
];

export const RANKS = ['ROOKIE', 'STREET', 'HUSTLER', 'RUNNER', 'GHOST', 'LEGEND'];
export const RANK_AT = [0, 40, 100, 180, 300, 450]; // respect points needed

export const UPGRADES = [
  { id: 'engine', name: 'ENGINE MK-II', desc: '+18% top speed, sharper throttle', cost: 25000, apply: (u) => { u.engine += 1; } },
  { id: 'armor', name: 'ARMOURED PLATES', desc: '+60 car HP, shrugs off roadblocks', cost: 18000, apply: (u) => { u.armor += 1; } },
  { id: 'nitro', name: 'NITRO KIT', desc: 'Hold SHIFT for a rain-slick boost', cost: 30000, apply: (u) => { u.nitro = true; } },
  { id: 'tires', name: 'RAIN TIRES', desc: 'Wet grip up — less slide, tighter turns', cost: 12000, apply: (u) => { u.tires += 1; } },
];

export const RADIO = [
  { name: 'RAIN FM 88.1', tag: 'CHILLWAVE', bpm: 76 },
  { name: 'NEON 99 99.4', tag: 'DRIVE SYNTH', bpm: 112 },
  { name: 'STATIC 101.7', tag: 'NIGHT DRONE', bpm: 60 },
];

// Story jobs. Each job is one beat of Mara's heist across a single rainy night.
export const JOBS = [
  {
    id: 'vault', title: 'JOB 1 — THE VAULT', pay: 48000, respect: 30, wanted: 2,
    brief: 'Meridian Vault keeps its cash behind one old door. Get inside the marker, hold E, and crack it. Then run.',
    kind: 'crack', pos: { x: 90, z: -52 }, radius: 6, hold: 5,
    done: 'Vault cracked. $48,000 in the bag — MBPD is on its way.',
  },
  {
    id: 'smoke', title: 'JOB 2 — SMOKE & MIRRORS', pay: 12000, respect: 15, wanted: 0,
    brief: 'Two stars and every unit in the bay is hunting you. Lose the heat — get wanted down to zero. Wren can jam their radios (C).',
    kind: 'escape', pos: null, radius: 0, hold: 0,
    done: 'Heat gone. The bay thinks you vanished into the rain.',
  },
  {
    id: 'fence', title: 'JOB 3 — THE FENCE', pay: 30000, respect: 20, wanted: 0,
    brief: 'A buyer waits at the north-east lot with clean bills. Drive the take to him. No police, no questions.',
    kind: 'goto', pos: { x: 150, z: -210 }, radius: 7, hold: 0,
    done: 'Fenced. $30,000 clean. The buyer never saw your face.',
  },
  {
    id: 'blackout', title: 'JOB 4 — BLACKOUT', pay: 20000, respect: 25, wanted: 3,
    brief: 'Wren needs the grid dark for the next move. Reach the substation on foot and hold E to kill the lights.',
    kind: 'crack', pos: { x: 210, z: 150 }, radius: 6, hold: 4,
    done: 'Grid down. Meridian Bay just went dark — thirty seconds of night.',
  },
  {
    id: 'pier', title: 'JOB 5 — PIER 9 MEET', pay: 35000, respect: 25, wanted: 0,
    brief: 'The buyer moved the meet to Pier 9. Walk the boardwalk. Umbrellas up, eyes open.',
    kind: 'goto', pos: { x: -30, z: 326 }, radius: 6, hold: 0, onFoot: true,
    done: 'Deal done at the pier. The rain kept your name off every camera.',
  },
  {
    id: 'cross', title: 'JOB 6 — DOUBLE CROSS', pay: 40000, respect: 35, wanted: 4,
    brief: 'It was a setup. Rival crew on the pier — survive 75 seconds. F to fire, Q to swap weapons.',
    kind: 'survive', pos: { x: -30, z: 326 }, radius: 26, hold: 75,
    done: 'They came for the take and left in the harbour. You kept every dollar.',
  },
  {
    id: 'surge', title: 'JOB 7 — STORM SURGE', pay: 45000, respect: 30, wanted: 0,
    brief: 'The storm surge is coming up the harbour road. Six gates, 150 seconds. Beat the water, beat the clock.',
    kind: 'race', pos: null, radius: 0, hold: 150,
    done: 'Storm beaten. The surge took the road behind you and nothing else.',
  },
  {
    id: 'getaway', title: 'JOB 8 — CLEAN GETAWAY', pay: 60000, respect: 50, wanted: 0,
    brief: 'Last one. Drive to Pier 9, board the boat with E, and vanish. The bay is yours after tonight.',
    kind: 'boat', pos: { x: 30, z: 336 }, radius: 8, hold: 0,
    done: 'CLEAN GETAWAY. Meridian Bay fades behind the rain. Mara Voss is a ghost now.',
  },
];

// Race gates for JOB 7, along the harbour road and back north.
export const RACE_GATES = [
  { x: 0, z: 300 }, { x: -120, z: 300 }, { x: -240, z: 240 },
  { x: -240, z: 60 }, { x: -120, z: -60 }, { x: 0, z: -180 },
];

export const LOCATIONS = {
  vault: { x: 90, z: -90, label: 'MERIDIAN VAULT' },
  garage: { x: -150, z: 30, label: 'NIGHTHAWK GARAGE' },
  safehouse: { x: -90, z: 210, label: 'SAFEHOUSE' },
  substation: { x: 210, z: 150, label: 'SUBSTATION' },
  pier: { x: 0, z: 330, label: 'PIER 9' },
  raceStart: { x: 0, z: -270, label: 'RACE START' },
  fence: { x: 150, z: -210, label: 'BUYER LOT' },
};

export const PD_UNITS = [
  { call: 'UNIT 07', name: 'R. CALLOWAY' },
  { call: 'UNIT 12', name: 'K. OKONKWO' },
  { call: 'UNIT 19', name: 'D. MERCER' },
  { call: 'UNIT 23', name: 'S. IBARRA' },
  { call: 'UNIT 31', name: 'T. VANCE' },
  { call: 'AIR ONE', name: 'HELI CREW' },
];

export const PALETTE = {
  sky: 0x070a16,
  fog: 0x0a0f1e,
  ground: 0x0d1017,
  road: 0x14171f,
  teal: 0x0e6f6a,
  cyan: 0x37e6ff,
  magenta: 0xff2e88,
  amber: 0xffb02e,
  policeRed: 0xff2a3c,
  policeBlue: 0x2a6bff,
  text: '#e8f4ff',
  muted: '#8fa3b8',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const SAVE_KEY = 'neon-harbor.save.v3';
