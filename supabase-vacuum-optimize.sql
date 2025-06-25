-- تحسين الأداء بـ VACUUM - ملف منفصل
-- نفذ هذا الملف بعد التنظيف لتحسين الأداء

-- تعليمات التنفيذ:
-- 1. نفذ هذا الملف بعد تنفيذ supabase-safe-cleanup.sql
-- 2. نفذ كل أمر على حدة في SQL Editor
-- 3. أو نفذ هذا الملف كاملاً بدون أوامر أخرى

-- =========================================
-- تحليل وتحسين الجداول المهمة
-- =========================================

-- تحليل وتحسين جدول Merchant
VACUUM ANALYZE "Merchant";

-- تحليل وتحسين جدول Subscription  
VACUUM ANALYZE "Subscription";

-- تحليل وتحسين جدول MerchantDataSource
VACUUM ANALYZE "MerchantDataSource";

-- =========================================
-- تحديث إحصائيات قاعدة البيانات
-- =========================================

-- تحديث جميع الإحصائيات
ANALYZE;

-- =========================================
-- فحص حالة قاعدة البيانات
-- =========================================

-- عرض أحجام الجداول
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation,
    most_common_vals
FROM pg_stats 
WHERE schemaname = 'public' 
    AND tablename IN ('Merchant', 'Subscription', 'MerchantDataSource');

-- عرض معلومات الفهارس
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND tablename IN ('Merchant', 'Subscription', 'MerchantDataSource');

SELECT '✅ تم تحسين الأداء بنجاح!' as result; 