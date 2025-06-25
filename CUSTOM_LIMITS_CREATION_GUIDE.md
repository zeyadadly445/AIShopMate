# 🛠️ دليل إنشاء قيود وحدود مخصصة جديدة

## 🎯 إضافة حدود جديدة للتجار

### 1️⃣ **إضافة حقول جديدة لجدول Merchant**

```sql
-- إضافة حد للملفات المرفوعة يومياً
ALTER TABLE "Merchant" 
ADD COLUMN "maxDailyFileUploads" INTEGER DEFAULT 5;

-- إضافة حد لحجم الملفات (بالميجابايت)
ALTER TABLE "Merchant" 
ADD COLUMN "maxFileSize" INTEGER DEFAULT 10;

-- إضافة حد للمحادثات المتزامنة
ALTER TABLE "Merchant" 
ADD COLUMN "maxConcurrentChats" INTEGER DEFAULT 3;

-- إضافة فترة تأخير بين الرسائل (بالثواني)
ALTER TABLE "Merchant" 
ADD COLUMN "messageDelay" INTEGER DEFAULT 1;

-- إضافة حد يومي للجلسات الجديدة
ALTER TABLE "Merchant" 
ADD COLUMN "maxDailyNewSessions" INTEGER DEFAULT 50;

-- إضافة قائمة الكلمات المحظورة
ALTER TABLE "Merchant" 
ADD COLUMN "bannedWords" TEXT[];

-- إضافة ساعات العمل المسموحة
ALTER TABLE "Merchant" 
ADD COLUMN "workingHours" JSONB DEFAULT '{"start": "09:00", "end": "18:00", "timezone": "Asia/Riyadh"}';
```

### 2️⃣ **إضافة حقول جديدة لجدول Subscription**

```sql
-- إضافة حد شهري للـ API calls
ALTER TABLE "Subscription" 
ADD COLUMN "apiCallsLimit" INTEGER DEFAULT 10000;

-- عداد الـ API calls المستخدمة
ALTER TABLE "Subscription" 
ADD COLUMN "apiCallsUsed" INTEGER DEFAULT 0;

-- حد شهري لتدريب النموذج
ALTER TABLE "Subscription" 
ADD COLUMN "modelTrainingLimit" INTEGER DEFAULT 5;

-- حد شهري للتقارير المتقدمة
ALTER TABLE "Subscription" 
ADD COLUMN "advancedReportsLimit" INTEGER DEFAULT 10;

-- حد شهري للتكاملات الخارجية
ALTER TABLE "Subscription" 
ADD COLUMN "integrationsLimit" INTEGER DEFAULT 3;

-- حد أقصى لحجم قاعدة المعرفة (بالميجابايت)
ALTER TABLE "Subscription" 
ADD COLUMN "knowledgeBaseSize" INTEGER DEFAULT 100;

-- حد أقصى لعدد البوتات
ALTER TABLE "Subscription" 
ADD COLUMN "maxBots" INTEGER DEFAULT 1;
```

### 3️⃣ **جدول جديد للحدود المتقدمة**

```sql
-- إنشاء جدول للحدود المخصصة
CREATE TABLE "CustomLimits" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "merchantId" TEXT NOT NULL REFERENCES "Merchant"("id") ON DELETE CASCADE,
  "limitType" TEXT NOT NULL, -- نوع الحد
  "limitValue" INTEGER NOT NULL, -- قيمة الحد
  "currentUsage" INTEGER DEFAULT 0, -- الاستخدام الحالي
  "resetPeriod" TEXT DEFAULT 'monthly', -- فترة إعادة التعيين
  "lastReset" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "isActive" BOOLEAN DEFAULT true,
  "description" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE("merchantId", "limitType")
);

-- إنشاء فهرس للأداء
CREATE INDEX "CustomLimits_merchantId_idx" ON "CustomLimits"("merchantId");
CREATE INDEX "CustomLimits_limitType_idx" ON "CustomLimits"("limitType");
```

---

## 🔧 دوال مساعدة للحدود المخصصة

### 🛠️ **دالة فحص الحدود:**

```sql
CREATE OR REPLACE FUNCTION check_custom_limit(
  merchant_id TEXT,
  limit_type TEXT,
  increment_by INTEGER DEFAULT 1
) RETURNS BOOLEAN AS $$
DECLARE
  current_limit INTEGER;
  current_usage INTEGER;
BEGIN
  -- الحصول على الحد والاستخدام الحالي
  SELECT "limitValue", "currentUsage" 
  INTO current_limit, current_usage
  FROM "CustomLimits"
  WHERE "merchantId" = merchant_id 
    AND "limitType" = limit_type
    AND "isActive" = true;
  
  -- إذا لم يوجد حد مخصص، اسمح بالعملية
  IF current_limit IS NULL THEN
    RETURN true;
  END IF;
  
  -- فحص إذا كان الاستخدام + الزيادة أقل من الحد
  RETURN (current_usage + increment_by) <= current_limit;
END;
$$ LANGUAGE plpgsql;
```

### 📊 **دالة تحديث الاستخدام:**

```sql
CREATE OR REPLACE FUNCTION increment_custom_limit(
  merchant_id TEXT,
  limit_type TEXT,
  increment_by INTEGER DEFAULT 1
) RETURNS BOOLEAN AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  -- تحديث الاستخدام
  UPDATE "CustomLimits"
  SET 
    "currentUsage" = "currentUsage" + increment_by,
    "updatedAt" = NOW()
  WHERE "merchantId" = merchant_id 
    AND "limitType" = limit_type
    AND "isActive" = true;
    
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  -- إرجاع true إذا تم التحديث بنجاح
  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql;
```

### 🔄 **دالة إعادة تعيين الحدود:**

```sql
CREATE OR REPLACE FUNCTION reset_custom_limits(
  reset_period TEXT DEFAULT 'monthly'
) RETURNS INTEGER AS $$
DECLARE
  reset_condition TIMESTAMP WITH TIME ZONE;
  rows_affected INTEGER;
BEGIN
  -- تحديد شرط إعادة التعيين حسب الفترة
  CASE reset_period
    WHEN 'daily' THEN 
      reset_condition := DATE_TRUNC('day', NOW());
    WHEN 'weekly' THEN 
      reset_condition := DATE_TRUNC('week', NOW());
    WHEN 'monthly' THEN 
      reset_condition := DATE_TRUNC('month', NOW());
    ELSE 
      reset_condition := DATE_TRUNC('month', NOW());
  END CASE;
  
  -- إعادة تعيين الحدود المستحقة
  UPDATE "CustomLimits"
  SET 
    "currentUsage" = 0,
    "lastReset" = NOW(),
    "updatedAt" = NOW()
  WHERE "resetPeriod" = reset_period
    AND "lastReset" < reset_condition
    AND "isActive" = true;
    
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  RETURN rows_affected;
END;
$$ LANGUAGE plpgsql;
```

---

## 🎯 أمثلة لحدود مخصصة شائعة

### 1️⃣ **حد الملفات المرفوعة:**

```sql
-- إضافة حد للملفات المرفوعة
INSERT INTO "CustomLimits" (
  "merchantId", 
  "limitType", 
  "limitValue", 
  "resetPeriod",
  "description"
) VALUES (
  'merchant_id_here',
  'file_uploads',
  20,
  'daily',
  'حد الملفات المرفوعة يومياً'
);
```

### 2️⃣ **حد الـ API calls:**

```sql
-- إضافة حد لاستدعاءات الـ API
INSERT INTO "CustomLimits" (
  "merchantId", 
  "limitType", 
  "limitValue", 
  "resetPeriod",
  "description"
) VALUES (
  'merchant_id_here',
  'api_calls',
  5000,
  'monthly',
  'حد استدعاءات الـ API شهرياً'
);
```

### 3️⃣ **حد التدريب:**

```sql
-- إضافة حد لتدريب النموذج
INSERT INTO "CustomLimits" (
  "merchantId", 
  "limitType", 
  "limitValue", 
  "resetPeriod",
  "description"
) VALUES (
  'merchant_id_here',
  'model_training',
  3,
  'monthly',
  'حد تدريب النموذج شهرياً'
);
```

---

## 🔍 استعلامات مراقبة الحدود المخصصة

### 📊 **عرض جميع الحدود لتاجر:**

```sql
SELECT 
  cl."limitType",
  cl."limitValue",
  cl."currentUsage",
  ROUND((cl."currentUsage"::decimal / cl."limitValue") * 100, 2) as "usagePercent",
  cl."resetPeriod",
  cl."lastReset",
  cl."description"
FROM "CustomLimits" cl
WHERE cl."merchantId" = 'merchant_id_here'
  AND cl."isActive" = true
ORDER BY "usagePercent" DESC;
```

### ⚠️ **التجار القريبون من الحدود المخصصة:**

```sql
SELECT 
  m."businessName",
  cl."limitType",
  cl."currentUsage",
  cl."limitValue",
  ROUND((cl."currentUsage"::decimal / cl."limitValue") * 100, 2) as "usagePercent"
FROM "Merchant" m
JOIN "CustomLimits" cl ON cl."merchantId" = m.id
WHERE cl."isActive" = true
  AND (cl."currentUsage"::decimal / cl."limitValue") > 0.8
ORDER BY "usagePercent" DESC;
```

### 📈 **إحصائيات الحدود المخصصة:**

```sql
SELECT 
  "limitType",
  COUNT(*) as "totalMerchants",
  AVG("currentUsage") as "avgUsage",
  AVG("limitValue") as "avgLimit",
  COUNT(CASE WHEN "currentUsage" >= "limitValue" THEN 1 END) as "exceededLimits"
FROM "CustomLimits"
WHERE "isActive" = true
GROUP BY "limitType"
ORDER BY "totalMerchants" DESC;
```

---

## 🎛️ إدارة الحدود المخصصة من Supabase

### ✅ **تفعيل حد مخصص:**

```sql
UPDATE "CustomLimits"
SET "isActive" = true
WHERE "merchantId" = 'merchant_id_here'
  AND "limitType" = 'api_calls';
```

### ❌ **تعطيل حد مخصص:**

```sql
UPDATE "CustomLimits"
SET "isActive" = false
WHERE "merchantId" = 'merchant_id_here'
  AND "limitType" = 'file_uploads';
```

### 📈 **زيادة حد مخصص:**

```sql
UPDATE "CustomLimits"
SET 
  "limitValue" = "limitValue" + 1000,
  "updatedAt" = NOW()
WHERE "merchantId" = 'merchant_id_here'
  AND "limitType" = 'api_calls';
```

### 🔄 **إعادة تعيين استخدام:**

```sql
UPDATE "CustomLimits"
SET 
  "currentUsage" = 0,
  "lastReset" = NOW(),
  "updatedAt" = NOW()
WHERE "merchantId" = 'merchant_id_here'
  AND "limitType" = 'model_training';
```

---

## 🔧 دمج الحدود المخصصة في الكود

### 🛠️ **في API route:**

```typescript
// app/api/custom-action/route.ts
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const { merchantId, actionType } = await request.json();
  
  // فحص الحد المخصص
  const { data: canProceed } = await supabase
    .rpc('check_custom_limit', {
      merchant_id: merchantId,
      limit_type: actionType,
      increment_by: 1
    });
    
  if (!canProceed) {
    return Response.json({
      error: 'تم تجاوز الحد المسموح لهذا الإجراء'
    }, { status: 403 });
  }
  
  // تنفيذ الإجراء هنا...
  
  // تحديث الاستخدام
  await supabase.rpc('increment_custom_limit', {
    merchant_id: merchantId,
    limit_type: actionType,
    increment_by: 1
  });
  
  return Response.json({ success: true });
}
```

### 🎯 **في صفحة التاجر:**

```typescript
// components/CustomLimitsDisplay.tsx
'use client';

export default function CustomLimitsDisplay({ merchantId }: { merchantId: string }) {
  const [limits, setLimits] = useState([]);
  
  useEffect(() => {
    fetchCustomLimits();
  }, [merchantId]);
  
  const fetchCustomLimits = async () => {
    const { data } = await supabase
      .from('CustomLimits')
      .select('*')
      .eq('merchantId', merchantId)
      .eq('isActive', true);
      
    setLimits(data || []);
  };
  
  return (
    <div className="space-y-4">
      {limits.map((limit) => (
        <div key={limit.limitType} className="border rounded p-4">
          <h3>{limit.description}</h3>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${(limit.currentUsage / limit.limitValue) * 100}%` 
              }}
            />
          </div>
          <p>{limit.currentUsage} / {limit.limitValue}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## 📋 مهام الصيانة المجدولة

### ⏰ **تشغيل يومي:**

```sql
-- إعادة تعيين الحدود اليومية
SELECT reset_custom_limits('daily');
```

### 📅 **تشغيل أسبوعي:**

```sql
-- إعادة تعيين الحدود الأسبوعية
SELECT reset_custom_limits('weekly');
```

### 📆 **تشغيل شهري:**

```sql
-- إعادة تعيين الحدود الشهرية
SELECT reset_custom_limits('monthly');
```

---

## 🎯 الخلاصة

### ✅ **الآن يمكنك إنشاء حدود مخصصة لـ:**

1. **📁 الملفات المرفوعة** - يومي/شهري
2. **🔌 API calls** - استدعاءات البرمجة
3. **🤖 تدريب النماذج** - عدد مرات التدريب
4. **📊 التقارير المتقدمة** - عدد التقارير
5. **🔗 التكاملات** - عدد التكاملات الخارجية
6. **💾 حجم البيانات** - حجم قاعدة المعرفة
7. **⏰ ساعات العمل** - قيود زمنية
8. **🚫 المحتوى المحظور** - فلترة الكلمات

### 🚀 **المرونة الكاملة:**

- **📝 حدود ديناميكية** قابلة للتخصيص
- **⏰ فترات إعادة تعيين مرنة** (يومي/أسبوعي/شهري)
- **📊 مراقبة شاملة** لجميع الحدود
- **🔧 إدارة سهلة** من Supabase Dashboard
- **💻 تكامل برمجي** مع الـ APIs

**أنت الآن تملك نظام حدود لا محدود! 🎛️** 