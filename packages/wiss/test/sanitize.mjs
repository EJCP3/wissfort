import { setupDom, check, done } from './dom-harness.mjs';

setupDom();
const { sanitizeHtml } = await import('../dist/core/sanitize.es.js');

const html = (input) => sanitizeHtml(input).innerHTML;
const href = (input) => sanitizeHtml(input).querySelector('a')?.getAttribute('href') ?? null;

// --- scheme allowlist -------------------------------------------------------
// Browsers strip TAB/LF/CR anywhere in a URL and leading C0 controls before
// resolving the scheme, so all of these used to execute.
check('javascript: plain',            href(`<a href="javascript:alert(1)">x</a>`), null);
check('javascript: uppercase',        href(`<a href="JaVaScRiPt:alert(1)">x</a>`), null);
check('javascript: leading spaces',   href(`<a href="   javascript:alert(1)">x</a>`), null);
check('javascript: embedded TAB',     href(`<a href="java&#9;script:alert(1)">x</a>`), null);
check('javascript: embedded LF',      href(`<a href="java&#10;script:alert(1)">x</a>`), null);
check('javascript: embedded CR',      href(`<a href="java&#13;script:alert(1)">x</a>`), null);
check('javascript: leading C0 x01',   href(`<a href="&#1;javascript:alert(1)">x</a>`), null);
check('javascript: leading NUL',      href(`<a href="&#0;javascript:alert(1)">x</a>`), null);
check('data: html payload',           href(`<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>`), null);
check('vbscript:',                    href(`<a href="vbscript:msgbox(1)">x</a>`), null);
check('blob:',                        href(`<a href="blob:https://evil.test/x">x</a>`), null);
check('empty href',                   href(`<a href="">x</a>`), null);

// --- legitimate URLs must survive -------------------------------------------
check('https kept',    href(`<a href="https://example.com/a?b=1#c">x</a>`), 'https://example.com/a?b=1#c');
check('http kept',     href(`<a href="http://example.com">x</a>`), 'http://example.com');
check('mailto kept',   href(`<a href="mailto:hi@example.com">x</a>`), 'mailto:hi@example.com');
check('tel kept',      href(`<a href="tel:+34600000000">x</a>`), 'tel:+34600000000');
check('relative kept', href(`<a href="/settings">x</a>`), '/settings');
check('anchor kept',   href(`<a href="#top">x</a>`), '#top');

// --- style attribute is gone ------------------------------------------------
check('style stripped (overlay)',
  html(`<span style="position:fixed;inset:0;z-index:9999">x</span>`), '<span>x</span>');
check('style stripped (any)',
  html(`<b style="color:red">x</b>`), '<b>x</b>');

// --- target forces rel ------------------------------------------------------
const t = sanitizeHtml(`<a href="https://evil.test" target="_blank">x</a>`).querySelector('a');
check('target keeps working', t.getAttribute('target'), '_blank');
check('rel forced to noopener noreferrer', t.getAttribute('rel'), 'noopener noreferrer');
const t2 = sanitizeHtml(`<a href="https://e.test" target="_blank" rel="opener">x</a>`).querySelector('a');
check('input-supplied rel is overridden', t2.getAttribute('rel'), 'noopener noreferrer');

// --- structural sanitising still behaves ------------------------------------
check('script dropped, text kept',   html(`<script>alert(1)</script>hola`), 'hola');
check('img dropped',                 html(`<img src=x onerror=alert(1)>`), '');
check('event handler stripped',      html(`<b onclick="alert(1)">x</b>`), '<b>x</b>');
check('nested formatting kept',      html(`<b>bold <em>and em</em></b>`), '<b>bold <em>and em</em></b>');
check('class kept',                  html(`<span class="text-red-500">x</span>`), '<span class="text-red-500">x</span>');
check('unknown tag unwrapped',       html(`<div><b>x</b></div>`), '<b>x</b>');

done();
