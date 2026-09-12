## Estado actual — completado
- [x] Formulario base: link de vacante, upload de CV y archivo de info propia
- [x] Análisis de fit simulado (lógica de keywords) + draft de cover letter
- [x] Selector de idioma (Español/Inglés/Italiano/Portugués) — implementado
      pero con bug pendiente (ver abajo)
- [x] Descarga de Excel de seguimiento (crea o suma filas a uno existente)
- [x] Botones de envío de mail (Gmail / Otro email) con asunto en formato
      "[Título de la vacante] - [Nombre y Apellido]"
- [x] Rediseño visual con Tailwind, estilo inspirado en LinkedIn, estados de
      loading con animación de "escaneo" y mensajes de error

## Próximos pasos — orden recomendado

### 1. [BLOQUEANTE] Fix: selector de idioma no funciona

**Diagnóstico completo:**

- Auditoría estática de `getCurrentLanguage()`, `handleSubmit` y `handleDownloadTracking`
  (confirmada también con `grep`, no solo lectura visual): existe un único
  `<select id="languageSelect">` en todo el proyecto y una única función
  `getCurrentLanguage()` (lee `document.getElementById("languageSelect").value`),
  llamada fresca en los dos únicos puntos que generan output dependiente del
  idioma: `handleSubmit` (análisis + cover letter) y `handleDownloadTracking`
  (Excel). No hay ninguna variable global cacheando el idioma ni una segunda
  definición shadow — **ya es una sola fuente de verdad, no hay duplicación
  que corregir.**
- Se buscaron copias duplicadas del proyecto en `D:\Documents`, `Desktop` y
  `Downloads`: solo existe una copia de `index.html`/`app.js`, en la carpeta
  del proyecto. Descartado que se esté abriendo por error una copia vieja.
- Reproducción en vivo en Chrome (servidor estático local, pestaña 100%
  fresca, selección del idioma con interacción real de teclado sobre el
  `<select>`, no vía JS): el análisis, la cover letter y el Excel de
  seguimiento salieron **100% correctos en inglés** ("Analysis results",
  "Medium fit", "Cover letter draft (generic, for testing)", "Send via
  Gmail"; Excel con headers `Date | Company | Position | Status | Fit
  analysis result`, hoja "Tracking", estado "Applied"). El código en disco
  funciona correctamente end-to-end tal como está.
- Le consulté al usuario cómo estaba probando: confirmó que sí recargó/reabrió
  el archivo y aun así no cambiaba — descartando el escenario de "pestaña
  vieja sin recargar".
- **Causa más probable**: dado que el código funciona cuando se sirve/carga
  fresco, y el archivo típicamente se abre por doble clic (`file://`), lo más
  consistente es **cacheo del navegador sobre `app.js`**. Bajo `file://`, un
  F5 simple no siempre invalida el caché de un script local, sobre todo
  después de múltiples ediciones del mismo archivo dentro de la misma sesión
  de pestaña — hace falta un hard-refresh (Ctrl+Shift+R) o cerrar la pestaña
  por completo para forzar la recarga real del `app.js` actualizado.

**Pasos exactos del fix (pendiente de implementar):**

1. Agregar cache-busting al script en `index.html`: cambiar
   `<script src="app.js"></script>` por `<script src="app.js?v=2"></script>`
   (bumpear el número de versión manualmente en cada edición futura de
   `app.js`, mientras no haya build step que lo automatice).
2. No hace falta ningún refactor de la lógica de idioma — ya está
   correctamente centralizada, según confirma la auditoría de arriba.
3. Verificar: levantar el servidor local, seleccionar idioma con interacción
   real (no solo vía JS), analizar, confirmar visualmente que el resultado y
   la cover letter cambian de idioma — repetir en al menos 2 idiomas (ej.
   inglés e italiano). Descargar el Excel en un idioma no-español y confirmar
   con Excel real que headers/estado/hoja están en ese idioma.
4. Si después de este cambio el usuario sigue viendo el problema tras un
   hard-refresh real (Ctrl+Shift+R), eso indicaría algo específico de su
   entorno (navegador, extensión, forma exacta de abrir el archivo) que
   habría que investigar con más detalle en esa próxima sesión.

### 2. Comparador de hasta 5 vacantes simultáneas

Convertí el formulario de una sola vacante a un comparador de hasta 5 vacantes
simultáneas.

**ESTRUCTURA DEL FORMULARIO:**
- El primer bloque de vacante queda como está, pero le agregás un campo "Título"
  arriba del textarea de descripción, con placeholder/watermark: "Nombre del rol + empresa
  (ej: Data Analyst - Globant)".
- Debajo, un botón "+ Agregar Vacante" que agrega un bloque idéntico (título +
  descripción + link), hasta un máximo de 5. Al llegar a 5, el botón desaparece o se
  deshabilita con un mensaje breve.
- Cada bloque (excepto si es el único) tiene un botón "X" o "Eliminar" para sacarlo.
- El CV y el archivo de info propia siguen siendo únicos, compartidos para todas las
  vacantes (no se suben por separado en cada bloque).

**BOTÓN DE ANÁLISIS:**
- Un solo botón "Analizar" (reemplaza cualquier distinción anterior entre "comparación"
  y "analizar").
- Si hay 1 vacante: comportamiento actual, sin cambios.
- Si hay 2+ vacantes: el resultado muestra primero un RESUMEN COMPARATIVO (ranking de
  las vacantes de mejor a peor fit, con una breve justificación de por qué la mejor
  es la mejor), y debajo el DETALLE individual de cada vacante (mismo análisis que
  hoy, identificado con el título que puso el usuario).

**ENVÍO DE MAIL:**
- Se elimina cualquier paso intermedio de "ver la cover letter" en pantalla.
- Debajo de los resultados, agregá un selector desplegable con los títulos de las
  vacantes cargadas, y un solo par de botones "Enviar por Gmail" / "Otro email" que
  generan el draft (asunto + cuerpo) correspondiente a la vacante seleccionada en
  ese momento, en el idioma activo, con el asunto en formato
  "[Título de la vacante] - [Nombre y Apellido del usuario]".

**EXCEL:**
- El botón "Descargar seguimiento" ahora debe poder agregar hasta 5 filas nuevas de
  una sola vez (una por cada vacante analizada), manteniendo la lógica ya implementada
  de sumar a un archivo existente si el usuario lo sube.

Todo el contenido generado (análisis, resumen comparativo, mails) respeta el idioma
seleccionado en el dropdown de idioma existente.

### 3. Selector de tema claro/oscuro

Agregá un selector de tema claro/oscuro: un ícono de sol/luna ubicado junto
al selector de idioma en la esquina superior derecha, que alterna entre los
dos modos con un clic.

**NOTA: para este punto, ANTES de implementar, pedile explícitamente al usuario que
adjunte una captura de LinkedIn en modo oscuro como referencia de estilo. No avances
sin esa captura.**

**COMPORTAMIENTO:**
- Por default, la app arranca siempre en modo claro (no depender de la
  preferencia del sistema operativo).
- El tema elegido se guarda en localStorage para mantenerse al recargar la página.
- Se aplica a toda la interfaz: formulario, cards de resultados, botones,
  selectores, mensajes de error, estados de loading — sin elementos que
  queden con el tema anterior.

**PALETA MODO OSCURO:**
- Fondos en grises oscuros, azules como color de acento (consistente con
  la paleta ya usada en modo claro), buen contraste de texto.
- Ajustar también sombras, bordes y estados de hover/focus para que se
  vean intencionales en oscuro, no solo una inversión de colores plana.
- No repliques elementos de marca de LinkedIn (logo, ícono, nombre) — es
  solo referencia de estilo, no un clon.

**IMPLEMENTACIÓN:**
- Usá el sistema de dark mode de Tailwind (clases `dark:`).

### 4. Descarga de análisis en PDF/HTML

Agregá un botón "Descargar análisis" con un dropdown chico al lado para elegir
el formato: PDF o HTML.

**CONTENIDO DEL DOCUMENTO:**
- Solo el análisis de fit (nunca la cover letter — la cover letter no debe
  mostrarse en pantalla en ningún lugar de la app; vive únicamente dentro del
  draft que se genera al usar los botones de Gmail/Otro mail. Si quedó visible
  en algún componente anterior, sacala).
- Si hay 1 vacante analizada: el documento contiene el análisis de esa vacante.
- Si hay 2+ vacantes: un único archivo consolidado con el resumen comparativo
  (ranking + justificación) arriba, y el detalle individual de cada vacante
  debajo, identificado con su título.

**ESTILO:**
- El PDF/HTML debe mantener el diseño visual de la app (misma paleta, cards,
  tipografía definidos en el rediseño estilo LinkedIn), no un informe de texto plano.
- El documento descargado siempre se genera en modo claro, sin importar el
  tema activo en la app.
- Respetar el idioma seleccionado.

**IMPLEMENTACIÓN:**
- Generá ambos formatos en el navegador, sin backend: usá jsPDF (o html2pdf)
  para el PDF, y para el HTML simplemente exportá el markup renderizado con
  los estilos inline o embebidos, para que sea un archivo autocontenido.
- Nombre del archivo: "analisis-fit-[nombre del usuario].pdf" o ".html" según
  el formato elegido, sanitizando espacios y tildes en el nombre (ej:
  "analisis-fit-facundo-villalba.pdf").
