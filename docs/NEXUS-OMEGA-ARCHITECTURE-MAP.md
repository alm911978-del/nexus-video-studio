# NEXUS VIDEO 5.0 — خريطة المعمارية (main)

## نقاط الدخول
| مسار | الدور |
|------|--------|
| `index.html` | تطبيق الواجهة الكامل (RTL عربي) |
| `i18n.js` | ترجمات + طبقة بصرية/تشخيص |
| `worker/src/index.js` | بوابة LLM آمنة (Cloudflare Worker) |
| `assets/*` | هوية بصرية |

## تدفق البيانات
```
المستخدم
  ├─ وضع محلي → localStorage (مفتاح لكل جلسة) → مشاريع/شخصيات/مشاهد
  ├─ تصدير/استيراد JSON → validBackup() → استبدال آمن أو رفض
  ├─ وسائط → createObjectURL (محلي فقط، بلا رفع)
  ├─ scene pack → حزمة برومبت محلية (generationStatus: prompt_package_only_not_generated)
  └─ توليد نص → Turnstile + POST /api/generate → Worker
        ├─ رفض: أصل غير مسموح / JSON تالف / action غير مدعوم / payload كبير
        ├─ 503: سر المزود أو RATE_LIMITS غير مُعد
        ├─ 429: حد يومي
        └─ 200: نص من المزود (Gemini/… حسب الإعداد) — ليس فيديو
```

## عقد المدخلات/المخرجات (Worker)
- **مدخل:** `{ action, prompt, turnstileToken?, provider? }`
- **مخرج نجاح:** `{ ok, model, text, ... }` بدون أسرار
- **أخطاء:** 400 / 403 / 413 / 415 / 429 / 503 مع رسالة

## ما ليس جزءًا من main
- FastAPI / محرك فيديو GPU
- توليد صور سحابي
- تخزين مشاريع سحابي إلزامي
