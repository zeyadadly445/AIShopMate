import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // معلومات التشخيص (فقط للتطوير)
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      adminConfig: {
        username: process.env.ADMIN_USERNAME || 'not-set',
        hasPassword: !!process.env.ADMIN_PASSWORD,
        hasPasswordHash: !!process.env.ADMIN_PASSWORD_HASH,
        adminId: process.env.ADMIN_ID || 'not-set',
        hasJwtSecret: !!process.env.JWT_SECRET,
        jwtSecretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
      },
      defaultValues: {
        defaultUsername: 'admin_zeyad',
        defaultPassword: 'Admin@2024!',
        defaultAdminId: 'admin_master_2024'
      }
    }

    return NextResponse.json({
      success: true,
      debug: debugInfo,
      message: 'تشخيص متغيرات البيئة للمدير'
    })

  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({
      error: 'خطأ في التشخيص',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 