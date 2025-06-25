-- تنظيف قاعدة البيانات - حذف الجداول غير المستخدمة
-- هذا الملف اختياري - نفذه فقط إذا كنت تريد تبسيط قاعدة البيانات بالكامل

-- تحذير: هذا الملف سيحذف البيانات نهائياً!
-- تأكد من عمل نسخة احتياطية قبل التنفيذ

-- 1. حذف الجداول غير المستخدمة (اختياري)

-- حذف جدول DailyUsageStats (لم نعد نحتاجه)
DROP TABLE IF EXISTS "DailyUsageStats" CASCADE;

-- حذف جدول MerchantAnalytics (غير مستخدم في النظام المبسط)
DROP TABLE IF EXISTS "MerchantAnalytics" CASCADE;

-- حذف جدول Admin وما يتعلق به (إذا كنت لا تحتاج نظام إدارة منفصل)
DROP TABLE IF EXISTS "AdminAuditLog" CASCADE;
DROP TABLE IF EXISTS "Admin" CASCADE;
DROP SEQUENCE IF EXISTS "Admin_id_seq" CASCADE;

-- 2. حذف الـ Views غير المستخدمة
DROP VIEW IF EXISTS "MonthlyUsageStats" CASCADE;
DROP VIEW IF EXISTS "WeeklyUsageStats" CASCADE;

-- 3. حذف الدوال غير المستخدمة
DROP FUNCTION IF EXISTS get_merchant_daily_stats CASCADE;
DROP FUNCTION IF EXISTS get_merchant_monthly_stats CASCADE;
DROP FUNCTION IF EXISTS increment_daily_usage CASCADE;
DROP FUNCTION IF EXISTS update_daily_usage_updated_at CASCADE;
DROP FUNCTION IF EXISTS is_admin_user CASCADE;

-- 4. تنظيف الفهارس غير المستخدمة
DROP INDEX IF EXISTS "idx_daily_usage_merchant_date";
DROP INDEX IF EXISTS "idx_daily_usage_date";
DROP INDEX IF EXISTS "idx_analytics_date";
DROP INDEX IF EXISTS "idx_audit_date";
DROP INDEX IF EXISTS "idx_audit_target";
DROP INDEX IF EXISTS "idx_admin_admin_id";
DROP INDEX IF EXISTS "idx_admin_email";
DROP INDEX IF EXISTS "idx_admin_username";

-- 5. إضافة تعليق للتوضيح
COMMENT ON DATABASE postgres IS 'قاعدة بيانات مبسطة لنظام AI Shop Mate - جدولين أساسيين: Merchant و Subscription';

-- 6. تحسين أداء الجدولين المتبقيين
VACUUM ANALYZE "Merchant";
VACUUM ANALYZE "Subscription";
VACUUM ANALYZE "MerchantDataSource";

-- 7. إنشاء فهارس محسنة للنظام المبسط
CREATE INDEX IF NOT EXISTS "idx_merchant_active_email" ON "Merchant"("isActive", "email");
CREATE INDEX IF NOT EXISTS "idx_subscription_merchant_status" ON "Subscription"("merchantId", "status");
CREATE INDEX IF NOT EXISTS "idx_subscription_limits_usage" ON "Subscription"("dailyMessagesUsed", "messagesUsed");

-- 8. إضافة constraints للتحقق من صحة البيانات
ALTER TABLE "Subscription" 
ADD CONSTRAINT "check_daily_limit_positive" 
CHECK ("dailyMessagesLimit" > 0);

ALTER TABLE "Subscription" 
ADD CONSTRAINT "check_monthly_limit_positive" 
CHECK ("messagesLimit" > 0);

ALTER TABLE "Subscription" 
ADD CONSTRAINT "check_daily_usage_valid" 
CHECK ("dailyMessagesUsed" >= 0 AND "dailyMessagesUsed" <= "dailyMessagesLimit");

ALTER TABLE "Subscription" 
ADD CONSTRAINT "check_monthly_usage_valid" 
CHECK ("messagesUsed" >= 0 AND "messagesUsed" <= "messagesLimit");

-- 9. تحديث إحصائيات قاعدة البيانات
ANALYZE; 