import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const chuteAIApiKey = process.env.CHUTES_AI_API_KEY
  const chuteAIUrl = process.env.CHUTES_AI_API_URL || 'https://llm.chutes.ai/v1/chat/completions'

  if (!chuteAIApiKey) {
    return NextResponse.json({
      error: 'CHUTES_AI_API_KEY not found'
    }, { status: 500 })
  }

  const modelsToTest = [
    'deepseek-ai/DeepSeek-V3-0324',
    'deepseek-ai/DeepSeek-V3',
    'gpt-3.5-turbo',
    'gpt-4o-mini',
    'claude-3-haiku-20240307',
    'llama-3.1-8b-instruct',
    'gemini-1.5-flash'
  ]

  const results = []

  for (const model of modelsToTest) {
    const result = {
      model,
      status: 'unknown',
      error: null,
      response: null,
      timing: 0
    }

    const startTime = Date.now()

    try {
      console.log(`Testing model: ${model}`)

      const response = await fetch(chuteAIUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${chuteAIApiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'user',
              content: 'قل مرحبا باللغة العربية'
            }
          ],
          max_tokens: 100,
          temperature: 0.7,
          stream: false
        }),
        signal: AbortSignal.timeout(10000)
      })

      result.timing = Date.now() - startTime

      if (response.ok) {
        const data = await response.json()
        if (data.choices?.[0]?.message?.content) {
          result.status = 'success'
          result.response = data.choices[0].message.content.substring(0, 100)
        } else {
          result.status = 'no_content'
          result.error = 'No content in response'
        }
      } else {
        const errorText = await response.text()
        result.status = 'http_error'
        result.error = `HTTP ${response.status}: ${errorText}`
      }

    } catch (error) {
      result.timing = Date.now() - startTime
      result.status = 'exception'
      result.error = error instanceof Error ? error.message : String(error)
    }

    results.push(result)
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // Summary
  const summary = {
    totalTested: results.length,
    successful: results.filter(r => r.status === 'success').length,
    failed: results.filter(r => r.status !== 'success').length,
    workingModels: results.filter(r => r.status === 'success').map(r => r.model),
    averageResponseTime: Math.round(results.filter(r => r.status === 'success').reduce((sum, r) => sum + r.timing, 0) / Math.max(1, results.filter(r => r.status === 'success').length))
  }

  return NextResponse.json({
    summary,
    results,
    currentModel: process.env.CHUTES_AI_MODEL || 'not set',
    recommendation: summary.workingModels.length > 0 ? summary.workingModels[0] : 'none working',
    timestamp: new Date().toISOString()
  })
} 