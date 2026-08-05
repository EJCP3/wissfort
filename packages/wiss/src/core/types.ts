export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export type Position =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

/**
 * Every theme that ships with a `.wiss-theme-*` rule in styles/themes.css.
 * `dark` is the default and lives on `:root`, so it has no class of its own.
 */
export type Theme =
  | 'dark'
  | 'light'
  | 'neon'
  | 'pastel'
  | 'brutal'
  | 'pop'
  | 'shadcn';

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
  /** Dismiss the toast right after `action.onClick` runs. Defaults to `true`. */
  dismissOnAction?: boolean;
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
  /** Dismiss the toast right after `action.onClick` runs. Defaults to `true`. */
  dismissOnAction?: boolean;
  progressBar?: boolean;
  icon?: string | HTMLElement | SVGSVGElement;
  richText?: boolean;
  sound?: boolean | string;
  createdAt?: number | Date;
}

export interface WissConfig {
  position?: Position;
  duration?: number;
  theme?: Theme;
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
  /** Default for `ToastOptions.dismissOnAction`. Defaults to `true`. */
  dismissOnAction?: boolean;
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
