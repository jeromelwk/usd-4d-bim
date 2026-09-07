export const t = {
  app: {
    title: "Planification 4D",
  },
  upload: {
    geometryLabel: "Géométrie (.usda, .usd, .usdc)",
    scheduleLabel: "Planning existant (schedule.usda) — optionnel",
    loadButton: "Charger",
    loading: "Chargement en cours…",
    error: "Impossible de lire ce fichier USD",
  },
  sample: {
    button: "Générer un bâtiment d'exemple",
    loading: "Génération en cours…",
  },
  tree: {
    empty: "Aucune géométrie chargée — importez un fichier ou générez un exemple.",
    selectedCount: (n: number) => `${n} élément${n > 1 ? "s" : ""} sélectionné${n > 1 ? "s" : ""}`,
  },
  mode: {
    label: "Mode de ligne temporelle",
    calendar: "Calendrier",
    phase: "Phases",
  },
  calendar: {
    projectStart: "Début du projet",
    projectEnd: "Fin du projet",
  },
  phaseEditor: {
    title: "Phases du chantier",
    addPhase: "Ajouter une phase",
    namePlaceholder: "Nom de la phase",
    remove: "Supprimer",
    moveUp: "Monter",
    moveDown: "Descendre",
    empty: "Aucune phase définie — ajoutez-en au moins une.",
  },
  assignment: {
    appear: "Apparition",
    disappear: "Disparition",
    never: "Ne disparaît jamais",
    clear: "Effacer",
  },
  timeline: {
    empty: "Aucun élément planifié pour le moment",
  },
  export: {
    title: "Export",
    button: "Exporter (schedule.usda)",
    loading: "Export en cours…",
    success: "Export réussi",
    downloadGeometry: "Télécharger geometry.usda",
    downloadSchedule: "Télécharger schedule.usda",
    warning: "Les deux fichiers doivent rester dans le même dossier (référence relative).",
  },
  errors: {
    generic: "Une erreur est survenue",
  },
  viewer: {
    loading: "Chargement du visualiseur…",
    ready: "Prêt",
    error: "Erreur de connexion au visualiseur 3D",
    noSchedule: "Exportez un planning pour prévisualiser la construction dans le temps",
    stale: "Planning modifié — réexportez pour mettre à jour la prévisualisation",
    upToDate: "Prévisualisation à jour",
    play: "Lecture",
    pause: "Pause",
    restart: "Revenir au début",
  },
  menu: {
    file: "Accueil",
    timeline: "Paramètres temporels",
    export: "Exporter",
    settings: "Paramètres",
  },
  settings: {
    title: "Paramètres du visualiseur",
    upAxisLabel: "Axe vertical (up axis) de l'aperçu 3D",
    upAxisStage: "Depuis le fichier",
    upAxisY: "Y",
    upAxisZ: "Z",
  },
};
