import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ merchantId: string }> }
) {
  try {
    const { merchantId } = await params
    
    if (!merchantId) {
      return NextResponse.json(
        { error: 'merchantId is required' },
        { status: 400 }
      )
    }

    // 1. التحقق من وجود التاجر
    const { data: merchant, error: merchantError } = await supabaseAdmin
      .from('Merchant')
      .select('id, businessName, isActive')
      .eq('id', merchantId)
      .single()

    if (merchantError || !merchant) {
      return NextResponse.json(
        { error: 'Merchant not found' },
        { status: 404 }
      )
    }

    // 2. الحصول على إحصائيات الاستخدام باستخدام الدالة الجديدة
    const { data: usageStats, error: usageError } = await supabaseAdmin
      .rpc('get_merchant_usage_stats', { merchant_id: merchantId })

    if (usageError) {
      console.error('Error getting usage stats:', usageError)
      return NextResponse.json(
        { error: 'Failed to get usage statistics' },
        { status: 500 }
      )
    }

    const stats = usageStats && usageStats[0]
    if (!stats) {
      return NextResponse.json(
        { error: 'No subscription found for merchant' },
        { status: 404 }
      )
    }

    // 3. الحصول على بيانات إضافية من الـ view
    const { data: detailedStats, error: detailsError } = await supabaseAdmin
      .from('MerchantLimitsView')
      .select('*')
      .eq('merchantId', merchantId)
      .single()

    if (detailsError) {
      console.warn('Could not get detailed stats:', detailsError)
    }

    // 4. تجميع النتائج
    const result = {
      merchant: {
        id: merchant.id,
        businessName: merchant.businessName,
        isActive: merchant.isActive
      },
      daily: {
        used: stats.daily_used,
        limit: stats.daily_limit,
        remaining: stats.daily_limit - stats.daily_used,
        percentage: stats.daily_percentage
      },
      monthly: {
        used: stats.monthly_used,
        limit: stats.monthly_limit,
        remaining: stats.monthly_limit - stats.monthly_used,
        percentage: stats.monthly_percentage
      },
      subscription: {
        plan: stats.plan,
        status: stats.status,
        daysUntilReset: stats.days_until_reset
      },
      lastReset: detailedStats?.lastReset,
      lastDailyReset: detailedStats?.lastDailyReset,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error in usage stats endpoint:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 