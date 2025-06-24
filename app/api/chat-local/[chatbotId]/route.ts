import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const { chatbotId } = await params
    const { message, conversationHistory = [] } = await request.json()

    console.log('💬 Local chat request:', { 
      chatbotId, 
      message: message?.substring(0, 50),
      historyLength: conversationHistory.length 
    })

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // 1. Get merchant information only
    const { data: merchant, error: merchantError } = await supabaseAdmin
      .from('Merchant')
      .select(`
        id,
        businessName,
        welcomeMessage,
        primaryColor,
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
      console.log('❌ Merchant not found:', merchantError?.message)
      return NextResponse.json({ 
        error: 'Merchant not found',
        response: 'عذراً، لم نتمكن من العثور على هذا المتجر.'
      }, { status: 404 })
    }

    console.log('✅ Merchant found:', merchant.businessName)

    // 2. Prepare context for AI with business info and conversation history
    const businessContext = `
أنت مساعد ذكي لمتجر "${merchant.businessName}".

معلومات المتجر:
${merchant.dataSources?.filter((ds: any) => ds.isActive).map((ds: any) => 
  `- ${ds.type}: ${ds.title} (${ds.url})`
).join('\n') || 'لا توجد مصادر بيانات متاحة حالياً'}

تعليمات مهمة:
- تحدث باللغة العربية دائماً
- كن مهذباً ومساعداً وودوداً
- ركز على منتجات وخدمات "${merchant.businessName}"
- استخدم المحادثة السابقة لفهم السياق وتقديم إجابات أفضل
- إذا لم تجد إجابة محددة، انصح العميل بالتواصل مع المتجر مباشرة
- لا تتحدث عن متاجر أخرى أو منافسين
- احتفظ بالطابع المهني والودود
- قدم معلومات مفيدة وعملية للعملاء

المحادثة السابقة:
${conversationHistory.slice(-10).map((msg: ChatMessage) => 
  `${msg.role === 'user' ? 'العميل' : 'المساعد'}: ${msg.content}`
).join('\n')}
`

    // 3. Generate AI response
    let aiResponse = `مرحباً! أنا مساعد ${merchant.businessName}. شكراً لرسالتك. كيف يمكنني مساعدتك اليوم؟`

    try {
      const chuteAIApiKey = process.env.CHUTES_AI_API_KEY
      const chuteAIUrl = process.env.CHUTES_AI_API_URL || 'https://llm.chutes.ai/v1/chat/completions'

      if (!chuteAIApiKey) {
        console.log('⚠️ AI API key not found, using fallback')
        return NextResponse.json({ response: aiResponse })
      }

      // Calculate dynamic max tokens based on context
      const baseTokens = 1000
      const messageLength = message.length
      const historyLength = conversationHistory.length
      const contextLength = businessContext.length
      
      let maxTokens = baseTokens
      maxTokens += Math.min(messageLength * 2, 5000)
      maxTokens += Math.min(historyLength * 100, 3000)
      maxTokens += Math.min(contextLength / 10, 2000)
      maxTokens = Math.min(maxTokens, 8000) // Reasonable limit for faster responses

      console.log('🤖 Calling AI API...', { maxTokens, historyLength })

      const response = await fetch(chuteAIUrl, {
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
              content: `${businessContext}\n\nرسالة العميل الجديدة: ${message}`
            }
          ],
          max_tokens: maxTokens,
          temperature: 0.7,
          stream: false
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.choices?.[0]?.message?.content) {
          aiResponse = data.choices[0].message.content.trim()
          
          // Clean up common prefixes
          aiResponse = aiResponse.replace(/^(مساعد|المساعد|أنا|مرحباً،?|أهلاً،?)\s*/i, '')
          
          console.log('✅ AI response generated successfully')
        }
      } else {
        console.log('⚠️ AI API failed:', response.status, await response.text())
      }

    } catch (aiError) {
      console.log('⚠️ AI error, using fallback:', aiError)
    }

    // 4. Return response (no database saving)
    return NextResponse.json({ 
      response: aiResponse,
      merchant: {
        businessName: merchant.businessName,
        primaryColor: merchant.primaryColor
      },
      timestamp: new Date().toISOString(),
      status: 'success_local_only'
    })

  } catch (error) {
    console.error('💥 Chat error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        response: 'عذراً، حدث خطأ في النظام. يرجى المحاولة مرة أخرى.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 