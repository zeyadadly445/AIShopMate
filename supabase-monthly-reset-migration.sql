-- إضافة حقل lastReset لجدول الاشتراكات
ALTER TABLE "Subscription" 
ADD COLUMN IF NOT EXISTS "last_reset" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- تحديث السجلات الموجودة لتعيين last_reset إلى تاريخ الإنشاء
UPDATE "Subscription" 
SET "last_reset" = "created_at" 
WHERE "last_reset" IS NULL;

-- التأكد من أن جميع السجلات لديها قيمة lastReset
UPDATE "Subscription" 
SET "last_reset" = CURRENT_TIMESTAMP 
WHERE "last_reset" IS NULL;

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS "idx_subscription_last_reset" ON "Subscription" ("last_reset");
CREATE INDEX IF NOT EXISTS "idx_subscription_status_last_reset" ON "Subscription" ("status", "last_reset");

-- إظهار ملخص للاشتراكات
SELECT 
  COUNT(*) as total_subscriptions,
  COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_subscriptions,
  COUNT(CASE WHEN status = 'TRIAL' THEN 1 END) as trial_subscriptions,
  COUNT(CASE WHEN last_reset IS NOT NULL THEN 1 END) as with_last_reset
FROM "Subscription";

-- إظهار الاشتراكات التي تحتاج تجديد (30+ يوم)
SELECT 
  s.id,
  m.business_name,
  m.email,
  s.plan,
  s.status,
  s.messages_used,
  s.messages_limit,
  s.last_reset,
  EXTRACT(days FROM (CURRENT_TIMESTAMP - s.last_reset)) as days_since_reset
FROM "Subscription" s
JOIN "Merchant" m ON s.merchant_id = m.id
WHERE EXTRACT(days FROM (CURRENT_TIMESTAMP - s.last_reset)) >= 30
ORDER BY s.last_reset ASC
LIMIT 10; 