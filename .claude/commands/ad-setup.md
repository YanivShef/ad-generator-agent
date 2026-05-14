---
name: ad-setup
description: הגדרת הסוכן — ניהול תמונות רפרנס, בדיקת API key, וקונפיגורציה כללית. השתמש בסקיל הזה כשהיוזר רוצה להוסיף/להסיר תמונות רפרנס, לבדוק שהסביבה עובדת, או להגדיר את הסוכן מחדש.
---

## מה הסקיל הזה עושה

מנהל את קונפיגורציית הסוכן — בעיקר תמונות רפרנס — ובודק שהסביבה מוכנה לשימוש.

---

## שלב 1 — קרא את הקונפיג הנוכחי

קרא את `.claude/ad-config.json`.

**אם יש תמונות מוגדרות כבר (`reference_photos` לא ריק):**

הצג את הרשימה:

```
📸 תמונות רפרנס קיימות:

| ID | תיאור |
|----|-------|
| 1  | ...   |
| 2  | ...   |

רוצה להחליף את התמונות, או להוסיף/לערוך?

א) החלף הכל (מחיקה ובניה מחדש)
ב) הוסף תמונה חדשה
ג) הסר תמונה
ד) עדכן תיאור
ה) בדוק שהתמונות נגישות (HTTP check)
ו) צא
```

**אם אין תמונות (רשימה ריקה או קובץ לא קיים):**

```
📸 אין תמונות רפרנס מוגדרות עדיין.

בוא נוסיף את הראשונה — תן לי URL של תמונה שלך (Google Drive, Dropbox, כל קישור ציבורי ישיר).
```

עבור מיד לפעולה א (הוסף תמונה).

---

## פעולה א — הוסף תמונת רפרנס

שאל:
1. **URL של התמונה** — קישור ישיר לתמונה
2. **תיאור קצר** — מה רואים בתמונה, מתי להשתמש בה

בדוק שה-URL נגיש לפני השמירה (ראה בדיקת HTTP למטה).

הצג תצוגה מקדימה:
```
תמונה חדשה:
  ID: [מספר הבא ברצף]
  URL: [url]
  תיאור: [תיאור]
  נגישות: ✅ / ❌

מאשר?
```

אחרי אישור — כתוב ל-`.claude/ad-config.json`:

```bash
python3 - <<'EOF'
import json
from pathlib import Path

config_path = Path(".claude/ad-config.json")
config = json.loads(config_path.read_text()) if config_path.exists() else {"reference_photos": []}

existing_ids = [int(p["id"]) for p in config["reference_photos"] if p["id"].isdigit()]
next_id = str(max(existing_ids) + 1) if existing_ids else "1"

config["reference_photos"].append({
    "id": next_id,
    "url": "<URL>",
    "description": "<DESCRIPTION>"
})

config_path.write_text(json.dumps(config, ensure_ascii=False, indent=2))
print(f"נוספה תמונה {next_id}")
EOF
```

שאל אם להוסיף עוד תמונה.

---

## פעולה ב — החלף הכל

```
⚠️ זה ימחק את כל התמונות הקיימות ויתחיל מחדש. בטוח?
```

אחרי אישור — כתוב `{"reference_photos": []}` ל-`.claude/ad-config.json`, ואז עבור לפעולה א.

---

## פעולה ג — הסר תמונת רפרנס

שאל: איזה ID להסיר?

```bash
python3 - <<'EOF'
import json
from pathlib import Path

config_path = Path(".claude/ad-config.json")
config = json.loads(config_path.read_text())

remove_id = "<ID>"
before = len(config["reference_photos"])
config["reference_photos"] = [p for p in config["reference_photos"] if p["id"] != remove_id]

config_path.write_text(json.dumps(config, ensure_ascii=False, indent=2))
print(f"הוסרו {before - len(config['reference_photos'])} תמונות")
EOF
```

---

## פעולה ד — עדכן תיאור

שאל: איזה ID לעדכן, ומה התיאור החדש?

```bash
python3 - <<'EOF'
import json
from pathlib import Path

config_path = Path(".claude/ad-config.json")
config = json.loads(config_path.read_text())

for p in config["reference_photos"]:
    if p["id"] == "<ID>":
        p["description"] = "<NEW_DESCRIPTION>"
        break

config_path.write_text(json.dumps(config, ensure_ascii=False, indent=2))
print("עודכן")
EOF
```

---

## פעולה ה — בדוק נגישות תמונות (HTTP check)

בודק HEAD request לכל URL — לא מוריד, רק מוודא שהשרת מחזיר 200.

```bash
python3 - <<'EOF'
import json, requests
from pathlib import Path

config = json.loads(Path(".claude/ad-config.json").read_text())
photos = config.get("reference_photos", [])

if not photos:
    print("אין תמונות לבדוק.")
else:
    for p in photos:
        try:
            r = requests.head(p["url"], timeout=8, allow_redirects=True)
            status = "✅" if r.status_code == 200 else f"❌ ({r.status_code})"
        except Exception as e:
            status = f"❌ ({e})"
        print(f"  [{p['id']}] {status}  {p['description']}")
EOF
```

---

## בדיקת נגישות URL (inline, לפני שמירה)

כשמוסיפים תמונה חדשה — הרץ את הבדיקה הזו לפני הצגת ה"מאשר?":

```bash
python3 - <<'EOF'
import requests
url = "<URL>"
try:
    r = requests.head(url, timeout=8, allow_redirects=True)
    print("✅" if r.status_code == 200 else f"❌ status {r.status_code}")
except Exception as e:
    print(f"❌ {e}")
EOF
```

אם ❌ — הזהר את היוזר שה-URL לא נגיש, ושאל אם להמשיך בכל זאת.

---

## סיום

אחרי כל פעולה — הצג את מצב הקונפיג המעודכן ושאל אם יש עוד מה לשנות.
