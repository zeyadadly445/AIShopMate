import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ merchantId: string }> }
) {
  console.log('📊 Getting merchant subscription stats...')
  
  try {
    const { merchantId } = await params
    console.log('👤 Merchant ID:', merchantId)

    // Get merchant with subscription details
    const { data: merchant, error: merchantError } = await supabaseAdmin
      .from('Merchant')
      .select(`
        id,
        email,
        businessName,
        chatbotId,
        createdAt,
        subscription:Subscription(
          id,
          plan,
          status,
          messagesLimit,
          messagesUsed,
          createdAt,
          updatedAt
        )
      `)
      .eq('id', merchantId)
      .single()

    if (merchantError || !merchant) {
      console.error('❌ Merchant not found:', merchantError?.message)
      return NextResponse.json({
        error: 'Merchant not found',
        details: merchantError?.message
      }, { status: 404 })
    }

    const subscription = Array.isArray(merchant.subscription) 
      ? merchant.subscription[0] 
      : merchant.subscription

    if (!subscription) {
      console.error('❌ No subscription found for merchant')
      return NextResponse.json({
        error: 'No subscription found for this merchant'
      }, { status: 404 })
    }

    // Calculate usage percentage
    const usagePercentage = Math.round((subscription.messagesUsed / subscription.messagesLimit) * 100)
    
    // Determine status and warnings
    let status = 'active'
    let warning = null
    
    if (subscription.messagesUsed >= subscription.messagesLimit) {
      status = 'limit_reached'
      warning = 'تم الوصول للحد الأقصى من الرسائل. يرجى ترقية خطتك للمتابعة.'
    } else if (usagePercentage >= 90) {
      status = 'warning_high'
      warning = `تم استخدام ${usagePercentage}% من الحد المسموح. يرجى مراقبة الاستخدام.`
    } else if (usagePercentage >= 75) {
      status = 'warning_medium'
      warning = `تم استخدام ${usagePercentage}% من الحد المسموح.`
    }

    console.log('✅ Stats retrieved successfully:', {
      messagesUsed: subscription.messagesUsed,
      messagesLimit: subscription.messagesLimit,
      usagePercentage,
      status
    })

    return NextResponse.json({
      merchant: {
        id: merchant.id,
        email: merchant.email,
        businessName: merchant.businessName,
        chatbotId: merchant.chatbotId,
        createdAt: merchant.createdAt
      },
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        messagesLimit: subscription.messagesLimit,
        messagesUsed: subscription.messagesUsed,
        usagePercentage,
        remainingMessages: subscription.messagesLimit - subscription.messagesUsed,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt
      },
      systemStatus: status,
      warning: warning,
      chatbotUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://ai-shop-mate.vercel.app'}/chat/${merchant.chatbotId}`
    })

  } catch (error) {
    console.error('💥 Error getting merchant stats:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 