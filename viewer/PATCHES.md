# Patches apportés à usd-wg-webview

Ce dossier est une copie vendorisée de [usd-wg/usd-wg-webview](https://github.com/usd-wg/usd-wg-webview)
(BSD 3-Clause, voir [LICENSE](LICENSE)), incluant le binaire WASM d'OpenUSD précompilé
du dépôt d'origine (`public/usd-webview-bindings/`) — pas de build Emscripten/OpenUSD
nécessaire pour l'utiliser ici.

Modifications apportées par rapport à l'upstream, pour l'intégrer dans l'app USD 4D BIM
(embarqué en iframe, sélection synchronisée avec l'arbre de prims) :

1. **`src/viewer/Picking.ts` / `src/viewer/ThreeViewport.ts`** — `setSelectedPrim(path)`
   (sélection unique) devient `setSelectedPrims(paths[])` (sélection multiple), avec
   `setSelectedPrim` conservé comme wrapper de compatibilité. Ajout d'un overlay
   wireframe par mesh sélectionné (`addMeshHighlightOverlay`) : le simple tweak
   emissive existant est presque invisible sur une géométrie BIM blanche non texturée
   sous l'éclairage par défaut (vérifié empiriquement — diff de couleur ~9/765 avant,
   ~260/765 avec l'overlay), donc un contour orange indépendant de l'éclairage a été
   ajouté en complément.

2. **`src/app/appState.ts` / `src/app/sceneGraphPanel.ts`** — ajout de
   `state.viewportSelection: string[]` (multi-sélection) à côté de l'ancien
   `state.selectedPrimPath` (gardé synchronisé — un seul élément, ou `null` si 0 ou
   2+ sont sélectionnés — pour les fonctionnalités qui ne géraient qu'un seul prim :
   panneau d'attributs, raccourci clavier "F" pour cadrer, ré-sélection après édition
   de stage). Nouvelles fonctions exportées `setSelection(paths)` (point d'entrée
   unique de tout changement de sélection) et `toggleSelectionPath(path)` (ajout/retrait
   d'un chemin, pour le ctrl/shift-clic). `selectPrimByPath(path)` devient un simple
   alias de `setSelection([path])`. Le clic sur la liste de la scène (panneau latéral
   propre au viewer) supporte aussi désormais ctrl/shift-clic pour rester cohérent
   avec le viewport 3D.

3. **`src/app/layout.ts`** — le clic dans le viewport 3D détecte
   ctrl/cmd/shift et appelle `toggleSelectionPath` (ajoute/retire de la sélection)
   au lieu de toujours remplacer la sélection ; un clic simple sur du vide ne
   désélectionne que si aucun modificateur n'est maintenu (pour ne pas casser une
   sélection multiple en cours de construction).

4. **`src/app/automation.ts`** — expose sur `window.__USD_WEBVIEW_AUTOMATION__` :
   `selectPrims(paths)`, `clearSelection()`, et `onSelectionChange(callback)` — le
   callback reçoit désormais le tableau complet de la sélection courante (pas un
   seul chemin), notifié à chaque changement (clic simple, ctrl/shift-clic, ou
   sélection pilotée depuis l'app hôte). `selectPrims`/`clearSelection` passent par
   `setSelection()` de sceneGraphPanel.ts pour que la liste latérale, le panneau
   d'attributs et le surlignage 3D restent synchronisés même quand piloté de
   l'extérieur. C'est le pont utilisé par
   `frontend/src/components/Viewer3D/Viewer3DPanel.tsx`, qui garde une clé de la
   dernière sélection échangée dans chaque sens pour éviter un aller-retour infini
   entre le store React et le viewer.

5. **`src/app/animation.ts`** — `sampleAnimationFrame` (called by `setTime()` and by
   scrubbing/playing the native playbar) now does a **full** draw
   (`runtime.drawAtTime(timeCode, true)` + `state.viewport.updateRenderables(...)`)
   instead of a partial one. This was the key fix to make baked visibility
   playback actually work: the native driver's "time-varying" classification
   (`_ComputeCapabilities` in `unifiedDriver.cpp`) only flags a mesh as
   time-varying when its `points` or an ancestor xform op has more than one
   time sample -- it never considers `visibility` time samples. A partial draw
   (`full=false`) skips every mesh not in that set, so a mesh that only has
   animated visibility (exactly our appear/disappear bake) never gets
   re-evaluated when scrubbing: it either never appears, or never disappears,
   depending on its state at the first full draw. This is a native/WASM
   limitation that can't be patched without rebuilding OpenUSD-for-WASM, so a
   full draw is used instead -- confirmed correct and reasonably cheap for
   BIM-scale stages (verified via `getViewportDebugMaterialInfo()`'s mesh list
   changing correctly across scrub positions, and a full-frame pixel diff of
   ~670/765 between an all-hidden and all-shown frame). After each full draw,
   `setSelectedPrims(state.viewportSelection)` is re-applied because meshes
   that were added/recreated need their selection wireframe overlay rebuilt
   (see `meshHighlightOverlays` in Picking.ts) -- a stale overlay would
   otherwise reference now-disposed geometry.

6. **`src/app/loadOrchestrator.ts`** — `loadFiles`/`loadAutomationManifestStage`
   respectent désormais le champ `rootFile` du manifeste d'automation (déjà présent
   dans le type `AutomationManifest` mais jamais utilisé), au lieu de toujours deviner
   le fichier racine par heuristique — nécessaire dès qu'on charge plusieurs fichiers
   `.usda` de même profondeur (ex. `schedule.usda` + `geometry.usda`) sans nom de
   dossier pour désambiguïser.

6. **`vite.config.ts`** — `base: "/viewer/"` (ce build est servi monté sous `/viewer`
   par le backend FastAPI, pas depuis la racine).

7. **`src/usd/UsdWebViewRuntime.ts` / `src/materialx/MaterialXRuntime.ts`** — les chemins
   de chargement du binaire WASM et du runtime MaterialX étaient codés en dur en
   `/usd-webview-bindings/...` et `/materialx/...` (racine absolue) ; remplacés par
   `import.meta.env.BASE_URL + "..."` pour rester corrects une fois servis sous `/viewer/`.

8. **`src/app/automation.ts`** — expose `setUpAxis(choice: "stage" | "y" | "z")` sur
   `window.__USD_WEBVIEW_AUTOMATION__`, qui réutilise directement le mécanisme
   existant du viewer (`state.upAxisChoice` + `applyUpAxisOptions()` de `menus.ts`,
   normalement piloté par son propre menu "View > Up Axis" interne). Ça permet à
   l'app hôte de piloter ce réglage depuis son propre menu "Paramètres" plutôt que
   depuis l'UI native du viewer. Voir `frontend/src/components/MenuBar/ViewerSettingsMenu.tsx`.

## Reconstruire après une mise à jour de l'upstream ou un nouveau patch

```powershell
cd viewer
npm install
npm run build
```

Le résultat (`viewer/dist/`) est servi automatiquement par le backend FastAPI sur
`/viewer` s'il existe (voir `backend/app/main.py`). Redémarrer le backend après un
rebuild pour que `uvicorn --reload` recharge le montage de fichiers statiques.
