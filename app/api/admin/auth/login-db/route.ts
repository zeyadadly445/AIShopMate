import { NextRequest, NextResponse } from 'next/server'
import { AdminAuthService } from '@/lib/admin-auth-db'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    // التحقق من وجود البيانات
    if (!username || !password) {
      return NextResponse.json({
        error: 'اسم المستخدم وكلمة المرور مطلوبان'
      }, { status: 400 })
    }

    console.log('🔐 Database Admin Login Attempt:', username)

    // التحقق من بيانات المدير من قاعدة البيانات
    const admin = await AdminAuthService.validateAdmin(username, password)
    
    if (!admin) {
      // تسجيل محاولة دخول غير صالحة (للأمان)
      const forwardedFor = request.headers.get('x-forwarded-for')
      const ip = forwardedFor ? forwardedFor.split(',')[0] : 'unknown'
      console.warn(`🚨 محاولة دخول غير صالحة للوحة الإدارة من IP: ${ip}`)
      
      return NextResponse.json({
        error: 'بيانات الدخول غير صحيحة'
      }, { status: 401 })
    }

    // إنشاء token
    const token = AdminAuthService.generateAdminToken(admin)
    
    console.log(`✅ تسجيل دخول ناجح للمدير: ${admin.username} (DB ID: ${admin.id})`)

    return NextResponse.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        adminId: admin.admin_id,
        role: admin.role,
        lastLogin: admin.last_login
      },
      message: 'تم تسجيل الدخول بنجاح'
    })

  } catch (error) {
    console.error('💥 خطأ في تسجيل دخول المدير:', error)
    return NextResponse.json({
      error: 'خطأ في الخادم',
      message: error instanceof Error ? error.message : 'خطأ غير معروف'
    }, { status: 500 })
  }
}

// التحقق من صحة الجلسة
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        error: 'غير مصرح'
      }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const session = AdminAuthService.verifyAdminToken(token)

    if (!session) {
      return NextResponse.json({
        error: 'جلسة غير صالحة'
      }, { status: 401 })
    }

    // جلب بيانات المدير المحدثة من قاعدة البيانات
    const admin = await AdminAuthService.getAdminById(session.adminId)
    
    if (!admin) {
      return NextResponse.json({
        error: 'مدير غير موجود'
      }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      session,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        adminId: admin.admin_id,
        role: admin.role,
        lastLogin: admin.last_login
      }
    })

  } catch (error) {
    console.error('خطأ في التحقق من الجلسة:', error)
    return NextResponse.json({
      error: 'خطأ في الخادم'
    }, { status: 500 })
  }
} 