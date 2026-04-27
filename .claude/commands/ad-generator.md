---
name: ad-generator-yaniv
description: יוצר קריאייטיבים לממומן במטא (תמונות סטטיות) עם Kie AI / Nano Banana 2. השתמש בסקיל הזה כשהיוזר מדבר על קריאייטיב, מודעה, ממומן, פרסום, תמונה לפרסומת, או מתאר רעיון ויזואלי לפוסט ממומן — גם אם הוא לא אומר "ad-generator" במפורש.
---

## מה הסקיל הזה עושה

מנהל שיחה עם היוזר לתכנון קריאייטיב, מקבל אישור, ואז קורא ישירות ל-Kie AI דרך `scripts/kie_ai.py`.

אין צורך בסקריפט ביניים — הכל קורה inline.

---

## שלב 1 — שאל שאלות תכנון

שאל בשפה טבעית (אפשר הכל בפעם אחת):

1. **הרעיון הויזואלי** — מה קורה בתמונה? (סצנה, אווירה, סגנון)
2. **תמונת רפרנס** — באיזו תמונה של יניב להשתמש?
3. **פורמט** — איזה יחס גובה-רוחב?
   - `1:1` — פיד אינסטגרם / פייסבוק (1080×1080)
   - `9:16` — סטורי / ריל (1080×1920)
   - `4:5` — פיד אנכי (1080×1350)

**אל תשאל על הטקסט** — הצע אתה (ראה שלב 1.5).

## שלב 1.5 — הצע 3 וריאציות טקסט

לפי הרעיון הויזואלי, הצע 3 אופציות טקסט שונות. כל אחת יכולה להיות שונה במבנה — אין חובה ל-3 שורות קבועות. הטקסט צריך לדבר ישירות לכאב או לשאיפה של יזמים ופרילנסרים ישראלים.

**דוגמה לפורמטים אפשריים:**
- שורה אחת גדולה בלבד (אם המסר חד מספיק)
- כותרת + טאגליין (ללא שורה אמצעית)
- כותרת + תת-כותרת + טאגליין (הפורמט המלא)

הצג ככה:

```
✏️ 3 אופציות טקסט:

אופציה א:
  [שורה 1]
  [שורה 2 — אם יש]
  [שורה 3 — אם יש]

אופציה ב:
  ...

אופציה ג:
  ...
```

שאל: "איזו אופציה? או רוצה שאשלב / אשנה?"

---

תמונות רפרנס זמינות:
| מספר | URL | מתי |
|------|-----|-----|
| `1` | `https://lh3.googleusercontent.com/d/1o08gCz8vObB2XZlR0_guE9wSntWpUg8D=s1600` | פורטרט פרונטלי, חולצה לבנה — חשיפה, אישי |
| `2` | `https://lh3.googleusercontent.com/d/1lbyyj8r53kXPuGKHu1WCl-o2zifcBIW8=s1600` | פול-בודי בחוץ — לייפסטייל, חמימות |
| `3` | `https://lh3.googleusercontent.com/d/1L4IvC9nJ5-nyAZf9wyW-wZZiiP69xZwu=s1600` | לפטופ קולנועי — טכנולוגיה, עוצמה |

אם היוזר לא בטוח — הצע לפי הרעיון הויזואלי.

---

## שלב 2 — הצג תוכנית לאישור

```
📋 תוכנית הקריאייטיב:

🎬 ויזואל: [תיאור הסצנה]
📸 רפרנס: photo-[1/2/3]

📝 טקסט על התמונה:
  שורה 1 (לבן גדול): "[כותרת]"
  שורה 2 (זהוב): "[תת-כותרת]"
  שורה 3 (לבן קטן): "[טאגליין]"

📐 פורמט: [1:1 / 9:16 / 4:5]

🤖 פרומפט ל-Kie AI:
[הפרומפט המלא באנגלית — ראה פורמט למטה]
```

שאל **"מאשר?"** — אל תריץ לפני אישור.

---

## שלב 3 — הרץ אחרי אישור

```bash
python3 - <<'EOF'
import sys
sys.path.insert(0, 'scripts')
from kie_ai import KieAI
import requests
from PIL import Image
import io
from pathlib import Path

client = KieAI()
urls = client.generate(
    prompt="<PROMPT>",
    aspect_ratio="1:1",
    resolution="1K",
    image_input=["<REFERENCE_URL>"],
)

resp = requests.get(urls[0], stream=True)
img = Image.open(io.BytesIO(resp.content)).convert("RGB")
img = img.resize((1080, 1080), Image.LANCZOS)

out = Path("ads/<OUTPUT_FILENAME>.png")
out.parent.mkdir(parents=True, exist_ok=True)
img.save(str(out), "PNG")
print(f"Saved: {out}")
EOF
```

החלף: `<PROMPT>`, `<REFERENCE_URL>`, `<OUTPUT_FILENAME>`.

---

## פורמט הפרומפט

הפרומפט באנגלית. הטקסט העברי מוטמע בתוכו:

```
[תיאור הסצנה הויזואלית, סגנון, תאורה, קומפוזיציה, photorealistic/cinematic/etc.]
At the bottom of the image: bold white Hebrew text '[שורה 1].' on the first line,
golden Hebrew text '[שורה 2]' below it,
and small white Hebrew text '[שורה 3]' at the very bottom.
```

---

## שלב 4 — אחרי הגנרציה

- דווח: `ads/<filename>.png`
- הצע גרסת סטורי עם `aspect_ratio="9:16"`
- הצע וריאציה עם רפרנס אחר או שינוי בפרומפט
