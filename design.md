# Sistema visual

## Dirección

Las referencias de `docs/frontend-reference/` muestran una interfaz cálida, editorial y doméstica: fondo marfil, texto marrón, acentos salvia y durazno, tarjetas claras con borde fino y fotografía luminosa. Para **Servicios Verificables**, esa dirección se traduce en una experiencia confiable y cercana para trabajos del hogar, manteniendo el foco operativo de la aplicación.

La actualización actual se limita al **sistema de colores**. No cambia layout, jerarquía de componentes, espaciados, grids, radios ni comportamiento responsivo.

## Referencias

- `hero.png`: marca centrada, anuncio superior durazno, hero con marfil y fotografía clara, CTA salvia pálido y texto cacao.
- `categories.png`: iconografía lineal marrón, chips salvia/durazno y una banda crema con texto repetido de alta presencia.
- `ratings.png`: superficie crema elevada, tarjetas marfil con borde marrón fino, estrellas salvia y controles circulares suaves.

## Personalidad

- **Cálida**: la base evita blanco puro y usa marfiles con tinte crema.
- **Confiable**: el marrón oscuro reemplaza al negro como ancla principal.
- **Doméstica**: salvia, avena y durazno evocan cuidado, limpieza y servicio local.
- **Operativa**: los colores semánticos siguen siendo claros para estados, enlaces y verificación.

## Color

### Tokens principales

| Token CSS | Valor | Uso |
|---|---:|---|
| `--canvas` | `#fbf8ee` | Fondo global marfil. |
| `--surface` | `#fffaf0` | Tarjetas, formularios, inputs y paneles claros. |
| `--surface-muted` | `#f8efe1` | Chips, fondos de apoyo y superficies secundarias. |
| `--surface-hover` | `#f2eadc` | Hover de navegación y controles neutros. |
| `--stone` | `#f1e7d7` | Paneles destacados y superficies cálidas. |
| `--black` | `#4b3212` | Titulares y texto de máxima jerarquía. |
| `--ink` | `#5e431d` | Texto principal. |
| `--near-black` | `#3f2a12` | CTAs primarios, overlays y paneles oscuros. |
| `--muted` | `#7b6a50` | Metadatos, ayudas y texto secundario. |

### Acentos

| Token CSS | Valor | Uso |
|---|---:|---|
| `--green` | `#576d47` | Hover primario, bandas destacadas y confianza. |
| `--pale-green` | `#e3ebcd` | Íconos, badges de éxito y superficies salvia. |
| `--blue` | `#596f48` | Enlaces y referencias verificables; se conserva el nombre del token por compatibilidad. |
| `--pale-blue` | `#e8efe0` | Estado en progreso y fondos suaves de verificación. |
| `--coral` | `#ffd28a` | Chips activos y acento durazno. |
| `--soft-coral` | `#ead7a9` | Bordes de chips y taxonomía suave. |
| `--banner` | `#ffdda3` | Barra superior de anuncio. |

### Bordes y foco

| Token CSS | Valor | Uso |
|---|---:|---|
| `--border` | `#d5c3a8` | Bordes de tarjetas, inputs y paneles. |
| `--hairline` | `#ddcfba` | Separadores y reglas finas. |
| `--card-border` | `#eadfce` | Líneas internas de baja prioridad. |
| `--focus` | `#8ba271` | Focus ring accesible con carácter salvia. |

### Semántica

| Token CSS | Valor | Uso |
|---|---:|---|
| `--success` | `#536944` | Confirmación y verificación. |
| `--success-surface` | `#dfe8ca` | Fondo suave de éxito. |
| `--warning` | `#92581e` | Alertas, errores y estados pendientes. |
| `--warning-surface` | `#fff0d5` | Fondo suave de advertencia. |
| `--on-dark` | `#fffaf0` | Texto sobre marrón profundo o salvia oscura. |

### Movimiento

| Token CSS | Valor | Uso |
|---|---:|---|
| `--ease-out-quart` | `cubic-bezier(0.25, 1, 0.5, 1)` | Easing principal para microinteracciones. |
| `--button-tween` | `220ms var(--ease-out-quart)` | Tween de color para botones, CTAs y chips. |

## Aplicación por componente

### Navegación

- La barra de anuncio usa `--banner` con texto `--ink`, siguiendo la franja superior durazno de la referencia.
- El header usa `--canvas` translúcido y mantiene borde `--border`.
- El logo, la marca circular y los CTAs primarios usan `--near-black` para conservar autoridad sin recurrir a negro puro.
- Los CTAs oscuros invierten a contorno en hover: el relleno desaparece suavemente, queda el borde `--near-black` y se ve el fondo de página.

### Hero y media

- El canvas del hero permanece marfil.
- El contenedor de imagen conserva su estructura, pero la superficie base pasa a `--stone`.
- El panel flotante usa marrón profundo translúcido, no negro frío.

### Tarjetas

- Las tarjetas principales usan `--surface` y borde `--border`.
- Las métricas y separadores usan `--hairline`.
- El sistema evita sombras pesadas; la profundidad viene de contraste de superficies y borde fino.

### Chips y estados

- Los filtros usan fondo `--surface-muted` y borde `--soft-coral`.
- El estado activo usa `--coral`, similar a los botones durazno de productos.
- Los estados completados usan salvia; los estados en progreso usan salvia fría; los pendientes usan advertencia cálida.

### Botones

- Los botones primarios oscuros usan relleno `--near-black` en reposo y pasan a contorno del mismo color en hover.
- Los botones claros sobre superficies oscuras funcionan al revés: reposan como contorno claro y se rellenan con `--surface` en hover.
- El intercambio entre relleno, contorno y color de texto usa `--button-tween` para evitar cambios abruptos.
- En `prefers-reduced-motion: reduce`, la transición se reduce a una duración prácticamente instantánea.

### Enlaces y referencias Arkiv

- Los enlaces usan `--blue`, reinterpretado como verde oliva profundo para sostener contraste con la paleta.
- Las referencias Arkiv usan fondos salvia pálidos y borde mezclado con el color del enlace.

## Tipografía

La referencia usa un serif de marca para titulares y un sans cálido para navegación y cuerpo. La implementación actual mantiene las fuentes existentes para no ampliar el alcance de esta fase. Cuando se trabaje la siguiente iteración visual, los titulares pueden migrar a un serif editorial y el cuerpo a un sans humanista.

## Layout

No se modifica en esta actualización. Se conservan:

- La grilla hero actual.
- Las secciones, tablas y tarjetas existentes.
- Los radios, paddings y gaps actuales.
- El comportamiento responsive actual.

## Reglas

- No usar blanco puro como superficie dominante; preferir `--canvas` o `--surface`.
- No usar negro puro para texto o CTAs; preferir `--black` o `--near-black`.
- No introducir gradientes decorativos.
- No introducir nuevos colores fuera del sistema sin agregarlos como tokens.
- No usar color como único indicador de estado; mantener texto, íconos o etiquetas.
- Mantener contraste suficiente en texto, botones, inputs y referencias verificables.
- Mantener el patrón de hover relleno/contorno en CTAs y botones sin modificar tamaño, padding ni layout.
