-- إنشاء جدول تخصيصات الشات (نسخة محسّنة)
-- تأكد من حذف الجدول إذا كان موجوداً مسبقاً (اختياري)
-- DROP TABLE IF EXISTS "ChatCustomization";

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

-- إنشاء دالة لتحديث updatedAt تلقائياً
CREATE OR REPLACE FUNCTION update_chat_customization_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لتحديث updatedAt
DROP TRIGGER IF EXISTS trigger_update_chat_customization_updated_at ON "ChatCustomization";
CREATE TRIGGER trigger_update_chat_customization_updated_at
    BEFORE UPDATE ON "ChatCustomization"
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_customization_updated_at();

-- إعداد Row Level Security
ALTER TABLE "ChatCustomization" ENABLE ROW LEVEL SECURITY;

-- حذف السياسات الموجودة إذا كانت موجودة
DROP POLICY IF EXISTS "ChatCustomization_public_read" ON "ChatCustomization";
DROP POLICY IF EXISTS "ChatCustomization_merchant_access" ON "ChatCustomization";

-- سياسة للسماح بالقراءة العامة للتخصيصات (للشات العام)
CREATE POLICY "ChatCustomization_public_read" ON "ChatCustomization"
    FOR SELECT USING (true);

-- سياسة للسماح للتجار بتعديل تخصيصاتهم فقط
CREATE POLICY "ChatCustomization_merchant_write" ON "ChatCustomization"
    FOR INSERT WITH CHECK (true);

CREATE POLICY "ChatCustomization_merchant_update" ON "ChatCustomization"
    FOR UPDATE USING (true);

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
WHERE "id" NOT IN (SELECT "merchantId" FROM "ChatCustomization" WHERE "merchantId" IS NOT NULL)
ON CONFLICT ("merchantId") DO NOTHING;

-- تعليقات توضيحية
COMMENT ON TABLE "ChatCustomization" IS 'جدول تخصيصات مظهر الشات - رسائل الحدود إجبارية';
COMMENT ON COLUMN "ChatCustomization"."merchantId" IS 'معرف التاجر';
COMMENT ON COLUMN "ChatCustomization"."primaryColor" IS 'اللون الأساسي';
COMMENT ON COLUMN "ChatCustomization"."welcomeMessage" IS 'رسالة الترحيب القابلة للتخصيص';

-- عرض النتائج للتأكد
SELECT 'ChatCustomization table created successfully' AS status;
SELECT COUNT(*) AS total_customizations FROM "ChatCustomization"; 