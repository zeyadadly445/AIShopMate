import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const { chatbotId } = await params
    
    if (!chatbotId) {
      return NextResponse.json(
        { error: 'chatbotId is required' },
        { status: 400 }
      )
    }

    // 1. العثور على التاجر من chatbotId
    const { data: merchant, error: merchantError } = await supabaseAdmin
      .from('Merchant')
      .select('id, businessName, isActive')
      .eq('chatbotId', chatbotId)
      .single()

    if (merchantError || !merchant) {
      return NextResponse.json(
        { error: 'Merchant not found' },
        { status: 404 }
      )
    }

    // 2. فحص حالة التاجر
    if (!merchant.isActive) {
      return NextResponse.json({
        canUseChat: false,
        reason: 'merchant_inactive',
        message: 'الخدمة غير متاحة حالياً'
      })
    }

    // 3. فحص الحدود باستخدام الدالة الجديدة
    const { data: limitsCheck, error: limitsError } = await supabaseAdmin
      .rpc('check_message_limits', { merchant_id: merchant.id })

    if (limitsError) {
      console.error('Error checking limits:', limitsError)
      return NextResponse.json(
        { error: 'Failed to check subscription limits' },
        { status: 500 }
      )
    }

    const limits = limitsCheck && limitsCheck[0]
    if (!limits) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      )
    }

    // 4. الحصول على إحصائيات مفصلة
    const { data: usageStats, error: usageError } = await supabaseAdmin
      .rpc('get_merchant_usage_stats', { merchant_id: merchant.id })

    const stats = usageStats && usageStats[0]

    // 5. تحديد حالة الوصول (للمعلومات فقط)
    const result = {
      canUseChat: true, // دائماً true لأن الفحص سيحدث في Chat API
      merchant: {
        id: merchant.id,
        businessName: merchant.businessName,
        isActive: merchant.isActive
      },
      limits: {
        daily: {
          used: stats?.daily_used || 0,
          limit: stats?.daily_limit || 0,
          remaining: limits.daily_remaining || 0,
          percentage: stats?.daily_percentage || 0
        },
        monthly: {
          used: stats?.monthly_used || 0,
          limit: stats?.monthly_limit || 0,
          remaining: limits.monthly_remaining || 0,
          percentage: stats?.monthly_percentage || 0
        }
      },
      subscription: {
        plan: stats?.plan || 'UNKNOWN',
        status: stats?.status || 'UNKNOWN'
      },
      actualLimitStatus: {
        canSend: limits.can_send,
        reason: limits.reason || null,
        message: limits.can_send 
          ? 'يمكن استخدام الشات'
          : (limits.reason === 'تم تجاوز الحد اليومي' 
            ? 'تم تجاوز الحد اليومي للرسائل. يمكنك المحاولة غداً.'
            : 'تم تجاوز حد الرسائل المسموح. يرجى التواصل مع صاحب المتجر.')
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error in check limits endpoint:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 