import { setupDom, pointerEvent, sleep, check, done } from './dom-harness.mjs';

const dom = setupDom();
const { toaster, destroyToaster } = await import('../dist/vanilla.es.js');
const { toast } = await import('../dist/core.es.js');

const box = () => document.getElementById('wiss-toaster');
const node = () => box().querySelector('[data-wiss-id]');
const themeClasses = () => [...node().classList].filter((c) => c.startsWith('wiss-theme-'));

toaster({ position: 'bottom-right', sound: false, duration: 99999, theme: 'dark', format: 'wiss' });

// --- theme changes must reach toasts already on screen -----------------------
toast.show('vivo', { id: 'T' });
await sleep(60);
check('theme: initial class', themeClasses(), ['wiss-theme-dark']);

toaster({ theme: 'neon' });
await sleep(20);
check('theme: swapped on the live toast', themeClasses(), ['wiss-theme-neon']);
check('theme: old class removed, not stacked', themeClasses().length, 1);

// --- position changes must reach toasts already on screen --------------------
check('position: initial edge', node().dataset.edge, 'top');
toaster({ position: 'top-left' });
await sleep(20);
check('position: edge updated on live toast', node().dataset.edge, 'bottom');
check('position: align updated on live toast', node().dataset.position, 'left');

// --- switching format must re-render, not leave a zombie ---------------------
check('format: starts as wiss', node().dataset.wissFormat, 'wiss');
check('format: root is the wiss renderer', node().hasAttribute('data-wiss-toast'), true);

toaster({ format: 'island' });
await sleep(20);
check('format: only one node for the toast', box().querySelectorAll('[data-wiss-id]').length, 1);
check('format: re-rendered as island', node().dataset.wissFormat, 'island');
check('format: root is the island renderer', node().classList.contains('wiss-island'), true);

// The re-rendered node must be live, not a zombie: it still updates.
toast.update('T', { message: 'actualizado' });
await sleep(20);
check('format: re-rendered node still updates', node().textContent.includes('actualizado'), true);

// --- swipe axis lock ---------------------------------------------------------
toaster({ format: 'wiss' });
await sleep(20);
const n = node();
n.dispatchEvent(pointerEvent(dom, 'pointerdown', { clientX: 0, clientY: 0 }));
// A mostly-vertical drag: the page is scrolling, the toast must not follow.
n.dispatchEvent(pointerEvent(dom, 'pointermove', { clientX: 6, clientY: 40 }));
n.dispatchEvent(pointerEvent(dom, 'pointermove', { clientX: 10, clientY: 90 }));
check('swipe: vertical drag leaves the toast put', n.style.transform, '');
n.dispatchEvent(pointerEvent(dom, 'pointerup', { clientX: 10, clientY: 90 }));
await sleep(20);
check('swipe: vertical drag did not dismiss', box().querySelectorAll('[data-wiss-id]').length, 1);

// A horizontal drag still works.
const n2 = node();
n2.dispatchEvent(pointerEvent(dom, 'pointerdown', { clientX: 0, clientY: 0 }));
n2.dispatchEvent(pointerEvent(dom, 'pointermove', { clientX: 40, clientY: 4 }));
check('swipe: horizontal drag moves the toast', n2.style.transform, 'translateX(40px)');
n2.dispatchEvent(pointerEvent(dom, 'pointermove', { clientX: 120, clientY: 6 }));
n2.dispatchEvent(pointerEvent(dom, 'pointerup', { clientX: 120, clientY: 6 }));
await sleep(700);
check('swipe: horizontal drag dismissed it', box().querySelectorAll('[data-wiss-id]').length, 0);

// --- destroyToaster ----------------------------------------------------------
toast.show('antes de destruir', { id: 'D' });
await sleep(60);
check('destroy: toast present', box().querySelectorAll('[data-wiss-id]').length, 1);

destroyToaster();
check('destroy: container removed', document.getElementById('wiss-toaster'), null);

// And it must come back cleanly.
toaster({ sound: false, duration: 99999 });
toast.show('después', { id: 'E' });
await sleep(60);
check('destroy: toaster restarts cleanly', box().querySelectorAll('[data-wiss-id]').length >= 1, true);

done();
