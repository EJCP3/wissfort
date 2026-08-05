import { setupDom, pointerEvent, sleep, check, done } from './dom-harness.mjs';

const dom = setupDom();
const { toaster } = await import('../dist/vanilla.es.js');
const { toast } = await import('../dist/core.es.js');

toaster({ position: 'bottom-right', sound: false, duration: 99999 });
const box = () => document.getElementById('wiss-toaster');
const count = () => box().children.length;

// --- #2 swipe-to-dismiss must detach the node -------------------------------
toast.show('swipe me', { id: 'X' });
await sleep(60);
check('swipe: toast rendered', count(), 1);

const node = box().querySelector('[data-wiss-id]');
node.dispatchEvent(pointerEvent(dom, 'pointerdown', { clientX: 0 }));
node.dispatchEvent(pointerEvent(dom, 'pointermove', { clientX: 120 }));
node.dispatchEvent(pointerEvent(dom, 'pointerup', { clientX: 120 }));
await sleep(700);
check('swipe: node removed from DOM', count(), 0);

// --- regression: ordinary timed dismissal still detaches --------------------
toast.show('auto', { id: 'Y', duration: 60 });
await sleep(60);
check('timed: toast rendered', count(), 1);
await sleep(800);
check('timed: node removed from DOM', count(), 0);

// --- regression: toast.dismiss() still detaches ------------------------------
toast.show('manual', { id: 'Z' });
await sleep(60);
toast.dismiss('Z');
await sleep(800);
check('dismiss(): node removed from DOM', count(), 0);

// --- #4 dismissOnAction closes the toast ------------------------------------
let ran = false;
toast.show('with action', { id: 'A', action: { label: 'Undo', onClick: () => { ran = true; } } });
await sleep(60);
box().querySelector('[data-wiss-action]').click();
await sleep(800);
check('action: onClick ran', ran, true);
check('action: toast auto-dismissed', count(), 0);

// --- #2 root element is a div, action button nests legally ------------------
toast.show('structure', { id: 'B', action: { label: 'Go', onClick: () => {} } });
await sleep(60);
const root = box().querySelector('[data-wiss-id]');
check('structure: root is DIV', root.tagName, 'DIV');
check('structure: action is nested inside root', root.contains(root.querySelector('[data-wiss-action]')), true);

// Reparse the live HTML the way an SSR/innerHTML round-trip would.
const reparsed = new dom.window.DOMParser()
  .parseFromString(`<div id="w">${box().innerHTML}</div>`, 'text/html')
  .getElementById('w');
const rRoot = reparsed.querySelector('[data-wiss-id]');
check('structure: survives reparse (action still nested)',
  rRoot.contains(rRoot.querySelector('[data-wiss-action]')), true);

done();
