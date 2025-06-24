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
    let aiResponse = generateSmartFallback(message, merchant.businessName, conversationHistory)
    let aiDebug: any = { success: false, error: 'not attempted', stage: 'init' }

    try {
      const chuteAIApiKey = process.env.CHUTES_AI_API_KEY
      const chuteAIUrl = process.env.CHUTES_AI_API_URL || 'https://llm.chutes.ai/v1/chat/completions'

      if (!chuteAIApiKey) {
        aiDebug = { success: false, error: 'API key not found', stage: 'env_check' }
        console.log('⚠️ AI API key not found, using smart fallback')
        return NextResponse.json({ 
          response: aiResponse,
          debug: { aiDebug, merchant: merchant.businessName, fallbackUsed: true }
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

      // Try with retry mechanism
      let response: Response | null = null
      let lastError = ''
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`🔄 AI API attempt ${attempt}/3`)
          
          response = await fetch(chuteAIUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${chuteAIApiKey}`
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(10000) // 10 second timeout
          })
          
          if (response.ok) {
            console.log(`✅ AI API succeeded on attempt ${attempt}`)
            break
          } else {
            lastError = `HTTP ${response.status}: ${await response.text()}`
            console.log(`❌ AI API failed attempt ${attempt}: ${lastError}`)
            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt)) // Progressive delay
            }
          }
        } catch (fetchError) {
          lastError = fetchError instanceof Error ? fetchError.message : String(fetchError)
          console.log(`❌ AI API error attempt ${attempt}: ${lastError}`)
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
          }
        }
      }

      if (!response || !response.ok) {
        aiDebug = { 
          success: false, 
          error: `All retry attempts failed. Last error: ${lastError}`, 
          stage: 'retry_exhausted',
          attempts: 3
        }
        console.log('❌ All AI API retry attempts failed, using smart fallback')
        
        // Update the smart fallback to indicate AI unavailable
        aiResponse = generateSmartFallback(message, merchant.businessName, conversationHistory) + 
                    '\n\n*ملاحظة: خدمة الذكاء الاصطناعي غير متاحة مؤقتاً، لكنني سعيد بمساعدتك!*'
        
        return NextResponse.json({ 
          response: aiResponse,
          merchant: {
            businessName: merchant.businessName,
            primaryColor: merchant.primaryColor
          },
          timestamp: new Date().toISOString(),
          status: 'fallback_used',
          debug: {
            ai: aiDebug,
            contextLength: businessContext.length,
            historyLength: conversationHistory.length,
            messageLength: message.length,
            fallbackUsed: true
          }
        })
      }

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

// Smart fallback response generator
function generateSmartFallback(message: string, businessName: string, conversationHistory: ChatMessage[]): string {
  const lowerMessage = message.toLowerCase().trim()
  
  // Check for greetings
  const greetings = ['مرحبا', 'هلا', 'السلام عليكم', 'أهلا', 'صباح الخير', 'مساء الخير', 'hi', 'hello']
  if (greetings.some(greeting => lowerMessage.includes(greeting))) {
    const timeBasedGreeting = new Date().getHours() < 12 ? 'صباح الخير' : 'مساء الخير'
    return `${timeBasedGreeting}! مرحباً بك في متجر ${businessName}. كيف يمكنني مساعدتك اليوم؟ 😊`
  }
  
  // Check for product inquiries
  const productQuestions = ['عندكم', 'متوفر', 'موجود', 'أسعار', 'كم سعر', 'بكام', 'منتجات']
  if (productQuestions.some(word => lowerMessage.includes(word))) {
    return `بالطبع! لدينا مجموعة رائعة في ${businessName}. للحصول على أحدث المنتجات والأسعار، يمكنك تصفح متجرنا أو التواصل معنا مباشرة. هل تبحث عن شيء محدد؟`
  }
  
  // Check for questions
  const questionWords = ['كيف', 'متى', 'أين', 'ماذا', 'هل', 'ليه', 'إزاي']
  if (questionWords.some(word => lowerMessage.includes(word)) || lowerMessage.includes('؟')) {
    return `سؤال ممتاز! أنا هنا لمساعدتك في ${businessName}. للحصول على إجابة دقيقة ومفصلة، أنصحك بالتواصل مع فريقنا مباشرة. هل يمكنني مساعدتك في أي شيء آخر؟`
  }
  
  // Check for complaints or negative words
  const negativeWords = ['مشكلة', 'خراب', 'سيء', 'وحش', 'حمار', 'غبي']
  if (negativeWords.some(word => lowerMessage.includes(word))) {
    return `أعتذر إذا كان هناك أي إزعاج. نحن في ${businessName} نحرص على تقديم أفضل خدمة. يمكنك التواصل مع إدارة المتجر مباشرة لحل أي مشكلة. نقدر صبرك وتفهمك 🙏`
  }
  
  // Check for thanks
  const thankWords = ['شكرا', 'مشكور', 'تسلم', 'الله يعطيك العافية']
  if (thankWords.some(word => lowerMessage.includes(word))) {
    return `العفو! سعداء بخدمتك في ${businessName}. نحن هنا دائماً لمساعدتك. هل تحتاج لأي شيء آخر؟ 😊`
  }
  
  // Check for contact/location questions
  const contactWords = ['فين', 'عنوان', 'موقع', 'تليفون', 'رقم', 'تواصل']
  if (contactWords.some(word => lowerMessage.includes(word))) {
    return `يمكنك العثور على جميع معلومات التواصل الخاصة بـ ${businessName} في صفحتنا أو متجرنا. نحن متاحون لخدمتك! 📞`
  }
  
  // Check conversation history for context
  if (conversationHistory.length > 1) {
    const lastMessage = conversationHistory[conversationHistory.length - 2]?.content || ''
    if (lastMessage.includes('مرحب') || lastMessage.includes('أهلا')) {
      return `أهلاً بك مرة أخرى! كيف يمكنني مساعدتك اليوم في ${businessName}؟`
    }
  }
  
  // Default intelligent response
  const responses = [
    `شكراً لتواصلك مع ${businessName}! أنا هنا لمساعدتك. يمكنك سؤالي عن أي شيء تريد معرفته.`,
    `مرحباً بك في ${businessName}! كيف يمكنني تقديم المساعدة لك اليوم؟`,
    `أهلاً! سعداء بوجودك في ${businessName}. ما الذي تبحث عنه اليوم؟`
  ]
  
  return responses[Math.floor(Math.random() * responses.length)]
} 