// تشغيل اختبار تسجيل دخول المدير
const bcrypt = require('bcryptjs')

async function testAdminLogin() {
  console.log('🧪 اختبار نظام تسجيل دخول المدير\n')

  // بيانات الاختبار
  const testCredentials = {
    username: 'admin_zeyad',
    password: 'Admin@2024!'
  }

  // قراءة بيانات المدير من متغيرات البيئة
  const adminCredentials = {
    username: process.env.ADMIN_USERNAME || 'admin_zeyad',
    password: process.env.ADMIN_PASSWORD || 'Admin@2024!',
    passwordHash: process.env.ADMIN_PASSWORD_HASH,
    adminId: process.env.ADMIN_ID || 'admin_master_2024'
  }

  console.log('📋 بيانات المدير من متغيرات البيئة:')
  console.log(`Username: ${adminCredentials.username}`)
  
  if (adminCredentials.passwordHash) {
    console.log('🔐 يستخدم كلمة مرور مشفرة (الطريقة المتقدمة)')
    console.log(`Password Hash: ${adminCredentials.passwordHash}`)
  } else {
    console.log('🔓 يستخدم كلمة مرور عادية (الطريقة المبسطة)')
    console.log(`Password: ${adminCredentials.password}`)
  }
  
  console.log(`Admin ID: ${adminCredentials.adminId}\n`)

  // اختبار التحقق من اسم المستخدم
  console.log('🔍 اختبار اسم المستخدم...')
  if (testCredentials.username === adminCredentials.username) {
    console.log('✅ اسم المستخدم صحيح\n')
  } else {
    console.log('❌ اسم المستخدم خطأ\n')
    return
  }

  // اختبار التحقق من كلمة المرور
  console.log('🔍 اختبار كلمة المرور...')
  
  let isPasswordValid = false
  
  if (adminCredentials.passwordHash) {
    // استخدام الطريقة المشفرة
    console.log('🔐 التحقق باستخدام Hash...')
    isPasswordValid = await bcrypt.compare(testCredentials.password, adminCredentials.passwordHash)
  } else {
    // استخدام الطريقة المباشرة
    console.log('🔓 التحقق المباشر...')
    isPasswordValid = testCredentials.password === adminCredentials.password
  }

  if (isPasswordValid) {
    console.log('✅ كلمة المرور صحيحة\n')
    console.log('🎉 نجح تسجيل الدخول!')
    console.log('🚀 يمكنك الآن الدخول إلى /admin/login')
  } else {
    console.log('❌ كلمة المرور خطأ\n')
  }

  // إنشاء hash جديد إذا كان مطلوباً
  if (process.argv.includes('--generate-hash')) {
    console.log('\n🔐 إنشاء Hash جديد لكلمة المرور...')
    const newPassword = process.argv[process.argv.indexOf('--generate-hash') + 1] || testCredentials.password
    const newHash = await bcrypt.hash(newPassword, 12)
    console.log(`Password: ${newPassword}`)
    console.log(`Hash: ${newHash}`)
    console.log('\nأضف هذا إلى متغيرات البيئة:')
    console.log(`ADMIN_PASSWORD_HASH=${newHash}`)
  }
}

// تشغيل الاختبار
testAdminLogin().catch(console.error)

// معلومات الاستخدام
if (process.argv.includes('--help')) {
  console.log(`
📖 طرق الاستخدام:

# اختبار بسيط
node scripts/test-admin-login.js

# إنشاء hash جديد
node scripts/test-admin-login.js --generate-hash كلمة_المرور_الجديدة

# عرض المساعدة
node scripts/test-admin-login.js --help
  `)
} 