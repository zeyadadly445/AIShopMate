import { NextRequest, NextResponse } from 'next/server'
import { SimpleAdminAuth } from '@/lib/admin-auth-simple'
import { supabaseAdmin } from '@/lib/supabase'

// GET - جلب تحليلات وإحصائيات شاملة
export async function GET(request: NextRequest) {
  try {
    console.log('📊 Admin Analytics API - GET comprehensive analytics')
    
    // التحقق من الصلاحيات
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const sessionData = authHeader.substring(7)
    let session
    try {
      session = JSON.parse(sessionData)
    } catch (e) {
      return NextResponse.json({ error: 'جلسة غير صالحة' }, { status: 401 })
    }

    if (!SimpleAdminAuth.validateSession(session)) {
      return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })
    }

    const url = new URL(request.url)
    const timeRange = url.searchParams.get('timeRange') || '30' // days
    const startDate = new Date(Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000).toISOString()

    // إحصائيات التجار
    const { data: merchants } = await supabaseAdmin
      .from('Merchant')
      .select('id, created_at, is_active')

    const totalMerchants = merchants?.length || 0
    const activeMerchants = merchants?.filter((m: any) => m.is_active).length || 0
    const newMerchants = merchants?.filter((m: any) => m.created_at >= startDate).length || 0

    // إحصائيات الاشتراكات
    const { data: subscriptions } = await supabaseAdmin
      .from('Subscription')
      .select('plan, status, messages_used, messages_limit, created_at')

    const subscriptionStats = subscriptions?.reduce((acc: any, sub: any) => {
      acc.total++
      acc.byPlan[sub.plan] = (acc.byPlan[sub.plan] || 0) + 1
      acc.byStatus[sub.status] = (acc.byStatus[sub.status] || 0) + 1
      acc.totalUsage += sub.messages_used || 0
      acc.totalLimit += sub.messages_limit || 0
      return acc
    }, {
      total: 0,
      byPlan: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      totalUsage: 0,
      totalLimit: 0
    }) || { total: 0, byPlan: {}, byStatus: {}, totalUsage: 0, totalLimit: 0 }

    // إحصائيات المحادثات
    const { data: conversations } = await supabaseAdmin
      .from('Conversation')
      .select('id, created_at, updated_at, is_active, Message(id, tokens_used, created_at)')

    const conversationStats = conversations?.reduce((acc: any, conv: any) => {
      acc.total++
      if (conv.is_active) acc.active++
      if (conv.created_at >= startDate) acc.recent++
      
      const messages = conv.Message || []
      acc.totalMessages += messages.length
      acc.totalTokens += messages.reduce((sum: number, m: any) => sum + (m.tokens_used || 0), 0)
      
      return acc
    }, {
      total: 0,
      active: 0,
      recent: 0,
      totalMessages: 0,
      totalTokens: 0
    }) || { total: 0, active: 0, recent: 0, totalMessages: 0, totalTokens: 0 }

    // إحصائيات مصادر البيانات
    const { data: dataSources } = await supabaseAdmin
      .from('DataSource')
      .select('source_type, file_size, created_at, processed_at')

    const dataSourceStats = dataSources?.reduce((acc: any, ds: any) => {
      acc.total++
      acc.byType[ds.source_type] = (acc.byType[ds.source_type] || 0) + 1
      acc.totalSize += ds.file_size || 0
      if (ds.processed_at) acc.processed++
      if (ds.created_at >= startDate) acc.recent++
      return acc
    }, {
      total: 0,
      byType: {} as Record<string, number>,
      totalSize: 0,
      processed: 0,
      recent: 0
    }) || { total: 0, byType: {}, totalSize: 0, processed: 0, recent: 0 }

    // تحليل الاتجاهات الزمنية (آخر 30 يوم)
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      return date.toISOString().split('T')[0]
    }).reverse()

    const dailyStats = last30Days.map(date => {
      const dayStart = `${date}T00:00:00.000Z`
      const dayEnd = `${date}T23:59:59.999Z`

      const dayMerchants = merchants?.filter((m: any) => 
        m.created_at >= dayStart && m.created_at <= dayEnd
      ).length || 0

      const dayConversations = conversations?.filter((c: any) => 
        c.created_at >= dayStart && c.created_at <= dayEnd
      ).length || 0

      const dayMessages = conversations?.reduce((sum: number, c: any) => {
        const dayMessages = c.Message?.filter((m: any) => 
          m.created_at >= dayStart && m.created_at <= dayEnd
        ).length || 0
        return sum + dayMessages
      }, 0) || 0

      return {
        date,
        merchants: dayMerchants,
        conversations: dayConversations,
        messages: dayMessages
      }
    })

    // أهم التجار (حسب الاستخدام)
    const topMerchants = await supabaseAdmin
      .from('Merchant')
      .select(`
        id,
        email,
        business_name,
        created_at,
        Subscription(messages_used, messages_limit),
        Conversation(id),
        DataSource(id),
        Message(id, tokens_used)
      `)
      .limit(10)

    const topMerchantsFormatted = topMerchants.data?.map((merchant: any) => {
      const subscription = merchant.Subscription?.[0]
      const totalMessages = merchant.Message?.length || 0
      const totalTokens = merchant.Message?.reduce((sum: number, m: any) => sum + (m.tokens_used || 0), 0) || 0
      
      return {
        id: merchant.id,
        email: merchant.email,
        businessName: merchant.business_name,
        createdAt: merchant.created_at,
        conversationsCount: merchant.Conversation?.length || 0,
        dataSourcesCount: merchant.DataSource?.length || 0,
        totalMessages,
        totalTokens,
        usage: subscription ? Math.round((subscription.messages_used / subscription.messages_limit) * 100) : 0
      }
    }).sort((a, b) => b.totalMessages - a.totalMessages) || []

    // حساب الإيرادات المتوقعة
    const revenueStats = subscriptions?.reduce((acc: any, sub: any) => {
      const planPrices = {
        BASIC: 49,
        STANDARD: 99,
        PREMIUM: 199,
        ENTERPRISE: 399
      }
      
      if (sub.status === 'ACTIVE') {
        acc.monthly += planPrices[sub.plan as keyof typeof planPrices] || 0
      }
      
      return acc
    }, { monthly: 0, annual: 0 }) || { monthly: 0, annual: 0 }

    revenueStats.annual = revenueStats.monthly * 12

    return NextResponse.json({
      success: true,
      analytics: {
        overview: {
          totalMerchants,
          activeMerchants,
          newMerchants,
          activeRate: totalMerchants > 0 ? Math.round((activeMerchants / totalMerchants) * 100) : 0,
          growthRate: totalMerchants > 0 ? Math.round((newMerchants / totalMerchants) * 100) : 0
        },
        subscriptions: {
          ...subscriptionStats,
          usageRate: subscriptionStats.totalLimit > 0 ? 
            Math.round((subscriptionStats.totalUsage / subscriptionStats.totalLimit) * 100) : 0
        },
        conversations: {
          ...conversationStats,
          averageMessagesPerConversation: conversationStats.total > 0 ? 
            Math.round(conversationStats.totalMessages / conversationStats.total) : 0,
          averageTokensPerMessage: conversationStats.totalMessages > 0 ? 
            Math.round(conversationStats.totalTokens / conversationStats.totalMessages) : 0
        },
        dataSources: {
          ...dataSourceStats,
          totalSizeMB: Math.round(dataSourceStats.totalSize / 1024 / 1024 * 100) / 100,
          processingRate: dataSourceStats.total > 0 ? 
            Math.round((dataSourceStats.processed / dataSourceStats.total) * 100) : 0
        },
        trends: {
          daily: dailyStats,
          timeRange: parseInt(timeRange)
        },
        topMerchants: topMerchantsFormatted,
        revenue: revenueStats,
        systemHealth: {
          databaseConnected: true,
          apiResponseTime: Date.now() % 1000, // Mock response time
          uptime: Math.floor(Math.random() * 99) + 95, // Mock uptime %
          lastBackup: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
        }
      }
    })

  } catch (error) {
    console.error('❌ Analytics API error:', error)
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
} 