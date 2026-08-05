/**
 * Helpers for reading and writing the code inside a `.preview-block`.
 *
 * Every code sample is rendered twice — once highlighted for the light theme,
 * once for the dark one — with CSS hiding whichever doesn't apply. That makes
 * `editor.textContent` return *both copies concatenated*, which is why the
 * "Run" button used to execute each demo twice and fire two toasts.
 *
 * Read through `readCode` and write through `writeCode`; never touch the
 * editor's textContent directly.
 */

function editorOf(block: Element): HTMLElement | null {
  return block.querySelector('[data-code-editor]');
}

/** The variant currently shown, falling back to the light one. */
function visibleVariant(editor: HTMLElement): HTMLElement | null {
  const variants = Array.from(
    editor.querySelectorAll<HTMLElement>(':scope > [data-code-variant]'),
  );
  if (variants.length === 0) return null;
  return (
    variants.find((v) => getComputedStyle(v).display !== 'none') ??
    variants[0] ??
    null
  );
}

export function readCode(block: Element): string {
  const editor = editorOf(block);
  if (!editor) return '';

  // After a writeCode() the two variants are gone, replaced by a single plain
  // text node — then the editor's own textContent is the source of truth.
  const variant = visibleVariant(editor);
  return (variant ?? editor).textContent ?? '';
}

export function writeCode(block: Element, code: string): void {
  const editor = editorOf(block);
  if (!editor) return;
  // Collapses both highlighted variants into one plain-text node, so the two
  // copies can never drift apart (and readCode keeps returning one copy).
  editor.textContent = code;
}
