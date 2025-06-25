import { NextRequest, NextResponse } from 'next/server'
import { SimpleAdminAuth } from '@/lib/admin-auth-simple'
import { supabaseAdmin } from '@/lib/supabase'

// GET - جلب جميع التجار مع تفاصيل كاملة
export async function GET(request: NextRequest) {
  try {
    console.log('👥 Admin Merchants API - GET all merchants')
    
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
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const search = url.searchParams.get('search') || ''
    const status = url.searchParams.get('status') || ''
    const plan = url.searchParams.get('plan') || ''

    const offset = (page - 1) * limit

    // جلب التجار مع جميع البيانات المرتبطة
    const { data: merchants, error } = await supabaseAdmin
      .from('Merchant')
      .select(`
        *,
        Subscription (*),
        Conversation (
          id,
          created_at,
          updated_at
        ),
        DataSource (
          id,
          source_type,
          name,
          created_at,
          file_size
        ),
        Message (
          id,
          created_at
        )
      `)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching merchants:', error)
      return NextResponse.json({ error: 'خطأ في جلب البيانات' }, { status: 500 })
    }

    // إحصائيات إجمالية
    const { count: totalCount } = await supabaseAdmin
      .from('Merchant')
      .select('id', { count: 'exact', head: true })

    // تنسيق البيانات
    const formattedMerchants = merchants?.map(merchant => {
      const subscription = merchant.Subscription?.[0]
      const conversationCount = merchant.Conversation?.length || 0
      const dataSourceCount = merchant.DataSource?.length || 0
      const messageCount = merchant.Message?.length || 0
      const totalFileSize = merchant.DataSource?.reduce((sum: number, ds: any) => sum + (ds.file_size || 0), 0) || 0

      return {
        id: merchant.id,
        email: merchant.email,
        businessName: merchant.business_name,
        phone: merchant.phone,
        chatbotId: merchant.chatbot_id,
        welcomeMessage: merchant.welcome_message,
        primaryColor: merchant.primary_color,
        isActive: merchant.is_active,
        createdAt: merchant.created_at,
        updatedAt: merchant.updated_at,
        subscription: subscription ? {
          id: subscription.id,
          plan: subscription.plan,
          status: subscription.status,
          messagesLimit: subscription.messages_limit,
          messagesUsed: subscription.messages_used,
          usagePercentage: Math.round((subscription.messages_used / subscription.messages_limit) * 100),
          startDate: subscription.start_date,
          endDate: subscription.end_date,
          createdAt: subscription.created_at,
          updatedAt: subscription.updated_at
        } : null,
        stats: {
          conversationCount,
          dataSourceCount,
          messageCount,
          totalFileSize: Math.round(totalFileSize / 1024 / 1024 * 100) / 100, // MB
          lastActivity: merchant.updated_at,
          joinedDaysAgo: Math.floor((Date.now() - new Date(merchant.created_at).getTime()) / (1000 * 60 * 60 * 24))
        }
      }
    }) || []

    return NextResponse.json({
      success: true,
      merchants: formattedMerchants,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      }
    })

  } catch (error) {
    console.error('❌ Merchants API error:', error)
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}

// POST - إنشاء تاجر جديد
export async function POST(request: NextRequest) {
  try {
    console.log('👥 Admin Merchants API - Create new merchant')
    
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

    const {
      email,
      businessName,
      phone,
      welcomeMessage,
      primaryColor,
      subscriptionPlan
    } = await request.json()

    // التحقق من البيانات المطلوبة
    if (!email || !businessName) {
      return NextResponse.json({ error: 'البريد الإلكتروني واسم الأعمال مطلوبان' }, { status: 400 })
    }

    // التحقق من عدم وجود البريد الإلكتروني
    const { data: existingMerchant } = await supabaseAdmin
      .from('Merchant')
      .select('id')
      .eq('email', email)
      .single()

    if (existingMerchant) {
      return NextResponse.json({ error: 'البريد الإلكتروني موجود بالفعل' }, { status: 400 })
    }

    // إنشاء chatbot_id فريد
    const chatbotId = `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // إنشاء التاجر
    const { data: newMerchant, error: merchantError } = await supabaseAdmin
      .from('Merchant')
      .insert({
        email,
        business_name: businessName,
        phone: phone || null,
        chatbot_id: chatbotId,
        welcome_message: welcomeMessage || 'مرحباً! كيف يمكنني مساعدتك؟',
        primary_color: primaryColor || '#3b82f6',
        is_active: true
      })
      .select()
      .single()

    if (merchantError) {
      console.error('❌ Error creating merchant:', merchantError)
      return NextResponse.json({ error: 'خطأ في إنشاء التاجر' }, { status: 500 })
    }

    // إنشاء اشتراك إذا تم تحديده
    if (subscriptionPlan) {
      const planLimits = {
        BASIC: 1000,
        STANDARD: 5000,
        PREMIUM: 15000,
        ENTERPRISE: 50000
      }

      await supabaseAdmin
        .from('Subscription')
        .insert({
          merchant_id: newMerchant.id,
          plan: subscriptionPlan,
          status: 'TRIAL',
          messages_limit: planLimits[subscriptionPlan as keyof typeof planLimits] || 1000,
          messages_used: 0,
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days trial
        })
    }

    console.log(`✅ Created new merchant: ${businessName} (${email})`)

    return NextResponse.json({
      success: true,
      merchant: {
        id: newMerchant.id,
        email: newMerchant.email,
        businessName: newMerchant.business_name,
        chatbotId: newMerchant.chatbot_id,
        createdAt: newMerchant.created_at
      }
    })

  } catch (error) {
    console.error('❌ Create merchant error:', error)
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
} 