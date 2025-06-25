const bcrypt = require('bcryptjs')

async function generateAdminHash() {
  const password = 'Admin@2024!'
  const username = 'admin_zeyadd'
  
  console.log('🔐 توليد Hash لكلمة مرور المدير...')
  console.log('اسم المستخدم:', username)
  console.log('كلمة المرور:', password)
  
  const hash = await bcrypt.hash(password, 12)
  
  console.log('\n✅ Hash تم توليده بنجاح!')
  console.log('Hash:', hash)
  
  console.log('\n📋 SQL Statement جاهز للاستخدام:')
  console.log(`
INSERT INTO "Admin" (username, email, password_hash, admin_id, role)
VALUES (
  '${username}',
  'admin@ai-shop-mate.com',
  '${hash}',
  'admin_master_2024',
  'SUPER_ADMIN'
)
ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  updated_at = NOW();
  `)
  
  // اختبار الـ hash
  const isValid = await bcrypt.compare(password, hash)
  console.log('\n🔍 اختبار صحة الـ Hash:', isValid ? '✅ صحيح' : '❌ خطأ')
}

generateAdminHash().catch(console.error) 