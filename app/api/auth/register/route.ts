import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, signToken } from '@/lib/auth'

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

    // Check if email already exists
    const existingMerchant = await prisma.merchant.findUnique({
      where: { email }
    })

    if (existingMerchant) {
      return NextResponse.json(
        { error: 'هذا البريد الإلكتروني مستخدم بالفعل' },
        { status: 409 }
      )
    }

    // Check if chatbotId already exists
    const existingChatbotId = await prisma.merchant.findUnique({
      where: { chatbotId }
    })

    if (existingChatbotId) {
      return NextResponse.json(
        { error: 'اسم المتجر هذا مستخدم بالفعل' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create merchant with subscription (let Supabase generate UUIDs)
    const merchant = await prisma.merchant.create({
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
    }, { status: 201 })

  } catch (error) {
    console.error('Registration error:', error)
    
    // Handle specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        if (error.message.includes('email')) {
          return NextResponse.json(
            { error: 'هذا البريد الإلكتروني مستخدم بالفعل' },
            { status: 409 }
          )
        }
        if (error.message.includes('chatbotId')) {
          return NextResponse.json(
            { error: 'اسم المتجر هذا مستخدم بالفعل' },
            { status: 409 }
          )
        }
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