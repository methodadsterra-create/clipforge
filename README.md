<p align="center"><img src="icon.svg" width="96" alt="ClipForge logo"></p>

# ClipForge

Free, open-source short-video maker that runs entirely in the browser, even on a 2 GB phone. No account, no server, no payment.

Stack: plain HTML, CSS and JavaScript. No build step, no dependencies.

## Project structure

```
clipforge/
  index.html      App page
  style.css       Styles
  app.js          Video maker (Canvas + MediaRecorder) and 24h storage
  sw.js           Offline cache (PWA)
  manifest.json   Install-to-home-screen settings
  icon.svg        Logo (play button on an anvil)
  favicon.svg/.ico/-32.png, apple-touch-icon.png, icon-192/512.png, icon-maskable-512.png
                  Favicons and app icons
  LICENSE         MIT
```

## AI helper (optional, free)

Paste your own free Gemini API key (aistudio.google.com/apikey). It is stored only in your browser. Then:

- **Reference video to fresh script:** pick a short clip (up to 18 MB). Gemini watches it, explains why it works, and writes a new original script.
- **Topic to script:** no video needed, just type a topic.
- **AI voiceover:** tick the box and the script is read aloud with a Gemini voice.

Model names are constants at the top of the AI section in `app.js` (`TEXT_MODEL`, `TTS_MODEL`) if Google renames them. Only the reference video and text are sent to Google, with your own key.

## How it works

- You write a script. Optionally upload a voiceover (made with any free text-to-speech tool), a background photo or clip, and music.
- Word-by-word subtitles are drawn on a canvas and recorded straight to a video file with the phone's own encoder, so memory use stays low.
- Videos are kept only in the phone's browser storage. Anything not downloaded within 24 hours is deleted automatically. There is no backup and no server.

## Deploy on GitHub Pages

Repo Settings, then Pages, then "Deploy from a branch", branch `main`, folder `/ (root)`.

## Contributing

Ideas welcome: more subtitle styles, more languages for the interface, offline voice packs, stock-footage search.
