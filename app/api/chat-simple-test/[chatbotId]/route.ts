import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const { chatbotId } = await params
    const { message } = await request.json()

    console.log('🧪 Simple Chat Test:', { chatbotId, message })

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    // Direct AI call without database or complex context
    const chuteAIApiKey = process.env.CHUTES_AI_API_KEY
    const chuteAIUrl = process.env.CHUTES_AI_API_URL || 'https://llm.chutes.ai/v1/chat/completions'
    const model = process.env.CHUTES_AI_MODEL || 'deepseek-ai/DeepSeek-V3-0324'

    if (!chuteAIApiKey) {
      return NextResponse.json({
        error: 'API key missing',
        response: 'مرحباً! الخدمة غير متاحة حالياً.'
      })
    }

    console.log('🤖 Simple AI request:', { model, url: chuteAIUrl })

    const response = await fetch(chuteAIUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${chuteAIApiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: `أنت مساعد ذكي لمتجر ${chatbotId}. تحدث باللغة العربية وكن مفيداً وودوداً. الرسالة: ${message}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
        stream: false
      }),
      signal: AbortSignal.timeout(10000)
    })

    console.log('📊 AI Response Status:', response.status, response.ok)

    if (response.ok) {
      const data = await response.json()
      const aiResponse = data.choices?.[0]?.message?.content?.trim()
      
      console.log('✅ AI Success:', { 
        hasChoices: !!data.choices,
        hasContent: !!aiResponse,
        contentLength: aiResponse?.length 
      })

      if (aiResponse) {
        return NextResponse.json({
          response: aiResponse,
          status: 'success',
          source: 'ai',
          model,
          timestamp: new Date().toISOString()
        })
      } else {
        return NextResponse.json({
          response: `مرحباً! أهلاً بك في متجر ${chatbotId}. كيف يمكنني مساعدتك؟`,
          status: 'fallback_no_content',
          source: 'fallback',
          timestamp: new Date().toISOString()
        })
      }
    } else {
      const errorText = await response.text()
      console.log('❌ AI Error:', response.status, errorText)
      
      return NextResponse.json({
        response: `مرحباً! أهلاً بك في متجر ${chatbotId}. الخدمة محدودة حالياً لكنني سعيد بمساعدتك!`,
        status: 'fallback_error',
        source: 'fallback',
        error: `HTTP ${response.status}`,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('💥 Simple chat error:', error)
    return NextResponse.json({
      response: 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.',
      status: 'error',
      source: 'fallback',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 