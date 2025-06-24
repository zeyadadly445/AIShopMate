import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    // التحقق من صلاحيات المدير
    const adminSession = requireAdminAuth(request)
    if (!adminSession) {
      return NextResponse.json({
        error: 'غير مصرح - صلاحيات مدير مطلوبة'
      }, { status: 403 })
    }

    console.log(`📊 جلب بيانات لوحة الإدارة بواسطة: ${adminSession.username}`)

    // 1. جلب جميع التجار مع اشتراكاتهم
    const { data: merchants, error: merchantsError } = await supabaseAdmin
      .from('Merchant')
      .select(`
        id,
        email,
        businessName,
        phone,
        chatbotId,
        welcomeMessage,
        primaryColor,
        createdAt,
        updatedAt,
        subscription:Subscription(
          id,
          plan,
          status,
          messagesLimit,
          messagesUsed,
          startDate,
          endDate,
          createdAt,
          updatedAt
        )
      `)
      .order('createdAt', { ascending: false })

    if (merchantsError) {
      console.error('خطأ في جلب بيانات التجار:', merchantsError)
      throw merchantsError
    }

    // 2. جلب إحصائيات المحادثات والرسائل
    const { data: conversationStats, error: conversationError } = await supabaseAdmin
      .from('Conversation')
      .select(`
        id,
        merchantId,
        sessionId,
        createdAt,
        messages:Message(count)
      `)

    if (conversationError) {
      console.error('خطأ في جلب إحصائيات المحادثات:', conversationError)
    }

    // 3. حساب الإحصائيات العامة
    const totalMerchants = merchants?.length || 0
    const activeMerchants = merchants?.filter(m => {
      const subscription = Array.isArray(m.subscription) 
        ? m.subscription[0] 
        : m.subscription
      return subscription && subscription.status === 'ACTIVE'
    }).length || 0
    
    const trialMerchants = merchants?.filter(m => {
      const subscription = Array.isArray(m.subscription)
        ? m.subscription[0] 
        : m.subscription
      return subscription && subscription.status === 'TRIAL'
    }).length || 0

    // 4. حساب إجمالي الرسائل المستخدمة
    const totalMessagesUsed = merchants?.reduce((sum, merchant) => {
      const subscription = Array.isArray(merchant.subscription) 
        ? merchant.subscription[0] 
        : merchant.subscription
      return sum + (subscription?.messagesUsed || 0)
    }, 0) || 0

    // 5. حساب الإيرادات المحتملة (تقديرية)
    const potentialRevenue = merchants?.reduce((sum, merchant) => {
      const subscription = Array.isArray(merchant.subscription) 
        ? merchant.subscription[0] 
        : merchant.subscription
      
      if (subscription?.plan === 'PREMIUM') return sum + 50
      if (subscription?.plan === 'STANDARD') return sum + 25
      if (subscription?.plan === 'BASIC') return sum + 10
      return sum
    }, 0) || 0

    // 6. المستخدمين الجدد هذا الشهر
    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)
    
    const newMerchantsThisMonth = merchants?.filter(m => 
      new Date(m.createdAt) >= thisMonth
    ).length || 0

    // 7. أعلى المستخدمين استخداماً
    const topUsers = merchants
      ?.map(merchant => {
        const subscription = Array.isArray(merchant.subscription) 
          ? merchant.subscription[0] 
          : merchant.subscription
        
        return {
          id: merchant.id,
          businessName: merchant.businessName,
          email: merchant.email,
          messagesUsed: subscription?.messagesUsed || 0,
          messagesLimit: subscription?.messagesLimit || 0,
          usagePercentage: subscription?.messagesLimit 
            ? Math.round((subscription.messagesUsed / subscription.messagesLimit) * 100)
            : 0,
          plan: subscription?.plan || 'BASIC',
          status: subscription?.status || 'TRIAL',
          createdAt: merchant.createdAt
        }
      })
      .sort((a, b) => b.messagesUsed - a.messagesUsed)
      .slice(0, 10) || []

    // 8. المستخدمين الذين وصلوا للحد الأقصى
    const limitReachedUsers = merchants?.filter(merchant => {
      const subscription = Array.isArray(merchant.subscription) 
        ? merchant.subscription[0] 
        : merchant.subscription
      
      return subscription && subscription.messagesUsed >= subscription.messagesLimit
    }).length || 0

    const dashboardData = {
      // إحصائيات عامة
      stats: {
        totalMerchants,
        activeMerchants,
        trialMerchants,
        newMerchantsThisMonth,
        totalMessagesUsed,
        limitReachedUsers,
        potentialRevenue,
        totalConversations: conversationStats?.length || 0
      },

      // قائمة التجار
      merchants: merchants?.map(merchant => {
        const subscription = Array.isArray(merchant.subscription) 
          ? merchant.subscription[0] 
          : merchant.subscription

        return {
          id: merchant.id,
          email: merchant.email,
          businessName: merchant.businessName,
          phone: merchant.phone,
          chatbotId: merchant.chatbotId,
          welcomeMessage: merchant.welcomeMessage,
          primaryColor: merchant.primaryColor,
          createdAt: merchant.createdAt,
          updatedAt: merchant.updatedAt,
          subscription: subscription ? {
            id: subscription.id,
            plan: subscription.plan,
            status: subscription.status,
            messagesLimit: subscription.messagesLimit,
            messagesUsed: subscription.messagesUsed,
            usagePercentage: subscription.messagesLimit 
              ? Math.round((subscription.messagesUsed / subscription.messagesLimit) * 100)
              : 0,
            remainingMessages: subscription.messagesLimit - subscription.messagesUsed,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            createdAt: subscription.createdAt,
            updatedAt: subscription.updatedAt
          } : null
        }
      }) || [],

      // أعلى المستخدمين
      topUsers,

      // بيانات إضافية
      lastUpdated: new Date().toISOString(),
      adminSession: {
        username: adminSession.username,
        loginTime: adminSession.loginTime
      }
    }

    return NextResponse.json(dashboardData)

  } catch (error) {
    console.error('💥 خطأ في جلب بيانات لوحة الإدارة:', error)
    return NextResponse.json({
      error: 'خطأ في جلب البيانات',
      message: error instanceof Error ? error.message : 'خطأ غير معروف'
    }, { status: 500 })
  }
} 