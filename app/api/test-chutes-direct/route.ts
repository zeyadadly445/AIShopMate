import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('🧪 TESTING CHUTES AI DIRECT STREAMING')
  
  try {
    const body = await request.json()
    const { message = "مرحبا، كيف الحال؟" } = body

    // Use Environment Variables
    const apiKey = process.env.CHUTES_AI_API_KEY
    const apiUrl = process.env.CHUTES_AI_API_URL || 'https://llm.chutes.ai/v1/chat/completions'
    const model = process.env.CHUTES_AI_MODEL || 'deepseek-ai/DeepSeek-V3-0324'

    console.log('🔑 Direct test with:', { hasApiKey: !!apiKey, apiUrl, model })

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    console.log('📤 Sending direct test message to Chutes AI...')
    const startTime = Date.now()

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "user", content: message }
        ],
        stream: true,
        max_tokens: 1000,
        temperature: 0.7
      })
    })

    const fetchTime = Date.now() - startTime
    console.log(`📦 Chutes AI response received in ${fetchTime}ms, status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Chutes AI direct test error:', response.status, errorText)
      return NextResponse.json({ 
        error: `Chutes AI error: ${response.status}`,
        details: errorText 
      }, { status: response.status })
    }

    // Create pass-through streaming with detailed monitoring
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        
        let chunkCount = 0
        let totalBytes = 0
        let accumulatedContent = ''
        const streamStartTime = Date.now()
        let lastChunkTime = streamStartTime
        let maxGap = 0
        let gapsOver1s = 0

        if (!reader) {
          controller.error(new Error('No response body'))
          return
        }

        console.log('🎬 DIRECT CHUTES AI STREAMING MONITOR')

        try {
          while (true) {
            const readStartTime = Date.now()
            const { done, value } = await reader.read()
            const readEndTime = Date.now()
            
            const readTime = readEndTime - readStartTime
            const gapSinceLastChunk = readStartTime - lastChunkTime

            if (gapSinceLastChunk > maxGap) {
              maxGap = gapSinceLastChunk
            }

            if (gapSinceLastChunk > 1000) {
              gapsOver1s++
              console.log(`🐌 CHUTES AI DELAY: ${gapSinceLastChunk}ms gap between chunks`)
            }

            chunkCount++
            totalBytes += value?.length || 0
            lastChunkTime = readEndTime

            if (chunkCount % 5 === 0) {
              console.log(`📦 Chutes chunk ${chunkCount}: ${value?.length || 0} bytes, read: ${readTime}ms, gap: ${gapSinceLastChunk}ms`)
            }
            
            if (done) {
              const totalTime = Date.now() - streamStartTime
              console.log('✅ CHUTES AI DIRECT STREAMING SUMMARY:')
              console.log(`📊 Total streaming time: ${totalTime}ms (+ ${fetchTime}ms initial fetch)`)
              console.log(`📦 Total chunks from Chutes: ${chunkCount}`)
              console.log(`📏 Total bytes from Chutes: ${totalBytes}`)
              console.log(`🐌 Max gap between chunks: ${maxGap}ms`)
              console.log(`⚠️ Gaps over 1000ms: ${gapsOver1s}`)
              console.log(`🔤 Generated content length: ${accumulatedContent.length}`)
              
              controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
              controller.close()
              break
            }

            // Pass through the chunk and extract content for monitoring
            const chunk = decoder.decode(value, { stream: true })
            controller.enqueue(value)

            // Extract content for length tracking
            const lines = chunk.split('\n')
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim()
                if (data !== '[DONE]') {
                  try {
                    const parsed = JSON.parse(data)
                    const content = parsed.choices?.[0]?.delta?.content || ''
                    accumulatedContent += content
                  } catch (e) {
                    // Ignore parse errors for monitoring
                  }
                }
              }
            }
          }
        } catch (streamError) {
          const errorTime = Date.now() - streamStartTime
          console.error(`❌ CHUTES AI STREAM ERROR after ${errorTime}ms:`, streamError)
          controller.error(streamError)
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })

  } catch (error) {
    console.error('💥 Direct Chutes test error:', error)
    return NextResponse.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Chutes AI Direct Test Endpoint',
    usage: 'POST with { "message": "your test message" } to test streaming'
  })
} 