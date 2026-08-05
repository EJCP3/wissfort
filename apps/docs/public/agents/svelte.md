# Wissfort Svelte AI Agent Instructions

Wissfort is an opinionated, highly aesthetic toast notification library for the web.
It features SVG morphing, spring physics, and built-in interactive sounds via Web Audio.
Import it, call `toast.success()`, and you're done. No external CSS files needed.

This page is the complete guide for AI agents adding wissfort to a Svelte project.

- npm: https://www.npmjs.com/package/wissfort
- repo: https://github.com/EJCP3/wiss

## Quickstart

Install with any package manager:

```sh
npm install wissfort
# or: yarn add wissfort · pnpm add wissfort · bun add wissfort
```

Then wire it up in your root component (`+layout.svelte` or `App.svelte`):

There is no `<Toaster />` component for Svelte — the package can't ship a
compiled `.svelte` file, so you call `toaster(config)` once instead.

```svelte
<script>
  import { toaster } from "wissfort/svelte";
  import { toast } from "wissfort";

  // theme: 'dark' | 'light' | 'neon' | 'pastel' | 'brutal' | 'pop' | 'shadcn'
  // format: 'wiss' | 'island'
  // Svelte 5: use $effect(() => toaster({ ... })) instead of onMount.
  $effect(() => toaster({ position: 'bottom-right', theme: 'dark', format: 'wiss' }));
</script>

<button onclick={() => toast.success('Saved successfully')}>Save</button>
```

Wissfort is **ESM-only** and targets modern browsers. CSS is injected automatically.

## API (complete)

### 1. Global Setup: `toaster(config)`

Call `toaster()` once. Every key of `WissConfig` is optional; leave one off
and the library default applies.

```ts
import { toaster } from "wissfort/svelte";

toaster({
  theme: 'neon',
  format: 'island',
  position: 'top-center',
  duration: 4000,
  offset: 16,
  maxToasts: 5,
  replaceBehavior: 'wiss',
  progressBar: false,
  sound: true,
  richText: false,
  dismissOnAction: true,
  enableHistory: true,
  maxHistory: 20,
  fontFamily: 'Inter, sans-serif',
});
```

### 2. Notifications: `toast`

```ts
import { toast } from "wissfort";

// Basic types (automatically pick good defaults and icons)
toast.success('Payment received');
toast.error('Connection lost');
toast.warning('Session expiring');
toast.info('New update available');

// Advanced: with description, custom icon, action button, and specific sound
toast.show('File deleted', {
  description: 'The file has been permanently removed.',
  icon: '🗑️', // string, HTML string, or SVG
  sound: 'droplet', // from cuelume's 14-sound palette
  action: {
    label: 'Undo',
    onClick: () => toast.success('Restored!')
  },
  // The toast closes itself once the action runs. Pass false to keep it up
  // (e.g. an action that starts something you'll report on with toast.update).
  dismissOnAction: true
});

// Promises
toast.promise(fetch('/api/data'), {
  loading: 'Fetching data...',
  success: 'Data loaded!',
  error: 'Error loading data'
});

// History & Lifecycle
toast.clear();        // Dismiss every visible toast right now
toast.clearHistory(); // Empty the stored history (does not touch what is on screen)
```

### 3. State: `toastHistory`
Read the toast state reactively in your components. `toastHistory` is a
readable Svelte store — import it directly, don't call it.
```svelte
<script>
  import { toastHistory } from 'wissfort/svelte';
</script>

<div>{$toastHistory.length} toasts shown.</div>
```

## Sound Integration (Powered by Cuelume)

Wissfort deeply integrates `cuelume` for extremely lightweight, synthesized audio feedback.
Sounds play automatically for different toast types (`success` plays the "success" chime, etc).

To customize or disable a sound for a single toast:
```ts
toast.success('Saved', { sound: 'sparkle' });
toast.info('Silent message', { sound: false });
```

Available sounds (pick semantically): `chime`, `sparkle`, `droplet`, `bloom`, `whisper`, `tick`, `press`, `release`, `toggle`, `success`, `error`, `page`, `loading`, `ready`.

## Guidance for good design

- Use `format="wiss"` for a classic, defined-border look, and `format="island"` for a sleek, integrated pill shape.
- Use `theme="shadcn"` if the project already uses shadcn/ui — the toasts inherit its colour variables instead of fighting them.
- Only show toasts for **outcomes the user caused** (saves, deletes, errors). Avoid spamming the user with background system events.
- Let the component handle its own styling; avoid overriding internal CSS classes.
