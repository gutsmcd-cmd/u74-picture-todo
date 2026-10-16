# 絵でやること / Picture To-Do

Universe 74 app: paste or type a to-do list (one task per line, bullets and numbers are cleaned up) and each task becomes a picture card with a generated pink-and-green illustration. Tap a card to tick it off.

- Images: Pollinations free classic API (`image.pollinations.ai/prompt/...`), no key. One request at a time; images are cached as blobs in IndexedDB so they never regenerate on reload.
- Japanese tasks are translated to English for the image prompt with MyMemory (free, keyless) after a small built-in dictionary; translations are cached too.
- Offline / API failure: friendly emoji card.
- Free, no ads, no login. Data stays on your device.

`npm install && npm run build`. Demo list: `?demo` (`&lang=en`).
