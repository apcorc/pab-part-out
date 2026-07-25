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
- BrickLink XML export UI (gated until Element→BrickLink mapping exists)
- Light / dark / system theme

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
