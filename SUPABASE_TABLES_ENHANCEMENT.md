# 🛠️ تحسينات الجداول للتحكم الكامل بالتجار

## 📊 تحليل الجداول الحالية

### ✅ **ما هو جيد في البنية الحالية:**
- بنية أساسية قوية لجدولي `Merchant` و `Subscription`
- علاقات صحيحة مع CASCADE DELETE
- فهارس مناسبة لـ `lastReset` و `status`
- تواريخ الإنشاء والتحديث التلقائية
- معرفات فريدة للبريد الإلكتروني و `chatbotId`

### ⚠️ **ما ينقص للتحكم الكامل:**
- حقل تفعيل/تعطيل الحساب
- إدارة الملاحظات الإدارية
- تتبع النشاط والاستخدام
- إدارة الفواتير والمدفوعات
- تخصيصات متقدمة للشات بوت
- سجل التغييرات (Audit Log)

---

## 🚀 التحسينات المطلوبة

### 1. **تحسين جدول Merchant**

```sql
-- إضافة حقول مهمة لجدول Merchant
ALTER TABLE "Merchant" 
ADD COLUMN "isActive" boolean DEFAULT true,
ADD COLUMN "adminNotes" text DEFAULT NULL,
ADD COLUMN "timezone" text DEFAULT 'Asia/Riyadh',
ADD COLUMN "language" text DEFAULT 'ar',
ADD COLUMN "maxDailyMessages" integer DEFAULT 100,
ADD COLUMN "allowedDomains" text[] DEFAULT NULL,
ADD COLUMN "webhookUrl" text DEFAULT NULL,
ADD COLUMN "customCss" text DEFAULT NULL,
ADD COLUMN "lastLoginAt" timestamp with time zone DEFAULT NULL,
ADD COLUMN "ipWhitelist" text[] DEFAULT NULL;

-- إضافة فهارس للأداء
CREATE INDEX idx_merchant_active ON "Merchant"("isActive");
CREATE INDEX idx_merchant_last_login ON "Merchant"("lastLoginAt");
```

### 2. **تحسين جدول Subscription**

```sql
-- إضافة حقول للفوترة والتحكم المتقدم
ALTER TABLE "Subscription"
ADD COLUMN "pricePerMonth" decimal(10,2) DEFAULT 0.00,
ADD COLUMN "currency" text DEFAULT 'USD',
ADD COLUMN "billingCycle" text DEFAULT 'monthly',
ADD COLUMN "nextBillingDate" timestamp with time zone DEFAULT NULL,
ADD COLUMN "autoRenew" boolean DEFAULT true,
ADD COLUMN "discountPercent" integer DEFAULT 0,
ADD COLUMN "customLimits" jsonb DEFAULT '{}',
ADD COLUMN "features" text[] DEFAULT ARRAY['basic_chat'],
ADD COLUMN "suspendReason" text DEFAULT NULL,
ADD COLUMN "trialDaysLeft" integer DEFAULT 7;

-- إضافة فهارس
CREATE INDEX idx_subscription_billing_date ON "Subscription"("nextBillingDate");
CREATE INDEX idx_subscription_trial ON "Subscription"("trialDaysLeft") WHERE "trialDaysLeft" IS NOT NULL;
```

### 3. **جدول جديد: Analytics**

```sql
-- جدول تتبع الاستخدام والإحصائيات
CREATE TABLE "MerchantAnalytics" (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  "merchantId" text NOT NULL,
  "date" date NOT NULL DEFAULT CURRENT_DATE,
  "totalConversations" integer DEFAULT 0,
  "totalMessages" integer DEFAULT 0,
  "uniqueUsers" integer DEFAULT 0,
  "avgResponseTime" decimal(5,2) DEFAULT 0.00,
  "satisfactionScore" decimal(3,2) DEFAULT 0.00,
  "errorCount" integer DEFAULT 0,
  "uptime" decimal(5,2) DEFAULT 100.00,
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now(),
  
  CONSTRAINT "MerchantAnalytics_pkey" PRIMARY KEY (id),
  CONSTRAINT "MerchantAnalytics_unique" UNIQUE ("merchantId", "date"),
  CONSTRAINT "MerchantAnalytics_merchantId_fkey" 
    FOREIGN KEY ("merchantId") REFERENCES "Merchant"(id) ON DELETE CASCADE
);

-- فهارس للتحليل
CREATE INDEX idx_analytics_date ON "MerchantAnalytics"("date");
CREATE INDEX idx_analytics_merchant_date ON "MerchantAnalytics"("merchantId", "date");
```

### 4. **جدول سجل التغييرات (Audit Log)**

```sql
-- جدول تتبع جميع التغييرات الإدارية
CREATE TABLE "AdminAuditLog" (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  "adminUser" text NOT NULL DEFAULT 'system',
  "targetTable" text NOT NULL,
  "targetId" text NOT NULL,
  "action" text NOT NULL, -- INSERT, UPDATE, DELETE, SUSPEND, ACTIVATE
  "oldValues" jsonb DEFAULT NULL,
  "newValues" jsonb DEFAULT NULL,
  "reason" text DEFAULT NULL,
  "ipAddress" text DEFAULT NULL,
  "userAgent" text DEFAULT NULL,
  "createdAt" timestamp with time zone DEFAULT now(),
  
  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY (id)
);

-- فهارس للبحث السريع
CREATE INDEX idx_audit_target ON "AdminAuditLog"("targetTable", "targetId");
CREATE INDEX idx_audit_admin ON "AdminAuditLog"("adminUser");
CREATE INDEX idx_audit_date ON "AdminAuditLog"("createdAt");
CREATE INDEX idx_audit_action ON "AdminAuditLog"("action");
```

### 5. **جدول إدارة الفواتير**

```sql
-- جدول الفواتير والمدفوعات
CREATE TABLE "Billing" (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  "merchantId" text NOT NULL,
  "subscriptionId" text NOT NULL,
  "amount" decimal(10,2) NOT NULL,
  "currency" text DEFAULT 'USD',
  "status" text DEFAULT 'pending', -- pending, paid, failed, refunded
  "billingPeriodStart" timestamp with time zone NOT NULL,
  "billingPeriodEnd" timestamp with time zone NOT NULL,
  "invoiceNumber" text DEFAULT NULL,
  "paymentMethod" text DEFAULT NULL,
  "paymentDate" timestamp with time zone DEFAULT NULL,
  "dueDate" timestamp with time zone DEFAULT NULL,
  "notes" text DEFAULT NULL,
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now(),
  
  CONSTRAINT "Billing_pkey" PRIMARY KEY (id),
  CONSTRAINT "Billing_merchantId_fkey" 
    FOREIGN KEY ("merchantId") REFERENCES "Merchant"(id) ON DELETE CASCADE,
  CONSTRAINT "Billing_subscriptionId_fkey" 
    FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"(id) ON DELETE CASCADE
);

-- فهارس للفوترة
CREATE INDEX idx_billing_merchant ON "Billing"("merchantId");
CREATE INDEX idx_billing_status ON "Billing"("status");
CREATE INDEX idx_billing_due_date ON "Billing"("dueDate");
```

### 6. **جدول الإعدادات المتقدمة**

```sql
-- جدول إعدادات الشات بوت المتقدمة
CREATE TABLE "ChatbotSettings" (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  "merchantId" text NOT NULL,
  "aiModel" text DEFAULT 'gpt-3.5-turbo',
  "temperature" decimal(3,2) DEFAULT 0.7,
  "maxTokens" integer DEFAULT 1000,
  "responseDelay" integer DEFAULT 1000, -- milliseconds
  "workingHours" jsonb DEFAULT '{"enabled": false, "timezone": "Asia/Riyadh", "hours": {"monday": {"start": "09:00", "end": "17:00"}}}',
  "autoResponses" jsonb DEFAULT '{}',
  "bannedWords" text[] DEFAULT ARRAY[]::text[],
  "enableProfanityFilter" boolean DEFAULT true,
  "enableSentimentAnalysis" boolean DEFAULT false,
  "enableTranslation" boolean DEFAULT false,
  "supportedLanguages" text[] DEFAULT ARRAY['ar', 'en'],
  "fallbackMessage" text DEFAULT 'عذراً، لم أفهم طلبك. يرجى إعادة الصياغة.',
  "escalationKeywords" text[] DEFAULT ARRAY['مدير', 'شكوى', 'مشكلة'],
  "escalationMessage" text DEFAULT 'سأقوم بتحويلك إلى أحد ممثلي خدمة العملاء.',
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now(),
  
  CONSTRAINT "ChatbotSettings_pkey" PRIMARY KEY (id),
  CONSTRAINT "ChatbotSettings_merchantId_key" UNIQUE ("merchantId"),
  CONSTRAINT "ChatbotSettings_merchantId_fkey" 
    FOREIGN KEY ("merchantId") REFERENCES "Merchant"(id) ON DELETE CASCADE
);
```

---

## 🎯 حقول مفيدة جديدة في الجداول

### 📋 **في جدول Merchant:**
- `isActive` - تفعيل/تعطيل فوري للحساب
- `adminNotes` - ملاحظات إدارية خاصة
- `timezone` - المنطقة الزمنية للتاجر
- `maxDailyMessages` - حد يومي إضافي للرسائل
- `allowedDomains` - نطاقات مسموحة لاستخدام الشات بوت
- `webhookUrl` - لإرسال إشعارات للتاجر
- `lastLoginAt` - آخر تسجيل دخول

### 💳 **في جدول Subscription:**
- `pricePerMonth` - السعر الشهري
- `autoRenew` - التجديد التلقائي
- `discountPercent` - نسبة الخصم
- `customLimits` - حدود مخصصة بصيغة JSON
- `features` - الميزات المتاحة لكل خطة
- `suspendReason` - سبب التعليق

---

## 🛠️ تطبيق التحسينات

### 1. **نسخ الملف الكامل للتطبيق:**

```sql
-- تشغيل هذا الملف في SQL Editor في Supabase
-- سيضيف جميع التحسينات دفعة واحدة

-- تحسين جدول Merchant
ALTER TABLE "Merchant" 
ADD COLUMN IF NOT EXISTS "isActive" boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS "adminNotes" text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "timezone" text DEFAULT 'Asia/Riyadh',
ADD COLUMN IF NOT EXISTS "language" text DEFAULT 'ar',
ADD COLUMN IF NOT EXISTS "maxDailyMessages" integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS "allowedDomains" text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "webhookUrl" text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "lastLoginAt" timestamp with time zone DEFAULT NULL;

-- تحسين جدول Subscription  
ALTER TABLE "Subscription"
ADD COLUMN IF NOT EXISTS "pricePerMonth" decimal(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS "autoRenew" boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS "discountPercent" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "customLimits" jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "features" text[] DEFAULT ARRAY['basic_chat'],
ADD COLUMN IF NOT EXISTS "suspendReason" text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "nextBillingDate" timestamp with time zone DEFAULT NULL;

-- إنشاء فهارس جديدة
CREATE INDEX IF NOT EXISTS idx_merchant_active ON "Merchant"("isActive");
CREATE INDEX IF NOT EXISTS idx_subscription_billing ON "Subscription"("nextBillingDate");

-- إنشاء جدول Analytics
CREATE TABLE IF NOT EXISTS "MerchantAnalytics" (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  "merchantId" text NOT NULL,
  "date" date NOT NULL DEFAULT CURRENT_DATE,
  "totalConversations" integer DEFAULT 0,
  "totalMessages" integer DEFAULT 0,
  "uniqueUsers" integer DEFAULT 0,
  "avgResponseTime" decimal(5,2) DEFAULT 0.00,
  "errorCount" integer DEFAULT 0,
  "uptime" decimal(5,2) DEFAULT 100.00,
  "createdAt" timestamp with time zone DEFAULT now(),
  
  CONSTRAINT "MerchantAnalytics_pkey" PRIMARY KEY (id),
  CONSTRAINT "MerchantAnalytics_unique" UNIQUE ("merchantId", "date"),
  CONSTRAINT "MerchantAnalytics_merchantId_fkey" 
    FOREIGN KEY ("merchantId") REFERENCES "Merchant"(id) ON DELETE CASCADE
);

-- إنشاء جدول Audit Log
CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  "adminUser" text NOT NULL DEFAULT 'system',
  "targetTable" text NOT NULL,
  "targetId" text NOT NULL,
  "action" text NOT NULL,
  "oldValues" jsonb DEFAULT NULL,
  "newValues" jsonb DEFAULT NULL,
  "reason" text DEFAULT NULL,
  "ipAddress" text DEFAULT NULL,
  "createdAt" timestamp with time zone DEFAULT now(),
  
  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY (id)
);

-- إضافة فهارس للجداول الجديدة
CREATE INDEX IF NOT EXISTS idx_analytics_date ON "MerchantAnalytics"("date");
CREATE INDEX IF NOT EXISTS idx_audit_target ON "AdminAuditLog"("targetTable", "targetId");
CREATE INDEX IF NOT EXISTS idx_audit_date ON "AdminAuditLog"("createdAt");
```

---

## 🎯 الميزات الجديدة بعد التحسين

### 🔥 **تحكم كامل بالتجار:**
- ✅ تفعيل/تعطيل فوري عبر `isActive`
- ✅ ملاحظات إدارية لكل تاجر
- ✅ حدود يومية مخصصة
- ✅ قيود النطاقات المسموحة
- ✅ تتبع آخر تسجيل دخول

### 💰 **إدارة مالية متقدمة:**
- ✅ تتبع الأسعار والعملات
- ✅ إدارة الخصومات
- ✅ التجديد التلقائي
- ✅ تواريخ الفوترة

### 📊 **تحليلات وإحصائيات:**
- ✅ إحصائيات يومية تلقائية
- ✅ تتبع الأداء والأخطاء
- ✅ قياس رضا العملاء
- ✅ مراقبة وقت التشغيل

### 🔍 **مراجعة التغييرات:**
- ✅ سجل كامل لجميع التعديلات
- ✅ تتبع من قام بأي تغيير
- ✅ أسباب التعديلات
- ✅ تواريخ دقيقة لكل عملية

---

## 🚀 خطوات التطبيق

### 1. **في Supabase Dashboard:**
```
1. اذهب إلى SQL Editor
2. انسخ الكود أعلاه
3. انقر Execute
4. تأكد من تطبيق جميع التحسينات
```

### 2. **التحقق من النجاح:**
```
1. اذهب إلى Table Editor
2. تحقق من الحقول الجديدة في Merchant و Subscription
3. تأكد من وجود الجداول الجديدة: MerchantAnalytics, AdminAuditLog
```

### 3. **البدء في الاستخدام:**
```
1. جرب تعديل isActive لأي تاجر
2. أضف ملاحظات إدارية في adminNotes
3. راقب البيانات في جدول Analytics
4. تتبع التغييرات في Audit Log
```

---

## 🎊 النتيجة النهائية

بعد هذه التحسينات ستحصل على:

✅ **تحكم كامل 100%** في كل تاجر  
✅ **مراقبة شاملة** للاستخدام والأداء  
✅ **إدارة مالية احترافية** للاشتراكات  
✅ **شفافية كاملة** مع سجل التغييرات  
✅ **مرونة تامة** في التخصيص والقيود  
✅ **إحصائيات دقيقة** لاتخاذ القرارات  

🚀 **أقوى نظام إدارة ممكن لمنصة الشات بوت!** 