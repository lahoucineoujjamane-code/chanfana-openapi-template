# GeoTopo Pro

Application de cartographie topographique professionnelle / Professional topographic mapping app.
**100% client-side. Aucun serveur backend. Aucune clé API. / No backend, no API key.**

---

## Fonctions / Features

**Dessin / Drawing**
- Points, lignes, polygones, rectangles, cercles
- Édition (déplacer sommets) + suppression sélective + tout effacer
- Edit vertices, delete selected, clear all

**Mesure / Measure**
- Distance (cliquez plusieurs points, double-clic = fin)
- Surface (polygone)
- Unités métriques / impériales

**Coordonnées / Coordinates**
- Affichage temps réel sous le curseur dans le CRS choisi
- Systèmes : WGS84, Web Mercator, **Lambert Merchich Maroc (Zones 1, 2, Sahara)**, **les 120 zones UTM (N/S)**
- « Aller à des coordonnées » : saisir X/Y dans n'importe quel CRS → place un point

**Import / Export**
- Import : KML, GeoJSON, CSV, GPX, **DXF**
- Export : GeoJSON, KML, CSV, GPX, **DXF** (ouvre dans AutoCAD/QGIS), **PDF** (tableau de coordonnées)

> Note DWG : format propriétaire Autodesk, illisible en JavaScript pur. Le **DXF** exporté s'ouvre directement dans AutoCAD, Civil3D, QGIS, etc. — utilisez « Enregistrer sous DWG » dans AutoCAD si besoin du .dwg.

**Fonds de carte / Base maps**
- OpenStreetMap, **OpenTopoMap (topographique)**, Satellite Esri, Terrain Esri
- Réglage d'opacité

**PWA** — installable sur Android/iOS/Bureau, fonctionne hors-ligne (coquille + dernières tuiles).

**Bilingue** FR / EN — bouton en haut à droite.

---

## Déploiement sur serveur gratuit / Deploy to a free host

### Option 1 — Netlify (glisser-déposer, le plus simple)
1. Allez sur https://app.netlify.com/drop
2. Glissez **tout le dossier** `geotopo` dans la zone
3. C'est en ligne — vous recevez une URL `https://xxx.netlify.app`
4. (Optionnel) Renommez le site dans *Site settings → Change site name*

### Option 2 — GitHub Pages
```bash
# dans le dossier geotopo
git init
git add .
git commit -m "GeoTopo Pro"
git branch -M main
git remote add origin https://github.com/VOTRE_USER/geotopo.git
git push -u origin main
```
Puis : **Settings → Pages → Source: main / root → Save**.
URL : `https://VOTRE_USER.github.io/geotopo/`

### Option 3 — Cloudflare Pages
1. https://pages.cloudflare.com → *Create project → Direct Upload*
2. Téléversez le dossier → déployé sur `https://xxx.pages.dev`

---

## Transformer en APK / Build an APK
L'app étant une **PWA**, le plus simple :
1. Déployez (Netlify/GitHub Pages) pour obtenir une URL HTTPS
2. Allez sur https://www.pwabuilder.com
3. Collez l'URL → *Build → Android* → téléchargez le **`.apk`** signé prêt à installer

---

## Fichiers / Files
```
geotopo/
├── index.html      interface + styles
├── app.js          moteur (carte, dessin, mesure, conversions, I/O)
├── manifest.json   PWA
├── sw.js           service worker (hors-ligne)
├── icon-192.png
└── icon-512.png
```

## Test local / Run locally
```bash
cd geotopo
python3 -m http.server 8000
# ouvrez http://localhost:8000
```
