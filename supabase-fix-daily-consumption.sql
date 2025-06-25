-- إصلاح مشكلة عدم تحديث العداد اليومي dailyMessagesUsed
-- هذا الملف يتأكد من أن دالة consume_message تعمل بشكل صحيح

-- 1. التأكد من وجود الحقول المطلوبة في جدول Subscription
ALTER TABLE "Subscription" 
ADD COLUMN IF NOT EXISTS "dailyMessagesLimit" INTEGER DEFAULT 50;

ALTER TABLE "Subscription" 
ADD COLUMN IF NOT EXISTS "dailyMessagesUsed" INTEGER DEFAULT 0;

ALTER TABLE "Subscription" 
ADD COLUMN IF NOT EXISTS "lastDailyReset" DATE DEFAULT CURRENT_DATE;

-- 2. تحديث الحدود اليومية حسب الخطة للحسابات الموجودة
UPDATE "Subscription" 
SET "dailyMessagesLimit" = CASE 
  WHEN "plan" = 'BASIC' THEN 50
  WHEN "plan" = 'STANDARD' THEN 200  
  WHEN "plan" = 'PREMIUM' THEN 500
  WHEN "plan" = 'ENTERPRISE' THEN 1500
  ELSE 50
END
WHERE "dailyMessagesLimit" IS NULL OR "dailyMessagesLimit" = 0;

-- 3. إعادة تعيين العدادات اليومية للحسابات الموجودة
UPDATE "Subscription" 
SET 
  "dailyMessagesUsed" = 0,
  "lastDailyReset" = CURRENT_DATE
WHERE "lastDailyReset" IS NULL OR "lastDailyReset" < CURRENT_DATE;

-- 4. إعادة إنشاء دالة consume_message مع تحسينات
DROP FUNCTION IF EXISTS consume_message(TEXT);

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
  new_daily_used INTEGER;
  new_monthly_used INTEGER;
BEGIN
  -- الحصول على بيانات الاشتراك مع قفل للتحديث
  SELECT * INTO subscription_record
  FROM "Subscription" 
  WHERE "merchantId" = merchant_id
  FOR UPDATE;
  
  -- التحقق من وجود الاشتراك
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
    
    -- تحديث البيانات المحلية
    subscription_record."dailyMessagesUsed" = 0;
    subscription_record."lastDailyReset" = today_date;
  END IF;
  
  -- التحقق من الحدود الشهرية أولاً
  IF subscription_record."messagesUsed" >= subscription_record."messagesLimit" THEN
    RETURN QUERY SELECT false, 
      (subscription_record."dailyMessagesLimit" - subscription_record."dailyMessagesUsed"),
      (subscription_record."messagesLimit" - subscription_record."messagesUsed"),
      'تم تجاوز الحد الشهري';
    RETURN;
  END IF;
  
  -- التحقق من الحدود اليومية
  IF subscription_record."dailyMessagesUsed" >= subscription_record."dailyMessagesLimit" THEN
    RETURN QUERY SELECT false,
      (subscription_record."dailyMessagesLimit" - subscription_record."dailyMessagesUsed"),
      (subscription_record."messagesLimit" - subscription_record."messagesUsed"),
      'تم تجاوز الحد اليومي';
    RETURN;
  END IF;
  
  -- تحديث العدادين معاً
  UPDATE "Subscription" 
  SET 
    "messagesUsed" = "messagesUsed" + 1,
    "dailyMessagesUsed" = "dailyMessagesUsed" + 1,
    "updatedAt" = NOW()
  WHERE "merchantId" = merchant_id
  RETURNING "messagesUsed", "dailyMessagesUsed" INTO new_monthly_used, new_daily_used;
  
  -- تأكيد التحديث
  IF new_daily_used IS NULL OR new_monthly_used IS NULL THEN
    RETURN QUERY SELECT false, 0, 0, 'فشل في تحديث العدادات';
    RETURN;
  END IF;
  
  -- إرجاع النتيجة مع العدادات الجديدة
  RETURN QUERY SELECT true,
    (subscription_record."dailyMessagesLimit" - new_daily_used),
    (subscription_record."messagesLimit" - new_monthly_used),
    'تم استهلاك رسالة بنجاح - يومي: ' || new_daily_used || '/' || subscription_record."dailyMessagesLimit" || 
    ', شهري: ' || new_monthly_used || '/' || subscription_record."messagesLimit";
    
END;
$$ LANGUAGE plpgsql;

-- 5. إعادة إنشاء دالة check_message_limits مع تحسينات
DROP FUNCTION IF EXISTS check_message_limits(TEXT);

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
    -- التحقق من الحدود - الشهري أولاً ثم اليومي
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

-- 6. إعادة إنشاء دالة get_merchant_usage_stats
DROP FUNCTION IF EXISTS get_merchant_usage_stats(TEXT);

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
  
  -- إرجاع الإحصائيات
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

-- 7. منح الصلاحيات للدوال
GRANT EXECUTE ON FUNCTION check_message_limits TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION consume_message TO authenticated, anon, service_role;  
GRANT EXECUTE ON FUNCTION get_merchant_usage_stats TO authenticated, anon, service_role;

-- 8. إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS "idx_subscription_merchant_daily" ON "Subscription"("merchantId", "lastDailyReset");
CREATE INDEX IF NOT EXISTS "idx_subscription_usage_counters" ON "Subscription"("dailyMessagesUsed", "messagesUsed");

-- 9. تحديث البيانات الموجودة
UPDATE "Subscription" 
SET 
  "lastDailyReset" = CURRENT_DATE,
  "dailyMessagesUsed" = LEAST("dailyMessagesUsed", "dailyMessagesLimit"),
  "updatedAt" = NOW()
WHERE "lastDailyReset" IS NULL OR "lastDailyReset" < CURRENT_DATE;

-- 10. التحقق من صحة البيانات
DO $$
DECLARE
    test_result RECORD;
    total_subscriptions INTEGER;
    updated_subscriptions INTEGER;
BEGIN
    -- عدد الاشتراكات الإجمالي
    SELECT COUNT(*) INTO total_subscriptions FROM "Subscription";
    
    -- عدد الاشتراكات المحدثة
    SELECT COUNT(*) INTO updated_subscriptions 
    FROM "Subscription" 
    WHERE "dailyMessagesLimit" IS NOT NULL 
      AND "dailyMessagesUsed" IS NOT NULL 
      AND "lastDailyReset" IS NOT NULL;
    
    RAISE NOTICE 'تم تحديث % من أصل % اشتراك', updated_subscriptions, total_subscriptions;
    
    -- اختبار دالة consume_message
    SELECT * INTO test_result FROM consume_message('test') LIMIT 1;
    RAISE NOTICE 'اختبار دالة consume_message: مُكتملة';
    
    RAISE NOTICE 'تم تطبيق جميع التحديثات بنجاح!';
END
$$; 