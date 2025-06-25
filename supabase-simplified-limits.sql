-- تحديث جدول Subscription لإضافة الحدود اليومية
-- إضافة الحقول الجديدة للحدود اليومية والتتبع

-- 1. إضافة حقول الحدود اليومية
ALTER TABLE "Subscription" 
ADD COLUMN IF NOT EXISTS "dailyMessagesLimit" INTEGER DEFAULT 50;

ALTER TABLE "Subscription" 
ADD COLUMN IF NOT EXISTS "dailyMessagesUsed" INTEGER DEFAULT 0;

ALTER TABLE "Subscription" 
ADD COLUMN IF NOT EXISTS "lastDailyReset" DATE DEFAULT CURRENT_DATE;

-- 2. تحديث القيم الافتراضية للحدود الشهرية حسب الخطة
UPDATE "Subscription" 
SET "messagesLimit" = CASE 
  WHEN "plan" = 'BASIC' THEN 1000
  WHEN "plan" = 'STANDARD' THEN 5000  
  WHEN "plan" = 'PREMIUM' THEN 15000
  WHEN "plan" = 'ENTERPRISE' THEN 50000
  ELSE 1000
END
WHERE "messagesLimit" = 40; -- القيمة الافتراضية القديمة

-- 3. تحديث الحدود اليومية حسب الخطة
UPDATE "Subscription" 
SET "dailyMessagesLimit" = CASE 
  WHEN "plan" = 'BASIC' THEN 50
  WHEN "plan" = 'STANDARD' THEN 200  
  WHEN "plan" = 'PREMIUM' THEN 500
  WHEN "plan" = 'ENTERPRISE' THEN 1500
  ELSE 50
END;

-- 4. دالة للتحقق من الحدود اليومية والشهرية
CREATE OR REPLACE FUNCTION check_message_limits(
  merchant_id TEXT
) RETURNS TABLE (
  can_send BOOLEAN,
  daily_remaining INTEGER,
  monthly_remaining INTEGER,
  reason TEXT
) AS $$
DECLARE
  subscription_record RECORD;
  today_date DATE := CURRENT_DATE;
BEGIN
  -- الحصول على بيانات الاشتراك
  SELECT * INTO subscription_record
  FROM "Subscription" 
  WHERE "merchantId" = merchant_id;
  
  -- التحقق من وجود الاشتراك
  IF subscription_record IS NULL THEN
    RETURN QUERY SELECT false, 0, 0, 'لم يتم العثور على اشتراك';
    RETURN;
  END IF;
  
  -- التحقق من حالة الاشتراك
  IF subscription_record.status != 'ACTIVE' AND subscription_record.status != 'TRIAL' THEN
    RETURN QUERY SELECT false, 0, 0, 'الاشتراك غير نشط';
    RETURN;
  END IF;
  
  -- إعادة تعيين العداد اليومي إذا كان يوم جديد
  IF subscription_record."lastDailyReset" < today_date THEN
    UPDATE "Subscription" 
    SET 
      "dailyMessagesUsed" = 0,
      "lastDailyReset" = today_date
    WHERE "merchantId" = merchant_id;
    
    -- تحديث البيانات المحلية
    subscription_record."dailyMessagesUsed" = 0;
  END IF;
  
  -- حساب الرسائل المتبقية
  DECLARE
    daily_remaining INTEGER := subscription_record."dailyMessagesLimit" - subscription_record."dailyMessagesUsed";
    monthly_remaining INTEGER := subscription_record."messagesLimit" - subscription_record."messagesUsed";
  BEGIN
    -- التحقق من الحدود
    IF monthly_remaining <= 0 THEN
      RETURN QUERY SELECT false, daily_remaining, monthly_remaining, 'تم تجاوز الحد الشهري';
    ELSIF daily_remaining <= 0 THEN
      RETURN QUERY SELECT false, daily_remaining, monthly_remaining, 'تم تجاوز الحد اليومي';
    ELSE
      RETURN QUERY SELECT true, daily_remaining, monthly_remaining, 'يمكن الإرسال';
    END IF;
  END;
END;
$$ LANGUAGE plpgsql;

-- 5. دالة لاستهلاك رسالة واحدة
CREATE OR REPLACE FUNCTION consume_message(
  merchant_id TEXT
) RETURNS TABLE (
  success BOOLEAN,
  daily_remaining INTEGER,
  monthly_remaining INTEGER,
  message TEXT
) AS $$
DECLARE
  subscription_record RECORD;
  today_date DATE := CURRENT_DATE;
BEGIN
  -- الحصول على بيانات الاشتراك مع قفل للتحديث
  SELECT * INTO subscription_record
  FROM "Subscription" 
  WHERE "merchantId" = merchant_id
  FOR UPDATE;
  
  IF subscription_record IS NULL THEN
    RETURN QUERY SELECT false, 0, 0, 'لم يتم العثور على اشتراك';
    RETURN;
  END IF;
  
  -- إعادة تعيين العداد اليومي إذا كان يوم جديد
  IF subscription_record."lastDailyReset" < today_date THEN
    UPDATE "Subscription" 
    SET 
      "dailyMessagesUsed" = 0,
      "lastDailyReset" = today_date
    WHERE "merchantId" = merchant_id;
    
    subscription_record."dailyMessagesUsed" = 0;
  END IF;
  
  -- التحقق من الحدود
  IF subscription_record."messagesUsed" >= subscription_record."messagesLimit" THEN
    RETURN QUERY SELECT false, 
      subscription_record."dailyMessagesLimit" - subscription_record."dailyMessagesUsed",
      subscription_record."messagesLimit" - subscription_record."messagesUsed",
      'تم تجاوز الحد الشهري';
    RETURN;
  END IF;
  
  IF subscription_record."dailyMessagesUsed" >= subscription_record."dailyMessagesLimit" THEN
    RETURN QUERY SELECT false,
      subscription_record."dailyMessagesLimit" - subscription_record."dailyMessagesUsed", 
      subscription_record."messagesLimit" - subscription_record."messagesUsed",
      'تم تجاوز الحد اليومي';
    RETURN;
  END IF;
  
  -- استهلاك رسالة واحدة
  UPDATE "Subscription" 
  SET 
    "messagesUsed" = "messagesUsed" + 1,
    "dailyMessagesUsed" = "dailyMessagesUsed" + 1,
    "updatedAt" = NOW()
  WHERE "merchantId" = merchant_id;
  
  -- إرجاع النتيجة
  RETURN QUERY SELECT true,
    subscription_record."dailyMessagesLimit" - subscription_record."dailyMessagesUsed" - 1,
    subscription_record."messagesLimit" - subscription_record."messagesUsed" - 1,
    'تم استهلاك رسالة بنجاح';
END;
$$ LANGUAGE plpgsql;

-- 6. دالة للحصول على إحصائيات التاجر
CREATE OR REPLACE FUNCTION get_merchant_usage_stats(
  merchant_id TEXT
) RETURNS TABLE (
  daily_used INTEGER,
  daily_limit INTEGER,
  daily_percentage NUMERIC,
  monthly_used INTEGER,
  monthly_limit INTEGER,
  monthly_percentage NUMERIC,
  plan TEXT,
  status TEXT,
  days_until_reset INTEGER
) AS $$
DECLARE
  subscription_record RECORD;
  today_date DATE := CURRENT_DATE;
BEGIN
  -- الحصول على بيانات الاشتراك
  SELECT * INTO subscription_record
  FROM "Subscription" 
  WHERE "merchantId" = merchant_id;
  
  IF subscription_record IS NULL THEN
    RETURN QUERY SELECT 0, 0, 0.0, 0, 0, 0.0, 'NONE'::TEXT, 'NOT_FOUND'::TEXT, 0;
    RETURN;
  END IF;
  
  -- إعادة تعيين العداد اليومي إذا كان يوم جديد
  IF subscription_record."lastDailyReset" < today_date THEN
    UPDATE "Subscription" 
    SET 
      "dailyMessagesUsed" = 0,
      "lastDailyReset" = today_date
    WHERE "merchantId" = merchant_id;
    
    subscription_record."dailyMessagesUsed" = 0;
  END IF;
  
  -- حساب الإحصائيات
  RETURN QUERY SELECT 
    subscription_record."dailyMessagesUsed",
    subscription_record."dailyMessagesLimit", 
    ROUND((subscription_record."dailyMessagesUsed"::NUMERIC / NULLIF(subscription_record."dailyMessagesLimit", 0)) * 100, 2),
    subscription_record."messagesUsed",
    subscription_record."messagesLimit",
    ROUND((subscription_record."messagesUsed"::NUMERIC / NULLIF(subscription_record."messagesLimit", 0)) * 100, 2),
    subscription_record."plan"::TEXT,
    subscription_record."status"::TEXT,
    EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - CURRENT_DATE))::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- 7. دالة لإعادة تعيين الحدود الشهرية (للمدير)
CREATE OR REPLACE FUNCTION reset_monthly_limits(
  target_merchant_id TEXT DEFAULT NULL
) RETURNS TABLE (
  merchant_id TEXT,
  old_used INTEGER,
  business_name TEXT,
  reset_success BOOLEAN
) AS $$
BEGIN
  -- إذا تم تحديد تاجر معين
  IF target_merchant_id IS NOT NULL THEN
    RETURN QUERY
    UPDATE "Subscription" 
    SET 
      "messagesUsed" = 0,
      "lastReset" = NOW(),
      "updatedAt" = NOW()
    FROM "Merchant" m
    WHERE "Subscription"."merchantId" = m.id 
      AND m.id = target_merchant_id
    RETURNING m.id, "Subscription"."messagesUsed", m."businessName", true;
  ELSE
    -- إعادة تعيين لجميع الحسابات النشطة
    RETURN QUERY
    UPDATE "Subscription" 
    SET 
      "messagesUsed" = 0,
      "lastReset" = NOW(),
      "updatedAt" = NOW()
    FROM "Merchant" m
    WHERE "Subscription"."merchantId" = m.id 
      AND "Subscription"."status" IN ('ACTIVE', 'TRIAL')
    RETURNING m.id, "Subscription"."messagesUsed", m."businessName", true;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 8. إنشاء view للإحصائيات السريعة
CREATE OR REPLACE VIEW "MerchantLimitsView" AS
SELECT 
  m.id as "merchantId",
  m."businessName",
  m."email",
  m."isActive",
  s."plan",
  s."status",
  s."dailyMessagesUsed",
  s."dailyMessagesLimit",
  s."messagesUsed", 
  s."messagesLimit",
  ROUND((s."dailyMessagesUsed"::NUMERIC / NULLIF(s."dailyMessagesLimit", 0)) * 100, 2) as "dailyUsagePercent",
  ROUND((s."messagesUsed"::NUMERIC / NULLIF(s."messagesLimit", 0)) * 100, 2) as "monthlyUsagePercent",
  (s."dailyMessagesLimit" - s."dailyMessagesUsed") as "dailyRemaining",
  (s."messagesLimit" - s."messagesUsed") as "monthlyRemaining",
  s."lastDailyReset",
  s."lastReset"
FROM "Merchant" m
JOIN "Subscription" s ON s."merchantId" = m.id;

-- 9. منح الصلاحيات للدوال
GRANT EXECUTE ON FUNCTION check_message_limits TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION consume_message TO authenticated, anon, service_role;  
GRANT EXECUTE ON FUNCTION get_merchant_usage_stats TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION reset_monthly_limits TO service_role;

-- 10. منح صلاحيات للـ view
GRANT SELECT ON "MerchantLimitsView" TO authenticated, anon, service_role;

-- 11. إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS "idx_subscription_daily_reset" ON "Subscription"("lastDailyReset");
CREATE INDEX IF NOT EXISTS "idx_subscription_usage" ON "Subscription"("dailyMessagesUsed", "messagesUsed");

-- 12. تحديث البيانات الموجودة لتطبيق الحدود الجديدة
UPDATE "Subscription" 
SET 
  "lastDailyReset" = CURRENT_DATE,
  "dailyMessagesUsed" = 0
WHERE "lastDailyReset" IS NULL OR "lastDailyReset" < CURRENT_DATE;

-- 13. إضافة تعليقات للجدول
COMMENT ON COLUMN "Subscription"."dailyMessagesLimit" IS 'الحد الأقصى للرسائل اليومية';
COMMENT ON COLUMN "Subscription"."dailyMessagesUsed" IS 'عدد الرسائل المستخدمة اليوم';
COMMENT ON COLUMN "Subscription"."lastDailyReset" IS 'تاريخ آخر إعادة تعيين يومية';
COMMENT ON COLUMN "Subscription"."messagesLimit" IS 'الحد الأقصى للرسائل الشهرية';
COMMENT ON COLUMN "Subscription"."messagesUsed" IS 'عدد الرسائل المستخدمة شهرياً'; 