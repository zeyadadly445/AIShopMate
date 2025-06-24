# 🚨 دليل استرداد مشروع Supabase

## المشكلة: مشروع Supabase معطل أو محذوف

### الخطوة 1: إنشاء مشروع جديد
1. اذهب إلى: https://app.supabase.com/
2. اضغط "New project"
3. اختر "Free Plan"
4. ضع اسم المشروع: `merchant-chatbot-saas`
5. ضع كلمة مرور قوية واحفظها

### الخطوة 2: تشغيل SQL Schema
انسخ والصق هذا الكود في SQL Editor:

```sql
-- Create Merchant table
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "chatbotId" TEXT NOT NULL,
    "welcomeMessage" TEXT DEFAULT 'أهلاً بك! كيف يمكنني مساعدتك اليوم؟',
    "primaryColor" TEXT DEFAULT '#007bff',
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- Create Subscription table
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "merchantId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'BASIC',
    "status" TEXT NOT NULL DEFAULT 'TRIAL',
    "messagesLimit" INTEGER NOT NULL DEFAULT 1000,
    "messagesUsed" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- Create MerchantDataSource table
CREATE TABLE "MerchantDataSource" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "merchantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantDataSource_pkey" PRIMARY KEY ("id")
);

-- Create Conversation table
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "merchantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "customerInfo" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- Create Message table
CREATE TABLE "Message" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "conversationId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
CREATE UNIQUE INDEX "Merchant_email_key" ON "Merchant"("email");
CREATE UNIQUE INDEX "Merchant_chatbotId_key" ON "Merchant"("chatbotId");
CREATE UNIQUE INDEX "Subscription_merchantId_key" ON "Subscription"("merchantId");

-- Add foreign key constraints
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MerchantDataSource" ADD CONSTRAINT "MerchantDataSource_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes for better performance
CREATE INDEX "idx_merchant_chatbotId" ON "Merchant"("chatbotId");
CREATE INDEX "idx_merchant_email" ON "Merchant"("email");
CREATE INDEX "idx_subscription_merchantId" ON "Subscription"("merchantId");
CREATE INDEX "idx_datasource_merchantId" ON "MerchantDataSource"("merchantId");
CREATE INDEX "idx_conversation_merchantId" ON "Conversation"("merchantId");
CREATE INDEX "idx_conversation_sessionId" ON "Conversation"("sessionId");
CREATE INDEX "idx_message_conversationId" ON "Message"("conversationId");
CREATE INDEX "idx_message_timestamp" ON "Message"("timestamp");
```

### الخطوة 3: الحصول على معلومات الاتصال
1. اذهب إلى Settings > Database
2. انسخ:
   - Project URL
   - anon public key
   - service_role key
   - Database password

### الخطوة 4: تحديث متغيرات البيئة في Vercel
اذهب إلى: https://vercel.com/zeyadadly445/ai-shop-mate/settings/environment-variables

وحدث هذه المتغيرات:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_KEY
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres
```

### الخطوة 5: إعادة النشر
1. اذهب إلى Vercel Deployments
2. اضغط "Redeploy"
3. انتظر انتهاء البناء

### الخطوة 6: الاختبار
1. اختبر: `/api/health/database`
2. جرب التسجيل: `/auth/register`

## 🎯 الخلاصة
هذا الدليل يضمن استرداد كامل للنظام مع الحفاظ على جميع الوظائف. 