import { spawn } from 'node:child_process';
import { unwatchFile, watchFile } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const csvPath = path.join(projectDir, 'Buzzing with Kvizzing Shortlist.csv');
const generatorPath = path.join(projectDir, 'scripts', 'generate-default-quiz.mjs');
const nextPath = path.join(projectDir, 'node_modules', 'next', 'dist', 'bin', 'next');

function runNode(script, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { cwd: projectDir, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`${path.basename(script)} exited with ${code}`)));
  });
}

await runNode(generatorPath);

let generateTimer;
let generation = Promise.resolve();
const csvWatcher = (_current, previous) => {
  if (_current.mtimeMs === previous.mtimeMs && _current.size === previous.size) return;
  clearTimeout(generateTimer);
  generateTimer = setTimeout(() => {
    generation = generation
      .then(() => runNode(generatorPath))
      .catch((error) => console.error(`Could not sync the built-in quiz: ${error.message}`));
  }, 350);
};
watchFile(csvPath, { interval: 750 }, csvWatcher);

const next = spawn(process.execPath, [nextPath, 'dev', ...process.argv.slice(2)], {
  cwd: projectDir,
  stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => next.kill(signal));
}

next.once('exit', (code, signal) => {
  clearTimeout(generateTimer);
  unwatchFile(csvPath, csvWatcher);
  process.exit(signal ? 1 : (code ?? 1));
});
