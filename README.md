# मराठी शिका — Marathi Tutor

Offline-first Marathi learning app, built with **React 19 + Vite**
(source in `web/src/`, production bundle in `web/dist/`).

## Run

From a fresh clone (needs Node 18+ and python3 on `PATH`):

```sh
git clone git@github.com:jayambadkar/MarathiApp.git
cd MarathiApp
./start.sh
```

The first run installs dependencies and builds automatically, then serves
the app on the first free port from 8080 upward, opens your browser, and
prints the URL (override with `PORT=8090 ./start.sh`; force a rebuild
with `./start.sh --rebuild`).

On the original machine, double-clicking **`marathi-tutor.sh`** on the
Desktop works too (same behavior, serves `web/dist/`).

## Rebuild after changing `web/src/`

```sh
cd ~/Desktop/Marathi-App/web && npm run build
```

(`npm run dev` for hot-reload development, `npm run lint` for the
Oxlint check.) Requires Node 18+ on `PATH`.

## Modes

1. **मोड / Game Modes** — gallery of every mode + what it is best for.
2. **गप्पा / Chat Tutor** — rule-based offline tutor; optional LLM via Settings
   (`apiBase` + `apiKey`, OpenAI-compatible `/chat/completions` or
   `/responses` — pick the style in Settings; `chat` is the default).
   Per-reply TTS, mic input, history kept in `mt.chat.v1`.
3. **वाचन स्प्रिंट / Reading Sprint** — 30/60/120s timed read over 60 graded
   sprints (L1–L4, 40–140 WPM targets), WPM + comprehension questions.
4. **गोष्टी / Stories** — 62 leveled passages (L1–L4) with generative SVG
   scenes, karaoke read-along with sentence highlighting, TTS + speed,
   EN toggle, word glosses, per-question quizzes, L4 discussion prompts,
   confetti celebration on a perfect score.
5. **सराव / Drills** — adaptive mix: 200-sentence exercise pack
   (MCQ / fill-blank / EN↔MR translate / reorder / match), 40 speaking
   prompts with mic scoring, plus generated vocab drills (incl. listening).
6. **व्याकरण / Grammar** — 7 topics (gender, plurals, postpositions,
   present/past/future verbs, adjectives), tables + 123 quiz items.
7. **शब्दसंग्रह / Vocab Quiz** — 503 words EN↔MR both directions + SRS.
8. **प्रगती / Progress** — XP, streak, accuracy, per-mode stats.
9. **सेटिंग्ज / Settings** — model (default `muse-spark-1.3-contributor`),
   API base/key, API style (chat/responses), read-aloud speed, theme, level, reset.
10. **मदत / Help** — in-app instructions for every part above.

Global extras: floating "🔊 वाचा" reads any selected text aloud
(`SelectionSpeak`, cloud voice — needs internet, Esc stops it);
XP/streak persist across sessions.

## Data

Bundled into the React app under `web/src/data/`:

- `stories.json` — 62 passages L1–L4 (Marathi + English + glosses + quiz)
- `sprints.json` — 60 timed sprints L1–L4 (WPM targets + quiz)
- `speaking.json` — 40 speaking prompts (repeat / answer / describe)
- `drills.json` — 200 sentence exercises (6 types × 10 skills × L1–L4)
- `vocab.json` — 503 words EN↔MR with gender/pos/level/examples
- `grammar.json` — 7 topics with tables + quizzes

Static assets (favicon, icons, `Baloo 2` font, web manifest) live in
`web/public/` and are copied to `web/dist/` by the build.

## Storage keys

- `mt.settings.v1`, `mt.progress.v1`, `mt.srs.v1`, `mt.chat.v1`

## Legacy vanilla app

The original no-build static app is archived untouched in
`legacy-vanilla/` (see its README) for reference. It is not served.

## Smoke check

```sh
cd ~/Desktop/Marathi-App/web && npm run build
PORT=8091 ~/Desktop/marathi-tutor.sh &  # serves web/dist
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8091/
```

Full QA sweep (all 10 modes + story-art stage, zero console errors) with
Playwright — needs `pip install playwright` and a built `web/dist/`:

```sh
python3 web/qa/smoke.py
```

## CI & deploy (free)

- **CI:** `.github/workflows/ci.yml` runs lint + tests + build on every
  push to `main` and every pull request.
- **Deploy:** import the repo at [vercel.com/new](https://vercel.com/new)
  with **Root Directory = `web`** (usually auto-detected), then hit
  Deploy. Every push to `main` redeploys; every PR gets a preview URL.
