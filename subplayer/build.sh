#!/bin/bash
# Builds both subtitle-player artifacts from repo sources.
# Usage: ./build.sh  (run from subplayer/; outputs subtitle-player.html + spiderman-player.html)
set -e
cd "$(dirname "$0")"
cp ../subs/odyssey.ru.srt .
# prefer the native Russian file when the daily scan has found one
if [ -f ../subs/spiderman.native.ru.srt ]; then
  cp ../subs/spiderman.native.ru.srt spiderman.ru.srt
else
  cp ../subs/spiderman.ru.srt .
fi
npm install react react-dom esbuild --no-audit --no-fund
npx esbuild App.jsx --bundle --minify --format=iife --define:process.env.NODE_ENV='"production"' \
  --define:__STORE_KEY__='"cinema-subs-v1"' --define:__DEFAULT_MOVIE__='"odyssey"' \
  --loader:.srt=text --outfile=bundle.js
npx esbuild App.jsx --bundle --minify --format=iife --define:process.env.NODE_ENV='"production"' \
  --define:__STORE_KEY__='"cinema-subs-spidey"' --define:__DEFAULT_MOVIE__='"spiderman"' \
  --loader:.srt=text --outfile=bundle-spidey.js
python3 - <<'PYEOF'
shell = open("shell.html", encoding="utf-8").read()
def assemble(bundle_path, out_path, title=None):
    bundle = open(bundle_path, encoding="utf-8").read().replace("</script", "<\\/script")
    html = shell.replace("__BUNDLE__", bundle)
    if title:
        html = html.replace("<title>כתוביות לייב — נגן כתוביות לקולנוע</title>", f"<title>{title}</title>", 1)
    open(out_path, "w", encoding="utf-8").write(html)
    print(out_path, len(html.encode("utf-8")))
assemble("bundle.js", "subtitle-player.html")
assemble("bundle-spidey.js", "spiderman-player.html", "ספיידרמן — כתוביות ברוסית")
PYEOF
