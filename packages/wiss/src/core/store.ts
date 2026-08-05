import { getConfig } from './config';
import type { HistoryListener, Listener, Toast, ToastOptions, ToastType } from './types';

let toasts: Toast[] = [];
let listeners: Listener[] = [];
let historyToasts: Toast[] = [];
let historyListeners: HistoryListener[] = [];

export function subscribe(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function notify(): void {
  const snapshot = [...toasts];
  listeners.forEach((listener) => listener(snapshot));
}

export function subscribeHistory(listener: HistoryListener): () => void {
  historyListeners.push(listener);
  listener([...historyToasts]); // initial state
  return () => {
    historyListeners = historyListeners.filter((l) => l !== listener);
  };
}

export function notifyHistory(): void {
  const snapshot = [...historyToasts];
  historyListeners.forEach((listener) => listener(snapshot));
}

function addToHistory(toast: Toast, config: { maxHistory: number, enableHistory: boolean }) {
  if (!config.enableHistory || config.maxHistory <= 0) return;
  
  // Prevent duplicate insertion in case it's manually dismissed
  if (historyToasts.some(t => t.id === toast.id)) return;
  
  historyToasts = [toast, ...historyToasts];
  if (historyToasts.length > config.maxHistory) {
    historyToasts = historyToasts.slice(0, config.maxHistory);
  }
  notifyHistory();
}

let idCounter = 0;

/**
 * Toast ids are DOM reconciliation keys, not secrets — uniqueness within the
 * page is all they need. `crypto.randomUUID` is unavailable in insecure
 * contexts (plain http, e.g. testing from a phone on the LAN) and in Safari
 * below 15.4, where it used to throw on every single toast.
 */
function createId(): string {
  const c: Crypto | undefined = globalThis.crypto;
  if (typeof c?.randomUUID === 'function') {
    return c.randomUUID();
  }
  idCounter += 1;
  return `wiss-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

export function addToast(message: string | HTMLElement, type: ToastType, options: ToastOptions = {}): string {
  const id = options.id ?? createId();

  const toast: Toast = {
    id,
    message,
    type,
    createdAt: options.createdAt ? (typeof options.createdAt === 'number' ? options.createdAt : options.createdAt.getTime()) : Date.now(),
    ...(options.description !== undefined ? { description: options.description } : {}),
    ...(options.duration !== undefined ? { duration: options.duration } : {}),
    ...(options.position !== undefined ? { position: options.position } : {}),
    ...(options.action !== undefined ? { action: options.action } : {}),
    ...(options.dismissOnAction !== undefined ? { dismissOnAction: options.dismissOnAction } : {}),
    ...(options.progressBar !== undefined ? { progressBar: options.progressBar } : {}),
    ...(options.icon !== undefined ? { icon: options.icon } : {}),
    ...(options.richText !== undefined ? { richText: options.richText } : {}),
    ...(options.sound !== undefined ? { sound: options.sound } : {}),
  };

  const existingIndex = toasts.findIndex((t) => t.id === id);
  if (existingIndex !== -1) {
    toasts = [
      ...toasts.slice(0, existingIndex),
      toast,
      ...toasts.slice(existingIndex + 1),
    ];
  } else {
    toasts = [...toasts, toast];
  }

  const config = getConfig();
  if (toasts.length > config.maxToasts) {
    // Los toasts que se caen por maxToasts van al historial
    const dropped = toasts.slice(0, toasts.length - config.maxToasts);
    toasts = toasts.slice(toasts.length - config.maxToasts);
    dropped.forEach(t => addToHistory(t, config));
  }

  notify();
  return id;
}

export function getToast(id: string): Toast | undefined {
  return toasts.find((t) => t.id === id);
}

export function removeToast(id: string): void {
  const toastToRemove = toasts.find((t) => t.id === id);
  toasts = toasts.filter((t) => t.id !== id);
  if (toastToRemove) {
    addToHistory(toastToRemove, getConfig());
  }
  notify();
}

export function clearToasts(): void {
  const config = getConfig();
  toasts.forEach(t => addToHistory(t, config));
  toasts = [];
  notify();
}

export function clearHistory(): void {
  historyToasts = [];
  notifyHistory();
}

export function getHistory(): Toast[] {
  return [...historyToasts];
}
