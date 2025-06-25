# 🚀 البدء السريع مع Supabase

## 📱 الوصول المباشر

### 🌐 **عبر المتصفح:**
```
https://supabase.com/dashboard
```

### 📲 **عبر التطبيق:**
- iOS: [Supabase على App Store](https://apps.apple.com/app/supabase/id1490799346)
- Android: [Supabase على Play Store](https://play.google.com/store/apps/details?id=com.supabase.dashboard)

---

## ⚡ المهام الأساسية اليومية

### 1. **مراقبة التجار الجدد:**
```sql
SELECT business_name, email, created_at 
FROM "Merchant" 
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;
```

### 2. **فحص الاشتراكات المنتهية:**
```sql
SELECT m.business_name, s.plan, s.end_date
FROM "Subscription" s
JOIN "Merchant" m ON s.merchant_id = m.id
WHERE s.end_date < NOW() AND s.status = 'ACTIVE';
```

### 3. **مراقبة استهلاك الرسائل:**
```sql
SELECT 
  m.business_name,
  s.messages_used,
  s.messages_limit,
  ROUND((s.messages_used::float / s.messages_limit) * 100, 2) as usage_percent
FROM "Subscription" s
JOIN "Merchant" m ON s.merchant_id = m.id
WHERE s.messages_used > s.messages_limit * 0.8
ORDER BY usage_percent DESC;
```

---

## 🔥 ميزات Supabase المتقدمة

### 📊 **Real-time Dashboard:**
- **Table Editor**: تعديل البيانات مباشرة
- **SQL Editor**: تنفيذ استعلامات معقدة
- **API Docs**: وثائق API تلقائية
- **Auth Management**: إدارة المستخدمين

### 🔔 **التنبيهات الذكية:**
```sql
-- إعداد webhook للتنبيه عند تسجيل تاجر جديد
-- Database > Webhooks > Create Webhook
-- Table: Merchant
-- Events: INSERT
-- HTTP Request: POST to your notification endpoint
```

### 📈 **الإحصائيات المرئية:**
```sql
-- استعلام للحصول على إحصائيات يومية
SELECT 
  DATE(created_at) as date,
  COUNT(*) as new_merchants,
  SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) as total_merchants
FROM "Merchant"
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 🛠️ إعدادات مهمة

### 🔐 **الأمان:**
- **RLS (Row Level Security)**: مفعل على جميع الجداول
- **API Keys**: مخفية ومحمية
- **Auth Policies**: صلاحيات محددة لكل مستخدم

### 📱 **الوصول عبر الهاتف:**
1. حمل تطبيق Supabase
2. سجل دخول بحسابك
3. اختر مشروع AI Shop Mate
4. تصفح الجداول وراقب البيانات

### 🔔 **إعداد التنبيهات:**
```javascript
// webhook endpoint example
app.post('/webhook/new-merchant', (req, res) => {
  const newMerchant = req.body.record;
  
  // إرسال إشعار
  sendNotification(`تاجر جديد: ${newMerchant.business_name}`);
  
  res.status(200).send('OK');
});
```

---

## 💡 نصائح للاستخدام الأمثل

### ⚡ **اختصارات مفيدة:**
- `Ctrl + K`: البحث السريع
- `Ctrl + Enter`: تنفيذ الاستعلام
- `Ctrl + /`: تعليق السطر

### 📊 **استعلامات مفضلة:**
```sql
-- احفظ هذه الاستعلامات في Saved Queries

-- 1. إحصائيات اليوم
SELECT 
  COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as new_merchants_today,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_merchants,
  COUNT(*) as total_merchants
FROM "Merchant";

-- 2. أكثر التجار نشاطاً
SELECT 
  m.business_name,
  COUNT(c.id) as conversations,
  SUM(msg_count.count) as total_messages
FROM "Merchant" m
LEFT JOIN "Conversation" c ON c.merchant_id = m.id
LEFT JOIN (
  SELECT conversation_id, COUNT(*) as count
  FROM "Message"
  GROUP BY conversation_id
) msg_count ON msg_count.conversation_id = c.id
GROUP BY m.id, m.business_name
ORDER BY total_messages DESC
LIMIT 10;

-- 3. تقرير الإيرادات
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
WHERE s.status IN ('ACTIVE', 'TRIAL')
GROUP BY s.plan;
```

---

## 🎯 الخلاصة

مع **Supabase** لديك:

✅ **لوحة تحكم قوية** أقوى من أي dashboard مخصص  
✅ **وصول من أي مكان** (متصفح + تطبيق موبايل)  
✅ **استعلامات SQL متقدمة** بدون قيود  
✅ **تنبيهات وإشعارات تلقائية**  
✅ **نسخ احتياطية وأمان متقدم**  
✅ **إحصائيات وتقارير مرئية**  

🚀 **أبسط وأقوى وأكثر مرونة!** 