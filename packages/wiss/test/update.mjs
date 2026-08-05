import { check, done } from './dom-harness.mjs';
const { toast } = await import('../dist/core.es.js');
const { subscribe } = await import('../dist/core/store.es.js');

let live = [];
subscribe(ts => { live = ts; });
const get = id => live.find(t => t.id === id);

toast.success('Guardando…', { id: 'U', description: 'desc original', duration: 9999, icon: '💾' });
check('before: type',        get('U').type, 'success');
check('before: message',     get('U').message, 'Guardando…');

// The reported footgun: updating one field wiped everything else.
toast.update('U', { description: 'desc nueva' });

check('after: type preserved',     get('U').type, 'success');
check('after: message preserved',  get('U').message, 'Guardando…');
check('after: icon preserved',     get('U').icon, '💾');
check('after: duration preserved', get('U').duration, 9999);
check('after: description updated',get('U').description, 'desc nueva');

// Explicit overrides still win.
toast.update('U', { type: 'error', message: 'Falló' });
check('override: type',    get('U').type, 'error');
check('override: message', get('U').message, 'Falló');
check('override: description still there', get('U').description, 'desc nueva');

done();
