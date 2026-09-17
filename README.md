# Nil Parra Luna — escritorio Windows 95

Web personal de **Nil Parra Luna** construida como una recreación interactiva de Windows 95:
un escritorio con ventanas, menús, iconos, barra de tareas y un disco virtual donde el
portfolio vive dentro del ordenador. Todo funciona de verdad **en el navegador**: no hay
backend, no hay máquina virtual y no se emula ninguna CPU.

> **Aviso de marca.** Windows es una marca registrada de Microsoft Corporation. Este proyecto
> es un homenaje no oficial, no está afiliado a Microsoft y **no redistribuye ningún recurso
> original de Microsoft**. Ver [Recursos gráficos](#recursos-gráficos-y-sustituciones).

---

## Índice

- [Puesta en marcha](#puesta-en-marcha)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Personalización del contenido](#personalización-del-contenido)
- [Idiomas](#idiomas)
- [Almacenamiento](#almacenamiento)
- [Aplicaciones incluidas](#aplicaciones-incluidas)
- [Atajos y accesibilidad](#atajos-y-accesibilidad)
- [Recursos gráficos y sustituciones](#recursos-gráficos-y-sustituciones)
- [Despliegue en GitHub Pages](#despliegue-en-github-pages)
- [Pruebas](#pruebas)
- [Estado y limitaciones conocidas](#estado-y-limitaciones-conocidas)
- [Créditos y licencia](#créditos-y-licencia)

---

## Puesta en marcha

Requisitos: Node.js 20 o superior y npm.

```bash
npm install       # dependencias
npm run assets    # genera iconos, cursores y fondos (se ejecuta solo con dev/build)
npm run dev       # servidor de desarrollo en http://localhost:5173
npm run build     # comprobación de tipos + build de producción en dist/
npm run preview   # sirve dist/ para probar el resultado final
npm test          # pruebas (vitest)
npm run typecheck # solo TypeScript
```

El build es completamente estático: `dist/` se puede publicar en cualquier hosting de archivos.

## Estructura del proyecto

```
scripts/                    generación de recursos (arte original, sin descargas)
  art/icons.mjs             40 iconos de 32x32 dibujados píxel a píxel
  art/cursors.mjs           12 cursores monocromos con su hotspot
  art/patterns.mjs          baldosas de fondo (anillos azules, trama, puntos)
  lib/                      encoder PNG propio, primitivas de dibujo y vectoriales
  generate-assets.mjs       escribe src/assets/generated, src/styles/cursors.generated.css
                            y hojas de revisión en qa/ (ignoradas por git)

src/
  core/
    window/                 gestor de ventanas: reducer, layout, arrastre, menú de sistema
    fs/                     disco virtual: IndexedDB, operaciones, semilla, portapapeles
    apps/                   catálogo de aplicaciones y lanzador
    i18n/                   catálogos es/ca/en y proveedor con Intl
    content/                CONTENIDO EDITABLE: perfil, proyectos, ayuda, marca, archivos
    prefs/                  preferencias (localStorage) y fondos de escritorio
    dialogs/                diálogos del sistema (mensajes, entrada, abrir/guardar, propiedades)
    sound/                  sonidos sintetizados con Web Audio
    desktop/                rejilla y elementos del escritorio
  ui/                       kit visual compartido (botones, campos, menús, pestañas, barras…)
  desktop/                  escritorio, barra de tareas, menú Inicio, reloj
  apps/                     una carpeta por aplicación
  styles/                   tokens, kit clásico, escritorio y estilos de aplicaciones
  shell/Shell.tsx           sesión completa: apagar, reiniciar, suspender, primer arranque
```

## Personalización del contenido

No hace falta tocar la lógica del escritorio: todo el contenido está en `src/core/content/`.

| Archivo | Qué se cambia |
| --- | --- |
| `profile.ts` | Nombre, correo, enlaces, presentación, formación, experiencia, conocimientos y la ruta del CV en PDF |
| `projects.ts` | Un objeto por proyecto: título, resumen, descripción, tecnologías, repositorio, demo y capturas |
| `help.ts` | Temas de la ventana de Ayuda |
| `branding.ts` | Nombre y versión que aparecen en la franja del menú Inicio y en el arranque |
| `portfolioFiles.ts` | Cómo se generan los archivos de `C:\Portfolio` a partir de lo anterior |

Los textos que aún no existen se escriben con el marcador `[PENDIENTE]` (`PLACEHOLDER`) y la
interfaz los muestra con una etiqueta amarilla: el sitio nunca presenta contenido inventado
como si fuera real. Los proyectos de ejemplo están marcados con `status: 'placeholder'`.

### CV en PDF

1. Copia el PDF a `public/cv/` (por ejemplo `public/cv/nil-parra-cv.pdf`).
2. En `profile.ts` define `cvUrl: 'cv/nil-parra-cv.pdf'` y, si quieres, `cvUpdatedAt`.
3. Mientras `cvUrl` sea `null`, el botón de descarga aparece explicando qué falta.

### Fondo de escritorio

Los fondos se eligen en el Panel de control. Las baldosas son SVG generados por
`scripts/art/patterns.mjs`; añadir una nueva es crear una entrada en `PATTERNS` y otra en
`src/core/prefs/wallpapers.ts` (con su clave de traducción).

## Idiomas

- Idiomas incluidos: **español (es)**, **catalán (ca)** e **inglés (en)**.
- En la primera visita se detecta el idioma del navegador; si no coincide con ninguno se usa
  el español.
- Se puede cambiar desde la ventana de Bienvenida y desde el Panel de control (pestaña
  Idioma). El cambio es inmediato, sin recargar y sin perder documentos abiertos.
- La preferencia se guarda y se aplica también al atributo `lang` del documento y al formato
  de fechas y horas (`Intl`).

Cómo añadir cadenas: `src/core/i18n/es.ts` es la fuente de verdad. `ca.ts` y `en.ts` están
tipados como `Record<TranslationKey, string>`, así que **si falta una traducción el build de
TypeScript falla** en lugar de mostrar la clave en pantalla. Los nombres de las carpetas del
sistema se traducen al mostrarse, pero sus identificadores y rutas internas son estables
(`C:\Documents` siempre es la misma carpeta). Los archivos que crea el visitante nunca se
traducen ni se renombran.

## Almacenamiento

- **IndexedDB** (`nilparra-win95`): archivos y carpetas del disco virtual, incluidos los
  binarios. El esquema está versionado (`DB_VERSION` en `src/core/fs/db.ts`).
- **localStorage**: solo preferencias pequeñas (idioma, fondo, sonido, accesibilidad),
  la distribución de ventanas y la posición de los iconos.
- Los datos **no salen del navegador**: no hay servidor, no hay analítica y no se sincronizan
  entre dispositivos. Si se borran los datos del sitio, se pierden.
- Los errores de escritura y de cuota se muestran como diálogos traducidos y **nunca se
  informa de un guardado que ha fallado**. Si la escritura no se completa, el indicador de
  cambios pendientes del Bloc de notas sigue activo.
- El espacio utilizado se muestra en el Panel de control y en Propiedades del sistema
  (`navigator.storage.estimate()`), y cualquier documento se puede exportar al equipo real
  desde el Bloc de notas, el Explorador o el menú contextual del escritorio.
- El contenido del portfolio (`C:\Portfolio`) es de solo lectura y se puede restaurar a su
  versión inicial desde el Panel de control. El resto del disco se puede restablecer por
  completo con una confirmación explícita.

## Aplicaciones incluidas

| Aplicación | Qué hace |
| --- | --- |
| Bienvenida | Presentación, accesos a Proyectos/Sobre mí/Contacto, cambio de idioma y opción de no abrirse al iniciar |
| Mi PC y Explorador | Navegación por el disco virtual con barra de dirección, vistas de iconos y detalles, ordenación, copiar/cortar/pegar, arrastrar a carpetas, importar y exportar archivos |
| Bloc de notas | Editor real con nuevo, abrir, guardar, guardar como, exportar, ajuste de línea, buscar, deshacer y aviso de cambios sin guardar |
| Mis proyectos | Fichas con descripción, tecnologías, capturas y enlaces (los que existan), y atajo a la carpeta del portfolio |
| Sobre mí y currículum | Presentación, formación, experiencia, conocimientos y descarga del CV cuando está publicado |
| Internet | Navegador de época para páginas internas; los enlaces externos se abren en una pestaña real y la ventana lo advierte |
| Correo | Muestra la dirección, la copia al portapapeles y abre el cliente de correo con `mailto`. No envía nada |
| Panel de control | Idioma, fondo, sonidos, accesibilidad, almacenamiento, restauración del portfolio, restablecer el disco y distribución de ventanas |
| Papelera de reciclaje | Lista lo eliminado, lo restaura a su carpeta original o lo borra definitivamente |
| Propiedades del sistema | Datos reales de la sesión (versión, navegador, almacenamiento) y dispositivos instalados |
| Buscar archivos | Búsqueda por nombre y por contenido, con ámbito y opción de subcarpetas, sobre el disco virtual |
| Calculadora | Operaciones, memoria, raíz, porcentaje, inverso y teclado |
| Paint | Lápiz, borrador, línea, rectángulo, elipse, relleno, paleta, grosores, deshacer y guardado en PNG dentro del disco |
| Buscaminas | Tres niveles, banderas, contadores, tiempo y fin de partida |
| Reproductor multimedia | Audio y vídeo del disco virtual con transporte, posición y volumen |
| Ejecutar | Abre aplicaciones por nombre o alias (`notepad`, `calc`, `explorer`, `control`, `papelera`…) |
| Símbolo del sistema | Comandos `DIR`, `CD`, `MD`, `RD`, `TYPE`, `COPY`, `MOVE`, `DEL`, `REN`, `CLS`, `VER`, `HELP`, `EXIT` sobre el disco virtual |
| Ayuda | Temas sobre el funcionamiento, el almacenamiento, los idiomas, el teclado y los créditos |

La consola **no ejecuta programas del sistema anfitrión**: solo opera sobre el disco virtual y
lo dice en su propia ventana.

## Atajos y accesibilidad

- `Entrar` abre el elemento seleccionado (iconos, listas, resultados de búsqueda).
- `F2` renombra, `Supr` elimina, `F5` actualiza, `Retroceso` sube de carpeta en el Explorador.
- `Ctrl+A`, `Ctrl+C`, `Ctrl+X` y `Ctrl+V` funcionan en el Explorador y en el Bloc de notas.
- `Ctrl+Esc` o la tecla Windows abren el menú Inicio. Los atajos reservados por el navegador
  o el sistema (por ejemplo `Alt+Tab`) **no se interceptan**.
- `Alt` o `Alt+letra` abren la barra de menús de la ventana activa; `Alt+Espacio` abre su menú
  de sistema, que incluye **Mover** y **Tamaño** con las flechas del teclado: son la
  alternativa a arrastrar con el ratón.
- Los diálogos atrapan el foco, `Escape` cancela y el foco vuelve a donde estaba.
- Panel de control → Accesibilidad: movimiento reducido y etiquetas de iconos con fondo
  sólido. También se respeta `prefers-reduced-motion`.
- En móvil los iconos se abren con un toque, la ventana activa ocupa el área disponible y se
  cambia de aplicación desde la barra de tareas.

## Recursos gráficos y sustituciones

**No se redistribuye arte de Microsoft.** Todo lo que se ve se genera desde cero:

| Recurso | Origen | Licencia |
| --- | --- | --- |
| 40 iconos de 32×32 y sus versiones de 16×16 | `scripts/art/icons.mjs` (arte original) | MIT (este repositorio) |
| 12 cursores monocromos con hotspot | `scripts/art/cursors.mjs` | MIT |
| Fondos de escritorio | `scripts/art/patterns.mjs`, exportados como SVG | MIT |
| Sonidos del sistema | `src/core/sound/sounds.ts`, sintetizados con Web Audio | MIT |
| Tipografía | Pila de fuentes del sistema (`Tahoma`, `MS Sans Serif`, `Segoe UI`…) | — (no se descarga ninguna fuente) |

Sustituciones conscientes respecto a la referencia:

- **Logotipo del botón Inicio**: se usa una marca propia (una «N» sobre placa biselada) en
  lugar del logotipo de Microsoft.
- **Franja del menú Inicio**: por defecto dice «Nil Parra 95» en lugar de la marca ajena. Se
  puede volver al texto literal de la referencia en `src/core/content/branding.ts`.
- **Iconos, cursores, sonidos y fondos**: recreaciones propias del estilo de la época, no
  copias de los archivos originales.
- **Barra superior con indicadores de CPU y disco** de la captura de referencia: no se
  reproduce, porque pertenece al emulador que aparece en la imagen y no al sistema.

Los iconos y cursores se regeneran con `npm run assets`, que además escribe hojas de revisión
(`qa/icons-sheet@2x.png`, `qa/cursors-sheet@3x.png`, `qa/pattern-*@3x.png`) para comparar el
resultado con la referencia.

## Despliegue en GitHub Pages

El flujo `.github/workflows/deploy.yml` compila y publica el sitio en cada `push` a `main`.

1. En el repositorio: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Si el sitio se publica en un subdirectorio (`https://usuario.github.io/repositorio/`), el
   workflow calcula la base automáticamente a partir del nombre del repositorio.
3. Para un dominio propio o un sitio de usuario, define la variable de repositorio
   `BASE_PATH` con el valor `/` (**Settings → Secrets and variables → Actions → Variables**).
4. El workflow añade `404.html` (copia de `index.html`) y `.nojekyll`, de modo que recargar
   cualquier ruta no da error.

Para probar en local con la misma base:

```bash
BASE_PATH=/mi-repositorio/ npm run build && npm run preview
```

## Pruebas

```bash
npm test     # 53 pruebas sobre reducer, disco virtual, traducciones y render de cada app
```

- `src/core/window/reducer.test.ts` — cascada de ventanas, foco, minimizar/restaurar,
  maximizar conservando el rectángulo, topes de arrastre y de tamaño, cambio de resolución.
- `src/core/window/layoutPersistence.test.ts` — la sesión anterior se recupera, las ventanas
  de aplicaciones que ya no existen se descartan y un layout corrupto no rompe el arranque.
- `src/core/desktop/iconLayout.test.ts` — rejilla de iconos, conflictos de posición y
  reasignación al cambiar el tamaño.
- `src/core/fs/vfsUtils.test.ts` — nombres prohibidos, conflictos de nombres, extensiones,
  tipos MIME, copia de subárboles y búsqueda.
- `src/core/fs/VfsProvider.test.tsx` — recorrido completo sobre IndexedDB: crear carpeta,
  guardar documento, renombrar, mover, papelera, restaurar, borrar definitivamente, búsqueda
  por nombre y por contenido, y protección del contenido del portfolio.
- `src/App.test.tsx` — render del escritorio completo, siembra del disco virtual, menú Inicio
  con `Ctrl+Esc` y aplicación del idioma guardado.
- `src/apps/apps.smoke.test.tsx` — cada aplicación se monta dentro de sus proveedores reales:
  detecta fallos de render, hooks mal usados y claves de traducción ausentes.

## Estado y limitaciones conocidas

- El escritorio muestra los iconos en vista de iconos grandes (como la referencia); no hay
  vista de iconos pequeños en el escritorio (sí en el Explorador).
- Arrastrar archivos **entre** ventanas distintas no está soportado: se arrastran dentro de la
  misma ventana, y para moverlos entre carpetas se usa cortar/pegar.
- No hay papelera de reciclaje del sistema operativo real: la exportación descarga el archivo
  directamente.
- Las barras de desplazamiento personalizadas son completas en navegadores basados en
  Chromium y Safari; en Firefox se usa la barra nativa con los colores clásicos.
- El tamaño de la interfaz no se puede escalar todavía; el zoom del navegador funciona
  correctamente.
- La consola solo implementa los comandos documentados arriba; no hay `FIND`, `ATTRIB` ni
  redirecciones.

## Créditos y licencia

Código, arte y sonidos: **Nil Parra Luna**, con licencia [MIT](LICENSE).

Referencias de estilo: la documentación pública y las capturas del aspecto de Windows 95.
Ninguna imagen, icono, sonido o fuente de Microsoft forma parte de este repositorio.
