# NEXUS VIDEO 5.0 — إعداد من بيئة نظيفة (مجاني)

## المتطلبات
- متصفح حديث (Chrome / Firefox / Safari)
- Node.js ≥ 20 (للاختبارات المحلية فقط)
- حساب GitHub (مجاني) لنشر Pages
- اختياري: Cloudflare حساب مجاني لـ Worker النصوص

## 1) تشغيل الواجهة محليًا
```bash
git clone https://github.com/alm911978-del/nexus-video-studio.git
cd nexus-video-studio
git checkout grok/nexus-v5-unified-development
# افتح index.html عبر خادم ثابت بسيط:
npx --yes serve -l 3000 .
```
ثم افتح http://localhost:3000 واختر «المتابعة محليًا بدون حساب».

## 2) الاختبارات
```bash
node --test tests/*.test.js
node --test worker/test/gateway.test.js
```

## 3) Worker (نصوص فقط — اختياري)
انظر `worker/README.md`. الأسرار عبر:
```bash
cd worker
npx wrangler secret put GEMINI_API_KEY   # أو مزود آخر مجاني ضمن حصته
npx wrangler secret put TURNSTILE_SECRET_KEY
```
لا تضع المفاتيح في الواجهة أو في git.

## 4) محرك الفيديو (اختياري، يحتاج جهازك)
```bash
cd engine
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# يتطلب FFmpeg مثبتًا على النظام
uvicorn app:app --reload
```
بدون مزود مُعدّ: `/generate` يعيد **503** بصراحة.

## ما هو مجاني هنا؟
- GitHub Pages للموقع
- التخزين المحلي في المتصفح
- Cloudflare Workers ضمن الخطة المجانية (حدود يومية)
- مزودو LLM الذين يوفرون حصة مجانية (راجع شروطهم الرسمية)

## ما ليس مجانيًا / غير موصول
- توليد فيديو سينمائي سحابي مدفوع
- GPU مستضاف مدفوع
- أي خدمة تتطلب بطاقة ائتمان — **لن نربطها في هذا المسار**
