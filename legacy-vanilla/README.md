# Legacy vanilla app (archived)

The original no-build static app (`index.html` + `app.js` + `styles.css` +
`anim.js` / `anim.css` + `data/*.json` + `manifest.json` + `fonts/`), archived
at the React cutover. It is no longer served — the production app is the
React + Vite build in `../web/dist/` (see `../README.md`).

To run this legacy copy for reference:

```sh
cd legacy-vanilla && python3 -m http.server 8099
# open http://localhost:8099/index.html
```
