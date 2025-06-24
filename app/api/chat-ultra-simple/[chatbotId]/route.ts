import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const { chatbotId } = await params
    const { message } = await request.json()

    console.log('⚡ Ultra simple chat:', { chatbotId, message: message?.substring(0, 30) })

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    // Ultra simple AI call
    const chuteAIApiKey = process.env.CHUTES_AI_API_KEY
    const chuteAIUrl = 'https://llm.chutes.ai/v1/chat/completions'

    if (!chuteAIApiKey) {
      return NextResponse.json({
        response: `مرحباً! أهلاً بك في متجر ${chatbotId}. كيف يمكنني مساعدتك؟`,
        source: 'fallback_no_key'
      })
    }

    try {
      console.log('🚀 Ultra simple AI call')
      
      const response = await fetch(chuteAIUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${chuteAIApiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-ai/DeepSeek-V3-0324',
          messages: [
            {
              role: 'user',
              content: `أنت مساعد متجر ${chatbotId}. رد بالعربية: ${message}`
            }
          ],
          max_tokens: 200,
          temperature: 0.1,
          stream: false
        }),
        signal: AbortSignal.timeout(3000) // Very short timeout
      })

      if (response.ok) {
        const data = await response.json()
        const aiContent = data.choices?.[0]?.message?.content?.trim()
        
        if (aiContent) {
          console.log('✅ Ultra simple AI success!')
          return NextResponse.json({
            response: aiContent,
            source: 'ai_ultra_simple',
            model: 'deepseek-ai/DeepSeek-V3-0324',
            timestamp: new Date().toISOString()
          })
        }
      }
      
      throw new Error('AI failed')
      
    } catch (aiError) {
      console.log('❌ Ultra simple AI failed:', aiError)
      
      return NextResponse.json({
        response: `مرحباً! أهلاً بك في متجر ${chatbotId}. أحاول مساعدتك بأفضل ما يمكنني!`,
        source: 'fallback_ai_failed',
        error: aiError instanceof Error ? aiError.message : String(aiError),
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('💥 Ultra simple error:', error)
    return NextResponse.json({
      response: 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.',
      source: 'fallback_system_error'
    }, { status: 500 })
  }
} 