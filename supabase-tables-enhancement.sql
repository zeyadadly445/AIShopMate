-- ========================================
-- 🚀 تحسينات شاملة لجداول AI Shop Mate
-- ========================================
-- 
-- هذا الملف يضيف جميع التحسينات المطلوبة للتحكم الكامل بالتجار
-- قم بتشغيله في SQL Editor في Supabase Dashboard
-- 
-- ========================================

-- 1. تحسين جدول Merchant
-- ========================================

-- إضافة حقول التحكم والإدارة
ALTER TABLE "Merchant" 
ADD COLUMN IF NOT EXISTS "isActive" boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS "adminNotes" text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "timezone" text DEFAULT 'Asia/Riyadh',
ADD COLUMN IF NOT EXISTS "language" text DEFAULT 'ar',
ADD COLUMN IF NOT EXISTS "maxDailyMessages" integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS "allowedDomains" text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "webhookUrl" text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "lastLoginAt" timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "ipWhitelist" text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "customCss" text DEFAULT NULL;

-- إضافة فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_merchant_active ON "Merchant"("isActive");
CREATE INDEX IF NOT EXISTS idx_merchant_last_login ON "Merchant"("lastLoginAt");
CREATE INDEX IF NOT EXISTS idx_merchant_created ON "Merchant"("createdAt");

-- ========================================
-- 2. تحسين جدول Subscription
-- ========================================

-- إضافة حقول الفوترة والتحكم المتقدم
ALTER TABLE "Subscription"
ADD COLUMN IF NOT EXISTS "pricePerMonth" decimal(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS "billingCycle" text DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS "nextBillingDate" timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "autoRenew" boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS "discountPercent" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "customLimits" jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "features" text[] DEFAULT ARRAY['basic_chat'],
ADD COLUMN IF NOT EXISTS "suspendReason" text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "trialDaysLeft" integer DEFAULT 7;

-- إضافة فهارس للفوترة والبحث
CREATE INDEX IF NOT EXISTS idx_subscription_billing_date ON "Subscription"("nextBillingDate");
CREATE INDEX IF NOT EXISTS idx_subscription_trial ON "Subscription"("trialDaysLeft") WHERE "trialDaysLeft" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscription_auto_renew ON "Subscription"("autoRenew");
CREATE INDEX IF NOT EXISTS idx_subscription_price ON "Subscription"("pricePerMonth");

-- ========================================
-- 3. جدول Analytics للإحصائيات
-- ========================================

CREATE TABLE IF NOT EXISTS "MerchantAnalytics" (
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
  "apiCalls" integer DEFAULT 0,
  "dataUsageMB" decimal(10,2) DEFAULT 0.00,
  "peakHourUsage" integer DEFAULT 0,
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now(),
  
  CONSTRAINT "MerchantAnalytics_pkey" PRIMARY KEY (id),
  CONSTRAINT "MerchantAnalytics_unique" UNIQUE ("merchantId", "date"),
  CONSTRAINT "MerchantAnalytics_merchantId_fkey" 
    FOREIGN KEY ("merchantId") REFERENCES "Merchant"(id) ON DELETE CASCADE
);

-- فهارس للتحليل والبحث السريع
CREATE INDEX IF NOT EXISTS idx_analytics_date ON "MerchantAnalytics"("date");
CREATE INDEX IF NOT EXISTS idx_analytics_merchant_date ON "MerchantAnalytics"("merchantId", "date");
CREATE INDEX IF NOT EXISTS idx_analytics_messages ON "MerchantAnalytics"("totalMessages");
CREATE INDEX IF NOT EXISTS idx_analytics_errors ON "MerchantAnalytics"("errorCount");

-- إضافة trigger للتحديث التلقائي
CREATE OR REPLACE FUNCTION update_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS update_analytics_updated_at
    BEFORE UPDATE ON "MerchantAnalytics"
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_updated_at();

-- ========================================
-- 4. جدول Audit Log لتتبع التغييرات
-- ========================================

CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  "adminUser" text NOT NULL DEFAULT 'system',
  "targetTable" text NOT NULL,
  "targetId" text NOT NULL,
  "action" text NOT NULL, -- INSERT, UPDATE, DELETE, SUSPEND, ACTIVATE, LOGIN
  "oldValues" jsonb DEFAULT NULL,
  "newValues" jsonb DEFAULT NULL,
  "reason" text DEFAULT NULL,
  "ipAddress" text DEFAULT NULL,
  "userAgent" text DEFAULT NULL,
  "sessionId" text DEFAULT NULL,
  "severity" text DEFAULT 'INFO', -- INFO, WARNING, ERROR, CRITICAL
  "createdAt" timestamp with time zone DEFAULT now(),
  
  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY (id)
);

-- فهارس للبحث السريع في السجل
CREATE INDEX IF NOT EXISTS idx_audit_target ON "AdminAuditLog"("targetTable", "targetId");
CREATE INDEX IF NOT EXISTS idx_audit_admin ON "AdminAuditLog"("adminUser");
CREATE INDEX IF NOT EXISTS idx_audit_date ON "AdminAuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS idx_audit_action ON "AdminAuditLog"("action");
CREATE INDEX IF NOT EXISTS idx_audit_severity ON "AdminAuditLog"("severity");
CREATE INDEX IF NOT EXISTS idx_audit_session ON "AdminAuditLog"("sessionId");

-- ========================================
-- 5. جدول الفواتير والمدفوعات
-- ========================================

CREATE TABLE IF NOT EXISTS "Billing" (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  "merchantId" text NOT NULL,
  "subscriptionId" text NOT NULL,
  "amount" decimal(10,2) NOT NULL,
  "currency" text DEFAULT 'USD',
  "status" text DEFAULT 'pending', -- pending, paid, failed, refunded, cancelled
  "billingPeriodStart" timestamp with time zone NOT NULL,
  "billingPeriodEnd" timestamp with time zone NOT NULL,
  "invoiceNumber" text DEFAULT NULL,
  "paymentMethod" text DEFAULT NULL, -- card, bank_transfer, paypal, etc.
  "paymentDate" timestamp with time zone DEFAULT NULL,
  "dueDate" timestamp with time zone DEFAULT NULL,
  "notes" text DEFAULT NULL,
  "taxAmount" decimal(10,2) DEFAULT 0.00,
  "discountAmount" decimal(10,2) DEFAULT 0.00,
  "finalAmount" decimal(10,2) DEFAULT NULL,
  "paymentReference" text DEFAULT NULL,
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now(),
  
  CONSTRAINT "Billing_pkey" PRIMARY KEY (id),
  CONSTRAINT "Billing_merchantId_fkey" 
    FOREIGN KEY ("merchantId") REFERENCES "Merchant"(id) ON DELETE CASCADE,
  CONSTRAINT "Billing_subscriptionId_fkey" 
    FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"(id) ON DELETE CASCADE
);

-- فهارس للفوترة والتقارير المالية
CREATE INDEX IF NOT EXISTS idx_billing_merchant ON "Billing"("merchantId");
CREATE INDEX IF NOT EXISTS idx_billing_status ON "Billing"("status");
CREATE INDEX IF NOT EXISTS idx_billing_due_date ON "Billing"("dueDate");
CREATE INDEX IF NOT EXISTS idx_billing_payment_date ON "Billing"("paymentDate");
CREATE INDEX IF NOT EXISTS idx_billing_period ON "Billing"("billingPeriodStart", "billingPeriodEnd");
CREATE INDEX IF NOT EXISTS idx_billing_amount ON "Billing"("amount");

-- trigger للتحديث التلقائي
CREATE TRIGGER IF NOT EXISTS update_billing_updated_at
    BEFORE UPDATE ON "Billing"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 6. جدول إعدادات الشات بوت المتقدمة
-- ========================================

CREATE TABLE IF NOT EXISTS "ChatbotSettings" (
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
  "rateLimiting" jsonb DEFAULT '{"enabled": true, "maxMessagesPerMinute": 10, "maxMessagesPerHour": 100}',
  "customVariables" jsonb DEFAULT '{}',
  "integrations" jsonb DEFAULT '{"whatsapp": false, "telegram": false, "facebook": false}',
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now(),
  
  CONSTRAINT "ChatbotSettings_pkey" PRIMARY KEY (id),
  CONSTRAINT "ChatbotSettings_merchantId_key" UNIQUE ("merchantId"),
  CONSTRAINT "ChatbotSettings_merchantId_fkey" 
    FOREIGN KEY ("merchantId") REFERENCES "Merchant"(id) ON DELETE CASCADE
);

-- فهارس للإعدادات
CREATE INDEX IF NOT EXISTS idx_chatbot_settings_merchant ON "ChatbotSettings"("merchantId");
CREATE INDEX IF NOT EXISTS idx_chatbot_settings_model ON "ChatbotSettings"("aiModel");

-- trigger للتحديث التلقائي
CREATE TRIGGER IF NOT EXISTS update_chatbot_settings_updated_at
    BEFORE UPDATE ON "ChatbotSettings"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 7. جدول التنبيهات والإشعارات
-- ========================================

CREATE TABLE IF NOT EXISTS "AdminNotifications" (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  "type" text NOT NULL, -- system, billing, usage, error, security
  "title" text NOT NULL,
  "message" text NOT NULL,
  "merchantId" text DEFAULT NULL,
  "severity" text DEFAULT 'INFO', -- INFO, WARNING, ERROR, CRITICAL
  "isRead" boolean DEFAULT false,
  "actionRequired" boolean DEFAULT false,
  "actionUrl" text DEFAULT NULL,
  "metadata" jsonb DEFAULT '{}',
  "expiresAt" timestamp with time zone DEFAULT NULL,
  "createdAt" timestamp with time zone DEFAULT now(),
  
  CONSTRAINT "AdminNotifications_pkey" PRIMARY KEY (id),
  CONSTRAINT "AdminNotifications_merchantId_fkey" 
    FOREIGN KEY ("merchantId") REFERENCES "Merchant"(id) ON DELETE CASCADE
);

-- فهارس للتنبيهات
CREATE INDEX IF NOT EXISTS idx_notifications_type ON "AdminNotifications"("type");
CREATE INDEX IF NOT EXISTS idx_notifications_severity ON "AdminNotifications"("severity");
CREATE INDEX IF NOT EXISTS idx_notifications_read ON "AdminNotifications"("isRead");
CREATE INDEX IF NOT EXISTS idx_notifications_merchant ON "AdminNotifications"("merchantId");
CREATE INDEX IF NOT EXISTS idx_notifications_expires ON "AdminNotifications"("expiresAt");
CREATE INDEX IF NOT EXISTS idx_notifications_created ON "AdminNotifications"("createdAt");

-- ========================================
-- 8. إضافة بيانات افتراضية مفيدة
-- ========================================

-- إضافة إعدادات افتراضية للتجار الموجودين
INSERT INTO "ChatbotSettings" ("merchantId")
SELECT id FROM "Merchant" 
WHERE id NOT IN (SELECT "merchantId" FROM "ChatbotSettings");

-- تحديث التجار ليكونوا نشطين بشكل افتراضي
UPDATE "Merchant" 
SET "isActive" = true 
WHERE "isActive" IS NULL;

-- تحديث الاشتراكات بالميزات الأساسية
UPDATE "Subscription" 
SET "features" = ARRAY['basic_chat'], "autoRenew" = true 
WHERE "features" IS NULL;

-- ========================================
-- 9. Views مفيدة للتقارير
-- ========================================

-- عرض شامل للتجار مع إحصائياتهم
CREATE OR REPLACE VIEW "MerchantOverview" AS
SELECT 
  m.id,
  m.email,
  m."businessName",
  m."isActive",
  m."createdAt",
  m."lastLoginAt",
  s.plan,
  s.status,
  s."messagesLimit",
  s."messagesUsed",
  ROUND((s."messagesUsed"::decimal / s."messagesLimit") * 100, 2) as "usagePercentage",
  s."pricePerMonth",
  s."nextBillingDate",
  s."autoRenew",
  COALESCE(ma."totalMessages", 0) as "todayMessages",
  COALESCE(ma."totalConversations", 0) as "todayConversations"
FROM "Merchant" m
LEFT JOIN "Subscription" s ON s."merchantId" = m.id
LEFT JOIN "MerchantAnalytics" ma ON ma."merchantId" = m.id AND ma."date" = CURRENT_DATE;

-- عرض للفواتير المعلقة
CREATE OR REPLACE VIEW "PendingBills" AS
SELECT 
  b.*,
  m."businessName",
  m.email,
  EXTRACT(DAYS FROM (b."dueDate" - CURRENT_DATE)) as "daysUntilDue"
FROM "Billing" b
JOIN "Merchant" m ON m.id = b."merchantId"
WHERE b.status = 'pending' AND b."dueDate" >= CURRENT_DATE
ORDER BY b."dueDate" ASC;

-- عرض للتحليلات الشهرية
CREATE OR REPLACE VIEW "MonthlyAnalytics" AS
SELECT 
  m.id as "merchantId",
  m."businessName",
  DATE_TRUNC('month', ma."date") as "month",
  SUM(ma."totalMessages") as "monthlyMessages",
  SUM(ma."totalConversations") as "monthlyConversations",
  AVG(ma."avgResponseTime") as "avgResponseTime",
  SUM(ma."errorCount") as "totalErrors",
  AVG(ma."uptime") as "avgUptime"
FROM "Merchant" m
LEFT JOIN "MerchantAnalytics" ma ON ma."merchantId" = m.id
WHERE ma."date" >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '6 months')
GROUP BY m.id, m."businessName", DATE_TRUNC('month', ma."date")
ORDER BY "month" DESC, m."businessName";

-- ========================================
-- 10. Functions مفيدة
-- ========================================

-- دالة لحساب الإيرادات الشهرية
CREATE OR REPLACE FUNCTION calculate_monthly_revenue(target_month date DEFAULT CURRENT_DATE)
RETURNS decimal AS $$
DECLARE
  total_revenue decimal := 0;
BEGIN
  SELECT COALESCE(SUM(s."pricePerMonth"), 0)
  INTO total_revenue
  FROM "Subscription" s
  WHERE s.status = 'ACTIVE' 
  AND DATE_TRUNC('month', target_month) BETWEEN s."startDate" AND COALESCE(s."endDate", '2099-12-31');
  
  RETURN total_revenue;
END;
$$ LANGUAGE plpgsql;

-- دالة لتعطيل التجار المتأخرين في الدفع
CREATE OR REPLACE FUNCTION suspend_overdue_merchants()
RETURNS integer AS $$
DECLARE
  suspended_count integer := 0;
BEGIN
  -- تعطيل التجار الذين لديهم فواتير متأخرة أكثر من 7 أيام
  UPDATE "Merchant" 
  SET "isActive" = false
  WHERE id IN (
    SELECT DISTINCT b."merchantId"
    FROM "Billing" b
    WHERE b.status = 'pending' 
    AND b."dueDate" < CURRENT_DATE - INTERVAL '7 days'
  ) AND "isActive" = true;
  
  GET DIAGNOSTICS suspended_count = ROW_COUNT;
  
  -- إضافة سجل في Audit Log
  INSERT INTO "AdminAuditLog" (
    "adminUser", "targetTable", "targetId", "action", "reason"
  )
  SELECT 
    'system', 'Merchant', m.id, 'SUSPEND', 'Overdue payment - automated suspension'
  FROM "Merchant" m
  JOIN "Billing" b ON b."merchantId" = m.id
  WHERE b.status = 'pending' 
  AND b."dueDate" < CURRENT_DATE - INTERVAL '7 days'
  AND m."isActive" = false;
  
  RETURN suspended_count;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 11. تنبيه النجاح
-- ========================================

-- إضافة تنبيه نجاح العملية
INSERT INTO "AdminNotifications" (
  "type", "title", "message", "severity"
) VALUES (
  'system', 
  'تم تطبيق التحسينات بنجاح', 
  'تم إضافة جميع التحسينات والجداول الجديدة بنجاح. النظام جاهز الآن للتحكم الكامل بالتجار.', 
  'INFO'
);

-- ========================================
-- 🎉 انتهت التحسينات بنجاح!
-- ========================================
-- 
-- تم إضافة:
-- ✅ حقول التحكم في جدول Merchant (isActive, adminNotes, إلخ)
-- ✅ حقول الفوترة في جدول Subscription  
-- ✅ جدول MerchantAnalytics للإحصائيات
-- ✅ جدول AdminAuditLog لتتبع التغييرات
-- ✅ جدول Billing للفواتير
-- ✅ جدول ChatbotSettings للإعدادات المتقدمة
-- ✅ جدول AdminNotifications للتنبيهات
-- ✅ Views مفيدة للتقارير
-- ✅ Functions للعمليات التلقائية
-- ✅ فهارس محسنة للأداء
-- 
-- يمكنك الآن التحكم الكامل في:
-- 🎯 تفعيل/تعطيل التجار
-- 💰 إدارة الفواتير والاشتراكات  
-- 📊 مراقبة الإحصائيات والأداء
-- 🔍 تتبع جميع التغييرات
-- ⚙️ تخصيص إعدادات الشات بوت
-- 🔔 استقبال التنبيهات المهمة
-- 
-- ======================================== 