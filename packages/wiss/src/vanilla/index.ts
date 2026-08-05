import { bind, play } from 'cuelume';
import type { ResolvedConfig } from '../core/config';
import { getConfig, setConfig } from '../core/config';
import { notify, subscribe } from '../core/store';
import { pauseAll, resumeAll } from '../core/timers';
import type { Position, Toast, ToastType, WissConfig } from '../core/types';
import { renderWissToast, updateWissToast, closeWissToast, disposeWissToast } from '../styles/wiss';
import { renderIslandToast, updateIslandToast, closeIslandToast, disposeIslandToast } from '../styles/island';
import '../styles/themes.css';
import { setupSwipe } from './swipe';

const CONTAINER_ID = 'wiss-toaster';
const ENTER_HIDDEN_CLASSES = ['opacity-0', 'translate-y-2', 'scale-95'];
const EXIT_TIMEOUT_MS = 400;

let container: HTMLDivElement | null = null;
let unsubscribeStore: (() => void) | null = null;

function applyContainerPosition(el: HTMLDivElement, position: Position, offset: number): void {
  const [vertical, horizontal] = position.split('-') as [
    'top' | 'bottom',
    'left' | 'center' | 'right',
  ];

  el.style.top = vertical === 'top' ? `${offset}px` : '';
  el.style.bottom = vertical === 'bottom' ? `${offset}px` : '';
  el.style.left = '';
  el.style.right = '';
  el.style.transform = '';

  if (horizontal === 'left') {
    el.style.left = `${offset}px`;
    el.style.alignItems = 'flex-start';
  } else if (horizontal === 'right') {
    el.style.right = `${offset}px`;
    el.style.alignItems = 'flex-end';
  } else {
    el.style.left = '50%';
    el.style.transform = 'translateX(-50%)';
    el.style.alignItems = 'center';
  }

  // Newest toast stays closest to the screen edge it entered from.
  el.style.flexDirection = vertical === 'top' ? 'column' : 'column-reverse';
}

function createContainer(position: Position, offset: number): HTMLDivElement {
  const el = document.createElement('div');
  el.id = CONTAINER_ID;
  el.setAttribute('data-wiss-toaster', '');
  el.setAttribute('role', 'region');
  el.setAttribute('aria-label', 'Notificaciones');
  // The live region has to be in the DOM *before* its content changes —
  // screen readers don't reliably announce a node that shows up already
  // carrying aria-live. This container is persistent, so it's the right
  // host; individual toasts only override politeness (assertive on error).
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-atomic', 'false');
  el.setAttribute('aria-relevant', 'additions text');
  el.style.position = 'fixed';
  el.style.display = 'flex';
  el.style.gap = '0.5rem';
  el.style.zIndex = '2147483647';
  el.style.pointerEvents = 'none';
  el.style.maxWidth = '100vw';

  applyContainerPosition(el, position, offset);

  const config = getConfig();
  if (config.fontFamily) {
    el.style.setProperty('--wiss-font-family', config.fontFamily);
  }

  document.body.appendChild(el);
  return el;
}

// Holding the countdown is also a visual state: the progress bar has to
// freeze with it. data-wiss-paused drives that in CSS, so pointer *and*
// keyboard pauses stay in sync — the old `:hover` rule only knew about
// the mouse, so a focus-pause left the bar running against a stopped timer.
function setPausedAttr(el: HTMLDivElement, paused: boolean): void {
  if (paused) el.dataset.wissPaused = 'true';
  else delete el.dataset.wissPaused;
}

function wirePauseListeners(el: HTMLDivElement): void {
  let pointerHeld = false;
  let focusHeld = false;
  const sync = () => setPausedAttr(el, pointerHeld || focusHeld);

  el.addEventListener('mouseenter', () => {
    pointerHeld = true;
    pauseAll('pointer');
    sync();
  });
  el.addEventListener('mouseleave', () => {
    pointerHeld = false;
    resumeAll('pointer');
    sync();
  });
  el.addEventListener('focusin', () => {
    focusHeld = true;
    pauseAll('focus');
    sync();
  });
  el.addEventListener('focusout', (event) => {
    // Moving focus between two children fires focusout *before* focusin.
    // Without this guard the timers would resume for one tick mid-tab.
    const next = (event as FocusEvent).relatedTarget;
    if (next instanceof Node && el.contains(next)) return;
    focusHeld = false;
    resumeAll('focus');
    sync();
  });
}

function getThemeRenderer(format: ResolvedConfig['format']) {
  if (format === 'island') return { render: renderIslandToast, update: updateIslandToast };
  return { render: renderWissToast, update: updateWissToast };
}

// Single teardown path: dispose the renderer's timers/observers, then detach.
// Every removal must go through here, or the node leaks.
function destroyNode(node: HTMLElement): void {
  if (node.hasAttribute('data-wiss-toast')) {
    disposeWissToast(node);
  } else if (node.classList.contains('wiss-island')) {
    disposeIslandToast(node);
  }
  node.remove();
}

function removeAfterTransition(node: HTMLElement): void {
  const remove = () => destroyNode(node);
  node.addEventListener('transitionend', remove, { once: true });
  setTimeout(remove, EXIT_TIMEOUT_MS);
}

function animateOut(node: HTMLElement): void {
  // One authoritative teardown flag. It used to key off data-exiting, but
  // swipe.ts sets that itself before removing the toast from the store —
  // which made reconcile skip the node and leave it in the DOM forever.
  if (node.dataset.wissDestroying === 'true') {
    return;
  }
  node.dataset.wissDestroying = 'true';

  // A swiped toast already animated itself off-screen. Replaying the
  // collapse would fight that transform, so just detach once its own
  // transition lands.
  if (node.dataset.wissSwiped === 'true') {
    removeAfterTransition(node);
    return;
  }

  node.dataset.exiting = 'true';

  if (node.hasAttribute('data-wiss-toast')) {
    // Wissfort theme (handled via wiss.css)
    closeWissToast(node, () => removeAfterTransition(node));
    return;
  } else if (node.classList.contains('wiss-island')) {
    closeIslandToast(node, () => {
      node.classList.add(...ENTER_HIDDEN_CLASSES, 'transition-all', 'duration-300');
      removeAfterTransition(node);
    });
    return;
  } else {
    // Daisy theme (handled via Tailwind classes)
    node.dataset.wissExiting = 'true';
    node.classList.add(...ENTER_HIDDEN_CLASSES);
  }

  removeAfterTransition(node);
}

function playToastSound(type: ToastType, customSound?: boolean | string) {
  if (customSound === false || !getConfig().sound) return;
  if (typeof customSound === 'string') {
    play(customSound as any);
    return;
  }
  switch (type) {
    case 'success': play('success'); break;
    case 'error': play('error'); break;
    case 'warning': play('chime'); break;
    case 'info': play('droplet'); break;
    case 'loading': play('loading'); break;
  }
}

// Theme lives in a class, so switching themes has to *replace* it rather
// than add another. This used to run only for entering toasts, so calling
// toaster({ theme }) left everything already on screen on the old theme.
function applyChrome(node: HTMLElement, config: ResolvedConfig): void {
  node.dataset.wissFormat = config.format;

  const next = config.theme ? `wiss-theme-${config.theme}` : null;
  node.classList.forEach((cls) => {
    if (cls.startsWith('wiss-theme-') && cls !== next) node.classList.remove(cls);
  });
  if (next) node.classList.add(next);
}

function reconcile(el: HTMLDivElement, toasts: Toast[], config: ResolvedConfig): void {
  const { render, update } = getThemeRenderer(config.format);

  const existingById = new Map<string, HTMLElement>();
  Array.from(el.children).forEach((child) => {
    if (child instanceof HTMLElement && child.dataset.wissId) {
      existingById.set(child.dataset.wissId, child);
    }
  });

  const seen = new Set<string>();
  const entering: Toast[] = [];

  toasts.forEach((toast) => {
    seen.add(toast.id);
    const existing = existingById.get(toast.id);

    // A node built by the other renderer isn't updatable — its state lives in
    // the other module's WeakMap, so update() would just return and leave a
    // zombie. Drop it and re-render in the current format.
    if (existing && existing.dataset.wissFormat !== config.format) {
      destroyNode(existing);
      existingById.delete(toast.id);
      entering.push(toast);
      return;
    }

    if (existing) {
      const prevType = existing.dataset.state as ToastType;
      const status = toast.type;
      update(existing, toast);
      applyChrome(existing, config);
      if (prevType !== toast.type) {
        if (status === 'success') {
          playToastSound('success', toast.sound); // Re-play if a promise resolves successfully
        } else if (status === 'error') {
          playToastSound('error', toast.sound);
        }
      }
      return;
    }

    entering.push(toast);
  });

  const exiting: HTMLElement[] = [];
  existingById.forEach((node, id) => {
    if (!seen.has(id) && node.dataset.wissDestroying !== 'true') {
      exiting.push(node);
    }
  });

  if (config.replaceBehavior === 'wiss' && exiting.length === 1 && entering.length === 1) {
    const oldNode = exiting[0]!;
    const newToast = entering[0]!;

    oldNode.dataset.wissId = newToast.id;
    oldNode.dispatchEvent(new Event('wiss:collapse'));

    // Fade out text immediately for a smoother visual transition
    const title = oldNode.querySelector('.island-title, [data-wiss-title]') as HTMLElement;
    const desc = oldNode.querySelector('.island-desc, [data-wiss-description]') as HTMLElement;
    if (title) title.style.opacity = '0';
    if (desc) desc.style.opacity = '0';

    setTimeout(() => {
      if (title) title.style.opacity = '';
      if (desc) desc.style.opacity = '';
      update(oldNode, newToast);
      playToastSound(newToast.type, newToast.sound);
    }, 400);

    return;
  }

  entering.forEach((toast) => {
    const node = render(toast);

    applyChrome(node, config);

    node.style.pointerEvents = 'auto';
    el.appendChild(node);
    
    // Play enter sound
    playToastSound(toast.type, toast.sound);

    // Double rAF: let the browser commit the hidden state before
    // removing it, otherwise the enter transition never plays.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        node.classList.remove(...ENTER_HIDDEN_CLASSES);
      });
    });
  });

  exiting.forEach((node) => {
    animateOut(node);
  });
}

/**
 * Returns the live container, rebuilding it if it has been detached.
 *
 * Caching the node alone wasn't enough: frameworks that swap `<body>`
 * (Astro View Transitions, some SPA routers) throw the container away while
 * this module keeps holding the orphan, and every later toast then rendered
 * into a node nobody could see — silently, with no error. Checking
 * `isConnected` on every reconcile makes that self-healing, so the host
 * doesn't have to remember to re-init after a navigation.
 */
function ensureContainer(): HTMLDivElement {
  if (container && container.isConnected) return container;

  const { position, offset } = getConfig();
  container = createContainer(position, offset);
  wirePauseListeners(container);
  setupSwipe(container);
  return container;
}

export function toaster(config?: WissConfig): void {
  if (config) {
    setConfig(config);
  }

  // Wire up cuelume attributes globally
  bind();

  const { position, offset, fontFamily } = getConfig();

  const el = ensureContainer();
  applyContainerPosition(el, position, offset);
  if (fontFamily) {
    el.style.setProperty('--wiss-font-family', fontFamily);
  } else {
    el.style.removeProperty('--wiss-font-family');
  }

  // Resolve the container at call time rather than closing over it, so the
  // subscription follows it across a recreate.
  if (!unsubscribeStore) {
    unsubscribeStore = subscribe((toasts) => {
      reconcile(ensureContainer(), toasts, getConfig());
    });
  }

  // Push the new config onto whatever is already on screen. Without this,
  // `toaster({ theme })` only affected the *next* toast — every wrapper
  // re-invokes toaster() on prop change, which implies otherwise.
  notify();
}

/**
 * Tears the toaster down: unsubscribes from the store, disposes every live
 * toast and removes the container.
 *
 * The module used to hold its container and subscription for the lifetime of
 * the page with no way out, which leaks across SPA teardown and between
 * tests. Calling `toaster()` afterwards starts cleanly.
 */
export function destroyToaster(): void {
  unsubscribeStore?.();
  unsubscribeStore = null;

  if (container) {
    Array.from(container.children).forEach((child) => {
      if (child instanceof HTMLElement) destroyNode(child);
    });
    container.remove();
    container = null;
  }
}
