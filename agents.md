# Wissfort AI Agent Instructions

Wissfort is an opinionated, highly aesthetic toast notification library for the web.
It features SVG morphing, spring physics, and built-in interactive sounds via Web Audio.
Import it, call `toast.success()`, and you're done. No external CSS files needed.

This page is the complete guide for AI agents adding wissfort to a vanilla project.

- npm: https://www.npmjs.com/package/wissfort
- repo: https://github.com/EJCP3/wiss

## Quickstart

Install with any package manager:

```sh
npm install wissfort
# or: yarn add wissfort · pnpm add wissfort · bun add wissfort
```

Then wire it up in your app entry point:

```ts
import { toaster } from "wissfort/vanilla"; // Use wissfort/vanilla for non-framework setup
import { toast } from "wissfort";

// 1. Configure globals (Optional)
toaster({
  position: 'bottom-right',
  theme: 'dark', // 'light', 'dark', 'neon', 'pastel', 'brutal', 'pop', 'shadcn'
  format: 'wiss', // 'wiss', 'island'
});

// 2. Trigger notifications from anywhere
toast.success('User updated successfully');
```

Wissfort is **ESM-only** and targets modern browsers. CSS is injected automatically.

## API (complete)

### 1. Global Setup: `toaster(config)`

Call `toaster()` once to set global defaults.

```ts
import { toaster } from "wissfort/vanilla";

toaster({
  theme: 'neon',         // Visual theme
  format: 'island',      // Design format ('wiss' for borders, 'island' for dynamic pill)
  position: 'top-center',// 'top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'
  duration: 4000,        // Auto-dismiss in ms
  maxToasts: 5,          // Max visible on screen
  replaceBehavior: 'wiss', // 'normal' (stack) or 'wiss' (visually replace oldest)
  sound: true            // Enable/disable cuelume sounds globally
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
const history = toast.history(); // Get array of previous toasts
toast.clear();        // Dismiss every visible toast right now
toast.clearHistory(); // Empty the stored history (does not touch what is on screen)
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

- Use `format: 'wiss'` for a classic, defined-border look, and `format: 'island'` for a sleek, integrated pill shape.
- Use `theme: 'shadcn'` if the project already uses shadcn/ui — the toasts inherit its colour variables instead of fighting them.
- Only show toasts for **outcomes the user caused** (saves, deletes, errors). Avoid spamming the user with background system events.
- Let the component handle its own styling; avoid overriding internal CSS classes.
