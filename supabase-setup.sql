-- إنشاء enums أولا
CREATE TYPE "SubscriptionPlan" AS ENUM ('BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'CANCELLED', 'EXPIRED');
CREATE TYPE "DataType" AS ENUM ('PRODUCTS', 'PRICES', 'FAQ', 'SERVICES', 'OTHER');
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT');

-- جدول التجار
CREATE TABLE "Merchant" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "email" TEXT UNIQUE NOT NULL,
    "password" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "phone" TEXT,
    "logoUrl" TEXT,
    "chatbotId" TEXT UNIQUE NOT NULL,
    "welcomeMessage" TEXT DEFAULT 'مرحبا! كيف يمكنني مساعدتك',
    "primaryColor" TEXT DEFAULT '#007bff',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول الاشتراكات
CREATE TABLE "Subscription" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "merchantId" TEXT UNIQUE NOT NULL REFERENCES "Merchant"("id") ON DELETE CASCADE,
    "plan" "SubscriptionPlan" DEFAULT 'BASIC',
    "status" "SubscriptionStatus" DEFAULT 'TRIAL',
    "messagesLimit" INTEGER DEFAULT 1000,
    "messagesUsed" INTEGER DEFAULT 0,
    "startDate" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "endDate" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول مصادر البيانات
CREATE TABLE "MerchantDataSource" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "merchantId" TEXT NOT NULL REFERENCES "Merchant"("id") ON DELETE CASCADE,
    "type" "DataType" NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول المحادثات
CREATE TABLE "Conversation" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "merchantId" TEXT NOT NULL REFERENCES "Merchant"("id") ON DELETE CASCADE,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول الرسائل
CREATE TABLE "Message" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "conversationId" TEXT NOT NULL REFERENCES "Conversation"("id") ON DELETE CASCADE,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء الفهارس لتحسين الأداء
CREATE INDEX "MerchantDataSource_merchantId_idx" ON "MerchantDataSource"("merchantId");
CREATE INDEX "Conversation_merchantId_sessionId_idx" ON "Conversation"("merchantId", "sessionId");

-- تحديث تلقائي لـ updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS supabase-setup.sqlsupabase-setup.sql
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
supabase-setup.sqlsupabase-setup.sql language 'plpgsql';

-- تطبيق trigger على الجداول المناسبة
CREATE TRIGGER update_merchant_updated_at BEFORE UPDATE ON "Merchant" 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_subscription_updated_at BEFORE UPDATE ON "Subscription" 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_merchant_data_source_updated_at BEFORE UPDATE ON "MerchantDataSource" 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_conversation_updated_at BEFORE UPDATE ON "Conversation" 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- إضافة Row Level Security (RLS)
ALTER TABLE "Merchant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MerchantDataSource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان (يمكن تخصيصها حسب الحاجة)
-- للتطوير سنتركها مفتوحة مؤقتا
CREATE POLICY "Enable all operations for all users" ON "Merchant" FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON "Subscription" FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON "MerchantDataSource" FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON "Conversation" FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON "Message" FOR ALL USING (true);
