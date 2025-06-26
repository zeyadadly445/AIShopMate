-- إنشاء جدول تخصيصات الشات (نسخة مبسطة)

CREATE TABLE IF NOT EXISTS "ChatCustomization" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "merchantId" UUID NOT NULL REFERENCES "Merchant"("id") ON DELETE CASCADE,
    
    -- ألوان
    "primaryColor" VARCHAR(20) DEFAULT '#3b82f6',
    "secondaryColor" VARCHAR(20) DEFAULT '#64748b',
    "backgroundColor" VARCHAR(20) DEFAULT '#f8fafc',
    "userMessageColor" VARCHAR(20) DEFAULT '#3b82f6',
    "botMessageColor" VARCHAR(20) DEFAULT '#ffffff',
    "textColor" VARCHAR(20) DEFAULT '#1f2937',
    
    -- تصميم
    "fontFamily" VARCHAR(50) DEFAULT 'Inter',
    "borderRadius" VARCHAR(20) DEFAULT '16px',
    "chatHeaderStyle" VARCHAR(30) DEFAULT 'modern',
    "messageStyle" VARCHAR(30) DEFAULT 'rounded',
    "inputStyle" VARCHAR(30) DEFAULT 'modern',
    "animation" VARCHAR(30) DEFAULT 'smooth',
    
    -- صورة
    "logoUrl" TEXT,
    
    -- نصوص
    "welcomeMessage" TEXT DEFAULT 'مرحبا! كيف يمكنني مساعدتك اليوم؟',
    "placeholderText" VARCHAR(100) DEFAULT 'اكتب رسالتك هنا...',
    "sendButtonText" VARCHAR(20) DEFAULT 'إرسال',
    "typingIndicatorText" VARCHAR(20) DEFAULT 'يكتب...',
    
    -- توقيتات
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now(),
    
    -- قيد فريد
    UNIQUE("merchantId")
);

-- فهرس
CREATE INDEX IF NOT EXISTS "idx_chat_customization_merchant" ON "ChatCustomization"("merchantId");

-- Row Level Security
ALTER TABLE "ChatCustomization" ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة العامة
CREATE POLICY "ChatCustomization_select" ON "ChatCustomization" FOR SELECT USING (true);

-- سياسة التعديل
CREATE POLICY "ChatCustomization_all" ON "ChatCustomization" FOR ALL USING (true);

-- تأكيد النجاح
SELECT 'Table ChatCustomization created successfully!' as result; 