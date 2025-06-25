# 🚀 دليل البدء السريع - النظام المبسط

## 📋 ما تم إنجازه

تم تبسيط نظام الحدود بالكامل ليعتمد على:
- **جدولين أساسيين فقط**: `Merchant` + `Subscription`
- **حدود يومية وشهرية** مدمجة في جدول واحد
- **تجديد تلقائي** للحدود اليومية
- **حساب تلقائي** لكل رد من الذكاء الاصطناعي

---

## ⚡ خطوات التطبيق (5 دقائق)

### 1️⃣ **تطبيق SQL في Supabase:**
```bash
# اذهب إلى: Supabase Dashboard > SQL Editor
# انسخ والصق محتوى هذا الملف:
```
📁 `supabase-simplified-limits.sql`

### 2️⃣ **الملفات المحدثة:**
- ✅ `app/api/chat-supabase/[chatbotId]/route.ts`
- ✅ `app/api/merchant/usage-stats/[merchantId]/route.ts` 
- ✅ `components/UsageStatsCard.tsx`

### 3️⃣ **إضافة الـ Dashboard Component:**
```tsx
// في صفحة dashboard التاجر
import UsageStatsCard from '@/components/UsageStatsCard';

<UsageStatsCard merchantId={merchantId} />
```

---

## 🎯 الحدود الجديدة

| الخطة | حد يومي | حد شهري |
|-------|---------|---------|
| BASIC | 50 | 1,000 |
| STANDARD | 200 | 5,000 |
| PREMIUM | 500 | 15,000 |
| ENTERPRISE | 1,500 | 50,000 |

---

## 🔧 الدوال الجديدة

### فحص الحدود:
```sql
SELECT * FROM check_message_limits('merchant_id');
```

### استهلاك رسالة:
```sql
SELECT * FROM consume_message('merchant_id');
```

### إحصائيات التاجر:
```sql
SELECT * FROM get_merchant_usage_stats('merchant_id');
```

### إعادة تعيين شهرية:
```sql
SELECT * FROM reset_monthly_limits(); -- للجميع
SELECT * FROM reset_monthly_limits('merchant_id'); -- لتاجر واحد
```

---

## 📊 مراقبة سريعة

### عرض جميع الإحصائيات:
```sql
SELECT * FROM "MerchantLimitsView";
```

### التجار القريبون من الحدود:
```sql
SELECT * FROM "MerchantLimitsView" 
WHERE "dailyUsagePercent" > 80 OR "monthlyUsagePercent" > 80;
```

### إحصائيات عامة:
```sql
SELECT 
  COUNT(*) as total_merchants,
  COUNT(CASE WHEN "isActive" = true THEN 1 END) as active_merchants,
  COUNT(CASE WHEN "dailyUsagePercent" > 80 THEN 1 END) as high_daily_usage
FROM "MerchantLimitsView";
```

---

## 🎛️ عمليات إدارية سريعة

### زيادة حد تاجر:
```sql
UPDATE "Subscription" 
SET "dailyMessagesLimit" = 100
WHERE "merchantId" = 'merchant_id';
```

### ترقية خطة:
```sql
UPDATE "Subscription" 
SET 
  "plan" = 'PREMIUM',
  "dailyMessagesLimit" = 500,
  "messagesLimit" = 15000
WHERE "merchantId" = 'merchant_id';
```

### تعطيل تاجر:
```sql
UPDATE "Merchant" 
SET "isActive" = false
WHERE id = 'merchant_id';
```

---

## 🧪 اختبار سريع

### 1. اختبار API:
```bash
curl -X POST /api/chat-supabase/YOUR_CHATBOT_ID \
  -H "Content-Type: application/json" \
  -d '{"message": "مرحبا", "sessionId": "test123"}'
```

### 2. اختبار الإحصائيات:
```bash
curl /api/merchant/usage-stats/YOUR_MERCHANT_ID
```

### 3. اختبار الـ Dashboard:
- افتح صفحة التاجر
- تأكد من ظهور UsageStatsCard
- راقب تحديث الأرقام

---

## ✅ تأكيد نجاح التطبيق

### فحص الجداول:
```sql
-- تأكد من وجود الحقول الجديدة
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Subscription' 
AND column_name LIKE '%daily%';
```

### فحص الدوال:
```sql
-- تأكد من وجود الدوال
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%message%';
```

### فحص البيانات:
```sql
-- تأكد من وجود البيانات
SELECT COUNT(*) FROM "MerchantLimitsView";
```

---

## 🚨 في حالة المشاكل

### مشكلة: الدوال لا تعمل
```sql
-- إعادة إنشاء الدوال
-- انسخ والصق قسم الدوال من supabase-simplified-limits.sql
```

### مشكلة: البيانات غير صحيحة
```sql
-- إعادة تعيين الحدود
UPDATE "Subscription" 
SET 
  "dailyMessagesUsed" = 0,
  "lastDailyReset" = CURRENT_DATE;
```

### مشكلة: الـ API لا يعمل
- تأكد من تحديث ملف Chat API
- تأكد من وجود الدوال في قاعدة البيانات
- راجع Console للأخطاء

---

## 🎊 الخلاصة

**تم بنجاح تبسيط النظام إلى:**
- ✅ جدولين أساسيين فقط
- ✅ حدود يومية وشهرية مدمجة
- ✅ تحديث تلقائي للعدادات
- ✅ إحصائيات شاملة في الـ dashboard
- ✅ إدارة مبسطة من Supabase

**النظام جاهز للاستخدام الفوري! 🚀**

---

## 📞 المساعدة

إذا واجهت أي مشاكل:
1. راجع Console للأخطاء
2. تأكد من تطبيق SQL بشكل صحيح
3. اختبر الدوال في SQL Editor
4. راجع ملف `SIMPLIFIED_SYSTEM_GUIDE.md` للتفاصيل الكاملة 