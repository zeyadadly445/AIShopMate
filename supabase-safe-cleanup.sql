-- تنظيف آمن لقاعدة البيانات - نسخة محسنة
-- هذا الملف آمن تماماً ولن يحذف الجداول المهمة

-- 🚨 تحذير: هذا الملف سيحذف بعض الجداول نهائياً!
-- ✅ الجداول المحمية (لن يتم حذفها): Merchant, Subscription, MerchantDataSource
-- ❌ الجداول التي ستُحذف: DailyUsageStats, MerchantAnalytics, Admin tables

-- تأكد من عمل نسخة احتياطية قبل التنفيذ!

-- =========================================
-- الجزء 1: فحص الجداول الموجودة
-- =========================================

-- عرض الجداول الموجودة حالياً
SELECT 
    table_name,
    table_type,
    CASE 
        WHEN table_name IN ('Merchant', 'Subscription', 'MerchantDataSource') THEN '✅ محمي'
        WHEN table_name IN ('DailyUsageStats', 'MerchantAnalytics', 'Admin', 'AdminAuditLog') THEN '❌ سيتم حذفه'
        ELSE '❓ غير محدد'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY 
    CASE 
        WHEN table_name IN ('Merchant', 'Subscription', 'MerchantDataSource') THEN 1
        WHEN table_name IN ('DailyUsageStats', 'MerchantAnalytics', 'Admin', 'AdminAuditLog') THEN 2
        ELSE 3
    END,
    table_name;

-- =========================================
-- الجزء 2: حذف الجداول غير المستخدمة (آمن)
-- =========================================

-- حذف جدول DailyUsageStats (لم نعد نحتاجه في النظام المبسط)
DROP TABLE IF EXISTS "DailyUsageStats" CASCADE;

-- حذف جدول MerchantAnalytics (غير مستخدم)
DROP TABLE IF EXISTS "MerchantAnalytics" CASCADE;

-- حذف جداول Admin (اختياري - فقط إذا كنت لا تحتاج نظام إدارة منفصل)
-- إزالة التعليق من الأسطر التالية إذا كنت تريد حذف نظام الإدارة
-- DROP TABLE IF EXISTS "AdminAuditLog" CASCADE;
-- DROP TABLE IF EXISTS "Admin" CASCADE;
-- DROP SEQUENCE IF EXISTS "Admin_id_seq" CASCADE;

-- =========================================
-- الجزء 3: حذف الـ Views غير المستخدمة
-- =========================================

-- حذف الـ Views القديمة (آمن)
DROP VIEW IF EXISTS "MonthlyUsageStats" CASCADE;
DROP VIEW IF EXISTS "WeeklyUsageStats" CASCADE;

-- =========================================
-- الجزء 4: حذف الدوال غير المستخدمة
-- =========================================

-- حذف الدوال القديمة (آمن)
DROP FUNCTION IF EXISTS get_merchant_daily_stats(TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_merchant_monthly_stats(TEXT) CASCADE;
DROP FUNCTION IF EXISTS increment_daily_usage(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_daily_usage_updated_at() CASCADE;
DROP FUNCTION IF EXISTS is_admin_user(TEXT) CASCADE;

-- =========================================
-- الجزء 5: تنظيف الفهارس غير المستخدمة
-- =========================================

-- حذف الفهارس المرتبطة بالجداول المحذوفة
DROP INDEX IF EXISTS "idx_daily_usage_merchant_date";
DROP INDEX IF EXISTS "idx_daily_usage_date";
DROP INDEX IF EXISTS "idx_analytics_date";
DROP INDEX IF EXISTS "idx_audit_date";
DROP INDEX IF EXISTS "idx_audit_target";
DROP INDEX IF EXISTS "idx_admin_admin_id";
DROP INDEX IF EXISTS "idx_admin_email";
DROP INDEX IF EXISTS "idx_admin_username";

-- =========================================
-- الجزء 6: إنشاء فهارس محسنة للنظام المبسط
-- =========================================

-- فهارس محسنة للجداول المهمة
CREATE INDEX IF NOT EXISTS "idx_merchant_active_email" 
ON "Merchant"("isActive", "email");

CREATE INDEX IF NOT EXISTS "idx_merchant_chatbot" 
ON "Merchant"("chatbotId") WHERE "isActive" = true;

CREATE INDEX IF NOT EXISTS "idx_subscription_merchant_status" 
ON "Subscription"("merchantId", "status");

CREATE INDEX IF NOT EXISTS "idx_subscription_limits_usage" 
ON "Subscription"("dailyMessagesUsed", "messagesUsed");

CREATE INDEX IF NOT EXISTS "idx_subscription_daily_reset" 
ON "Subscription"("lastDailyReset") WHERE "status" IN ('ACTIVE', 'TRIAL');

-- =========================================
-- الجزء 7: إضافة constraints للأمان
-- =========================================

-- constraints لضمان صحة البيانات
ALTER TABLE "Subscription" 
DROP CONSTRAINT IF EXISTS "check_daily_limit_positive";

ALTER TABLE "Subscription" 
ADD CONSTRAINT "check_daily_limit_positive" 
CHECK ("dailyMessagesLimit" > 0);

ALTER TABLE "Subscription" 
DROP CONSTRAINT IF EXISTS "check_monthly_limit_positive";

ALTER TABLE "Subscription" 
ADD CONSTRAINT "check_monthly_limit_positive" 
CHECK ("messagesLimit" > 0);

ALTER TABLE "Subscription" 
DROP CONSTRAINT IF EXISTS "check_daily_usage_valid";

ALTER TABLE "Subscription" 
ADD CONSTRAINT "check_daily_usage_valid" 
CHECK ("dailyMessagesUsed" >= 0);

ALTER TABLE "Subscription" 
DROP CONSTRAINT IF EXISTS "check_monthly_usage_valid";

ALTER TABLE "Subscription" 
ADD CONSTRAINT "check_monthly_usage_valid" 
CHECK ("messagesUsed" >= 0);

-- =========================================
-- الجزء 8: تحديث التعليقات والوصف
-- =========================================

-- إضافة تعليقات توضيحية
COMMENT ON TABLE "Merchant" IS 'جدول التجار - الجدول الأساسي الأول';
COMMENT ON TABLE "Subscription" IS 'جدول الاشتراكات والحدود - الجدول الأساسي الثاني';
COMMENT ON TABLE "MerchantDataSource" IS 'مصادر بيانات التجار - اختياري';

COMMENT ON COLUMN "Subscription"."dailyMessagesLimit" IS 'الحد الأقصى للرسائل اليومية';
COMMENT ON COLUMN "Subscription"."dailyMessagesUsed" IS 'الرسائل المستخدمة اليوم';
COMMENT ON COLUMN "Subscription"."lastDailyReset" IS 'تاريخ آخر إعادة تعيين يومية';
COMMENT ON COLUMN "Subscription"."messagesLimit" IS 'الحد الأقصى للرسائل الشهرية';
COMMENT ON COLUMN "Subscription"."messagesUsed" IS 'الرسائل المستخدمة شهرياً';

-- =========================================
-- الجزء 9: التحقق من سلامة النظام
-- =========================================

-- فحص الجداول المتبقية
SELECT 
    'الجداول المتبقية' as info,
    string_agg(table_name, ', ') as tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';

-- فحص الدوال المتبقية
SELECT 
    'الدوال المتبقية' as info,
    string_agg(routine_name, ', ') as functions
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_type = 'FUNCTION'
    AND routine_name NOT LIKE 'pg_%';

-- فحص الـ Views المتبقية
SELECT 
    'الـ Views المتبقية' as info,
    string_agg(table_name, ', ') as views
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'VIEW';

-- =========================================
-- انتهى التنظيف الآمن
-- =========================================

SELECT '✅ تم التنظيف بنجاح! الجداول المهمة محمية والنظام جاهز.' as result; 