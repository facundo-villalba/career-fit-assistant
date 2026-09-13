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

## Próximos pasos — orden recomendado

No quedan puntos pendientes de la planificación original. Próxima sesión:
definir con el usuario qué sigue (nuevas features, pulido, o cerrar la
herramienta de prueba como está).
