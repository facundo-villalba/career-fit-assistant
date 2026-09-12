pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js";

const STOPWORDS = new Set([
  // español
  "de", "la", "que", "el", "en", "y", "a", "los", "del", "se", "las", "por", "un", "para",
  "con", "no", "una", "su", "al", "lo", "como", "mas", "pero", "sus", "le", "ya", "o",
  "este", "si", "porque", "esta", "entre", "cuando", "muy", "sin", "sobre", "tambien",
  "me", "hasta", "hay", "donde", "quien", "desde", "todo", "nos", "durante", "todos",
  "uno", "les", "ni", "contra", "otros", "ese", "eso", "ante", "ellos", "esto", "mi",
  "antes", "algunos", "unos", "yo", "otro", "otras", "otra", "tanto", "esa",
  "estos", "mucho", "quienes", "nada", "muchos", "cual", "poco", "ella", "estar",
  "estas", "algunas", "algo", "nosotros", "mis", "tu", "te", "ti", "tus", "ellas",
  "es", "son", "ser", "fue", "era", "eres", "soy", "sido", "siendo", "ha", "han",
  "hemos", "he", "tiene", "tienen", "tener", "hace", "hacer", "hizo",
  // filler de avisos laborales
  "empresa", "trabajo", "puesto", "vacante", "experiencia", "anos", "buscamos",
  "ofrecemos", "requisitos", "responsabilidades", "conocimientos", "equipo",
  "favor", "postular", "postulacion", "enviar", "cv", "curriculum", "salario",
  "beneficios", "modalidad", "jornada", "ubicacion", "disponibilidad",
  // inglés
  "the", "and", "for", "are", "but", "not", "you", "your", "all", "can", "her", "was",
  "one", "our", "out", "day", "get", "has", "him", "his", "how", "man", "new", "now",
  "old", "see", "two", "way", "who", "boy", "did", "its", "let", "put", "say", "she",
  "too", "use", "with", "from", "they", "this", "that", "have", "will", "would",
  "about", "which", "when", "make", "like", "time", "just", "know", "take", "into",
  "year", "good", "some", "could", "them", "other", "than", "then", "look", "only",
  "come", "over", "also", "back", "after", "work", "first", "well", "even", "want",
  // filler EN
  "company", "job", "position", "role", "looking", "offer", "requirements",
  "responsibilities", "skills", "team", "please", "apply", "application",
  "send", "resume", "salary", "benefits", "location", "remote", "onsite", "hybrid",
]);

const FIT_THRESHOLD_HIGH = 70;
const FIT_THRESHOLD_MEDIUM = 40;
const LOADING_STEP_INTERVAL_MS = 900;

const TRANSLATIONS = {
  es: {
    locale: "es-AR",
    fitLabels: { alto: "Fit alto", medio: "Fit medio", bajo: "Fit bajo", indeterminado: "Indeterminado" },
    resultsHeading: "Resultados del análisis",
    matchedHeading: "Keywords que matchearon",
    missingHeading: "Keywords que faltan",
    noMatchedKeywords: "Ninguna keyword matcheó.",
    allMatchedKeywords: "¡Matchearon todas las keywords detectadas!",
    coverLetterHeading: "Draft de cover letter (genérico, de prueba)",
    namePlaceholder: "[Tu nombre]",
    rolePlaceholder: "[PUESTO]",
    companyPlaceholder: "[EMPRESA]",
    noMatchedFallback: "algunos puntos de la vacante",
    coverLetter: ({ nombre, empresa, puesto, matchedList }) =>
`Estimado equipo de reclutamiento de ${empresa},

Mi nombre es ${nombre} y me postulo con interés a la posición de ${puesto}. Según el análisis de coincidencias entre mi perfil y la vacante, identifiqué puntos en común como: ${matchedList}.

[Este es un draft genérico de prueba generado localmente en el navegador, sin conexión a ningún modelo de lenguaje real. Reemplazá este texto y personalizalo antes de usarlo.]

Saludos cordiales,
${nombre}`,
    excelHeaderLabels: { fecha: "Fecha", empresa: "Empresa", puesto: "Puesto", estado: "Estado", resultado: "Resultado del análisis de fit" },
    excelStatus: "Postulado",
    excelSheetName: "Seguimiento",
    sendGmailLabel: "Enviar por Gmail",
    sendOtherEmailLabel: "Otro email",
    loadingSteps: [
      "Leyendo tu CV...",
      "Comparando tu perfil con la vacante...",
      "Detectando keywords en común...",
      "Armando el draft de la cover letter...",
    ],
  },
  en: {
    locale: "en-US",
    fitLabels: { alto: "High fit", medio: "Medium fit", bajo: "Low fit", indeterminado: "Undetermined" },
    resultsHeading: "Analysis results",
    matchedHeading: "Matched keywords",
    missingHeading: "Missing keywords",
    noMatchedKeywords: "No keywords matched.",
    allMatchedKeywords: "All detected keywords matched!",
    coverLetterHeading: "Cover letter draft (generic, for testing)",
    namePlaceholder: "[Your name]",
    rolePlaceholder: "[POSITION]",
    companyPlaceholder: "[COMPANY]",
    noMatchedFallback: "some points from the job posting",
    coverLetter: ({ nombre, empresa, puesto, matchedList }) =>
`Dear ${empresa} recruitment team,

My name is ${nombre} and I am writing to apply for the ${puesto} position. Based on a comparison between my profile and the job posting, I identified common points such as: ${matchedList}.

[This is a generic test draft generated locally in the browser, without any connection to a real language model. Replace this text and personalize it before using it.]

Best regards,
${nombre}`,
    excelHeaderLabels: { fecha: "Date", empresa: "Company", puesto: "Position", estado: "Status", resultado: "Fit analysis result" },
    excelStatus: "Applied",
    excelSheetName: "Tracking",
    sendGmailLabel: "Send via Gmail",
    sendOtherEmailLabel: "Other email",
    loadingSteps: [
      "Reading your CV...",
      "Comparing your profile with the job posting...",
      "Detecting matching keywords...",
      "Drafting the cover letter...",
    ],
  },
  it: {
    locale: "it-IT",
    fitLabels: { alto: "Fit alto", medio: "Fit medio", bajo: "Fit basso", indeterminado: "Indeterminato" },
    resultsHeading: "Risultati dell'analisi",
    matchedHeading: "Keyword corrispondenti",
    missingHeading: "Keyword mancanti",
    noMatchedKeywords: "Nessuna keyword corrisponde.",
    allMatchedKeywords: "Tutte le keyword rilevate corrispondono!",
    coverLetterHeading: "Bozza di lettera di presentazione (generica, di prova)",
    namePlaceholder: "[Il tuo nome]",
    rolePlaceholder: "[POSIZIONE]",
    companyPlaceholder: "[AZIENDA]",
    noMatchedFallback: "alcuni punti dell'offerta di lavoro",
    coverLetter: ({ nombre, empresa, puesto, matchedList }) =>
`Gentile team di reclutamento di ${empresa},

Mi chiamo ${nombre} e sono interessato/a a candidarmi per la posizione di ${puesto}. In base all'analisi delle corrispondenze tra il mio profilo e l'offerta di lavoro, ho individuato punti in comune come: ${matchedList}.

[Questa è una bozza generica di prova generata localmente nel browser, senza alcuna connessione a un modello linguistico reale. Sostituisci questo testo e personalizzalo prima di utilizzarlo.]

Cordiali saluti,
${nombre}`,
    excelHeaderLabels: { fecha: "Data", empresa: "Azienda", puesto: "Posizione", estado: "Stato", resultado: "Risultato dell'analisi di fit" },
    excelStatus: "Candidato",
    excelSheetName: "Monitoraggio",
    sendGmailLabel: "Invia con Gmail",
    sendOtherEmailLabel: "Altra email",
    loadingSteps: [
      "Lettura del tuo CV...",
      "Confronto del tuo profilo con l'offerta di lavoro...",
      "Rilevamento delle keyword in comune...",
      "Stesura della bozza della lettera di presentazione...",
    ],
  },
  pt: {
    locale: "pt-BR",
    fitLabels: { alto: "Fit alto", medio: "Fit médio", bajo: "Fit baixo", indeterminado: "Indeterminado" },
    resultsHeading: "Resultados da análise",
    matchedHeading: "Palavras-chave correspondentes",
    missingHeading: "Palavras-chave faltantes",
    noMatchedKeywords: "Nenhuma palavra-chave correspondeu.",
    allMatchedKeywords: "Todas as palavras-chave detectadas corresponderam!",
    coverLetterHeading: "Rascunho de carta de apresentação (genérico, de teste)",
    namePlaceholder: "[Seu nome]",
    rolePlaceholder: "[CARGO]",
    companyPlaceholder: "[EMPRESA]",
    noMatchedFallback: "alguns pontos da vaga",
    coverLetter: ({ nombre, empresa, puesto, matchedList }) =>
`Estimada equipe de recrutamento da ${empresa},

Meu nome é ${nombre} e estou me candidatando com interesse à vaga de ${puesto}. Com base na análise de correspondências entre meu perfil e a vaga, identifiquei pontos em comum como: ${matchedList}.

[Este é um rascunho genérico de teste gerado localmente no navegador, sem conexão com nenhum modelo de linguagem real. Substitua este texto e personalize-o antes de usá-lo.]

Atenciosamente,
${nombre}`,
    excelHeaderLabels: { fecha: "Data", empresa: "Empresa", puesto: "Cargo", estado: "Status", resultado: "Resultado da análise de fit" },
    excelStatus: "Candidatado",
    excelSheetName: "Acompanhamento",
    sendGmailLabel: "Enviar pelo Gmail",
    sendOtherEmailLabel: "Outro email",
    loadingSteps: [
      "Lendo seu currículo...",
      "Comparando seu perfil com a vaga...",
      "Detectando palavras-chave em comum...",
      "Preparando o rascunho da carta de apresentação...",
    ],
  },
};

function getCurrentLanguage() {
  return document.getElementById("languageSelect").value;
}

let loadingIntervalId = null;

const FADE_DURATION_MS = 300;

function revealWithFade(el) {
  el.hidden = false;
  el.classList.remove("opacity-100");
  el.classList.add("opacity-0");
  // Fuerza un reflow para que el navegador registre opacity:0 antes de
  // pasar a opacity:100 — sin esto, dos cambios de clase en el mismo tick
  // pueden colapsarse y la transición nunca se dispara (rAF no es confiable
  // si la pestaña está en background).
  void el.offsetHeight;
  el.classList.remove("opacity-0");
  el.classList.add("opacity-100");
}

function hideWithFade(el) {
  el.classList.remove("opacity-100");
  el.classList.add("opacity-0");
  setTimeout(() => {
    el.hidden = true;
  }, FADE_DURATION_MS);
}

function showLoading(lang) {
  const steps = TRANSLATIONS[lang].loadingSteps;
  const loadingSection = document.getElementById("loadingSection");
  const loadingStepText = document.getElementById("loadingStepText");
  const loadingProgressFill = document.getElementById("loadingProgressFill");

  let stepIndex = 0;
  const setStep = (index) => {
    loadingStepText.textContent = steps[index];
    loadingProgressFill.style.width = `${Math.round(((index + 1) / steps.length) * 100)}%`;
  };

  setStep(0);
  loadingIntervalId = setInterval(() => {
    stepIndex = Math.min(stepIndex + 1, steps.length - 1);
    setStep(stepIndex);
  }, LOADING_STEP_INTERVAL_MS);

  revealWithFade(loadingSection);
}

function hideLoading() {
  if (loadingIntervalId !== null) {
    clearInterval(loadingIntervalId);
    loadingIntervalId = null;
  }
  document.getElementById("loadingProgressFill").style.width = "100%";
  hideWithFade(document.getElementById("loadingSection"));
}

async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join(" ") + "\n";
  }
  return text;
}

async function extractDocxText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function extractTextFromFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (ext === "pdf") return extractPdfText(file);
  if (ext === "txt") return file.text();
  if (ext === "docx") return extractDocxText(file);
  if (ext === "doc") {
    throw new Error("Los archivos .doc (Word 97-2003) no se pueden leer en el navegador. Guardá el archivo como .docx o .pdf.");
  }
  throw new Error(`Formato no soportado: .${ext}`);
}

function normalize(text) {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function tokenize(text) {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
}

function extractKeywords(jobText, maxKeywords = 20) {
  const freq = new Map();
  for (const token of tokenize(jobText)) {
    if (STOPWORDS.has(token)) continue;
    freq.set(token, (freq.get(token) || 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

function computeFit(jobText, combinedProfileText) {
  const keywords = extractKeywords(jobText);
  if (keywords.length === 0) {
    return { keywords: [], matched: [], missing: [], score: 0, labelKey: "indeterminado" };
  }
  const profileTokens = new Set(tokenize(combinedProfileText));
  const matched = keywords.filter((k) => profileTokens.has(k));
  const missing = keywords.filter((k) => !profileTokens.has(k));
  const score = Math.round((matched.length / keywords.length) * 100);
  const labelKey =
    score >= FIT_THRESHOLD_HIGH ? "alto" :
    score >= FIT_THRESHOLD_MEDIUM ? "medio" :
    "bajo";
  return { keywords, matched, missing, score, labelKey };
}

function guessRole(jobText, lang) {
  const m = jobText.match(/(?:puesto|posici[oó]n|posizione|cargo|vaga|role|position)[:\s]+([^\n.,;]{3,60})/i);
  if (m) return m[1].trim();
  const firstLine = jobText.split("\n").find((l) => l.trim().length > 0);
  return firstLine && firstLine.length < 80 ? firstLine.trim() : TRANSLATIONS[lang].rolePlaceholder;
}

function guessCompany(jobText, lang) {
  const m =
    jobText.match(/(?:empresa|azienda|company)[:\s]+([^\n.,;]{2,50})/i) ||
    jobText.match(/\b(?:en|at|in|em)\s+([A-Z][\w&.,'-]{2,40})/);
  return m ? m[1].trim() : TRANSLATIONS[lang].companyPlaceholder;
}

function guessCandidateName(cvText, lang) {
  const firstLine = cvText.split("\n").map((l) => l.trim()).find((l) => l.length > 0);
  if (firstLine) {
    const namePart = firstLine.split(/[-|–—,]/)[0].trim();
    if (namePart.length > 0 && namePart.length < 60) return namePart;
  }
  return TRANSLATIONS[lang].namePlaceholder;
}

function buildCoverLetter(jobText, cvText, fitResult, lang) {
  const t = TRANSLATIONS[lang];
  const puesto = guessRole(jobText, lang);
  const empresa = guessCompany(jobText, lang);
  const nombre = guessCandidateName(cvText, lang);
  const matchedList = fitResult.matched.slice(0, 5).join(", ") || t.noMatchedFallback;
  return t.coverLetter({ nombre, empresa, puesto, matchedList });
}

function buildMailSubject(jobText, cvText, lang) {
  const puesto = guessRole(jobText, lang);
  const nombre = guessCandidateName(cvText, lang);
  return `${puesto} - ${nombre}`;
}

const TRACKING_FILENAME = "seguimiento-postulaciones.xlsx";
const TRACKING_FIELD_ORDER = ["fecha", "empresa", "puesto", "estado", "resultado"];

let lastJobText = null;
let lastFitResult = null;
let lastMailSubject = null;

function buildTrackingRow(jobText, fitResult, lang) {
  const t = TRANSLATIONS[lang];
  return {
    fecha: new Date().toLocaleDateString(t.locale),
    empresa: guessCompany(jobText, lang),
    puesto: guessRole(jobText, lang),
    estado: t.excelStatus,
    resultado: `${fitResult.score}% - ${t.fitLabels[fitResult.labelKey]}`,
  };
}

async function readExistingTrackingRows(file) {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const dataRows = rawRows.slice(1);
  return dataRows.map((row) => {
    const record = {};
    TRACKING_FIELD_ORDER.forEach((field, index) => {
      record[field] = row[index] !== undefined ? row[index] : "";
    });
    return record;
  });
}

function downloadTrackingWorkbook(rows, lang) {
  const t = TRANSLATIONS[lang];
  const headerLabels = TRACKING_FIELD_ORDER.map((field) => t.excelHeaderLabels[field]);
  const translatedRows = rows.map((row) => {
    const translated = {};
    TRACKING_FIELD_ORDER.forEach((field, index) => {
      translated[headerLabels[index]] = row[field];
    });
    return translated;
  });
  const worksheet = XLSX.utils.json_to_sheet(translatedRows, { header: headerLabels });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, t.excelSheetName);
  XLSX.writeFile(workbook, TRACKING_FILENAME);
}

function showTrackingError(message) {
  const trackingError = document.getElementById("trackingError");
  trackingError.textContent = message;
  trackingError.hidden = false;
}

function hideTrackingError() {
  const trackingError = document.getElementById("trackingError");
  trackingError.hidden = true;
}

async function handleDownloadTracking() {
  hideTrackingError();

  if (!lastJobText || !lastFitResult) {
    showTrackingError("Primero analizá una vacante para poder registrarla en el seguimiento.");
    return;
  }

  const existingFile = document.getElementById("existingExcelFile").files[0];
  const downloadTrackingBtn = document.getElementById("downloadTrackingBtn");
  downloadTrackingBtn.disabled = true;

  try {
    const lang = getCurrentLanguage();
    let rows = [];
    if (existingFile) {
      rows = await readExistingTrackingRows(existingFile);
    }
    rows.push(buildTrackingRow(lastJobText, lastFitResult, lang));
    downloadTrackingWorkbook(rows, lang);
  } catch (err) {
    showTrackingError(`No se pudo leer el Excel existente: ${err.message}`);
  } finally {
    downloadTrackingBtn.disabled = false;
  }
}

function renderKeywordList(listEl, keywords, emptyText, itemClassName) {
  listEl.innerHTML = "";
  if (keywords.length === 0) {
    const li = document.createElement("li");
    li.textContent = emptyText;
    li.className = "text-sm text-slate-500";
    listEl.appendChild(li);
    return;
  }
  for (const kw of keywords) {
    const li = document.createElement("li");
    li.textContent = kw;
    li.className = itemClassName;
    listEl.appendChild(li);
  }
}

const BADGE_VARIANT_CLASSES = {
  alto: "bg-green-100 text-green-800",
  medio: "bg-amber-100 text-amber-800",
  bajo: "bg-red-100 text-red-800",
  indeterminado: "bg-slate-200 text-slate-700",
};

const PROGRESS_FILL_VARIANT_CLASSES = {
  alto: "bg-green-500",
  medio: "bg-amber-500",
  bajo: "bg-red-500",
  indeterminado: "bg-slate-400",
};

function renderResults(fitResult, coverLetterText, lang) {
  const t = TRANSLATIONS[lang];

  const fitScoreValue = document.getElementById("fitScoreValue");
  const fitLabelBadge = document.getElementById("fitLabelBadge");
  const progressBarFill = document.getElementById("progressBarFill");
  const matchedKeywordsList = document.getElementById("matchedKeywordsList");
  const missingKeywordsList = document.getElementById("missingKeywordsList");
  const coverLetterOutput = document.getElementById("coverLetterOutput");
  const resultsSection = document.getElementById("resultsSection");

  document.getElementById("resultsHeading").textContent = t.resultsHeading;
  document.getElementById("matchedHeading").textContent = t.matchedHeading;
  document.getElementById("missingHeading").textContent = t.missingHeading;
  document.getElementById("coverLetterHeading").textContent = t.coverLetterHeading;
  document.getElementById("sendGmailBtn").textContent = t.sendGmailLabel;
  document.getElementById("sendOtherEmailBtn").textContent = t.sendOtherEmailLabel;

  fitScoreValue.textContent = `${fitResult.score}%`;
  fitLabelBadge.textContent = t.fitLabels[fitResult.labelKey];
  fitLabelBadge.className = `inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${BADGE_VARIANT_CLASSES[fitResult.labelKey]}`;
  progressBarFill.className = `h-full rounded-full transition-all duration-300 ease-in-out ${PROGRESS_FILL_VARIANT_CLASSES[fitResult.labelKey]}`;
  progressBarFill.style.width = `${fitResult.score}%`;

  renderKeywordList(matchedKeywordsList, fitResult.matched, t.noMatchedKeywords,
    "rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800");
  renderKeywordList(missingKeywordsList, fitResult.missing, t.allMatchedKeywords,
    "rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600");

  coverLetterOutput.value = coverLetterText;

  revealWithFade(resultsSection);
  resultsSection.scrollIntoView({ behavior: "smooth" });
}

function showFormError(message) {
  const formError = document.getElementById("formError");
  formError.textContent = message;
  formError.hidden = false;
}

function hideFormError() {
  const formError = document.getElementById("formError");
  formError.hidden = true;
}

const CV_EXTENSIONS = ["pdf", "doc", "docx"];
const EXTRA_INFO_EXTENSIONS = ["pdf", "doc", "docx", "txt"];

const FIELD_ERROR_MAP = {
  jobDescription: { inputId: "jobDescription", errorId: "jobDescriptionError" },
  cvFile: { inputId: "cvDropzone", errorId: "cvFileError" },
  extraInfoFile: { inputId: "extraInfoDropzone", errorId: "extraInfoFileError" },
};

const INVALID_FIELD_CLASSES = ["border-red-400", "ring-2", "ring-red-100"];
const VALID_FIELD_CLASSES = ["border-slate-300"];

function setFieldInvalid(fieldKey, message) {
  const { inputId, errorId } = FIELD_ERROR_MAP[fieldKey];
  const inputEl = document.getElementById(inputId);
  const errorEl = document.getElementById(errorId);
  inputEl.classList.remove(...VALID_FIELD_CLASSES);
  inputEl.classList.add(...INVALID_FIELD_CLASSES);
  inputEl.setAttribute("aria-invalid", "true");
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function clearFieldInvalid(fieldKey) {
  const { inputId, errorId } = FIELD_ERROR_MAP[fieldKey];
  const inputEl = document.getElementById(inputId);
  const errorEl = document.getElementById(errorId);
  inputEl.classList.remove(...INVALID_FIELD_CLASSES);
  inputEl.classList.add(...VALID_FIELD_CLASSES);
  inputEl.removeAttribute("aria-invalid");
  errorEl.hidden = true;
  errorEl.textContent = "";
}

function clearAllFieldErrors() {
  Object.keys(FIELD_ERROR_MAP).forEach(clearFieldInvalid);
}

function applyValidationErrors(errors) {
  clearAllFieldErrors();
  Object.entries(errors).forEach(([fieldKey, message]) => setFieldInvalid(fieldKey, message));
}

function validateForm(jobDescription, cvFile, extraInfoFile) {
  const errors = {};

  if (!jobDescription.trim()) {
    errors.jobDescription = "Pegá el texto completo de la descripción de la vacante.";
  }

  if (!cvFile) {
    errors.cvFile = "Subí tu CV en formato PDF o Word.";
  } else {
    const cvExt = cvFile.name.split(".").pop().toLowerCase();
    if (!CV_EXTENSIONS.includes(cvExt)) {
      errors.cvFile = "El CV debe ser un archivo PDF o Word (.doc/.docx).";
    }
  }

  if (!extraInfoFile) {
    errors.extraInfoFile = "Subí un archivo con tu información propia (PDF, Word o TXT).";
  } else {
    const extraExt = extraInfoFile.name.split(".").pop().toLowerCase();
    if (!EXTRA_INFO_EXTENSIONS.includes(extraExt)) {
      errors.extraInfoFile = "El archivo de información propia debe ser PDF, Word (.doc/.docx) o TXT.";
    }
  }

  return errors;
}

async function handleSubmit(event) {
  event.preventDefault();
  hideFormError();

  const jobDescription = document.getElementById("jobDescription").value;
  const cvFile = document.getElementById("cvFile").files[0];
  const extraInfoFile = document.getElementById("extraInfoFile").files[0];

  const errors = validateForm(jobDescription, cvFile, extraInfoFile);
  if (Object.keys(errors).length > 0) {
    applyValidationErrors(errors);
    const firstFieldKey = Object.keys(errors)[0];
    document.getElementById(FIELD_ERROR_MAP[firstFieldKey].inputId)
      .scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  clearAllFieldErrors();

  const analyzeBtn = document.getElementById("analyzeBtn");
  analyzeBtn.disabled = true;
  analyzeBtn.textContent = "Analizando...";

  const lang = getCurrentLanguage();
  showLoading(lang);

  try {
    const [cvText, extraInfoText] = await Promise.all([
      extractTextFromFile(cvFile),
      extractTextFromFile(extraInfoFile),
    ]);

    const combinedProfileText = `${cvText}\n${extraInfoText}`;
    const fitResult = computeFit(jobDescription, combinedProfileText);
    const coverLetterText = buildCoverLetter(jobDescription, cvText, fitResult, lang);

    lastJobText = jobDescription;
    lastFitResult = fitResult;
    lastMailSubject = buildMailSubject(jobDescription, cvText, lang);

    hideLoading();
    renderResults(fitResult, coverLetterText, lang);
  } catch (err) {
    hideLoading();
    showFormError(`No se pudo procesar alguno de los archivos: ${err.message}`);
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = "Analizar fit y generar cover letter";
  }
}

async function handleCopyClick() {
  const coverLetterOutput = document.getElementById("coverLetterOutput");
  const copyFeedback = document.getElementById("copyFeedback");
  try {
    await navigator.clipboard.writeText(coverLetterOutput.value);
    copyFeedback.hidden = false;
    setTimeout(() => {
      copyFeedback.hidden = true;
    }, 2000);
  } catch (err) {
    showFormError("No se pudo copiar al portapapeles.");
  }
}

function handleSendGmailClick() {
  const subject = lastMailSubject || "";
  const body = document.getElementById("coverLetterOutput").value;
  const url = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(url, "_blank", "noopener");
}

function handleSendOtherEmailClick() {
  const subject = lastMailSubject || "";
  const body = document.getElementById("coverLetterOutput").value;
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const DROPZONE_BASE_CLASSES = ["border-slate-300", "bg-slate-50/50"];
const DROPZONE_ACTIVE_CLASSES = ["border-blue-500", "bg-blue-50"];

function setDropzoneActive(dropzoneEl, isActive) {
  dropzoneEl.classList.remove(...(isActive ? DROPZONE_BASE_CLASSES : DROPZONE_ACTIVE_CLASSES));
  dropzoneEl.classList.add(...(isActive ? DROPZONE_ACTIVE_CLASSES : DROPZONE_BASE_CLASSES));
}

function setupDropzone(dropzoneEl, inputEl, fieldKey) {
  dropzoneEl.addEventListener("dragover", (event) => {
    event.preventDefault();
    setDropzoneActive(dropzoneEl, true);
  });

  dropzoneEl.addEventListener("dragleave", () => {
    setDropzoneActive(dropzoneEl, false);
  });

  dropzoneEl.addEventListener("drop", (event) => {
    event.preventDefault();
    setDropzoneActive(dropzoneEl, false);
    if (event.dataTransfer.files.length > 0) {
      inputEl.files = event.dataTransfer.files;
      clearFieldInvalid(fieldKey);
    }
  });
}

document.getElementById("jobForm").addEventListener("submit", handleSubmit);
document.getElementById("copyCoverLetterBtn").addEventListener("click", handleCopyClick);
document.getElementById("sendGmailBtn").addEventListener("click", handleSendGmailClick);
document.getElementById("sendOtherEmailBtn").addEventListener("click", handleSendOtherEmailClick);
document.getElementById("downloadTrackingBtn").addEventListener("click", handleDownloadTracking);
document.getElementById("jobDescription").addEventListener("input", () => clearFieldInvalid("jobDescription"));
document.getElementById("cvFile").addEventListener("change", () => clearFieldInvalid("cvFile"));
document.getElementById("extraInfoFile").addEventListener("change", () => clearFieldInvalid("extraInfoFile"));
setupDropzone(document.getElementById("cvDropzone"), document.getElementById("cvFile"), "cvFile");
setupDropzone(document.getElementById("extraInfoDropzone"), document.getElementById("extraInfoFile"), "extraInfoFile");
