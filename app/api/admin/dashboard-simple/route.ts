import { NextRequest, NextResponse } from 'next/server'
import { SimpleAdminAuth, SimpleAdminSession } from '@/lib/admin-auth-simple'

export async function POST(request: NextRequest) {
  try {
    console.log('📊 Simple Dashboard API called')
    
    const { session } = await request.json()

    if (!session) {
      console.log('❌ No session provided')
      return NextResponse.json(
        { success: false, error: 'جلسة غير صالحة' },
        { status: 401 }
      )
    }

    console.log('🔍 Validating session for:', session.username)

    if (!SimpleAdminAuth.validateSession(session)) {
      console.log('❌ Invalid session')
      return NextResponse.json(
        { success: false, error: 'جلسة منتهية الصلاحية' },
        { status: 401 }
      )
    }

    console.log('✅ Session valid, fetching dashboard data')

    const dashboardData = await SimpleAdminAuth.getDashboardData(session)

    return NextResponse.json({
      success: true,
      ...dashboardData
    })

  } catch (error) {
    console.error('❌ Dashboard API error:', error)
    return NextResponse.json(
      { success: false, error: 'خطأ في جلب البيانات' },
      { status: 500 }
    )
  }
} 