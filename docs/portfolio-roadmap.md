# Hoja de ruta del portfolio

Este documento es el backlog de publicación y el brief de contenido del portfolio de Nil Parra Luna. Está pensado para que otra persona pueda ejecutar el trabajo sin tener que adivinar qué es un dato real, qué falta preguntar y qué parte del sistema ya funciona.

La idea no es convertir el sitio en una web corporativa genérica. El escritorio retro es la personalidad del portfolio. El trabajo consiste en hacer que esa personalidad ayude a encontrar el trabajo, entenderlo y contactar con Nil, en vez de convertirse en una barrera para quien llega desde un móvil, un teclado, un buscador o un enlace compartido.

## Resumen ejecutivo

### Alcance cerrado de proyectos

La primera versión profesional tendrá exactamente estos dos proyectos:

1. **Wooster**. El propietario indica que existe en GitHub. La URL exacta y la visibilidad del repositorio aún están por confirmar.
2. **Antevue**. El código de implementación es cerrado. No se debe publicar ni enlazar el repositorio privado. Puede existir, si el propietario lo autoriza, un repositorio público independiente de presentación o showcase, pero todavía no existe un dato confirmado sobre su URL.

No se añade un tercer proyecto para llenar espacio. No se inventan stack, funciones, métricas, clientes, capturas, resultados, fechas, demos ni URLs. Un campo sin respuesta conserva un estado visible y honesto hasta que el propietario lo confirme.

### Prioridades

| Fase | Resultado | Qué la bloquea |
| --- | --- | --- |
| P0, publicación | Dos fichas reales, contenido personal aprobado, enlaces semánticos, traducciones completas, CV o estado claro, accesibilidad básica y release verificable | Datos y permisos del propietario, no una reescritura técnica |
| P1, calidad | Mejor experiencia móvil y de teclado, fichas de detalle compartibles, GitHub cuidado, SEO de páginas públicas y corrección de riesgos técnicos reproducidos | Decisión sobre el formato de enlaces directos y evidencia de cada hallazgo |
| P2, crecimiento | Casos de estudio más profundos, previews adicionales y medición opcional proporcional | Señales reales de uso o una necesidad concreta, no una lista de funcionalidades por defecto |

### Regla de evidencia

Este documento separa tres estados que no se deben mezclar:

- **Confirmado en la revisión previa**: se observó en el código o en los datos de esa revisión. Se debe revalidar cuando se vaya a editar, pero no es una hipótesis inventada.
- **Por reproducir**: una lectura estática sugiere un problema. No se puede describir como bug confirmado ni corregir a ciegas sin una prueba mínima.
- **Pendiente del propietario**: falta un dato editorial, un permiso o una decisión de publicación. El código no puede resolverlo.

La revisión previa pasó el typecheck y una comprobación de diff. También dejó una ejecución parcial de pruebas con 23 pruebas correctas y 1 fallo en Explorer, asociado a cambios locales anteriores. No se ejecutó la suite completa ni el build como parte de esa evidencia. Esta tarea es documental y no repite esas verificaciones. Por tanto, los resultados anteriores sirven para orientar el backlog, no para declarar una release lista.

## 1. Objetivos y público

### Objetivo principal

En menos de un minuto, una persona que no conoce a Nil debe poder responder estas preguntas:

- ¿Quién es Nil y qué está estudiando o buscando?
- ¿Qué dos proyectos puede revisar ahora?
- ¿Qué hizo Nil en cada proyecto y qué evidencia puede consultar?
- ¿Dónde puede ver código, presentación o demo, si existen?
- ¿Cómo puede contactar con él?

El visitante debe poder llegar a esas respuestas desde el escritorio retro, pero también desde enlaces directos y desde un móvil. La estética es una capa de interacción, no una condición para entender el contenido.

### Públicos prioritarios

| Público | Necesita encontrar | Riesgo que hay que evitar |
| --- | --- | --- |
| Persona reclutadora o de prácticas | Presentación breve, experiencia, CV, proyectos y contacto | Tener que jugar con el escritorio para descubrir datos básicos |
| Revisor técnico | Código, decisiones, alcance, límites y evidencia de cada proyecto | Confundir un repositorio privado con código inexistente o atribuir resultados no demostrados |
| Profesorado o evaluador | Contexto, formación, papel de Nil y aprendizaje | Fichas promocionales sin contexto ni fuentes |
| Visitante casual | Una entrada rápida y una explicación de cómo usar el sitio | Quedar atrapado en ventanas, diálogos o contenido de relleno |
| Usuario de móvil o teclado | Navegación completa sin ratón y sin desplazamiento horizontal | Dependencia de doble clic, hover, puntero fino o ventanas que se salen de la pantalla |

### Objetivos de producto

- Mantener el escritorio Windows 95 como firma visual.
- Hacer visibles desde el primer acceso las acciones `Mis proyectos`, `Sobre mí y currículum` y `Contacto`.
- Dar a cada proyecto una ficha breve, factual y escaneable.
- Diferenciar claramente código público, showcase público, código privado, presentación, demo disponible y enlace aún no confirmado.
- Completar `es`, `ca` y `en` sin claves rotas ni textos que parezcan traducciones automáticas sin revisar.
- Permitir que una persona llegue directamente a un proyecto cuando exista una necesidad real de compartirlo.
- Conservar el modelo actual de seguridad y privacidad: no hay backend, no se guardan documentos del visitante en un servidor y no se expone código privado por accidente.
- Medir solo lo que ayude a decidir el siguiente paso. La analítica no es un requisito de publicación.

### No objetivos

- No crear un CMS, un backend, una base de datos pública o una arquitectura de contenidos nueva.
- No sustituir el escritorio por una landing convencional en P0.
- No añadir más proyectos hasta que Wooster y Antevue estén documentados.
- No hacer público el código cerrado de Antevue.
- No publicar una URL de demo o de GitHub solo porque el campo exista en el modelo.
- No activar el despliegue automático a cada push mientras la política de `AGENTS.md` mantenga el workflow manual.
- No añadir una herramienta de analítica, un banner de cookies o un formulario de contacto sin una razón concreta y una revisión de privacidad.

## 2. Base técnica que se conserva

La revisión previa encontró una división razonable entre `providers`, `core`, `apps` y `ui`, un reducer puro para el gestor de ventanas, IndexedDB versionada para el disco virtual, contenido centralizado y SEO generado desde `PROFILE`. El plan parte de esa base. No hace falta reescribirla.

### Mapa de fuentes relevantes

| Archivo o carpeta | Uso en este roadmap |
| --- | --- |
| `src/core/content/profile.ts` | Nombre, bio, estudios, experiencia, skills, extras, contacto y CV. También alimenta el dato estructurado SEO. |
| `src/core/content/projects.ts` | Fuente de verdad de las dos fichas de proyecto. Actualmente contiene tres placeholders. |
| `src/core/content/types.ts` | `Localized`, `PLACEHOLDER`, selección de idioma y contratos compartidos. |
| `src/core/content/portfolioFiles.ts` | Archivos derivados que aparecen dentro de `C:\Portfolio`. Debe mantenerse sincronizado con el contenido público. |
| `src/core/i18n/es.ts` | Catálogo fuente de la interfaz. `ca.ts` y `en.ts` deben mantener la misma forma tipada. |
| `src/apps/projects/ProjectsApp.tsx` | Tarjetas, metadatos, enlaces y acceso a los archivos de proyectos. |
| `src/apps/about/AboutApp.tsx` | Perfil, formación, experiencia, skills, extras y descarga del CV. |
| `src/core/apps/catalog.ts` | Tamaños, nombres y accesos de las aplicaciones del escritorio. |
| `src/core/window/` | Ventanas, foco, z-order, viewport, persistencia y modo compacto. |
| `src/core/fs/` | Disco virtual de IndexedDB, papelera, restauración y archivos derivados. |
| `vite.config.ts` | `VITE_BASE`, `VITE_SITE_URL` y structured data generado desde `PROFILE`. |
| `index.html` | Metadata de la página única y marcadores `%SITE_URL%` y `%STRUCTURED_DATA%`. |
| `public/CNAME`, `public/robots.txt`, `public/sitemap.xml` | Reflejan el dominio canónico y se deben modificar juntos. |
| `scripts/` y `npm run assets` | Arte generado. No editar a mano archivos generados si el cambio pertenece al generador. |
| `.github/workflows/ci.yml` | Typecheck, auditoría, búsqueda de patrones inseguros, pruebas y build en CI. |
| `.github/workflows/deploy.yml` | Publicación manual en GitHub Pages. No volver a añadir `push` sin una decisión explícita. |

### Flujo de contenido

El contenido debe seguir este recorrido:

```text
respuesta aprobada del propietario
        |
        +--> src/core/content/projects.ts
        +--> src/core/content/profile.ts
        +--> src/core/i18n/*.ts
                    |
                    +--> ProjectsApp / AboutApp / Mail
                    +--> C:\Portfolio mediante portfolioFiles.ts
                    +--> SEO desde vite.config.ts y PROFILE
```

No se deben copiar textos de proyecto directamente dentro de `ProjectsApp`, ni escribir una segunda versión del perfil en `index.html`. Si un dato se muestra en el escritorio, el archivo de contenido correspondiente es su fuente.

### Contratos que no deben romperse

- `es.ts` sigue siendo la fuente de verdad de las claves de interfaz. Una clave que falte en `ca.ts` o `en.ts` debe hacer fallar el typecheck, no producir una cadena vacía silenciosa.
- Los textos de proyectos y perfil deben estar localizados en los tres idiomas. Los nombres propios, tecnologías, URLs y nombres de repositorio no se traducen.
- `PROFILE` sigue siendo la fuente del structured data de la página principal. No se añade JSON-LD escrito a mano en `index.html`.
- `index.html` conserva exactamente un `%STRUCTURED_DATA%` y al menos un `%SITE_URL%`.
- `VITE_SITE_URL`, `public/CNAME`, `public/robots.txt` y `public/sitemap.xml` deben seguir apuntando al mismo dominio canónico.
- El contenido visible no se renderiza como HTML arbitrario. Los enlaces externos mantienen validación y `noopener noreferrer` cuando corresponda.
- Los archivos de `C:\Portfolio` son derivados y se restauran desde `src/core/content`. No deben convertirse en una fuente editorial paralela.

## 3. Estado editorial de partida

### Bloqueantes confirmados en la revisión previa

Estos puntos se observaron en el snapshot revisado. La implementación debe volver a mirarlos al empezar, pero no se deben perder del backlog.

| Estado | Evidencia | Impacto | Salida esperada |
| --- | --- | --- | --- |
| Confirmado | `src/core/content/projects.ts:33-109` contiene tres entradas `placeholder-*`, con títulos `Proyecto 1`, `Proyecto 2` y `Proyecto 3` | La aplicación no representa los dos proyectos reales | Sustituir las tres entradas por exactamente Wooster y Antevue, sin dejar una tercera tarjeta de relleno |
| Confirmado | `PROFILE.cvUrl` y `PROFILE.cvUpdatedAt` son `null` en `src/core/content/profile.ts:72-75` | No existe descarga de CV publicada | Publicar un PDF aprobado y su fecha, o mostrar de forma explícita que todavía no hay CV público |
| Confirmado | `PROFILE.experience` ocupa `src/core/content/profile.ts:190-209` y solo describe el puesto de forma general | La experiencia no muestra responsabilidades, herramientas ni aportación verificable | Preguntar y completar solo lo que el propietario pueda sostener |
| Confirmado | `PROFILE.skills` está vacío y `PROFILE.extras` no tiene elementos en `src/core/content/profile.ts:211-216` | Las secciones se ocultan, aunque son relevantes para una lectura profesional | Añadir skills y extras confirmados, sin porcentajes decorativos por defecto |
| Confirmado | `ProjectsApp.tsx:149-168` representa `repoUrl` y `demoUrl` nulos como `PENDIENTE` | No se distingue entre privado, inexistente, no decidido y enlace pendiente | Introducir estados semánticos de enlace o una solución equivalente y pequeña |
| Confirmado | `ProjectsApp.tsx:190` utiliza `about.addHint` como footer | Una ventana de proyectos apunta a una instrucción de edición del perfil | Crear una clave de proyectos apropiada o eliminar el hint del estado publicado |
| Confirmado | `portfolioFiles.ts` genera repositorio y demo como `[PENDIENTE]`, y no tiene campo de presentación | El espejo de archivos no puede explicar bien el estado de Antevue ni ofrecer los tres tipos de enlace | Actualizar el formato derivado junto con el modelo, sin inventar URLs |
| Confirmado | `portfolioFiles.ts:251` contiene la errata catalana `fer Serva com a.` | Un texto que se entrega al visitante tiene una instrucción incorrecta | Corregirlo a una frase catalana revisada, por ejemplo `fer servir "Anomena i desa"` |
| Confirmado | Existe `slug` y `findProject`, pero la arquitectura documentada no tiene router ni una ruta de detalle pública | Un slug interno no equivale a un enlace compartible | Elegir de forma gradual entre query/hash y rutas reales. No publicitar una ruta antes de implementarla |

### Hallazgos técnicos estáticos que hay que reproducir

La siguiente tabla no afirma que haya un bug en producción. Solo registra una sospecha concreta, una prueba de reproducción y el criterio para decidir.

| Estado | Lugar observado | Sospecha | Reproducción mínima | Criterio |
| --- | --- | --- | --- | --- |
| Por reproducir | `src/core/fs/VfsProvider.tsx:334-424` | `trash` mueve el nodo seleccionado a la papelera, mientras `collectSubtree` solo recorre hijos con estado `deleted`; podría quedar un subárbol huérfano o incoherente | Crear una carpeta con un archivo y una subcarpeta profunda. Enviar la carpeta a la papelera. Inspeccionar la papelera, restaurar, vaciarla y recargar. Revisar también el estado de IndexedDB en un test controlado | Todos los descendientes deben seguir la semántica de la carpeta padre. Restaurar y destruir no deben dejar nodos ni blobs inaccesibles |
| Por reproducir | `src/core/window/reducer.ts:114-119` | `maximize` asigna `state.nextZ` pero no incrementa `nextZ`; dos ventanas maximizadas podrían compartir z-index | Abrir dos ventanas, maximizar ambas en distinto orden y observar z-order, foco y siguiente ventana abierta | Cada foco o acción que eleva una ventana debe conservar un orden determinista y sin empates |
| Por reproducir | `src/core/window/layoutPersistence.ts:61-93` | La validación acepta más formas de las necesarias y no comprueba todos los números finitos de rect, mínimos y z | Alimentar `loadWindowLayout` con registros parciales, `NaN`, `Infinity`, valores negativos, objetos anidados inválidos y estados desconocidos mediante fixtures de test | Los datos inválidos se descartan o normalizan a un estado seguro sin romper el arranque ni introducir rectángulos imposibles |
| Por reproducir | `src/styles/reset.css:55-57` y `src/styles/win95.css:209-211` | Se elimina el outline global y el estilo de foco visible del campo; Checkbox y otros controles podrían quedar sin indicación de foco | Recorrer con Tab todos los controles de bienvenida, proyectos, perfil, menús, diálogos, checkbox y enlaces, con pantalla normal y alto contraste | Siempre se ve qué elemento tiene foco. El estilo debe seguir pareciendo Win95, pero no puede depender del ratón |
| Por reproducir | `WindowManagerProvider.tsx:83-94` | El estado `compact` inicial consulta solo `pointer: coarse`; el ancho pequeño se aplica al primer resize, no necesariamente al primer render | Cargar directamente en un viewport estrecho con puntero fino o emulado y observar el primer paint antes de redimensionar | El modo compacto se decide con ancho y puntero desde el primer render, o el layout inicial no debe romperse |
| Por reproducir | `public/manifest.webmanifest` y configuración `VITE_BASE` / `VITE_SITE_URL` | El manifest usa rutas absolutas como `/icon-192.png`, `/` y `/` como `start_url` y `scope`; podrían fallar en un project site o quedar incoherentes con el build | Ejecutar el build con dominio raíz y con un `VITE_BASE` de proyecto. Revisar manifest, iconos, start URL, scope, canonical, sitemap y navegación al abrir una URL directa | Todos los recursos resuelven bajo el base path elegido y el dominio canónico no cambia por accidente |
| Por reproducir | `docs/security.md:31` frente a `src/apps/internet/InternetApp.tsx:402-408` | La documentación dice que los iframes no permiten popups, pero el sandbox actual incluye `allow-popups` y `allow-popups-to-escape-sandbox` | Confirmar el comportamiento real de un sitio embebido y decidir si la política deseada es permitir o bloquear popups | Código y documentación describen la misma política. Si se cambia el sandbox, repetir pruebas de Internet y de enlaces externos |

### Evidencia que no se debe presentar como vigente

- El typecheck y la comprobación de diff pasaron en la revisión previa.
- La ejecución parcial dejó 23 pruebas correctas y 1 fallo en Explorer relacionado con cambios locales anteriores.
- No hay evidencia de suite completa y build exitosos para el estado actual de este roadmap.
- No se han vuelto a ejecutar pruebas para crear este documento.

La primera tarea de implementación debe revalidar el estado del árbol y ejecutar las comprobaciones adecuadas antes de atribuir cualquiera de esos resultados a la versión nueva.

## 4. Fichas de proyecto y reglas de verdad

### Estructura mínima de una ficha

Cada proyecto debe tener, como mínimo, estos bloques. El texto final puede usar una tarjeta en P0 y una vista de detalle en P1, pero la información debe existir con esta estructura.

1. **Identidad**: nombre oficial, slug estable, año o periodo si está confirmado y estado de publicación.
2. **Resumen**: una frase que explique qué es y para quién, sin lenguaje promocional vacío.
3. **Contexto**: problema, necesidad o encargo, solo si el propietario lo confirma.
4. **Papel de Nil**: qué hizo él y qué partes no hizo, si hubo equipo o código previo.
5. **Trabajo realizado**: funciones, decisiones y límites verificables.
6. **Tecnologías**: solo herramientas realmente utilizadas y aprobadas para publicar.
7. **Evidencia**: capturas, presentación, demo, repositorio o explicación. Cada pieza debe tener permiso y texto alternativo.
8. **Resultado o aprendizaje**: resultado medible solo si existe una fuente; si no, explicar aprendizaje o estado sin fabricar una métrica.
9. **Enlaces**: código, presentación y demo con etiquetas distintas y estados honestos.
10. **Privacidad y derechos**: datos de terceros, capturas, marcas, licencia y restricciones de publicación.

### Estados de enlace

Un enlace nulo no debe obligar a la interfaz a adivinar qué significa. El modelo puede usar campos explícitos o una estructura pequeña equivalente, pero el comportamiento debe ser este:

| Estado | Texto visible recomendado | ¿Lleva `href`? | Uso |
| --- | --- | --- | --- |
| Disponible | `Ver código`, `Ver presentación` o `Abrir demo` | Sí, después de verificar la URL | El destino existe y el propietario lo aprobó |
| Código privado | `Código privado` | No, salvo que el propietario autorice un destino distinto | Antevue y cualquier implementación que no deba exponerse |
| Showcase público | `Ver showcase` o `Ver presentación del proyecto` | Sí | Repositorio independiente que no pretende ser la implementación privada |
| Sin enlace público | `Sin demo pública` o texto equivalente localizado | No | La ausencia es intencional y conocida |
| Por confirmar | `Enlace por confirmar` | No | Falta una respuesta del propietario; no debe aparecer como una promesa de disponibilidad en una release final |

`PENDIENTE` puede servir durante la fase editorial, pero no debe esconder la diferencia entre un repositorio privado y un dato que simplemente se olvidó. En la publicación P0, cada campo debe estar confirmado o tener un estado deliberado.

### Contrato de contenido para una tarjeta

La tarjeta de P0 debe priorizar, en este orden:

1. Nombre y resumen.
2. Periodo o estado, si está confirmado.
3. Papel de Nil o una frase de contexto.
4. Tecnologías aprobadas.
5. Enlaces disponibles y estados de los que no son públicos.
6. Una evidencia visual con alt, si existe.
7. Un acceso claro al detalle cuando se implemente.

La tarjeta no debe comenzar con un párrafo largo, una lista de dependencias o tres badges que no aportan información. El visitante debe poder decidir si abrir la ficha sin leer toda la historia.

### Plantilla de caso de estudio

Esta plantilla se rellena primero en español y luego se traduce. Los corchetes no son texto publicable.

```text
Título oficial: [PENDIENTE DE CONFIRMAR]
Slug estable: [PENDIENTE DE APROBAR]
Periodo o año: [PENDIENTE DE CONFIRMAR]
Estado: [publicado / en desarrollo / archivado, solo si se confirma]

Resumen de una frase:
[Qué es, para quién y qué problema aborda. No añadir funciones no confirmadas.]

Contexto:
[Por qué se hizo y cuál era la situación inicial.]

Mi papel:
[Qué partes hizo Nil, con qué grado de responsabilidad y si existía equipo.]

Qué se construyó:
- [Hecho confirmado 1]
- [Hecho confirmado 2]
- [Límite o decisión confirmada]

Tecnologías:
- [Solo tecnologías confirmadas]

Resultado o aprendizaje:
[Resultado con fuente o aprendizaje concreto. No inventar métricas.]

Evidencia:
- Código: [URL o estado semántico]
- Presentación: [URL o estado semántico]
- Demo: [URL o estado semántico]
- Capturas: [rutas, permisos y alt pendientes]

Licencia y permisos:
[Qué puede publicarse y bajo qué licencia, si aplica.]
```

## 5. Ficha inicial de Wooster

### Datos conocidos y límites

| Campo | Estado actual | Qué falta |
| --- | --- | --- |
| Nombre mostrado | `Wooster`, declarado por el propietario | Confirmar capitalización y nombre oficial |
| Existencia en GitHub | El propietario indica que lo tiene en GitHub | URL exacta del repositorio |
| Visibilidad | Por confirmar | Confirmar si es público, privado o tiene otra restricción |
| Repositorio de implementación | Por confirmar | No usar el GitHub personal ni una búsqueda aproximada como sustituto |
| Presentación | Por confirmar | URL real o decisión de que no habrá una |
| Demo | Por confirmar | URL real, o confirmar que no hay demo pública |
| Resumen | Pendiente | Una frase aprobada |
| Descripción | Pendiente | Contexto, papel, trabajo y aprendizaje |
| Tecnologías | Pendiente | Lista basada en el proyecto real |
| Año o periodo | Pendiente | Fecha que el propietario quiera publicar |
| Capturas y alt | Pendiente | Archivos autorizados y descripciones localizadas |
| Licencia | Pendiente | Confirmar licencia del repositorio público, si corresponde |

No se debe asumir que el repositorio enlazado desde el perfil `github.com/nilparra-dev` es Wooster. La URL del proyecto debe venir del propietario o de una confirmación inequívoca posterior.

### Ficha a completar

- **Título**: Wooster, sujeto a confirmación de escritura exacta.
- **Slug**: se propone `wooster` por estabilidad, pero no se publica como contrato hasta aprobarlo.
- **Resumen**: `[PENDIENTE DE CONFIRMAR]`.
- **Problema o contexto**: `[PENDIENTE DE CONFIRMAR]`.
- **Papel de Nil**: `[PENDIENTE DE CONFIRMAR]`.
- **Funciones que se pueden mencionar**: `[PENDIENTE DE CONFIRMAR]`.
- **Decisiones técnicas**: `[PENDIENTE DE CONFIRMAR]`.
- **Tecnologías**: `[PENDIENTE DE CONFIRMAR]`.
- **Resultado o aprendizaje**: `[PENDIENTE DE CONFIRMAR]`.
- **Código**: `[PENDIENTE: URL exacta y visibilidad]`.
- **Presentación**: `[PENDIENTE: URL o ausencia deliberada]`.
- **Demo**: `[PENDIENTE: URL o ausencia deliberada]`.
- **Capturas**: `[PENDIENTE: permiso, archivos y alt]`.
- **Licencia**: `[PENDIENTE DE CONFIRMAR]`.

### Criterios de aceptación de Wooster

- [ ] El propietario confirma la URL exacta y la visibilidad del repositorio.
- [ ] La URL abre el repositorio correcto desde una sesión sin datos previos, si el repositorio debe ser público.
- [ ] El README del repositorio explica el proyecto con datos que coinciden con la ficha.
- [ ] La lista de tecnologías procede del repositorio o de una respuesta del propietario, no de una inferencia por nombres de archivos.
- [ ] El enlace se etiqueta como código solo si muestra código que se puede revisar. Si es un repositorio de presentación, se etiqueta como showcase.
- [ ] La demo solo aparece como `Abrir demo` después de comprobar que la URL carga y que se permite compartirla.
- [ ] No quedan frases de plantilla, `Proyecto 1`, `PENDIENTE` sin resolver ni resultados genéricos en la ficha publicada.
- [ ] El texto es equivalente en `es`, `ca` y `en`, con revisión humana de los tres idiomas.

## 6. Ficha inicial de Antevue

### Datos conocidos y límites

| Campo | Estado actual | Qué falta |
| --- | --- | --- |
| Nombre mostrado | `Antevue`, declarado por el propietario | Confirmar capitalización y nombre oficial |
| Implementación | Código cerrado, confirmado por el encargo | Confirmar qué puede describirse sin revelar información reservada |
| Repositorio de implementación | No se publica | No convertir el repositorio privado en enlace de frontend |
| Showcase público independiente | Estrategia propuesta, todavía no creado o confirmado | Decidir si se autoriza, crear URL solo después de crearlo |
| Presentación | Por confirmar | URL real o decisión de ausencia |
| Demo | Por confirmar | URL real, acceso restringido o ausencia pública |
| Resumen | Pendiente | Una frase aprobada |
| Descripción | Pendiente | Contexto, papel, alcance y aprendizaje publicables |
| Tecnologías | Pendiente | Solo las que el propietario autorice revelar |
| Año o periodo | Pendiente | Fecha aprobada |
| Capturas y alt | Pendiente | Revisar datos, marcas, clientes y permisos |
| Licencia del showcase | Pendiente | Elegirla de forma explícita si se publica código o materiales reutilizables |

El estado `cerrado` no significa que Antevue no pueda aparecer en el portfolio. Significa que la página debe explicar la restricción sin prometer acceso al código. Una demo desplegada tampoco vuelve privado el frontend que el navegador recibe. Cualquier código o dato enviado al navegador puede ser inspeccionado por el visitante.

### Estrategia de repositorios

Si el propietario lo aprueba, Antevue puede tener dos repositorios con funciones distintas:

1. **Implementación privada**: permanece privada. No se enlaza desde la ficha pública, no se copia a un repositorio showcase y no se incluyen secretos, dependencias privadas, datos de clientes ni fragmentos que las condiciones de trabajo prohíban publicar.
2. **Showcase público independiente**: contiene únicamente material autorizado para enseñar el proyecto. Puede incluir README, capturas aprobadas, una explicación de decisiones, un diagrama no sensible, ejemplos sintéticos o una demo pública, pero no se presenta como la implementación completa si no lo es.

El nombre, el README, la descripción del perfil y el texto de la ficha deben dejar clara esa diferencia. No se debe enlazar un showcase con el texto `Ver código fuente` si el repositorio no contiene la implementación que el visitante espera revisar.

### Ficha a completar

- **Título**: Antevue, sujeto a confirmación de escritura exacta.
- **Slug**: se propone `antevue` por estabilidad, pero no se publica como contrato hasta aprobarlo.
- **Resumen**: `[PENDIENTE DE CONFIRMAR]`.
- **Contexto**: `[PENDIENTE DE CONFIRMAR Y DE REVISIÓN DE CONFIDENCIALIDAD]`.
- **Papel de Nil**: `[PENDIENTE DE CONFIRMAR]`.
- **Funciones publicables**: `[PENDIENTE DE CONFIRMAR]`.
- **Tecnologías publicables**: `[PENDIENTE DE CONFIRMAR]`.
- **Resultado o aprendizaje**: `[PENDIENTE DE CONFIRMAR]`.
- **Código de implementación**: `Código privado`, sin `href` público.
- **Showcase**: `[PENDIENTE: repositorio independiente, URL y alcance]`.
- **Presentación**: `[PENDIENTE: URL o ausencia deliberada]`.
- **Demo**: `[PENDIENTE: URL, restricción de acceso o ausencia deliberada]`.
- **Capturas**: `[PENDIENTE: permiso y revisión de información sensible]`.
- **Licencia del material público**: `[PENDIENTE DE CONFIRMAR]`.

### Criterios de aceptación de Antevue

- [ ] La ficha dice de forma explícita que el código de implementación es privado.
- [ ] No hay URL, nombre de rama, token, captura o texto que revele el repositorio privado o información reservada.
- [ ] Si se crea un showcase, tiene una URL distinta y una finalidad descrita en su README.
- [ ] El showcase no se presenta como código de implementación si solo contiene documentación o material seleccionado.
- [ ] La licencia del material público aparece en el repositorio y en la ficha cuando corresponda. No se oculta en un comentario del frontend.
- [ ] La demo, si existe, se prueba como visitante y se revisa qué datos y código entrega al navegador.
- [ ] El propietario aprueba cada captura, nombre de cliente, logotipo, dominio, dato de usuario y fragmento de configuración.
- [ ] Las traducciones mantienen `Código privado` y no lo convierten en una promesa de acceso.

## 7. Preguntas concretas para el propietario

Conviene resolver estas preguntas en una sola ronda. Las respuestas deben guardarse junto al trabajo editorial o en el issue de implementación, no quedar solo en una conversación informal.

### Identidad y publicación

1. ¿Cuál es el nombre oficial exacto de Wooster y Antevue, incluida la capitalización?
2. ¿Quieres que ambos aparezcan en la primera publicación o alguno debe quedar en borrador?
3. ¿Qué año o periodo puede publicarse para cada uno?
4. ¿Se puede indicar si fueron personales, académicos, profesionales o de equipo?
5. ¿Qué parte hizo Nil en cada proyecto?
6. ¿Hay colaboradores, clientes, centros o marcas que deban mencionarse, omitirse o anonimizarse?
7. ¿Hay información que parezca inocua pero que no deba salir en una captura o README?

### Wooster

8. ¿Cuál es la URL exacta de su repositorio de GitHub?
9. ¿El repositorio es público ahora? Si no, ¿debe ser público antes de publicar la ficha?
10. ¿El repositorio contiene la implementación completa, un prototipo, una parte del proyecto o documentación?
11. ¿Cuál es el resumen de Wooster en una frase para alguien no técnico?
12. ¿Qué problema o necesidad aborda?
13. ¿Qué tareas concretas realizó Nil?
14. ¿Qué funciones se pueden mencionar sin interpretar el código?
15. ¿Qué tecnologías se pueden listar con seguridad?
16. ¿Qué resultado o aprendizaje se puede sostener? ¿Existe una medida, enlace o evidencia?
17. ¿Hay una presentación, vídeo o demo pública? Facilitar la URL exacta o confirmar que no existe.
18. ¿Se pueden publicar capturas? ¿Quién autoriza cada una y qué alt debería tener?
19. ¿Qué licencia tiene el repositorio? Si no tiene, ¿se quiere añadir una?

### Antevue

20. ¿Qué resumen público se puede dar sin revelar información del producto, cliente o implementación?
21. ¿Qué papel tuvo Nil y qué partes no debe atribuirse?
22. ¿Qué tecnologías o decisiones técnicas se pueden nombrar?
23. ¿Se puede mencionar el contexto o debe quedar genérico?
24. ¿Existe una presentación pública aprobada?
25. ¿Existe una demo pública o una demo con acceso controlado? ¿Qué puede ver una persona externa?
26. ¿Se autoriza crear un repositorio showcase independiente?
27. Si se autoriza, ¿qué materiales puede contener: README, capturas, diagrama, ejemplos sintéticos, vídeo o código parcial?
28. ¿Quién revisará el showcase antes de hacerlo público?
29. ¿Qué licencia tendrá el material del showcase? ¿Hay una razón para no licenciarlo?
30. ¿Qué texto exacto debe aparecer para explicar que la implementación está cerrada?

### Perfil, CV y contacto

31. ¿El email que aparece actualmente en `PROFILE` sigue siendo el contacto público correcto?
32. ¿Las URLs actuales de GitHub y LinkedIn siguen siendo correctas y se pueden publicar?
33. ¿Qué PDF de CV se quiere publicar y qué datos deben eliminarse antes?
34. ¿Qué fecha de actualización debe mostrar el CV?
35. ¿La experiencia actual de `iDiomund, SL` puede describirse con responsabilidades y aprendizajes concretos?
36. ¿Qué skills se pueden afirmar con ejemplos o proyectos? ¿Se quiere mostrar nivel o solo lista?
37. ¿Qué idiomas, certificados, disponibilidad u otros datos deben ir en `extras`?
38. ¿La ubicación debe quedarse en `Blanes, Girona` o prefieres una zona más amplia?
39. ¿Hay teléfono, dirección, documento, horario o dato personal que no deba aparecer nunca?

### Enlaces y medición

40. Para cada proyecto, ¿cuál es el destino de `código`, `presentación` y `demo`?
41. Si falta un destino, ¿es `por confirmar`, `sin enlace público` o `privado`?
42. ¿Qué enlaces se pueden incluir en README, perfil de GitHub y repositorios fijados?
43. ¿Se quiere medir alguna acción concreta, como clic en CV o en proyecto, o se publica sin analítica?
44. ¿Se autoriza una herramienta cookieless y agregada si más adelante hay una pregunta que resolver?

## 8. GitHub, README y atribución

### Wooster público

Cuando la URL esté confirmada y el repositorio vaya a ser público, revisar esta lista en el propio GitHub:

- [ ] El nombre y la descripción corta coinciden con la ficha del portfolio.
- [ ] El README explica qué es, cómo se ejecuta si procede, qué estado tiene y qué puede revisar la persona visitante.
- [ ] El README distingue entre características existentes y trabajo pendiente.
- [ ] La lista de tecnologías coincide con el contenido real y no enumera herramientas que solo se probaron.
- [ ] Las capturas, GIFs o demos tienen permiso y no contienen credenciales, datos personales o interfaces reservadas.
- [ ] El repositorio no conserva secretos en el historial, archivos de ejemplo o variables de entorno compartidas.
- [ ] Hay una licencia visible si se desea permitir reutilización. Si no hay licencia, el README no debe prometer reutilización.
- [ ] La sección de contribuciones explica cómo abrir una issue o pull request, o dice claramente que no se aceptan contribuciones externas.
- [ ] La atribución es exacta. No se atribuye a Nil trabajo ajeno ni se borra una autoría sin permiso.
- [ ] El repositorio se fija en el perfil solo después de tener README, metadata, licencia y enlaces revisados.

### Showcase público independiente de Antevue

El showcase debe tener una frontera clara con la implementación privada:

- [ ] Tiene repositorio y README propios.
- [ ] El README dice si el repositorio es una presentación, una demo, un ejemplo o código parcial.
- [ ] La portada no afirma que contiene el producto completo si no lo contiene.
- [ ] Los ejemplos son sintéticos o están autorizados.
- [ ] No se copian configuraciones, nombres internos, dependencias privadas, URLs de staging ni datos reales.
- [ ] El archivo de licencia describe solo lo que realmente se concede sobre ese repositorio público.
- [ ] El portfolio enlaza al showcase con `Ver showcase` o `Ver presentación`, no automáticamente con `Ver código fuente`.
- [ ] El repositorio se fija en el perfil solo si el propietario quiere asociarlo públicamente con Antevue.

### README, pins y contribuciones anónimas

La visibilidad de contribuciones debe ser honesta. Si hubo más personas, no se deben convertir sus aportaciones en trabajo individual de Nil para mejorar una tarjeta. Si alguien necesita anonimato, se debe anonimizar el material que se publica solo con su consentimiento y respetando la trazabilidad exigida por la plataforma o el acuerdo de trabajo. No se debe reescribir el historial para esconder autorías sin una decisión documentada.

La sección de contribuciones puede usar una redacción neutral cuando sea necesario, por ejemplo `Proyecto desarrollado en colaboración` o `Contribuciones externas no detalladas por razones de privacidad`, siempre que el propietario la apruebe. Esa redacción no debe sugerir una autoría exclusiva.

### Licencia y frontend observable

Una licencia no debe estar escondida en un tooltip o en un archivo que el visitante no pueda encontrar:

- La licencia del repositorio público vive en el repositorio, normalmente en `LICENSE`, y se menciona en README cuando ayude.
- La ficha del portfolio puede enlazarla, pero no sustituye el texto legal del repositorio.
- El código que llega al navegador de una demo es observable. `Código cerrado` describe la política del repositorio, no una capacidad de ocultar el frontend enviado.
- No se prometen derechos de uso sobre capturas, marcas, datos o código que no pertenezcan a Nil.
- Cualquier duda sobre propiedad intelectual, trabajo para terceros o material de Antevue debe resolverse antes de publicar, no con una etiqueta ambigua.

## 9. Cambios mínimos de modelo y archivos derivados

### Situación actual

`ProjectContent` ya tiene `id`, `slug`, `title`, `summary`, `description`, `technologies`, `repoUrl`, `demoUrl`, `screenshots`, `year` y `status`. Eso cubre parte de la tarjeta, pero no expresa una presentación separada, un showcase independiente ni la diferencia entre `privado`, `sin demo` y `por confirmar`.

### Contrato mínimo recomendado

No hace falta construir un sistema genérico de enlaces. Antes de elegir la forma exacta del TypeScript, cumplir estos requisitos:

- Conservar `id` y `slug` estables para que futuras URLs no dependan del texto traducido.
- Añadir una forma explícita de representar `presentación`, porque no debe confundirse con demo o repositorio.
- Representar el estado de repositorio y de demo de forma que `null` no tenga que significar cinco cosas distintas.
- Permitir que Antevue enlace un showcase público sin llamarlo implementación.
- Mantener URLs ausentes como `null` o equivalente, nunca como una URL de relleno.
- Mantener el estado general `published` o `placeholder` solo para el proyecto completo. No reutilizarlo para describir la visibilidad de un repositorio.

Una estructura pequeña con enlaces tipados, o campos explícitos como `presentationUrl` más estados de repositorio y demo, son opciones válidas. La decisión concreta debe preferir la menor modificación que haga cumplir los estados anteriores. No añadir un CMS, un grafo de enlaces configurable ni una abstracción que el proyecto no necesita.

### Edición de fuentes

Orden recomendado de cambios:

1. `src/core/content/projects.ts`: eliminar los tres placeholders y crear solo Wooster y Antevue con datos aprobados.
2. `src/core/content/profile.ts`: completar CV, experiencia, skills y extras con respuestas aprobadas.
3. `src/core/i18n/es.ts`, `ca.ts` y `en.ts`: añadir o corregir únicamente las claves necesarias para estados y acciones.
4. `src/apps/projects/ProjectsApp.tsx`: renderizar etiquetas semánticas y corregir el footer `about.addHint`.
5. `src/apps/about/AboutApp.tsx`: comprobar que CV, experiencia y estados vacíos se entienden sin instrucciones de desarrollo en una release publicada.
6. `src/core/content/portfolioFiles.ts`: derivar los mismos estados y enlaces, incluyendo presentación si el modelo la incorpora.
7. `vite.config.ts`, `index.html` y archivos SEO: actualizar solo metadata factual y mantener los marcadores exigidos.
8. `public/`: añadir CV, capturas y otros archivos aprobados con rutas compatibles con `import.meta.env.BASE_URL`.

### Regla para placeholders

Durante la edición puede ser útil ver `[PENDIENTE DE CONFIRMAR]`. En la publicación P0:

- No queda `Proyecto 1`, `Proyecto 2` ni `Proyecto 3`.
- No queda una tecnología vacía presentada como si fuera una lista completa.
- No queda un botón que diga `Abrir demo` sin una URL verificada.
- No se sustituye la falta de datos por una frase promocional genérica.
- Si el propietario decide publicar antes de tener un enlace, se muestra `Código privado` o `Sin demo pública`, según el caso real.

## 10. Experiencia del escritorio retro

### Entrada y acceso rápido

La primera interacción debe orientar sin quitar personalidad. El escritorio puede seguir abriendo `welcome`, pero esa ventana debe ofrecer acciones primarias visibles:

- `Ver mis proyectos` abre `projects`.
- `Sobre mí y currículum` abre `about`.
- `Contacto` abre `mail`.
- Una frase corta explica que es un portfolio interactivo y cómo saltarse la exploración.

Además de los iconos del escritorio y el menú Inicio, conviene mantener una ruta clara desde:

- el menú de la ventana de proyectos hacia perfil y archivos;
- el menú de la ventana de perfil hacia proyectos y CV;
- la barra de tareas, cuando una aplicación ya esté abierta;
- enlaces textuales visibles, no solo iconos.

El visitante no debe necesitar abrir `Internet`, buscar en el Explorador o hacer doble clic en varios iconos para llegar a una ficha.

### Tarjetas de proyectos

La vista actual permite `cards` y `details`, pero el cambio de vista no equivale todavía a una ruta pública de detalle. En P0:

- La vista `cards` muestra la información esencial y no solo el resumen de un placeholder.
- La vista `details` conserva el mismo contenido, con más densidad, sin ocultar enlaces importantes.
- El botón o enlace de cada proyecto tiene nombre accesible y no depende de una zona clicable sin texto.
- Las capturas no desplazan el texto fuera de la pantalla en viewport estrecho.
- El estado de los enlaces se entiende en los tres idiomas.
- El footer no pide editar `profile.ts` desde una página publicada de proyectos.

### Móvil y modo compacto

El escritorio debe ser usable en 320, 375, 412 y 768 CSS px, además de una pantalla de escritorio amplia.

- Las ventanas se convierten en paneles o usan el viewport disponible sin quedar cortadas.
- El modo compacto se activa por ancho desde el primer render, no solo después de `resize`.
- La barra de tareas y el contenido respetan `safe-area-inset` en dispositivos con notch.
- No aparece scroll horizontal por la decoración de la ventana, el status bar o una tabla de enlaces.
- Los botones y enlaces tienen un área táctil suficiente sin destruir la estética.
- Las funciones que en Windows 95 se invocan con doble clic tienen una alternativa de toque y teclado.
- Menús, diálogos, selectores de idioma y cierre de ventanas se pueden usar con toque.
- Las tarjetas mantienen la jerarquía en una sola columna y no esconden el enlace de contacto al final de una ventana imposible de desplazar.
- La preferencia `reduceMotion` se respeta también en transiciones de ventanas y cambios de vista.

### Teclado y foco

El retro debe recordar a Windows 95, no a una aplicación inaccesible de los años noventa.

- [ ] Existe un enlace `Saltar al escritorio` funcional y visible al recibir foco.
- [ ] El orden de Tab empieza por navegación y contenido útil, no por decoración.
- [ ] El foco se ve en enlaces, botones, checkbox, inputs, menús, iconos accionables y controles de ventana.
- [ ] El foco visible tiene contraste suficiente en los fondos azul, gris y blanco del tema.
- [ ] Enter y Space activan botones e iconos accionables según su semántica.
- [ ] Escape cierra menús y diálogos sin cerrar accidentalmente una ventana con cambios pendientes.
- [ ] La navegación por menú conserva una ruta de teclado y sus access keys están traducidas o documentadas.
- [ ] El cambio de ventana por teclado anuncia qué ventana quedó activa.
- [ ] Al cerrar un diálogo o ventana, el foco vuelve a un elemento razonable.
- [ ] Las capturas tienen alt útil o son decorativas con alt vacío cuando el texto cercano ya contiene toda la información.
- [ ] Las ventanas tienen nombre accesible, región o encabezado reconocible y un orden de lectura coherente.
- [ ] Las notificaciones de copiar email, abrir una ventana y errores llegan a la región `aria-live` existente.
- [ ] No se usa `outline: none` sin aportar un reemplazo visible equivalente.

## 11. Rutas compartibles y enlaces directos

Actualmente el sitio es una SPA sin router y la URL no cambia al abrir una aplicación. No hay que introducir rutas reales solo por imitar portfolios convencionales. Sí hace falta decidir cómo se compartirá un proyecto cuando Wooster o Antevue tengan una ficha que alguien quiera enviar.

### Nivel 0: acceso desde el escritorio

Es el punto de partida de P0:

- El root abre el escritorio.
- `Mis proyectos` muestra los dos proyectos.
- El visitante puede copiar la URL del sitio y encontrar ambos sin estado previo.
- No se publican URLs de detalle inexistentes.

### Nivel 1: deep link ligero

Es la opción recomendada para P1 si todavía no hace falta SEO por proyecto. Se puede abrir la aplicación y seleccionar un slug validado mediante un query param o hash, por ejemplo una forma acordada como `/?open=projects&project=wooster`.

La cadena exacta es una decisión de implementación, no un enlace para copiar hasta que exista. Debe cumplir:

- Validar `open` y `project` contra aplicaciones y slugs conocidos.
- Abrir solo el proyecto solicitado, sin aceptar nombres arbitrarios como rutas de archivos.
- Caer de forma segura al escritorio si el slug no existe.
- Funcionar con `VITE_BASE` tanto en dominio raíz como en project site.
- No guardar la URL completa como un dato persistente que pueda romper una sesión futura.
- Actualizar título o estado accesible si la ventana se abre directamente.
- Poder compartir la URL desde una ventana real del navegador, no solo desde una sesión con IndexedDB preparada.

### Nivel 2: ruta de detalle real

Solo si el tráfico, la necesidad de compartir o el SEO lo justifican, estudiar rutas como `/proyectos/wooster` y `/proyectos/antevue`. Esa fase exige más que añadir `findProject`:

- definir el contrato de URLs y slugs;
- resolver recarga directa en GitHub Pages;
- generar canonical, title, description y preview para cada ruta;
- decidir qué ve un crawler que no ejecuta el escritorio;
- mantener la experiencia retro como entrada, no duplicar datos en dos sitios;
- mantener el fallback `404.html` con `noindex` cuando corresponda;
- añadir tests para slug inexistente, base path y cambios de idioma;
- incluir en sitemap solo rutas públicas confirmadas.

No se debe implementar el Nivel 2 en P0. Primero hay que publicar contenido real y observar si la ausencia de ruta es un problema real.

### Enlaces externos semánticos

En cualquier nivel, los tres destinos tienen significados distintos:

| Destino | Etiqueta | Condición |
| --- | --- | --- |
| Implementación pública de Wooster | `Ver código fuente` | URL y visibilidad confirmadas |
| Showcase público de Antevue | `Ver showcase` | Repositorio independiente aprobado |
| Presentación | `Ver presentación` | Documento, vídeo o página real aprobada |
| Demo | `Abrir demo` | URL activa y datos compartibles |
| Implementación privada | `Código privado` | Texto sin enlace al repositorio |

No se usa el mismo `Abrir en GitHub` para un showcase que para el código fuente. No se muestra `Ver la demo` con un `href` vacío. No se agregan URLs al sitemap ni a los metadatos sociales si no son públicas y reales.

## 12. Contenido y copy en `es`, `ca` y `en`

### Orden editorial

1. El propietario responde y revisa el texto en español.
2. Se eliminan claims imposibles de probar y se fijan nombres propios, términos y URLs.
3. Se traduce a catalán e inglés respetando el significado, la longitud razonable y el registro.
4. Se prueba el layout con la versión más larga, no solo con español.
5. Se revisan accesibilidad, alt, metadata y archivos de `C:\Portfolio` en los tres idiomas.

### Inventario de copy

| Superficie | Fuente | Trabajo |
| --- | --- | --- |
| Título, description y Open Graph | `index.html` con valores factuales | Explicar portfolio, perfil y especialidad sin exagerar. Revisar alt de la preview. |
| Bienvenida | `src/core/i18n/*.ts` | Mantener la explicación breve y las tres acciones principales. |
| Proyectos | `projects.ts` más claves de interfaz | Resumen, estados, tecnologías, enlaces, capturas y detalle. |
| Sobre mí | `profile.ts` más claves de interfaz | Bio, formación, experiencia, skills, extras y CV. |
| Contacto | `profile.ts`, `MailApp` e i18n | Email, copia, mailto y enlaces externos. Confirmar consentimiento. |
| Ayuda | `src/core/content/help.ts` e i18n | Explicar doble clic, teclado, móvil, enlaces externos y privacidad sin contradicciones. |
| Archivos virtuales | `portfolioFiles.ts` | Mantener README, Sobre-mi, Contacto y proyectos alineados con la UI. |
| Mensajes de estado | i18n | Diferenciar privado, sin demo, pendiente y error. |
| Accesibilidad | i18n y atributos | Labels, anuncios, tooltips y nombres de ventanas en los tres idiomas. |
| SEO y structured data | `index.html`, `vite.config.ts`, `PROFILE` | No incluir datos que no aparecen en el contenido público aprobado. |

### Reglas de redacción

- Preferir verbos concretos: `configuré`, `documenté`, `probé`, `aprendí`, solo cuando el propietario lo confirme.
- No usar `innovador`, `revolucionario`, `completo`, `escalable` o `profesional` como sustitutos de evidencia.
- No convertir una lista de tecnologías en una descripción del resultado.
- Separar lo que hace el producto de lo que hizo Nil.
- Si no hay métrica, decir qué se observó o qué se aprendió sin inventar un porcentaje.
- Mantener una frase principal corta y párrafos que se puedan escanear.
- Traducir los estados, no las marcas ni las URLs.
- Usar la misma grafía de Wooster y Antevue en títulos, archivos, alt, GitHub y metadata.
- Revisar comillas, apóstrofes y acentos en catalán. Corregir la errata `fer Serva com a.` de `portfolioFiles.ts`.

### Criterios de aceptación de i18n

- [ ] El typecheck detecta cualquier clave nueva que falte en `ca.ts` o `en.ts`.
- [ ] Cambiar el idioma no deja etiquetas en español dentro de una tarjeta de proyecto.
- [ ] La pantalla no muestra claves como `projects.openRepo`.
- [ ] Todos los estados de enlace tienen una traducción natural.
- [ ] Los nombres de proyectos, repositorios, tecnologías y personas no se alteran por el idioma.
- [ ] Los alt de las capturas describen el mismo contenido en los tres idiomas.
- [ ] Los textos largos no cortan botones, status bars ni diálogos.
- [ ] Los archivos derivados de `C:\Portfolio` coinciden con el idioma seleccionado y no tienen la errata catalana.
- [ ] Las instrucciones de ayuda no prometen rutas directas que aún no existen.

## 13. CV, experiencia, skills y contacto

### CV

P0 debe tomar una decisión clara, no dejar un botón que parezca roto:

- [ ] Obtener el PDF aprobado.
- [ ] Revisar teléfono, dirección, documentos, enlaces caducados y datos de terceros.
- [ ] Guardarlo en `public/` con un nombre estable y una ruta compatible con `VITE_BASE`.
- [ ] Completar `cvUrl` y `cvUpdatedAt` en `PROFILE` solo después de que el archivo exista.
- [ ] Comprobar que el botón del menú y el botón visible abren el mismo PDF.
- [ ] Comprobar que el PDF se puede descargar en móvil y en una pestaña nueva.
- [ ] Revisar que el texto del PDF sea seleccionable o que exista una alternativa accesible si solo es una imagen.
- [ ] Si el propietario no quiere publicar CV todavía, mantener el estado vacío pero cambiar el copy a una ausencia deliberada, no a una instrucción interna para editar código.

### Experiencia

La entrada actual identifica `iDiomund, SL`, el rol `Técnico`, un periodo de seis meses y el formato de prácticas presencial. Es información que ya está en el repositorio, pero la revisión previa la consideró poco concreta para un portfolio. Antes de ampliar:

- confirmar que las fechas, empresa, rol y ubicación siguen siendo publicables;
- preguntar por tres o cuatro responsabilidades concretas;
- distinguir tareas, herramientas y resultados observados;
- evitar números si no hay una fuente;
- no nombrar sistemas, clientes o incidentes internos sin permiso;
- traducir cada punto a `es`, `ca` y `en` sin cambiar su alcance.

La sección no necesita convertirse en un CV de varias páginas. Una descripción factual con papel, contexto y aprendizaje vale más que una lista de adjetivos.

### Skills

El tipo actual permite `name` y un `level` opcional de 0 a 100. La recomendación P0 es mostrar nombres y evidencia, no barras porcentuales por defecto.

- Añadir solo skills que Nil quiera afirmar públicamente.
- Relacionar cada skill con formación, experiencia o proyecto cuando sea posible.
- Agrupar solo si los grupos ayudan a leer; no crear una taxonomía por anticipado.
- No inferir un skill de una palabra de la bio.
- No usar 95% o 70% sin una escala que el visitante pueda interpretar.
- Si se muestran niveles, explicar qué significa cada nivel y revisar el contraste de las barras.

### Extras

Usar `extras` para datos que aporten valor real, como idiomas, certificados, disponibilidad o intereses técnicos concretos. No rellenarlo con hobbies genéricos ni con información sensible.

### Contacto

- Confirmar el email y las URLs actuales antes de publicarlos.
- Mantener la ventana de correo sin formulario de backend. La copy actual explica que solo copia la dirección o abre `mailto`.
- Hacer que el email sea texto seleccionable y que el botón de copiar tenga anuncio de éxito.
- Usar enlaces con nombre visible, no iconos sin etiqueta.
- Abrir enlaces externos con `noopener noreferrer` y explicar que salen del sitio cuando el contexto lo necesite.
- No publicar teléfono o dirección física salvo decisión expresa.
- Comprobar que el email aparece de forma consistente en perfil, archivos, status bar, SEO y contacto.

## 14. SEO, previews y dominio

### Estado actual que se conserva

La página principal tiene metadata en `index.html` y `vite.config.ts` inyecta `%SITE_URL%` y structured data generado desde `PROFILE`. El sitio tiene una sola dirección canónica mientras no se implemente un sistema de rutas. `404.html` se crea durante el workflow de Pages y se marca `noindex`.

### P0

- Actualizar title y description solo con información aprobada y vigente.
- Mantener `og:title`, `og:description`, `og:url` y `og:image` coherentes.
- Revisar el texto alternativo de `social-preview.png`.
- No indexar una URL de proyecto que no exista.
- No añadir a sitemap un showcase, demo o ruta de detalle antes de verificar que es público.
- Confirmar que el canonical final usa el dominio de `VITE_SITE_URL`, no una preview, un project site accidental o un path de desarrollo.
- Verificar que el structured data no incluye skills, enlaces o ubicación que el propietario haya retirado.
- Mantener el idioma principal y las alternativas alineados con el contenido realmente traducido.

### P1 si se crean detalles públicos

Cada ruta pública de proyecto necesitaría, como mínimo:

- title propio;
- description propia;
- canonical propio;
- Open Graph y preview que no prometan una demo inexistente;
- ruta incluida en sitemap solo si es indexable;
- estado `noindex` o redirección para slugs desconocidos;
- structured data solo si se puede generar desde una fuente de contenido real y se prueba que no contradice la pantalla.

No se debe resolver esto escribiendo otro JSON-LD a mano en `index.html`. Si el modelo de SEO debe ampliarse, la fuente debe seguir siendo el contenido central y el plugin debe conservar sus comprobaciones de marcadores.

### Dominio y base path

Antes de publicar:

- [ ] Confirmar si el destino es el dominio personalizado `nilparra.dev` o un project site.
- [ ] Para dominio personalizado, mantener `VITE_BASE=/` y la relación con `public/CNAME`.
- [ ] Para project site, configurar `BASE_PATH` y `SITE_URL` en las variables del workflow, y hacer que `VITE_BASE` y `VITE_SITE_URL` reciban esos valores.
- [ ] Revisar links, imágenes, CV, manifest, iconos, `start_url`, `scope`, sitemap y canonical bajo ambos escenarios si se soportan.
- [ ] No cambiar solo `CNAME` dejando `robots.txt` y `sitemap.xml` con el dominio anterior.
- [ ] Confirmar HTTPS, configuración de Pages y dominio verificado antes de compartir el enlace.

### Preview social

La preview puede seguir siendo una imagen general del escritorio si no hay material de proyecto aprobado. Si se crea una preview específica de Wooster o Antevue, debe usar capturas autorizadas y no incluir la implementación privada de Antevue. Probar la imagen en al menos un inspector de Open Graph y en una red social antes de considerarla terminada.

## 15. Accesibilidad, rendimiento y privacidad

### Accesibilidad

La prioridad es que el contenido sea legible aunque el visitante ignore la metáfora de Windows 95.

- Restaurar un foco visible consistente en reset, campos, botones, checkbox, menús y controles de ventana.
- Mantener headings en orden y usar landmarks razonables dentro de cada aplicación.
- Dar nombres accesibles a iconos y botones de cerrar, maximizar, minimizar y abrir.
- No usar color como único indicador de estado privado, pendiente o disponible.
- Comprobar contraste de texto gris, azul oscuro, enlaces visitados y badges.
- Verificar `prefers-reduced-motion` y la opción existente del Panel de control.
- Probar zoom del navegador y tamaños de fuente mayores sin perder acciones.
- Revisar el orden de lectura de `ProjectsApp` con un lector de pantalla o inspección del árbol accesible.
- No introducir tablas o componentes que solo funcionen con hover.

### Rendimiento

- Mantener el contenido textual en el bundle existente y evitar dependencias para un problema que CSS o React ya resuelvan.
- Cargar capturas de proyecto de forma diferida cuando haya muchas, con dimensiones y compresión razonables.
- No añadir vídeos, fuentes o librerías externas sin justificar su peso y su política de privacidad.
- Revisar el tamaño del bundle y el tiempo de interacción en un móvil real o emulado.
- Mantener los assets generados en el flujo existente. Si se tocan iconos, cursores, patrones o tamaños de navegador, ejecutar `npm run assets` y revisar los archivos regenerados.
- Verificar que un bloqueo de una imagen externa no oculta el título, resumen o enlaces.

### Privacidad

- El sitio no tiene backend ni cuentas. El disco virtual vive en IndexedDB del navegador y no se debe describir como sincronizado.
- Revisar el CV y las capturas antes de publicar.
- No poner secretos en repositorios, demos, ejemplos, variables construidas o historial.
- No enlazar repositorios privados de Antevue.
- Revisar qué carga el navegador desde una demo pública. Todo frontend entregado al visitante es observable.
- Mantener el `sandbox` de Internet con la política documentada y probar cualquier permiso adicional.
- Si se añade analítica, no enviar email, nombre, texto de documentos, querys personales ni contenido de IndexedDB.
- Si se usa un tercero, actualizar CSP, `docs/security.md` y la explicación de privacidad en la misma revisión.

## 16. Medición opcional y proporcional

La publicación no depende de analítica. Durante P0 se puede observar manualmente si las personas encuentran el contenido mediante feedback, enlaces compartidos y consultas directas.

Solo si aparece una pregunta concreta, por ejemplo `¿se encuentra el CV?`, valorar una herramienta agregada y sin cookies. Un alcance razonable sería:

- clic en proyecto Wooster;
- clic en showcase o presentación de Antevue;
- descarga de CV;
- clic en contacto.

No añadir session replay, perfiles individuales, fingerprinting, grabación de formularios ni eventos con PII. Si la herramienta obliga a aumentar la CSP, añadir un cambio específico y revisarlo con seguridad. Si medir cuesta más que responder la pregunta por otro medio, no se añade.

## 17. CI, assets, dominio y despliegue

### CI

El workflow `.github/workflows/ci.yml` ya define el contrato de revisión:

- `npm ci` con el lockfile comprometido;
- `npm audit --omit=dev`;
- búsqueda de `dangerouslySetInnerHTML`, `innerHTML`, `document.write`, `new Function` y `eval` en `src`;
- `npm run typecheck`;
- `npm test`;
- `npm run build`.

No se debe desactivar el audit, relajar la búsqueda de DOM inseguro o aceptar una prueba fallida para publicar contenido. Las acciones están fijadas por SHA y main está protegido. Los commits futuros deben seguir el formato convencional en inglés, como `feat:`, `fix:`, `docs:`, `test:`, `ci:`, `refactor:` o `chore:`.

### Assets generados

- Ejecutar `npm run assets` si se tocan iconos, cursores, patrones o tamaños generados.
- `predev` y `prebuild` ya ejecutan la generación, pero el cambio generado debe revisarse en el diff.
- No editar directamente `src/assets/generated/` o `src/styles/cursors.generated.css` si la fuente está en `scripts/`.
- Si se añade una captura de proyecto normal, guardarla en una ruta de `public/` aprobada y optimizada. No convertir una captura editorial en un asset generado sin necesidad.

### Despliegue

`.github/workflows/deploy.yml` publica por `workflow_dispatch`. La guía de `AGENTS.md` indica que el workflow manual es intencionado mientras el sitio no sea público.

- No restaurar el trigger de `push` sin una petición explícita.
- Ejecutar el workflow manual solo después de que CI esté verde y el propietario apruebe el contenido.
- Revisar las variables `BASE_PATH` y `SITE_URL` que el workflow traduce a `VITE_BASE` y `VITE_SITE_URL`.
- Comprobar el artefacto final, incluyendo `404.html`, `manifest.webmanifest`, CV, capturas, sitemap, canonical y structured data.
- Verificar en la URL publicada, no solo en `localhost`, que las ventanas principales, enlaces externos y deep links funcionan.

### Dominio

El dominio canónico se configura una sola vez en `VITE_SITE_URL` y se refleja en `public/CNAME`, `public/robots.txt` y `public/sitemap.xml`. Si se cambia, cambiar y probar los cuatro puntos en la misma tarea. No dejar una preview o el dominio de un repositorio en metadata pública.

## 18. Plan de trabajo por fases

### P0. Publicación honesta y navegable

#### P0.1. Cerrar datos y permisos

- [ ] Enviar el cuestionario de este documento.
- [ ] Confirmar nombre, slug, periodo, papel, resumen, tecnologías, evidencia y estado de Wooster.
- [ ] Confirmar qué se puede publicar de Antevue y si se autoriza un showcase independiente.
- [ ] Confirmar URLs de código, showcase, presentación y demo.
- [ ] Confirmar licencia, atribuciones y permisos de capturas.
- [ ] Confirmar email, redes, ubicación, experiencia, skills, extras y CV.

**Criterio de salida**: existe una hoja de hechos aprobados y no hay un campo cuya ausencia pueda confundirse con una invención.

#### P0.2. Sustituir placeholders por dos proyectos

- [ ] Reemplazar las tres entradas de `PROJECTS` por Wooster y Antevue.
- [ ] Mantener `id` y `slug` estables y no derivados del idioma.
- [ ] No añadir un tercer elemento.
- [ ] Marcar el código de Antevue como privado si no existe showcase aprobado.
- [ ] Usar solo tecnologías, fechas y descripciones confirmadas.
- [ ] Añadir capturas solo con permiso y alt en los tres idiomas.

**Criterio de salida**: la ventana de proyectos no muestra placeholders de proyecto y cada dato publicado se puede rastrear a la hoja aprobada.

#### P0.3. Resolver enlaces semánticos

- [ ] Elegir la extensión mínima del modelo para presentación y estados de enlace.
- [ ] Renderizar `Ver código`, `Ver showcase`, `Ver presentación`, `Abrir demo`, `Código privado`, `Sin demo pública` o `Enlace por confirmar` según el estado real.
- [ ] Verificar cada URL con una prueba de carga y confirmar que su publicación está autorizada.
- [ ] No usar la URL del perfil de GitHub como URL de Wooster sin confirmación.
- [ ] No enlazar la implementación privada de Antevue.
- [ ] Reflejar el mismo estado en `portfolioFiles.ts`.

**Criterio de salida**: no existe un anchor sin destino, una etiqueta engañosa ni un botón de demo que solo sea una promesa.

#### P0.4. Completar perfil profesional

- [ ] Completar o decidir el estado del CV.
- [ ] Hacer concreta la experiencia aprobada.
- [ ] Añadir skills y extras aprobados.
- [ ] Revisar email, GitHub, LinkedIn y ubicación.
- [ ] Quitar instrucciones internas de edición de código de la experiencia pública cuando el contenido ya esté completo.

**Criterio de salida**: `AboutApp` ofrece un perfil útil con CV o una ausencia deliberada, sin secciones que parezcan rotas.

#### P0.5. Copy e i18n

- [ ] Redactar español.
- [ ] Traducir y revisar catalán e inglés.
- [ ] Corregir `fer Serva com a.` en `portfolioFiles.ts`.
- [ ] Añadir claves de interfaz mínimas y completas.
- [ ] Revisar longitudes, alt, aria labels y archivos virtuales.
- [ ] Corregir el footer de `ProjectsApp`.

**Criterio de salida**: cambiar entre `es`, `ca` y `en` no deja claves, estados sin traducir ni textos que cambien el sentido.

#### P0.6. Accesibilidad y responsive mínimo

- [ ] Reproducir y corregir el foco visible.
- [ ] Reproducir y corregir el modo compacto inicial.
- [ ] Probar 320, 375, 412, 768, 1024 y un escritorio amplio.
- [ ] Completar la ruta de teclado de bienvenida, proyectos, perfil, contacto y cierre.
- [ ] Mantener la estética retro sin ocultar controles.

**Criterio de salida**: una persona con teclado y una persona en móvil puede llegar a proyectos, CV y contacto sin ratón ni scroll horizontal.

#### P0.7. SEO y release

- [ ] Revisar title, description, canonical, OG y preview.
- [ ] Confirmar base path y dominio.
- [ ] Confirmar que sitemap solo enumera URLs reales.
- [ ] Ejecutar los checks definidos en la sección de verificación.
- [ ] Obtener CI verde.
- [ ] Hacer despliegue manual aprobado.
- [ ] Verificar la URL pública en una sesión limpia.

**Criterio de salida**: la URL pública carga recursos, metadata y archivos correctos, y ningún placeholder o marcador de build llega al visitante.

### P1. Calidad, confianza y compartición

#### P1.1. Rutas compartibles

- [ ] Medir si se necesita compartir una ficha sin abrir el escritorio.
- [ ] Si la respuesta es sí, implementar primero un deep link ligero validado.
- [ ] Probar recarga, copia en incógnito, project site y dominio personalizado.
- [ ] Solo valorar rutas reales cuando el formato ligero no resuelva la necesidad.

**Criterio de salida**: cada URL anunciada abre el contenido correcto, tiene fallback seguro y no rompe el root.

#### P1.2. GitHub profesional

- [ ] Pulir README de Wooster.
- [ ] Crear y revisar el showcase independiente de Antevue si se aprobó.
- [ ] Revisar licencia, pin, contribuciones y atribuciones.
- [ ] Probar los enlaces desde portfolio y perfil.

**Criterio de salida**: una persona técnica puede pasar del portfolio al repositorio correcto sin interpretar qué significa cada enlace.

#### P1.3. SEO de proyecto

- [ ] Si hay rutas públicas, generar metadata por ficha desde el contenido central.
- [ ] No indexar privados, placeholders ni rutas inexistentes.
- [ ] Actualizar sitemap y previews solo después de probar URLs.

#### P1.4. Hallazgos técnicos reproducidos

- [ ] Ejecutar las siete reproducciones de la sección 3.
- [ ] Crear una prueba de regresión para cada problema confirmado.
- [ ] Documentar los que no se reproduzcan y cerrar la sospecha con evidencia.
- [ ] Alinear `docs/security.md` con el sandbox real, sin ampliar permisos por comodidad.

**Criterio de salida**: cada hallazgo tiene estado `confirmado y corregido`, `no reproducido con evidencia` o `aceptado con razón explícita`.

### P2. Mejora opcional basada en señales

- [ ] Convertir las fichas con evidencia suficiente en casos de estudio más largos.
- [ ] Añadir vídeo o diagramas solo cuando exista material autorizado y una necesidad de comprensión.
- [ ] Mejorar previews por proyecto si se comparten con frecuencia.
- [ ] Añadir analítica cookieless solo para una pregunta concreta.
- [ ] Considerar rutas reales si los deep links ligeros se quedan cortos.
- [ ] Revisar instalación PWA y manifest después de resolver el base path, no antes.

**Criterio de salida**: cada tarea P2 tiene una señal que la justifica y no aumenta la carga de mantenimiento sin un beneficio observable.

## 19. Verificación de implementación

### Comandos de release

Cuando haya cambios de código, ejecutar en un entorno limpio y registrar el resultado:

```bash
npm ci
npm run typecheck
npm test
npm run build
```

`npm run build` ya pasa por `prebuild` y genera assets. Si se modificaron fuentes de assets, ejecutar además:

```bash
npm run assets
```

No es necesario repetir estos comandos para esta tarea documental. Sí son la evidencia requerida antes de una implementación que modifique el comportamiento.

### Verificación de contenido

- [ ] Buscar `Proyecto 1`, `Proyecto 2`, `Proyecto 3`, `placeholder-` y `PENDIENTE` sin intención editorial.
- [ ] Buscar URLs de ejemplo, URLs vacías y enlaces que no tengan el destino aprobado.
- [ ] Confirmar que Wooster y Antevue son los únicos elementos de `PROJECTS`.
- [ ] Comprobar que `repoUrl` o su reemplazo apunta a un destino real y semánticamente correcto.
- [ ] Comprobar que Antevue no contiene la URL del repositorio privado.
- [ ] Comparar texto de ProjectsApp con `portfolioFiles` en los tres idiomas.
- [ ] Confirmar que el contenido de SEO no afirma funciones o resultados ausentes de la pantalla.

### Verificación de UI

- [ ] Abrir bienvenida, proyectos, perfil y correo en cada idioma.
- [ ] Abrir y cerrar una ventana desde botones, menú, teclado y móvil.
- [ ] Probar vista de tarjetas y vista de detalles.
- [ ] Probar enlace disponible, enlace privado, ausencia de demo y enlace externo bloqueado.
- [ ] Recargar con IndexedDB vacía y con una sesión de ventanas guardada.
- [ ] Probar el primer render en viewport estrecho.
- [ ] Probar `prefers-reduced-motion`, alto contraste de la aplicación y zoom.
- [ ] Comprobar que el foco no desaparece después de abrir un menú o un diálogo.

### Verificación específica de tests

| Cambio | Prueba adecuada |
| --- | --- |
| Contenido de proyectos | Test o smoke de `ProjectsApp`, conteo exacto de dos proyectos y estados de enlaces |
| `portfolioFiles` | Test por locale para nombres, URLs, estados y ausencia de la errata catalana |
| CV y perfil | Smoke de `AboutApp`, descarga solo cuando `cvUrl` existe y estado vacío cuando no existe |
| Ruta ligera o real | Tests de slug válido, slug desconocido, recarga, base path y fallback |
| Foco | Test de teclado más revisión manual del árbol accesible y varios controles |
| Papelera | Test con carpeta, archivo hijo y nieto para trash, restore, empty y reload |
| z-order | Test de dos ventanas maximizadas, focus y nueva ventana |
| Persistencia | Fixtures con campos incompletos, números no finitos y estados desconocidos |
| Modo compacto | Test de primer render con viewport estrecho y puntero fino, más resize y orientación |
| Manifest y dominio | Build con `/` y un base path de proyecto, inspección del artefacto y navegación real |
| Sandbox | Revisión manual de comportamiento y actualización consistente de `docs/security.md` |

### Verificación del artefacto

Después del build, revisar sin asumir que Vite corrigió todo:

- `dist/index.html` no contiene `%SITE_URL%` ni `%STRUCTURED_DATA%`.
- El structured data aparece exactamente una vez y describe datos públicos actuales.
- Las rutas del CV, capturas, iconos y manifest cargan bajo el base path elegido.
- `dist/404.html` queda con `noindex` cuando lo genera el workflow.
- El canonical, `og:url`, sitemap y CNAME apuntan al mismo dominio.
- El manifest tiene `start_url`, `scope` e iconos coherentes.
- No aparecen archivos del repositorio privado ni source maps no deseados.
- El navegador no registra errores de recursos al visitar la página publicada.

## 20. Definición de terminado

El trabajo de P0 está terminado solo cuando se cumplen todos estos puntos:

### Verdad y alcance

- [ ] `PROJECTS` contiene exactamente Wooster y Antevue.
- [ ] No quedan los tres placeholders ni un tercer proyecto de relleno.
- [ ] Cada frase pública procede del propietario, del repositorio aprobado o de una evidencia revisada.
- [ ] No se inventan stack, funciones, métricas, fechas, URLs ni resultados.
- [ ] Antevue conserva su implementación privada y cualquier showcase está separado y etiquetado.

### Enlaces y repositorios

- [ ] Wooster tiene su URL y visibilidad confirmadas, o el estado de enlace se presenta de forma deliberada antes de publicar.
- [ ] Cada destino de código, presentación y demo tiene una etiqueta que describe lo que realmente contiene.
- [ ] No hay anchors rotos ni botones sin acción.
- [ ] README, licencia, pin y atribuciones están revisados en los repositorios públicos.
- [ ] Las contribuciones de terceros no se atribuyen falsamente ni se anonimizan sin permiso.

### Perfil

- [ ] El CV existe y se descarga, o su ausencia se explica sin parecer un error.
- [ ] Experiencia, skills y extras contienen información aprobada o se ocultan por una decisión consciente.
- [ ] Email y redes están confirmados.
- [ ] No se publican datos personales que el propietario no haya autorizado.

### Experiencia

- [ ] La bienvenida ofrece acceso rápido a proyectos, perfil y contacto.
- [ ] El escritorio es una opción visual, no un obstáculo para comprender el contenido.
- [ ] Móvil, teclado, foco, reducción de movimiento y alto contraste tienen una ruta probada.
- [ ] Los textos largos y los tres idiomas no rompen la interfaz.
- [ ] Las rutas anunciadas pueden recargarse y compartirse.

### SEO, seguridad y release

- [ ] Metadata, structured data, canonical, sitemap, CNAME y preview son coherentes.
- [ ] No se indexan datos privados ni rutas pendientes.
- [ ] El frontend no promete ocultar lo que el navegador recibe.
- [ ] Los hallazgos técnicos tienen estado de reproducción y regresión cuando corresponde.
- [ ] CI pasa typecheck, tests, auditoría, búsqueda de patrones inseguros y build.
- [ ] El despliegue se hace con el workflow manual aprobado.
- [ ] La comprobación final se hace en la URL publicada y en una sesión limpia.

## 21. Orden inmediato recomendado

Este es el orden más corto para avanzar sin rehacer trabajo:

1. **Pedir respuestas al propietario** usando la sección 7. No editar textos de proyecto a partir de suposiciones.
2. **Cerrar Wooster**: URL exacta de GitHub, visibilidad, resumen, papel, tecnologías, evidencia y licencia.
3. **Cerrar Antevue**: alcance publicable, estado privado, decisión sobre showcase independiente, presentación, demo y permisos.
4. **Cerrar el perfil**: CV, experiencia concreta, skills, extras, email, redes y ubicación.
5. **Elegir el contrato mínimo de enlaces** y documentar qué significa cada estado antes de tocar `ProjectsApp`.
6. **Actualizar `projects.ts` y `profile.ts`** con los datos aprobados, manteniendo solo los dos proyectos.
7. **Actualizar i18n y `portfolioFiles.ts`**. Corregir la errata catalana y quitar la instrucción de perfil del footer de proyectos.
8. **Implementar P0 de UI**: tarjetas limpias, etiquetas semánticas, acceso rápido, foco y modo compacto inicial.
9. **Revisar SEO y dominio**: `VITE_SITE_URL`, `VITE_BASE`, CNAME, robots, sitemap, manifest y previews.
10. **Reproducir los hallazgos técnicos**. Corregir solo los que se reproduzcan y añadir la prueba correspondiente.
11. **Ejecutar typecheck, suite, build y revisión manual** en las dimensiones, idiomas y estados de enlace definidos.
12. **Obtener aprobación editorial y desplegar manualmente**. Después observar si hace falta P1, en lugar de anticipar P2.

La decisión importante es sencilla: primero publicar dos proyectos verdaderos y fáciles de entender. Las rutas, los showcases y la medición vienen después, cuando exista material que compartir y una pregunta que responder.
