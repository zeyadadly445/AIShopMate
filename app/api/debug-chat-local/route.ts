import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Debug Chat Local Test Started')
    
    const { message = "مرحبا", chatbotId = "shoes123" } = await request.json()
    
    // Test environment variables
    const envCheck = {
      CHUTES_AI_API_KEY: !!process.env.CHUTES_AI_API_KEY,
      CHUTES_AI_API_URL: process.env.CHUTES_AI_API_URL || 'default',
      CHUTES_AI_MODEL: process.env.CHUTES_AI_MODEL || 'default'
    }
    
    console.log('🔧 Environment Variables:', envCheck)
    
    // Test AI API call directly
    const chuteAIApiKey = process.env.CHUTES_AI_API_KEY
    const chuteAIUrl = process.env.CHUTES_AI_API_URL || 'https://llm.chutes.ai/v1/chat/completions'
    const model = process.env.CHUTES_AI_MODEL || 'deepseek-ai/DeepSeek-V3-0324'
    
    if (!chuteAIApiKey) {
      return NextResponse.json({
        error: 'API Key missing',
        envCheck,
        status: 'failed'
      })
    }
    
    const requestBody = {
      model,
      messages: [
        {
          role: 'user',
          content: `أنت مساعد ذكي لمتجر shoes. رد باللغة العربية على: ${message}`
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
      stream: false
    }
    
    console.log('🤖 Making AI request:', { model, url: chuteAIUrl })
    
    const response = await fetch(chuteAIUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${chuteAIApiKey}`
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(10000)
    })
    
    const responseData = await response.json()
    
    console.log('📝 AI Response:', {
      status: response.status,
      ok: response.ok,
      hasChoices: !!responseData.choices,
      choicesLength: responseData.choices?.length,
      hasContent: !!responseData.choices?.[0]?.message?.content
    })
    
    return NextResponse.json({
      status: response.ok ? 'success' : 'failed',
      httpStatus: response.status,
      envCheck,
      requestBody,
      responseData,
      aiContent: responseData.choices?.[0]?.message?.content || null,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('💥 Debug error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      status: 'exception',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST a message to test chat-local functionality',
    example: {
      message: 'مرحبا',
      chatbotId: 'shoes123'
    }
  })
} 