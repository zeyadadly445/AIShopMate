-- إعداد جدول المدراء في Supabase
-- هذا الملف آمن ولن يحذف أي بيانات موجودة

-- 1. إنشاء جدول المدراء
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

-- 2. إضافة فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_admin_username ON "Admin"(username);
CREATE INDEX IF NOT EXISTS idx_admin_admin_id ON "Admin"(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_email ON "Admin"(email);

-- 3. إضافة المدير الرئيسي مع الـ Hash الصحيح
INSERT INTO "Admin" (username, email, password_hash, admin_id, role)
VALUES (
  'admin_zeyadd',
  'admin@ai-shop-mate.com',
  '$2b$12$6QqgM6yGc1a6zSXJ9Bp3AuIoDaGbVVCdq0UFVTR1dwDM806zb4T1S',
  'admin_master_2024',
  'SUPER_ADMIN'
)
ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  email = EXCLUDED.email,
  admin_id = EXCLUDED.admin_id,
  role = EXCLUDED.role,
  is_active = true,
  login_attempts = 0,
  locked_until = NULL,
  updated_at = NOW();

-- 4. إنشاء دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_admin_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. ربط الدالة بالجدول
DROP TRIGGER IF EXISTS update_admin_updated_at_trigger ON "Admin";
CREATE TRIGGER update_admin_updated_at_trigger
  BEFORE UPDATE ON "Admin"
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_updated_at();

-- 6. منح صلاحيات للـ service_role
GRANT ALL ON "Admin" TO service_role;
GRANT USAGE, SELECT ON SEQUENCE "Admin_id_seq" TO service_role;

-- 7. إنشاء دالة للتحقق من تسجيل الدخول (اختياري للمستقبل)
CREATE OR REPLACE FUNCTION check_admin_login(input_username TEXT, input_password TEXT)
RETURNS TABLE(
  success BOOLEAN,
  admin_data JSON,
  message TEXT
) AS $$
DECLARE
  admin_record "Admin"%ROWTYPE;
BEGIN
  SELECT * INTO admin_record 
  FROM "Admin" 
  WHERE username = input_username 
    AND is_active = true;
    
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::JSON, 'مستخدم غير موجود'::TEXT;
    RETURN;
  END IF;
  
  -- هنا يمكن إضافة التحقق من كلمة المرور لاحقاً
  RETURN QUERY SELECT 
    true, 
    json_build_object(
      'id', admin_record.id,
      'username', admin_record.username,
      'email', admin_record.email,
      'admin_id', admin_record.admin_id,
      'role', admin_record.role
    ),
    'تم العثور على المدير'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. تأكيد نجاح الإعداد
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Admin" WHERE username = 'admin_zeyadd') THEN
    RAISE NOTICE '✅ تم إعداد المدير بنجاح!';
    RAISE NOTICE 'اسم المستخدم: admin_zeyadd';
    RAISE NOTICE 'كلمة المرور: Admin@2024!';
  ELSE
    RAISE NOTICE '❌ فشل في إعداد المدير';
  END IF;
END $$; 