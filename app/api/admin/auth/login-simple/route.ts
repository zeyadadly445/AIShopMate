import { NextRequest, NextResponse } from 'next/server'
import { SimpleAdminAuth } from '@/lib/admin-auth-simple'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'اسم المستخدم وكلمة المرور مطلوبان' },
        { status: 400 }
      )
    }

    console.log('🔐 Simple Admin Login API called for:', username)

    const result = await SimpleAdminAuth.login(username, password)

    if (!result.success) {
      console.log('❌ Login failed:', result.error)
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      )
    }

    console.log('✅ Login successful for:', username)
    
    return NextResponse.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      session: result.session
    })

  } catch (error) {
    console.error('❌ Login API error:', error)
    return NextResponse.json(
      { success: false, error: 'خطأ داخلي في الخادم' },
      { status: 500 }
    )
  }
} 