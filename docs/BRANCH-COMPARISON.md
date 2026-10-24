# مقارنة الفروع — قبل أي دمج

| فرع | الدور | ملاحظة |
|-----|--------|--------|
| `main` | الإنتاج الحالي | واجهة monolithic `index.html` (~71KB) + Worker |
| `grok/nexus-v5-unified-development` | عمل NEXUS Ω | SPA معياري + أمان + مراجع + engine stubs + تقارير |
| `feature/nexus-orchestrator-foundation` | Draft PR #2 | أساس المنسّق |
| `feature/nexus-video-engine-v1` | Draft PR #4 | محرك FastAPI |
| `feature/video-engine-free-hosted-plan` | Draft PR #3 | خطة استضافة مجانية |
| `free-first/film-planner` | Draft PR #1 | مخطط أفلام |

## تعارضات متوقعة عند الدمج إلى main
1. **index.html**: main كامل الميزات القديمة (Gemini UI، SRT، scene pack) مقابل SPA محمّل خفيف على فرع grok.
2. **i18n.js**: نسخ مختلفة الحجم بين الفروع.
3. **اختبارات worker**: كانت تفترض HTML المتجانس — حُدّثت على فرع grok لتتوافق مع SPA.

## توصية آمنة
- لا تدمج الكل دفعة واحدة.
- افتح Draft PR من `grok/nexus-v5-unified-development` → `main` للمراجعة.
- انقل ميزات main الناقصة (SRT، scene pack كامل، مساعد Gemini في الواجهة) تدريجيًا إلى الوحدات.
