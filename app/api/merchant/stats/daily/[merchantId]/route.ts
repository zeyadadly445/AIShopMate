import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ merchantId: string }> }
) {
  try {
    const { merchantId } = await params

    if (!merchantId) {
      return NextResponse.json({ error: 'merchantId is required' }, { status: 400 })
    }

    // Get today's stats
    const { data: todayStats, error: todayError } = await supabaseAdmin
      .from('DailyUsageStats')
      .select('*')
      .eq('merchantId', merchantId)
      .eq('date', new Date().toISOString().split('T')[0])
      .single()

    // Get last 30 days stats
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: last30Days, error: monthlyError } = await supabaseAdmin
      .from('DailyUsageStats')
      .select('*')
      .eq('merchantId', merchantId)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })

    // Get current month stats from view
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01'
    const { data: monthlyStats, error: monthlyViewError } = await supabaseAdmin
      .from('MonthlyUsageStats')
      .select('*')
      .eq('merchantId', merchantId)
      .eq('month', currentMonth)
      .single()

    // Get last 7 days for weekly trend
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: last7Days, error: weeklyError } = await supabaseAdmin
      .from('DailyUsageStats')
      .select('*')
      .eq('merchantId', merchantId)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: true })

    // Calculate trends and analytics
    const totalMessagesToday = todayStats?.messagesCount || 0
    const totalSessionsToday = todayStats?.uniqueSessionsCount || 0

    // Calculate monthly totals
    const monthlyTotalMessages = last30Days?.reduce((sum, day) => sum + day.messagesCount, 0) || 0
    const monthlyTotalSessions = last30Days?.reduce((sum, day) => sum + day.uniqueSessionsCount, 0) || 0
    const activeDaysThisMonth = last30Days?.length || 0

    // Calculate weekly trend
    const weeklyTotalMessages = last7Days?.reduce((sum, day) => sum + day.messagesCount, 0) || 0
    const weeklyAvgMessages = weeklyTotalMessages / Math.max(last7Days?.length || 1, 1)

    // Calculate daily average for this month
    const dailyAvgMessages = monthlyTotalMessages / Math.max(activeDaysThisMonth, 1)

    // Find peak day
    const peakDay = last30Days?.reduce((max, day) => 
      day.messagesCount > (max?.messagesCount || 0) ? day : max, 
      null
    )

    // Calculate growth trends
    const last7DaysMessages = last7Days?.reduce((sum, day) => sum + day.messagesCount, 0) || 0
    const previous7Days = last30Days?.slice(7, 14)?.reduce((sum, day) => sum + day.messagesCount, 0) || 0
    const weeklyGrowth = previous7Days > 0 ? ((last7DaysMessages - previous7Days) / previous7Days) * 100 : 0

    // Create daily chart data for last 30 days
    const chartData = last30Days?.map(day => ({
      date: day.date,
      messages: day.messagesCount,
      sessions: day.uniqueSessionsCount
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
          messages: peakDay.messagesCount
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
        peakDayMessages: peakDay?.messagesCount || 0
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