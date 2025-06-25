# 🚀 دليل الإدارة عبر Supabase

هذا الدليل الشامل لإدارة نظام AI Shop Mate بالكامل عبر لوحة تحكم Supabase.

## 📊 الوصول إلى لوحة Supabase

### 1. **تسجيل الدخول:**
```
https://supabase.com/dashboard
```

### 2. **اختر مشروعك:**
- اذهب إلى Projects
- اختر مشروع AI Shop Mate

---

## 🏢 إدارة التجار (Merchants)

### 📋 **عرض جميع التجار:**
```sql
-- لوحة Supabase > Table Editor > Merchant
SELECT 
  id,
  email,
  business_name,
  phone,
  chatbot_id,
  is_active,
  created_at,
  updated_at
FROM "Merchant"
ORDER BY created_at DESC;
```

### ➕ **إضافة تاجر جديد:**
```sql
INSERT INTO "Merchant" (
  email,
  business_name,
  phone,
  chatbot_id,
  welcome_message,
  primary_color,
  is_active
) VALUES (
  'merchant@example.com',
  'اسم المتجر',
  '+966501234567',
  'bot_' || extract(epoch from now()) || '_' || substr(md5(random()::text), 1, 8),
  'مرحباً! كيف يمكنني مساعدتك؟',
  '#3b82f6',
  true
);
```

### ✏️ **تعديل بيانات تاجر:**
```sql
UPDATE "Merchant" 
SET 
  business_name = 'الاسم الجديد',
  phone = '+966501234567',
  is_active = false
WHERE id = 'merchant_id_here';
```

### 🗑️ **حذف تاجر (مع جميع بياناته):**
```sql
-- سيتم حذف جميع البيانات المرتبطة تلقائياً بسبب CASCADE
DELETE FROM "Merchant" WHERE id = 'merchant_id_here';
```

---

## 💳 إدارة الاشتراكات (Subscriptions)

### 📋 **عرض جميع الاشتراكات:**
```sql
SELECT 
  s.id,
  s.plan,
  s.status,
  s.messages_limit,
  s.messages_used,
  s.start_date,
  s.end_date,
  m.business_name,
  m.email
FROM "Subscription" s
JOIN "Merchant" m ON s.merchant_id = m.id
ORDER BY s.created_at DESC;
```

### 📊 **إحصائيات الاشتراكات:**
```sql
-- إحصائيات حسب الخطة
SELECT 
  plan,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active,
  COUNT(CASE WHEN status = 'TRIAL' THEN 1 END) as trial,
  COUNT(CASE WHEN status = 'EXPIRED' THEN 1 END) as expired
FROM "Subscription"
GROUP BY plan;
```

### 🔄 **إعادة تعيين الرسائل الشهرية:**
```sql
-- إعادة تعيين لجميع الحسابات النشطة
UPDATE "Subscription" 
SET 
  messages_used = 0,
  last_reset = NOW()
WHERE status IN ('ACTIVE', 'TRIAL');
```

### 📈 **ترقية اشتراك:**
```sql
UPDATE "Subscription" 
SET 
  plan = 'PREMIUM',
  messages_limit = 15000,
  status = 'ACTIVE',
  end_date = NOW() + INTERVAL '30 days'
WHERE merchant_id = 'merchant_id_here';
```

---

## 💬 إدارة المحادثات والرسائل

### 📋 **عرض المحادثات الأخيرة:**
```sql
SELECT 
  c.id,
  c.session_id,
  m.business_name,
  COUNT(msg.id) as message_count,
  c.created_at,
  c.updated_at
FROM "Conversation" c
JOIN "Merchant" m ON c.merchant_id = m.id
LEFT JOIN "Message" msg ON msg.conversation_id = c.id
GROUP BY c.id, m.business_name
ORDER BY c.updated_at DESC
LIMIT 50;
```

### 📊 **إحصائيات الرسائل:**
```sql
-- إجمالي الرسائل لكل تاجر
SELECT 
  m.business_name,
  m.email,
  COUNT(msg.id) as total_messages,
  COUNT(CASE WHEN msg.is_from_user = true THEN 1 END) as user_messages,
  COUNT(CASE WHEN msg.is_from_user = false THEN 1 END) as bot_messages
FROM "Merchant" m
LEFT JOIN "Conversation" c ON c.merchant_id = m.id
LEFT JOIN "Message" msg ON msg.conversation_id = c.id
GROUP BY m.id, m.business_name, m.email
ORDER BY total_messages DESC;
```

### 🔍 **البحث في الرسائل:**
```sql
-- البحث عن رسائل تحتوي على كلمة معينة
SELECT 
  m.business_name,
  msg.content,
  msg.is_from_user,
  msg.created_at
FROM "Message" msg
JOIN "Conversation" c ON msg.conversation_id = c.id
JOIN "Merchant" m ON c.merchant_id = m.id
WHERE msg.content ILIKE '%كلمة البحث%'
ORDER BY msg.created_at DESC;
```

---

## 📈 تقارير وإحصائيات متقدمة

### 📊 **إحصائيات شاملة:**
```sql
-- لوحة معلومات شاملة
SELECT 
  'إجمالي التجار' as metric,
  COUNT(*) as value
FROM "Merchant"

UNION ALL

SELECT 
  'التجار النشطون',
  COUNT(*)
FROM "Merchant" 
WHERE is_active = true

UNION ALL

SELECT 
  'إجمالي المحادثات',
  COUNT(*)
FROM "Conversation"

UNION ALL

SELECT 
  'إجمالي الرسائل',
  COUNT(*)
FROM "Message"

UNION ALL

SELECT 
  'الاشتراكات النشطة',
  COUNT(*)
FROM "Subscription"
WHERE status = 'ACTIVE';
```

### 📅 **تقرير الأنشطة اليومية:**
```sql
-- المحادثات والرسائل في آخر 7 أيام
SELECT 
  DATE(created_at) as date,
  COUNT(*) as conversations
FROM "Conversation"
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### 💰 **تقرير الإيرادات المحتملة:**
```sql
-- حساب الإيرادات المحتملة حسب الخطط
SELECT 
  plan,
  COUNT(*) as subscribers,
  CASE 
    WHEN plan = 'BASIC' THEN COUNT(*) * 29
    WHEN plan = 'STANDARD' THEN COUNT(*) * 59
    WHEN plan = 'PREMIUM' THEN COUNT(*) * 99
    WHEN plan = 'ENTERPRISE' THEN COUNT(*) * 199
    ELSE 0
  END as potential_revenue
FROM "Subscription"
WHERE status IN ('ACTIVE', 'TRIAL')
GROUP BY plan;
```

---

## 🔧 إدارة البيانات المتقدمة

### 🧹 **تنظيف البيانات:**
```sql
-- حذف المحادثات القديمة (أكثر من 90 يوم)
DELETE FROM "Conversation" 
WHERE created_at < NOW() - INTERVAL '90 days';

-- حذف الجلسات المنتهية
DELETE FROM "Subscription" 
WHERE status = 'EXPIRED' 
AND end_date < NOW() - INTERVAL '30 days';
```

### 📋 **نسخ احتياطية:**
```sql
-- إنشاء نسخة احتياطية من بيانات التجار
CREATE TABLE merchant_backup AS 
SELECT * FROM "Merchant";

-- إنشاء نسخة احتياطية من الاشتراكات
CREATE TABLE subscription_backup AS 
SELECT * FROM "Subscription";
```

---

## 🔐 إدارة الأمان والصلاحيات

### 👥 **إدارة المستخدمين (عبر Auth):**
```sql
-- عرض جميع المستخدمين المسجلين
SELECT 
  auth.users.id,
  auth.users.email,
  auth.users.created_at,
  auth.users.last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;
```

### 🚫 **حظر مستخدم:**
```sql
-- تعطيل تاجر
UPDATE "Merchant" 
SET is_active = false 
WHERE email = 'user@example.com';

-- تعطيل اشتراك
UPDATE "Subscription" 
SET status = 'SUSPENDED' 
WHERE merchant_id = (
  SELECT id FROM "Merchant" WHERE email = 'user@example.com'
);
```

---

## 📱 الوصول السريع عبر الهاتف

### 📲 **تطبيق Supabase Mobile:**
- حمل تطبيق Supabase من متجر التطبيقات
- سجل دخول بنفس حساب Supabase
- يمكنك مراقبة البيانات وتنفيذ الاستعلامات

### 🔔 **تنبيهات تلقائية:**
```sql
-- إنشاء webhook للتنبيهات
-- في Supabase Dashboard > Database > Webhooks
-- إضافة webhook عند إنشاء محادثة جديدة
-- أو عند تجاوز حد الرسائل
```

---

## 🚨 حالات الطوارئ

### ⚡ **إيقاف خدمة معينة:**
```sql
-- إيقاف جميع الشات بوتس
UPDATE "Merchant" SET is_active = false;

-- إعادة تفعيل تاجر معين
UPDATE "Merchant" 
SET is_active = true 
WHERE id = 'merchant_id';
```

### 🔄 **إعادة تعيين شاملة:**
```sql
-- إعادة تعيين جميع عدادات الرسائل
UPDATE "Subscription" SET messages_used = 0;
```

---

## 💡 نصائح مهمة

### ✅ **أفضل الممارسات:**
1. **اعمل backup دوري** للبيانات المهمة
2. **راقب الإحصائيات** يومياً عبر Dashboard
3. **استخدم Filters** في Table Editor للبحث السريع
4. **فعل Real-time subscriptions** للتنبيهات الفورية
5. **استخدم SQL Editor** للاستعلامات المعقدة

### 🔍 **مراقبة الأداء:**
- **Logs** > Real-time logs لمراقبة الأخطاء
- **Usage** > API usage لمراقبة الاستخدام
- **Settings** > Billing لمراقبة التكاليف

### 📊 **تصدير البيانات:**
- يمكنك تصدير أي جدول كـ CSV من Table Editor
- استخدم SQL Editor لتصدير استعلامات مخصصة

---

## 🎯 الخلاصة

الآن يمكنك إدارة **كل شيء** في نظام AI Shop Mate عبر Supabase:

✅ **إدارة التجار والحسابات**  
✅ **مراقبة الاشتراكات والمدفوعات**  
✅ **تتبع المحادثات والرسائل**  
✅ **تحليل الإحصائيات والتقارير**  
✅ **إدارة الأمان والصلاحيات**  
✅ **النسخ الاحتياطية والصيانة**  

🚀 **لوحة Supabase أقوى وأشمل من أي dashboard مخصص!** 