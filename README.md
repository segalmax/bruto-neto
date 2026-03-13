# מחשבון ברוטו-נטו ישראל

Israeli gross-to-net salary calculator (2026 rules).

## Project structure

```
bruto-neto/
├── index.html          # Entry point (HTML only)
├── css/
│   └── main.css        # Styles
├── src/
│   ├── calc.js         # Tax/insurance constants and pure math
│   ├── chart.js        # Chart data, buildChart, fold markers
│   └── app.js          # DOM wiring, renderHoverDetails, update (entry)
├── test/
│   ├── math.js         # Unit tests for calc
│   └── structure.js    # Regression tests (HTML/CSS/JS invariants)
├── package.json
└── README.md
```

## Commands

- `npm test` — run math + structure tests

## Hosting

Static site; works on GitHub Pages. Open `index.html` locally or deploy the repo root.
