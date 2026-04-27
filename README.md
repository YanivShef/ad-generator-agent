# סוכן מודעות — יניב שפטלביץ'

סוכן קלוד ליצירת קריאייטיבים לממומן במטא עם Kie AI.

## התקנה — 3 צעדים

**1. התקן תלויות**
```bash
pip install -r requirements.txt
```

**2. צור API key ב-Kie AI**

היכנס ל-https://kie.ai/api-key וצור key חינמי.

**3. הגדר את ה-key**
```bash
cp .env.example .env
# ערוך את .env והכנס את ה-key שלך
```

## שימוש

פתח את התיקייה ב-Claude Code והרץ:
```
/ad-generator
```

הסוכן ישאל שאלות, יציע טקסטים, יקבל אישור — ואז ייצור את התמונה ל-`ads/`.

## מבנה הפרויקט

```
├── scripts/kie_ai.py              # קליינט ל-Kie AI API
├── ads/                           # תמונות שנוצרו (לא עולות לגיט)
├── .claude/commands/
│   └── ad-generator.md            # הגדרת הסוכן
├── .env.example                   # תבנית לkeys
└── requirements.txt
```
