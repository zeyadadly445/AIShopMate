-- 🔒 إعداد Row Level Security آمن لجدول Admin
-- هذا سيحمي بيانات المدراء من الوصول غير المصرح

-- 1. تفعيل Row Level Security لجدول Admin
ALTER TABLE "Admin" ENABLE ROW LEVEL SECURITY;

-- 2. Policy للسماح لـ service_role بالوصول الكامل (مطلوب للنظام)
CREATE POLICY "Allow service_role full access to Admin" 
ON "Admin" 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- 3. Policy للسماح للمدراء النشطين بقراءة بياناتهم الخاصة فقط
CREATE POLICY "Allow active admins to read their own data" 
ON "Admin" 
FOR SELECT 
TO authenticated 
USING (
  is_active = true 
  AND auth.jwt() ->> 'role' = 'admin'
  AND auth.jwt() ->> 'admin_id' = admin_id
);

-- 4. Policy لمنع الوصول العام (أمان إضافي)
CREATE POLICY "Deny public access to Admin" 
ON "Admin" 
FOR ALL 
TO anon 
USING (false);

-- 5. إنشاء دالة للتحقق من صلاحيات المدير (اختياري للمستقبل)
CREATE OR REPLACE FUNCTION is_admin_user(admin_id_param TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM "Admin" 
    WHERE admin_id = admin_id_param 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. منح صلاحية استخدام الدالة لـ service_role
GRANT EXECUTE ON FUNCTION is_admin_user(TEXT) TO service_role;

-- 7. تأكيد إعداد الأمان
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'Admin' 
    AND policyname = 'Allow service_role full access to Admin'
  ) THEN
    RAISE NOTICE '✅ تم تفعيل Row Level Security لجدول Admin';
    RAISE NOTICE '🔒 المدراء محميون من الوصول غير المصرح';
    RAISE NOTICE '🛡️ service_role لديه وصول كامل للعمليات';
    RAISE NOTICE '👥 المدراء يمكنهم الوصول لبياناتهم فقط';
  ELSE
    RAISE NOTICE '❌ فشل في إعداد policies';
  END IF;
END $$; 