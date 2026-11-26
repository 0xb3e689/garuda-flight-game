// Garuda — Archipelago Flight & Rescue Sim hand-in program (Node 22, stdlib only).
// Copies the offline browser game (game/) and browser-captured screenshots (screenshots/)
// into /output (or MAKEFUN_OUTPUT_DIR locally) and emits /output/dossier.json deterministically.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const DOSSIER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
} as const;

function packageGarudaEntry(): void {
  const repoRoot = fileURLToPath(new URL('.', import.meta.url));
  const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  const gameSource = join(repoRoot, 'game');
  const shotsSource = join(repoRoot, 'screenshots');

  mkdirSync(outputDir, { recursive: true });
  cpSync(gameSource, join(outputDir, 'game'), { recursive: true });

  const shotsDest = join(outputDir, 'screenshots');
  mkdirSync(shotsDest, { recursive: true });
  if (existsSync(shotsSource)) {
    cpSync(shotsSource, shotsDest, { recursive: true });
  }

  const dossierJson = buildDossier(outputDir, DOSSIER_LIMITS);
  writeFileSync(join(outputDir, 'dossier.json'), dossierJson);
}

packageGarudaEntry();
