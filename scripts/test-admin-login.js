const bcrypt = require('bcryptjs')

// محاكاة بيانات المدير كما هي في النظام
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || 'admin_zeyad',
  passwordHash: process.env.ADMIN_PASSWORD_HASH || '$2b$12$egnqIRrdQrahfcMxnkeEXuM6DIj9PsbVM1BTZOd.h7cDCmWFV3WpC',
  adminId: process.env.ADMIN_ID || 'admin_master_2024'
}

async function testAdminLogin() {
  console.log('🔐 اختبار تسجيل دخول المدير...\n')
  
  // بيانات الاختبار
  const testUsername = 'admin_zeyad'
  const testPassword = 'Admin@2024!'
  
  console.log('📋 بيانات الاختبار:')
  console.log('اسم المستخدم:', testUsername)
  console.log('كلمة المرور:', testPassword)
  console.log('\n📋 بيانات النظام:')
  console.log('اسم المستخدم المطلوب:', ADMIN_CREDENTIALS.username)
  console.log('Hash المحفوظ:', ADMIN_CREDENTIALS.passwordHash)
  
  // اختبار اسم المستخدم
  console.log('\n🔍 اختبار اسم المستخدم...')
  const usernameMatch = testUsername === ADMIN_CREDENTIALS.username
  console.log(usernameMatch ? '✅ اسم المستخدم صحيح' : '❌ اسم المستخدم خطأ')
  
  if (!usernameMatch) {
    console.log('💡 المتوقع:', ADMIN_CREDENTIALS.username)
    console.log('💡 المرسل:', testUsername)
    return false
  }
  
  // اختبار كلمة المرور
  console.log('\n🔍 اختبار كلمة المرور...')
  try {
    const passwordMatch = await bcrypt.compare(testPassword, ADMIN_CREDENTIALS.passwordHash)
    console.log(passwordMatch ? '✅ كلمة المرور صحيحة' : '❌ كلمة المرور خطأ')
    
    if (!passwordMatch) {
      console.log('💡 جرب توليد hash جديد لكلمة المرور')
      console.log('💡 تشغيل: node scripts/generate-admin-hash.js')
    }
    
    return passwordMatch
  } catch (error) {
    console.log('❌ خطأ في التحقق من كلمة المرور:', error.message)
    return false
  }
}

async function testNewHash() {
  console.log('\n🔧 توليد hash جديد للتأكد...')
  const password = 'Admin@2024!'
  const newHash = await bcrypt.hash(password, 12)
  console.log('Hash جديد:', newHash)
  
  const isValid = await bcrypt.compare(password, newHash)
  console.log('التحقق من الـ hash الجديد:', isValid ? '✅ صحيح' : '❌ خطأ')
  
  return newHash
}

async function main() {
  const loginSuccess = await testAdminLogin()
  
  if (!loginSuccess) {
    console.log('\n🔄 سأولد hash جديد...')
    const newHash = await testNewHash()
    console.log('\n📋 استخدم هذا الـ hash في متغيرات البيئة:')
    console.log(`ADMIN_PASSWORD_HASH=${newHash}`)
  } else {
    console.log('\n🎉 تسجيل الدخول سيعمل بنجاح!')
    console.log('✅ يمكنك الآن استخدام لوحة الإدارة')
  }
}

main().catch(console.error) 