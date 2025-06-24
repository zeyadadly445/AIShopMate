import { NextRequest, NextResponse } from 'next/server'
import { comparePassword, signToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Supabase REST API Login Endpoint',
    method: 'POST',
    status: 'ready',
    requiredFields: ['email', 'password']
  })
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني وكلمة المرور مطلوبان' },
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

    // Find merchant by email with subscription
    const merchantResponse = await fetch(`${supabaseUrl}/rest/v1/Merchant?email=eq.${email}&select=*,subscription:Subscription(*)`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!merchantResponse.ok) {
      return NextResponse.json(
        { error: 'خطأ في الاتصال بقاعدة البيانات' },
        { status: 500 }
      )
    }

    const merchants = await merchantResponse.json()
    
    if (merchants.length === 0) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' },
        { status: 401 }
      )
    }

    const merchant = merchants[0]

    // Check password
    const isValidPassword = await comparePassword(password, merchant.password)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' },
        { status: 401 }
      )
    }

    // Generate token
    const token = signToken({
      merchantId: merchant.id,
      email: merchant.email
    })

    // Prepare merchant data (same format as registration)
    const merchantData = {
      id: merchant.id,
      email: merchant.email,
      businessName: merchant.businessName,
      chatbotId: merchant.chatbotId,
      subscription: merchant.subscription?.[0] || {
        plan: 'BASIC',
        status: 'TRIAL',
        messagesLimit: 1000,
        messagesUsed: 0
      }
    }

    return NextResponse.json({
      success: true,
      method: 'supabase_rest_api',
      token,
      merchant: merchantData
    })

  } catch (error) {
    console.error('Supabase login error:', error)
    
    return NextResponse.json({
      error: 'حدث خطأ غير متوقع في الخادم',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 