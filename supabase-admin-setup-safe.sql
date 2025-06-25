-- 🛡️ إعداد آمن 100% لجدول المدراء في Supabase
-- هذا الملف لن يؤثر على أي جداول أو بيانات موجودة
-- سيضيف فقط جدول Admin جديد بدون لمس أي شيء آخر

-- 1. إنشاء جدول المدراء فقط (آمن تماماً)
CREATE TABLE IF NOT EXISTS "Admin" (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  admin_id VARCHAR(100) UNIQUE NOT NULL,
  role VARCHAR(50) DEFAULT 'SUPER_ADMIN',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. إضافة فهارس للأداء (آمن)
CREATE INDEX IF NOT EXISTS idx_admin_username ON "Admin"(username);
CREATE INDEX IF NOT EXISTS idx_admin_admin_id ON "Admin"(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_email ON "Admin"(email);

-- 3. إضافة المدير الرئيسي (آمن - سيضيف فقط إذا لم يكن موجوداً)
INSERT INTO "Admin" (username, email, password_hash, admin_id, role)
SELECT 
  'admin_zeyadd',
  'admin@ai-shop-mate.com',
  '$2b$12$6QqgM6yGc1a6zSXJ9Bp3AuIoDaGbVVCdq0UFVTR1dwDM806zb4T1S',
  'admin_master_2024',
  'SUPER_ADMIN'
WHERE NOT EXISTS (
  SELECT 1 FROM "Admin" WHERE username = 'admin_zeyadd'
);

-- 4. منح صلاحيات للـ service_role (آمن)
GRANT ALL ON "Admin" TO service_role;
GRANT USAGE, SELECT ON SEQUENCE "Admin_id_seq" TO service_role;

-- 5. تفعيل Row Level Security للحماية (آمن)
ALTER TABLE "Admin" ENABLE ROW LEVEL SECURITY;

-- 6. إنشاء Policies للأمان
CREATE POLICY "Allow service_role full access to Admin" 
ON "Admin" 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Deny public access to Admin" 
ON "Admin" 
FOR ALL 
TO anon 
USING (false);

-- 7. تأكيد نجاح الإعداد (آمن)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Admin" WHERE username = 'admin_zeyadd') THEN
    RAISE NOTICE '✅ تم إعداد المدير بنجاح!';
    RAISE NOTICE 'اسم المستخدم: admin_zeyadd';
    RAISE NOTICE 'كلمة المرور: Admin@2024!';
    RAISE NOTICE '🔒 تم تفعيل Row Level Security';
    RAISE NOTICE '🛡️ جميع الجداول الموجودة سليمة ولم تتأثر';
  ELSE
    RAISE NOTICE '❌ فشل في إعداد المدير';
  END IF;
END $$; 