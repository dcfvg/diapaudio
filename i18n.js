// i18n.js - Internationalization for diapaudio
(() => {
  const translations = {
    en: {
      // Warnings & Modal Help
      warningTitle: "Warning:",
      overlap: "Overlap",
      overlapHelp: "Audio files overlap in the timeline.",
      duplicate: "Duplicate",
      duplicateHelp: "Identical files were ignored.",
      delay: "Delay",
      delayHelp: "Multiple delay files detected, only the last is used.",
      warningTypes: "Warning types: <b>Overlap</b> (audio files overlap), <b>Duplicate</b> (identical files ignored), <b>Delay</b> (multiple delay files, last used).",
      // Dynamic feedback
      noNewFiles: "No new files to add. Skipped {duplicateCount} duplicate(s) already in timeline{intraBatchText}.",
      addedFiles: "Adding {count} new file(s) to timeline. Skipped {duplicateCount} duplicate(s) already in timeline{intraBatchText}.",
      andIntraBatch: " and {intraBatchDuplicateCount} duplicate(s) within selection",
      multipleDelayFilesDetected: "Multiple delay files detected ({count}); using the last one: {delay}",
      multipleDelayFilesDetectedAddition: "Multiple delay files detected in addition ({count}); using the last one: {delay}",
      removedDuplicateAudio: "Removed {count} duplicate audio file(s) in this drop",
      removedDuplicateImage: "Removed {count} duplicate image file(s) in this drop",

      // Error messages
      errorOnlyDuplicates: "Only duplicate files detected. All files were already processed.",
      errorNoMediaFiles: "No audio or image files detected. Please add media files with timestamps.",
      errorNoValidMediaFiles: "No valid media files with timestamps found. Please ensure files have timestamps in their names or metadata.",
      errorZipLibraryNotLoaded: "zip.js library not loaded",
      errorFailedExtractZip: "Failed to extract ZIP: {message}",
      errorZipOnlySystemFiles: "ZIP archive only contains system files (__MACOSX, .DS_Store, etc). Please recreate the ZIP without these files.",
      errorZipNoValidFiles: "No valid files found in ZIP archive. Make sure the ZIP contains images and audio files.",
      errorOnlySystemFiles: "Only system files detected. Please select valid audio and image files.",
      errorNoValidFiles: "No valid files found. Please select audio and image files.",
      errorDropFolderOrFiles: "Please drop a folder, ZIP file, or individual audio/image files.",
      alertNoMediaLoaded: "No media loaded. Please load a folder with images and audio first.",
      alertNoMediaToExport: "No media loaded to export.",
      alertFailedCreateZip: "Failed to create ZIP archive: {message}",

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
      closeButton: "Close",

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
      // Warnings & Modal Help
      warningTitle: "Avertissement :",
      overlap: "Chevauchement",
      overlapHelp: "Des fichiers audio se superposent dans la timeline.",
      duplicate: "Doublon",
      duplicateHelp: "Des fichiers identiques ont été ignorés.",
      delay: "Délai",
      delayHelp: "Plusieurs fichiers de délai détectés, seul le dernier est utilisé.",
      warningTypes: "Types d'avertissement : <b>Chevauchement</b> (fichiers audio superposés), <b>Doublon</b> (fichiers identiques ignorés), <b>Délai</b> (plusieurs fichiers de délai, seul le dernier est utilisé).",
      // Dynamic feedback
      noNewFiles: "Aucun nouveau fichier à ajouter. {duplicateCount} doublon(s) déjà dans la timeline{intraBatchText} ignoré(s).",
      addedFiles: "Ajout de {count} nouveau(x) fichier(s) à la timeline. {duplicateCount} doublon(s) déjà dans la timeline{intraBatchText} ignoré(s).",
      andIntraBatch: " et {intraBatchDuplicateCount} doublon(s) dans la sélection",
      multipleDelayFilesDetected: "Plusieurs fichiers de délai détectés ({count}) ; utilisation du dernier : {delay}",
      multipleDelayFilesDetectedAddition: "Plusieurs fichiers de délai détectés en plus ({count}) ; utilisation du dernier : {delay}",
      removedDuplicateAudio: "Suppression de {count} fichier(s) audio en double dans cet import",
      removedDuplicateImage: "Suppression de {count} fichier(s) image en double dans cet import",

      // Error messages
      errorOnlyDuplicates: "Seuls des fichiers en double ont été détectés. Tous les fichiers ont déjà été traités.",
      errorNoMediaFiles: "Aucun fichier audio ou image détecté. Veuillez ajouter des fichiers média avec des horodatages.",
      errorNoValidMediaFiles: "Aucun fichier média valide avec horodatage trouvé. Veuillez vous assurer que les fichiers ont des horodatages dans leurs noms ou métadonnées.",
      errorZipLibraryNotLoaded: "Bibliothèque zip.js non chargée",
      errorFailedExtractZip: "Échec de l'extraction du ZIP : {message}",
      errorZipOnlySystemFiles: "L'archive ZIP ne contient que des fichiers système (__MACOSX, .DS_Store, etc). Veuillez recréer le ZIP sans ces fichiers.",
      errorZipNoValidFiles: "Aucun fichier valide trouvé dans l'archive ZIP. Assurez-vous que le ZIP contient des images et des fichiers audio.",
      errorOnlySystemFiles: "Seuls des fichiers système ont été détectés. Veuillez sélectionner des fichiers audio et image valides.",
      errorNoValidFiles: "Aucun fichier valide trouvé. Veuillez sélectionner des fichiers audio et image.",
      errorDropFolderOrFiles: "Veuillez déposer un dossier, un fichier ZIP ou des fichiers audio/image individuels.",
      alertNoMediaLoaded: "Aucun média chargé. Veuillez charger un dossier avec des images et de l'audio d'abord.",
      alertNoMediaToExport: "Aucun média chargé à exporter.",
      alertFailedCreateZip: "Échec de création de l'archive ZIP : {message}",

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
      closeButton: "Fermer",

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
      // Warnings & Modal Help
      warningTitle: "Advertencia:",
      overlap: "Superposición",
      overlapHelp: "Archivos de audio se superponen en la línea de tiempo.",
      duplicate: "Duplicado",
      duplicateHelp: "Archivos idénticos fueron ignorados.",
      delay: "Retraso",
      delayHelp: "Múltiples archivos de retraso detectados, solo se usa el último.",
      warningTypes: "Tipos de advertencia: <b>Superposición</b> (archivos de audio superpuestos), <b>Duplicado</b> (archivos idénticos ignorados), <b>Retraso</b> (múltiples archivos de retraso, se usa el último).",
      // Dynamic feedback
      noNewFiles: "Ningún archivo nuevo para agregar. Se omitieron {duplicateCount} duplicado(s) ya en la línea de tiempo{intraBatchText}.",
      addedFiles: "Agregando {count} archivo(s) nuevo(s) a la línea de tiempo. Se omitieron {duplicateCount} duplicado(s) ya en la línea de tiempo{intraBatchText}.",
      andIntraBatch: " y {intraBatchDuplicateCount} duplicado(s) dentro de la selección",
      multipleDelayFilesDetected: "Múltiples archivos de retraso detectados ({count}); usando el último: {delay}",
      multipleDelayFilesDetectedAddition: "Múltiples archivos de retraso detectados además ({count}); usando el último: {delay}",
      removedDuplicateAudio: "Se eliminaron {count} archivo(s) de audio duplicado(s) en esta importación",
      removedDuplicateImage: "Se eliminaron {count} archivo(s) de imagen duplicado(s) en esta importación",

      // Error messages
      errorOnlyDuplicates: "Solo se detectaron archivos duplicados. Todos los archivos ya fueron procesados.",
      errorNoMediaFiles: "No se detectaron archivos de audio o imagen. Por favor agregue archivos multimedia con marcas de tiempo.",
      errorNoValidMediaFiles: "No se encontraron archivos multimedia válidos con marcas de tiempo. Asegúrese de que los archivos tengan marcas de tiempo en sus nombres o metadatos.",
      errorZipLibraryNotLoaded: "Biblioteca zip.js no cargada",
      errorFailedExtractZip: "Error al extraer ZIP: {message}",
      errorZipOnlySystemFiles: "El archivo ZIP solo contiene archivos del sistema (__MACOSX, .DS_Store, etc). Por favor recree el ZIP sin estos archivos.",
      errorZipNoValidFiles: "No se encontraron archivos válidos en el archivo ZIP. Asegúrese de que el ZIP contenga imágenes y archivos de audio.",
      errorOnlySystemFiles: "Solo se detectaron archivos del sistema. Seleccione archivos de audio e imagen válidos.",
      errorNoValidFiles: "No se encontraron archivos válidos. Seleccione archivos de audio e imagen.",
      errorDropFolderOrFiles: "Por favor suelte una carpeta, archivo ZIP o archivos de audio/imagen individuales.",
      alertNoMediaLoaded: "No hay medios cargados. Por favor cargue una carpeta con imágenes y audio primero.",
      alertNoMediaToExport: "No hay medios cargados para exportar.",
      alertFailedCreateZip: "Error al crear archivo ZIP: {message}",

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
      closeButton: "Cerrar",

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
  function t(key, params = {}) {
    let translation = translations[currentLanguage][key] || translations['en'][key] || key;
    
    // Replace parameters in the translation
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(paramKey => {
        const regex = new RegExp(`\\{${paramKey}\\}`, 'g');
        translation = translation.replace(regex, params[paramKey]);
      });
      
      // Handle conditional text - remove text in {...} that wasn't replaced
      translation = translation.replace(/\{[^}]+\}/g, '');
    }
    
    return translation;
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
