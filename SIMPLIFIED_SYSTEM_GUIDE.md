# 🚀 دليل النظام المبسط - جدولين فقط!

## 📋 ملخص النظام الجديد

النظام الآن يعتمد على **جدولين أساسيين فقط**:
- 🏢 **Merchant** - بيانات التجار
- 💳 **Subscription** - الاشتراكات والحدود (يومية وشهرية)

## 🎯 الميزات الجديدة

### ✅ **حدود يومية وشهرية:**
- **حد يومي**: يتم إعادة تعيينه تلقائياً كل يوم
- **حد شهري**: يتم إعادة تعيينه شهرياً بواسطة المدير
- **استهلاك تلقائي**: كل رد من الذكاء الاصطناعي يحسب من الحدود

### ✅ **إدارة مبسطة:**
- دوال SQL جاهزة للاستخدام
- view واحد لعرض جميع الإحصائيات
- API endpoints محدثة

---

## 🗄️ بنية الجداول الجديدة

### 1️⃣ **جدول Subscription المحدث:**

```sql
-- الحقول الجديدة المضافة:
"dailyMessagesLimit"     INTEGER DEFAULT 50     -- الحد اليومي للرسائل
"dailyMessagesUsed"      INTEGER DEFAULT 0      -- الرسائل المستخدمة اليوم
"lastDailyReset"         DATE DEFAULT CURRENT_DATE -- آخر إعادة تعيين يومية

-- الحقول الموجودة مسبقاً:
"messagesLimit"          INTEGER                 -- الحد الشهري
"messagesUsed"           INTEGER DEFAULT 0       -- الرسائل المستخدمة شهرياً
"plan"                   SubscriptionPlan        -- BASIC, STANDARD, PREMIUM, ENTERPRISE
"status"                 SubscriptionStatus      -- TRIAL, ACTIVE, CANCELLED, EXPIRED
```

### 2️⃣ **الحدود حسب الخطة:**

| الخطة | حد يومي | حد شهري |
|-------|---------|---------|
| BASIC | 50 | 1,000 |
| STANDARD | 200 | 5,000 |
| PREMIUM | 500 | 15,000 |
| ENTERPRISE | 1,500 | 50,000 |

---

## 🔧 الدوال الجديدة

### 1️⃣ **فحص الحدود:**
```sql
SELECT * FROM check_message_limits('merchant_id_here');
```
**النتيجة:**
- `can_send`: هل يمكن إرسال رسالة؟
- `daily_remaining`: الرسائل المتبقية اليوم
- `monthly_remaining`: الرسائل المتبقية شهرياً
- `reason`: سبب المنع (إن وجد)

### 2️⃣ **استهلاك رسالة:**
```sql
SELECT * FROM consume_message('merchant_id_here');
```
**النتيجة:**
- `success`: هل تم الاستهلاك بنجاح؟
- `daily_remaining`: المتبقي يومياً
- `monthly_remaining`: المتبقي شهرياً
- `message`: رسالة النتيجة

### 3️⃣ **إحصائيات التاجر:**
```sql
SELECT * FROM get_merchant_usage_stats('merchant_id_here');
```
**النتيجة:**
- `daily_used`, `daily_limit`, `daily_percentage`
- `monthly_used`, `monthly_limit`, `monthly_percentage`
- `plan`, `status`, `days_until_reset`

### 4️⃣ **إعادة تعيين شهرية (للمدير):**
```sql
-- لتاجر واحد
SELECT * FROM reset_monthly_limits('merchant_id_here');

-- لجميع التجار النشطين
SELECT * FROM reset_monthly_limits();
```

---

## 🎛️ الإدارة من Supabase

### ⚡ **عمليات سريعة:**

#### 📊 **مراقبة الحدود:**
```sql
-- التجار القريبون من الحدود
SELECT * FROM "MerchantLimitsView" 
WHERE "dailyUsagePercent" > 80 OR "monthlyUsagePercent" > 80;
```

#### 🔄 **تعديل حدود تاجر:**
```sql
-- زيادة الحد اليومي
UPDATE "Subscription" 
SET "dailyMessagesLimit" = 100
WHERE "merchantId" = 'merchant_id_here';

-- زيادة الحد الشهري
UPDATE "Subscription" 
SET "messagesLimit" = 2000
WHERE "merchantId" = 'merchant_id_here';
```

#### 📈 **ترقية خطة:**
```sql
UPDATE "Subscription" 
SET 
  "plan" = 'PREMIUM',
  "dailyMessagesLimit" = 500,
  "messagesLimit" = 15000,
  "status" = 'ACTIVE'
WHERE "merchantId" = 'merchant_id_here';
```

#### 🚫 **تعطيل تاجر:**
```sql
UPDATE "Merchant" 
SET "isActive" = false
WHERE id = 'merchant_id_here';
```

---

## 💻 الاستخدام في الكود

### 📡 **في Chat API:**
```typescript
// فحص الحدود قبل الإرسال
const { data: limitsCheck } = await supabase
  .rpc('check_message_limits', { merchant_id: merchantId });

if (!limitsCheck[0].can_send) {
  return NextResponse.json({
    error: limitsCheck[0].reason,
    redirectTo: '/limit-reached'
  }, { status: 403 });
}

// بعد إرسال رد الذكاء الاصطناعي
const { data: consumeResult } = await supabase
  .rpc('consume_message', { merchant_id: merchantId });
```

### 📊 **في Dashboard:**
```typescript
// الحصول على الإحصائيات
const response = await fetch(`/api/merchant/usage-stats/${merchantId}`);
const stats = await response.json();

// عرض الإحصائيات
<UsageStatsCard merchantId={merchantId} />
```

---

## 🔍 استعلامات مفيدة للإدارة

### 📊 **لوحة مراقبة شاملة:**
```sql
SELECT 
  'إجمالي التجار' as metric,
  COUNT(*) as value
FROM "Merchant"

UNION ALL

SELECT 
  'التجار النشطون',
  COUNT(*)
FROM "Merchant" 
WHERE "isActive" = true

UNION ALL

SELECT 
  'قريبون من الحد اليومي',
  COUNT(*)
FROM "MerchantLimitsView"
WHERE "dailyUsagePercent" > 80

UNION ALL

SELECT 
  'قريبون من الحد الشهري',
  COUNT(*)
FROM "MerchantLimitsView"
WHERE "monthlyUsagePercent" > 80;
```

### 📈 **الأكثر استخداماً:**
```sql
SELECT 
  "businessName",
  "dailyMessagesUsed",
  "dailyMessagesLimit",
  "dailyUsagePercent"
FROM "MerchantLimitsView"
WHERE "isActive" = true
ORDER BY "dailyMessagesUsed" DESC
LIMIT 10;
```

### ⚠️ **التنبيهات:**
```sql
-- التجار الذين تجاوزوا 90% من حدودهم
SELECT 
  "businessName",
  "email",
  "plan",
  "dailyUsagePercent",
  "monthlyUsagePercent"
FROM "MerchantLimitsView"
WHERE "dailyUsagePercent" > 90 OR "monthlyUsagePercent" > 90;
```

---

## 🚀 خطوات التطبيق

### 1️⃣ **تطبيق التحديثات:**
```bash
# في Supabase SQL Editor
# نفذ محتويات ملف: supabase-simplified-limits.sql
```

### 2️⃣ **تحديث الـ APIs:**
- ✅ تم تحديث `/api/chat-supabase/[chatbotId]/route.ts`
- ✅ تم إنشاء `/api/merchant/usage-stats/[merchantId]/route.ts`

### 3️⃣ **تحديث Dashboard:**
- ✅ تم إنشاء `components/UsageStatsCard.tsx`
- أضف الـ component إلى صفحة الـ dashboard

### 4️⃣ **اختبار النظام:**
```bash
# اختبر إرسال رسائل عبر الشات
# راقب تحديث العدادات في الـ dashboard
# اختبر وصول الحدود اليومية والشهرية
```

---

## 🎯 المهام الإدارية اليومية

### ⏰ **كل يوم (تلقائي):**
- ✅ إعادة تعيين الحدود اليومية تلقائياً
- ✅ تحديث إحصائيات الاستخدام فورياً

### 📅 **كل شهر (يدوي):**
```sql
-- تنفيذ إعادة التعيين الشهرية
SELECT * FROM reset_monthly_limits();
```

### 🔍 **مراقبة يومية:**
```sql
-- فحص سريع للحالة العامة
SELECT 
  COUNT(*) as total_merchants,
  COUNT(CASE WHEN "isActive" = true THEN 1 END) as active_merchants,
  COUNT(CASE WHEN "dailyUsagePercent" > 80 THEN 1 END) as high_daily_usage,
  COUNT(CASE WHEN "monthlyUsagePercent" > 80 THEN 1 END) as high_monthly_usage
FROM "MerchantLimitsView";
```

---

## 🎊 الخلاصة

### ✅ **تم تبسيط النظام إلى:**
- **جدولين أساسيين فقط** (Merchant + Subscription)
- **حدود يومية وشهرية** مدمجة في جدول واحد
- **تجديد تلقائي** للحدود اليومية
- **تجديد يدوي** للحدود الشهرية من المدير
- **حساب تلقائي** لكل رد من الذكاء الاصطناعي

### 🚀 **المميزات:**
- **إدارة مبسطة** بدون تعقيدات
- **أداء سريع** بدون جداول زائدة  
- **مراقبة فورية** للاستخدام
- **تحكم كامل** من Supabase Dashboard
- **تنبيهات ذكية** عند اقتراب الحدود

**النظام الآن جاهز للاستخدام الفوري! 🎯** 