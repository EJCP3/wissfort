# Wissfort Vue AI Agent Instructions

Wissfort is an opinionated, highly aesthetic toast notification library for the web.
It features SVG morphing, spring physics, and built-in interactive sounds via Web Audio.
Import it, call `toast.success()`, and you're done. No external CSS files needed.

This page is the complete guide for AI agents adding wissfort to a Vue project.

- npm: https://www.npmjs.com/package/wissfort
- repo: https://github.com/euddy/wissfort

## Quickstart

Install with any package manager:

```sh
npm install wissfort
# or: yarn add wissfort · pnpm add wissfort · bun add wissfort
```

Then wire it up in your root component (`App.vue`):

```vue
<script setup>
import { Toaster } from "wissfort/vue";
import { toast } from "wissfort";
</script>

<template>
  <Toaster 
    position="bottom-right" 
    theme="dark" <!-- 'light', 'dark', 'glass', 'neon', 'pastel', 'brutal', 'pop' -->
    format="wiss" <!-- 'wiss', 'island' -->
  />
  <button @click="toast.success('Saved successfully')">Save</button>
</template>
```

Wissfort is **ESM-only** and targets modern browsers. CSS is injected automatically.

## API (complete)

### 1. Global Setup: `<Toaster />`

Render `<Toaster />` once. It accepts global defaults as props:

```vue
<Toaster 
  theme="glass"        
  format="island"      
  position="top-center"
  :duration="4000"      
  :maxToasts="5"        
  replaceBehavior="wiss" 
  :sound="true"         
/>
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
  }
});

// Promises
toast.promise(fetch('/api/data'), {
  loading: 'Fetching data...',
  success: 'Data loaded!',
  error: 'Error loading data'
});

// History & Lifecycle
toast.clearHistory(); // Remove all toasts immediately
```

### 3. Composables: `useToastHistory`
Read the toast state reactively in your components.
```vue
<script setup>
import { useToastHistory } from 'wissfort/vue';

const history = useToastHistory();
</script>

<template>
  <div>{{ history.length }} toasts shown.</div>
</template>
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
- Use `theme="glass"` alongside `format="island"` on visually noisy backgrounds for a stunning frosted glass effect.
- Only show toasts for **outcomes the user caused** (saves, deletes, errors). Avoid spamming the user with background system events.
- Let the component handle its own styling; avoid overriding internal CSS classes.
