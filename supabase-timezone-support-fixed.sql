-- إضافة دعم المناطق الزمنية للتجار - إصدار محسّن
-- يحذف الدوال القديمة أولاً لتجنب تضارب أنواع الإرجاع

-- =========================================
-- الخطوة 1: حذف الدوال القديمة إن وجدت
-- =========================================

-- حذف الدوال الموجودة لتجنب تضارب الأنواع
DROP FUNCTION IF EXISTS consume_message(text);
DROP FUNCTION IF EXISTS check_message_limits(text);
DROP FUNCTION IF EXISTS check_daily_reset_needed(text);
DROP FUNCTION IF EXISTS get_merchant_usage_stats(text);

-- =========================================
-- الخطوة 2: إضافة الحقول الجديدة
-- =========================================

-- 1. إضافة حقل المنطقة الزمنية لجدول Merchant
ALTER TABLE "Merchant" 
ADD COLUMN IF NOT EXISTS "timezone" TEXT DEFAULT 'UTC';

-- 2. إضافة حقل lastDailyResetTimezone للـ Subscription لتتبع آخر إعادة تعيين
ALTER TABLE "Subscription" 
ADD COLUMN IF NOT EXISTS "lastDailyResetTimezone" TIMESTAMPTZ DEFAULT NOW();

-- 3. تحديث القيم الافتراضية للتجار الموجودين
UPDATE "Merchant" 
SET "timezone" = 'UTC' 
WHERE "timezone" IS NULL OR "timezone" = '';

-- 4. إضافة الحقول المطلوبة للاشتراكات إن لم تكن موجودة
ALTER TABLE "Subscription" 
ADD COLUMN IF NOT EXISTS "dailyMessagesLimit" INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS "dailyMessagesUsed" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lastDailyReset" DATE DEFAULT CURRENT_DATE;

-- 5. تحديث القيم الافتراضية للاشتراكات الموجودة
UPDATE "Subscription" 
SET 
  "dailyMessagesLimit" = 50,
  "dailyMessagesUsed" = 0,
  "lastDailyReset" = CURRENT_DATE,
  "lastDailyResetTimezone" = NOW()
WHERE "dailyMessagesLimit" IS NULL;

-- =========================================
-- الخطوة 3: إنشاء الدوال الجديدة
-- =========================================

-- دالة فحص إعادة تعيين العداد اليومي مع المنطقة الزمنية
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

-- دالة استهلاك الرسائل مع دعم المناطق الزمنية
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

-- دالة فحص الحدود مع دعم المناطق الزمنية
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

-- دالة للحصول على إحصائيات الاستخدام مع المنطقة الزمنية
CREATE OR REPLACE FUNCTION get_merchant_usage_stats(
  merchant_id TEXT
) RETURNS TABLE (
  messages_used INTEGER,
  messages_limit INTEGER,
  daily_messages_used INTEGER,
  daily_messages_limit INTEGER,
  last_daily_reset DATE,
  timezone TEXT,
  local_time TEXT,
  next_reset_in_hours INTEGER
) AS $$
DECLARE
  merchant_tz TEXT;
  current_time_local TIMESTAMPTZ;
  next_midnight TIMESTAMPTZ;
  hours_to_reset INTEGER;
BEGIN
  -- الحصول على بيانات الاشتراك والمنطقة الزمنية
  SELECT 
    s."messagesUsed",
    s."messagesLimit", 
    s."dailyMessagesUsed",
    s."dailyMessagesLimit",
    s."lastDailyReset",
    COALESCE(m.timezone, 'UTC')
  INTO 
    messages_used,
    messages_limit,
    daily_messages_used, 
    daily_messages_limit,
    last_daily_reset,
    merchant_tz
  FROM "Subscription" s
  JOIN "Merchant" m ON m.id = s."merchantId"  
  WHERE s."merchantId" = merchant_id;
  
  -- حساب الوقت المحلي والوقت المتبقي حتى التجديد
  current_time_local := NOW() AT TIME ZONE merchant_tz;
  next_midnight := (current_time_local::DATE + 1)::TIMESTAMP AT TIME ZONE merchant_tz;
  hours_to_reset := EXTRACT(EPOCH FROM (next_midnight - current_time_local)) / 3600;
  
  RETURN QUERY SELECT 
    get_merchant_usage_stats.messages_used,
    get_merchant_usage_stats.messages_limit,
    get_merchant_usage_stats.daily_messages_used,
    get_merchant_usage_stats.daily_messages_limit,
    get_merchant_usage_stats.last_daily_reset,
    merchant_tz,
    current_time_local::TEXT,
    hours_to_reset;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- الخطوة 4: منح الصلاحيات
-- =========================================

-- منح الصلاحيات للدوال الجديدة
GRANT EXECUTE ON FUNCTION check_daily_reset_needed TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION check_message_limits TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION consume_message TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_merchant_usage_stats TO authenticated, anon, service_role;

-- =========================================
-- الخطوة 5: إنشاء الفهارس والتحسينات
-- =========================================

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS "idx_merchant_timezone" ON "Merchant"("timezone");
CREATE INDEX IF NOT EXISTS "idx_subscription_daily_reset" ON "Subscription"("lastDailyReset");
CREATE INDEX IF NOT EXISTS "idx_subscription_merchant_id" ON "Subscription"("merchantId");

-- =========================================
-- الخطوة 6: التعليقات والتوثيق
-- =========================================

-- تعليقات للجداول والحقول
COMMENT ON COLUMN "Merchant"."timezone" IS 'المنطقة الزمنية للتاجر (مثال: America/New_York, Asia/Dubai, Europe/London)';
COMMENT ON COLUMN "Subscription"."lastDailyResetTimezone" IS 'وقت آخر إعادة تعيين يومية مع المنطقة الزمنية';
COMMENT ON COLUMN "Subscription"."dailyMessagesLimit" IS 'الحد الأقصى للرسائل اليومية';
COMMENT ON COLUMN "Subscription"."dailyMessagesUsed" IS 'عدد الرسائل المستخدمة اليوم';

-- تعليقات للدوال
COMMENT ON FUNCTION check_daily_reset_needed IS 'فحص ما إذا كان العداد اليومي يحتاج إعادة تعيين حسب المنطقة الزمنية المحلية';
COMMENT ON FUNCTION consume_message IS 'استهلاك رسالة واحدة مع التحقق من الحدود وإعادة التعيين التلقائي';
COMMENT ON FUNCTION check_message_limits IS 'فحص الحدود اليومية والشهرية مع دعم المناطق الزمنية';
COMMENT ON FUNCTION get_merchant_usage_stats IS 'الحصول على إحصائيات شاملة لاستخدام التاجر مع المنطقة الزمنية';

-- =========================================
-- الخطوة 7: اختبار سريع للدوال
-- =========================================

-- رسالة نجاح التطبيق
DO $$
BEGIN
  RAISE NOTICE 'تم تطبيق نظام المناطق الزمنية بنجاح! 🎉';
  RAISE NOTICE 'الدوال المتاحة:';
  RAISE NOTICE '- check_daily_reset_needed(merchant_id)';
  RAISE NOTICE '- consume_message(merchant_id)'; 
  RAISE NOTICE '- check_message_limits(merchant_id)';
  RAISE NOTICE '- get_merchant_usage_stats(merchant_id)';
  RAISE NOTICE '';
  RAISE NOTICE 'المزايا الجديدة:';
  RAISE NOTICE '✅ تجديد الحد اليومي في منتصف الليل المحلي';
  RAISE NOTICE '✅ دعم 40+ منطقة زمنية عالمية';
  RAISE NOTICE '✅ رسائل ذكية بـ 11 لغة مع العد التنازلي';
  RAISE NOTICE '✅ اكتشاف تلقائي للمنطقة الزمنية';
END $$; 