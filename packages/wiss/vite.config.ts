import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import dts from 'vite-plugin-dts';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

// The `wissfort/styles.css` export used to point at a file the build never
// produced, because the CSS-injection plugin consumes every stylesheet asset.
// This emits one concatenated copy for consumers who'd rather <link> the CSS
// than have it injected by JS (SSR, strict CSP without 'unsafe-inline').
const STANDALONE_CSS = 'styles.css';

const assetFileNames = (assetInfo: { name?: string }) => {
  if (assetInfo.name === 'style.css') return STANDALONE_CSS;
  return assetInfo.name || STANDALONE_CSS;
};

function emitStandaloneCss(): Plugin {
  return {
    name: 'wiss:emit-standalone-css',
    generateBundle(_options, bundle) {
      const css = Object.values(bundle)
        .filter(
          (asset): asset is Extract<typeof asset, { type: 'asset' }> =>
            asset.type === 'asset' &&
            asset.fileName.endsWith('.css') &&
            asset.fileName !== STANDALONE_CSS,
        )
        // themes.css declares the custom properties the other sheets read,
        // so it has to come first.
        .sort((a, b) => Number(b.fileName.includes('themes')) - Number(a.fileName.includes('themes')))
        .map((asset) => String(asset.source))
        .join('\n')
        // Vite tags each CSS asset with a `/*$vite$:n*/` bookkeeping marker;
        // no reason to publish it.
        .replace(/\/\*\$vite\$:\d+\*\//g, '')
        .trim();

      if (!css) return;
      if (bundle[STANDALONE_CSS]) return; // already emitted by the other format
      this.emitFile({ type: 'asset', fileName: STANDALONE_CSS, source: css });
    },
  };
}

export default defineConfig({
  plugins: [
    dts({
      tsconfigPath: resolve(rootDir, 'tsconfig.json'),
      entryRoot: 'src',
    }),
    emitStandaloneCss(),
    cssInjectedByJsPlugin({
      // Each chunk injects the CSS it actually imports, instead of only the
      // `vanilla` chunk carrying everything. Before this, `wissfort/island`
      // shipped with `/* empty css */` and no styles at all.
      relativeCSSInjection: true,
      // Leave our concatenated copy alone — it's the `wissfort/styles.css`
      // export, meant to be <link>ed, not injected.
      cssAssetsFilterFunction: (asset) => asset.fileName !== STANDALONE_CSS,
    }),
  ],
  build: {
    sourcemap: true,
    emptyOutDir: true,
    lib: {
      entry: {
        core: resolve(rootDir, 'src/core/index.ts'),
        vanilla: resolve(rootDir, 'src/vanilla/index.ts'),
        island: resolve(rootDir, 'src/styles/island.ts'),
        react: resolve(rootDir, 'src/react/index.tsx'),
        vue: resolve(rootDir, 'src/vue/index.ts'),
        svelte: resolve(rootDir, 'src/svelte/index.ts'),
      },
      // Must stay explicit: with `formats` omitted Vite defaults to
      // ['es', 'umd'] and merges the single `output` config into both, so
      // the umd pass overwrites the ESM files with the same entryFileNames.
      formats: ['es'],
    },
    rollupOptions: {
      // Match subpaths, not just bare names. Listing 'svelte' and
      // 'svelte/internal' as plain strings missed `svelte/store` — which the
      // Svelte wrapper actually imports — so Svelte 5's store runtime got
      // bundled into the published dist under a pnpm path. Same trap for
      // cuelume, a declared dependency that was being shipped twice.
      external: [
        'tailwindcss',
        'daisyui',
        /^react($|\/)/,
        /^react-dom($|\/)/,
        /^vue($|\/)/,
        /^svelte($|\/)/,
        /^cuelume($|\/)/,
      ],
      // ESM only, deliberately. There used to be a parallel CommonJS output,
      // but it could never load: the package is "type": "module", so Node
      // reads every .js as ESM and the `<name>.cjs.js` files died with
      // "exports is not defined in ES module scope". Fixing the extension
      // wasn't enough either — cuelume, the only runtime dependency, is
      // ESM-only and exposes no `require` condition, so a correct CJS build
      // is impossible without vendoring it. The docs already say ESM-only.
      output: {
        format: 'es',
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].es.js',
        chunkFileNames: '[name].es.js',
        assetFileNames,
      },
    },
  },
});
