const bcrypt = require('bcryptjs')

async function generateAdminHash() {
  const password = 'Admin@2024!'
  const rounds = 12
  
  console.log('🔐 توليد hash لكلمة مرور المدير...')
  console.log('كلمة المرور:', password)
  
  const hash = await bcrypt.hash(password, rounds)
  console.log('✅ Hash تم توليده بنجاح:')
  console.log(hash)
  
  // التحقق من صحة الـ hash
  const isValid = await bcrypt.compare(password, hash)
  console.log('🔍 التحقق من صحة الـ hash:', isValid ? '✅ صحيح' : '❌ خطأ')
  
  console.log('\n📋 استخدم هذا الـ hash في متغيرات البيئة:')
  console.log(`ADMIN_PASSWORD_HASH=${hash}`)
  
  return hash
}

generateAdminHash().catch(console.error) 