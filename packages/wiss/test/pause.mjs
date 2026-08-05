import { setupDom, sleep, check, done } from './dom-harness.mjs';

const dom = setupDom();
const { toaster } = await import('../dist/vanilla.es.js');
const { toast } = await import('../dist/core.es.js');
const { subscribe } = await import('../dist/core/store.es.js');

toaster({ position: 'bottom-right', sound: false });
const box = () => document.getElementById('wiss-toaster');

// Assert on the store, not the DOM: the timers decide when a toast leaves
// the store; the node lingers afterwards for its exit animation.
let live = [];
subscribe((ts) => { live = ts; });
const count = () => live.length;

const fire = (type, init = {}) => {
  const e = new dom.window.Event(type, { bubbles: true });
  Object.assign(e, init);
  box().dispatchEvent(e);
};

// Pointer rests on the toast, then focus enters and leaves the action button.
// The stray focusout used to resume every timer while the mouse was still there.
toast.show('hover me', { id: 'H', duration: 150, action: { label: 'Go', onClick: () => {} } });
await sleep(40);

fire('mouseenter');
check('paused: data attribute set', box().dataset.wissPaused, 'true');

fire('focusin');
fire('focusout', { relatedTarget: null }); // tab away from the action button
check('paused: still paused after focus leaves (mouse remains)', box().dataset.wissPaused, 'true');

await sleep(400); // 150ms duration has long passed
check('paused: toast survived while pointer held', count(), 1);

fire('mouseleave');
check('paused: attribute cleared once pointer leaves', box().dataset.wissPaused, undefined);

await sleep(400);
check('resumed: toast dismissed after pointer left', count(), 0);

done();
