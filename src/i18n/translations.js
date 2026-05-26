export const translations = {
  en: {
    // Warnings & Modal Help
    warningTitle: "Warning:",
    overlap: "Overlap",
    overlapHelp: "Audio files overlap in the timeline.",
    duplicate: "Duplicate",
    duplicateHelp: "Identical files were ignored.",
    delay: "Delay",
    // Dynamic feedback
    noNewFiles:
      "No new files to add. Skipped {{duplicateCount}} duplicate(s) already in timeline{{intraBatchText}}.",
    addedFiles:
      "Adding {{count}} new file(s) to timeline. Skipped {{duplicateCount}} duplicate(s) already in timeline{{intraBatchText}}.",
    andIntraBatch: " and {{intraBatchDuplicateCount}} duplicate(s) within selection",
    multipleDelayFilesDetected:
      "Multiple delay files detected ({{count}}); using the last one: {{delay}}",
    multipleDelayFilesDetectedAddition:
      "Multiple delay files detected in addition ({{count}}); using the last one: {{delay}}",
    removedDuplicateAudio: "Removed {{count}} duplicate audio file(s) in this drop",
    removedDuplicateImage: "Removed {{count}} duplicate image file(s) in this drop",

    // Error messages
    errorOnlyDuplicates: "Only duplicate files detected. All files were already processed.",
    errorNoMediaFiles: "No audio or image files detected. Please add media files with timestamps.",
    errorNoValidMediaFiles:
      "No valid media files with timestamps found. Please ensure files have timestamps in their names or metadata.",
    errorZipLibraryNotLoaded: "zip.js library not loaded",
    errorFailedExtractZip: "Failed to extract ZIP: {{message}}",
    errorZipOnlySystemFiles:
      "ZIP archive only contains system files (__MACOSX, .DS_Store, etc). Please recreate the ZIP without these files.",
    errorZipNoValidFiles:
      "No valid files found in ZIP archive. Make sure the ZIP contains images and audio files.",
    errorOnlySystemFiles: "Only system files detected. Please select valid audio and image files.",
    errorNoValidFiles: "No valid files found. Please select audio and image files.",
    errorDropFolderOrFiles: "Please drop a folder, ZIP file, or individual audio/image files.",
    alertNoMediaLoaded: "No media loaded. Please load a folder with images and audio first.",
    alertNoMediaToExport: "No media loaded to export.",
    alertFailedCreateZip: "Failed to create ZIP archive: {{message}}",

    // Page title and main heading
    appTitle: "diapaudio",
    tagline: "Playback photos synced with recordings of that day.",

    // Instructions
    stepsTitle: "How to prepare:",
    step1Title: "Compile audio recordings and matching photos",
    step1Text: "Recordings and photos do not need to be continuous or taken at the same time.",
    step2Title: "Use timestamps or metadata",
    step2Text:
      "Name each file with its capture time (e.g. <code>2025-01-01_08-00-00.jpg</code>) or make sure files contain metadata.",
    step3Title: "Drop folders, files, or ZIP archives in this area",

    // CTA and buttons
    dropMessage: "Drop folders, files, or ZIP archives in this area.",
    buttonFolder: "Choose a folder",
    buttonZip: "Choose a ZIP archive",
    buttonFiles: "Choose files",
    loadLocalSample: "Load local sample",
    loadingLocalSample: "Loading local sample...",

    // Notes
    notePrivacy:
      'Nothing leaves your computer — no uploads, no servers, just your session.<br/>For detailed instructions and source code, see the <a href="https://github.com/dcfvg/diapaudio" target="_blank" rel="noopener noreferrer">README</a>.',

    // Loader
    loadingFiles: "Loading files...",
    extractingZip: "Extracting ZIP file...",
    processingFiles: "Processing files...",
    readingFolder: "Reading folder...",
    filesProcessed: "files processed",
    progressLoadingTitle: "Preparing media",
    progressExportingTitle: "Preparing export",
    errorModalTitle: "Something went wrong",
    complete: "Complete",

    // Controls
    play: "Play",
    pause: "Pause",
    speed: "Speed",
    delayControl: "Offset",
    delayMs: "ms",
    exportButton: "Export for Premiere",
    exportZipButton: "Download ZIP",
    closeButton: "Close",

    // Timeline
    timelineNotice: "No overlapping images found.",
    timelineNoticesButton: "{{count}} timeline notice",
    timelineNoticesButton_plural: "{{count}} timeline notices",
    overlapHandlingInfo:
      "ℹ️ <strong>Overlap Handling:</strong> When audio tracks overlap, playback starts with the first track. When it ends, the second track seamlessly continues from its current position (not from the beginning).",
    overlapWarning:
      '⚠️ Overlap detected: "{{trackA}}" begins {{duration}} before "{{trackB}}" ends.',
    timelineSettings: "Settings",
    timelineSettingsTitle: "Settings",
    timelineSettingsSubtitle: "Playback and export",
    timelineSettingsDelayHint: "mm:ss or -mm:ss",
    timelineSettingsImageDisplay: "Photo duration (s)",
    timelineSettingsImageDisplayHint: "Minimum time per photo",
    timelineSettingsImageHold: "Hold (s)",
    timelineSettingsImageHoldHint: "Keep the last photo visible",
    timelineSettingsCompositionInterval: "Composition change (s)",
    timelineSettingsCompositionIntervalHint: "Minimum seconds between layout updates",
    timelineSettingsDefault: "Default",
    timelineSettingsSnapToGrid: "Align",
    timelineSettingsSnapToGridHint: "Snap photos to the nearest grid step.",
    timelineSettingsExportPremiere: "Premiere package",
    timelineSettingsExportXml: "Export Premiere XML",
    timelineSettingsExportXmlOnly: "XML only",
    timelineSettingsExportZip: "Media ZIP",
    timelineSettingsPremiereRelinkHint:
      "If Premiere asks, relink to the archive media folder.",
    timelineSettingsKeyboardHelp: "Shortcuts",
    timelinePin: "Pin",
    timelineUnpin: "Unpin",
    timelineImageGroup: "{{count}} image",
    timelineImageGroup_plural: "{{count}} images",
    timelineImageGroupShort: "{{count}} img",
    timelineImageGroupShort_plural: "{{count}} img",

    // Tooltips
    tooltipPlayPause: "Play/Pause playback (Spacebar)",
    tooltipTimelinePin: "Keep timeline open",
    tooltipTimelineUnpin: "Auto-hide timeline",
    tooltipTimeline: "Drag to scrub. Alt-scroll to zoom.",
    tooltipAudioTracks: "Audio tracks - Click to switch between tracks",
    tooltipPhotoTimeline: "Photo timeline - Shows when photos were captured",
    tooltipClock:
      "Current time of day during recording. Click to switch between analog/digital display.",
    tooltipDelay:
      "Adjust time offset between audio and photos. Use format: minutes:seconds or -minutes:seconds",
    tooltipDelayInput: "Time offset (e.g., 0:30 or -1:15)",
    tooltipSpeed: "Playback speed",
    tooltipSpeedSelect: "Speed",
    tooltipAutoSkip: "Skip empty time",
    tooltipAutoSkipCheckbox: "Skip blanks",
    tooltipShowClock: "Show clock",
    showClockLabel: "Clock",
    tooltipExportXML: "Export timeline as Premiere-compatible Final Cut Pro XML",
    tooltipExportZIP: "Download all media files as a ZIP archive",

    // Keyboard shortcuts
    shortcutPlayPause: "Play / Pause",
    shortcutSeekBackward: "Seek backward 10 seconds",
    shortcutSeekForward: "Seek forward 10 seconds",
    shortcutNextMedia: "Jump to next media (audio or image)",
    shortcutPrevMedia: "Jump to previous media (audio or image)",
    shortcutSpeedUp: "Increase playback speed",
    shortcutSpeedDown: "Decrease playback speed",
    shortcutFullscreen: "Toggle fullscreen",
    shortcutHelp: "Show keyboard shortcuts",

    // Language selector
    languageLabel: "Language",
  },

  fr: {
    // Warnings & Modal Help
    warningTitle: "Avertissement :",
    overlap: "Chevauchement",
    overlapHelp: "Des fichiers audio se superposent dans la timeline.",
    duplicate: "Doublon",
    duplicateHelp: "Des fichiers identiques ont été ignorés.",
    delay: "Délai",
    // Dynamic feedback
    noNewFiles:
      "Aucun nouveau fichier à ajouter. {{duplicateCount}} doublon(s) déjà dans la timeline{{intraBatchText}} ignoré(s).",
    addedFiles:
      "Ajout de {{count}} nouveau(x) fichier(s) à la timeline. {{duplicateCount}} doublon(s) déjà dans la timeline{{intraBatchText}} ignoré(s).",
    andIntraBatch: " et {{intraBatchDuplicateCount}} doublon(s) dans la sélection",
    multipleDelayFilesDetected:
      "Plusieurs fichiers de délai détectés ({{count}}) ; utilisation du dernier : {{delay}}",
    multipleDelayFilesDetectedAddition:
      "Plusieurs fichiers de délai détectés en plus ({{count}}) ; utilisation du dernier : {{delay}}",
    removedDuplicateAudio: "Suppression de {{count}} fichier(s) audio en double dans cet import",
    removedDuplicateImage: "Suppression de {{count}} fichier(s) image en double dans cet import",

    // Error messages
    errorOnlyDuplicates:
      "Seuls des fichiers en double ont été détectés. Tous les fichiers ont déjà été traités.",
    errorNoMediaFiles:
      "Aucun fichier audio ou image détecté. Veuillez ajouter des fichiers média avec des horodatages.",
    errorNoValidMediaFiles:
      "Aucun fichier média valide avec horodatage trouvé. Veuillez vous assurer que les fichiers ont des horodatages dans leurs noms ou métadonnées.",
    errorZipLibraryNotLoaded: "Bibliothèque zip.js non chargée",
    errorFailedExtractZip: "Échec de l'extraction du ZIP : {{message}}",
    errorZipOnlySystemFiles:
      "L'archive ZIP ne contient que des fichiers système (__MACOSX, .DS_Store, etc). Veuillez recréer le ZIP sans ces fichiers.",
    errorZipNoValidFiles:
      "Aucun fichier valide trouvé dans l'archive ZIP. Assurez-vous que le ZIP contient des images et des fichiers audio.",
    errorOnlySystemFiles:
      "Seuls des fichiers système ont été détectés. Veuillez sélectionner des fichiers audio et image valides.",
    errorNoValidFiles:
      "Aucun fichier valide trouvé. Veuillez sélectionner des fichiers audio et image.",
    errorDropFolderOrFiles:
      "Veuillez déposer un dossier, un fichier ZIP ou des fichiers audio/image individuels.",
    alertNoMediaLoaded:
      "Aucun média chargé. Veuillez charger un dossier avec des images et de l'audio d'abord.",
    alertNoMediaToExport: "Aucun média chargé à exporter.",
    alertFailedCreateZip: "Échec de création de l'archive ZIP : {{message}}",

    // Page title and main heading
    appTitle: "diapaudio",
    tagline: "Synchroniser des photos avec des enregistrements audio.",

    // Instructions
    stepsTitle: "Préparation :",
    step1Title: "Compiler les enregistrements audio et les photos correspondantes",
    step1Text:
      "Les enregistrements et les photos n'ont pas besoin d'être continus ni pris au même moment.",
    step2Title: "Utiliser des horodatages ou des métadonnées",
    step2Text:
      "Nommer chaque fichier avec l'heure de capture (ex : <code>2025-01-01_08-00-00.jpg</code>) ou s'assurer que les fichiers contiennent des métadonnées.",
    step3Title: "Déposer des dossiers, des fichiers ou des archives ZIP dans cette zone",

    // CTA and buttons
    dropMessage: "Déposer des dossiers, des fichiers ou des archives ZIP dans cette zone.",
    buttonFolder: "Choisir un dossier",
    buttonZip: "Choisir une archive ZIP",
    buttonFiles: "Choisir des fichiers",
    loadLocalSample: "Charger le sample local",
    loadingLocalSample: "Chargement du sample local...",

    // Notes
    notePrivacy:
      'Rien ne quitte votre ordinateur — pas de téléversement, pas de serveur, juste votre session. <br/>Pour des instructions détaillées et le code source, consultez le <a href="https://github.com/dcfvg/diapaudio" target="_blank" rel="noopener noreferrer">README</a>.',

    // Loader
    loadingFiles: "Chargement des fichiers...",
    extractingZip: "Extraction du fichier ZIP...",
    processingFiles: "Traitement des fichiers...",
    readingFolder: "Lecture du dossier...",
    filesProcessed: "fichiers traités",
    progressLoadingTitle: "Préparation des médias",
    progressExportingTitle: "Préparation de l'export",
    errorModalTitle: "Une erreur est survenue",
    complete: "Terminé",

    // Controls
    play: "Lecture",
    pause: "Pause",
    speed: "Vitesse",
    delayControl: "Décalage",
    delayMs: "ms",
    exportButton: "Exporter pour Premiere",
    exportZipButton: "Télécharger ZIP",
    closeButton: "Fermer",

    // Timeline
    timelineNotice: "Aucune image superposée trouvée.",
    timelineNoticesButton: "{{count}} alerte de chronologie",
    timelineNoticesButton_plural: "{{count}} alertes de chronologie",
    overlapHandlingInfo:
      "ℹ️ <strong>Gestion des chevauchements :</strong> Lorsque des pistes audio se chevauchent, la lecture commence avec la première piste. Quand elle se termine, la deuxième piste continue de manière transparente depuis sa position actuelle (pas depuis le début).",
    overlapWarning:
      '⚠️ Chevauchement détecté : "{{trackA}}" commence {{duration}} avant la fin de "{{trackB}}".',
    timelineSettings: "Réglages",
    timelineSettingsTitle: "Réglages",
    timelineSettingsSubtitle: "Lecture et export",
    timelineSettingsDelayHint: "mm:ss ou -mm:ss",
    timelineSettingsImageDisplay: "Durée photo (s)",
    timelineSettingsImageDisplayHint: "Temps minimum par photo",
    timelineSettingsImageHold: "Maintien (s)",
    timelineSettingsImageHoldHint: "Garde la dernière photo visible",
    timelineSettingsCompositionInterval: "Changement de composition (s)",
    timelineSettingsCompositionIntervalHint:
      "Secondes minimales entre deux changements de disposition",
    timelineSettingsDefault: "Défaut",
    timelineSettingsSnapToGrid: "Aligner",
    timelineSettingsSnapToGridHint: "Place les photos sur la grille la plus proche.",
    timelineSettingsExportPremiere: "Package Premiere",
    timelineSettingsExportXml: "Exporter le XML Premiere",
    timelineSettingsExportXmlOnly: "XML seul",
    timelineSettingsExportZip: "Médias ZIP",
    timelineSettingsPremiereRelinkHint:
      "Si Premiere le demande, choisir le dossier media de l'archive.",
    timelineSettingsKeyboardHelp: "Raccourcis",
    timelinePin: "Épingler",
    timelineUnpin: "Désépingler",
    timelineImageGroup: "{{count}} image",
    timelineImageGroup_plural: "{{count}} images",
    timelineImageGroupShort: "{{count}} img",
    timelineImageGroupShort_plural: "{{count}} img",

    // Tooltips
    tooltipPlayPause: "Lecture/Pause (Barre d'espace)",
    tooltipTimelinePin: "Garder la timeline ouverte",
    tooltipTimelineUnpin: "Masquer automatiquement",
    tooltipTimeline: "Glisser pour parcourir. Alt-molette pour zoomer.",
    tooltipAudioTracks: "Pistes audio - Cliquez pour changer de piste",
    tooltipPhotoTimeline: "Chronologie des photos - Montre quand les photos ont été prises",
    tooltipClock:
      "Heure du jour pendant l'enregistrement. Cliquez pour basculer entre affichage analogique/numérique.",
    tooltipDelay:
      "Ajuster le décalage temporel entre audio et photos. Format : minutes:secondes ou -minutes:secondes",
    tooltipDelayInput: "Décalage temporel (ex : 0:30 ou -1:15)",
    tooltipSpeed: "Vitesse de lecture",
    tooltipSpeedSelect: "Vitesse",
    tooltipAutoSkip: "Ignorer les blancs",
    tooltipAutoSkipCheckbox: "Ignorer les blancs",
    tooltipShowClock: "Afficher l'horloge",
    showClockLabel: "Horloge",
    tooltipExportXML: "Exporter la chronologie en XML Final Cut Pro compatible Premiere",
    tooltipExportZIP: "Télécharger tous les fichiers médias dans une archive ZIP",

    // Keyboard shortcuts
    shortcutPlayPause: "Lecture / Pause",
    shortcutSeekBackward: "Reculer de 10 secondes",
    shortcutSeekForward: "Avancer de 10 secondes",
    shortcutNextMedia: "Aller au média suivant (audio ou image)",
    shortcutPrevMedia: "Aller au média précédent (audio ou image)",
    shortcutSpeedUp: "Augmenter la vitesse de lecture",
    shortcutSpeedDown: "Diminuer la vitesse de lecture",
    shortcutFullscreen: "Basculer en plein écran",
    shortcutHelp: "Afficher les raccourcis clavier",

    // Language selector
    languageLabel: "Langue",
  },

  es: {
    // Warnings & Modal Help
    warningTitle: "Advertencia:",
    overlap: "Superposición",
    overlapHelp: "Archivos de audio se superponen en la línea de tiempo.",
    duplicate: "Duplicado",
    duplicateHelp: "Archivos idénticos fueron ignorados.",
    delay: "Retraso",
    // Dynamic feedback
    noNewFiles:
      "No hay nuevos archivos para agregar. {{duplicateCount}} duplicado(s) ya en la cronología{{intraBatchText}} ignorado(s).",
    addedFiles:
      "Se agregaron {{count}} archivo(s) nuevo(s) a la cronología. {{duplicateCount}} duplicado(s) ya en la cronología{{intraBatchText}} ignorado(s).",
    andIntraBatch: " y {{intraBatchDuplicateCount}} duplicado(s) en la selección",
    multipleDelayFilesDetected:
      "Varios archivos de retraso detectados ({{count}}); usando el último: {{delay}}",
    multipleDelayFilesDetectedAddition:
      "Varios archivos de retraso detectados además ({{count}}); usando el último: {{delay}}",
    removedDuplicateAudio:
      "Eliminado {{count}} archivo(s) de audio duplicado(s) en esta importación",
    removedDuplicateImage:
      "Eliminado {{count}} archivo(s) de imagen duplicado(s) en esta importación",

    // Error messages

    // Error messages
    errorOnlyDuplicates:
      "Solo se detectaron archivos duplicados. Todos los archivos ya fueron procesados.",
    errorNoMediaFiles:
      "No se detectaron archivos de audio o imagen. Por favor agregue archivos multimedia con marcas de tiempo.",
    errorNoValidMediaFiles:
      "No se encontraron archivos multimedia válidos con marcas de tiempo. Asegúrese de que los archivos tengan marcas de tiempo en sus nombres o metadatos.",
    errorZipLibraryNotLoaded: "Biblioteca zip.js no cargada",
    errorFailedExtractZip: "Error al extraer ZIP: {{message}}",
    errorZipOnlySystemFiles:
      "El archivo ZIP solo contiene archivos del sistema (__MACOSX, .DS_Store, etc). Por favor recree el ZIP sin estos archivos.",
    errorZipNoValidFiles:
      "No se encontraron archivos válidos en el archivo ZIP. Asegúrese de que el ZIP contenga imágenes y archivos de audio.",
    errorOnlySystemFiles:
      "Solo se detectaron archivos del sistema. Seleccione archivos de audio e imagen válidos.",
    errorNoValidFiles: "No se encontraron archivos válidos. Seleccione archivos de audio e imagen.",
    errorDropFolderOrFiles:
      "Por favor suelte una carpeta, archivo ZIP o archivos de audio/imagen individuales.",
    alertNoMediaLoaded:
      "No hay medios cargados. Por favor cargue una carpeta con imágenes y audio primero.",
    alertNoMediaToExport: "No hay medios cargados para exportar.",
    alertFailedCreateZip: "Error al crear archivo ZIP: {{message}}",

    // Page title and main heading
    appTitle: "diapaudio",
    tagline: "Reproduce fotos sincronizadas con grabaciones de ese día.",

    // Instructions
    stepsTitle: "Cómo preparar:",
    step1Title: "Compilar grabaciones de audio y fotos correspondientes",
    step1Text:
      "Las grabaciones y las fotos no tienen que ser continuas ni tomadas al mismo tiempo.",
    step2Title: "Usar marcas de tiempo o metadatos",
    step2Text:
      "Nombrar cada archivo con la hora de captura (ej: <code>2025-01-01_08-00-00.jpg</code>) o asegurarse de que los archivos contengan metadatos.",
    step3Title: "Soltar carpetas, archivos o archivos ZIP en esta zona",

    // CTA and buttons
    dropMessage: "Soltar carpetas, archivos o archivos ZIP en esta zona.",
    buttonFolder: "Elegir una carpeta",
    buttonZip: "Elegir un archivo ZIP",
    buttonFiles: "Elegir archivos",
    loadLocalSample: "Cargar muestra local",
    loadingLocalSample: "Cargando muestra local...",

    // Notes
    notePrivacy:
      'Nada sale de tu computadora — sin cargas, sin servidores, solo tu sesión. <br/> Para instrucciones detalladas y código fuente, consulta el <a href="https://github.com/dcfvg/diapaudio" target="_blank" rel="noopener noreferrer">README</a>.',

    // Loader
    loadingFiles: "Cargando archivos...",
    extractingZip: "Extrayendo archivo ZIP...",
    processingFiles: "Procesando archivos...",
    readingFolder: "Leyendo carpeta...",
    filesProcessed: "archivos procesados",
    progressLoadingTitle: "Preparando medios",
    progressExportingTitle: "Preparando exportación",
    errorModalTitle: "Ocurrió un error",
    complete: "Completado",

    // Controls
    play: "Reproducir",
    pause: "Pausa",
    speed: "Velocidad",
    delayControl: "Desfase",
    delayMs: "ms",
    exportButton: "Exportar para Premiere",
    exportZipButton: "Descargar ZIP",
    closeButton: "Cerrar",

    // Timeline
    timelineNotice: "No se encontraron imágenes superpuestas.",
    timelineNoticesButton: "{{count}} alerta de cronología",
    timelineNoticesButton_plural: "{{count}} alertas de cronología",
    overlapHandlingInfo:
      "ℹ️ <strong>Manejo de superposiciones:</strong> Cuando las pistas de audio se superponen, la reproducción comienza con la primera pista. Cuando termina, la segunda pista continúa sin problemas desde su posición actual (no desde el principio).",
    overlapWarning:
      '⚠️ Superposición detectada: "{{trackA}}" comienza {{duration}} antes de que termine "{{trackB}}".',
    timelineSettings: "Ajustes",
    timelineSettingsTitle: "Ajustes",
    timelineSettingsSubtitle: "Reproducción y exportación",
    timelineSettingsDelayHint: "mm:ss o -mm:ss",
    timelineSettingsImageDisplay: "Duración foto (s)",
    timelineSettingsImageDisplayHint: "Tiempo mínimo por foto",
    timelineSettingsImageHold: "Retención (s)",
    timelineSettingsImageHoldHint: "Mantiene visible la última foto",
    timelineSettingsCompositionInterval: "Cambio de composición (s)",
    timelineSettingsCompositionIntervalHint: "Segundos mínimos entre cambios de diseño",
    timelineSettingsDefault: "Defecto",
    timelineSettingsSnapToGrid: "Alinear",
    timelineSettingsSnapToGridHint: "Ajusta las fotos al paso de cuadrícula más cercano.",
    timelineSettingsExportPremiere: "Paquete Premiere",
    timelineSettingsExportXml: "Exportar XML de Premiere",
    timelineSettingsExportXmlOnly: "Solo XML",
    timelineSettingsExportZip: "ZIP de medios",
    timelineSettingsPremiereRelinkHint:
      "Si Premiere lo pide, revincula con la carpeta media del archivo.",
    timelineSettingsKeyboardHelp: "Atajos",
    timelinePin: "Fijar",
    timelineUnpin: "Soltar",
    timelineImageGroup: "{{count}} imagen",
    timelineImageGroup_plural: "{{count}} imágenes",
    timelineImageGroupShort: "{{count}} img",
    timelineImageGroupShort_plural: "{{count}} img",

    // Tooltips
    tooltipPlayPause: "Reproducir/Pausar (Barra espaciadora)",
    tooltipTimelinePin: "Mantener la línea abierta",
    tooltipTimelineUnpin: "Ocultar automáticamente",
    tooltipTimeline: "Arrastra para recorrer. Alt-rueda para zoom.",
    tooltipAudioTracks: "Pistas de audio - Clic para cambiar entre pistas",
    tooltipPhotoTimeline: "Línea de tiempo de fotos - Muestra cuándo se capturaron las fotos",
    tooltipClock:
      "Hora del día durante la grabación. Clic para cambiar entre visualización analógica/digital.",
    tooltipDelay:
      "Ajustar desfase temporal entre audio y fotos. Formato: minutos:segundos o -minutos:segundos",
    tooltipDelayInput: "Desfase temporal (ej: 0:30 o -1:15)",
    tooltipSpeed: "Velocidad de reproducción",
    tooltipSpeedSelect: "Velocidad",
    tooltipAutoSkip: "Saltar vacíos",
    tooltipAutoSkipCheckbox: "Saltar vacíos",
    tooltipShowClock: "Mostrar reloj",
    showClockLabel: "Reloj",
    tooltipExportXML: "Exportar línea de tiempo como XML de Final Cut Pro compatible con Premiere",
    tooltipExportZIP: "Descargar todos los archivos multimedia como archivo ZIP",

    // Keyboard shortcuts
    shortcutPlayPause: "Reproducir / Pausar",
    shortcutSeekBackward: "Retroceder 10 segundos",
    shortcutSeekForward: "Avanzar 10 segundos",
    shortcutNextMedia: "Ir al siguiente medio (audio o imagen)",
    shortcutPrevMedia: "Ir al medio anterior (audio o imagen)",
    shortcutSpeedUp: "Aumentar velocidad de reproducción",
    shortcutSpeedDown: "Disminuir velocidad de reproducción",
    shortcutFullscreen: "Alternar pantalla completa",
    shortcutHelp: "Mostrar atajos de teclado",

    // Language selector
    languageLabel: "Idioma",
  },
};

export const resources = Object.fromEntries(
  Object.entries(translations).map(([language, catalog]) => [language, { translation: catalog }])
);
