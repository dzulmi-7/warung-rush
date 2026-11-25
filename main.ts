// Dapur Kilat's hand-in program (Node 22, standard library only): copies the game and the
// screenshots beside this file into /output and writes /output/dossier.json with the vendored
// make.fun library. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// make.fun collects /output as a different user than the one this program runs as, so a file
// that only its writer may read fails the gate as "not readable". Walk the whole tree and hand
// every directory 0755 and every file 0644, whatever the process umask or the copied modes were.
function openPermissions(path: string): void {
  chmodSync(path, statSync(path).isDirectory() ? 0o755 : 0o644);
  if (statSync(path).isDirectory()) {
    for (const child of readdirSync(path)) openPermissions(join(path, child));
  }
}
openPermissions(out);

// The scorer's caps (reference/gate.json): only text_max_bytes shapes the dossier bytes; the rest
// refuse an entry the scorer would refuse anyway (screenshot count and size, game file and byte
// caps, path length).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
  { mode: 0o644 },
);
chmodSync(join(out, 'dossier.json'), 0o644);
chmodSync(out, 0o755);
