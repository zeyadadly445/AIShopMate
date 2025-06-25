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

    try {
      const dashboardData = await SimpleAdminAuth.getDashboardData(session)
      console.log('✅ Dashboard data fetched successfully')

      return NextResponse.json({
        success: true,
        ...dashboardData
      })
    } catch (dataError) {
      console.error('❌ Error fetching dashboard data:', dataError)
      
      // إرجاع بيانات تجريبية إذا فشلت قاعدة البيانات
      const fallbackData = {
        stats: {
          totalMerchants: 0,
          activeMerchants: 0,
          trialMerchants: 0,
          newMerchantsThisMonth: 0,
          totalMessagesUsed: 0,
          limitReachedUsers: 0,
          potentialRevenue: 0,
          totalConversations: 0
        },
        merchants: [],
        topUsers: [],
        lastUpdated: new Date().toISOString(),
        adminSession: {
          username: session.username,
          loginTime: session.loginTime,
          adminId: session.adminId,
          dbId: session.dbId
        }
      }

      console.log('📊 Returning fallback data due to database error')
      
      return NextResponse.json({
        success: true,
        ...fallbackData,
        warning: 'البيانات محدودة بسبب مشكلة في قاعدة البيانات'
      })
    }

  } catch (error) {
    console.error('❌ Dashboard API critical error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'خطأ في الخادم', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 