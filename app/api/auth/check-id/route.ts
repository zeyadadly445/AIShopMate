import { NextRequest, NextResponse } from 'next/server'

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

    // Try to connect to database using smart fallback
    try {
      const { getDB } = await import('@/lib/prisma-simple')
      const db = await getDB()
      
      // Check if chatbotId exists
      const existingMerchant = await db.merchant.findUnique({
        where: { chatbotId }
      })

      return NextResponse.json({
        available: !existingMerchant,
        chatbotId
      })

    } catch (dbError) {
      console.error('Database error in check-id:', dbError)
      
      // Fallback: assume available for now
      return NextResponse.json({
        available: true,
        chatbotId,
        warning: 'Database check failed, assuming available'
      })
    }

  } catch (error) {
    console.error('Check ID error:', error)
    return NextResponse.json(
      { 
        error: 'حدث خطأ في الخادم',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 