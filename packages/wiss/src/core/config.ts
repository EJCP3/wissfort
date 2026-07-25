import type { Position, WissConfig } from './types';

export interface ResolvedConfig {
  position: Position;
  duration: number;
  theme: string;
  format: 'wiss' | 'island';
  offset: number;
  progressBar: boolean;
  maxToasts: number;
  enableHistory: boolean;
  maxHistory: number;
  replaceBehavior: 'normal' | 'wiss';
  fontFamily?: string;
  richText: boolean;
  sound: boolean;
}

const defaultConfig: ResolvedConfig = {
  position: 'bottom-right',
  duration: 4000,
  theme: 'dark',
  format: 'wiss',
  offset: 16,
  progressBar: false,
  maxToasts: 5,
  enableHistory: true,
  maxHistory: 20,
  replaceBehavior: 'normal',
  richText: false,
  sound: true,
};

let config: ResolvedConfig = { ...defaultConfig };

export function getConfig(): ResolvedConfig {
  return config;
}

export function setConfig(next: WissConfig): void {
  config = {
    position: next.position ?? config.position,
    duration: next.duration ?? config.duration,
    theme: next.theme ?? config.theme,
    format: next.format ?? config.format,
    offset: next.offset ?? config.offset,
    progressBar: next.progressBar ?? config.progressBar,
    maxToasts: next.maxToasts ?? config.maxToasts,
    enableHistory: next.enableHistory ?? config.enableHistory,
    maxHistory: next.maxHistory ?? config.maxHistory,
    replaceBehavior: next.replaceBehavior ?? config.replaceBehavior,
    richText: next.richText ?? config.richText,
    sound: next.sound ?? config.sound,
  };
  
  const resolvedFont = next.fontFamily ?? config.fontFamily;
  if (resolvedFont !== undefined) {
    config.fontFamily = resolvedFont;
  }
}
