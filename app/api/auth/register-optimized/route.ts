import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, signToken } from '@/lib/auth'
import { withDatabase } from '@/lib/prisma-optimized'

export async function POST(request: NextRequest) {
  try {
    const { email, password, businessName, chatbotId, phone } = await request.json()

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

    // Execute all database operations efficiently
    const result = await withDatabase(async (db) => {
      // Check if email already exists
      const existingMerchant = await db.merchant.findUnique({
        where: { email }
      })

      if (existingMerchant) {
        throw new Error('EMAIL_EXISTS')
      }

      // Check if chatbotId already exists
      const existingChatbotId = await db.merchant.findUnique({
        where: { chatbotId }
      })

      if (existingChatbotId) {
        throw new Error('CHATBOT_ID_EXISTS')
      }

      // Hash password
      const hashedPassword = await hashPassword(password)

      // Create merchant with subscription (single transaction)
      const merchant = await db.merchant.create({
        data: {
          email,
          password: hashedPassword,
          businessName,
          chatbotId,
          phone: phone || null,
          subscription: {
            create: {
              plan: 'BASIC',
              status: 'TRIAL',
              messagesLimit: 1000,
              messagesUsed: 0
            }
          }
        },
        include: { subscription: true }
      })

      return merchant
    })

    // Generate token
    const token = signToken({
      merchantId: result.id,
      email: result.email
    })

    return NextResponse.json({
      success: true,
      token,
      merchant: {
        id: result.id,
        email: result.email,
        businessName: result.businessName,
        chatbotId: result.chatbotId,
        subscription: result.subscription
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Registration error:', error)
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message === 'EMAIL_EXISTS') {
        return NextResponse.json(
          { error: 'هذا البريد الإلكتروني مستخدم بالفعل' },
          { status: 409 }
        )
      }
      
      if (error.message === 'CHATBOT_ID_EXISTS') {
        return NextResponse.json(
          { error: 'اسم المتجر هذا مستخدم بالفعل' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: 'حدث خطأ في الخادم', details: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع في الخادم' },
      { status: 500 }
    )
  }
} 