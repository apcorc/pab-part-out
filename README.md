# PABPartOut

Local-first SPA for parting out LEGO sets via Pick a Brick (PaB).

Import a set parts list (`elementId,quantity`), drop one or more PaB order CSVs, track remaining pieces, and export a LEGO-compatible CSV of what you still need.

## Quick start

```bash
npm install
npm run dev
```

## Features

- Multi-project workspace (persisted in `localStorage`)
- Set list import (CSV / JSON)
- Multi-file PaB order CSV import with flexible column names
- Live required / ordered / remaining / surplus diff
- Progress dashboard
- LEGO CSV export of remaining parts
- Part names from Rebrickable `parts.csv` + `elements.csv`
- BrickLink Wanted List XML export (Element → part_num + BrickLink color)
- Light / dark / system theme

## Rebrickable catalog

Place downloads from [Rebrickable](https://rebrickable.com/downloads/) in `rebrickable-db/`:

- `elements.csv` — `element_id,part_num,color_id,…`
- `parts.csv` — `part_num,name,…`

These are served at `/rebrickable-db/*` in dev and copied into the production build. A bundled Rebrickable→BrickLink color map is used for XML color IDs.

## Sample files

- [`list-template.csv`](list-template.csv)
- [`list-template.json`](list-template.json)
- Also served at `/fixtures/`

## Scripts

| Command        | Description        |
|----------------|--------------------|
| `npm run dev`  | Start Vite dev server |
| `npm run build`| Typecheck + production build |
| `npm run preview` | Preview production build |
