# USD 4D BIM

Méthodologie 4D BIM sur OpenUSD : un layer de géométrie (`geometry.usda`) séparé d'un layer
de planning (`schedule.usda`, sublayer de la géométrie) qui pilote l'apparition/disparition
des éléments sur une ligne temporelle (calendrier ou phases). Voir [docs/fourD_schema.md](docs/fourD_schema.md)
pour le détail du schéma.

## Démarrage rapide (recommandé)

Le backend sert désormais aussi le frontend construit (`frontend/dist`) et le
visualiseur 3D construit (`viewer/dist`) : une fois installé, **un seul processus**
suffit, sur **un seul port** (http://localhost:8000).

1. Double-cliquer sur **`install.bat`** (une seule fois, ou après avoir modifié le
   code) — installe l'environnement Python, les dépendances npm, et construit le
   frontend et le visualiseur 3D.
2. Double-cliquer sur **`start.bat`** — démarre le serveur et ouvre le navigateur
   automatiquement sur http://localhost:8000. Un raccourci **"USD 4D BIM"** a été
   créé sur le Bureau pour ça.
3. Double-cliquer sur **`stop.bat`** pour arrêter le serveur (ou fermer sa fenêtre
   de console).

`start.bat` relance `install.bat` automatiquement s'il détecte que l'environnement
ou les builds sont manquants.

## Démarrage en développement (avec rechargement à chaud)

Pour modifier le code et voir les changements en direct, utiliser plutôt le mode
développement à deux serveurs :

### Backend (FastAPI + pxr)

```powershell
cd backend
.venv\Scripts\Activate.ps1   # ou .venv\Scripts\python.exe directement
python -m uvicorn app.main:app --reload --port 8000
```

Tests : `python -m pytest tests/ -v` (17 tests, aucune dépendance à usdview).

### Viewer 3D (usd-wg-webview, vendorisé)

Le dossier [viewer/](viewer/) contient une copie vendorisée et patchée de
[usd-wg/usd-wg-webview](https://github.com/usd-wg/usd-wg-webview) (voir
[viewer/PATCHES.md](viewer/PATCHES.md) pour le détail des modifications). Elle doit être
construite une fois (et après chaque modification) :

```powershell
cd viewer
npm install
npm run build
```

Le backend FastAPI sert automatiquement `viewer/dist/` sur `/viewer` s'il existe —
redémarrer le backend après un build pour que le montage soit pris en compte.

### Frontend (React + Vite)

```powershell
cd frontend
npm run dev
```

Ouvrir http://localhost:5173 (le dev server proxy `/api` et `/viewer` vers `http://localhost:8000`).
En mode développement, le frontend tourne sur son propre port avec rechargement à
chaud ; c'est uniquement `start.bat` (mode "démarrage rapide") qui sert la version
construite du frontend directement depuis le backend sur le port 8000.

## Utilisation

1. Cliquer sur "Générer un bâtiment d'exemple" (ou importer un `.usd`/`.usda`/`.usdc`).
2. La géométrie s'affiche dans l'aperçu 3D (panneau "Aperçu 3D").
3. Choisir le mode (Calendrier ou Phases) et configurer la plage de dates ou la liste de phases.
4. Sélectionner un ou plusieurs éléments dans l'arbre (Ctrl/Shift-clic pour une sélection multiple) —
   la sélection est surlignée en 3D (contour orange), et cliquer un élément dans la vue 3D
   met à jour la sélection dans l'arbre.
5. Assigner une apparition/disparition via le panneau "Assignation groupée".
6. Exporter : télécharge `geometry.usda` + `schedule.usda` (à garder dans le même dossier).
   L'aperçu 3D recharge alors automatiquement le stage composé (`schedule.usda`,
   qui sublayer `geometry.usda`) et affiche une timeline de lecture sous la vue :
   bouton lecture/pause + curseur, avec la date (mode calendrier) ou la phase
   (mode phases) affichée en regard. Un badge indique si l'aperçu est à jour ou
   si le planning a changé depuis le dernier export (auquel cas il faut
   réexporter pour le mettre à jour).
7. "Recharger le schedule de cette session" permet de vérifier le round-trip.

Un fichier d'exemple est disponible dans [sample_data/sample_geometry_reference.usda](sample_data/sample_geometry_reference.usda).
