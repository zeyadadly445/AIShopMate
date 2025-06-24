import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('Register simple API called')
    
    // Test if we can read the request body
    const body = await request.json()
    console.log('Request body:', body)
    
    // Test environment variables
    const envTest = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasJwtSecret: !!process.env.JWT_SECRET
    }
    console.log('Environment test:', envTest)
    
    // Test if we can import auth functions
    let authTest = 'not tested'
    try {
      const { hashPassword } = await import('@/lib/auth')
      const testHash = await hashPassword('test123')
      authTest = 'success - hash created'
    } catch (authError) {
      authTest = `failed: ${authError instanceof Error ? authError.message : 'unknown'}`
    }
    
    return NextResponse.json({
      status: 'success',
      message: 'Register simple API is working',
      receivedData: body,
      envTest,
      authTest,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Register simple error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Error in register simple API',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
} 