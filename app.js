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

// Heurísticas de "fit breakdown" por dimensión (seniority/industria/
// modalidad), mismo enfoque simulado por keywords que ya usa
// extractKeywords/tokenize para "skills" — listas acotadas por idioma,
// no un modelo real. Los textos se comparan ya normalizados (minúsculas,
// sin tildes) con normalize(), así que las listas no llevan tildes.
const SENIORITY_TERMS = {
  es: {
    1: ["junior", "trainee", "sin experiencia", "recien egresado", "recien recibido", "entry level"],
    2: ["semi senior", "semi-senior", "ssr", "intermedio", "mid level"],
    3: ["senior", "lider", "lead", "gerente", "manager", "director", "jefe"],
  },
  en: {
    1: ["junior", "trainee", "entry level", "entry-level", "no experience required"],
    2: ["mid level", "mid-level", "intermediate", "semi senior", "semi-senior"],
    3: ["senior", "lead", "manager", "director", "head of"],
  },
  it: {
    1: ["junior", "tirocinante", "neolaureato", "entry level"],
    2: ["semi senior", "semi-senior", "intermedio", "mid level"],
    3: ["senior", "lead", "responsabile", "manager", "direttore", "capo"],
  },
  pt: {
    1: ["junior", "estagiario", "recem formado", "entry level"],
    2: ["pleno", "semi senior", "semi-senior", "intermediario"],
    3: ["senior", "lider", "gerente", "diretor", "coordenador"],
  },
};

const INDUSTRY_TERMS = {
  es: ["tecnologia", "finanzas", "marketing", "retail", "salud", "educacion", "manufactura", "ventas", "legal", "recursos humanos", "logistica", "construccion", "turismo", "energia", "telecomunicaciones", "consultoria", "seguros", "inmobiliario", "gastronomia", "moda", "deportivo", "deportes", "fitness"],
  en: ["technology", "finance", "marketing", "retail", "healthcare", "education", "manufacturing", "sales", "legal", "human resources", "logistics", "construction", "tourism", "energy", "telecommunications", "consulting", "insurance", "real estate", "hospitality", "fashion", "sports", "fitness"],
  it: ["tecnologia", "finanza", "marketing", "vendita al dettaglio", "sanita", "istruzione", "manifattura", "vendite", "legale", "risorse umane", "logistica", "edilizia", "turismo", "energia", "telecomunicazioni", "consulenza", "assicurazioni", "immobiliare", "ristorazione", "moda", "sport", "fitness"],
  pt: ["tecnologia", "financas", "marketing", "varejo", "saude", "educacao", "manufatura", "vendas", "juridico", "recursos humanos", "logistica", "construcao", "turismo", "energia", "telecomunicacoes", "consultoria", "seguros", "imobiliario", "hotelaria", "moda", "esportes", "fitness"],
};

const MODALITY_TERMS = {
  es: { remoto: ["remoto", "remota", "home office", "trabajo a distancia"], hibrido: ["hibrido", "hibrida"], presencial: ["presencial"] },
  en: { remoto: ["remote", "work from home", "wfh"], hibrido: ["hybrid"], presencial: ["on-site", "onsite", "in-office", "in office"] },
  it: { remoto: ["remoto", "da remoto", "smart working"], hibrido: ["ibrido"], presencial: ["in sede", "in presenza"] },
  pt: { remoto: ["remoto", "home office", "trabalho remoto"], hibrido: ["hibrido"], presencial: ["presencial"] },
};

function detectSeniorityLevel(text, lang) {
  const normalized = normalize(text);
  const levels = SENIORITY_TERMS[lang];
  for (const level of [3, 2, 1]) {
    if (levels[level].some((term) => normalized.includes(term))) return level;
  }
  return null;
}

function detectIndustries(text, lang) {
  const normalized = normalize(text);
  return new Set(INDUSTRY_TERMS[lang].filter((term) => normalized.includes(term)));
}

function detectModality(text, lang) {
  const normalized = normalize(text);
  const modalities = MODALITY_TERMS[lang];
  for (const key of ["remoto", "hibrido", "presencial"]) {
    if (modalities[key].some((term) => normalized.includes(term))) return key;
  }
  return null;
}

function computeSeniorityFit(jobText, profileText, lang) {
  const jobLevel = detectSeniorityLevel(jobText, lang);
  if (jobLevel === null) return 100;
  const profileLevel = detectSeniorityLevel(profileText, lang);
  if (profileLevel === null) return 50;
  return Math.max(0, 100 - Math.abs(jobLevel - profileLevel) * 40);
}

function computeIndustryFit(jobText, profileText, lang) {
  const jobIndustries = detectIndustries(jobText, lang);
  if (jobIndustries.size === 0) return 100;
  const profileIndustries = detectIndustries(profileText, lang);
  const overlap = [...jobIndustries].some((industry) => profileIndustries.has(industry));
  return overlap ? 100 : 40;
}

function computeModalityFit(jobText, profileText, lang) {
  const jobModality = detectModality(jobText, lang);
  if (jobModality === null) return 100;
  const profileModality = detectModality(profileText, lang);
  if (profileModality === null) return 70;
  return profileModality === jobModality ? 100 : 40;
}

const TRANSLATIONS = {
  es: {
    locale: "es-AR",
    fitLabels: { alto: "Fit alto", medio: "Fit medio", bajo: "Fit bajo", indeterminado: "Indeterminado" },
    fitBreakdownLabels: { skills: "Skills", seniority: "Seniority", industria: "Industria", modalidad: "Modalidad" },
    resultsHeading: "Resultados del análisis",
    matchedHeading: "Keywords que matchearon",
    missingHeading: "Keywords que faltan",
    noMatchedKeywords: "Ninguna keyword matcheó.",
    allMatchedKeywords: "¡Matchearon todas las keywords detectadas!",
    comparisonHeading: "Resumen comparativo",
    untitledJobLabel: (n) => `Vacante ${n}`,
    comparisonWinner: ({ puesto, score, matchedList }) =>
      `${puesto} es la mejor opción con un ${score}% de fit, gracias a coincidir en: ${matchedList}.`,
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
    fitBreakdownLabels: { skills: "Skills", seniority: "Seniority", industria: "Industry", modalidad: "Work mode" },
    resultsHeading: "Analysis results",
    matchedHeading: "Matched keywords",
    missingHeading: "Missing keywords",
    noMatchedKeywords: "No keywords matched.",
    allMatchedKeywords: "All detected keywords matched!",
    comparisonHeading: "Comparative summary",
    untitledJobLabel: (n) => `Job ${n}`,
    comparisonWinner: ({ puesto, score, matchedList }) =>
      `${puesto} is the best option with a ${score}% fit, thanks to matching on: ${matchedList}.`,
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
    fitBreakdownLabels: { skills: "Competenze", seniority: "Seniority", industria: "Settore", modalidad: "Modalità" },
    resultsHeading: "Risultati dell'analisi",
    matchedHeading: "Keyword corrispondenti",
    missingHeading: "Keyword mancanti",
    noMatchedKeywords: "Nessuna keyword corrisponde.",
    allMatchedKeywords: "Tutte le keyword rilevate corrispondono!",
    comparisonHeading: "Riepilogo comparativo",
    untitledJobLabel: (n) => `Offerta ${n}`,
    comparisonWinner: ({ puesto, score, matchedList }) =>
      `${puesto} è la scelta migliore con un fit del ${score}%, grazie alla corrispondenza su: ${matchedList}.`,
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
    fitBreakdownLabels: { skills: "Habilidades", seniority: "Senioridade", industria: "Setor", modalidad: "Modalidade" },
    resultsHeading: "Resultados da análise",
    matchedHeading: "Palavras-chave correspondentes",
    missingHeading: "Palavras-chave faltantes",
    noMatchedKeywords: "Nenhuma palavra-chave correspondeu.",
    allMatchedKeywords: "Todas as palavras-chave detectadas corresponderam!",
    comparisonHeading: "Resumo comparativo",
    untitledJobLabel: (n) => `Vaga ${n}`,
    comparisonWinner: ({ puesto, score, matchedList }) =>
      `${puesto} é a melhor opção com ${score}% de fit, graças à coincidência em: ${matchedList}.`,
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

// Traducciones de la UI estática (labels, placeholders, botones, errores de
// validación) previa al análisis. Separado de TRANSLATIONS a propósito: ese
// objeto cubre el contenido posterior al análisis (resultados, cover letter,
// Excel) y no debe tocarse.
const UI_TRANSLATIONS = {
  es: {
    pageTitle: "Job Fit Analyzer (prueba)",
    languageSelectLabel: "Idioma",
    appTitle: "Career Fit Assistant",
    appSubtitle: "Postulá fácil, rápido e inteligente. Ganá tiempo, ganá el puesto.",
    jobTitleLabel: "Título",
    jobTitlePlaceholder: "Nombre del rol + empresa (ej: Data Analyst - Globant)",
    jobDescriptionLabel: "Descripción completa de la vacante *",
    jobDescriptionPlaceholder: "Pegá aquí el texto completo de la descripción del puesto...",
    jobLinkRefLabel: "Link de la vacante (opcional, solo referencia)",
    jobLinkRefPlaceholder: "https://... (no se procesa)",
    startNowButton: "Comenzá",
    viewExampleButton: "Ver Ejemplo",
    exampleCandidateHeading: "Candidato de ejemplo",
    exampleVacanciesHeading: "Vacantes de ejemplo",
    exampleCloseButtonLabel: "Cerrar ejemplo",
    exampleBadgeText: "Todo eso, para vos",
    exampleBadgeSubtitle: "(ejemplo pre-generado)",
    exampleCtaButton: "Probalo ahora",
    exampleLoadError: "No se pudo cargar el ejemplo. Probá de nuevo en unos segundos.",
    addJobButton: "+ Agregar Vacante",
    maxJobsMessage: "Llegaste al máximo de 5 vacantes.",
    removeJobButtonLabel: "Eliminar esta vacante",
    cvFileLabel: "CV (PDF o Word) *",
    dropzoneHint: "o arrastrá el archivo aquí",
    extraInfoFileLabel: "Más sobre mí (PDF, Word o TXT)",
    analyzeButton: "Analizar",
    analyzeButtonLoading: "Analizando...",
    mailJobSelectLabel: "Vacante para el envío de mail",
    copyDraftButton: "Copiar draft",
    copyFeedback: "Copiado ✓",
    trackingHeading: "Seguimiento de postulaciones",
    existingExcelLabel: "Subir Excel existente (opcional, para agregar esta postulación sin perder las anteriores)",
    downloadTrackingButton: "Descargar seguimiento",
    themeToggleLabel: "Tema oscuro",
    downloadAnalysisButton: "Descargar análisis",
    analysisFormatLabel: "Formato del documento",
    errors: {
      jobDescriptionRequired: "Pegá el texto completo de la descripción de la vacante.",
      cvFileRequired: "Subí tu CV en formato PDF o Word.",
      cvFileInvalidType: "El CV debe ser un archivo PDF o Word (.doc/.docx).",
      extraInfoFileRequired: "Subí tu archivo de 'Más sobre mí' (PDF, Word o TXT).",
      extraInfoFileInvalidType: "El archivo de 'Más sobre mí' debe ser PDF, Word (.doc/.docx) o TXT.",
      trackingNoAnalysis: "Primero analizá una vacante para poder registrarla en el seguimiento.",
      trackingReadError: (msg) => `No se pudo leer el Excel existente: ${msg}`,
      submitProcessingError: (msg) => `No se pudo procesar alguno de los archivos: ${msg}`,
      copyFailed: "No se pudo copiar al portapapeles.",
      docNotSupported: "Los archivos .doc (Word 97-2003) no se pueden leer en el navegador. Guardá el archivo como .docx o .pdf.",
      unsupportedFormat: (ext) => `Formato no soportado: .${ext}`,
      analysisDownloadNoAnalysis: "Primero analizá una vacante para poder descargar el análisis.",
      analysisDownloadError: (msg) => `No se pudo generar el documento: ${msg}`,
    },
  },
  en: {
    pageTitle: "Job Fit Analyzer (test)",
    languageSelectLabel: "Language",
    appTitle: "Career Fit Assistant",
    appSubtitle: "Apply easy, fast, and smart. Save time, win the job.",
    jobTitleLabel: "Title",
    jobTitlePlaceholder: "Role name + company (e.g. Data Analyst - Globant)",
    jobDescriptionLabel: "Full job description *",
    jobDescriptionPlaceholder: "Paste the full job description text here...",
    jobLinkRefLabel: "Job link (optional, reference only)",
    jobLinkRefPlaceholder: "https://... (not processed)",
    startNowButton: "Get Started",
    viewExampleButton: "View Example",
    exampleCandidateHeading: "Example candidate",
    exampleVacanciesHeading: "Example job postings",
    exampleCloseButtonLabel: "Close example",
    exampleBadgeText: "All that, for you",
    exampleBadgeSubtitle: "(pre-generated example)",
    exampleCtaButton: "Try it now",
    exampleLoadError: "The example couldn't be loaded. Try again in a few seconds.",
    addJobButton: "+ Add Job",
    maxJobsMessage: "You've reached the maximum of 5 jobs.",
    removeJobButtonLabel: "Remove this job",
    cvFileLabel: "CV (PDF or Word) *",
    dropzoneHint: "or drag the file here",
    extraInfoFileLabel: "More about me (PDF, Word or TXT)",
    analyzeButton: "Analyze",
    analyzeButtonLoading: "Analyzing...",
    mailJobSelectLabel: "Job for sending the email",
    copyDraftButton: "Copy draft",
    copyFeedback: "Copied ✓",
    trackingHeading: "Application tracking",
    existingExcelLabel: "Upload existing Excel (optional, to add this application without losing previous ones)",
    downloadTrackingButton: "Download tracking",
    themeToggleLabel: "Dark theme",
    downloadAnalysisButton: "Download analysis",
    analysisFormatLabel: "Document format",
    errors: {
      jobDescriptionRequired: "Paste the full job description text.",
      cvFileRequired: "Upload your CV in PDF or Word format.",
      cvFileInvalidType: "The CV must be a PDF or Word file (.doc/.docx).",
      extraInfoFileRequired: "Upload your 'More about me' file (PDF, Word or TXT).",
      extraInfoFileInvalidType: "The 'More about me' file must be PDF, Word (.doc/.docx) or TXT.",
      trackingNoAnalysis: "First analyze a job posting so it can be tracked.",
      trackingReadError: (msg) => `Could not read the existing Excel file: ${msg}`,
      submitProcessingError: (msg) => `Could not process one of the files: ${msg}`,
      copyFailed: "Could not copy to clipboard.",
      docNotSupported: ".doc files (Word 97-2003) cannot be read in the browser. Save the file as .docx or .pdf.",
      unsupportedFormat: (ext) => `Unsupported format: .${ext}`,
      analysisDownloadNoAnalysis: "First analyze a job posting so the analysis can be downloaded.",
      analysisDownloadError: (msg) => `Could not generate the document: ${msg}`,
    },
  },
  it: {
    pageTitle: "Job Fit Analyzer (prova)",
    languageSelectLabel: "Lingua",
    appTitle: "Career Fit Assistant",
    appSubtitle: "Candidati in modo facile, veloce e intelligente. Guadagna tempo, conquista il lavoro.",
    jobTitleLabel: "Titolo",
    jobTitlePlaceholder: "Nome del ruolo + azienda (es: Data Analyst - Globant)",
    jobDescriptionLabel: "Descrizione completa dell'offerta di lavoro *",
    jobDescriptionPlaceholder: "Incolla qui il testo completo della descrizione della posizione...",
    jobLinkRefLabel: "Link dell'offerta (opzionale, solo riferimento)",
    jobLinkRefPlaceholder: "https://... (non elaborato)",
    startNowButton: "Inizia",
    viewExampleButton: "Vedi esempio",
    exampleCandidateHeading: "Candidato di esempio",
    exampleVacanciesHeading: "Offerte di esempio",
    exampleCloseButtonLabel: "Chiudi esempio",
    exampleBadgeText: "Tutto questo, per te",
    exampleBadgeSubtitle: "(esempio pre-generato)",
    exampleCtaButton: "Provalo ora",
    exampleLoadError: "Non è stato possibile caricare l'esempio. Riprova tra qualche secondo.",
    addJobButton: "+ Aggiungi offerta",
    maxJobsMessage: "Hai raggiunto il massimo di 5 offerte.",
    removeJobButtonLabel: "Rimuovi questa offerta",
    cvFileLabel: "CV (PDF o Word) *",
    dropzoneHint: "o trascina il file qui",
    extraInfoFileLabel: "Di più su di me (PDF, Word o TXT)",
    analyzeButton: "Analizza",
    analyzeButtonLoading: "Analizzando...",
    mailJobSelectLabel: "Offerta per l'invio dell'email",
    copyDraftButton: "Copia bozza",
    copyFeedback: "Copiato ✓",
    trackingHeading: "Monitoraggio delle candidature",
    existingExcelLabel: "Carica Excel esistente (opzionale, per aggiungere questa candidatura senza perdere le precedenti)",
    downloadTrackingButton: "Scarica monitoraggio",
    themeToggleLabel: "Tema scuro",
    downloadAnalysisButton: "Scarica analisi",
    analysisFormatLabel: "Formato del documento",
    errors: {
      jobDescriptionRequired: "Incolla il testo completo della descrizione dell'offerta di lavoro.",
      cvFileRequired: "Carica il tuo CV in formato PDF o Word.",
      cvFileInvalidType: "Il CV deve essere un file PDF o Word (.doc/.docx).",
      extraInfoFileRequired: "Carica il tuo file 'Di più su di me' (PDF, Word o TXT).",
      extraInfoFileInvalidType: "Il file 'Di più su di me' deve essere PDF, Word (.doc/.docx) o TXT.",
      trackingNoAnalysis: "Analizza prima un'offerta di lavoro per poterla registrare nel monitoraggio.",
      trackingReadError: (msg) => `Impossibile leggere il file Excel esistente: ${msg}`,
      submitProcessingError: (msg) => `Impossibile elaborare uno dei file: ${msg}`,
      copyFailed: "Impossibile copiare negli appunti.",
      docNotSupported: "I file .doc (Word 97-2003) non possono essere letti nel browser. Salva il file come .docx o .pdf.",
      unsupportedFormat: (ext) => `Formato non supportato: .${ext}`,
      analysisDownloadNoAnalysis: "Analizza prima un'offerta di lavoro per poter scaricare l'analisi.",
      analysisDownloadError: (msg) => `Impossibile generare il documento: ${msg}`,
    },
  },
  pt: {
    pageTitle: "Job Fit Analyzer (teste)",
    languageSelectLabel: "Idioma",
    appTitle: "Career Fit Assistant",
    appSubtitle: "Candidate-se de forma fácil, rápida e inteligente. Ganhe tempo, conquiste a vaga.",
    jobTitleLabel: "Título",
    jobTitlePlaceholder: "Nome da função + empresa (ex: Data Analyst - Globant)",
    jobDescriptionLabel: "Descrição completa da vaga *",
    jobDescriptionPlaceholder: "Cole aqui o texto completo da descrição da vaga...",
    jobLinkRefLabel: "Link da vaga (opcional, apenas referência)",
    jobLinkRefPlaceholder: "https://... (não processado)",
    startNowButton: "Comece",
    viewExampleButton: "Ver Exemplo",
    exampleCandidateHeading: "Candidato de exemplo",
    exampleVacanciesHeading: "Vagas de exemplo",
    exampleCloseButtonLabel: "Fechar exemplo",
    exampleBadgeText: "Tudo isso, para você",
    exampleBadgeSubtitle: "(exemplo pré-gerado)",
    exampleCtaButton: "Experimente agora",
    exampleLoadError: "Não foi possível carregar o exemplo. Tente novamente em alguns segundos.",
    addJobButton: "+ Adicionar Vaga",
    maxJobsMessage: "Você atingiu o máximo de 5 vagas.",
    removeJobButtonLabel: "Remover esta vaga",
    cvFileLabel: "Currículo (PDF ou Word) *",
    dropzoneHint: "ou arraste o arquivo aqui",
    extraInfoFileLabel: "Mais sobre mim (PDF, Word ou TXT)",
    analyzeButton: "Analisar",
    analyzeButtonLoading: "Analisando...",
    mailJobSelectLabel: "Vaga para o envio do e-mail",
    copyDraftButton: "Copiar rascunho",
    copyFeedback: "Copiado ✓",
    trackingHeading: "Acompanhamento de candidaturas",
    existingExcelLabel: "Enviar Excel existente (opcional, para adicionar esta candidatura sem perder as anteriores)",
    downloadTrackingButton: "Baixar acompanhamento",
    themeToggleLabel: "Tema escuro",
    downloadAnalysisButton: "Baixar análise",
    analysisFormatLabel: "Formato do documento",
    errors: {
      jobDescriptionRequired: "Cole o texto completo da descrição da vaga.",
      cvFileRequired: "Envie seu currículo em formato PDF ou Word.",
      cvFileInvalidType: "O currículo deve ser um arquivo PDF ou Word (.doc/.docx).",
      extraInfoFileRequired: "Envie seu arquivo 'Mais sobre mim' (PDF, Word ou TXT).",
      extraInfoFileInvalidType: "O arquivo 'Mais sobre mim' deve ser PDF, Word (.doc/.docx) ou TXT.",
      trackingNoAnalysis: "Primeiro analise uma vaga para poder registrá-la no acompanhamento.",
      trackingReadError: (msg) => `Não foi possível ler o Excel existente: ${msg}`,
      submitProcessingError: (msg) => `Não foi possível processar algum dos arquivos: ${msg}`,
      copyFailed: "Não foi possível copiar para a área de transferência.",
      docNotSupported: "Arquivos .doc (Word 97-2003) não podem ser lidos no navegador. Salve o arquivo como .docx ou .pdf.",
      unsupportedFormat: (ext) => `Formato não suportado: .${ext}`,
      analysisDownloadNoAnalysis: "Primeiro analise uma vaga para poder baixar a análise.",
      analysisDownloadError: (msg) => `Não foi possível gerar o documento: ${msg}`,
    },
  },
};

function getCurrentLanguage() {
  return document.getElementById("languageSelect").value;
}

function applyTranslations(lang) {
  const t = UI_TRANSLATIONS[lang];

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const value = t[el.getAttribute("data-i18n")];
    if (typeof value === "string") el.textContent = value;
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const value = t[el.getAttribute("data-i18n-placeholder")];
    if (typeof value === "string") el.placeholder = value;
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    const value = t[el.getAttribute("data-i18n-aria-label")];
    if (typeof value === "string") el.setAttribute("aria-label", value);
  });

  document.documentElement.lang = lang;

  const analyzeBtn = document.getElementById("analyzeBtn");
  if (!analyzeBtn.disabled) {
    analyzeBtn.textContent = t.analyzeButton;
  }
}

const THEME_STORAGE_KEY = "theme";

function isDarkMode() {
  return document.documentElement.classList.contains("dark");
}

function setTheme(isDark) {
  document.documentElement.classList.toggle("dark", isDark);
  localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
  document.getElementById("themeToggleBtn").setAttribute("aria-checked", String(isDark));
}

// El script inline en el <head> de index.html ya decidió el tema (leyendo
// localStorage) antes de que Tailwind escaneara el DOM, para evitar el
// flash de tema incorrecto. Acá solo sincronizamos el estado del switch
// con la clase que ese script ya dejó en <html>.
function initTheme() {
  document.getElementById("themeToggleBtn").setAttribute("aria-checked", String(isDarkMode()));
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

async function extractTextFromFile(file, lang) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (ext === "pdf") return extractPdfText(file);
  if (ext === "txt") return file.text();
  if (ext === "docx") return extractDocxText(file);
  if (ext === "doc") {
    throw new Error(UI_TRANSLATIONS[lang].errors.docNotSupported);
  }
  throw new Error(UI_TRANSLATIONS[lang].errors.unsupportedFormat(ext));
}

function normalize(text) {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function tokenize(text) {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
}

// Para nombres de archivo: además de bajar a minúsculas y sacar tildes
// (como normalize()), colapsa cualquier caracter fuera de [a-z0-9] a un
// guión — el nombre sale de un heurístico sobre texto libre de un CV
// subido por el usuario, que puede traer puntuación o caracteres inválidos
// en nombres de archivo (\ / : * ? " < > |, etc.), no solo espacios/tildes.
function sanitizeForFilename(text) {
  return normalize(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

function computeFit(jobText, combinedProfileText, lang) {
  const keywords = extractKeywords(jobText);
  if (keywords.length === 0) {
    return { keywords: [], matched: [], missing: [], score: 0, labelKey: "indeterminado", breakdown: [] };
  }
  const profileTokens = new Set(tokenize(combinedProfileText));
  const matched = keywords.filter((k) => profileTokens.has(k));
  const missing = keywords.filter((k) => !profileTokens.has(k));
  const skillsScore = Math.round((matched.length / keywords.length) * 100);

  const seniorityScore = computeSeniorityFit(jobText, combinedProfileText, lang);
  const industryScore = computeIndustryFit(jobText, combinedProfileText, lang);
  const modalityScore = computeModalityFit(jobText, combinedProfileText, lang);

  const breakdown = [
    { key: "skills", score: skillsScore },
    { key: "seniority", score: seniorityScore },
    { key: "industria", score: industryScore },
    { key: "modalidad", score: modalityScore },
  ];

  const score = Math.round(
    skillsScore * 0.55 + seniorityScore * 0.15 + industryScore * 0.15 + modalityScore * 0.15
  );
  const labelKey =
    score >= FIT_THRESHOLD_HIGH ? "alto" :
    score >= FIT_THRESHOLD_MEDIUM ? "medio" :
    "bajo";
  return { keywords, matched, missing, score, labelKey, breakdown };
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

function buildMailSubject(title, cvText, lang) {
  const nombre = guessCandidateName(cvText, lang);
  return `${title} - ${nombre}`;
}

function buildAnalysisFilename(extension, cvText, lang) {
  const nombre = guessCandidateName(cvText, lang);
  // guessCandidateName cae a un placeholder entre corchetes (ej. "[Tu
  // nombre]") cuando no detecta un nombre en el CV — sin este chequeo el
  // archivo terminaría llamándose "analisis-fit-tu-nombre.pdf".
  const namePart = nombre === TRANSLATIONS[lang].namePlaceholder ? "" : sanitizeForFilename(nombre);
  return `analisis-fit${namePart ? `-${namePart}` : ""}.${extension}`;
}

const TRACKING_FILENAME = "seguimiento-postulaciones.xlsx";
const TRACKING_FIELD_ORDER = ["fecha", "empresa", "puesto", "estado", "resultado"];

const MAX_JOB_BLOCKS = 5;
let jobIdCounter = 0;
const jobBlocks = []; // [{ id, container, titleInput, descTextarea, descError, linkInput, removeBtn }]

let lastAnalyses = []; // [{ title, rawTitle, jobText, fitResult }]
let lastCvText = null;

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

  const lang = getCurrentLanguage();

  if (lastAnalyses.length === 0) {
    showTrackingError(UI_TRANSLATIONS[lang].errors.trackingNoAnalysis);
    return;
  }

  const existingFile = document.getElementById("existingExcelFile").files[0];
  const downloadTrackingBtn = document.getElementById("downloadTrackingBtn");
  downloadTrackingBtn.disabled = true;

  try {
    let rows = [];
    if (existingFile) {
      rows = await readExistingTrackingRows(existingFile);
    }
    rows.push(...lastAnalyses.map((analysis) => buildTrackingRow(analysis.jobText, analysis.fitResult, lang)));
    downloadTrackingWorkbook(rows, lang);
  } catch (err) {
    showTrackingError(UI_TRANSLATIONS[lang].errors.trackingReadError(err.message));
  } finally {
    downloadTrackingBtn.disabled = false;
  }
}

function buildStandaloneHtmlDocument(exportRootOuterHTML, lang) {
  const t = TRANSLATIONS[lang];
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${t.resultsHeading}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
html, body { margin: 0; background: #f8fafc; }
body { padding: 32px; }
${EXPORT_TEMPLATE_CSS}
</style>
</head>
<body>
${exportRootOuterHTML}
</body>
</html>
`;
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadAnalysisAsPdf(exportRootEl, filename) {
  return html2pdf()
    .set({
      margin: 24,
      filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, backgroundColor: "#f8fafc" },
      jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] },
    })
    .from(exportRootEl)
    .save();
}

function showAnalysisDownloadError(message) {
  const el = document.getElementById("analysisDownloadError");
  el.textContent = message;
  el.hidden = false;
}

function hideAnalysisDownloadError() {
  document.getElementById("analysisDownloadError").hidden = true;
}

async function handleDownloadAnalysisClick() {
  hideAnalysisDownloadError();
  const lang = getCurrentLanguage();

  if (lastAnalyses.length === 0) {
    showAnalysisDownloadError(UI_TRANSLATIONS[lang].errors.analysisDownloadNoAnalysis);
    return;
  }

  const format = document.getElementById("analysisFormatSelect").value;
  const downloadAnalysisBtn = document.getElementById("downloadAnalysisBtn");
  downloadAnalysisBtn.disabled = true;

  const exportRoot = buildExportRoot(lastAnalyses, lang);
  const wrapper = mountOffscreen(exportRoot);

  try {
    await document.fonts.ready;
    const filename = buildAnalysisFilename(format, lastCvText, lang);
    if (format === "pdf") {
      await downloadAnalysisAsPdf(exportRoot, filename);
    } else {
      const html = buildStandaloneHtmlDocument(exportRoot.outerHTML, lang);
      triggerBlobDownload(new Blob([html], { type: "text/html" }), filename);
    }
  } catch (err) {
    showAnalysisDownloadError(UI_TRANSLATIONS[lang].errors.analysisDownloadError(err.message));
  } finally {
    wrapper.remove();
    downloadAnalysisBtn.disabled = false;
  }
}

function renderKeywordList(listEl, keywords, emptyText, itemClassName) {
  listEl.innerHTML = "";
  if (keywords.length === 0) {
    const li = document.createElement("li");
    li.textContent = emptyText;
    li.className = "text-sm text-slate-500 dark:text-slate-400";
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

function renderFitBreakdown(container, breakdown, lang) {
  const labels = TRANSLATIONS[lang].fitBreakdownLabels;
  container.innerHTML = "";
  for (const { key, score } of breakdown) {
    const row = document.createElement("div");
    row.className = "flex items-center gap-3 text-sm";

    const label = document.createElement("span");
    label.className = "w-24 flex-shrink-0 font-medium text-slate-600 dark:text-slate-300";
    label.textContent = labels[key];
    row.appendChild(label);

    const track = document.createElement("div");
    track.className = "h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700";
    const fill = document.createElement("div");
    fill.className = "h-full rounded-full bg-blue-500 dark:bg-blue-400";
    fill.style.width = `${score}%`;
    track.appendChild(fill);
    row.appendChild(track);

    const value = document.createElement("span");
    value.className = "w-10 flex-shrink-0 text-right text-slate-500 dark:text-slate-400";
    value.textContent = `${score}%`;
    row.appendChild(value);

    container.appendChild(row);
  }
}

const BADGE_VARIANT_CLASSES = {
  alto: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  medio: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  bajo: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  indeterminado: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
};

const PROGRESS_FILL_VARIANT_CLASSES = {
  alto: "bg-green-500 dark:bg-green-400",
  medio: "bg-amber-500 dark:bg-amber-400",
  bajo: "bg-red-500 dark:bg-red-400",
  indeterminado: "bg-slate-400 dark:bg-slate-500",
};

function buildComparisonSummary(analyses, lang) {
  const t = TRANSLATIONS[lang];
  const ranked = analyses
    .map((analysis, index) => ({ analysis, index }))
    .sort((a, b) => b.analysis.fitResult.score - a.analysis.fitResult.score);

  document.getElementById("comparisonHeading").textContent = t.comparisonHeading;

  const comparisonList = document.getElementById("comparisonList");
  comparisonList.innerHTML = "";

  ranked.forEach((entry, rank) => {
    const li = document.createElement("li");
    li.className = "rounded-lg bg-white p-3 text-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700";

    const line = document.createElement("p");
    line.className = "font-semibold text-slate-800 dark:text-slate-200";
    line.textContent = `${rank + 1}. ${entry.analysis.title} — ${entry.analysis.fitResult.score}% (${t.fitLabels[entry.analysis.fitResult.labelKey]})`;
    li.appendChild(line);

    if (rank === 0) {
      const matchedList = entry.analysis.fitResult.matched.slice(0, 5).join(", ") || t.noMatchedFallback;
      const justification = document.createElement("p");
      justification.className = "mt-1 text-slate-600 dark:text-slate-400";
      justification.textContent = t.comparisonWinner({
        puesto: entry.analysis.title,
        score: entry.analysis.fitResult.score,
        matchedList,
      });
      li.appendChild(justification);
    }

    comparisonList.appendChild(li);
  });
}

function renderJobDetailCard(analysis, lang, showTitle) {
  const t = TRANSLATIONS[lang];
  const fragment = document.getElementById("jobDetailTemplate").content.cloneNode(true);
  const card = fragment.querySelector('[data-role="jobDetailCard"]');

  const titleEl = card.querySelector('[data-role="jobDetailTitle"]');
  titleEl.textContent = analysis.title;
  titleEl.hidden = !showTitle;

  const fitScoreValue = card.querySelector('[data-role="fitScoreValue"]');
  const fitLabelBadge = card.querySelector('[data-role="fitLabelBadge"]');
  const progressBarFill = card.querySelector('[data-role="progressBarFill"]');
  const fitBreakdownList = card.querySelector('[data-role="fitBreakdownList"]');
  const keywordsGrid = card.querySelector('[data-role="keywordsGrid"]');
  const matchedHeading = card.querySelector('[data-role="matchedHeading"]');
  const missingHeading = card.querySelector('[data-role="missingHeading"]');
  const matchedKeywordsList = card.querySelector('[data-role="matchedKeywordsList"]');
  const missingKeywordsList = card.querySelector('[data-role="missingKeywordsList"]');

  matchedHeading.textContent = t.matchedHeading;
  missingHeading.textContent = t.missingHeading;

  fitScoreValue.textContent = `${analysis.fitResult.score}%`;
  fitLabelBadge.textContent = t.fitLabels[analysis.fitResult.labelKey];
  fitLabelBadge.className = `inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${BADGE_VARIANT_CLASSES[analysis.fitResult.labelKey]}`;
  progressBarFill.className = `h-full rounded-full transition-all duration-300 ease-in-out ${PROGRESS_FILL_VARIANT_CLASSES[analysis.fitResult.labelKey]}`;
  progressBarFill.style.width = `${analysis.fitResult.score}%`;

  renderFitBreakdown(fitBreakdownList, analysis.fitResult.breakdown || [], lang);

  // El ejemplo precargado no trae keywords (matched/missing quedan
  // undefined, no []): en ese caso se oculta la grilla en vez de mostrar
  // los mensajes de fallback ("Ninguna keyword matcheó."), que no aplican.
  if (analysis.fitResult.matched === undefined || analysis.fitResult.missing === undefined) {
    keywordsGrid.hidden = true;
  } else {
    keywordsGrid.hidden = false;
    renderKeywordList(matchedKeywordsList, analysis.fitResult.matched, t.noMatchedKeywords,
      "rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300");
    renderKeywordList(missingKeywordsList, analysis.fitResult.missing, t.allMatchedKeywords,
      "rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300");
  }

  return card;
}

// Plantilla de exportación para "Descargar análisis" (PDF/HTML): se
// construye desde los datos (lastAnalyses), no clonando la UI en pantalla,
// para que nunca incluya los controles de mail/tracking y siempre salga en
// paleta clara sin importar el tema activo de la app. Usa sus propias
// clases "export-*" con este CSS chico, en vez de las utilities de
// Tailwind, para poder reusar el mismo string tal cual embebido en el
// HTML autocontenido que se descarga (sin depender de Tailwind CDN al
// abrirlo offline). Sin selectores globales (body, *) para no pisar los
// estilos de la app cuando este CSS se inyecta en la página en vivo para
// la captura del PDF.
const EXPORT_TEMPLATE_CSS = `
.export-root { width: 800px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; font-family: "Inter", ui-sans-serif, system-ui, sans-serif; color: #0f172a; }
.export-root > * + * { margin-top: 2rem; }
.export-heading { margin: 0; font-size: 1.25rem; font-weight: 700; color: #0f172a; }
.export-comparison { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; break-inside: avoid; page-break-inside: avoid; }
.export-comparison > * + * { margin-top: 0.75rem; }
.export-comparison-heading { margin: 0; font-size: 1rem; font-weight: 600; color: #1e293b; }
.export-comparison-list { list-style: none; margin: 0; padding: 0; }
.export-comparison-list > li + li { margin-top: 0.5rem; }
.export-comparison-item { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 0.875rem; break-inside: avoid; page-break-inside: avoid; }
.export-comparison-item p { margin: 0; }
.export-comparison-item .rank-line { font-weight: 600; color: #1e293b; }
.export-comparison-item .justification { margin-top: 0.25rem; color: #475569; }
.export-detail > * + * { margin-top: 2rem; }
.export-card { border-bottom: 1px solid #e2e8f0; padding-bottom: 2rem; break-inside: avoid; page-break-inside: avoid; }
.export-card:last-child { border-bottom: none; padding-bottom: 0; }
.export-card > * + * { margin-top: 1.5rem; }
.export-card-title { margin: 0; font-size: 1rem; font-weight: 600; color: #1e293b; }
.export-score-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; }
.export-score-value { font-size: 1.875rem; font-weight: 800; color: #0f172a; }
.export-badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 0.25rem 0.75rem; font-size: 0.875rem; font-weight: 600; }
.export-badge-alto { background: #dcfce7; color: #166534; }
.export-badge-medio { background: #fef3c7; color: #92400e; }
.export-badge-bajo { background: #fee2e2; color: #991b1b; }
.export-badge-indeterminado { background: #e2e8f0; color: #334155; }
.export-progress-track { height: 0.625rem; width: 100%; flex-basis: 100%; overflow: hidden; border-radius: 999px; background: #e2e8f0; }
.export-progress-fill { height: 100%; border-radius: 999px; }
.export-progress-fill-alto { background: #22c55e; }
.export-progress-fill-medio { background: #f59e0b; }
.export-progress-fill-bajo { background: #ef4444; }
.export-progress-fill-indeterminado { background: #94a3b8; }
.export-breakdown { display: flex; flex-direction: column; gap: 0.5rem; }
.export-breakdown-row { display: flex; align-items: center; gap: 0.75rem; font-size: 0.875rem; }
.export-breakdown-label { width: 6rem; flex-shrink: 0; font-weight: 500; color: #475569; }
.export-breakdown-track { height: 0.5rem; flex: 1; overflow: hidden; border-radius: 999px; background: #e2e8f0; }
.export-breakdown-fill { height: 100%; border-radius: 999px; background: #3b82f6; }
.export-breakdown-value { width: 2.5rem; flex-shrink: 0; text-align: right; color: #64748b; }
.export-keywords-grid { display: grid; gap: 1.5rem; grid-template-columns: 1fr; }
@media (min-width: 640px) { .export-keywords-grid { grid-template-columns: 1fr 1fr; } }
.export-keywords-heading { margin: 0 0 0.5rem; font-size: 0.875rem; font-weight: 600; color: #334155; }
.export-keywords-list { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.5rem; }
.export-keyword-empty { font-size: 0.875rem; color: #64748b; }
.export-pill { border-radius: 999px; padding: 0.25rem 0.75rem; font-size: 0.75rem; font-weight: 500; }
.export-pill-matched { background: #dcfce7; color: #166534; }
.export-pill-missing { background: #f1f5f9; color: #475569; }
`;

function ensureExportStylesInjected() {
  if (document.getElementById("analysisExportStyles")) return;
  const style = document.createElement("style");
  style.id = "analysisExportStyles";
  style.textContent = EXPORT_TEMPLATE_CSS;
  document.head.appendChild(style);
}

const EXPORT_BADGE_CLASS_BY_LABEL = {
  alto: "export-badge-alto",
  medio: "export-badge-medio",
  bajo: "export-badge-bajo",
  indeterminado: "export-badge-indeterminado",
};

const EXPORT_PROGRESS_CLASS_BY_LABEL = {
  alto: "export-progress-fill-alto",
  medio: "export-progress-fill-medio",
  bajo: "export-progress-fill-bajo",
  indeterminado: "export-progress-fill-indeterminado",
};

function buildExportKeywordColumn(heading, keywords, emptyText, pillClass) {
  const col = document.createElement("div");

  const headingEl = document.createElement("h4");
  headingEl.className = "export-keywords-heading";
  headingEl.textContent = heading;
  col.appendChild(headingEl);

  const list = document.createElement("ul");
  list.className = "export-keywords-list";
  if (keywords.length === 0) {
    const li = document.createElement("li");
    li.textContent = emptyText;
    li.className = "export-keyword-empty";
    list.appendChild(li);
  } else {
    keywords.forEach((kw) => {
      const li = document.createElement("li");
      li.textContent = kw;
      li.className = `export-pill ${pillClass}`;
      list.appendChild(li);
    });
  }
  col.appendChild(list);
  return col;
}

function buildExportBreakdown(breakdown, lang) {
  const labels = TRANSLATIONS[lang].fitBreakdownLabels;
  const wrapper = document.createElement("div");
  wrapper.className = "export-breakdown";

  breakdown.forEach(({ key, score }) => {
    const row = document.createElement("div");
    row.className = "export-breakdown-row";

    const label = document.createElement("span");
    label.className = "export-breakdown-label";
    label.textContent = labels[key];
    row.appendChild(label);

    const track = document.createElement("div");
    track.className = "export-breakdown-track";
    const fill = document.createElement("div");
    fill.className = "export-breakdown-fill";
    fill.style.width = `${score}%`;
    track.appendChild(fill);
    row.appendChild(track);

    const value = document.createElement("span");
    value.className = "export-breakdown-value";
    value.textContent = `${score}%`;
    row.appendChild(value);

    wrapper.appendChild(row);
  });

  return wrapper;
}

function buildExportJobCard(analysis, lang, showTitle) {
  const t = TRANSLATIONS[lang];
  const card = document.createElement("div");
  card.className = "export-card";

  if (showTitle) {
    const titleEl = document.createElement("h3");
    titleEl.className = "export-card-title";
    titleEl.textContent = analysis.title;
    card.appendChild(titleEl);
  }

  const scoreRow = document.createElement("div");
  scoreRow.className = "export-score-row";

  const scoreValue = document.createElement("span");
  scoreValue.className = "export-score-value";
  scoreValue.textContent = `${analysis.fitResult.score}%`;
  scoreRow.appendChild(scoreValue);

  const badge = document.createElement("span");
  badge.className = `export-badge ${EXPORT_BADGE_CLASS_BY_LABEL[analysis.fitResult.labelKey]}`;
  badge.textContent = t.fitLabels[analysis.fitResult.labelKey];
  scoreRow.appendChild(badge);

  const track = document.createElement("div");
  track.className = "export-progress-track";
  const fill = document.createElement("div");
  fill.className = `export-progress-fill ${EXPORT_PROGRESS_CLASS_BY_LABEL[analysis.fitResult.labelKey]}`;
  fill.style.width = `${analysis.fitResult.score}%`;
  track.appendChild(fill);
  scoreRow.appendChild(track);

  card.appendChild(scoreRow);

  if (analysis.fitResult.breakdown && analysis.fitResult.breakdown.length > 0) {
    card.appendChild(buildExportBreakdown(analysis.fitResult.breakdown, lang));
  }

  if (analysis.fitResult.matched !== undefined && analysis.fitResult.missing !== undefined) {
    const grid = document.createElement("div");
    grid.className = "export-keywords-grid";
    grid.appendChild(buildExportKeywordColumn(t.matchedHeading, analysis.fitResult.matched, t.noMatchedKeywords, "export-pill-matched"));
    grid.appendChild(buildExportKeywordColumn(t.missingHeading, analysis.fitResult.missing, t.allMatchedKeywords, "export-pill-missing"));
    card.appendChild(grid);
  }

  return card;
}

function buildExportComparisonSummary(analyses, lang) {
  const t = TRANSLATIONS[lang];
  const ranked = analyses
    .map((analysis, index) => ({ analysis, index }))
    .sort((a, b) => b.analysis.fitResult.score - a.analysis.fitResult.score);

  const wrapper = document.createElement("div");
  wrapper.className = "export-comparison";

  const heading = document.createElement("h3");
  heading.className = "export-comparison-heading";
  heading.textContent = t.comparisonHeading;
  wrapper.appendChild(heading);

  const list = document.createElement("ol");
  list.className = "export-comparison-list";

  ranked.forEach((entry, rank) => {
    const li = document.createElement("li");
    li.className = "export-comparison-item";

    const line = document.createElement("p");
    line.className = "rank-line";
    line.textContent = `${rank + 1}. ${entry.analysis.title} — ${entry.analysis.fitResult.score}% (${t.fitLabels[entry.analysis.fitResult.labelKey]})`;
    li.appendChild(line);

    if (rank === 0) {
      const matchedList = entry.analysis.fitResult.matched.slice(0, 5).join(", ") || t.noMatchedFallback;
      const justification = document.createElement("p");
      justification.className = "justification";
      justification.textContent = t.comparisonWinner({
        puesto: entry.analysis.title,
        score: entry.analysis.fitResult.score,
        matchedList,
      });
      li.appendChild(justification);
    }

    list.appendChild(li);
  });

  wrapper.appendChild(list);
  return wrapper;
}

function buildExportRoot(analyses, lang) {
  const t = TRANSLATIONS[lang];
  ensureExportStylesInjected();

  const root = document.createElement("div");
  root.className = "export-root";

  const heading = document.createElement("h2");
  heading.className = "export-heading";
  heading.textContent = t.resultsHeading;
  root.appendChild(heading);

  if (analyses.length >= 2) {
    root.appendChild(buildExportComparisonSummary(analyses, lang));
  }

  const detailContainer = document.createElement("div");
  detailContainer.className = "export-detail";
  const showTitle = analyses.length > 1 || Boolean(analyses[0] && analyses[0].rawTitle);
  analyses.forEach((analysis) => {
    detailContainer.appendChild(buildExportJobCard(analysis, lang, showTitle));
  });
  root.appendChild(detailContainer);

  return root;
}

// Monta un elemento fuera de la vista (pero renderizado, no display:none)
// para poder capturarlo con html2canvas o leer su outerHTML. El wrapper es
// el único con posicionamiento inline: exportRoot queda "limpio" para que
// su outerHTML sirva tal cual como body del HTML autocontenido.
function mountOffscreen(el) {
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-9999px";
  wrapper.style.top = "0";
  wrapper.appendChild(el);
  document.body.appendChild(wrapper);
  return wrapper;
}

function populateMailJobSelect(analyses) {
  const select = document.getElementById("mailJobSelect");
  select.innerHTML = "";
  analyses.forEach((analysis, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = analysis.title;
    select.appendChild(option);
  });
}

function getSelectedAnalysis() {
  const select = document.getElementById("mailJobSelect");
  return lastAnalyses[Number(select.value)];
}

function paintResults(analyses, lang) {
  const t = TRANSLATIONS[lang];

  document.getElementById("resultsHeading").textContent = t.resultsHeading;

  const comparisonSummary = document.getElementById("comparisonSummary");
  if (analyses.length >= 2) {
    buildComparisonSummary(analyses, lang);
    comparisonSummary.hidden = false;
  } else {
    comparisonSummary.hidden = true;
  }

  const resultsDetailContainer = document.getElementById("resultsDetailContainer");
  resultsDetailContainer.innerHTML = "";
  const showTitle = analyses.length > 1 || Boolean(analyses[0] && analyses[0].rawTitle);
  analyses.forEach((analysis) => {
    resultsDetailContainer.appendChild(renderJobDetailCard(analysis, lang, showTitle));
  });

  document.getElementById("sendGmailBtn").textContent = t.sendGmailLabel;
  document.getElementById("sendOtherEmailBtn").textContent = t.sendOtherEmailLabel;

  populateMailJobSelect(analyses);
}

function renderResults(analyses, lang) {
  paintResults(analyses, lang);

  const resultsSection = document.getElementById("resultsSection");
  revealWithFade(resultsSection);
  resultsSection.scrollIntoView({ behavior: "smooth" });
}

// Repinta los resultados ya visibles en el idioma nuevo al cambiar el
// selector de idioma, sin disparar el fade-in/scroll de un análisis nuevo.
// Preserva la vacante elegida en el selector de mail, que paintResults()
// resetea al reconstruir sus <option>.
function retranslateResults(lang) {
  if (lastAnalyses.length === 0) return;
  const mailJobSelect = document.getElementById("mailJobSelect");
  const selectedIndex = mailJobSelect.value;
  paintResults(lastAnalyses, lang);
  mailJobSelect.value = selectedIndex;
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
  cvFile: { inputId: "cvDropzone", errorId: "cvFileError" },
  extraInfoFile: { inputId: "extraInfoDropzone", errorId: "extraInfoFileError" },
};

const INVALID_FIELD_CLASSES = ["border-red-400", "ring-2", "ring-red-100", "dark:border-red-500", "dark:ring-red-900/40"];
const VALID_FIELD_CLASSES = ["border-slate-300", "dark:border-slate-600"];

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

function validateForm(cvFile, extraInfoFile, lang) {
  const errors = {};
  const t = UI_TRANSLATIONS[lang].errors;

  if (!cvFile) {
    errors.cvFile = t.cvFileRequired;
  } else {
    const cvExt = cvFile.name.split(".").pop().toLowerCase();
    if (!CV_EXTENSIONS.includes(cvExt)) {
      errors.cvFile = t.cvFileInvalidType;
    }
  }

  if (extraInfoFile) {
    const extraExt = extraInfoFile.name.split(".").pop().toLowerCase();
    if (!EXTRA_INFO_EXTENSIONS.includes(extraExt)) {
      errors.extraInfoFile = t.extraInfoFileInvalidType;
    }
  }

  return errors;
}

function updateJobBlocksUI() {
  const showRemove = jobBlocks.length > 1;
  jobBlocks.forEach((block) => {
    // El botón usa la clase "flex" de Tailwind, que gana la cascada sobre
    // el estilo nativo de [hidden] (display:none) porque el <style> del CDN
    // se inyecta después de la hoja de estilos del user agent — hay que
    // sacarle también la clase "flex" para que quede realmente oculto.
    block.removeBtn.hidden = !showRemove;
    block.removeBtn.classList.toggle("flex", showRemove);
  });

  const atMax = jobBlocks.length >= MAX_JOB_BLOCKS;
  document.getElementById("addJobBtn").disabled = atMax;
  document.getElementById("maxJobsMessage").hidden = !atMax;
}

function setJobBlockInvalid(block, message) {
  block.descTextarea.classList.remove(...VALID_FIELD_CLASSES);
  block.descTextarea.classList.add(...INVALID_FIELD_CLASSES);
  block.descTextarea.setAttribute("aria-invalid", "true");
  block.descError.textContent = message;
  block.descError.hidden = false;
}

function clearJobBlockInvalid(block) {
  block.descTextarea.classList.remove(...INVALID_FIELD_CLASSES);
  block.descTextarea.classList.add(...VALID_FIELD_CLASSES);
  block.descTextarea.removeAttribute("aria-invalid");
  block.descError.hidden = true;
  block.descError.textContent = "";
}

function validateJobBlocks(lang) {
  const message = UI_TRANSLATIONS[lang].errors.jobDescriptionRequired;
  let firstInvalid = null;
  jobBlocks.forEach((block) => {
    if (!block.descTextarea.value.trim()) {
      setJobBlockInvalid(block, message);
      if (!firstInvalid) firstInvalid = block;
    } else {
      clearJobBlockInvalid(block);
    }
  });
  return firstInvalid;
}

function getJobBlockData() {
  return jobBlocks.map((block) => ({
    title: block.titleInput.value.trim(),
    description: block.descTextarea.value,
    link: block.linkInput.value.trim(),
  }));
}

function resolveJobTitle(title, index, lang) {
  return title || TRANSLATIONS[lang].untitledJobLabel(index + 1);
}

function createJobBlock() {
  if (jobBlocks.length >= MAX_JOB_BLOCKS) return;

  jobIdCounter += 1;
  const id = jobIdCounter;

  const fragment = document.getElementById("jobBlockTemplate").content.cloneNode(true);
  const container = fragment.querySelector('[data-role="jobBlock"]');

  const titleLabelEl = container.querySelector('[data-role="jobTitleLabelEl"]');
  const titleInput = container.querySelector('[data-role="jobTitleInput"]');
  const descLabelEl = container.querySelector('[data-role="jobDescriptionLabelEl"]');
  const descTextarea = container.querySelector('[data-role="jobDescriptionInput"]');
  const descError = container.querySelector('[data-role="jobDescriptionError"]');
  const linkLabelEl = container.querySelector('[data-role="jobLinkLabelEl"]');
  const linkInput = container.querySelector('[data-role="jobLinkInput"]');
  const removeBtn = container.querySelector('[data-role="removeJobBtn"]');

  titleInput.id = `jobTitle-${id}`;
  titleLabelEl.setAttribute("for", titleInput.id);
  descTextarea.id = `jobDescription-${id}`;
  descLabelEl.setAttribute("for", descTextarea.id);
  descError.id = `jobDescriptionError-${id}`;
  descTextarea.setAttribute("aria-describedby", descError.id);
  linkInput.id = `jobLinkRef-${id}`;
  linkLabelEl.setAttribute("for", linkInput.id);

  const block = { id, container, titleInput, descTextarea, descError, linkInput, removeBtn };

  descTextarea.addEventListener("input", () => clearJobBlockInvalid(block));
  removeBtn.addEventListener("click", () => removeJobBlock(id));

  document.getElementById("jobBlocksContainer").appendChild(container);
  jobBlocks.push(block);

  applyTranslations(getCurrentLanguage());
  updateJobBlocksUI();
}

function removeJobBlock(id) {
  const index = jobBlocks.findIndex((block) => block.id === id);
  if (index === -1) return;
  jobBlocks[index].container.remove();
  jobBlocks.splice(index, 1);
  updateJobBlocksUI();
}

async function handleSubmit(event) {
  event.preventDefault();
  hideFormError();

  const cvFile = document.getElementById("cvFile").files[0];
  const extraInfoFile = document.getElementById("extraInfoFile").files[0];
  const lang = getCurrentLanguage();

  const firstInvalidJobBlock = validateJobBlocks(lang);
  const fileErrors = validateForm(cvFile, extraInfoFile, lang);
  applyValidationErrors(fileErrors);

  if (firstInvalidJobBlock || Object.keys(fileErrors).length > 0) {
    if (firstInvalidJobBlock) {
      firstInvalidJobBlock.container.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      const firstFieldKey = Object.keys(fileErrors)[0];
      document.getElementById(FIELD_ERROR_MAP[firstFieldKey].inputId)
        .scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return;
  }

  const analyzeBtn = document.getElementById("analyzeBtn");
  analyzeBtn.disabled = true;
  analyzeBtn.textContent = UI_TRANSLATIONS[lang].analyzeButtonLoading;

  showLoading(lang);

  try {
    const [cvText, extraInfoText] = await Promise.all([
      extractTextFromFile(cvFile, lang),
      extraInfoFile ? extractTextFromFile(extraInfoFile, lang) : Promise.resolve(""),
    ]);

    const combinedProfileText = `${cvText}\n${extraInfoText}`;
    const jobsData = getJobBlockData();
    const analyses = jobsData.map((job, index) => ({
      title: resolveJobTitle(job.title, index, lang),
      rawTitle: job.title,
      jobText: job.description,
      fitResult: computeFit(job.description, combinedProfileText, lang),
    }));

    lastAnalyses = analyses;
    lastCvText = cvText;

    hideLoading();
    renderResults(analyses, lang);
  } catch (err) {
    hideLoading();
    showFormError(UI_TRANSLATIONS[getCurrentLanguage()].errors.submitProcessingError(err.message));
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = UI_TRANSLATIONS[getCurrentLanguage()].analyzeButton;
  }
}

async function handleCopyClick() {
  if (lastAnalyses.length === 0) return;
  const lang = getCurrentLanguage();
  const analysis = getSelectedAnalysis();
  const draftText = buildCoverLetter(analysis.jobText, lastCvText, analysis.fitResult, lang);
  const copyFeedback = document.getElementById("copyFeedback");
  try {
    await navigator.clipboard.writeText(draftText);
    copyFeedback.hidden = false;
    setTimeout(() => {
      copyFeedback.hidden = true;
    }, 2000);
  } catch (err) {
    showFormError(UI_TRANSLATIONS[lang].errors.copyFailed);
  }
}

function handleSendGmailClick() {
  if (lastAnalyses.length === 0) return;
  const lang = getCurrentLanguage();
  const analysis = getSelectedAnalysis();
  const subject = buildMailSubject(analysis.title, lastCvText, lang);
  const body = buildCoverLetter(analysis.jobText, lastCvText, analysis.fitResult, lang);
  const url = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(url, "_blank", "noopener");
}

function handleSendOtherEmailClick() {
  if (lastAnalyses.length === 0) return;
  const lang = getCurrentLanguage();
  const analysis = getSelectedAnalysis();
  const subject = buildMailSubject(analysis.title, lastCvText, lang);
  const body = buildCoverLetter(analysis.jobText, lastCvText, analysis.fitResult, lang);
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const DROPZONE_BASE_CLASSES = ["border-slate-300", "bg-slate-50/50", "dark:border-slate-600", "dark:bg-slate-900/40"];
const DROPZONE_ACTIVE_CLASSES = ["border-blue-500", "bg-blue-50", "dark:border-blue-400", "dark:bg-blue-900/20"];

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

// ---- Feature "Ver Ejemplo" ----

const EXAMPLE_BASE_PATH = "examples/example-1/";
let exampleDataCache = null; // { candidato, vacantes: { marketing, finance }, resultados: { marketing, finance } }
let exampleActiveVacancyKey = null; // "marketing" | "finance" | null (null = vista de lista)

async function loadExampleData() {
  if (exampleDataCache) return exampleDataCache;
  const [candidato, vacanteMarketing, vacanteFinance, resultadoMarketing, resultadoFinance] = await Promise.all([
    fetch(`${EXAMPLE_BASE_PATH}candidato.json`).then((r) => r.json()),
    fetch(`${EXAMPLE_BASE_PATH}vacante-marketing.json`).then((r) => r.json()),
    fetch(`${EXAMPLE_BASE_PATH}vacante-finance.json`).then((r) => r.json()),
    fetch(`${EXAMPLE_BASE_PATH}resultado-marketing.json`).then((r) => r.json()),
    fetch(`${EXAMPLE_BASE_PATH}resultado-finance.json`).then((r) => r.json()),
  ]);
  exampleDataCache = {
    candidato,
    vacantes: { marketing: vacanteMarketing, finance: vacanteFinance },
    resultados: { marketing: resultadoMarketing, finance: resultadoFinance },
  };
  return exampleDataCache;
}

function showExampleSubView(view) {
  document.getElementById("exampleListView").hidden = view !== "list";
  document.getElementById("exampleResultView").hidden = view !== "result";
}

function renderExampleListView(lang) {
  const t = UI_TRANSLATIONS[lang];
  const candidato = exampleDataCache.candidato[lang];

  document.getElementById("exampleCandidateName").textContent = candidato.nombre;
  document.getElementById("exampleCandidateProfile").textContent = candidato.perfil;

  const skillsList = document.getElementById("exampleCandidateSkills");
  skillsList.innerHTML = "";
  candidato.skills.forEach((skill) => {
    const li = document.createElement("li");
    li.textContent = skill;
    li.className = "rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300";
    skillsList.appendChild(li);
  });

  const vacancyList = document.getElementById("exampleVacancyList");
  vacancyList.innerHTML = "";
  for (const key of ["marketing", "finance"]) {
    const vacante = exampleDataCache.vacantes[key][lang];
    const fragment = document.getElementById("exampleVacancyTemplate").content.cloneNode(true);
    const card = fragment.querySelector('[data-role="exampleVacancyCard"]');
    card.querySelector('[data-role="exampleVacancyTitle"]').textContent = vacante.titulo;
    card.querySelector('[data-role="exampleVacancyCompany"]').textContent = vacante.empresa;
    card.querySelector('[data-role="exampleVacancyDescription"]').textContent = vacante.descripcion_completa;

    const analyzeBtn = card.querySelector('[data-role="exampleAnalyzeBtn"]');
    const loadingEl = card.querySelector('[data-role="exampleVacancyLoading"]');
    const loadingText = card.querySelector('[data-role="exampleVacancyLoadingText"]');
    analyzeBtn.textContent = t.analyzeButton;
    loadingText.textContent = t.analyzeButtonLoading;
    analyzeBtn.addEventListener("click", () => handleExampleAnalyzeClick(key, analyzeBtn, loadingEl));

    vacancyList.appendChild(fragment);
  }
}

function renderExampleResultView(lang) {
  const key = exampleActiveVacancyKey;
  const vacante = exampleDataCache.vacantes[key][lang];
  const resultado = exampleDataCache.resultados[key];
  const score = resultado.fit_score;
  const labelKey =
    score >= FIT_THRESHOLD_HIGH ? "alto" :
    score >= FIT_THRESHOLD_MEDIUM ? "medio" :
    "bajo";
  const breakdown = resultado.fit_breakdown.map((d) => ({ key: d.dimension, score: d.score }));

  const analysis = {
    title: vacante.titulo,
    rawTitle: vacante.titulo,
    jobText: vacante.descripcion_completa,
    fitResult: { score, labelKey, breakdown },
  };

  const resultCardContainer = document.getElementById("exampleResultCard");
  resultCardContainer.innerHTML = "";
  resultCardContainer.appendChild(renderJobDetailCard(analysis, lang, true));
}

function handleExampleAnalyzeClick(key, analyzeBtn, loadingEl) {
  analyzeBtn.hidden = true;
  loadingEl.hidden = false;
  setTimeout(() => {
    exampleActiveVacancyKey = key;
    renderExampleResultView(getCurrentLanguage());
    showExampleSubView("result");
  }, 1200);
}

async function handleExampleCopyClick() {
  if (!exampleActiveVacancyKey) return;
  const lang = getCurrentLanguage();
  const text = exampleDataCache.resultados[exampleActiveVacancyKey].cover_letter_text[lang];
  const feedback = document.getElementById("exampleCopyFeedback");
  try {
    await navigator.clipboard.writeText(text);
    feedback.hidden = false;
    setTimeout(() => {
      feedback.hidden = true;
    }, 2000);
  } catch (err) {
    const errorEl = document.getElementById("exampleLoadError");
    errorEl.textContent = UI_TRANSLATIONS[lang].errors.copyFailed;
    errorEl.hidden = false;
  }
}

async function openExampleOverlay() {
  const lang = getCurrentLanguage();
  const errorEl = document.getElementById("exampleLoadError");
  errorEl.hidden = true;
  exampleActiveVacancyKey = null;
  document.getElementById("realFormContent").hidden = true;
  document.getElementById("exampleOverlay").hidden = false;
  showExampleSubView("list");
  try {
    await loadExampleData();
    renderExampleListView(lang);
  } catch (err) {
    errorEl.textContent = UI_TRANSLATIONS[lang].exampleLoadError;
    errorEl.hidden = false;
  }
}

function closeExampleOverlay() {
  document.getElementById("exampleOverlay").hidden = true;
  document.getElementById("realFormContent").hidden = false;
  exampleActiveVacancyKey = null;
}

function handleStartNowClick() {
  closeExampleOverlay();
  const firstTitleInput = document.querySelector('[data-role="jobTitleInput"]');
  if (firstTitleInput) {
    firstTitleInput.scrollIntoView({ behavior: "smooth", block: "center" });
    firstTitleInput.focus();
  }
}

// Repinta la sub-vista del ejemplo actualmente visible (lista o resultado)
// en el idioma nuevo, sin volver a pedir los JSON — mismo espíritu que
// retranslateResults() para el flujo real.
function retranslateExampleOverlay(lang) {
  if (!exampleDataCache) return;
  if (document.getElementById("exampleOverlay").hidden) return;
  if (exampleActiveVacancyKey === null) {
    renderExampleListView(lang);
  } else {
    renderExampleResultView(lang);
  }
}

document.getElementById("jobForm").addEventListener("submit", handleSubmit);
document.getElementById("copyDraftBtn").addEventListener("click", handleCopyClick);
document.getElementById("sendGmailBtn").addEventListener("click", handleSendGmailClick);
document.getElementById("sendOtherEmailBtn").addEventListener("click", handleSendOtherEmailClick);
document.getElementById("downloadTrackingBtn").addEventListener("click", handleDownloadTracking);
document.getElementById("downloadAnalysisBtn").addEventListener("click", handleDownloadAnalysisClick);
document.getElementById("addJobBtn").addEventListener("click", createJobBlock);
document.getElementById("cvFile").addEventListener("change", () => clearFieldInvalid("cvFile"));
document.getElementById("extraInfoFile").addEventListener("change", () => clearFieldInvalid("extraInfoFile"));
setupDropzone(document.getElementById("cvDropzone"), document.getElementById("cvFile"), "cvFile");
setupDropzone(document.getElementById("extraInfoDropzone"), document.getElementById("extraInfoFile"), "extraInfoFile");
document.getElementById("startNowBtn").addEventListener("click", handleStartNowClick);
document.getElementById("viewExampleBtn").addEventListener("click", openExampleOverlay);
document.getElementById("exampleCloseBtn").addEventListener("click", closeExampleOverlay);
document.getElementById("exampleCtaBtn").addEventListener("click", handleStartNowClick);
document.getElementById("exampleCopyCoverLetterBtn").addEventListener("click", handleExampleCopyClick);

createJobBlock();

applyTranslations(getCurrentLanguage());
document.getElementById("languageSelect").addEventListener("change", () => {
  const lang = getCurrentLanguage();
  applyTranslations(lang);
  retranslateResults(lang);
  retranslateExampleOverlay(lang);
});

initTheme();
document.getElementById("themeToggleBtn").addEventListener("click", () => setTheme(!isDarkMode()));
