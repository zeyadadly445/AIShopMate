import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const chatbotId = searchParams.get('chatbotId')

    if (!chatbotId) {
      return NextResponse.json(
        { error: 'chatbotId مطلوب' },
        { status: 400 }
      )
    }

    if (chatbotId.length < 3) {
      return NextResponse.json(
        { available: false, error: 'الاسم يجب أن يكون 3 أحرف على الأقل' },
        { status: 400 }
      )
    }

    // Check if chatbotId exists
    const existingMerchant = await prisma.merchant.findUnique({
      where: { chatbotId }
    })

    return NextResponse.json({
      available: !existingMerchant,
      chatbotId
    })

  } catch (error) {
    console.error('Check ID error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
} 