# סוכן מודעות — יניב שפטלביץ'

## מה הפרויקט הזה

סוכן קלוד ליצירת קריאייטיבים לממומן במטא (תמונות סטטיות) עם Kie AI / Nano Banana 2.

## מבנה הפרויקט

```
סוכן מודעות/
├── scripts/
│   └── kie_ai.py        # קליינט ל-Kie AI API
├── ads/                 # כאן נשמרות התמונות שנוצרו
├── .claude/
│   └── commands/
│       └── ad-generator.md  # הסקיל הראשי — /ad-generator
├── .env                 # KIE_AI_API_KEY
├── requirements.txt
└── CLAUDE.md
```

## הגדרה ראשונית

```bash
pip install -r requirements.txt
# ערוך .env והכנס את ה-API key מ-kie.ai
```

## שימוש

פתח קלוד קוד בתיקייה הזו והרץ `/ad-generator`.

הסקיל ינהל שיחה — ישאל על הויזואל, יציע טקסטים, יקבל אישור, ויריץ את הגנרציה.

התמונות נשמרות ל: `ads/<filename>.png`

## תמונות רפרנס של יניב

| מספר | תיאור |
|------|-------|
| photo-1 | פורטרט פרונטלי, חולצה לבנה |
| photo-2 | פול-בודי בחוץ, לייפסטייל |
| photo-3 | לפטופ קולנועי, טכנולוגיה |

## API

- **KIE_AI_API_KEY** — נדרש. ניתן להשיג ב-https://kie.ai/api-key
- מודל: `nano-banana-2`
- Polling interval: 3 שניות, timeout: 300 שניות
