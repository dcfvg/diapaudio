// i18n.js - Internationalization for diapaudio
(() => {
  const translations = {
    en: {
      // Page title and main heading
      appTitle: "diapaudio",
      tagline: "🎧 Playback photos synced with recordings of that day.",
      
      // Instructions
      stepsTitle: "How to prepare:",
      step1Title: "Collect your files",
      step1Text: "Place audio recordings and the matching photos in <strong>one folder</strong>.",
      step2Title: "Use timestamps",
      step2Text: "Name each file with its capture time, for example <code>2025-01-01_08-00-00.jpg</code> <br/>(or make sure they contain metadata)",
      step3Title: "Drop the folder or ZIP",
      step3Text: "Drag it here or browse for it below to replay the day.",
      
      // CTA and buttons
      dropMessage: "Drop your prepared folder or ZIP file anywhere in this area.",
      buttonFolder: "📂 Choose a folder",
      buttonZip: "📦 Choose a ZIP file",
      
      // Notes
      notePrivacy: "🔒 Nothing leaves your computer — no uploads, no servers, just your session.",
      noteTip: "💡 Tip: keeping your recorder, camera, and phone on the same time makes syncing effortless.",
      noteReadme: "📚 For detailed instructions and source code, see the <a href=\"https://github.com/dcfvg/diapaudio\" target=\"_blank\" rel=\"noopener noreferrer\">README</a>.",
      
      // Loader
      loadingFiles: "Loading files...",
      extractingZip: "Extracting ZIP file...",
      processingFiles: "Processing files...",
      readingFolder: "Reading folder...",
      filesProcessed: "files processed",
      
      // Controls
      play: "Play",
      pause: "Pause",
      speed: "Speed",
      delay: "Delay",
      delayMs: "ms",
      exportButton: "📋 Export to FCP XML",
      
      // Timeline
      timelineNotice: "No overlapping images found.",
      
      // Language selector
      languageLabel: "Language"
    },
    
    fr: {
      // Page title and main heading
      appTitle: "diapaudio",
      tagline: "🎧 Synchronisez vos photos avec vos enregistrements audio.",
      
      // Instructions
      stepsTitle: "Comment préparer :",
      step1Title: "Rassemblez vos fichiers",
      step1Text: "Placez les enregistrements audios et les photos correspondantes dans <strong>un seul dossier</strong>.",
      step2Title: "Utilisez des horodatages",
      step2Text: "Nommez chaque fichier avec son heure de capture, par exemple <code>2025-01-01_08-00-00.jpg</code> <br/>(ou assurez-vous qu'ils contiennent des métadonnées)",
      step3Title: "Déposez le dossier ou ZIP",
      step3Text: "Glissez-le ici ou parcourez ci-dessous pour rejouer la journée.",
      
      // CTA and buttons
      dropMessage: "Déposez votre dossier ou fichier ZIP préparé n'importe où dans cette zone.",
      buttonFolder: "📂 Choisir un dossier",
      buttonZip: "📦 Choisir un fichier ZIP",
      
      // Notes
      notePrivacy: "🔒 Rien ne quitte votre ordinateur — pas de téléversement, pas de serveur, juste votre session.",
      noteTip: "💡 Astuce : garder votre enregistreur, appareil photo et téléphone à la même heure facilite la synchronisation.",
      noteReadme: "📚 Pour des instructions détaillées et le code source, consultez le <a href=\"https://github.com/dcfvg/diapaudio\" target=\"_blank\" rel=\"noopener noreferrer\">README</a>.",
      
      // Loader
      loadingFiles: "Chargement des fichiers...",
      extractingZip: "Extraction du fichier ZIP...",
      processingFiles: "Traitement des fichiers...",
      readingFolder: "Lecture du dossier...",
      filesProcessed: "fichiers traités",
      
      // Controls
      play: "Lecture",
      pause: "Pause",
      speed: "Vitesse",
      delay: "Délai",
      delayMs: "ms",
      exportButton: "📋 Exporter vers FCP XML",
      
      // Timeline
      timelineNotice: "Aucune image superposée trouvée.",
      
      // Language selector
      languageLabel: "Langue"
    },
    
    es: {
      // Page title and main heading
      appTitle: "diapaudio",
      tagline: "🎧 Reproduce fotos sincronizadas con grabaciones de ese día.",
      
      // Instructions
      stepsTitle: "Cómo preparar:",
      step1Title: "Reúne tus archivos",
      step1Text: "Coloca la grabación de audio y las fotos correspondientes en <strong>una sola carpeta</strong>.",
      step2Title: "Usa marcas de tiempo",
      step2Text: "Nombra cada archivo con su hora de captura, por ejemplo <code>2025-01-01_08-00-00.jpg</code> <br/>(o asegúrate de que contengan metadatos)",
      step3Title: "Arrastra la carpeta o ZIP",
      step3Text: "Arrástralo aquí o explora a continuación para reproducir el día.",
      
      // CTA and buttons
      dropMessage: "Arrastra tu carpeta o archivo ZIP preparado en cualquier lugar de esta área.",
      buttonFolder: "📂 Elegir una carpeta",
      buttonZip: "📦 Elegir un archivo ZIP",
      
      // Notes
      notePrivacy: "🔒 Nada sale de tu computadora — sin cargas, sin servidores, solo tu sesión.",
      noteTip: "💡 Consejo: mantener tu grabadora, cámara y teléfono en la misma hora facilita la sincronización.",
      noteReadme: "📚 Para instrucciones detalladas y código fuente, consulta el <a href=\"https://github.com/dcfvg/diapaudio\" target=\"_blank\" rel=\"noopener noreferrer\">README</a>.",
      
      // Loader
      loadingFiles: "Cargando archivos...",
      extractingZip: "Extrayendo archivo ZIP...",
      processingFiles: "Procesando archivos...",
      readingFolder: "Leyendo carpeta...",
      filesProcessed: "archivos procesados",
      
      // Controls
      play: "Reproducir",
      pause: "Pausa",
      speed: "Velocidad",
      delay: "Retraso",
      delayMs: "ms",
      exportButton: "📋 Exportar a FCP XML",
      
      // Timeline
      timelineNotice: "No se encontraron imágenes superpuestas.",
      
      // Language selector
      languageLabel: "Idioma"
    }
  };

  // Detect browser language
  function detectLanguage() {
    const stored = localStorage.getItem('diapaudio-language');
    if (stored && translations[stored]) {
      return stored;
    }
    
    const browserLang = navigator.language || navigator.userLanguage;
    const langCode = browserLang.split('-')[0].toLowerCase();
    
    if (translations[langCode]) {
      return langCode;
    }
    
    return 'en'; // Default to English
  }

  let currentLanguage = detectLanguage();

  // Get translation
  function t(key) {
    return translations[currentLanguage][key] || translations['en'][key] || key;
  }

  // Update all UI elements with translations
  function updateUI() {
    // Update elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = t(key);
      
      if (element.hasAttribute('data-i18n-html')) {
        element.innerHTML = translation;
      } else {
        element.textContent = translation;
      }
    });
    
    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      element.placeholder = t(key);
    });
    
    // Update aria-labels
    document.querySelectorAll('[data-i18n-aria]').forEach(element => {
      const key = element.getAttribute('data-i18n-aria');
      element.setAttribute('aria-label', t(key));
    });
    
    // Update titles
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      element.title = t(key);
    });

    // Update language selector
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
      languageSelect.value = currentLanguage;
    }
  }

  // Change language
  function setLanguage(lang) {
    if (translations[lang]) {
      currentLanguage = lang;
      localStorage.setItem('diapaudio-language', lang);
      updateUI();
    }
  }

  // Initialize
  function init() {
    // Create language selector if it doesn't exist
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
      languageSelect.addEventListener('change', (e) => {
        setLanguage(e.target.value);
      });
    }
    
    // Initial UI update
    updateUI();
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export API
  window.DiapAudioI18n = {
    t,
    setLanguage,
    getCurrentLanguage: () => currentLanguage,
    getAvailableLanguages: () => Object.keys(translations),
    updateUI
  };
})();
