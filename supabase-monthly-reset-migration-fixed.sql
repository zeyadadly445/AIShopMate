-- إضافة حقل lastReset لجدول الاشتراكات
ALTER TABLE "Subscription" 
ADD COLUMN IF NOT EXISTS "lastReset" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- تحديث السجلات الموجودة لتعيين lastReset إلى تاريخ الإنشاء
UPDATE "Subscription" 
SET "lastReset" = "createdAt" 
WHERE "lastReset" IS NULL;

-- التأكد من أن جميع السجلات لديها قيمة lastReset
UPDATE "Subscription" 
SET "lastReset" = CURRENT_TIMESTAMP 
WHERE "lastReset" IS NULL;

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS "idx_subscription_last_reset" ON "Subscription" ("lastReset");
CREATE INDEX IF NOT EXISTS "idx_subscription_status_last_reset" ON "Subscription" ("status", "lastReset");

-- إظهار ملخص للاشتراكات
SELECT 
  COUNT(*) as total_subscriptions,
  COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_subscriptions,
  COUNT(CASE WHEN status = 'TRIAL' THEN 1 END) as trial_subscriptions,
  COUNT(CASE WHEN "lastReset" IS NOT NULL THEN 1 END) as with_last_reset
FROM "Subscription";

-- إظهار الاشتراكات التي تحتاج تجديد (30+ يوم)
SELECT 
  s.id,
  m."businessName",
  m.email,
  s.plan,
  s.status,
  s."messagesUsed",
  s."messagesLimit",
  s."lastReset",
  EXTRACT(days FROM (CURRENT_TIMESTAMP - s."lastReset")) as days_since_reset
FROM "Subscription" s
JOIN "Merchant" m ON s."merchantId" = m.id
WHERE s."lastReset" IS NOT NULL 
  AND EXTRACT(days FROM (CURRENT_TIMESTAMP - s."lastReset")) >= 30
ORDER BY s."lastReset" ASC
LIMIT 10; 