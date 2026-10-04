# मराठी शिका — Android app (React Native)

Native Android cousin of the web app in `web/`. Same content (stories,
sprints, drills, vocab, grammar), same Duolingo-style design, fully
offline except the optional LLM chat backend.

## Build the APK

In your own terminal (needs network once for downloads):

```sh
cd mobile
./setup.sh
```

This installs JS deps, links the Baloo 2 font, aligns JDK 17, and runs
`assembleDebug`. The APK lands at
`android/app/build/outputs/apk/debug/app-debug.apk` — install with
`adb install` (see script output) or copy it to your phone and tap it.

Later rebuilds: `cd android && ./gradlew assembleDebug`
(or open `mobile/android` in Android Studio and press Run).

## Develop

```sh
npx react-native start        # Metro bundler
npx react-native run-android  # install+launch on emulator/device
```

## Map

- `src/navigation.tsx`, `App.tsx` — store provider + 10-screen stack
- `src/screens/` — Home, Chat, Sprint, Stories, Drills, Grammar, Vocab,
  Progress, Settings, Help
- `src/components/` — StoryArt (generative SVG), Celebrate (confetti)
- `src/theme.ts`, `src/store.tsx`, `src/ui.tsx`, `src/tts.ts`,
  `src/voice.ts`, `src/lib.ts` — foundation (mirrors `web/src/lib/`)
- `src/data/` — content JSON, copied 1:1 from `web/src/data/`
- `assets/fonts/Baloo2.ttf` — bundled Devanagari font (SIL OFL)

## Notes

- Debug builds use the auto-generated debug key — fine for your own
  phone. Play Store release (upload key + `assembleRelease`) is a
  separate step when you want it.
- Mic input uses on-device speech recognition; TTS uses Android's
  engine (install the Marathi voice pack in system Settings for the
  best voice).
