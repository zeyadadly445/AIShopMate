# دليل إصلاح العداد اليومي - DAILY CONSUMPTION FIX

## المشكلة
العداد الشهري `messagesUsed` يعمل بشكل صحيح، لكن العداد اليومي `dailyMessagesUsed` لا يتم تحديثه عند استخدام الشات.

## الحل

### 1. تطبيق ملف SQL المحدث

```bash
# في Supabase SQL Editor، قم بتشغيل:
supabase-fix-daily-consumption.sql
```

هذا الملف سيقوم بـ:
- ✅ التأكد من وجود جميع الحقول المطلوبة
- ✅ إعادة إنشاء دالة `consume_message` مع تحسينات
- ✅ إصلاح منطق فحص وتحديث العدادات
- ✅ إضافة تحديثات أمنية ودقيقة

### 2. التحقق من النتائج

بعد تطبيق الملف، تحقق من:

#### فحص الدوال:
```sql
-- تحقق من وجود الدوال
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name IN ('consume_message', 'check_message_limits', 'get_merchant_usage_stats');
```

#### فحص البيانات:
```sql
-- تحقق من الحقول في جدول Subscription
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'Subscription' 
  AND column_name LIKE '%daily%';
```

#### اختبار الدوال:
```sql
-- اختبار دالة فحص الحدود
SELECT * FROM check_message_limits('YOUR_MERCHANT_ID');

-- اختبار دالة الإحصائيات
SELECT * FROM get_merchant_usage_stats('YOUR_MERCHANT_ID');
```

### 3. التحقق من عمل النظام

#### اختبار الشات:
1. انتقل لصفحة الشات
2. أرسل رسالة
3. تحقق من Console في Developer Tools
4. يجب أن ترى رسائل مثل:
   ```
   ✅ Message consumed successfully: {dailyRemaining: X, monthlyRemaining: Y}
   ```

#### فحص قاعدة البيانات:
```sql
-- تحقق من تحديث العدادات
SELECT 
  m."businessName",
  s."dailyMessagesUsed",
  s."dailyMessagesLimit", 
  s."messagesUsed",
  s."messagesLimit",
  s."lastDailyReset"
FROM "Merchant" m
JOIN "Subscription" s ON s."merchantId" = m.id
WHERE m.id = 'YOUR_MERCHANT_ID';
```

### 4. فحص Dashboard

بعد إرسال رسائل، تحقق من:
- ✅ يتم تحديث العداد اليومي في الـ Dashboard
- ✅ يظهر الاستخدام الصحيح في شريط التقدم
- ✅ تتحدث الإحصائيات في الوقت الفعلي

### 5. اختبار حدود الاستخدام

#### اختبار الحد اليومي:
1. إرسال رسائل حتى الوصول للحد اليومي
2. يجب إظهار رسالة "تم تجاوز الحد اليومي"
3. التوجه لصفحة `/chat/[chatbotId]/limit-reached`

#### اختبار الحد الشهري:
1. عند تجاوز الحد الشهري
2. يجب إظهار رسالة "تم تجاوز الحد الشهري"
3. التوجه لصفحة limit-reached

## التحديثات المطبقة

### ✅ في Chat API:
- فحص الحدود قبل إرسال الرسالة
- استدعاء `consume_message` بعد الرد
- معالجة أخطاء تجاوز الحدود

### ✅ في صفحة الشات:
- فحص الحدود عند تحميل الصفحة
- فحص الحدود قبل إرسال كل رسالة
- توجيه المستخدم عند تجاوز الحدود

### ✅ في قاعدة البيانات:
- دوال محسّنة للفحص والاستهلاك
- تحديث العدادات بدقة
- إعادة تعيين يومية تلقائية

## استكشاف الأخطاء

### إذا لم يتم تحديث العداد اليومي:

1. **تحقق من تطبيق SQL:**
   ```sql
   SELECT * FROM consume_message('test');
   ```

2. **تحقق من logs الخادم:**
   ```bash
   # في مشاريع Vercel
   vercel logs
   ```

3. **تحقق من Console المتصفح:**
   - ابحث عن رسائل خطأ
   - تأكد من استدعاء API الصحيح

### إذا لم تعمل صفحة limit-reached:

1. **تحقق من routing:**
   ```
   /chat/[chatbotId]/limit-reached/page.tsx
   ```

2. **تحقق من redirect:**
   ```javascript
   window.location.href = `/chat/${chatbotId}/limit-reached`
   ```

## مؤشرات النجاح

✅ **العداد اليومي يزيد مع كل رسالة**
✅ **العداد الشهري يزيد مع كل رسالة** 
✅ **فحص صحيح للحدود قبل الإرسال**
✅ **توجيه للصفحة المناسبة عند التجاوز**
✅ **إحصائيات صحيحة في Dashboard**

## الخطوات التالية

بعد تطبيق الإصلاحات:

1. **اختبار شامل للنظام**
2. **مراقبة الأداء لعدة أيام**
3. **التأكد من إعادة التعيين اليومية**
4. **تحقق من دقة الإحصائيات**

---

*آخر تحديث: ${new Date().toLocaleDateString('ar-SA')}* 