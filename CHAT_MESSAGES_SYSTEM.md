# نظام رسائل الشات - AI Shop Mate

## نظرة عامة

يتكون نظام رسائل الشات من نوعين منفصلين:
1. **الرسائل القابلة للتخصيص** (Customizable Messages)
2. **الرسائل الإجبارية** (System Generated Messages)

---

## 🎨 الرسائل القابلة للتخصيص

هذه هي الرسائل التي يمكن للتاجر تعديلها عبر صفحة التخصيص:

### ✅ المشمولة في التخصيص:
- **رسالة الترحيب**: أول رسالة يراها العميل
- **نص صندوق الإدخال**: النص الظاهر في حقل الكتابة
- **نص زر الإرسال**: النص على الزر (افتراضي: "إرسال")
- **نص مؤشر الكتابة**: النص أثناء كتابة البوت (افتراضي: "يكتب...")

### 💾 كيفية التخصيص:
1. الذهاب إلى لوحة التحكم
2. الضغط على "تخصيص الشات بوت"
3. اختيار تبويب "💬 النصوص والرسائل"
4. تعديل النصوص المطلوبة
5. حفظ التخصيصات

---

## 🚫 الرسائل الإجبارية (غير قابلة للتخصيص)

هذه هي الرسائل التي يتم إنتاجها تلقائياً بواسطة النظام:

### ❌ غير مشمولة في التخصيص:

#### رسائل الحدود:
- **تجاوز الحد اليومي**: `"تم تجاوز الحد اليومي من الرسائل..."`
- **تجاوز الحد الشهري**: `"تم تجاوز الحد الشهري من الرسائل..."`

#### رسائل النظام:
- **عدم توفر الخدمة**: `"عذراً، الخدمة غير متاحة حالياً"`
- **أخطاء النظام**: رسائل الأخطاء التقنية
- **رسائل الأمان**: تحذيرات الأمان والحماية

### 🤖 النظام المسؤول:

تتم معالجة الرسائل الإجبارية عبر:
- **`lib/language-detector.ts`**: اكتشاف اللغة وإنتاج الرسائل
- **دوال الحدود**: `generateLimitMessage()` و `generateWelcomeMessage()`
- **11 لغة مدعومة**: عربي، إنجليزي، فرنسي، ألماني، هندي، تركي، هولندي، بولندي، صيني، ياباني، إندونيسي

### 🕐 ميزات المنطقة الزمنية:

رسائل تجاوز الحد اليومي تتضمن:
- الوقت المتبقي حتى التجديد
- حساب منتصف الليل المحلي
- دعم أكثر من 40 منطقة زمنية

---

## 🔍 مثال عملي

### رسالة ترحيب (قابلة للتخصيص):
```
✅ "مرحباً بكم في متجر الإلكترونيات! كيف يمكننا خدمتكم؟"
✅ "Welcome to Tech Store! How can we help you today?"
```

### رسالة تجاوز حد (إجبارية):
```
❌ "تم تجاوز الحد اليومي من الرسائل لهذا المتجر حسب اشتراكه (سيتم التجديد خلال 8 ساعة تقريباً). يمكنك المحاولة مرة أخرى غداً. 🕐"

❌ "Daily message limit reached for this store according to its subscription (resets in ~8 hours). Please try again tomorrow. 🕐"
```

---

## 🎯 الهدف من الفصل

### لماذا رسائل الحدود إجبارية؟

1. **الوضوح**: معلومات دقيقة عن حالة الحساب
2. **الشفافية**: عدم تضليل العملاء
3. **التوحيد**: تجربة متسقة عبر جميع المتاجر
4. **الاحترافية**: رسائل رسمية وواضحة
5. **تعدد اللغات**: دعم تلقائي لجميع اللغات

### مزايا الرسائل القابلة للتخصيص:

1. **الهوية التجارية**: تعكس شخصية المتجر
2. **المرونة**: التكيف مع طبيعة العمل
3. **التفاعل**: تحسين تجربة العميل
4. **التسويق**: رسائل ترويجية مناسبة

---

## 📁 الملفات المسؤولة

### التخصيصات:
- `app/customize/[chatbotId]/page.tsx` - صفحة التخصيص
- `app/api/chat-appearance/[chatbotId]/route.ts` - API التخصيصات
- `supabase-chat-customization.sql` - جدول قاعدة البيانات

### الرسائل الإجبارية:
- `lib/language-detector.ts` - النظام الأساسي
- `lib/timezone-detector.ts` - دعم المناطق الزمنية
- `app/api/chat/[chatbotId]/route.ts` - تطبيق النظام

---

## ⚠️ ملاحظات مهمة

1. **لا تحاول تخصيص رسائل الحدود** عبر قاعدة البيانات
2. **استخدم دوماً** `generateLimitMessage()` لرسائل الحدود
3. **احترم اللغة المكتشفة** للمستخدم
4. **تأكد من صحة المنطقة الزمنية** للتاجر
5. **اختبر جميع اللغات** قبل النشر

---

## 🚀 التطوير المستقبلي

### ميزات مقترحة للرسائل القابلة للتخصيص:
- قوالب جاهزة للرسائل
- متغيرات ديناميكية (اسم العميل، الوقت، إلخ)
- رسائل مجدولة حسب الوقت
- ردود سريعة قابلة للتخصيص

### ميزات مقترحة للرسائل الإجبارية:
- دعم المزيد من اللغات
- رسائل صوتية للحدود
- إحصائيات تفصيلية للحدود
- تكامل مع أنظمة الإشعارات

---

**يضمن هذا النظام المزدوج توازناً مثالياً بين المرونة والاحترافية.** 