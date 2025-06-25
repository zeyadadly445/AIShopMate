-- إنشاء جدول تتبع الاستهلاك اليومي
CREATE TABLE IF NOT EXISTS "DailyUsageStats" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "merchantId" UUID NOT NULL REFERENCES "Merchant"("id") ON DELETE CASCADE,
  "date" DATE NOT NULL,
  "messagesCount" INTEGER DEFAULT 0,
  "uniqueSessionsCount" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- إنشاء فهرس فريد لكل تاجر ويوم
  UNIQUE("merchantId", "date")
);

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_daily_usage_merchant_date 
ON "DailyUsageStats"("merchantId", "date" DESC);

CREATE INDEX IF NOT EXISTS idx_daily_usage_date 
ON "DailyUsageStats"("date" DESC);

-- دالة لتحديث الـ updatedAt تلقائياً
CREATE OR REPLACE FUNCTION update_daily_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger للتحديث التلقائي
DROP TRIGGER IF EXISTS trigger_daily_usage_updated_at ON "DailyUsageStats";
CREATE TRIGGER trigger_daily_usage_updated_at
  BEFORE UPDATE ON "DailyUsageStats"
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_usage_updated_at();

-- دالة لإدراج أو تحديث الإحصائيات اليومية
CREATE OR REPLACE FUNCTION increment_daily_usage(
  merchant_id UUID,
  session_id TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  is_new_session BOOLEAN := FALSE;
BEGIN
  -- التحقق من كون الجلسة جديدة اليوم
  IF session_id IS NOT NULL THEN
    SELECT NOT EXISTS (
      SELECT 1 FROM "Message" m
      JOIN "Conversation" c ON c."id" = m."conversationId"
      WHERE c."merchantId" = merchant_id 
        AND c."sessionId" = session_id
        AND DATE(m."createdAt") = today_date
        AND m."role" = 'USER'
    ) INTO is_new_session;
  END IF;

  -- إدراج أو تحديث الإحصائيات اليومية
  INSERT INTO "DailyUsageStats" (
    "merchantId", 
    "date", 
    "messagesCount",
    "uniqueSessionsCount"
  ) VALUES (
    merchant_id, 
    today_date, 
    1,
    CASE WHEN is_new_session THEN 1 ELSE 0 END
  )
  ON CONFLICT ("merchantId", "date") 
  DO UPDATE SET 
    "messagesCount" = "DailyUsageStats"."messagesCount" + 1,
    "uniqueSessionsCount" = "DailyUsageStats"."uniqueSessionsCount" + 
      CASE WHEN is_new_session THEN 1 ELSE 0 END,
    "updatedAt" = NOW();
END;
$$ LANGUAGE plpgsql;

-- إنشاء view للإحصائيات الشهرية
CREATE OR REPLACE VIEW "MonthlyUsageStats" AS
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

-- إنشاء view للإحصائيات الأسبوعية
CREATE OR REPLACE VIEW "WeeklyUsageStats" AS
SELECT 
  "merchantId",
  DATE_TRUNC('week', "date") as "week",
  SUM("messagesCount") as "totalMessages",
  SUM("uniqueSessionsCount") as "totalUniqueSessions",
  COUNT(*) as "activeDays",
  AVG("messagesCount") as "avgDailyMessages"
FROM "DailyUsageStats"
GROUP BY "merchantId", DATE_TRUNC('week', "date");

-- إضافة بيانات تجريبية للأيام الماضية (اختياري)
-- يمكن حذف هذا الجزء إذا لم تريد بيانات تجريبية

-- تعليق: لإضافة بيانات تجريبية، قم بتشغيل هذا مع merchant IDs حقيقية
/*
DO $$
DECLARE
  sample_merchant_id UUID;
  i INTEGER;
  random_count INTEGER;
BEGIN
  -- احصل على أول merchant ID (غير هذا للـ ID الحقيقي)
  SELECT "id" INTO sample_merchant_id FROM "Merchant" LIMIT 1;
  
  IF sample_merchant_id IS NOT NULL THEN
    -- إضافة بيانات للأيام الـ 30 الماضية
    FOR i IN 0..29 LOOP
      random_count := floor(random() * 50) + 1; -- بين 1 و 50 رسالة يومياً
      
      INSERT INTO "DailyUsageStats" (
        "merchantId", 
        "date", 
        "messagesCount",
        "uniqueSessionsCount",
        "createdAt"
      ) VALUES (
        sample_merchant_id, 
        CURRENT_DATE - i, 
        random_count,
        floor(random() * 10) + 1, -- بين 1 و 10 جلسات يومياً
        NOW() - (i || ' days')::INTERVAL
      )
      ON CONFLICT ("merchantId", "date") DO NOTHING;
    END LOOP;
  END IF;
END $$;
*/

-- منح الصلاحيات
GRANT ALL ON "DailyUsageStats" TO anon, authenticated;
GRANT ALL ON "MonthlyUsageStats" TO anon, authenticated;
GRANT ALL ON "WeeklyUsageStats" TO anon, authenticated; 