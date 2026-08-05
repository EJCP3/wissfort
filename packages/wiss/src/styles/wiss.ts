import { getConfig } from '../core/config';
import { dismissToast } from '../core/timers';
import type { Position, Toast, ToastType } from '../core/types';
import { getFilterId } from './gooey';
import { sanitizeHtml } from '../core/sanitize';
import './wiss.css';

// The whole expand/collapse geometry depends on these — don't tweak them
// without re-checking every formula that reads them.
const HEIGHT = 40;
const WIDTH = 350;
const DEFAULT_ROUNDNESS = 18;
const BLUR_RATIO = 0.5;
const PILL_PADDING = 10;
const MIN_EXPAND_RATIO = 1.6;
const DURATION_MS = 600;

// We don't expose a per-toast roundness override yet, so this is constant —
// getFilterId() caches by blur value, so all toasts share one <filter>.
const BLUR = DEFAULT_ROUNDNESS * BLUR_RATIO;

// Measuring descriptionDiv.scrollHeight alone ignores its own wrapper's
// padding. Without this, the expanded height only budgets room for the raw
// text, so the description ends up pressed against the rounded bottom
// corners. Must match [data-wiss-content]'s top+bottom padding in wiss.css.
const CONTENT_PADDING_Y = 24;

// Fixed delays (expand almost immediately, collapse a few seconds later),
// clamped against this toast's *actual* resolved duration so a short toast
// never schedules a collapse past its own dismissal (see resolveAutopilot).
const AUTO_EXPAND_DELAY_MS = 150;
const AUTO_COLLAPSE_DELAY_MS = 4000;

type PillAlign = 'left' | 'center' | 'right';
type ExpandEdge = 'top' | 'bottom';

const SVG_NS = 'http://www.w3.org/2000/svg';

function createSvgElement<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag) as SVGElementTagNameMap[K];
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, String(value));
  }
  return el;
}

// Only success/error/warning/info — our ToastType has no loading/action
// states. Static, developer-authored markup only: safe to use with
// innerHTML since it never mixes in toast content.
function svgIcon(title: string, inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><title>${title}</title>${inner}</svg>`;
}

const STATE_ICONS: Record<ToastType, string> = {
  success: svgIcon('Check', '<path d="M20 6 9 17l-5-5"/>'),
  error: svgIcon('X', '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
  warning: svgIcon(
    'Circle Alert',
    '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
  ),
  info: svgIcon(
    'Life Buoy',
    '<circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/>',
  ),
  loading: svgIcon(
    'Loading',
    '<path class="wiss-spinner" d="M21 12a9 9 0 1 1-6.219-8.56"/>',
  ),
};

function pillAlign(position: Position): PillAlign {
  if (position.endsWith('right')) return 'right';
  if (position.endsWith('center')) return 'center';
  return 'left';
}

function expandDir(position: Position): ExpandEdge {
  return position.startsWith('top') ? 'bottom' : 'top';
}

// No per-toast `autopilot` override object yet — always uses the delays
// above, clamped to this toast's duration.
function resolveAutopilot(duration: number): { expandDelayMs: number; collapseDelayMs: number } | null {
  if (!Number.isFinite(duration) || duration <= 0) return null;
  const clamp = (v: number) => Math.min(duration, Math.max(0, v));
  return {
    expandDelayMs: clamp(AUTO_EXPAND_DELAY_MS),
    collapseDelayMs: clamp(AUTO_COLLAPSE_DELAY_MS),
  };
}

interface WissState {
  toastRef: Toast;
  isExpanded: boolean;
  pillWidth: number;
  contentHeight: number;
  frozenExpanded: number;
  headerPad: number | null;
  headerRO: ResizeObserver | null;
  contentRO: ResizeObserver | null;
  headerRafId: number;
  contentRafId: number;
  autoExpandTimer: ReturnType<typeof setTimeout> | null;
  hasContent: boolean;
  align: PillAlign;
  edge: ExpandEdge;
  canvasDiv: HTMLDivElement;
  svg: SVGSVGElement;
  pillRect: SVGRectElement;
  bodyRect: SVGRectElement;
  headerDiv: HTMLDivElement;
  headerInner: HTMLDivElement;
  badgeDiv: HTMLDivElement;
  titleSpan: HTMLSpanElement;
  contentDiv: HTMLDivElement | null;
  descriptionDiv: HTMLDivElement | null;
  actionButton: HTMLButtonElement | null;
}

// Per-instance mutable state, keyed by the root <div>. render() creates
// it, update() looks it up.
const instances = new WeakMap<HTMLDivElement, WissState>();

function applyCSS(el: HTMLDivElement, state: WissState): void {
  const minExpanded = HEIGHT * MIN_EXPAND_RATIO;
  const rawExpanded = state.hasContent
    ? Math.max(minExpanded, HEIGHT + state.contentHeight + CONTENT_PADDING_Y)
    : minExpanded;
  const open = state.hasContent && state.isExpanded;

  if (open) {
    state.frozenExpanded = rawExpanded;
  }
  const expanded = open ? rawExpanded : state.frozenExpanded;
  const svgHeight = state.hasContent ? Math.max(expanded, minExpanded) : HEIGHT;
  const expandedContent = Math.max(0, expanded - HEIGHT);
  const resolvedPillWidth = Math.max(state.pillWidth || HEIGHT, HEIGHT);
  const pillHeight = HEIGHT + BLUR * 3;
  const pillX =
    state.align === 'right'
      ? WIDTH - resolvedPillWidth
      : state.align === 'center'
        ? (WIDTH - resolvedPillWidth) / 2
        : 0;

  const s = el.style;
  const visibleWidth = open ? WIDTH : resolvedPillWidth;
  const visibleX = open ? 0 : pillX;
  
  s.setProperty('--_h', `${open ? expanded : HEIGHT}px`);
  s.setProperty('--_pw', `${resolvedPillWidth}px`);
  s.setProperty('--_px', `${pillX}px`);
  s.setProperty('--_vw', `${visibleWidth}px`);
  s.setProperty('--_vx', `${visibleX}px`);
  s.setProperty('--_sy', `${open ? 1 : HEIGHT / pillHeight}`);
  s.setProperty('--_ph', `${pillHeight}px`);
  s.setProperty('--_by', `${open ? 1 : 0}`);
  s.setProperty(
    '--_ht',
    `translateY(${open ? (state.edge === 'bottom' ? 3 : -3) : 0}px) scale(${open ? 0.9 : 1})`,
  );
  s.setProperty('--_co', `${open ? 1 : 0}`);

  state.svg.setAttribute('height', String(svgHeight));
  state.svg.setAttribute('viewBox', `0 0 ${WIDTH} ${svgHeight}`);
  state.pillRect.setAttribute('x', String(pillX));
  state.bodyRect.setAttribute('height', String(expandedContent));

  el.dataset.expanded = String(open);
  el.dataset.state = state.toastRef.type;
  if (state.contentDiv) {
    state.contentDiv.dataset.visible = String(open);
  }
}

// Measures the header's real width so the pill hugs its content instead of
// using a fixed width.
function measureHeader(el: HTMLDivElement, state: WissState): void {
  if (state.headerPad === null || Number.isNaN(state.headerPad)) {
    const cs = getComputedStyle(state.headerDiv);
    const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    if (Number.isNaN(pad)) return;
    state.headerPad = pad;
  }
  const w = state.headerInner.scrollWidth + state.headerPad + PILL_PADDING;
  if (w > PILL_PADDING && w !== state.pillWidth) {
    state.pillWidth = w;
    applyCSS(el, state);
  }
}

function setupHeaderObserver(el: HTMLDivElement, state: WissState): void {
  measureHeader(el, state);
  state.headerRO = new ResizeObserver(() => {
    cancelAnimationFrame(state.headerRafId);
    state.headerRafId = requestAnimationFrame(() => measureHeader(el, state));
  });
  state.headerRO.observe(state.headerInner);
}

function measureContent(el: HTMLDivElement, state: WissState): void {
  if (!state.contentDiv) return;
  const h = state.contentDiv.scrollHeight;
  if (h !== state.contentHeight) {
    state.contentHeight = h;
    applyCSS(el, state);
  }
}

function setupContentObserver(el: HTMLDivElement, state: WissState): void {
  if (!state.contentDiv) return;
  measureContent(el, state);
  state.contentRO = new ResizeObserver(() => {
    cancelAnimationFrame(state.contentRafId);
    state.contentRafId = requestAnimationFrame(() => measureContent(el, state));
  });
  state.contentRO.observe(state.contentDiv);
}

function setExpanded(el: HTMLDivElement, state: WissState, value: boolean): void {
  if (state.isExpanded === value) return;
  state.isExpanded = value;
  applyCSS(el, state);
}

// mouseenter/mouseleave only — swipe-to-dismiss and header cross-fade are
// out of scope for this pass.
function setupEvents(el: HTMLDivElement, state: WissState): void {
  el.addEventListener('mouseenter', () => {
    if (state.hasContent) setExpanded(el, state, true);
  });
  el.addEventListener('mouseleave', () => {
    setExpanded(el, state, false);
  });
  el.addEventListener('wiss:collapse', () => {
    setExpanded(el, state, false);
  });
}

function scheduleAutoExpandCollapse(el: HTMLDivElement, state: WissState, duration: number): void {
  if (state.autoExpandTimer !== null) {
    clearTimeout(state.autoExpandTimer);
    state.autoExpandTimer = null;
  }
  if (!state.hasContent) return;

  const auto = resolveAutopilot(duration);
  if (!auto) return;

  if (auto.expandDelayMs > 0) {
    state.autoExpandTimer = setTimeout(() => setExpanded(el, state, true), auto.expandDelayMs);
  } else {
    setExpanded(el, state, true);
  }
}

function createContentSection(
  toast: Toast,
  edge: ExpandEdge,
  description: string | HTMLElement,
  action?: { label: string; onClick: () => void },
  useRichText = false
): {
  contentDiv: HTMLDivElement;
  descriptionDiv: HTMLDivElement | null;
  actionButton: HTMLButtonElement | null;
} {
  const contentDiv = document.createElement('div');
  contentDiv.dataset.wissContent = '';
  contentDiv.dataset.edge = edge;
  contentDiv.dataset.visible = 'false';

  let descriptionDiv = null;
  if (description) {
    descriptionDiv = document.createElement('div');
    descriptionDiv.dataset.wissDescription = '';
    if (typeof description === 'string') {
      if (useRichText) {
        descriptionDiv.appendChild(sanitizeHtml(description));
      } else {
        descriptionDiv.textContent = description;
      }
    } else {
      descriptionDiv.append(description);
    }
    contentDiv.append(descriptionDiv);
  }

  let actionButton = null;
  if (action) {
    actionButton = document.createElement('button');
    actionButton.dataset.wissAction = '';
    actionButton.dataset.cuelumePress = '';
    actionButton.dataset.cuelumeRelease = '';
    actionButton.dataset.cuelumeHover = 'tick';
    actionButton.type = 'button';
    actionButton.textContent = action.label;
    actionButton.addEventListener('click', (e) => {
      e.stopPropagation();
      action.onClick();
      // Leaving the toast up after "Undo" reads as a dead button, so it
      // closes by default — opt out per toast or globally.
      if (toast.dismissOnAction ?? getConfig().dismissOnAction) {
        dismissToast(toast.id);
      }
    });
    contentDiv.append(actionButton);
  }

  return { contentDiv, descriptionDiv, actionButton };
}

export function renderWissToast(toast: Toast): HTMLElement {
  const config = getConfig();
  const resolvedPosition = toast.position ?? config.position;
  const resolvedDuration = toast.duration ?? config.duration;
  const hasContent = Boolean(toast.description) || Boolean(toast.action);
  const align = pillAlign(resolvedPosition);
  const edge = expandDir(resolvedPosition);
  const minExpanded = HEIGHT * MIN_EXPAND_RATIO;

  // A <div>, not a <button>: the action button lives inside the toast, and
  // <button> forbids interactive descendants — an HTML parser would hoist
  // the action out as a *sibling*, which breaks SSR and any innerHTML pass.
  const el = document.createElement('div');
  el.dataset.wissId = toast.id;
  el.dataset.wissToast = '';
  el.dataset.ready = 'false';
  el.dataset.expanded = 'false';
  el.dataset.exiting = 'false';
  el.dataset.edge = edge;
  el.dataset.position = align;
  el.dataset.state = toast.type;
  // The live region is #wiss-toaster (persistent, created before any toast
  // exists) — see vanilla/index.ts. Only the politeness override rides on
  // the toast itself, so screen readers interrupt for errors.
  if (toast.type === 'error') {
    el.setAttribute('aria-live', 'assertive');
  }
  el.setAttribute('aria-atomic', 'true');
  el.style.setProperty('--_dur', `${DURATION_MS}ms`);

  // Two-rect (pill + body) model wrapped in a <g filter="url(#gooey)"> so
  // the blur+threshold filter fuses them into one continuous blob instead
  // of two shapes with a visible seam.
  const canvasDiv = document.createElement('div');
  canvasDiv.dataset.wissCanvas = '';
  canvasDiv.dataset.edge = edge;

  const svgHeight = hasContent ? minExpanded : HEIGHT;
  const svg = createSvgElement('svg', {
    width: WIDTH,
    height: svgHeight,
    viewBox: `0 0 ${WIDTH} ${svgHeight}`,
    'data-wiss-svg': '',
  });
  const titleEl = createSvgElement('title');
  titleEl.textContent = 'wiss notification';
  const group = createSvgElement('g', { filter: `url(#${getFilterId(BLUR)})` });
  const pillRect = createSvgElement('rect', {
    x: 0,
    rx: DEFAULT_ROUNDNESS,
    ry: DEFAULT_ROUNDNESS,
    'data-wiss-pill': '',
  });
  const bodyRect = createSvgElement('rect', {
    y: HEIGHT,
    width: WIDTH,
    height: 0,
    rx: DEFAULT_ROUNDNESS,
    ry: DEFAULT_ROUNDNESS,
    'data-wiss-body': '',
  });
  group.append(pillRect, bodyRect);
  svg.append(titleEl, group);
  canvasDiv.append(svg);

  const headerDiv = document.createElement('div');
  headerDiv.dataset.wissHeader = '';
  headerDiv.dataset.edge = edge;
  const headerStack = document.createElement('div');
  headerStack.dataset.wissHeaderStack = '';
  const headerInner = document.createElement('div');
  headerInner.dataset.wissHeaderInner = '';
  const badgeDiv = document.createElement('div');
  badgeDiv.dataset.wissBadge = '';
  badgeDiv.dataset.state = toast.type;
  if (toast.icon) {
    if (typeof toast.icon === 'string') {
      badgeDiv.innerHTML = toast.icon;
    } else {
      badgeDiv.append(toast.icon);
    }
  } else {
    badgeDiv.innerHTML = STATE_ICONS[toast.type];
  }
  const useRichText = toast.richText ?? config.richText;
  
  const titleSpan = document.createElement('span');
  titleSpan.dataset.wissTitle = '';
  titleSpan.dataset.state = toast.type;
  if (typeof toast.message === 'string') {
    if (useRichText) {
      titleSpan.appendChild(sanitizeHtml(toast.message));
    } else {
      titleSpan.textContent = toast.message;
    }
  } else {
    titleSpan.append(toast.message);
  }
  headerInner.append(badgeDiv, titleSpan);
  headerStack.append(headerInner);
  headerDiv.append(headerStack);

  el.append(canvasDiv, headerDiv);

  const showProgressBar = toast.progressBar ?? config.progressBar;
  if (showProgressBar) {
    const progressWrapper = document.createElement('div');
    progressWrapper.className = 'wiss-progress-wrapper';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'wiss-progress-bar';
    progressBar.style.animationDuration = `${resolvedDuration}ms`;
    
    progressWrapper.append(progressBar);
    el.append(progressWrapper);
  }

  let contentDiv: HTMLDivElement | null = null;
  let descriptionDiv: HTMLDivElement | null = null;
  let actionButton: HTMLButtonElement | null = null;
  if (hasContent) {
    const section = createContentSection(toast, edge, toast.description ?? '', toast.action, useRichText);
    contentDiv = section.contentDiv;
    descriptionDiv = section.descriptionDiv;
    actionButton = section.actionButton;
    el.append(contentDiv);
  }

  const state: WissState = {
    toastRef: toast,
    isExpanded: false,
    pillWidth: 0,
    contentHeight: 0,
    frozenExpanded: minExpanded,
    headerPad: null,
    headerRO: null,
    contentRO: null,
    headerRafId: 0,
    contentRafId: 0,
    autoExpandTimer: null,
    hasContent,
    align,
    edge,
    canvasDiv,
    svg,
    pillRect,
    bodyRect,
    headerDiv,
    headerInner,
    badgeDiv,
    titleSpan,
    contentDiv,
    descriptionDiv,
    actionButton,
  };

  instances.set(el, state);

  applyCSS(el, state);
  setupHeaderObserver(el, state);
  if (contentDiv) {
    setupContentObserver(el, state);
  }
  setupEvents(el, state);

  // Wait a frame so the initial hidden state (data-ready="false") actually
  // paints before we flip it — otherwise there's nothing for the enter
  // transition to animate from.
  requestAnimationFrame(() => {
    el.dataset.ready = 'true';
    scheduleAutoExpandCollapse(el, state, resolvedDuration);
  });

  return el;
}

export function updateWissToast(el: HTMLElement, toast: Toast): void {
  const root = el as HTMLDivElement;
  const state = instances.get(root);
  if (!state) return;

  const changed = state.toastRef !== toast;
  state.toastRef = toast;

  const config = getConfig();
  const resolvedPosition = toast.position ?? config.position;
  const resolvedDuration = toast.duration ?? config.duration;
  const align = pillAlign(resolvedPosition);
  const edge = expandDir(resolvedPosition);

  // Geometry follows the *config*, not the toast, so it has to be applied
  // even when the toast object is untouched — that's exactly the case when
  // toaster({ position }) changes while toasts are on screen.
  state.align = align;
  state.edge = edge;
  root.dataset.edge = edge;
  root.dataset.position = align;
  state.canvasDiv.dataset.edge = edge;
  state.headerDiv.dataset.edge = edge;
  if (state.contentDiv) state.contentDiv.dataset.edge = edge;

  if (!changed) {
    applyCSS(root, state);
    return;
  }

  const hasContent = Boolean(toast.description) || Boolean(toast.action);
  state.hasContent = hasContent;

  root.dataset.state = toast.type;
  // A promise toast can turn into an error mid-flight — keep the politeness
  // override in sync with the type.
  if (toast.type === 'error') {
    root.setAttribute('aria-live', 'assertive');
  } else {
    root.removeAttribute('aria-live');
  }

  state.badgeDiv.dataset.state = toast.type;
  if (toast.icon) {
    if (typeof toast.icon === 'string') {
      state.badgeDiv.innerHTML = toast.icon;
    } else {
      state.badgeDiv.innerHTML = '';
      state.badgeDiv.append(toast.icon);
    }
  } else {
    state.badgeDiv.innerHTML = STATE_ICONS[toast.type];
  }
  const useRichText = toast.richText ?? config.richText;

  state.titleSpan.dataset.state = toast.type;
  state.titleSpan.innerHTML = '';
  if (typeof toast.message === 'string') {
    if (useRichText) {
      state.titleSpan.appendChild(sanitizeHtml(toast.message));
    } else {
      state.titleSpan.textContent = toast.message;
    }
  } else {
    state.titleSpan.append(toast.message);
  }

  if (hasContent && !state.contentDiv) {
    const section = createContentSection(toast, edge, toast.description ?? '', toast.action, useRichText);
    state.contentDiv = section.contentDiv;
    state.descriptionDiv = section.descriptionDiv;
    state.actionButton = section.actionButton;
    root.append(section.contentDiv);
    setupContentObserver(root, state);
  } else if (!hasContent && state.contentDiv) {
    state.contentRO?.disconnect();
    state.contentRO = null;
    state.contentDiv.remove();
    state.contentDiv = null;
    state.descriptionDiv = null;
    state.actionButton = null;
    state.contentHeight = 0;
  } else if (state.contentDiv) {
    // Basic inner update for now
    if (state.descriptionDiv) {
      state.descriptionDiv.innerHTML = '';
      if (typeof toast.description === 'string') {
        if (useRichText) {
          state.descriptionDiv.appendChild(sanitizeHtml(toast.description));
        } else {
          state.descriptionDiv.textContent = toast.description;
        }
      } else if (toast.description) {
        state.descriptionDiv.append(toast.description);
      }
    }
  }

  const showProgressBar = toast.progressBar ?? config.progressBar;
  let progressWrapper = root.querySelector('.wiss-progress-wrapper');
  
  if (showProgressBar) {
    if (progressWrapper) progressWrapper.remove(); // Force restart
    progressWrapper = document.createElement('div');
    progressWrapper.className = 'wiss-progress-wrapper';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'wiss-progress-bar';
    progressBar.style.animationDuration = `${resolvedDuration}ms`;
    
    progressWrapper.append(progressBar);
    root.append(progressWrapper);
  } else if (progressWrapper) {
    progressWrapper.remove();
  }

  applyCSS(root, state);
  scheduleAutoExpandCollapse(root, state, resolvedDuration);
}

/**
 * Releases everything this toast holds outside its own subtree: pending
 * timers, queued rAFs and the two ResizeObservers. Must run before the node
 * is detached — otherwise the observers keep it alive and the auto-expand
 * timer fires against a node nobody can see.
 */
export function disposeWissToast(el: HTMLElement): void {
  const state = instances.get(el as HTMLDivElement);
  if (!state) return;

  if (state.autoExpandTimer !== null) {
    clearTimeout(state.autoExpandTimer);
    state.autoExpandTimer = null;
  }
  cancelAnimationFrame(state.headerRafId);
  cancelAnimationFrame(state.contentRafId);
  state.headerRO?.disconnect();
  state.contentRO?.disconnect();
  state.headerRO = null;
  state.contentRO = null;
}

export function closeWissToast(el: HTMLElement, onComplete: () => void): void {
  const root = el as HTMLDivElement;
  const state = instances.get(root);
  if (!state) {
    onComplete();
    return;
  }
  
  if (state.autoExpandTimer) clearTimeout(state.autoExpandTimer);
  
  if (state.isExpanded) {
    setExpanded(root, state, false);
    setTimeout(onComplete, 600); // Match --_dur transition
  } else {
    onComplete();
  }
}
