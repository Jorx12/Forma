# Forma

Quadern personal de pes i gimnàs. És una PWA en català, pensada per al mòbil, que funciona sense connexió. **Totes les dades es guarden només al dispositiu** (IndexedDB), sense servidor ni comptes.

- **Stack:** Vite + React + TypeScript, Tailwind CSS 4, Dexie (IndexedDB), Recharts i vite-plugin-pwa.

## Funcionalitats

| Pantalla | Què hi ha |
|---|---|
| **Avui** | Sessió que toca segons la setmana tipus (natació dl, Força A dc, Força B dv, extra el cap de setmana), franja de la setmana amb el que s'ha fet (x/3), moure una sessió a un altre dia, registrar activitats extra (pàdel, pitch and putt, caminar), objectiu de la setmana, mitjana setmanal de pes, recordatoris (pesar-se dl/dc/dv, cintura els dilluns, revisió, berenar, 80/20) i modes Viatge i Nadal |
| **Pes** | Pesades (la dada principal és la **mitjana setmanal**), cintura dels dilluns, gràfic amb les fites mensuals del pla com a línia objectiu i indicadors |
| **Entrenar** | Força A, Força B o rutina d'hotel. Escalfament, força i cardio (bici, el·líptica o rem: 10 min les 4 primeres setmanes, després 15–20). Sèries preomplertes amb l'última vegada, suggeriment de pujar pes quan totes arriben al màxim del rang, planxa en segons, alternatives (elevacions laterals o face pull) i circuit d'hotel |
| **Natació** | Minuts i sensació (distància opcional), minuts per setmana i historial |
| **Progrés** | Historial, gràfic de pes per exercici i constància |
| **Més** | Revisió setmanal, setmana tipus, alimentació, rutines (editables), perfil, màquines, dades i instal·lació |

**Revisió setmanal (dilluns)**
- Checklist: mitjana de pes i cintura, sessions /3, berenars /5, dies amb alcohol (màxim 2) i objectiu per a la setmana vinent.
- Avisos automàtics:
  - baixar 0,3–0,5 kg: «Vas bé, no canviïs res»;
  - baixar més d'1 kg: menjar una mica més;
  - 2 setmanes sense baixar pes ni cintura: treure un dia d'alcohol o un picoteig i afegir 10 min de cardio (no surt en mode Nadal);
  - 7 dies sense entrenar: «Mai dues setmanes seguides sense entrenar», amb accés a la rutina d'hotel.

**Modes**
- **Viatge:** les sessions passen a ser la rutina d'hotel. En desactivar-lo, el primer dia laborable queda marcat com a «Tornada: encara que siguin 30 min».
- **Nadal:** l'objectiu passa a mantenir el pes. Es proposa activar-lo al desembre.

## Desenvolupament

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests de la lògica (progressió, generador, pes, calories)
npm run build      # genera dist/
npm run preview    # serveix dist/ (amb el service worker)
```

Per regenerar les icones a partir de `public/icons/icon.svg` (cal Playwright): `node scripts/generate-icons.mjs`.

## Publicar a GitHub Pages

L'app es publica a **https://jorx12.github.io/forma/** amb el workflow `.github/workflows/pages.yml`, que s'executa cada vegada que hi ha canvis a `main`.

1. **Una sola vegada:** *Settings → Pages → Source: GitHub Actions*.
2. Qualsevol push a `main` compila l'app, passa els tests i la publica. També es pot llançar a mà des de *Actions → Run workflow*.

Les dades no es guarden mai al repositori: viuen només al mòbil.

## Instal·lar-la a l'iPhone

1. Obre la URL amb **Safari**.
2. Toca **Compartir** → **Afegir a la pantalla d'inici** → **Afegir**.
3. Obre-la sempre des de la icona. Les dades de l'app instal·lada són diferents de les de la pestanya de Safari.

**Limitacions de l'iPhone**
- L'iPhone no deixa vibrar les webs. Quan s'acaba el descans sona un avís (cal treure el mode silenci) i la barra s'il·lumina.
- Amb la pantalla bloquejada no sona res, però el temporitzador continua comptant correctament.

## Còpies de seguretat

*Més → Dades → Exportar* genera un JSON amb totes les dades. A l'iPhone s'obre el full de compartir: tria **Desa a Fitxers** o iCloud Drive. *Importar* substitueix totes les dades per les de la còpia.

Si fa més de 14 dies que no exportes, la pantalla d'inici mostra un avís discret.

## Model de dades

Base de dades IndexedDB `forma` (Dexie, esquema v3). Els tipus són a `src/db/types.ts`.

| Taula | Contingut |
|---|---|
| `profile` | Un sol registre (`id: 'me'`): dades personals, fites, factor d'activitat, dèficit, proteïna, increments, descansos, adaptació, descàrrega, fascitis |
| `weighIns` | Data, pes, % de greix, nota, origen (`manual` / `csv`) |
| `exercises` | Catàleg: grup muscular, patró, posició, impacte al peu, compost, disponible, preferència, increment, nota, personalitzada |
| `routines` | Rutina activa amb els dies A/B/C i els exercicis (patró, sèries, rang de repeticions, descans) |
| `sessions` | Entrenaments amb les sèries a dins (pes, reps, feta, esforç), suggeriment de progressió, marques d'adaptació i de descàrrega, checklist |
| `swims` | Sessions de natació (des de l'esquema v2) |
| `schedule` | Canvis puntuals del pla per dia: sessions mogudes, tornada de viatge (v3) |
| `activities` | Activitats extra: pàdel, pitch and putt, caminar (v3) |
| `weeklyReviews` | Revisions setmanals (v3) |
| `meta` | Clau/valor: sessió activa, temporitzador, última exportació, tema, còpia de la data d'inici mentre hi ha dades de prova |
| `bodyMeasurements`, `progressPhotos` | **Preparades per al futur** (mesures corporals i fotos). Encara no tenen pantalla |

El camp `source: 'csv'` de `weighIns` deixa preparada la importació de la bàscula o del rellotge.

### Migracions

- **Esquema (Dexie):** cada versió només afegeix taules (v2: natació; v3: pla setmanal, activitats i revisions). No se n'esborra cap.
- **Dades (`src/db/migrations.ts`):** s'executen en obrir l'app i només afegeixen o completen informació:
  - els exercicis nous del pla;
  - les rutines «Pla personal» (A, B i hotel). L'anterior es conserva, inactiva, per a l'historial;
  - la setmana tipus, les fites mensuals, els modes i el cardio continu.

  Les preferències, les notes i l'historial no es toquen.
