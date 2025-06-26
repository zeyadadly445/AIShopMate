-- إنشاء جدول تخصيصات الشات
CREATE TABLE IF NOT EXISTS "ChatCustomization" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "merchantId" UUID NOT NULL REFERENCES "Merchant"("id") ON DELETE CASCADE,
    
    -- ألوان أساسية
    "primaryColor" VARCHAR(20) DEFAULT '#3b82f6',
    "secondaryColor" VARCHAR(20) DEFAULT '#64748b',
    "backgroundColor" VARCHAR(20) DEFAULT '#f8fafc',
    "userMessageColor" VARCHAR(20) DEFAULT '#3b82f6',
    "botMessageColor" VARCHAR(20) DEFAULT '#ffffff',
    "textColor" VARCHAR(20) DEFAULT '#1f2937',
    
    -- خيارات التصميم
    "fontFamily" VARCHAR(50) DEFAULT 'Inter',
    "borderRadius" VARCHAR(20) DEFAULT '16px',
    "chatHeaderStyle" VARCHAR(30) DEFAULT 'modern',
    "messageStyle" VARCHAR(30) DEFAULT 'rounded',
    "inputStyle" VARCHAR(30) DEFAULT 'modern',
    "animation" VARCHAR(30) DEFAULT 'smooth',
    
    -- صورة وشعار
    "logoUrl" TEXT,
    
    -- النصوص والرسائل (رسائل الحدود غير مشمولة - إجبارية)
    "welcomeMessage" TEXT DEFAULT 'مرحبا! كيف يمكنني مساعدتك اليوم؟',
    "placeholderText" VARCHAR(100) DEFAULT 'اكتب رسالتك هنا...',
    "sendButtonText" VARCHAR(20) DEFAULT 'إرسال',
    "typingIndicatorText" VARCHAR(20) DEFAULT 'يكتب...',
    
    -- التوقيتات
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- إنشاء فهرس على merchantId للبحث السريع
CREATE INDEX IF NOT EXISTS "idx_chat_customization_merchant" ON "ChatCustomization"("merchantId");

-- التأكد من وجود تخصيص واحد فقط لكل تاجر
CREATE UNIQUE INDEX IF NOT EXISTS "idx_chat_customization_unique_merchant" ON "ChatCustomization"("merchantId");

-- إضافة قيود للتحقق من صحة البيانات
ALTER TABLE "ChatCustomization" 
ADD CONSTRAINT "check_primary_color_format" 
CHECK ("primaryColor" ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE "ChatCustomization" 
ADD CONSTRAINT "check_user_message_color_format" 
CHECK ("userMessageColor" ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE "ChatCustomization" 
ADD CONSTRAINT "check_bot_message_color_format" 
CHECK ("botMessageColor" ~ '^#[0-9A-Fa-f]{6}$');

-- تعليق على الجدول
COMMENT ON TABLE "ChatCustomization" IS 'جدول تخصيصات مظهر الشات لكل تاجر - رسائل الحدود إجبارية';
COMMENT ON COLUMN "ChatCustomization"."merchantId" IS 'معرف التاجر';
COMMENT ON COLUMN "ChatCustomization"."primaryColor" IS 'اللون الأساسي (Header & User Messages)';
COMMENT ON COLUMN "ChatCustomization"."userMessageColor" IS 'لون رسائل المستخدم';
COMMENT ON COLUMN "ChatCustomization"."botMessageColor" IS 'لون رسائل البوت';
COMMENT ON COLUMN "ChatCustomization"."fontFamily" IS 'نوع الخط المستخدم';
COMMENT ON COLUMN "ChatCustomization"."borderRadius" IS 'انحناء الحواف للعناصر';
COMMENT ON COLUMN "ChatCustomization"."welcomeMessage" IS 'رسالة الترحيب القابلة للتخصيص';

-- إعداد Row Level Security
ALTER TABLE "ChatCustomization" ENABLE ROW LEVEL SECURITY;

-- سياسة للسماح للتجار بقراءة وتعديل تخصيصاتهم فقط
CREATE POLICY "ChatCustomization_merchant_access" ON "ChatCustomization"
    FOR ALL USING (
        "merchantId" IN (
            SELECT "id" FROM "Merchant" 
            WHERE "email" = current_setting('request.jwt.claims', true)::json->>'email'
        )
    );

-- سياسة للسماح بالقراءة العامة للتخصيصات (للشات العام)
CREATE POLICY "ChatCustomization_public_read" ON "ChatCustomization"
    FOR SELECT USING (true);

-- إنشاء دالة لتحديث updatedAt تلقائياً
CREATE OR REPLACE FUNCTION update_chat_customization_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لتحديث updatedAt
CREATE TRIGGER trigger_update_chat_customization_updated_at
    BEFORE UPDATE ON "ChatCustomization"
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_customization_updated_at();

-- إدراج تخصيصات افتراضية للتجار الموجودين (اختياري)
INSERT INTO "ChatCustomization" (
    "merchantId", 
    "primaryColor", 
    "welcomeMessage", 
    "logoUrl"
)
SELECT 
    "id",
    COALESCE("primaryColor", '#3b82f6'),
    COALESCE("welcomeMessage", 'مرحبا! كيف يمكنني مساعدتك اليوم؟'),
    "logoUrl"
FROM "Merchant"
WHERE "id" NOT IN (SELECT "merchantId" FROM "ChatCustomization")
ON CONFLICT ("merchantId") DO NOTHING;

-- ملاحظة مهمة: رسائل الحدود (daily/monthly limits) 
-- يتم إنتاجها تلقائياً عبر language-detector.ts 
-- وهي إجبارية ولا تخضع للتخصيص لضمان وضوح المعلومات المهمة

-- عرض معلومات الجداول المرتبطة للتأكد
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('ChatCustomization', 'Merchant');

-- عرض structure جدول ChatCustomization
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'ChatCustomization'
ORDER BY ordinal_position; 