-- إضافة دعم المناطق الزمنية للتجار
-- لضمان تجديد الحد اليومي في منتصف الليل المحلي

-- 1. إضافة حقل المنطقة الزمنية لجدول Merchant
ALTER TABLE "Merchant" 
ADD COLUMN IF NOT EXISTS "timezone" TEXT DEFAULT 'UTC';

-- 2. إضافة حقل lastDailyResetTimezone للـ Subscription لتتبع آخر إعادة تعيين
ALTER TABLE "Subscription" 
ADD COLUMN IF NOT EXISTS "lastDailyResetTimezone" TIMESTAMPTZ DEFAULT NOW();

-- 3. تحديث القيم الافتراضية للتجار الموجودين
UPDATE "Merchant" 
SET "timezone" = 'UTC' 
WHERE "timezone" IS NULL;

-- 4. تحديث دالة فحص إعادة تعيين العداد اليومي مع المنطقة الزمنية
CREATE OR REPLACE FUNCTION check_daily_reset_needed(
  merchant_id TEXT
) RETURNS TABLE (
  needs_reset BOOLEAN,
  merchant_timezone TEXT,
  current_local_time TIMESTAMPTZ,
  last_reset_time TIMESTAMPTZ
) AS $$
DECLARE
  merchant_record RECORD;
  merchant_tz TEXT;
  current_time_local TIMESTAMPTZ;
  last_reset_local DATE;
  current_date_local DATE;
BEGIN
  -- الحصول على بيانات التاجر والاشتراك
  SELECT m.timezone, s."lastDailyReset", s."lastDailyResetTimezone"
  INTO merchant_record
  FROM "Merchant" m
  JOIN "Subscription" s ON s."merchantId" = m.id
  WHERE m.id = merchant_id;
  
  -- إذا لم يتم العثور على التاجر
  IF merchant_record IS NULL THEN
    RETURN QUERY SELECT false, 'UTC'::TEXT, NOW(), NOW();
    RETURN;
  END IF;
  
  -- تحديد المنطقة الزمنية (افتراضي UTC إذا لم تكن محددة)
  merchant_tz := COALESCE(merchant_record.timezone, 'UTC');
  
  -- الحصول على الوقت الحالي في المنطقة الزمنية للتاجر
  current_time_local := NOW() AT TIME ZONE merchant_tz;
  
  -- تحويل تاريخ آخر إعادة تعيين للمنطقة الزمنية المحلية
  last_reset_local := (merchant_record."lastDailyResetTimezone" AT TIME ZONE merchant_tz)::DATE;
  current_date_local := current_time_local::DATE;
  
  -- فحص إذا كان يوم جديد في المنطقة الزمنية المحلية
  RETURN QUERY SELECT 
    (current_date_local > last_reset_local),
    merchant_tz,
    current_time_local,
    merchant_record."lastDailyResetTimezone";
END;
$$ LANGUAGE plpgsql;

-- 5. تحديث دالة consume_message لتستخدم المنطقة الزمنية
CREATE OR REPLACE FUNCTION consume_message(
  merchant_id TEXT
) RETURNS TABLE (
  success BOOLEAN,
  daily_remaining INTEGER,
  monthly_remaining INTEGER,
  message TEXT,
  timezone_info TEXT
) AS $$
DECLARE
  subscription_record RECORD;
  merchant_tz TEXT;
  reset_check RECORD;
BEGIN
  -- فحص إذا كان يحتاج إعادة تعيين يومية
  SELECT * INTO reset_check 
  FROM check_daily_reset_needed(merchant_id) LIMIT 1;
  
  -- الحصول على بيانات الاشتراك مع قفل للتحديث
  SELECT s.*, m.timezone INTO subscription_record
  FROM "Subscription" s
  JOIN "Merchant" m ON m.id = s."merchantId"
  WHERE s."merchantId" = merchant_id
  FOR UPDATE;
  
  IF subscription_record IS NULL THEN
    RETURN QUERY SELECT false, 0, 0, 'لم يتم العثور على اشتراك', 'UTC';
    RETURN;
  END IF;
  
  merchant_tz := COALESCE(subscription_record.timezone, 'UTC');
  
  -- إعادة تعيين العداد اليومي إذا كان يوم جديد في المنطقة الزمنية المحلية
  IF reset_check.needs_reset THEN
    UPDATE "Subscription" 
    SET 
      "dailyMessagesUsed" = 0,
      "lastDailyReset" = (NOW() AT TIME ZONE merchant_tz)::DATE,
      "lastDailyResetTimezone" = NOW()
    WHERE "merchantId" = merchant_id;
    
    subscription_record."dailyMessagesUsed" = 0;
    subscription_record."lastDailyReset" = (NOW() AT TIME ZONE merchant_tz)::DATE;
  END IF;
  
  -- التحقق من الحدود الشهرية أولاً
  IF subscription_record."messagesUsed" >= subscription_record."messagesLimit" THEN
    RETURN QUERY SELECT false, 
      (subscription_record."dailyMessagesLimit" - subscription_record."dailyMessagesUsed"),
      (subscription_record."messagesLimit" - subscription_record."messagesUsed"),
      'تم تجاوز الحد الشهري',
      merchant_tz;
    RETURN;
  END IF;
  
  -- التحقق من الحدود اليومية
  IF subscription_record."dailyMessagesUsed" >= subscription_record."dailyMessagesLimit" THEN
    RETURN QUERY SELECT false,
      (subscription_record."dailyMessagesLimit" - subscription_record."dailyMessagesUsed"),
      (subscription_record."messagesLimit" - subscription_record."messagesUsed"),
      'تم تجاوز الحد اليومي',
      merchant_tz;
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
    (subscription_record."dailyMessagesLimit" - subscription_record."dailyMessagesUsed" - 1),
    (subscription_record."messagesLimit" - subscription_record."messagesUsed" - 1),
    format('تم استهلاك رسالة بنجاح في %s - يومي: %s/%s, شهري: %s/%s', 
           merchant_tz,
           subscription_record."dailyMessagesUsed" + 1, 
           subscription_record."dailyMessagesLimit",
           subscription_record."messagesUsed" + 1, 
           subscription_record."messagesLimit"),
    merchant_tz;
END;
$$ LANGUAGE plpgsql;

-- 6. تحديث دالة check_message_limits لتستخدم المنطقة الزمنية
CREATE OR REPLACE FUNCTION check_message_limits(
  merchant_id TEXT
) RETURNS TABLE (
  can_send BOOLEAN,
  daily_remaining INTEGER,
  monthly_remaining INTEGER,
  reason TEXT,
  timezone_info TEXT
) AS $$
DECLARE
  subscription_record RECORD;
  merchant_tz TEXT;
  reset_check RECORD;
BEGIN
  -- فحص إذا كان يحتاج إعادة تعيين يومية
  SELECT * INTO reset_check 
  FROM check_daily_reset_needed(merchant_id) LIMIT 1;
  
  -- الحصول على بيانات الاشتراك
  SELECT s.*, m.timezone INTO subscription_record
  FROM "Subscription" s
  JOIN "Merchant" m ON m.id = s."merchantId"
  WHERE s."merchantId" = merchant_id;
  
  IF subscription_record IS NULL THEN
    RETURN QUERY SELECT false, 0, 0, 'لم يتم العثور على اشتراك', 'UTC';
    RETURN;
  END IF;
  
  merchant_tz := COALESCE(subscription_record.timezone, 'UTC');
  
  -- التحقق من حالة الاشتراك
  IF subscription_record.status != 'ACTIVE' AND subscription_record.status != 'TRIAL' THEN
    RETURN QUERY SELECT false, 0, 0, 'الاشتراك غير نشط', merchant_tz;
    RETURN;
  END IF;
  
  -- تطبيق إعادة التعيين إذا كان مطلوباً (قراءة فقط - التحديث سيحدث في consume_message)
  DECLARE
    daily_used INTEGER := subscription_record."dailyMessagesUsed";
    daily_remaining INTEGER;
    monthly_remaining INTEGER;
  BEGIN
    -- إذا كان يحتاج إعادة تعيين، اعتبر العداد اليومي = 0
    IF reset_check.needs_reset THEN
      daily_used := 0;
    END IF;
    
    daily_remaining := subscription_record."dailyMessagesLimit" - daily_used;
    monthly_remaining := subscription_record."messagesLimit" - subscription_record."messagesUsed";
    
    -- التحقق من الحدود
    IF monthly_remaining <= 0 THEN
      RETURN QUERY SELECT false, daily_remaining, monthly_remaining, 'تم تجاوز الحد الشهري', merchant_tz;
    ELSIF daily_remaining <= 0 THEN
      RETURN QUERY SELECT false, daily_remaining, monthly_remaining, 'تم تجاوز الحد اليومي', merchant_tz;
    ELSE
      RETURN QUERY SELECT true, daily_remaining, monthly_remaining, 'يمكن الإرسال', merchant_tz;
    END IF;
  END;
END;
$$ LANGUAGE plpgsql;

-- 7. منح الصلاحيات
GRANT EXECUTE ON FUNCTION check_daily_reset_needed TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION check_message_limits TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION consume_message TO authenticated, anon, service_role;

-- 8. إنشاء فهرس للأداء
CREATE INDEX IF NOT EXISTS "idx_merchant_timezone" ON "Merchant"("timezone");

-- 9. تعليقات للجدول
COMMENT ON COLUMN "Merchant"."timezone" IS 'المنطقة الزمنية للتاجر (مثال: America/New_York, Asia/Dubai, Europe/London)';
COMMENT ON COLUMN "Subscription"."lastDailyResetTimezone" IS 'وقت آخر إعادة تعيين يومية مع المنطقة الزمنية'; 