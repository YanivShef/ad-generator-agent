# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## מה הפרויקט הזה

סוכן קלוד ליצירת קריאייטיבים לממומן במטא (תמונות סטטיות) עם Kie AI.

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env
# Insert KIE_AI_API_KEY from https://kie.ai/api-key
```

Test the API connection:
```bash
python3 scripts/kie_ai.py --test
```

Generate a single image from the CLI:
```bash
python3 scripts/kie_ai.py "your prompt here" output.png
```

## Architecture

### Two-skill system

| Skill | File | Purpose |
|-------|------|---------|
| `/ad-setup` | `.claude/commands/ad-setup.md` | Manage reference photos in `.claude/ad-config.json` |
| `/ad-generator` | `.claude/commands/ad-generator.md` | Conversational creative planning → generate image |

**Always run `/ad-setup` first** if `.claude/ad-config.json` has no `reference_photos`. The generator skill checks this at startup and can also continue without a reference (text-to-image mode).

### Config file: `.claude/ad-config.json`

```json
{
  "reference_photos": [
    { "id": "1", "url": "https://...", "description": "..." }
  ]
}
```

This is the **single source of truth** for reference photos. The skill reads it at runtime. When photos change, update only this file — the hardcoded table inside `ad-generator.md` is a display aid and must be kept in sync manually.

### `scripts/kie_ai.py` — KieAI client

`KieAI` class exposes three main methods:
- `generate(prompt, aspect_ratio, resolution, image_input, model)` → list of result URLs (creates task + polls)
- `download(url, output_path)` → saves file locally
- `create_task` / `get_status` / `wait_for_result` — lower-level primitives

The client reads `KIE_AI_API_KEY` from `.env` via `python-dotenv`. Retries up to 5× on connection errors with linear backoff. The `model` parameter is passed through to the API — do not hardcode it in the client.

### Generation flow (ad-generator skill)

1. Read `.claude/ad-config.json` — warn if empty, offer to continue without a reference
2. Ask: visual concept, which reference photo (if any), aspect ratio (1:1 / 9:16 / 4:5), model
3. Propose 3 text copy variants (Hebrew) — **never ask the user to write copy**; copy can be 1–3 lines
4. Show full plan + English prompt for approval
5. Run inline Python: `KieAI().generate(...)` → download → resize with Pillow → save to `ads/<filename>.png`
6. Offer story format (9:16) and a variant with a different reference or prompt

### Supported models

| Model | Use case |
|-------|----------|
| `gpt-image-2-image-to-image` | Default when a reference photo is selected |
| `gpt-image-2-text-to-image` | Default when no reference is used |
| `nano-banana-2` | Faster, lower quality — use when speed matters |

Model variant for GPT Image 2 is determined automatically by whether `image_input` is provided.

### Prompt format

Prompts are English with Hebrew text embedded literally. Text copy is flexible (1–3 lines):

```
[visual scene description, style, lighting, composition]
At the bottom of the image: bold white Hebrew text '[שורה 1].' on the first line,
golden Hebrew text '[שורה 2]' below it,
and small white Hebrew text '[שורה 3]' at the very bottom.
```

Omit lines 2 and 3 when the copy is a single headline or two-line variant. Text copy targets Israeli entrepreneurs and freelancers — speak to their pain or aspiration.

## Output

Generated images are saved to `ads/` (gitignored). Pillow resizes to the correct pixel dimensions after download:

| Aspect ratio | Resolution |
|--------------|------------|
| 1:1 | 1080×1080 |
| 9:16 | 1080×1920 |
| 4:5 | 1080×1350 |

## API

- Endpoint: `https://api.kie.ai/api/v1/jobs`
- Poll interval: 3s, timeout: 300s
- Image input key: `image_input` for nano-banana-2; `input_urls` for gpt-image-2-image-to-image
