-- حذف الجدول القديم والدوال إذا كانت موجودة
DROP TABLE IF EXISTS "DailyUsageStats" CASCADE;
DROP VIEW IF EXISTS "MonthlyUsageStats" CASCADE;
DROP VIEW IF EXISTS "WeeklyUsageStats" CASCADE;
DROP FUNCTION IF EXISTS increment_daily_usage(UUID, TEXT);
DROP FUNCTION IF EXISTS increment_daily_usage(TEXT, TEXT);
DROP FUNCTION IF EXISTS update_daily_usage_updated_at();

-- إنشاء جدول تتبع الاستهلاك اليومي بنوع البيانات الصحيح
CREATE TABLE "DailyUsageStats" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "merchantId" TEXT NOT NULL REFERENCES "Merchant"("id") ON DELETE CASCADE,
  "date" DATE NOT NULL,
  "messagesCount" INTEGER DEFAULT 0,
  "uniqueSessionsCount" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- إنشاء فهرس فريد لكل تاجر ويوم
  UNIQUE("merchantId", "date")
);

-- إنشاء فهارس للأداء
CREATE INDEX idx_daily_usage_merchant_date 
ON "DailyUsageStats"("merchantId", "date" DESC);

CREATE INDEX idx_daily_usage_date 
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
CREATE TRIGGER trigger_daily_usage_updated_at
  BEFORE UPDATE ON "DailyUsageStats"
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_usage_updated_at();

-- دالة لإدراج أو تحديث الإحصائيات اليومية مع نوع البيانات الصحيح
CREATE OR REPLACE FUNCTION increment_daily_usage(
  merchant_id TEXT,
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
CREATE VIEW "MonthlyUsageStats" AS
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
CREATE VIEW "WeeklyUsageStats" AS
SELECT 
  "merchantId",
  DATE_TRUNC('week', "date") as "week",
  SUM("messagesCount") as "totalMessages",
  SUM("uniqueSessionsCount") as "totalUniqueSessions",
  COUNT(*) as "activeDays",
  AVG("messagesCount") as "avgDailyMessages"
FROM "DailyUsageStats"
GROUP BY "merchantId", DATE_TRUNC('week', "date");

-- منح الصلاحيات
GRANT ALL ON "DailyUsageStats" TO anon, authenticated;
GRANT ALL ON "MonthlyUsageStats" TO anon, authenticated;
GRANT ALL ON "WeeklyUsageStats" TO anon, authenticated; 