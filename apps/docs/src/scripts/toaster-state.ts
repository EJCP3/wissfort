import type { Theme } from 'wissfort';

/**
 * The toaster settings the demo chrome lets you flip.
 *
 * These used to be `let` bindings inside the navbar's `astro:page-load`
 * handler, so a language switch reset them to their defaults while the
 * library kept the values you had picked — the format button would read
 * "wiss" while the toaster was still rendering islands.
 *
 * Module scope survives navigation (the module is evaluated once), so this
 * stays the single source of truth for both the navbar and the landing
 * script that re-applies the config on every page load.
 */
export const docsToasterState: { format: 'wiss' | 'island'; theme: Theme } = {
  format: 'wiss',
  theme: 'dark',
};

export const FORMAT_FONTS: Record<'wiss' | 'island', string> = {
  wiss: '"IBM Plex Mono", monospace',
  island: '"IBM Plex Sans", sans-serif',
};
