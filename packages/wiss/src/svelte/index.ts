import { toaster as vanillaToaster, destroyToaster } from '../vanilla';
import { subscribeHistory } from '../core';
import type { Position, WissConfig, Toast } from '../core/types';
import { readable } from 'svelte/store';

/**
 * Svelte wrapper for the wissfort toast system.
 *
 * Since we can't ship a `.svelte` component from a pure Vite library
 * build (that would require the Svelte compiler plugin), we export a
 * simple `toaster` action/function that the consumer calls from
 * their own component's `onMount`.
 *
 * ### Usage (Svelte 3/4)
 * ```svelte
 * <script>
 *   import { onMount } from 'svelte';
 *   import { toaster } from 'wissfort/svelte';
 *   import { toast } from 'wissfort';
 *
 *   onMount(() => toaster({ position: 'bottom-right', theme: 'dark' }));
 * </script>
 *
 * <button on:click={() => toast.success('¡Hecho!')}>Notify</button>
 * ```
 *
 * ### Usage (Svelte 5)
 * ```svelte
 * <script>
 *   import { toaster } from 'wissfort/svelte';
 *   import { toast } from 'wissfort';
 *
 *   $effect(() => toaster({ position: 'bottom-right', theme: 'dark' }));
 * </script>
 *
 * <button onclick={() => toast.success('¡Hecho!')}>Notify</button>
 * ```
 */
export function toaster(config?: WissConfig): void {
  vanillaToaster(config);
}

export { destroyToaster };

export const toastHistory = readable<Toast[]>([], (set) => {
  return subscribeHistory(set);
});

export type { WissConfig, Position, Theme } from '../core/types';
