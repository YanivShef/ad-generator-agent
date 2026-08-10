# subplayer — נגן כתוביות לקולנוע

React player embedded into two claude.ai Artifacts:
- Odyssey default: https://claude.ai/code/artifact/c9bbf086-2798-4497-9b05-2e55ec71e64b
- Spider-Man default: https://claude.ai/code/artifact/d8848b89-728d-46e0-b5ac-53700b906862

`./build.sh` produces `subtitle-player.html` + `spiderman-player.html` (self-contained, subs embedded from `../subs/`).
If `../subs/spiderman.native.ru.srt` exists (found by the daily scan in `.github/workflows/fetch-subs.yml`), it is embedded instead of the machine-translated file.
Republish each HTML to its artifact URL above (Artifact tool, `url` param) to update in place.
