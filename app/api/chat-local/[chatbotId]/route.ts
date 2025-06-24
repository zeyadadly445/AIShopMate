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
    let aiDebug: any = { success: false, error: 'not attempted', stage: 'init' }

    try {
      const chuteAIApiKey = process.env.CHUTES_AI_API_KEY
      const chuteAIUrl = process.env.CHUTES_AI_API_URL || 'https://llm.chutes.ai/v1/chat/completions'

      if (!chuteAIApiKey) {
        aiDebug = { success: false, error: 'API key not found', stage: 'env_check' }
        console.log('⚠️ AI API key not found, using fallback')
        return NextResponse.json({ 
          response: aiResponse,
          debug: { aiDebug, merchant: merchant.businessName }
        })
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

      console.log('🤖 Calling AI API...', { maxTokens, historyLength, messageLength: message.length })
      aiDebug.stage = 'calling_api'

      const requestBody = {
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
      }

      const response = await fetch(chuteAIUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${chuteAIApiKey}`
        },
        body: JSON.stringify(requestBody)
      })

      aiDebug.stage = 'response_received'
      
      if (response.ok) {
        const data = await response.json()
        aiDebug.stage = 'parsing_response'
        
        console.log('📝 AI API Response structure:', {
          hasChoices: !!data.choices,
          choicesLength: data.choices?.length,
          hasContent: !!data.choices?.[0]?.message?.content,
          contentLength: data.choices?.[0]?.message?.content?.length
        })
        
        if (data.choices?.[0]?.message?.content) {
          const rawResponse = data.choices[0].message.content.trim()
          
          // Clean up common prefixes
          aiResponse = rawResponse.replace(/^(مساعد|المساعد|أنا|مرحباً،?|أهلاً،?)\s*/i, '')
          
          // If cleaning removed everything, use original
          if (!aiResponse.trim()) {
            aiResponse = rawResponse
          }
          
          aiDebug = { 
            success: true, 
            error: null, 
            stage: 'success',
            rawLength: rawResponse.length,
            cleanedLength: aiResponse.length,
            wasCleaned: rawResponse !== aiResponse
          }
          
          console.log('✅ AI response generated successfully', {
            originalLength: rawResponse.length,
            finalLength: aiResponse.length
          })
        } else {
          aiDebug = { 
            success: false, 
            error: 'No content in AI response', 
            stage: 'no_content',
            responseStructure: Object.keys(data)
          }
          console.log('❌ AI response has no content:', data)
        }
      } else {
        const errorText = await response.text()
        aiDebug = { 
          success: false, 
          error: `HTTP ${response.status}: ${errorText}`, 
          stage: 'http_error',
          status: response.status,
          statusText: response.statusText
        }
        console.log('⚠️ AI API failed:', response.status, response.statusText, errorText)
      }

    } catch (aiError) {
      aiDebug = { 
        success: false, 
        error: aiError instanceof Error ? aiError.message : String(aiError), 
        stage: 'exception',
        errorType: aiError instanceof Error ? aiError.constructor.name : typeof aiError
      }
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
      status: 'success_local_only',
      debug: {
        ai: aiDebug,
        contextLength: businessContext.length,
        historyLength: conversationHistory.length,
        messageLength: message.length
      }
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