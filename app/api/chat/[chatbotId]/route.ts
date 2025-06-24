import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  console.log('🚀 === SIMPLE TEST VERSION ===')
  
  try {
    console.log('✅ Step 1: Function called')
    
    const { chatbotId } = await params
    console.log('✅ Step 2: ChatbotId extracted:', chatbotId)
    
    const body = await request.json()
    console.log('✅ Step 3: Body parsed:', Object.keys(body))
    
    const { message, sessionId } = body
    console.log('✅ Step 4: Data extracted:', { hasMessage: !!message, hasSessionId: !!sessionId })
    
    // Simple test response
    return NextResponse.json({
      success: true,
      test: 'Simple test successful',
      chatbotId,
      message: message?.substring(0, 50),
      sessionId,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ SIMPLE TEST ERROR:', error)
    console.error('❌ Error type:', typeof error)
    console.error('❌ Error message:', error instanceof Error ? error.message : String(error))
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack')
    
    return NextResponse.json({
      error: 'Simple test failed',
      message: error instanceof Error ? error.message : String(error),
      type: typeof error,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 