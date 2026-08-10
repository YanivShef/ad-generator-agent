import re, sys, os, json

def parse(path):
    raw = open(path, encoding="utf-8-sig").read().replace("\r", "")
    blocks = re.split(r"\n{2,}", raw)
    cues = []
    for b in blocks:
        lines = [l for l in b.split("\n") if l.strip()]
        if not lines:
            continue
        ti = next((i for i, l in enumerate(lines) if "-->" in l), None)
        if ti is None:
            continue
        text = "\n".join(lines[ti + 1:]).strip()
        cues.append({"time": lines[ti].strip(), "text": text})
    return cues

if __name__ == "__main__":
    src, outdir, nchunks = sys.argv[1], sys.argv[2], int(sys.argv[3])
    cues = parse(src)
    os.makedirs(outdir, exist_ok=True)
    per = (len(cues) + nchunks - 1) // nchunks
    for c in range(nchunks):
        chunk = cues[c * per:(c + 1) * per]
        with open(f"{outdir}/chunk{c:02d}.txt", "w", encoding="utf-8") as f:
            for i, cue in enumerate(chunk):
                f.write(f"#{c * per + i + 1}\n{cue['text']}\n\n")
        with open(f"{outdir}/chunk{c:02d}.meta.json", "w", encoding="utf-8") as f:
            json.dump({"start": c * per, "times": [cue["time"] for cue in chunk]}, f)
    print(f"total cues: {len(cues)}, chunks: {nchunks}, per chunk: {per}")
