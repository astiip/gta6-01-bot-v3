// NEON HARBOR: RAIN HEIST — entry point for make.fun gta6-01.
//
// The game itself lives next to this file: game/ is a folder of plain
// static files (game/index.html plus its scripts, styles and vendored
// libraries) that a desktop browser opens offline, no network needed.
// Mara Voss runs the NIGHTHAWK through rainy Meridian Bay at night —
// teal paint, cyan underglow, MBPD patrols on her tail — across eight
// heist jobs, from THE VAULT to the CLEAN GETAWAY.
//
// What this program does, start to finish:
//   1. checks the hand-in is whole (game/ present with its index.html,
//      screenshots/ holding 3 or 4 JPEG/PNG frames, each within the
//      scorer's 256 KiB cap),
//   2. copies game/ and screenshots/ beside this file into the output
//      directory (MAKEFUN_OUTPUT_DIR, or /output inside the grader),
//   3. writes dossier.json there through the vendored make.fun
//      library, using the same caps the scorer's gate.json sets, so
//      the program refuses exactly where the scorer would refuse,
//   4. prints one summary line so a human watching the run can see
//      what went in.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the game for a look with `node serve.ts`, then open
// http://localhost:8080. Node 22, standard library only, no build
// step and no install.

import { cpSync, existsSync, readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// --- the hand-in's own limits, mirroring the scorer's gate -----------

// How many screenshots the entry may carry, and the most bytes one
// of them may hold (the scorer's gate.json caps, in the same units).
const SHOT_LIMIT = 4;
const SHOT_MIN = 3;
const SHOT_MAX_BYTES = 256 * 1024;

// The caps buildDossier is given, copied from the scorer's gate so
// this program fails on the same inputs the scorer would fail on.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: SHOT_LIMIT, max_bytes: SHOT_MAX_BYTES },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
};

// --- small helpers ----------------------------------------------------

// Die with a plain message and a non-zero exit; nothing is handed in
// half-built.
function fail(message: string): never {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

// Every file under a directory, recursively, as paths relative to it.
function walkFiles(dir: string, base = ''): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(join(dir, base), { withFileTypes: true })) {
    const rel = base === '' ? entry.name : `${base}/${entry.name}`;
    if (entry.isDirectory()) found.push(...walkFiles(dir, rel));
    else if (entry.isFile()) found.push(rel);
  }
  return found;
}

// Whether a buffer starts with a JPEG or a PNG signature.
function looksLikePhoto(bytes: Buffer): boolean {
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png =
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  return jpeg || png;
}

// --- 1. check the hand-in before anything is copied -------------------

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

if (!existsSync(gameDir) || !statSync(gameDir).isDirectory()) {
  fail('game/ is missing: the entry needs its playable game folder beside main.ts.');
}
if (!existsSync(join(gameDir, 'index.html'))) {
  fail('game/index.html is missing: the game folder needs its page at its root.');
}
const gameFiles = walkFiles(gameDir);
if (gameFiles.length === 0) {
  fail('game/ is empty: nothing to hand in.');
}

if (!existsSync(shotsDir) || !statSync(shotsDir).isDirectory()) {
  fail('screenshots/ is missing: the entry needs 3 or 4 frames of the game beside main.ts.');
}
const shotNames = readdirSync(shotsDir)
  .filter((name) => ['.jpg', '.jpeg', '.png'].includes(extname(name).toLowerCase()))
  .sort();
if (shotNames.length < SHOT_MIN || shotNames.length > SHOT_LIMIT) {
  fail(`screenshots/ holds ${shotNames.length} images, but the entry needs ${SHOT_MIN} to ${SHOT_LIMIT} (the first by name is the cover).`);
}
let shotBytes = 0;
for (const name of shotNames) {
  const bytes = readFileSync(join(shotsDir, name));
  if (!looksLikePhoto(bytes)) {
    fail(`screenshots/${name} is neither JPEG nor PNG: only photos of the game go in screenshots/.`);
  }
  if (bytes.length > SHOT_MAX_BYTES) {
    fail(`screenshots/${name} is ${bytes.length} bytes, over the ${SHOT_MAX_BYTES} bytes a screenshot may be.`);
  }
  shotBytes += bytes.length;
}

// --- 2. copy the game and its frames into the output directory -------

mkdirSync(outDir, { recursive: true });
cpSync(gameDir, join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

// --- 3. write the dossier the judge reads ----------------------------

const dossierPath = join(outDir, 'dossier.json');
try {
  writeFileSync(dossierPath, buildDossier(outDir, DOSSIER_CAPS));
} catch (err) {
  fail(`dossier.json could not be written: ${(err as Error).message}`);
}
const dossierBytes = statSync(dossierPath).size;
try {
  JSON.parse(readFileSync(dossierPath, 'utf8'));
} catch {
  fail('dossier.json is not valid JSON after writing it.');
}

// --- 4. one line saying what went in ---------------------------------

console.log(
  `NEON HARBOR: RAIN HEIST — handed in ${gameFiles.length} game files, ` +
  `${shotNames.length} screenshots (${shotBytes} bytes, cover ${shotNames[0]}), ` +
  `dossier.json ${dossierBytes} bytes -> ${outDir}`,
);
