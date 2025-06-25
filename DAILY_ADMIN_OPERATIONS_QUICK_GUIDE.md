# ⚡ دليل العمليات الإدارية اليومية السريعة

## 🕐 مهام الـ 5 دقائق اليومية

### 1️⃣ **فحص التجار القريبين من الحد (أولوية عالية)**
```sql
-- نفذ هذا في Supabase > SQL Editor
SELECT 
  m."businessName" as "اسم المتجر",
  m."email" as "البريد الإلكتروني",
  s."messagesUsed" as "الرسائل المستخدمة",
  s."messagesLimit" as "الحد الأقصى",
  ROUND((s."messagesUsed"::decimal / s."messagesLimit") * 100, 2) as "نسبة الاستخدام %"
FROM "Merchant" m
JOIN "Subscription" s ON s."merchantId" = m.id
WHERE (s."messagesUsed"::decimal / s."messagesLimit") > 0.8
ORDER BY "نسبة الاستخدام %" DESC;
```

### 2️⃣ **فحص الاشتراكات المنتهية أو القريبة من الانتهاء**
```sql
SELECT 
  m."businessName" as "اسم المتجر",
  s."status" as "حالة الاشتراك",
  s."endDate" as "تاريخ الانتهاء",
  CASE 
    WHEN s."endDate" < NOW() THEN 'منتهي'
    WHEN s."endDate" < NOW() + INTERVAL '7 days' THEN 'ينتهي خلال أسبوع'
    ELSE 'نشط'
  END as "الحالة"
FROM "Merchant" m
JOIN "Subscription" s ON s."merchantId" = m.id
WHERE s."endDate" < NOW() + INTERVAL '7 days'
ORDER BY s."endDate" ASC;
```

### 3️⃣ **فحص الحسابات المعطلة**
```sql
SELECT 
  "businessName" as "اسم المتجر",
  "email" as "البريد الإلكتروني",
  "adminNotes" as "ملاحظات إدارية",
  "updatedAt" as "آخر تحديث"
FROM "Merchant" 
WHERE "isActive" = false
ORDER BY "updatedAt" DESC;
```

---

## 🚨 العمليات الطارئة

### ⚡ **تعطيل تاجر فوراً**
```sql
-- استبدل 'merchant_id_here' بمعرف التاجر الحقيقي
UPDATE "Merchant" 
SET 
  "isActive" = false,
  "adminNotes" = COALESCE("adminNotes", '') || ' | تم تعطيله في ' || NOW() || ' - [اكتب السبب هنا]',
  "updatedAt" = NOW()
WHERE id = 'merchant_id_here';
```

### ✅ **إعادة تفعيل تاجر**
```sql
UPDATE "Merchant" 
SET 
  "isActive" = true,
  "adminNotes" = COALESCE("adminNotes", '') || ' | تم إعادة تفعيله في ' || NOW(),
  "updatedAt" = NOW()
WHERE id = 'merchant_id_here';
```

### 🔄 **إعادة تعيين عداد الرسائل لتاجر**
```sql
UPDATE "Subscription" 
SET 
  "messagesUsed" = 0,
  "lastReset" = NOW(),
  "updatedAt" = NOW()
WHERE "merchantId" = 'merchant_id_here';
```

### 📈 **ترقية طارئة لحد الرسائل**
```sql
UPDATE "Subscription" 
SET 
  "messagesLimit" = "messagesLimit" + 2000,
  "updatedAt" = NOW()
WHERE "merchantId" = 'merchant_id_here';

-- إضافة ملاحظة
UPDATE "Merchant" 
SET "adminNotes" = COALESCE("adminNotes", '') || ' | حد إضافي 2000 رسالة - ' || NOW()
WHERE id = 'merchant_id_here';
```

---

## 📊 لوحة المراقبة السريعة

### 🎯 **إحصائيات عامة (نظرة سريعة)**
```sql
SELECT 
  'إجمالي التجار' as "المؤشر",
  COUNT(*)::text as "القيمة"
FROM "Merchant"

UNION ALL

SELECT 
  'التجار النشطون',
  COUNT(*)::text
FROM "Merchant" 
WHERE "isActive" = true

UNION ALL

SELECT 
  'الاشتراكات النشطة',
  COUNT(*)::text
FROM "Subscription"
WHERE "status" = 'ACTIVE'

UNION ALL

SELECT 
  'التجار القريبون من الحد',
  COUNT(*)::text
FROM "Merchant" m
JOIN "Subscription" s ON s."merchantId" = m.id
WHERE (s."messagesUsed"::decimal / s."messagesLimit") > 0.8

UNION ALL

SELECT 
  'اشتراكات تنتهي خلال أسبوع',
  COUNT(*)::text
FROM "Subscription"
WHERE "endDate" < NOW() + INTERVAL '7 days' AND "endDate" > NOW();
```

### 📈 **أكثر التجار نشاطاً اليوم**
```sql
SELECT 
  m."businessName" as "اسم المتجر",
  COALESCE(d."messagesCount", 0) as "رسائل اليوم",
  COALESCE(d."uniqueSessionsCount", 0) as "جلسات اليوم"
FROM "Merchant" m
LEFT JOIN "DailyUsageStats" d ON d."merchantId" = m.id AND d."date" = CURRENT_DATE
WHERE m."isActive" = true
ORDER BY COALESCE(d."messagesCount", 0) DESC
LIMIT 10;
```

---

## 🎛️ عمليات سريعة بنقرة واحدة

### 🔄 **إعادة تعيين شهرية لجميع الحسابات**
```sql
-- يُنفذ في بداية كل شهر
UPDATE "Subscription" 
SET 
  "messagesUsed" = 0,
  "lastReset" = NOW(),
  "updatedAt" = NOW()
WHERE "status" IN ('ACTIVE', 'TRIAL')
  AND DATE_TRUNC('month', "lastReset") < DATE_TRUNC('month', NOW());
```

### 📋 **إنشاء تقرير سريع للإدارة**
```sql
-- إحصائيات شاملة للتقرير اليومي
SELECT 
  DATE(NOW()) as "تاريخ التقرير",
  COUNT(DISTINCT m.id) as "إجمالي التجار",
  COUNT(DISTINCT CASE WHEN m."isActive" = true THEN m.id END) as "التجار النشطون",
  COUNT(DISTINCT CASE WHEN s."status" = 'ACTIVE' THEN s.id END) as "الاشتراكات النشطة",
  COALESCE(SUM(d."messagesCount"), 0) as "إجمالي رسائل اليوم",
  COALESCE(SUM(d."uniqueSessionsCount"), 0) as "إجمالي جلسات اليوم",
  COUNT(DISTINCT CASE WHEN (s."messagesUsed"::decimal / s."messagesLimit") > 0.8 THEN m.id END) as "قريبون من الحد"
FROM "Merchant" m
LEFT JOIN "Subscription" s ON s."merchantId" = m.id
LEFT JOIN "DailyUsageStats" d ON d."merchantId" = m.id AND d."date" = CURRENT_DATE;
```

---

## 🔍 البحث السريع

### 🔎 **البحث عن تاجر بالإيميل**
```sql
SELECT 
  m.id,
  m."businessName",
  m."email",
  m."isActive",
  s."plan",
  s."status",
  s."messagesUsed",
  s."messagesLimit"
FROM "Merchant" m
LEFT JOIN "Subscription" s ON s."merchantId" = m.id
WHERE m."email" ILIKE '%البريد_الإلكتروني_هنا%';
```

### 🏢 **البحث عن تاجر باسم المتجر**
```sql
SELECT 
  m.id,
  m."businessName",
  m."email",
  m."isActive",
  s."plan",
  s."messagesUsed",
  s."messagesLimit"
FROM "Merchant" m
LEFT JOIN "Subscription" s ON s."merchantId" = m.id
WHERE m."businessName" ILIKE '%اسم_المتجر_هنا%';
```

---

## ⚡ شيتات العمل السريعة

### 📝 **قالب ملاحظة إدارية**
```sql
UPDATE "Merchant" 
SET "adminNotes" = COALESCE("adminNotes", '') || 
  ' | ' || NOW()::date || ': [اكتب ملاحظتك هنا]'
WHERE id = 'merchant_id_here';
```

### 🎯 **قوالب خطط مختلفة**

#### 🥉 **خطة BASIC:**
```sql
UPDATE "Subscription" 
SET 
  "plan" = 'BASIC',
  "messagesLimit" = 1000,
  "status" = 'ACTIVE'
WHERE "merchantId" = 'merchant_id_here';
```

#### 🥈 **خطة STANDARD:**
```sql
UPDATE "Subscription" 
SET 
  "plan" = 'STANDARD',
  "messagesLimit" = 5000,
  "status" = 'ACTIVE'
WHERE "merchantId" = 'merchant_id_here';
```

#### 🥇 **خطة PREMIUM:**
```sql
UPDATE "Subscription" 
SET 
  "plan" = 'PREMIUM',
  "messagesLimit" = 15000,
  "status" = 'ACTIVE'
WHERE "merchantId" = 'merchant_id_here';
```

#### 💎 **خطة ENTERPRISE:**
```sql
UPDATE "Subscription" 
SET 
  "plan" = 'ENTERPRISE',
  "messagesLimit" = 50000,
  "status" = 'ACTIVE'
WHERE "merchantId" = 'merchant_id_here';
```

---

## 🚀 وصول سريع من الهاتف

### 📱 **تطبيق Supabase Mobile:**
1. حمل التطبيق من App Store/Google Play
2. سجل دخول بحساب Supabase
3. اختر المشروع
4. اذهب إلى SQL Editor
5. احفظ الاستعلامات المفضلة

### 🔔 **تنبيهات سريعة:**
- **أضف webhook** للتنبيه عند اقتراب أي تاجر من حد الرسائل
- **فعل Real-time** لمراقبة النشاط الفوري
- **استخدم Database Functions** للتنبيهات التلقائية

---

## 💡 نصائح للإدارة السريعة

### ✅ **أسرع طريقة للعمل:**
1. **احفظ الاستعلامات** في Supabase > SQL Editor
2. **أنشئ مجلدات منظمة** للاستعلامات المختلفة
3. **استخدم التطبيق المحمول** للمراقبة السريعة
4. **فعل التنبيهات** للحالات الطارئة

### 🎯 **أولويات المراقبة:**
1. **التجار القريبون من الحد** - يومياً
2. **الاشتراكات المنتهية** - يومياً  
3. **الحسابات المعطلة** - أسبوعياً
4. **الإحصائيات العامة** - أسبوعياً

### ⚡ **في حالة الطوارئ:**
1. **تعطيل فوري** للحسابات المشبوهة
2. **زيادة الحدود** للعملاء المميزين
3. **إعادة تعيين العدادات** عند الحاجة
4. **تواصل مع العملاء** قبل انتهاء اشتراكاتهم

---

## 🎊 الخلاصة

### ⚡ **في 5 دقائق يومياً يمكنك:**
✅ مراقبة صحة النظام بالكامل  
✅ اكتشاف المشاكل قبل حدوثها  
✅ التدخل السريع في الحالات الطارئة  
✅ الحفاظ على رضا العملاء  

### 🎛️ **أدوات التحكم السريع:**
- **💻 Supabase Dashboard** - للعمليات المكتبية
- **📱 تطبيق الهاتف** - للمراقبة المحمولة  
- **🔔 التنبيهات** - للتدخل الفوري
- **📊 التقارير** - لاتخاذ القرارات

**إدارة احترافية في أقل وقت ممكن! ⚡** 