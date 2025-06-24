import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const chuteAIApiKey = process.env.CHUTES_AI_API_KEY
    const chuteAIUrl = process.env.CHUTES_AI_API_URL || 'https://api.chutes.ai/v1/chat/completions'

    if (!chuteAIApiKey) {
      return NextResponse.json({
        error: 'CHUTES_AI_API_KEY not configured',
        status: 'error'
      }, { status: 500 })
    }

    // Test message
    const messages = [
      {
        role: 'system',
        content: 'أنت مساعد ذكي متخصص في خدمة العملاء. تحدث باللغة العربية.'
      },
      {
        role: 'user',
        content: 'مرحبا، كيف يمكنني مساعدتك اليوم؟'
      }
    ]

    const aiResponse = await fetch(chuteAIUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${chuteAIApiKey}`
      },
      body: JSON.stringify({
        model: process.env.CHUTES_AI_MODEL || 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 150,
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

    const data = await aiResponse.json()

    return NextResponse.json({
      success: true,
      aiConfig: {
        apiUrl: chuteAIUrl,
        model: process.env.CHUTES_AI_MODEL || 'gpt-3.5-turbo',
        hasApiKey: !!chuteAIApiKey
      },
      testResponse: data,
      status: 'success'
    })

  } catch (error) {
    console.error('AI test error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      status: 'error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()
    
    if (!message) {
      return NextResponse.json({
        error: 'Message is required',
        status: 'error'
      }, { status: 400 })
    }

    const chuteAIApiKey = process.env.CHUTES_AI_API_KEY
    const chuteAIUrl = process.env.CHUTES_AI_API_URL || 'https://api.chutes.ai/v1/chat/completions'

    if (!chuteAIApiKey) {
      return NextResponse.json({
        error: 'CHUTES_AI_API_KEY not configured',
        status: 'error'
      }, { status: 500 })
    }

    const messages = [
      {
        role: 'system',
        content: 'أنت مساعد ذكي متخصص في خدمة العملاء. تحدث باللغة العربية بطريقة مهذبة ومساعدة.'
      },
      {
        role: 'user',
        content: message
      }
    ]

    const aiResponse = await fetch(chuteAIUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${chuteAIApiKey}`
      },
      body: JSON.stringify({
        model: process.env.CHUTES_AI_MODEL || 'gpt-3.5-turbo',
        messages: messages,
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

    const data = await aiResponse.json()
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return NextResponse.json({
        success: true,
        userMessage: message,
        aiResponse: data.choices[0].message.content.trim(),
        usage: data.usage,
        status: 'success'
      })
    } else {
      return NextResponse.json({
        error: 'Invalid AI API response format',
        response: data,
        status: 'error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('AI test error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      status: 'error'
    }, { status: 500 })
  }
} 