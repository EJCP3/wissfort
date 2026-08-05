import { setupDom, sleep, check, done } from './dom-harness.mjs';

setupDom();
const { toaster } = await import('../dist/vanilla.es.js');
const { toast } = await import('../dist/core.es.js');

toaster({ position: 'bottom-right', sound: false, duration: 99999 });
const box = () => document.getElementById('wiss-toaster');

toast.show('antes', { id: '1' });
await sleep(50);
check('initial: toast visible', box()?.children.length, 1);

// What Astro's ViewTransitions does on navigation: swap the whole <body>.
const fresh = document.createElement('body');
document.body.replaceWith(fresh);
check('after body swap: container gone', document.getElementById('wiss-toaster'), null);

// No re-init call — the host may not know it has to. It must self-heal.
toast.show('después de navegar', { id: '2' });
await sleep(50);
check('self-healed: container rebuilt', box() !== null, true);
check('self-healed: toast visible again', box()?.children.length >= 1, true);

done();
