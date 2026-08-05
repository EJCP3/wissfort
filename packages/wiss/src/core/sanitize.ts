const ALLOWED_TAGS = new Set(['B', 'I', 'STRONG', 'EM', 'A', 'SPAN', 'BR', 'CODE', 'U']);

// `style` used to be here. It let any injected string apply arbitrary CSS —
// `position:fixed;inset:0;z-index:9999` turns a toast message into a
// full-page overlay — and there is no cheap way to validate a declaration
// block. Rich text is meant to be *text*; styling belongs to the themes.
// `class` stays: it's inert on its own and it's the documented styling hook.
const ALLOWED_ATTRS = new Set(['href', 'target', 'rel', 'class']);

// Anything not on this list — data:, blob:, vbscript:, and of course
// javascript: — is dropped. An allowlist, because a denylist only blocks the
// bypasses you already thought of.
const SAFE_SCHEMES = new Set(['http', 'https', 'mailto', 'tel']);

// U+FFFD. Built from its code point so this file stays plain ASCII.
const REPLACEMENT_CHAR = String.fromCharCode(0xfffd);

/**
 * Drops the characters a browser ignores when it resolves a URL scheme:
 * C0 controls, space and DEL. Done by char code rather than a regex so the
 * source file stays plain ASCII.
 */
function stripSchemeNoise(value: string): string {
  let out = '';
  for (const ch of value) {
    const code = ch.charCodeAt(0);
    if (code > 0x20 && code !== 0x7f) out += ch;
  }
  return out;
}

/**
 * Whether a URL is safe to put in an `href`.
 *
 * The old check was `value.trim().toLowerCase().startsWith('javascript:')`,
 * which misses every real-world bypass. Browsers strip TAB/LF/CR from
 * anywhere in a URL and trim leading C0 control characters before resolving
 * the scheme, and `String.trim()` removes neither - so `java&#9;script:` and
 * `&#1;javascript:` both survived the filter and both execute.
 */
function isSafeUrl(value: string): boolean {
  const stripped = stripSchemeNoise(value);
  if (stripped === '') return false;

  // A replacement character means the HTML parser rewrote a NUL or an
  // invalid byte in the input. Reject rather than strip: removing it would
  // turn "\0javascript:" back into "javascript:" and manufacture the very
  // bypass this function exists to stop.
  if (stripped.includes(REPLACEMENT_CHAR)) return false;

  const scheme = /^([a-z][a-z0-9+.\-]*):/i.exec(stripped);
  // No scheme at all means a relative URL, which can't escape the origin.
  if (!scheme) return true;

  return SAFE_SCHEMES.has(scheme[1]!.toLowerCase());
}

export function sanitizeHtml(html: string): HTMLSpanElement {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const span = document.createElement('span');

  function sanitizeElement(el: Element): HTMLElement {
    const cloned = document.createElement(el.tagName.toUpperCase());

    Array.from(el.attributes).forEach((attr) => {
      const attrName = attr.name.toLowerCase();
      if (!ALLOWED_ATTRS.has(attrName)) return;
      if (attrName === 'href' && !isSafeUrl(attr.value)) return;
      cloned.setAttribute(attrName, attr.value);
    });

    // A `target` link hands the opened page a live `window.opener` back to
    // this one (reverse tabnabbing). `rel` was allowed but never enforced,
    // so any rel the input supplied — or none — went through as-is.
    if (cloned.hasAttribute('target')) {
      cloned.setAttribute('rel', 'noopener noreferrer');
    }

    return cloned;
  }

  function sanitizeNode(node: Node): Node | null {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent || '');
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const el = node as Element;
    // Disallowed tag: keep its text, drop the element itself.
    const target: HTMLElement | DocumentFragment = ALLOWED_TAGS.has(el.tagName.toUpperCase())
      ? sanitizeElement(el)
      : document.createDocumentFragment();

    Array.from(el.childNodes).forEach((child) => {
      const sanitizedChild = sanitizeNode(child);
      if (sanitizedChild) target.appendChild(sanitizedChild);
    });

    return target;
  }

  Array.from(doc.body.childNodes).forEach((child) => {
    const sanitized = sanitizeNode(child);
    if (sanitized) span.appendChild(sanitized);
  });

  return span;
}
