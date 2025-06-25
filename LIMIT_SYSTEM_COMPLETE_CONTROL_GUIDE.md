# 🎛️ دليل التحكم الكامل بالقيود والحدود عبر Supabase

## 📋 الجداول الرئيسية للتحكم بالحدود

### 1️⃣ **جدول Subscription - الحدود الأساسية**
```
📍 المسار: Supabase Dashboard > Table Editor > Subscription
🎯 الغرض: التحكم في حدود الاشتراك الأساسية
```

### 2️⃣ **جدول Merchant - الحدود اليومية والإعدادات**
```
📍 المسار: Supabase Dashboard > Table Editor > Merchant  
🎯 الغرض: التحكم في الحدود اليومية والتفعيل
```

### 3️⃣ **جدول DailyUsageStats - مراقبة الاستهلاك**
```
📍 المسار: Supabase Dashboard > Table Editor > DailyUsageStats
🎯 الغرض: مراقبة الاستهلاك اليومي والتحكم فيه
```

---

## 🔧 التحكم في حدود الاشتراك (Subscription)

### 📊 **الحقول القابلة للتحكم:**

| الحقل | النوع | الوصف | مثال |
|-------|-------|--------|-------|
| `plan` | enum | نوع الخطة | BASIC, STANDARD, PREMIUM, ENTERPRISE |
| `status` | enum | حالة الاشتراك | TRIAL, ACTIVE, CANCELLED, EXPIRED |
| `messagesLimit` | int | حد الرسائل الشهري | 1000, 5000, 15000, 50000 |
| `messagesUsed` | int | الرسائل المستخدمة | 150, 2300, 8950 |
| `endDate` | date | تاريخ انتهاء الاشتراك | 2025-02-25 |

### ⚡ **تعديل حدود التاجر:**

#### 🔄 **ترقية خطة اشتراك:**
```sql
UPDATE "Subscription" 
SET 
  plan = 'PREMIUM',
  messagesLimit = 15000,
  status = 'ACTIVE',
  endDate = NOW() + INTERVAL '30 days'
WHERE merchantId = 'معرف_التاجر_هنا';
```

#### 📈 **زيادة حد الرسائل لتاجر معين:**
```sql
UPDATE "Subscription" 
SET messagesLimit = 20000
WHERE merchantId = 'معرف_التاجر_هنا';
```

#### 🔄 **إعادة تعيين عداد الرسائل:**
```sql
UPDATE "Subscription" 
SET 
  messagesUsed = 0,
  lastReset = NOW()
WHERE merchantId = 'معرف_التاجر_هنا';
```

#### ⏸️ **إيقاف اشتراك مؤقتاً:**
```sql
UPDATE "Subscription" 
SET status = 'CANCELLED'
WHERE merchantId = 'معرف_التاجر_هنا';
```

#### ✅ **إعادة تفعيل اشتراك:**
```sql
UPDATE "Subscription" 
SET 
  status = 'ACTIVE',
  endDate = NOW() + INTERVAL '30 days'
WHERE merchantId = 'معرف_التاجر_هنا';
```

---

## 🏢 التحكم في إعدادات التاجر (Merchant)

### 📊 **الحقول القابلة للتحكم:**

| الحقل | النوع | الوصف | تأثيره |
|-------|-------|--------|--------|
| `isActive` | boolean | تفعيل/تعطيل الحساب | true = نشط, false = معطل |
| `maxDailyMessages` | int | الحد اليومي للرسائل | 100, 200, 500 |
| `allowedDomains` | text[] | النطاقات المسموحة | ['example.com', 'shop.com'] |
| `adminNotes` | text | ملاحظات إدارية | "عميل VIP - دعم أولوية" |

### ⚡ **عمليات التحكم السريع:**

#### 🚫 **تعطيل تاجر فوراً:**
```sql
UPDATE "Merchant" 
SET isActive = false
WHERE id = 'معرف_التاجر_هنا';
```

#### ✅ **إعادة تفعيل تاجر:**
```sql
UPDATE "Merchant" 
SET isActive = true
WHERE id = 'معرف_التاجر_هنا';
```

#### 📊 **تخصيص حد يومي:**
```sql
UPDATE "Merchant" 
SET maxDailyMessages = 300
WHERE id = 'معرف_التاجر_هنا';
```

#### 🔒 **تقييد النطاقات:**
```sql
UPDATE "Merchant" 
SET allowedDomains = ARRAY['trusted-domain.com', 'secure-shop.com']
WHERE id = 'معرف_التاجر_هنا';
```

#### 📝 **إضافة ملاحظة إدارية:**
```sql
UPDATE "Merchant" 
SET adminNotes = 'عميل متميز - دعم فوري - لا توجد قيود'
WHERE id = 'معرف_التاجر_هنا';
```

---

## 📊 مراقبة والتحكم في الاستهلاك اليومي

### 📈 **استعلامات المراقبة:**

#### 🔍 **التجار القريبون من الحد:**
```sql
SELECT 
  m.businessName,
  m.email,
  s.messagesUsed,
  s.messagesLimit,
  ROUND((s.messagesUsed::decimal / s.messagesLimit) * 100, 2) as usagePercent
FROM "Merchant" m
JOIN "Subscription" s ON s.merchantId = m.id
WHERE (s.messagesUsed::decimal / s.messagesLimit) > 0.8
ORDER BY usagePercent DESC;
```

#### 📅 **الاستهلاك اليومي لتاجر معين:**
```sql
SELECT 
  date,
  messagesCount,
  uniqueSessionsCount
FROM "DailyUsageStats"
WHERE merchantId = 'معرف_التاجر_هنا'
  AND date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;
```

#### ⚠️ **التجار المتجاوزون للحد اليومي:**
```sql
SELECT 
  m.businessName,
  d.messagesCount,
  m.maxDailyMessages
FROM "Merchant" m
JOIN "DailyUsageStats" d ON d.merchantId = m.id
WHERE d.date = CURRENT_DATE
  AND d.messagesCount > COALESCE(m.maxDailyMessages, 100)
ORDER BY d.messagesCount DESC;
```

---

## 🎯 سيناريوهات عملية للتحكم

### 🥇 **سيناريو 1: ترقية عميل VIP**
```sql
-- 1. ترقية الاشتراك
UPDATE "Subscription" 
SET 
  plan = 'ENTERPRISE',
  messagesLimit = 50000,
  status = 'ACTIVE'
WHERE merchantId = 'vip_merchant_id';

-- 2. رفع الحد اليومي
UPDATE "Merchant" 
SET 
  maxDailyMessages = 1000,
  adminNotes = 'عميل VIP - حدود مرتفعة - دعم أولوية'
WHERE id = 'vip_merchant_id';
```

### ⚠️ **سيناريو 2: تقييد عميل مشبوه**
```sql
-- 1. تقليل الحدود
UPDATE "Subscription" 
SET messagesLimit = 500
WHERE merchantId = 'suspicious_merchant_id';

-- 2. تقييد يومي
UPDATE "Merchant" 
SET 
  maxDailyMessages = 20,
  adminNotes = 'استخدام مشبوه - تحت المراقبة',
  allowedDomains = ARRAY['verified-domain.com']
WHERE id = 'suspicious_merchant_id';
```

### 🔄 **سيناريو 3: إعادة تعيين شهرية**
```sql
-- إعادة تعيين لجميع الحسابات النشطة
UPDATE "Subscription" 
SET 
  messagesUsed = 0,
  lastReset = NOW()
WHERE status IN ('ACTIVE', 'TRIAL')
  AND lastReset < DATE_TRUNC('month', NOW());
```

### 🎁 **سيناريو 4: منح حد إضافي مؤقت**
```sql
-- زيادة مؤقتة للحد (يمكن عكسها لاحقاً)
UPDATE "Subscription" 
SET messagesLimit = messagesLimit + 2000
WHERE merchantId = 'merchant_needs_extra';

-- إضافة ملاحظة للتذكير
UPDATE "Merchant" 
SET adminNotes = 'حد إضافي 2000 رسالة - ينتهي 2025-02-28'
WHERE id = 'merchant_needs_extra';
```

---

## 🔍 استعلامات إدارية متقدمة

### 📊 **لوحة مراقبة شاملة:**
```sql
SELECT 
  COUNT(*) as total_merchants,
  COUNT(CASE WHEN m.isActive = true THEN 1 END) as active_merchants,
  COUNT(CASE WHEN s.status = 'ACTIVE' THEN 1 END) as active_subscriptions,
  AVG(s.messagesUsed) as avg_messages_used,
  SUM(s.messagesUsed) as total_messages_today
FROM "Merchant" m
LEFT JOIN "Subscription" s ON s.merchantId = m.id;
```

### 💰 **تحليل الإيرادات المحتملة:**
```sql
SELECT 
  s.plan,
  COUNT(*) as subscribers,
  CASE s.plan
    WHEN 'BASIC' THEN COUNT(*) * 29
    WHEN 'STANDARD' THEN COUNT(*) * 59  
    WHEN 'PREMIUM' THEN COUNT(*) * 99
    WHEN 'ENTERPRISE' THEN COUNT(*) * 199
  END as monthly_revenue
FROM "Subscription" s
WHERE s.status = 'ACTIVE'
GROUP BY s.plan;
```

### 📈 **أفضل العملاء أداءً:**
```sql
SELECT 
  m.businessName,
  s.plan,
  SUM(d.messagesCount) as total_messages_week,
  AVG(d.messagesCount) as avg_daily_messages
FROM "Merchant" m
JOIN "Subscription" s ON s.merchantId = m.id
JOIN "DailyUsageStats" d ON d.merchantId = m.id
WHERE d.date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY m.id, m.businessName, s.plan
ORDER BY total_messages_week DESC
LIMIT 10;
```

### 🚨 **تنبيهات الحدود:**
```sql
-- التجار الذين سيتجاوزون الحد خلال 3 أيام
SELECT 
  m.businessName,
  s.messagesUsed,
  s.messagesLimit,
  AVG(d.messagesCount) as avg_daily,
  s.messagesLimit - s.messagesUsed as remaining,
  ROUND((s.messagesLimit - s.messagesUsed) / AVG(d.messagesCount), 1) as days_left
FROM "Merchant" m
JOIN "Subscription" s ON s.merchantId = m.id
JOIN "DailyUsageStats" d ON d.merchantId = m.id
WHERE d.date >= CURRENT_DATE - INTERVAL '7 days'
  AND s.status = 'ACTIVE'
GROUP BY m.id, m.businessName, s.messagesUsed, s.messagesLimit
HAVING (s.messagesLimit - s.messagesUsed) / AVG(d.messagesCount) < 3
ORDER BY days_left ASC;
```

---

## 🛡️ القواعد الأمنية للتحكم

### ✅ **أفضل الممارسات:**

1. **📝 سجل كل تغيير:**
   ```sql
   -- أضف ملاحظة عند تغيير الحدود
   UPDATE "Merchant" 
   SET adminNotes = adminNotes || ' | تم رفع الحد إلى 5000 في ' || NOW()
   WHERE id = 'merchant_id';
   ```

2. **⏰ استخدم timestamps:**
   ```sql
   -- احفظ وقت آخر تعديل
   UPDATE "Subscription" 
   SET 
     messagesLimit = 10000,
     updatedAt = NOW()
   WHERE merchantId = 'merchant_id';
   ```

3. **🔍 تحقق قبل التغيير:**
   ```sql
   -- تأكد من وجود التاجر قبل التعديل
   UPDATE "Subscription" 
   SET messagesLimit = 5000
   WHERE merchantId = 'merchant_id'
     AND EXISTS (SELECT 1 FROM "Merchant" WHERE id = 'merchant_id');
   ```

### ⚠️ **تحذيرات مهمة:**

1. **🚫 لا تحذف البيانات مباشرة** - استخدم التعطيل بدلاً من الحذف
2. **📊 احفظ نسخة احتياطية** قبل التعديلات الكبيرة
3. **🔍 اختبر الاستعلامات** على بيانات تجريبية أولاً
4. **👥 قيد صلاحيات المدراء** حسب المسؤوليات

---

## 🎛️ واجهة التحكم السريع

### ⚡ **عمليات يومية (5 دقائق):**

```sql
-- 1. فحص التجار القريبين من الحد
SELECT businessName, (messagesUsed::float/messagesLimit)*100 as usage_percent
FROM "Merchant" m JOIN "Subscription" s ON s.merchantId = m.id 
WHERE (messagesUsed::float/messagesLimit) > 0.8;

-- 2. فحص الحسابات المعطلة
SELECT businessName, adminNotes FROM "Merchant" WHERE isActive = false;

-- 3. فحص الاشتراكات المنتهية
SELECT m.businessName, s.endDate 
FROM "Merchant" m JOIN "Subscription" s ON s.merchantId = m.id
WHERE s.endDate < NOW() + INTERVAL '7 days';
```

### 📅 **عمليات أسبوعية:**

```sql
-- إعادة تعيين الحدود اليومية للجميع
UPDATE "Merchant" SET maxDailyMessages = 100 WHERE maxDailyMessages IS NULL;

-- مراجعة الاستهلاك الأسبوعي
SELECT 
  m.businessName,
  SUM(d.messagesCount) as weekly_total
FROM "Merchant" m
JOIN "DailyUsageStats" d ON d.merchantId = m.id
WHERE d.date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY m.id, m.businessName
ORDER BY weekly_total DESC;
```

---

## 🎯 الخلاصة

### ✅ **الآن يمكنك التحكم الكامل في:**

1. **📊 حدود الرسائل** - شهرية ويومية
2. **⏸️ حالة الاشتراكات** - تفعيل/تعطيل
3. **🎯 خطط مخصصة** - ترقية/تقليل
4. **🔒 قيود الأمان** - نطاقات وحدود
5. **📈 مراقبة الاستهلاك** - فورية ومتقدمة
6. **💰 إدارة الإيرادات** - تحليل وتوقع

### 🚀 **طرق الوصول:**

- **💻 Supabase Dashboard** - Table Editor للتعديل المباشر
- **🔧 SQL Editor** - للاستعلامات المتقدمة  
- **📱 Supabase Mobile App** - للمراقبة السريعة
- **🔔 Real-time subscriptions** - للتنبيهات الفورية

**أنت الآن تملك سيطرة كاملة على كل جانب من جوانب النظام! 👑** 