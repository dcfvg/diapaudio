// i18n.js - Internationalization for diapaudio
(() => {
  const translations = {
    en: {
      // Page title and main heading
      appTitle: "diapaudio 🛝",
      tagline: "🎧 Playback photos synced with recordings of that day.",
      
      // Instructions
  stepsTitle: "How to prepare:",
  step1Title: "Compile audio recordings and matching photos.",
  step1Text: "Recordings and photos do not need to be continuous or taken at the same time.",
  step2Title: "Use timestamps or metadata",
  step2Text: "Name each file with its capture time (e.g. <code>2025-01-01_08-00-00.jpg</code>) or make sure files contain metadata.",
  step3Title: "Drop a folder, files, or a ZIP archive",
  step3Text: "Drop a folder, files, or a ZIP archive in this area.",
      
      // CTA and buttons
  dropMessage: "Drop a folder, files, or a ZIP archive in this area.",
      buttonFolder: "📂 Choose a folder",
  buttonZip: "📦 Choose a ZIP archive",
      buttonFiles: "🎙️🖼️ Choose files",
      
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
      skipSilence: "Auto-skip",
      exportButton: "📋 Export to FCP XML",
      exportZipButton: "📦 Download ZIP",
      
      // Timeline
      timelineNotice: "No overlapping images found.",
      overlapHandlingInfo: "ℹ️ <strong>Overlap Handling:</strong> When audio tracks overlap, playback starts with the first track. When it ends, the second track seamlessly continues from its current position (not from the beginning).",
      overlapWarning: "⚠️ Overlap detected: \"{trackA}\" begins {duration} before \"{trackB}\" ends.",
      
      // Tooltips
      tooltipPlayPause: "Play/Pause playback (Spacebar)",
      tooltipTimeline: "Click to seek, drag to scrub through time. Scroll to zoom in/out.",
      tooltipAudioTracks: "Audio tracks - Click to switch between tracks",
      tooltipPhotoTimeline: "Photo timeline - Shows when photos were captured",
      tooltipClock: "Current time of day during recording. Click to switch between analog/digital display.",
      tooltipDelay: "Adjust time offset between audio and photos. Use format: minutes:seconds or -minutes:seconds",
      tooltipDelayInput: "Time offset (e.g., 0:30 or -1:15)",
      tooltipSpeed: "Adjust playback speed - slower or faster than real-time",
      tooltipSpeedSelect: "Playback speed multiplier",
      tooltipAutoSkip: "Automatically skip periods with no audio and no photos",
      tooltipAutoSkipCheckbox: "Enable/disable auto-skip of silent periods",
      tooltipExportXML: "Export timeline as Final Cut Pro XML for video editing",
      tooltipExportZIP: "Download all media files as a ZIP archive",
      
      // Language selector
      languageLabel: "Language"
    },
    
    fr: {
      // Page title and main heading
      appTitle: "diapaudio 🛝",
  tagline: "🎧 Synchroniser des photos avec des enregistrements audio.",
      
      // Instructions
  stepsTitle: "Préparation :",
  step1Title: "Compiler les enregistrements audio et les photos correspondantes.",
  step1Text: "Les enregistrements et les photos n'ont pas besoin d'être continus ni pris au même moment.",
  step2Title: "Utiliser des horodatages ou des métadonnées",
  step2Text: "Nommer chaque fichier avec l'heure de capture (ex : <code>2025-01-01_08-00-00.jpg</code>) ou s'assurer que les fichiers contiennent des métadonnées.",
  step3Title: "Déposer le dossier, des fichiers ou une archive ZIP",
  step3Text: "Déposer un dossier, des fichiers ou une archive ZIP dans cette zone.",
      
      // CTA and buttons
  dropMessage: "Déposer un dossier, des fichiers ou une archive ZIP dans cette zone.",
      buttonFolder: "📂 Choisir un dossier",
  buttonZip: "📦 Choisir une archive ZIP",
      buttonFiles: "🎙️🖼️ Choisir des fichiers",
      
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
      skipSilence: "Auto-saut",
      exportButton: "📋 Exporter vers FCP XML",
      exportZipButton: "📦 Télécharger ZIP",
      
      // Timeline
      timelineNotice: "Aucune image superposée trouvée.",
      overlapHandlingInfo: "ℹ️ <strong>Gestion des chevauchements :</strong> Lorsque des pistes audio se chevauchent, la lecture commence avec la première piste. Quand elle se termine, la deuxième piste continue de manière transparente depuis sa position actuelle (pas depuis le début).",
      overlapWarning: "⚠️ Chevauchement détecté : \"{trackA}\" commence {duration} avant la fin de \"{trackB}\".",
      
      // Tooltips
      tooltipPlayPause: "Lecture/Pause (Barre d'espace)",
      tooltipTimeline: "Cliquez pour chercher, glissez pour parcourir le temps. Molette pour zoomer.",
      tooltipAudioTracks: "Pistes audio - Cliquez pour changer de piste",
      tooltipPhotoTimeline: "Chronologie des photos - Montre quand les photos ont été prises",
      tooltipClock: "Heure du jour pendant l'enregistrement. Cliquez pour basculer entre affichage analogique/numérique.",
      tooltipDelay: "Ajuster le décalage temporel entre audio et photos. Format : minutes:secondes ou -minutes:secondes",
      tooltipDelayInput: "Décalage temporel (ex : 0:30 ou -1:15)",
      tooltipSpeed: "Ajuster la vitesse de lecture - plus lente ou plus rapide que le temps réel",
      tooltipSpeedSelect: "Multiplicateur de vitesse de lecture",
      tooltipAutoSkip: "Sauter automatiquement les périodes sans audio et sans photos",
      tooltipAutoSkipCheckbox: "Activer/désactiver le saut automatique des périodes silencieuses",
      tooltipExportXML: "Exporter la chronologie en XML Final Cut Pro pour le montage vidéo",
      tooltipExportZIP: "Télécharger tous les fichiers médias dans une archive ZIP",
      
      // Language selector
      languageLabel: "Langue"
    },
    
    es: {
      // Page title and main heading
      appTitle: "diapaudio 🛝",
      tagline: "🎧 Reproduce fotos sincronizadas con grabaciones de ese día.",
      
      // Instructions
  stepsTitle: "Cómo preparar:",
  step1Title: "Compilar grabaciones de audio y fotos correspondientes.",
  step1Text: "Las grabaciones y las fotos no tienen que ser continuas ni tomadas al mismo tiempo.",
  step2Title: "Usar marcas de tiempo o metadatos",
  step2Text: "Nombrar cada archivo con la hora de captura (ej: <code>2025-01-01_08-00-00.jpg</code>) o asegurarse de que los archivos contengan metadatos.",
  step3Title: "Soltar una carpeta, archivos o un archivo ZIP",
  step3Text: "Soltar una carpeta, archivos o un archivo ZIP en esta zona.",
      
      // CTA and buttons
  dropMessage: "Soltar una carpeta, archivos o un archivo ZIP en esta zona.",
      buttonFolder: "📂 Elegir una carpeta",
  buttonZip: "📦 Elegir una archivo ZIP",
      buttonFiles: "🎙️🖼️ Elegir archivos",
      
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
      skipSilence: "Auto-salto",
      exportButton: "📋 Exportar a FCP XML",
      exportZipButton: "📦 Descargar ZIP",
      
      // Timeline
      timelineNotice: "No se encontraron imágenes superpuestas.",
      overlapHandlingInfo: "ℹ️ <strong>Manejo de superposiciones:</strong> Cuando las pistas de audio se superponen, la reproducción comienza con la primera pista. Cuando termina, la segunda pista continúa sin problemas desde su posición actual (no desde el principio).",
      overlapWarning: "⚠️ Superposición detectada: \"{trackA}\" comienza {duration} antes de que termine \"{trackB}\".",
      
      // Tooltips
      tooltipPlayPause: "Reproducir/Pausar (Barra espaciadora)",
      tooltipTimeline: "Clic para buscar, arrastrar para recorrer el tiempo. Desplazar para acercar/alejar.",
      tooltipAudioTracks: "Pistas de audio - Clic para cambiar entre pistas",
      tooltipPhotoTimeline: "Línea de tiempo de fotos - Muestra cuándo se capturaron las fotos",
      tooltipClock: "Hora del día durante la grabación. Clic para cambiar entre visualización analógica/digital.",
      tooltipDelay: "Ajustar desfase temporal entre audio y fotos. Formato: minutos:segundos o -minutos:segundos",
      tooltipDelayInput: "Desfase temporal (ej: 0:30 o -1:15)",
      tooltipSpeed: "Ajustar velocidad de reproducción - más lenta o más rápida que tiempo real",
      tooltipSpeedSelect: "Multiplicador de velocidad de reproducción",
      tooltipAutoSkip: "Saltar automáticamente períodos sin audio y sin fotos",
      tooltipAutoSkipCheckbox: "Activar/desactivar salto automático de períodos silenciosos",
      tooltipExportXML: "Exportar línea de tiempo como XML de Final Cut Pro para edición de video",
      tooltipExportZIP: "Descargar todos los archivos multimedia como archivo ZIP",
      
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
