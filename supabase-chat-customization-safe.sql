-- إعداد آمن لجدول تخصيص مظهر الشات
-- يتوافق مع نوع البيانات الصحيح (text) ولا يمسح أي بيانات موجودة

-- التحقق من وجود الجدول وحذفه فقط إذا كان فارغاً
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ChatCustomization') THEN
        -- التحقق من وجود بيانات في الجدول
        IF (SELECT COUNT(*) FROM "ChatCustomization") = 0 THEN
            DROP TABLE "ChatCustomization";
            RAISE NOTICE 'تم حذف جدول ChatCustomization الفارغ بنجاح';
        ELSE
            RAISE NOTICE 'جدول ChatCustomization يحتوي على بيانات - سيتم تخطي الحذف للحماية';
        END IF;
    END IF;
END
$$;

-- إنشاء جدول تخصيص مظهر الشات
CREATE TABLE IF NOT EXISTS "ChatCustomization" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "merchantId" TEXT NOT NULL,
    
    -- إعدادات الألوان
    "primaryColor" TEXT DEFAULT '#007bff',
    "secondaryColor" TEXT DEFAULT '#6c757d',
    "backgroundColor" TEXT DEFAULT '#ffffff',
    "userMessageColor" TEXT DEFAULT '#007bff',
    "botMessageColor" TEXT DEFAULT '#f8f9fa',
    "textColor" TEXT DEFAULT '#333333',
    
    -- إعدادات الخط والتصميم
    "fontFamily" TEXT DEFAULT 'Inter',
    "borderRadius" TEXT DEFAULT 'medium',
    "animationStyle" TEXT DEFAULT 'smooth',
    
    -- أساليب متقدمة
    "headerStyle" TEXT DEFAULT 'modern',
    "messageStyle" TEXT DEFAULT 'rounded',
    
    -- النصوص المخصصة
    "welcomeMessage" TEXT DEFAULT 'مرحبا! كيف يمكنني مساعدتك؟',
    "placeholderText" TEXT DEFAULT 'اكتب رسالتك هنا...',
    "sendButtonText" TEXT DEFAULT 'إرسال',
    "typingIndicator" TEXT DEFAULT 'يكتب...',
    
    -- إعدادات الصورة
    "logoUrl" TEXT,
    
    -- تواريخ النظام
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء الفهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS "idx_chatcustomization_merchantid" ON "ChatCustomization"("merchantId");
CREATE INDEX IF NOT EXISTS "idx_chatcustomization_createdat" ON "ChatCustomization"("createdAt");

-- إنشاء العلاقة الخارجية (Foreign Key) مع النوع الصحيح
DO $$
BEGIN
    -- التحقق من وجود العلاقة الخارجية أولاً
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ChatCustomization_merchantId_fkey'
    ) THEN
        ALTER TABLE "ChatCustomization" 
        ADD CONSTRAINT "ChatCustomization_merchantId_fkey" 
        FOREIGN KEY ("merchantId") REFERENCES "Merchant"(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'تم إنشاء العلاقة الخارجية بنجاح';
    ELSE
        RAISE NOTICE 'العلاقة الخارجية موجودة مسبقاً';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'خطأ في إنشاء العلاقة الخارجية: %', SQLERRM;
END
$$;

-- إعداد Row Level Security (RLS)
ALTER TABLE "ChatCustomization" ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة إن وجدت (بأمان)
DROP POLICY IF EXISTS "merchant_can_manage_own_customization" ON "ChatCustomization";

-- إنشاء سياسة الأمان: التاجر يمكنه إدارة تخصيصاته فقط
CREATE POLICY "merchant_can_manage_own_customization" ON "ChatCustomization"
    FOR ALL USING (
        "merchantId" IN (
            SELECT id FROM "Merchant" 
            WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        )
    );

-- إنشاء فونكشن لتحديث updatedAt تلقائياً
CREATE OR REPLACE FUNCTION update_chat_customization_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء المحفز (Trigger)
DROP TRIGGER IF EXISTS update_chat_customization_updated_at_trigger ON "ChatCustomization";
CREATE TRIGGER update_chat_customization_updated_at_trigger
    BEFORE UPDATE ON "ChatCustomization"
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_customization_updated_at();

-- إنشاء فونكشن للحصول على تخصيصات التاجر
CREATE OR REPLACE FUNCTION get_merchant_customization(merchant_id TEXT)
RETURNS TABLE (
    id TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "backgroundColor" TEXT,
    "userMessageColor" TEXT,
    "botMessageColor" TEXT,
    "textColor" TEXT,
    "fontFamily" TEXT,
    "borderRadius" TEXT,
    "animationStyle" TEXT,
    "headerStyle" TEXT,
    "messageStyle" TEXT,
    "welcomeMessage" TEXT,
    "placeholderText" TEXT,
    "sendButtonText" TEXT,
    "typingIndicator" TEXT,
    "logoUrl" TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c."primaryColor",
        c."secondaryColor", 
        c."backgroundColor",
        c."userMessageColor",
        c."botMessageColor",
        c."textColor",
        c."fontFamily",
        c."borderRadius",
        c."animationStyle",
        c."headerStyle",
        c."messageStyle",
        c."welcomeMessage",
        c."placeholderText",
        c."sendButtonText",
        c."typingIndicator",
        c."logoUrl"
    FROM "ChatCustomization" c
    WHERE c."merchantId" = merchant_id;
    
    -- إذا لم توجد تخصيصات، إرجاع القيم الافتراضية
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            NULL::TEXT,
            '#007bff'::TEXT,
            '#6c757d'::TEXT,
            '#ffffff'::TEXT,
            '#007bff'::TEXT,
            '#f8f9fa'::TEXT,
            '#333333'::TEXT,
            'Inter'::TEXT,
            'medium'::TEXT,
            'smooth'::TEXT,
            'modern'::TEXT,
            'rounded'::TEXT,
            'مرحبا! كيف يمكنني مساعدتك؟'::TEXT,
            'اكتب رسالتك هنا...'::TEXT,
            'إرسال'::TEXT,
            'يكتب...'::TEXT,
            NULL::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح الصلاحيات المناسبة
GRANT SELECT, INSERT, UPDATE, DELETE ON "ChatCustomization" TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- رسالة تأكيد النجاح
DO $$
BEGIN
    RAISE NOTICE '✅ تم إعداد نظام تخصيص مظهر الشات بنجاح!';
    RAISE NOTICE '🔒 جميع البيانات الموجودة محفوظة وآمنة';
    RAISE NOTICE '🎨 يمكن الآن استخدام نظام التخصيص';
END
$$; 