import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, signToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Supabase REST API Registration Endpoint',
    method: 'POST',
    status: 'ready',
    testUrl: 'Use POST method with JSON body',
    requiredFields: ['email', 'password', 'businessName', 'chatbotId'],
    optionalFields: ['phone', 'timezone'],
    example: {
      email: 'test@example.com',
      password: 'password123',
      businessName: 'My Store',
      chatbotId: 'mystore',
      phone: '+1234567890',
      timezone: 'Asia/Dubai'
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, businessName, chatbotId, phone, timezone } = await request.json()

    // Validation
    if (!email || !password || !businessName || !chatbotId) {
      return NextResponse.json(
        { error: 'جميع الحقول المطلوبة يجب أن تكون مملوءة' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'إعدادات الخادم غير مكتملة' },
        { status: 500 }
      )
    }

    // Check if email already exists
    const emailCheckResponse = await fetch(`${supabaseUrl}/rest/v1/Merchant?email=eq.${email}&select=id`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!emailCheckResponse.ok) {
      return NextResponse.json(
        { error: 'خطأ في التحقق من البريد الإلكتروني' },
        { status: 500 }
      )
    }

    const existingUsers = await emailCheckResponse.json()
    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'هذا البريد الإلكتروني مستخدم بالفعل' },
        { status: 409 }
      )
    }

    // Check if chatbotId already exists
    const chatbotCheckResponse = await fetch(`${supabaseUrl}/rest/v1/Merchant?chatbotId=eq.${chatbotId}&select=id`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!chatbotCheckResponse.ok) {
      return NextResponse.json(
        { error: 'خطأ في التحقق من معرف الشات بوت' },
        { status: 500 }
      )
    }

    const existingChatbots = await chatbotCheckResponse.json()
    if (existingChatbots.length > 0) {
      return NextResponse.json(
        { error: 'اسم المتجر هذا مستخدم بالفعل' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create merchant
    const merchantData = {
      email,
      password: hashedPassword,
      businessName,
      chatbotId,
      phone: phone || null,
      timezone: timezone || 'UTC',
      welcomeMessage: 'أهلاً بك! كيف يمكنني مساعدتك اليوم؟',
      primaryColor: '#007bff'
    }

    const createMerchantResponse = await fetch(`${supabaseUrl}/rest/v1/Merchant`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(merchantData)
    })

    if (!createMerchantResponse.ok) {
      const errorText = await createMerchantResponse.text()
      return NextResponse.json(
        { error: 'فشل في إنشاء حساب التاجر', details: errorText },
        { status: 500 }
      )
    }

    const [merchant] = await createMerchantResponse.json()

    // Create subscription
    const subscriptionData = {
      merchantId: merchant.id,
      plan: 'BASIC',
      status: 'TRIAL',
      messagesLimit: 1000,
      messagesUsed: 0,
      dailyMessagesLimit: 50,
      dailyMessagesUsed: 0,
      lastDailyReset: new Date().toISOString().split('T')[0],
      lastDailyResetTimezone: new Date().toISOString()
    }

    const createSubscriptionResponse = await fetch(`${supabaseUrl}/rest/v1/Subscription`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(subscriptionData)
    })

    if (!createSubscriptionResponse.ok) {
      // If subscription creation fails, try to delete the merchant to maintain consistency
      await fetch(`${supabaseUrl}/rest/v1/Merchant?id=eq.${merchant.id}`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      })

      return NextResponse.json(
        { error: 'فشل في إنشاء اشتراك التاجر' },
        { status: 500 }
      )
    }

    const [subscription] = await createSubscriptionResponse.json()

    // Generate token
    const token = signToken({
      merchantId: merchant.id,
      email: merchant.email
    })

    return NextResponse.json({
      success: true,
      method: 'supabase_rest_api',
      token,
      merchant: {
        id: merchant.id,
        email: merchant.email,
        businessName: merchant.businessName,
        chatbotId: merchant.chatbotId,
        subscription: subscription
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Supabase registration error:', error)
    
    return NextResponse.json({
      error: 'حدث خطأ غير متوقع في الخادم',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 