import { execSync } from 'child_process';
import { copyFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const state = 'anvil-state.json';
const tmpState = 'anvil-state.tmp.json';

const statePath = path.resolve(__dirname, 'state', state);
const tmpStatePath = path.resolve(__dirname, 'state', tmpState);

copyFileSync(statePath, tmpStatePath);

const runCmd = `anvil --state ${tmpStatePath} --block-time 3`;

execSync(runCmd, { stdio: 'inherit' });
