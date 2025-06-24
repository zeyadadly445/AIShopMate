import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/prisma-simple'
import { comparePassword, signToken } from '@/lib/auth'

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

    // Get database connection with fallback
    const db = await getDB()
    
    // Find merchant
    const merchant = await db.merchant.findUnique({
      where: { email },
      include: { subscription: true }
    })

    if (!merchant) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' },
        { status: 401 }
      )
    }

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

    return NextResponse.json({
      token,
      merchant: {
        id: merchant.id,
        email: merchant.email,
        businessName: merchant.businessName,
        chatbotId: merchant.chatbotId,
        subscription: merchant.subscription
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
} 