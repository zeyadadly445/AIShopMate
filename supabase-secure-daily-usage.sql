-- إضافة Row Level Security للجدول والـ Views

-- 1. تفعيل RLS على جدول DailyUsageStats
ALTER TABLE "DailyUsageStats" ENABLE ROW LEVEL SECURITY;

-- 2. إنشاء policy للسماح للمستخدمين برؤية بياناتهم فقط
CREATE POLICY "Users can view own daily stats" ON "DailyUsageStats"
    FOR SELECT USING (
        "merchantId" IN (
            SELECT "id" FROM "Merchant" 
            WHERE "email" = auth.jwt() ->> 'email'
        )
    );

-- 3. إنشاء policy للسماح للنظام بإدراج البيانات
CREATE POLICY "System can insert daily stats" ON "DailyUsageStats"
    FOR INSERT WITH CHECK (true);

-- 4. إنشاء policy للسماح للنظام بتحديث البيانات  
CREATE POLICY "System can update daily stats" ON "DailyUsageStats"
    FOR UPDATE USING (true);

-- 5. حذف الـ Views القديمة وإعادة إنشائها بـ SECURITY INVOKER
DROP VIEW IF EXISTS "MonthlyUsageStats";
DROP VIEW IF EXISTS "WeeklyUsageStats";

-- 6. إعادة إنشاء الـ Views مع SECURITY INVOKER (أكثر أماناً)
CREATE VIEW "MonthlyUsageStats" 
WITH (security_invoker = true) AS
SELECT 
  "merchantId",
  DATE_TRUNC('month', "date") as "month",
  SUM("messagesCount") as "totalMessages",
  SUM("uniqueSessionsCount") as "totalUniqueSessions",
  COUNT(*) as "activeDays",
  AVG("messagesCount") as "avgDailyMessages",
  MAX("messagesCount") as "maxDailyMessages",
  MIN("messagesCount") as "minDailyMessages"
FROM "DailyUsageStats"
GROUP BY "merchantId", DATE_TRUNC('month', "date");

CREATE VIEW "WeeklyUsageStats" 
WITH (security_invoker = true) AS
SELECT 
  "merchantId",
  DATE_TRUNC('week', "date") as "week",
  SUM("messagesCount") as "totalMessages",
  SUM("uniqueSessionsCount") as "totalUniqueSessions",
  COUNT(*) as "activeDays",
  AVG("messagesCount") as "avgDailyMessages"
FROM "DailyUsageStats"
GROUP BY "merchantId", DATE_TRUNC('week', "date");

-- 7. إضافة RLS للـ Views (للاحتياط)
ALTER VIEW "MonthlyUsageStats" SET (security_invoker = true);
ALTER VIEW "WeeklyUsageStats" SET (security_invoker = true);

-- 8. منح صلاحيات محدودة
REVOKE ALL ON "DailyUsageStats" FROM anon, authenticated;
REVOKE ALL ON "MonthlyUsageStats" FROM anon, authenticated;  
REVOKE ALL ON "WeeklyUsageStats" FROM anon, authenticated;

-- منح صلاحيات SELECT فقط للمستخدمين المصرح لهم
GRANT SELECT ON "DailyUsageStats" TO authenticated;
GRANT SELECT ON "MonthlyUsageStats" TO authenticated;
GRANT SELECT ON "WeeklyUsageStats" TO authenticated;

-- 9. إنشاء دالة آمنة للحصول على إحصائيات التاجر
CREATE OR REPLACE FUNCTION get_merchant_daily_stats(
    target_merchant_id TEXT,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    date DATE,
    messages_count INTEGER,
    unique_sessions_count INTEGER
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- التحقق من أن المستخدم يملك هذا المتجر
    IF NOT EXISTS (
        SELECT 1 FROM "Merchant" 
        WHERE "id" = target_merchant_id 
        AND "email" = auth.jwt() ->> 'email'
    ) THEN
        RAISE EXCEPTION 'Access denied: You do not own this merchant account';
    END IF;
    
    -- إرجاع البيانات
    RETURN QUERY
    SELECT 
        d."date",
        d."messagesCount",
        d."uniqueSessionsCount"
    FROM "DailyUsageStats" d
    WHERE d."merchantId" = target_merchant_id
        AND d."date" >= CURRENT_DATE - INTERVAL '%s days' % days_back
    ORDER BY d."date" DESC;
END;
$$;

-- منح صلاحية تنفيذ الدالة للمستخدمين المصرح لهم
GRANT EXECUTE ON FUNCTION get_merchant_daily_stats TO authenticated;

-- 10. إنشاء دالة للحصول على الإحصائيات الشهرية بشكل آمن
CREATE OR REPLACE FUNCTION get_merchant_monthly_stats(
    target_merchant_id TEXT
)
RETURNS TABLE (
    month TIMESTAMP WITH TIME ZONE,
    total_messages BIGINT,
    total_unique_sessions BIGINT,
    active_days BIGINT,
    avg_daily_messages NUMERIC,
    max_daily_messages INTEGER,
    min_daily_messages INTEGER
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- التحقق من أن المستخدم يملك هذا المتجر
    IF NOT EXISTS (
        SELECT 1 FROM "Merchant" 
        WHERE "id" = target_merchant_id 
        AND "email" = auth.jwt() ->> 'email'
    ) THEN
        RAISE EXCEPTION 'Access denied: You do not own this merchant account';
    END IF;
    
    -- إرجاع البيانات
    RETURN QUERY
    SELECT 
        DATE_TRUNC('month', d."date") as month,
        SUM(d."messagesCount") as total_messages,
        SUM(d."uniqueSessionsCount") as total_unique_sessions,
        COUNT(*) as active_days,
        AVG(d."messagesCount") as avg_daily_messages,
        MAX(d."messagesCount") as max_daily_messages,
        MIN(d."messagesCount") as min_daily_messages
    FROM "DailyUsageStats" d
    WHERE d."merchantId" = target_merchant_id
        AND d."date" >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
    GROUP BY DATE_TRUNC('month', d."date")
    ORDER BY month DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_merchant_monthly_stats TO authenticated; 