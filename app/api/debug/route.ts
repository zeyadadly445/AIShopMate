import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const debug = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      environmentVars: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
              hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasChuteAIApiKey: !!process.env.CHUTES_AI_API_KEY,
      chuteAIModel: process.env.CHUTES_AI_MODEL || 'not set',
      chuteAIUrl: process.env.CHUTES_AI_API_URL || 'default: https://llm.chutes.ai/v1/chat/completions',
      databaseUrlPreview: process.env.DATABASE_URL ? 
        process.env.DATABASE_URL.substring(0, 50) + '...' : 'NOT SET'
      }
    }

    // Try to import prisma
    let prismaStatus = 'unknown'
    let prismaError = null
    
    try {
      const { getDatabase } = await import('@/lib/database-fallback')
      const db = await getDatabase()
      
      // Try to run a test query
      const result = await db.$queryRaw`SELECT 1 as test`
      prismaStatus = 'connected'
    } catch (error) {
      prismaStatus = 'failed'
      prismaError = error instanceof Error ? error.message : 'Unknown error'
    }

    return NextResponse.json({
      status: 'ok',
      debug,
      prisma: {
        status: prismaStatus,
        error: prismaError
      }
    })

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
} 