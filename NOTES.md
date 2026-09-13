## Estado actual — completado
- [x] Formulario base: link de vacante, upload de CV y archivo de info propia
- [x] Análisis de fit simulado (lógica de keywords) + draft de cover letter
      (la cover letter nunca se muestra en pantalla, solo vía "Copiar draft"
      o los botones de mail)
- [x] Selector de idioma (Español/Inglés/Italiano/Portugués) — funcionando
      end-to-end, incluida la retraducción de resultados ya en pantalla
      (ver "Fix aplicado" abajo)
- [x] Descarga de Excel de seguimiento (crea o suma filas a uno existente)
- [x] Botones de envío de mail (Gmail / Otro email) con asunto en formato
      "[Título de la vacante] - [Nombre y Apellido]"
- [x] Rediseño visual con Tailwind, estilo inspirado en LinkedIn, estados de
      loading con animación de "escaneo" y mensajes de error
- [x] Comparador de hasta 5 vacantes simultáneas: bloques de título +
      descripción + link (CV e info propia siguen siendo únicos y
      compartidos), botón "+ Agregar Vacante" con tope de 5, un solo botón
      "Analizar" que muestra resumen comparativo (ranking + justificación
      del ganador) cuando hay 2+ vacantes y detalle individual debajo,
      selector de vacante para elegir a cuál le corresponde el mail
      Gmail/Otro email, y Excel que agrega una fila por cada vacante
      analizada en una sola descarga
- [x] Selector de tema claro/oscuro: switch deslizable (sol/luna) junto al
      selector de idioma, usando `dark:` de Tailwind (`darkMode: "class"`)
      sobre la familia `slate` ya usada en modo claro. Arranca siempre en
      claro (no depende de `prefers-color-scheme`), persiste en
      `localStorage` con un script de bootstrap en el `<head>` que evita el
      flash de tema incorrecto al recargar, y cubre toda la interfaz
      (formulario, dropzones, botones, loading, badges de fit, keywords,
      resumen comparativo, tracking). `aria-label` traducido en los 4
      idiomas vía el mismo sistema `data-i18n` (extendido con
      `data-i18n-aria-label`). Paleta de referencia: captura de un perfil
      de LinkedIn en modo oscuro provista por el usuario (solo estilo, sin
      elementos de marca).
- [x] Descarga de análisis en PDF/HTML: botón "Descargar análisis" + select
      PDF/HTML, ubicado debajo de las cards de resultados y arriba del
      bloque de mail. El documento se construye desde los datos
      (`lastAnalyses` + idioma activo) con una plantilla de exportación
      propia (`buildExportRoot` y funciones relacionadas en `app.js`), no
      clonando la UI en pantalla — así nunca incluye los controles de
      mail/tracking y siempre sale en paleta clara sin importar el tema
      activo de la app. El PDF se genera "fotografiando" esa plantilla
      (fuera de pantalla) con html2pdf.js; el HTML usa el mismo markup con
      un `<style>` propio embebido (clases `export-*`, sin depender de
      Tailwind CDN), quedando 100% autocontenido y viewable offline. Nombre
      de archivo sanitizado a `[a-z0-9-]` con fallback genérico
      (`analisis-fit.pdf`) cuando no se detecta un nombre en el CV.
- [x] Rebranding: título "Career Fit Assistant" (igual en los 4 idiomas,
      tratado como nombre de producto) y subtítulo nuevo ("Postulá fácil,
      rápido e inteligente. Ganá tiempo, ganá el puesto.", traducido a
      EN/IT/PT).
- [x] Campo "Más sobre mí" (ex "Info propia") ahora es opcional: si no se
      sube archivo, el análisis corre solo con el CV (`combinedProfileText`
      cae a solo CV, sin tirar error). Label y mensaje de error de tipo de
      archivo inválido renombrados en los 4 idiomas.
- [x] Fit breakdown por dimensiones en el motor real: además del score por
      keywords ("skills"), `computeFit` ahora calcula 3 dimensiones más
      vía heurísticas de palabras clave por idioma (`SENIORITY_TERMS`,
      `INDUSTRY_TERMS`, `MODALITY_TERMS` en `app.js`):
      - **Seniority**: compara el nivel (junior/semi-senior/senior)
        detectado en la vacante vs. el perfil.
      - **Industria**: compara rubros detectados en la vacante vs. el
        perfil (lista curada de ~20 sectores por idioma).
      - **Modalidad**: compara remoto/híbrido/presencial mencionado en la
        vacante vs. el perfil.
      Cuando la vacante no menciona una dimensión, esa dimensión da 100
      automáticamente — el score combinado (`skills*0.55 + otras*0.15`
      c/u) coincide con el score de solo-keywords de antes en el caso más
      común (vacantes que no mencionan seniority/industria/modalidad
      explícitamente). El breakdown se muestra como 4 barras chicas en la
      card de resultado (`renderFitBreakdown`) y también en el export
      PDF/HTML (`buildExportBreakdown`).
- [x] Caso de uso precargado ("Ver Ejemplo"): dos botones arriba del
      bloque de vacante del formulario — "Comenzá" (primario) y "Ver
      Ejemplo" (secundario). "Ver Ejemplo" swap-ea el contenido del mismo
      `<form>` (no es un overlay posicionado, es un toggle entre
      `#realFormContent` y `#exampleOverlay`, evitando problemas de
      z-index/alto) mostrando un candidato ficticio (ex-atleta olímpica
      pivotando a corporate) y 2 vacantes de ejemplo, cada una con su
      botón "Analizar". Los 5 JSON de datos viven en
      `/examples/example-1/` (`candidato.json`, `vacante-marketing.json`,
      `vacante-finance.json`, `resultado-marketing.json`,
      `resultado-finance.json`), traducidos a los 4 idiomas, y se cargan
      con `fetch()` (requiere servir la app por HTTP — GitHub Pages en
      producción — no funciona abriendo `index.html` directo con
      `file://`). Al analizar una vacante del ejemplo: loading simulado de
      1.2s → resultado reutilizando `renderJobDetailCard` (mismo
      componente que el flujo real, con el breakdown de dimensiones ya
      calculado y sin grilla de keywords, que el ejemplo no trae) + badge
      "Todo eso, para vos" / "(ejemplo pre-generado)" + botón "Copiar
      cover letter" (copia `cover_letter_text` del idioma activo) + CTA
      "Probalo ahora" que cierra el overlay y vuelve al formulario real.
      Cambiar de idioma con el overlay abierto repinta la sub-vista activa
      con los datos ya cacheados, sin volver a pedir los JSON
      (`retranslateExampleOverlay`).

### Fix aplicado: selector de idioma

El diagnóstico previo (auditoría estática + reproducción en vivo) había
descartado duplicación de lógica y concluido que el problema reportado era
caché del navegador sobre `app.js` bajo `file://`. Se aplicó cache-busting
(`app.js?v=N`, bumpeado en cada edición) como mitigación de esa causa.

Revisando el código con la app ya en su versión con comparador de 5
vacantes, apareció una causa adicional, más específica, que probablemente
explica mejor el síntoma original: el listener de `languageSelect` solo
llamaba a `applyTranslations()`, que retraduce labels/placeholders estáticos
(`data-i18n`) pero no los resultados ya renderizados (`resultsHeading`,
resumen comparativo, cards de detalle, texto de los botones de mail) — esos
solo se pintaban dentro de `renderResults()`, invocada únicamente al
analizar. Consecuencia: si el usuario analizaba en un idioma y después
cambiaba el selector, la pantalla quedaba en el idioma viejo mientras que el
mail y el Excel (que leen el idioma en el momento del click) salían en el
idioma nuevo — inconsistencia entre lo que se ve en pantalla y lo que se
envía/descarga.

Fix: se separó el pintado de resultados (`paintResults`) del "revelado"
(fade-in + scroll, que solo debe correr al analizar). El listener de
`languageSelect` ahora llama a `retranslateResults(lang)`, que repinta los
resultados ya visibles (si hay un análisis previo) preservando la vacante
elegida en el selector de mail, sin re-disparar el fade-in ni el scroll.

### Gotcha de Tailwind: `hidden` + utility de `display` en el mismo elemento

Al construir "Ver Ejemplo" apareció un bug real: el loading de una vacante
del ejemplo (spinner + "Analizando...") se mostraba siempre, aunque el
elemento tuviera el atributo `hidden`. Causa: el elemento combinaba
`hidden` con una clase de Tailwind que también fija `display` (`class="flex
items-center gap-3"` en ese caso). La regla nativa `[hidden]{display:none}`
del navegador y la regla `.flex{display:flex}` de Tailwind tienen
especificidad CSS equivalente, y como la hoja de Tailwind se inyecta
después de la hoja de estilos por defecto del navegador, `.flex` termina
ganando la cascada — el elemento nunca llega a ocultarse por más que
`el.hidden = true` esté seteado correctamente en JS.

Mismo problema se encontró (preventivamente, antes de que se manifestara)
en `keywordsGrid` de `jobDetailTemplate`, que combinaba `hidden` (togglable
por JS para el caso del ejemplo, que no trae keywords) con `class="grid
gap-6 sm:grid-cols-2"`.

Fix en ambos casos: mover la clase de `display` (`flex`/`grid`) a un `<div>`
interno, dejando el `hidden` en un contenedor externo sin ninguna utility
de `display` compitiendo. Regla general para el resto del proyecto: nunca
combinar `hidden` con `flex`/`grid`/`inline-flex`/`block` u otra utility de
`display` en el mismo elemento cuando ese `hidden` se togglea por JS —
envolver en un wrapper en su lugar.

## Próximos pasos — orden recomendado

No quedan puntos pendientes de la planificación original. Próxima sesión:
definir con el usuario qué sigue (nuevas features, pulido, o cerrar la
herramienta de prueba como está).

Nota técnica: desde que existe "Ver Ejemplo" (`fetch()` a
`/examples/example-1/*.json`), la app dejó de ser 100% `file://`-friendly
— necesita servirse por HTTP (GitHub Pages en producción; un servidor
estático local al probar) para que esos JSON carguen sin error de CORS.
