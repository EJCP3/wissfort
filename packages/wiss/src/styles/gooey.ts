// Fuses the pill and body <rect>s into one continuous blob instead of two
// shapes with a visible seam: blur the source, run it through a steep
// alpha-contrast color matrix (turns "close enough to touching" into "fully
// merged"), then composite the crisp shapes back in, clipped to that merged
// silhouette.
const SVG_NS = 'http://www.w3.org/2000/svg';

let hostSvg: SVGSVGElement | null = null;
const cache = new Map<number, string>();

/** The shared hidden <defs> every wiss filter is registered in. */
export function ensureFilterDefs(): SVGDefsElement {
  const defs = ensureHost().querySelector('defs');
  if (!defs) {
    throw new Error('wiss: filter host is missing its <defs>');
  }
  return defs as SVGDefsElement;
}

function ensureHost(): SVGSVGElement {
  if (hostSvg) return hostSvg;
  hostSvg = document.createElementNS(SVG_NS, 'svg');
  hostSvg.setAttribute('aria-hidden', 'true');
  hostSvg.setAttribute('data-wiss-filters', '');
  hostSvg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  const defs = document.createElementNS(SVG_NS, 'defs');
  hostSvg.append(defs);
  document.body.append(hostSvg);
  return hostSvg;
}

function createFilter(blur: number): string {
  const id = `wiss-gooey-${blur}`;
  const svg = ensureHost();
  const defs = svg.querySelector('defs');
  if (!defs) {
    throw new Error('wiss: gooey filter host is missing its <defs>');
  }

  const filter = document.createElementNS(SVG_NS, 'filter');
  filter.setAttribute('id', id);
  filter.setAttribute('x', '-20%');
  filter.setAttribute('y', '-20%');
  filter.setAttribute('width', '140%');
  filter.setAttribute('height', '140%');
  filter.setAttribute('color-interpolation-filters', 'sRGB');

  const feBlur = document.createElementNS(SVG_NS, 'feGaussianBlur');
  feBlur.setAttribute('in', 'SourceGraphic');
  feBlur.setAttribute('stdDeviation', String(blur));
  feBlur.setAttribute('result', 'blur');

  const feMatrix = document.createElementNS(SVG_NS, 'feColorMatrix');
  feMatrix.setAttribute('in', 'blur');
  feMatrix.setAttribute('mode', 'matrix');
  feMatrix.setAttribute('values', '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10');
  feMatrix.setAttribute('result', 'goo');

  const feComposite = document.createElementNS(SVG_NS, 'feComposite');
  feComposite.setAttribute('in', 'SourceGraphic');
  feComposite.setAttribute('in2', 'goo');
  feComposite.setAttribute('operator', 'atop');

  filter.append(feBlur, feMatrix, feComposite);
  defs.append(filter);
  return id;
}

export function getFilterId(blur: number): string {
  const cached = cache.get(blur);
  if (cached) return cached;
  const id = createFilter(blur);
  cache.set(blur, id);
  return id;
}
