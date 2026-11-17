# Forma

Quadern personal de pes i gimnàs. És una PWA en català, pensada per al mòbil, que funciona sense connexió. **Totes les dades es guarden només al dispositiu** (IndexedDB), sense servidor ni comptes.

- **Stack:** Vite + React + TypeScript, Tailwind CSS 4, Dexie (IndexedDB), Recharts i vite-plugin-pwa.

## Funcionalitats

| Pantalla | Què hi ha |
|---|---|
| **Inici** | Proper entrenament, entrenaments de la setmana (x/3) i ratxa, pes i progrés cap a 75 i 70 kg, calories i proteïna, avís de pesar-te (més de 7 dies) i de fer còpia (més de 14 dies) |
| **Pes** | Registre ràpid (pes, % de greix, nota), gràfic amb la línia objectiu i les finestres de les fites, IMC, ritme real (regressió de 6 setmanes) comparat amb el necessari, previsió de dates, estat i avís si perds més de l'1 % per setmana durant 3 setmanes |
| **Entrenar** | Dia proposat (A→B→C), sèries amb botons +/− preomplertes amb l'última vegada, temporitzador de descans amb so i vibració, esforç per sèrie, checklist d'escalfament, durada triable de 40 min a 2 h, resum amb volum i rècords. Si tanques l'app, pots continuar l'entrenament |
| **Progrés** | Historial, evolució per exercici (pes màxim, 1RM d'Epley i volum) i constància setmanal |
| **Més** | Perfil, referència calòrica (Mifflin-St Jeor), rutina (generar, substituir, editar), catàleg de màquines, còpia de seguretat, dades de prova i instal·lació |

**Progressió (doble progressió)**
- Si fas totes les sèries al màxim del rang, la sessió següent proposa pujar el pes l'increment de la màquina i tornar al mínim de repeticions.
- Si un dia no arribes al mínim de repeticions, proposa repetir el mateix pes. Si et passa dues sessions seguides, proposa baixar-lo una mica.
- Les 2 primeres setmanes són d'**adaptació** (RIR 3).
- Cada 7 setmanes suggereix una **descàrrega**. Es pot configurar.

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

Base de dades IndexedDB `forma` (Dexie, esquema v1). Els tipus són a `src/db/types.ts`.

| Taula | Contingut |
|---|---|
| `profile` | Un sol registre (`id: 'me'`): dades personals, fites, factor d'activitat, dèficit, proteïna, increments, descansos, adaptació, descàrrega, fascitis |
| `weighIns` | Data, pes, % de greix, nota, origen (`manual` / `csv`) |
| `exercises` | Catàleg: grup muscular, patró, posició, impacte al peu, compost, disponible, preferència, increment, nota, personalitzada |
| `routines` | Rutina activa amb els dies A/B/C i els exercicis (patró, sèries, rang de repeticions, descans) |
| `sessions` | Entrenaments amb les sèries a dins (pes, reps, feta, esforç), suggeriment de progressió, marques d'adaptació i de descàrrega, checklist |
| `meta` | Clau/valor: sessió activa, temporitzador, última exportació, tema, còpia de la data d'inici mentre hi ha dades de prova |
| `bodyMeasurements`, `progressPhotos` | **Preparades per al futur** (mesures corporals i fotos). Encara no tenen pantalla |

El camp `source: 'csv'` de `weighIns` deixa preparada la importació de la bàscula o del rellotge.
