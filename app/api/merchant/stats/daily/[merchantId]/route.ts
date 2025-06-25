import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

interface DailyStatsRow {
  date: string
  messages_count: number
  unique_sessions_count: number
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ merchantId: string }> }
) {
  try {
    const { merchantId } = await params

    if (!merchantId) {
      return NextResponse.json({ error: 'merchantId is required' }, { status: 400 })
    }

    // Get last 30 days stats using secure function
    const { data: last30Days, error: monthlyError } = await supabaseAdmin
      .rpc('get_merchant_daily_stats', {
        target_merchant_id: merchantId,
        days_back: 30
      })

    // Find today's stats from the data
    const todayDate = new Date().toISOString().split('T')[0]
    const todayStats = last30Days?.find((day: DailyStatsRow) => day.date === todayDate) || null

    // Get current month stats using secure function
    const { data: monthlyStats, error: monthlyViewError } = await supabaseAdmin
      .rpc('get_merchant_monthly_stats', {
        target_merchant_id: merchantId
      })

    // Calculate trends and analytics
    const totalMessagesToday = todayStats?.messages_count || 0
    const totalSessionsToday = todayStats?.unique_sessions_count || 0

    // Calculate monthly totals
    const monthlyTotalMessages = last30Days?.reduce((sum: number, day: DailyStatsRow) => sum + day.messages_count, 0) || 0
    const monthlyTotalSessions = last30Days?.reduce((sum: number, day: DailyStatsRow) => sum + day.unique_sessions_count, 0) || 0
    const activeDaysThisMonth = last30Days?.length || 0

    // Get last 7 days for weekly trend
    const last7Days = last30Days?.slice(0, 7) || []
    const weeklyTotalMessages = last7Days.reduce((sum: number, day: DailyStatsRow) => sum + day.messages_count, 0)
    const weeklyAvgMessages = weeklyTotalMessages / Math.max(last7Days.length, 1)

    // Calculate daily average for this month
    const dailyAvgMessages = monthlyTotalMessages / Math.max(activeDaysThisMonth, 1)

    // Find peak day
    const peakDay = last30Days?.reduce((max: DailyStatsRow | null, day: DailyStatsRow) => 
      day.messages_count > (max?.messages_count || 0) ? day : max, 
      null
    ) || null

    // Calculate growth trends
    const previous7Days = last30Days?.slice(7, 14) || []
    const previous7DaysMessages = previous7Days.reduce((sum: number, day: DailyStatsRow) => sum + day.messages_count, 0)
    const weeklyGrowth = previous7DaysMessages > 0 ? ((weeklyTotalMessages - previous7DaysMessages) / previous7DaysMessages) * 100 : 0

    // Create daily chart data for last 30 days
    const chartData = last30Days?.map((day: DailyStatsRow) => ({
      date: day.date,
      messages: day.messages_count,
      sessions: day.unique_sessions_count
    })) || []

    // Get subscription info for context
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('Subscription')
      .select('messagesLimit, messagesUsed, plan, status')
      .eq('merchantId', merchantId)
      .single()

    const response = {
      today: {
        messages: totalMessagesToday,
        sessions: totalSessionsToday,
        date: new Date().toISOString().split('T')[0]
      },
      thisMonth: {
        totalMessages: monthlyTotalMessages,
        totalSessions: monthlyTotalSessions,
        activeDays: activeDaysThisMonth,
        dailyAverage: Math.round(dailyAvgMessages * 100) / 100,
        peakDay: peakDay ? {
          date: peakDay.date,
          messages: peakDay.messages_count
        } : null
      },
      thisWeek: {
        totalMessages: weeklyTotalMessages,
        dailyAverage: Math.round(weeklyAvgMessages * 100) / 100,
        growth: Math.round(weeklyGrowth * 100) / 100
      },
      subscription: subscription ? {
        plan: subscription.plan,
        status: subscription.status,
        totalLimit: subscription.messagesLimit,
        totalUsed: subscription.messagesUsed,
        remainingTotal: subscription.messagesLimit - subscription.messagesUsed,
        usagePercentage: Math.round((subscription.messagesUsed / subscription.messagesLimit) * 100),
        monthlyUsed: monthlyTotalMessages,
        monthlyRemaining: subscription.messagesLimit - subscription.messagesUsed
      } : null,
      trends: {
        weeklyGrowth: Math.round(weeklyGrowth * 100) / 100,
        monthlyAverage: Math.round(dailyAvgMessages * 100) / 100,
        peakDayMessages: peakDay?.messages_count || 0
      },
      chartData: chartData,
      analytics: {
        totalDays: activeDaysThisMonth,
        averageSessionsPerDay: Math.round((monthlyTotalSessions / Math.max(activeDaysThisMonth, 1)) * 100) / 100,
        messagesPerSession: monthlyTotalSessions > 0 ? Math.round((monthlyTotalMessages / monthlyTotalSessions) * 100) / 100 : 0,
        mostActiveDay: peakDay?.date || null,
        consistency: activeDaysThisMonth / 30 * 100 // نسبة الأيام النشطة
      }
    }

    console.log('📊 Daily stats fetched for merchant:', merchantId, {
      today: totalMessagesToday,
      month: monthlyTotalMessages,
      week: weeklyTotalMessages
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching daily stats:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 