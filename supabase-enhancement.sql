-- 🚀 تحسينات شاملة لجداول AI Shop Mate
-- تشغيل هذا الملف في SQL Editor في Supabase

-- 1. تحسين جدول Merchant
ALTER TABLE "Merchant" 
ADD COLUMN IF NOT EXISTS "isActive" boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS "adminNotes" text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "timezone" text DEFAULT 'Asia/Riyadh',
ADD COLUMN IF NOT EXISTS "language" text DEFAULT 'ar',
ADD COLUMN IF NOT EXISTS "maxDailyMessages" integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS "allowedDomains" text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "webhookUrl" text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "lastLoginAt" timestamp with time zone DEFAULT NULL;

-- 2. تحسين جدول Subscription
ALTER TABLE "Subscription"
ADD COLUMN IF NOT EXISTS "pricePerMonth" decimal(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS "autoRenew" boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS "discountPercent" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "customLimits" jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "features" text[] DEFAULT ARRAY['basic_chat'],
ADD COLUMN IF NOT EXISTS "suspendReason" text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "nextBillingDate" timestamp with time zone DEFAULT NULL;

-- 3. إنشاء فهارس جديدة
CREATE INDEX IF NOT EXISTS idx_merchant_active ON "Merchant"("isActive");
CREATE INDEX IF NOT EXISTS idx_subscription_billing ON "Subscription"("nextBillingDate");

-- 4. إنشاء جدول Analytics
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

-- 5. إنشاء جدول Audit Log
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

-- 6. إضافة فهارس للجداول الجديدة
CREATE INDEX IF NOT EXISTS idx_analytics_date ON "MerchantAnalytics"("date");
CREATE INDEX IF NOT EXISTS idx_audit_target ON "AdminAuditLog"("targetTable", "targetId");
CREATE INDEX IF NOT EXISTS idx_audit_date ON "AdminAuditLog"("createdAt");

-- 7. تحديث البيانات الموجودة
UPDATE "Merchant" SET "isActive" = true WHERE "isActive" IS NULL;
UPDATE "Subscription" SET "autoRenew" = true WHERE "autoRenew" IS NULL;

-- ✅ تم تطبيق جميع التحسينات بنجاح! 