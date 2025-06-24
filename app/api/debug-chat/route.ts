import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    const { data: dbTest, error: dbError } = await supabaseAdmin
      .from('Merchant')
      .select('id, chatbotId, businessName')
      .limit(5)

    // Test AI configuration
    const aiConfig = {
      hasApiKey: !!process.env.CHUTES_AI_API_KEY,
      apiUrl: process.env.CHUTES_AI_API_URL || 'https://llm.chutes.ai/v1/chat/completions',
      model: process.env.CHUTES_AI_MODEL || 'deepseek-ai/DeepSeek-V3-0324',
      apiKeyPreview: process.env.CHUTES_AI_API_KEY ? 
        process.env.CHUTES_AI_API_KEY.substring(0, 20) + '...' : 'NOT SET'
    }

    return NextResponse.json({
      status: 'success',
      database: {
        connected: !dbError,
        error: dbError?.message,
        sampleMerchants: dbTest?.slice(0, 3)
      },
      aiConfig,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasDatabaseUrl: !!process.env.DATABASE_URL
      }
    })

  } catch (error) {
    console.error('Debug chat error:', error)
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { chatbotId, message, sessionId } = await request.json()

    if (!chatbotId || !message || !sessionId) {
      return NextResponse.json({
        error: 'Missing required fields: chatbotId, message, sessionId',
        received: { chatbotId, message, sessionId },
        status: 'error'
      }, { status: 400 })
    }

    // Step 1: Test merchant lookup
    const { data: merchant, error: merchantError } = await supabaseAdmin
      .from('Merchant')
      .select(`
        id,
        businessName,
        welcomeMessage,
        primaryColor,
        subscription:Subscription(
          messagesLimit,
          messagesUsed,
          status
        ),
        dataSources:MerchantDataSource(
          type,
          title,
          url,
          isActive
        )
      `)
      .eq('chatbotId', chatbotId)
      .single()

    if (merchantError || !merchant) {
      return NextResponse.json({
        error: 'Merchant not found',
        chatbotId,
        merchantError: merchantError?.message,
        status: 'error'
      }, { status: 404 })
    }

    // Step 2: Test AI API call
    const chuteAIApiKey = process.env.CHUTES_AI_API_KEY
    const chuteAIUrl = process.env.CHUTES_AI_API_URL || 'https://llm.chutes.ai/v1/chat/completions'

    if (!chuteAIApiKey) {
      return NextResponse.json({
        error: 'CHUTES_AI_API_KEY not configured',
        status: 'error'
      }, { status: 500 })
    }

    const testPrompt = `أنت مساعد ذكي لمتجر "${merchant.businessName}". تحدث باللغة العربية بطريقة مهذبة ومساعدة.`

    const aiResponse = await fetch(chuteAIUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${chuteAIApiKey}`
      },
      body: JSON.stringify({
        model: process.env.CHUTES_AI_MODEL || 'deepseek-ai/DeepSeek-V3-0324',
        messages: [
          {
            role: 'user',
            content: `${testPrompt}\n\nCustomer: ${message}`
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
        stream: false
      })
    })

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()
      return NextResponse.json({
        error: `AI API Error: ${aiResponse.status} ${aiResponse.statusText}`,
        details: errorText,
        status: 'error'
      }, { status: 500 })
    }

    const aiData = await aiResponse.json()

    return NextResponse.json({
      success: true,
      merchant: {
        id: merchant.id,
        businessName: merchant.businessName,
        chatbotId: merchant.chatbotId || chatbotId
      },
      aiResponse: aiData.choices?.[0]?.message?.content || 'No response content',
      debugInfo: {
        promptUsed: testPrompt,
        messageReceived: message,
        sessionId,
        aiModel: process.env.CHUTES_AI_MODEL || 'deepseek-ai/DeepSeek-V3-0324'
      },
      status: 'success'
    })

  } catch (error) {
    console.error('Debug chat POST error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      status: 'error'
    }, { status: 500 })
  }
} 