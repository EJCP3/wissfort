import { setupDom, sleep, check, done } from './dom-harness.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
// Resolve like a consumer would: from the package root, not from test/.
const require_ = createRequire(new URL('../package.json', import.meta.url));

// --- #9 every exported path must actually exist -----------------------------
for (const [sub, entry] of Object.entries(pkg.exports)) {
  const targets = typeof entry === 'string' ? [entry] : Object.values(entry);
  for (const t of targets) {
    check(`export ${sub} -> ${t}`, existsSync(t), true);
  }
}

// --- #12 "types" must be the first condition --------------------------------
for (const [sub, entry] of Object.entries(pkg.exports)) {
  if (typeof entry === 'string') continue;
  check(`export ${sub}: "types" listed first`, Object.keys(entry)[0], 'types');
}

// --- #10 nothing third-party may be baked into dist -------------------------
check('dist carries no vendored node_modules', existsSync('dist/node_modules'), false);
const svelteEntry = readFileSync('dist/svelte.es.js', 'utf8');
check('svelte wrapper imports the host svelte', /from "svelte\/store"/.test(svelteEntry), true);
check('svelte wrapper has no pnpm path', /\.pnpm/.test(svelteEntry), false);

// --- #9 the standalone stylesheet is complete and clean ---------------------
const css = readFileSync('dist/styles.css', 'utf8');
check('styles.css has theme variables', css.includes('--wiss-bg'), true);
check('styles.css has wiss format rules', css.includes('[data-wiss-toast]'), true);
check('styles.css has island format rules', css.includes('.wiss-island'), true);
check('styles.css has no vite markers', /\$vite\$/.test(css), false);

// --- #11 the island entry must ship its own styles --------------------------
const island = readFileSync('dist/island.es.js', 'utf8');
check('island entry injects its CSS', island.includes('createElement("style")'), true);
check('island entry contains island rules', island.includes('.wiss-island'), true);

// --- the package is ESM-only, and must not claim otherwise -------------------
// "type": "module" makes Node read every .js as ESM, so a `require` condition
// pointing at a .js file is unloadable. cuelume is ESM-only too, so no correct
// CJS build is possible. Assert we ship no CJS surface at all.
for (const [sub, entry] of Object.entries(pkg.exports)) {
  if (typeof entry === 'string') continue;
  check(`export ${sub}: no require condition`, 'require' in entry, false);
}
check('no "main" field (would imply CJS)', 'main' in pkg, false);
check('dist has no .cjs files', existsSync('dist/core.cjs'), false);

setupDom();

// --- ESM: all CSS reaches the document via the main entry -------------------
const { toaster } = await import('../dist/vanilla.es.js');
toaster({ sound: false });
await sleep(20);
const injected = [...document.querySelectorAll('style')].map((s) => s.textContent).join('');
check('runtime CSS: themes present', injected.includes('--wiss-bg'), true);
check('runtime CSS: wiss format present', injected.includes('[data-wiss-toast]'), true);
check('runtime CSS: island format present', injected.includes('.wiss-island'), true);

done();
