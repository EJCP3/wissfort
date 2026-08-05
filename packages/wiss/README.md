# wissfort

Librería de notificaciones toast **headless** y sin dependencias de runtime. El
núcleo (`wiss`) es un "cerebro" de TypeScript puro —estado, cola, timers— que
no sabe nada del DOM ni de ningún framework. La capa visual es intercambiable:
trae seis temas propios (**dark**, **light**, **neon**, **pastel**, **brutal**,
**pop**) o puedes heredar el tema de tu proyecto con **shadcn/ui**
(`theme: 'shadcn'`) para que se adapte a tu diseño actual.



## Instalación

```bash
pnpm add wissfort
```

wissfort es **ESM only**: se importa con `import`, no con `require`. Su única
dependencia de runtime (`cuelume`) también lo es.

El CSS se inyecta solo, no tienes que importar nada. Si prefieres servirlo como
hoja de estilos —por ejemplo para evitar el flash inicial en SSR, o si tu CSP no
permite `style-src 'unsafe-inline'`— tienes el bundle completo disponible:

```js
import 'wissfort/styles.css';
```

## Uso básico (Vanilla JS)

```js
// una vez, en el entry point de tu app
import { toaster } from 'wissfort/vanilla';
toaster();
```

```js
// desde cualquier archivo
import { toast } from 'wissfort';

toast.success('Usuario creado');
toast.error('Algo salió mal');
toast.warning('Revisa este campo');
toast.info('Nueva actualización disponible');

// promesas
toast.promise(
  fetch('/api/users'),
  {
    loading: 'Cargando usuarios...',
    success: 'Usuarios cargados correctamente',
    error: 'Error al cargar usuarios',
  }
);
```

## Uso en Astro

```astro
---
// Layout.astro
---
<slot />
<script>
  import { toaster } from 'wissfort/vanilla';
  toaster();
</script>
```

Luego, desde cualquier componente o script del cliente:

```js
import { toast } from 'wissfort';
toast.success('¡Listo!');
```

## Temas y shadcn/ui

`theme` acepta exactamente estos valores (tipo `Theme`, exportado desde `wissfort`):

`'dark'` (por defecto) · `'light'` · `'neon'` · `'pastel'` · `'brutal'` · `'pop'` · `'shadcn'`

Cada uno tiene su regla `.wiss-theme-*` en la hoja de estilos que la librería inyecta sola.

Tres limitaciones conocidas:

- **Las variantes oscuras necesitan la estrategia `class`.** Las reglas
  `.dark .wiss-theme-*` requieren un ancestro con la clase `.dark` — lo que
  ponen Tailwind con `darkMode: 'class'`, next-themes y shadcn. Si tu proyecto
  usa `@media (prefers-color-scheme: dark)`, esas variantes no se activan.
- **Algunos temas piden fuentes que la librería no incluye**: `neon` usa
  Orbitron/Fira Code, `brutal` Inter, `pastel` Jua y `pop` Khand. Sin ellas cae
  a la fuente del sistema y el tema pierde carácter; cárgalas tú si quieres el
  aspecto original.
- **`brutal` y `pop` siguen saliendo redondeados en `format="wiss"`.** El radio
  de ese formato está fijado en el código porque también determina el radio del
  filtro que fusiona las dos formas SVG. En `format="island"` sí se respeta.

### Integración con shadcn/ui

Si usas **shadcn/ui** (en Tailwind v4 o usando variables de colores absolutas/hex/oklch), wiss ahora incluye soporte nativo. Configura `theme: 'shadcn'` y los toasts mapearán automáticamente sus colores a las variables de tu proyecto (como `--background`, `--foreground`, `--primary`, `--destructive`, etc.):

```js
import { toaster } from 'wissfort/vanilla';

toaster({
  theme: 'shadcn',
  position: 'bottom-right',
  duration: 4000,
});
```
*Nota: Si estás usando una versión más antigua de shadcn donde las variables solo exportan los valores HSL sueltos (ej. `0 0% 100%`), puedes seguir usando `theme: 'light'` o `'dark'` y mapear las variables `--wiss-*` en tu archivo `globals.css` envolviéndolas en la función `hsl()`.*

Si no necesitas integrarlo con shadcn/ui, simplemente no envíes la propiedad `theme` (o usa `'light'`/`'dark'`) y usará el tema predeterminado.

## Configuración de Tailwind CSS

Los temas de wiss traen clases utilitarias integradas en el código de la librería (`node_modules`). Para que los estilos se apliquen correctamente, debes indicarle a Tailwind que procese estos archivos.

### Para Tailwind CSS v4 (y DaisyUI 5)
En la versión 4, Tailwind utiliza una configuración basada en CSS. Simplemente añade la directiva `@source` en tu archivo CSS principal (donde importas tailwind) apuntando a la librería:

```css
/* app.css o globals.css */
@import "tailwindcss";
@source "../node_modules/wiss"; /* Ajusta la ruta si es necesario */
```

### Para Tailwind CSS v3 (y DaisyUI 4)
Si sigues usando la versión 3 de Tailwind, debes agregar la ruta de `wiss` al array `content` en tu archivo de configuración:

```js
// tailwind.config.js
export default {
  content: [
    './src/**/*.{astro,html,js,ts,vue,svelte,tsx}',
    './node_modules/wiss/dist/**/*.{js,mjs}',
  ],
  // ...
};
```

## Uso en React

```tsx
import { Toaster } from 'wissfort/react';
import { toast } from 'wissfort';

function App() {
  return (
    <>
      <Toaster position="bottom-right" theme="dark" />
      <button onClick={() => toast.success('¡Hecho!')}>Notify</button>
    </>
  );
}
```

## Uso en Vue

```vue
<script setup>
import { Toaster } from 'wissfort/vue';
import { toast } from 'wissfort';
</script>

<template>
  <Toaster position="bottom-right" theme="dark" />
  <button @click="toast.success('¡Hecho!')">Notify</button>
</template>
```

## Uso en Svelte

Para **Svelte 5**:
```svelte
<script>
  import { toaster } from 'wissfort/svelte';
  import { toast } from 'wissfort';

  $effect(() => toaster({ position: 'bottom-right', theme: 'dark' }));
</script>

<button onclick={() => toast.success('¡Hecho!')}>Notify</button>
```

Para **Svelte 3/4**:
```svelte
<script>
  import { onMount } from 'svelte';
  import { toaster } from 'wissfort/svelte';
  import { toast } from 'wissfort';

  onMount(() => toaster({ position: 'bottom-right', theme: 'dark' }));
</script>

<button on:click={() => toast.success('¡Hecho!')}>Notify</button>
```

## API

### Métodos (Methods)

| MÉTODO | DESCRIPCIÓN |
|---|---|
| `toast.success(mensaje, opciones?)` | Muestra un toast de éxito (color verde) |
| `toast.error(mensaje, opciones?)` | Muestra un toast de error (color rojo) |
| `toast.warning(mensaje, opciones?)` | Muestra un toast de advertencia (color amarillo) |
| `toast.info(mensaje, opciones?)` | Muestra un toast de información (color azul) |
| `toast.loading(mensaje, opciones?)` | Muestra un toast en estado de carga animado |
| `toast.show(mensaje, opciones?)` | Muestra un toast genérico (equivalente a info) |
| `toast.update(id, opciones)` | Actualiza el contenido, tipo u opciones de un toast existente |
| `toast.promise(promesa, msgs, opts?)` | Maneja automáticamente una promesa (carga → éxito/error) |
| `toast.dismiss(id)` | Oculta un toast específico utilizando su ID |
| `toast.clear()` | Elimina todos los toasts visibles en pantalla |
| `toast.history()` | Devuelve el array con el historial de notificaciones |
| `toast.clearHistory()` | Limpia el historial de notificaciones guardadas |

### Opciones por Toast (ToastOptions)

Estas opciones se pueden pasar como segundo argumento a cualquier método `toast.*(mensaje, opciones)`.

| PROPIEDAD | TIPO | DESCRIPCIÓN |
|---|---|---|
| `description` | `string \| HTMLElement` | Texto secundario o descripción detallada debajo del título |
| `duration` | `number` | Tiempo en milisegundos (ms) antes de desaparecer (ej. `4000`) |
| `position` | `Position` | Sobrescribe la posición global exclusivamente para este toast |
| `id` | `string` | Identificador único (útil para actualizarlo o cerrarlo manualmente) |
| `action` | `{ label, onClick }` | Añade un botón de acción (ej. Deshacer) dentro del toast |
| `progressBar` | `boolean` | Activa o desactiva la barra de progreso de tiempo animada |
| `icon` | `string \| HTMLElement \| SVG` | Reemplaza el ícono predeterminado por uno personalizado |
| `dismissOnAction` | `boolean` | Cierra el toast al pulsar el botón de acción (por defecto `true`) |
| `richText` | `boolean` | Renderiza el mensaje como HTML, pasándolo por el sanitizador interno |

### Qué permite `richText`

Con `richText: true` el mensaje y la descripción pasan por un sanitizador que
reconstruye el árbol desde cero. El contrato es:

- **Etiquetas permitidas:** `b`, `i`, `strong`, `em`, `u`, `code`, `span`, `br`, `a`.
  Cualquier otra se descarta conservando su texto.
- **Atributos permitidos:** `href`, `target`, `rel`, `class`. Todo lo demás
  —incluidos los `on*`— se elimina.
- **`style` no está permitido.** Permitirlo dejaba que un mensaje aplicara CSS
  arbitrario (`position:fixed;inset:0`) y tapara la página entera.
- **`href` solo acepta** `http:`, `https:`, `mailto:`, `tel:` y URLs relativas.
  El resto (`javascript:`, `data:`, `blob:`, `vbscript:`) se descarta.
- **Con `target` se fuerza `rel="noopener noreferrer"`**, aunque el input
  traiga otro `rel`, para evitar el *reverse tabnabbing*.

`icon` es la excepción deliberada: se inserta como HTML sin sanitizar para que
puedas pasar un SVG. Trátalo como código tuyo, nunca como dato de usuario.

## Roadmap
Fuera de alcance en esta fase, planeado para más adelante:

- Mejora del sitio web/Docs
- Demo de uso de los adaptadores para frameworks.
- Añadir nuevos formatos: customizados para usuarios que no usan daisyui ni shadcn/ui.
- Añadir nuevas animaciones y que esten en la documentación.
- Implementar mejoras en el rendimiento.
- Añadir nuevos iconos para las notificaciones.
- Añadir nuevos sonidos para las notificaciones.
- Añadr nuevos temas 


## Créditos

* **Diseño Visual:** La estética base (con efectos de *glassmorphism* y bordes suaves) está inspirada en el diseño de [Sileo UI](https://sileo.aaryan.design/).

* **Sonido de notificación** : los mini sonidos de las notificaciones son de [Cuelume](https://cuelume-site.pages.dev/)
