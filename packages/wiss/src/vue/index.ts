import {
  defineComponent,
  onMounted,
  onUnmounted,
  watch,
  ref,
  type PropType,
  type Ref,
} from 'vue';
import { toaster } from '../vanilla';
import { subscribeHistory } from '../core';
import type { Position, Theme, WissConfig, Toast } from '../core/types';

/**
 * Vue wrapper for the wissfort toast system.
 *
 * Register it once at the root of your app. It renders nothing at all —
 * it just boots the toaster container and keeps it in sync with the
 * props you pass.
 *
 * SSR-safe: `setup` returns `null`, which Vue renders as a comment
 * placeholder that hydrates cleanly. (Returning `h('template')` emits a
 * real `<template>` element on the server and blows up hydration with
 * "Failed to execute 'replaceChild' on 'Node'".)
 *
 * ```vue
 * <script setup>
 * import { Toaster } from 'wissfort/vue';
 * import { toast } from 'wissfort';
 * </script>
 *
 * <template>
 *   <Toaster position="bottom-right" theme="dark" />
 *   <button @click="toast.success('¡Hecho!')">Notify</button>
 * </template>
 * ```
 */
export const Toaster = defineComponent({
  name: 'Toaster',
  props: {
    position: {
      type: String as PropType<Position>,
      default: undefined,
    },
    duration: {
      type: Number,
      default: undefined,
    },
    theme: {
      type: String as PropType<Theme>,
      default: undefined,
    },
    format: {
      type: String as PropType<'wiss' | 'island'>,
      default: undefined,
    },
    offset: {
      type: Number,
      default: undefined,
    },
    progressBar: {
      type: Boolean,
      default: undefined,
    },
    maxToasts: {
      type: Number,
      default: undefined,
    },
    enableHistory: {
      type: Boolean,
      default: undefined,
    },
    maxHistory: {
      type: Number,
      default: undefined,
    },
    replaceBehavior: {
      type: String as PropType<'normal' | 'wiss'>,
      default: undefined,
    },
    fontFamily: {
      type: String,
      default: undefined,
    },
    richText: {
      type: Boolean,
      default: undefined,
    },
    sound: {
      type: Boolean,
      default: undefined,
    },
    dismissOnAction: {
      type: Boolean,
      default: undefined,
    },
  },
  setup(props) {
    function buildConfig(): WissConfig {
      const cfg: WissConfig = {};
      if (props.position !== undefined) cfg.position = props.position;
      if (props.duration !== undefined) cfg.duration = props.duration;
      if (props.theme !== undefined) cfg.theme = props.theme;
      if (props.format !== undefined) cfg.format = props.format;
      if (props.offset !== undefined) cfg.offset = props.offset;
      if (props.progressBar !== undefined) cfg.progressBar = props.progressBar;
      if (props.maxToasts !== undefined) cfg.maxToasts = props.maxToasts;
      if (props.enableHistory !== undefined) cfg.enableHistory = props.enableHistory;
      if (props.maxHistory !== undefined) cfg.maxHistory = props.maxHistory;
      if (props.replaceBehavior !== undefined) cfg.replaceBehavior = props.replaceBehavior;
      if (props.fontFamily !== undefined) cfg.fontFamily = props.fontFamily;
      if (props.richText !== undefined) cfg.richText = props.richText;
      if (props.sound !== undefined) cfg.sound = props.sound;
      if (props.dismissOnAction !== undefined) cfg.dismissOnAction = props.dismissOnAction;
      return cfg;
    }

    onMounted(() => {
      toaster(buildConfig());
    });

    watch(
      () => ({ ...props }),
      () => {
        toaster(buildConfig());
      },
      { deep: true },
    );

    // Renderless component — no DOM of its own. The toaster container is
    // created in onMounted and lives on document.body.
    return () => null;
  },
});

export function useToastHistory(): Ref<Toast[]> {
  const history = ref<Toast[]>([]);
  let unsubscribe: (() => void) | undefined;

  onMounted(() => {
    unsubscribe = subscribeHistory((newHistory: Toast[]) => {
      history.value = newHistory;
    });
  });

  onUnmounted(() => {
    if (unsubscribe) unsubscribe();
  });

  return history;
}

export type { Position, Theme, WissConfig } from '../core/types';
