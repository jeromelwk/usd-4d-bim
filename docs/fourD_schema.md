# Schéma 4D (namespace `fourD:`)

## Principe

Deux layers USD séparés :

- `geometry.usda` : uniquement la géométrie (Xform/Mesh), jamais modifiée par l'outil.
- `schedule.usda` : `subLayers = [@./geometry.usda@]`, ne contient que des `over` sur les prims de la géométrie.

Les deux fichiers doivent rester **côte à côte** dans le même dossier (référence relative `./geometry.usda`).

## Attributs par prim (sur les `over` de `schedule.usda`)

- `custom string fourD:appear` — date ISO (`"2026-03-15"`) en mode calendrier, ou id de phase (`"phase-2"`) en mode phase.
- `custom string fourD:disappear` (optionnel) — même règle. Absent = l'élément ne disparaît jamais.

## `customLayerData` (sur le layer racine de `schedule.usda`)

```
customLayerData = {
    dictionary fourD = {
        int schemaVersion = 1
        string mode = "calendar"  # ou "phase"
        dictionary calendar = {
            string projectStart = "2026-01-01"
            string projectEnd = "2026-12-31"
        }
        dictionary phase = {
            string[] phaseIds = ["phase-1", "phase-2", ...]
            string[] phaseNames = ["Fondations", "Structure", ...]
        }
        dictionary frameMapping = {
            string unit = "day"  # ou "phaseIndex"
            double framesPerUnit = 1.0
            double startTimeCode = 0.0
        }
    }
}
```

Note technique : la liste de phases est stockée en deux tableaux parallèles de chaînes
(`phaseIds`/`phaseNames`) plutôt qu'en liste de dictionnaires, car le writer/parser texte
d'USD ne sérialise pas de façon fiable une liste hétérogène (`vector<VtValue>`) à l'intérieur
d'un `customLayerData` imbriqué. Le backend (`fourd_schema.py`) reconstruit automatiquement
la forme `{"phases": [{"id": ..., "name": ...}]}` côté API.

## Visibilité "bakée" (dérivée, pas la source de vérité)

En plus des attributs `fourD:`, chaque prim planifié reçoit des `timeSamples` standards sur
son attribut `visibility` (`UsdGeom.Imageable`), avec le mapping : 1 frame = 1 jour (mode
calendrier) ou 1 frame = 1 index de phase (mode phase). Cela permet de rejouer le stage
composé dans n'importe quel viewer USD standard sans connaître le namespace `fourD:`.

## Vérification manuelle

1. Générer un exemple et exporter un schedule via l'interface web.
2. Ouvrir `schedule.usda` dans un éditeur de texte : vérifier `subLayers`, les blocs `over`
   avec `fourD:appear`/`fourD:disappear`, le `customLayerData`, et les `visibility.timeSamples`.
3. Ouvrir `geometry.usda` : il ne doit contenir **aucune** trace de `fourD:` ni de `timeSamples`.
4. Recharger le schedule dans l'UI (bouton "Recharger le schedule de cette session") et
   vérifier que l'arbre, le mode, les phases/dates et les barres du Gantt sont identiques.
