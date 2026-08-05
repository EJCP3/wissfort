// Minimal DOM harness for smoke-testing the built bundle under Node.
// Not a test framework — just enough jsdom to exercise the vanilla renderer.
import { JSDOM } from 'jsdom';

export function setupDom() {
  const dom = new JSDOM('<!doctype html><body></body>', { pretendToBeVisual: true });
  const w = dom.window;

  const globals = [
    'document', 'Element', 'HTMLElement', 'HTMLButtonElement', 'HTMLDivElement',
    'SVGElement', 'SVGSVGElement', 'Node', 'Event', 'CustomEvent', 'MouseEvent',
    'DOMParser', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame',
  ];
  globalThis.window = w;
  for (const k of globals) globalThis[k] = w[k];

  // jsdom ships neither of these.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  w.HTMLElement.prototype.setPointerCapture = function () {};
  w.HTMLElement.prototype.hasPointerCapture = () => false;
  w.HTMLElement.prototype.releasePointerCapture = function () {};

  return dom;
}

export function pointerEvent(dom, type, props) {
  const e = new dom.window.Event(type, { bubbles: true, cancelable: true });
  // clientX/clientY default to 0 — a real PointerEvent always carries both,
  // and leaving them undefined makes delta maths silently produce NaN.
  Object.assign(e, { pointerType: 'mouse', button: 0, pointerId: 1, clientX: 0, clientY: 0, ...props });
  return e;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
export function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${ok ? '' : `  (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`}`);
  return ok;
}
export function done() {
  console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}
