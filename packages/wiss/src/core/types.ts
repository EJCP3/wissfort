export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export type Position =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  message: string | HTMLElement;
  type: ToastType;
  description?: string | HTMLElement;
  duration?: number;
  position?: Position;
  action?: ToastAction;
  progressBar?: boolean;
  icon?: string | HTMLElement | SVGSVGElement;
  richText?: boolean;
  sound?: boolean | string;
  createdAt: number;
}

export interface ToastOptions {
  description?: string | HTMLElement;
  duration?: number;
  position?: Position;
  id?: string;
  action?: ToastAction;
  progressBar?: boolean;
  icon?: string | HTMLElement | SVGSVGElement;
  richText?: boolean;
  sound?: boolean | string;
  createdAt?: number | Date;
}

export interface WissConfig {
  position?: Position;
  duration?: number;
  theme?: string;
  format?: 'wiss' | 'island';
  offset?: number;
  progressBar?: boolean;
  maxToasts?: number;
  enableHistory?: boolean;
  maxHistory?: number;
  replaceBehavior?: 'normal' | 'wiss';
  fontFamily?: string;
  richText?: boolean;
  sound?: boolean;
}

export interface PromiseToastOptions<T = any> {
  loading: string | HTMLElement;
  success: string | HTMLElement | ((data: T) => string | HTMLElement);
  error: string | HTMLElement | ((err: any) => string | HTMLElement);
  duration?: number;
  position?: Position;
  id?: string;
}

export type Listener = (toasts: Toast[]) => void;
export type HistoryListener = (history: Toast[]) => void;
