import { removeToast } from '../core/store';

const SWIPE_THRESHOLD = 80;
const SWIPE_OPACITY_THRESHOLD = 150;

// Movement below this is too small to tell horizontal intent from vertical,
// so we hold off on committing to an axis.
const AXIS_LOCK_SLOP = 8;

export function setupSwipe(container: HTMLDivElement): void {
  let activeToast: HTMLElement | null = null;
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let isSwiping = false;
  // null = axis not decided yet.
  let axis: 'x' | 'y' | null = null;

  container.addEventListener('pointerdown', (e) => {
    // Solo permitir botón principal o toque
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const target = e.target as HTMLElement;
    const toast = target.closest('[data-wiss-id]') as HTMLElement;
    if (!toast) return;

    // Prevenir swipe si estamos saliendo o si es un action button
    if (
      toast.dataset.wissDestroying === 'true' ||
      toast.dataset.exiting === 'true' ||
      target.closest('[data-wiss-action]') ||
      target.closest('.island-action')
    ) return;

    activeToast = toast;
    startX = e.clientX;
    startY = e.clientY;
    currentX = startX;
    isSwiping = true;
    axis = null;

    // Deshabilitamos la transición temporalmente para que el swipe sea fluido e instantáneo
    activeToast.style.transition = 'none';

    // Capturamos el puntero para que no se pierda el evento al salir del elemento
    target.setPointerCapture(e.pointerId);
  });

  container.addEventListener('pointermove', (e) => {
    if (!isSwiping || !activeToast) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    // Decide the axis once, on the first movement big enough to read. Without
    // this, scrolling the page vertically from a touch that started on a
    // toast also dragged it sideways.
    if (axis === null) {
      // Guard the maths: a synthetic event missing clientY would make deltaY
      // NaN, and every comparison against NaN is false — which would classify
      // any gesture as vertical and disable swiping outright.
      const travelX = Number.isFinite(deltaX) ? Math.abs(deltaX) : 0;
      const travelY = Number.isFinite(deltaY) ? Math.abs(deltaY) : 0;

      if (Math.max(travelX, travelY) < AXIS_LOCK_SLOP) return;
      axis = travelX > travelY ? 'x' : 'y';
      if (axis === 'y') {
        // Vertical intent: hand the gesture back to the page scroller.
        activeToast.style.transition = '';
        activeToast = null;
        isSwiping = false;
        return;
      }
    }

    currentX = e.clientX;

    // Aplicar transformación visual
    // Usamos translateX para respetar la animacion por transformacion sin sobreescribirla por completo
    // Ya que usamos transition: none, se sentira rapido.
    activeToast.style.transform = `translateX(${deltaX}px)`;

    // Reducir opacidad suavemente
    const opacity = Math.max(0, 1 - Math.abs(deltaX) / SWIPE_OPACITY_THRESHOLD);
    activeToast.style.opacity = String(opacity);
  });

  const onPointerUpOrCancel = (e: PointerEvent) => {
    if (!isSwiping || !activeToast) return;

    const deltaX = currentX - startX;
    const toastId = activeToast.dataset.wissId;
    
    // Restaurar transiciones para la animación de cierre o rebote
    activeToast.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease';
    
    if (Math.abs(deltaX) > SWIPE_THRESHOLD && toastId) {
      // Remover. `wissSwiped` tells animateOut to skip its own exit
      // animation; `exiting` is only the CSS hook. Ojo: no marcar aquí
      // `wissDestroying`, o reconcile se saltaría el nodo y nunca lo quitaría.
      activeToast.dataset.wissSwiped = 'true';
      activeToast.dataset.exiting = 'true';
      const direction = deltaX > 0 ? 1 : -1;
      activeToast.style.transform = `translateX(${direction * 150}%)`;
      activeToast.style.opacity = '0';
      
      // Llamar a removeToast, esto disparará animateOut
      // No necesitamos manejar la transición de salida completa aquí, 
      // porque store llamará a removeToast y reconciliación hará el resto.
      // El setTimeout garantiza que la transición css se registre
      setTimeout(() => {
         removeToast(toastId);
      }, 0);
    } else {
      // Rebotar al centro
      activeToast.style.transform = '';
      activeToast.style.opacity = '';
      
      // Quitar los estilos inline después de la transición para devolver el control al CSS original
      const toastRef = activeToast;
      setTimeout(() => {
        if (toastRef && toastRef.dataset.exiting !== 'true') {
          toastRef.style.transition = '';
        }
      }, 300);
    }

    const target = e.target as HTMLElement;
    if (target.hasPointerCapture(e.pointerId)) {
      target.releasePointerCapture(e.pointerId);
    }

    activeToast = null;
    isSwiping = false;
    axis = null;
  };

  container.addEventListener('pointerup', onPointerUpOrCancel);
  container.addEventListener('pointercancel', onPointerUpOrCancel);
}
