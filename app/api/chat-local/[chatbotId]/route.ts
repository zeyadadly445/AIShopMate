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

    // 2. Generate AI response
    let aiResponse = generateSmartFallback(message, merchant.businessName, conversationHistory)
    let aiDebug: any = { success: false, error: 'not attempted', stage: 'init' }

    try {
      const chuteAIApiKey = process.env.CHUTES_AI_API_KEY

      if (!chuteAIApiKey) {
        aiDebug = { success: false, error: 'API key not found', stage: 'env_check' }
        console.log('⚠️ AI API key not found, using smart fallback')
        return NextResponse.json({ 
          response: aiResponse,
          debug: { aiDebug, merchant: merchant.businessName, fallbackUsed: true }
        })
      }

      console.log('🚀 Sending enhanced streaming request with 128K tokens...')
      aiDebug.stage = 'calling_api'

      // ENHANCED WITH STREAMING AND HIGH TOKEN LIMIT
      const response = await fetch('https://llm.chutes.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${chuteAIApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-ai/DeepSeek-V3-0324',
          messages: [
            {
              role: 'user',
              content: `أنت مساعد ذكي لمتجر "${merchant.businessName}". رد باللغة العربية بشكل مفصل ومفيد على: ${message}`
            }
          ],
          stream: true,
          max_tokens: 128000,
          temperature: 0.7
        })
      })
      
      console.log(`📦 Status: ${response.status}`)
      
      if (response.ok) {
        console.log('✅ Starting streaming response processing...')
        
        // Handle streaming response
        if (response.body) {
          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let fullResponse = ''
          
          try {
            while (true) {
              const { done, value } = await reader.read()
              
              if (done) {
                console.log('✅ Streaming completed')
                break
              }
              
              const chunk = decoder.decode(value, { stream: true })
              const lines = chunk.split('\n')
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6).trim()
                  
                  if (data === '[DONE]') {
                    console.log('✅ Stream finished with [DONE]')
                    break
                  }
                  
                  try {
                    const parsed = JSON.parse(data)
                    const content = parsed.choices?.[0]?.delta?.content
                    
                    if (content) {
                      fullResponse += content
                    }
                  } catch (parseError) {
                    // Skip invalid JSON chunks
                    console.log('⚠️ Skipping invalid JSON chunk')
                  }
                }
              }
            }
            
            if (fullResponse.trim()) {
              aiResponse = fullResponse.trim()
              aiDebug = { 
                success: true, 
                error: null, 
                stage: 'streaming_success',
                contentLength: aiResponse.length,
                streaming: true,
                maxTokens: 128000
              }
              console.log('✅ Streaming AI success!', { 
                responseLength: aiResponse.length,
                streaming: true 
              })
            } else {
              aiDebug = { 
                success: false, 
                error: 'No content in streaming response', 
                stage: 'no_streaming_content'
              }
              console.log('❌ No content in streaming response')
            }
          } catch (streamError) {
            aiDebug = { 
              success: false, 
              error: `Streaming error: ${streamError instanceof Error ? streamError.message : String(streamError)}`, 
              stage: 'streaming_error'
            }
            console.log('❌ Streaming processing error:', streamError)
          }
        } else {
          aiDebug = { 
            success: false, 
            error: 'No response body for streaming', 
            stage: 'no_stream_body'
          }
          console.log('❌ No response body available for streaming')
        }
      } else {
        const errorData = await response.json()
        aiDebug = { 
          success: false, 
          error: `HTTP ${response.status}: ${JSON.stringify(errorData)}`, 
          stage: 'http_error',
          status: response.status
        }
        console.log('❌ Error response:', errorData)
      }

    } catch (aiError) {
      aiDebug = { 
        success: false, 
        error: aiError instanceof Error ? aiError.message : String(aiError), 
        stage: 'exception',
        errorType: aiError instanceof Error ? aiError.constructor.name : typeof aiError
      }
      console.log('❌ AI request failed:', aiError)
    }

    // 4. Return response (no database saving)
    return NextResponse.json({ 
      response: aiResponse,
      merchant: {
        businessName: merchant.businessName,
        primaryColor: merchant.primaryColor
      },
      timestamp: new Date().toISOString(),
      status: aiDebug.success ? 'success_ai_streaming' : 'success_fallback',
      debug: {
        ai: aiDebug,
        historyLength: conversationHistory.length,
        messageLength: message.length,
        fallbackUsed: !aiDebug.success,
        streaming: aiDebug.success,
        maxTokens: 128000
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