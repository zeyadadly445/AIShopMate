import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // The correct connection string with the provided password
    const correctUrl = 'postgresql://postgres:zzezzo445@db.onjezbflzzkhwztosede.supabase.co:5432/postgres'
    
    // Test the correct connection
    const tests = []
    
    // Test 1: Direct connection with correct password
    try {
      const { PrismaClient } = await import('@/app/generated/prisma')
      const prisma = new PrismaClient({
        datasources: {
          db: { url: correctUrl }
        }
      })
      
      const startTime = Date.now()
      await prisma.$connect()
      const connectTime = Date.now() - startTime
      
      // Test basic query
      const result = await prisma.$queryRaw`SELECT current_database(), version(), now() as current_time`
      const queryTime = Date.now() - startTime
      
      // Test merchant table
      const merchantCount = await prisma.merchant.count()
      
      await prisma.$disconnect()
      
      tests.push({
        type: 'correct_password_direct',
        status: 'success',
        connectTime: `${connectTime}ms`,
        queryTime: `${queryTime}ms`,
        merchantCount,
        dbInfo: Array.isArray(result) ? result[0] : result
      })
    } catch (error) {
      tests.push({
        type: 'correct_password_direct',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown',
        code: (error as any)?.code
      })
    }
    
    // Test 2: SSL mode with correct password
    const sslUrl = correctUrl + '?sslmode=require'
    try {
      const { PrismaClient } = await import('@/app/generated/prisma')
      const prisma = new PrismaClient({
        datasources: {
          db: { url: sslUrl }
        }
      })
      
      await prisma.$connect()
      await prisma.$queryRaw`SELECT 1 as test`
      await prisma.$disconnect()
      
      tests.push({
        type: 'correct_password_ssl',
        status: 'success'
      })
    } catch (error) {
      tests.push({
        type: 'correct_password_ssl',
        status: 'failed',
        error: error instanceof Error ? error.message.substring(0, 100) : 'Unknown'
      })
    }
    
    // Test 3: Pooled connection with correct password
    const pooledUrl = correctUrl.replace(
      'db.onjezbflzzkhwztosede.supabase.co:5432',
      'aws-0-eu-north-1.pooler.supabase.com:6543'
    )
    
    try {
      const { PrismaClient } = await import('@/app/generated/prisma')
      const prisma = new PrismaClient({
        datasources: {
          db: { url: pooledUrl }
        }
      })
      
      await prisma.$connect()
      await prisma.$queryRaw`SELECT 1 as test`
      await prisma.$disconnect()
      
      tests.push({
        type: 'correct_password_pooled',
        status: 'success'
      })
    } catch (error) {
      tests.push({
        type: 'correct_password_pooled',
        status: 'failed',
        error: error instanceof Error ? error.message.substring(0, 100) : 'Unknown'
      })
    }

    // Compare with current environment URL
    const currentUrl = process.env.DATABASE_URL
    const urlComparison = {
      current: currentUrl ? currentUrl.substring(0, 80) + '...' : 'NOT_SET',
      correct: correctUrl.substring(0, 80) + '...',
      passwordMatch: currentUrl?.includes('zzezzo445') || false,
      hostnameMatch: currentUrl?.includes('db.onjezbflzzkhwztosede.supabase.co') || false
    }

    const workingTests = tests.filter(t => t.status === 'success')
    
    return NextResponse.json({
      status: workingTests.length > 0 ? 'success' : 'failed',
      message: workingTests.length > 0 
        ? 'Connection with correct password works!'
        : 'Connection failed even with correct password',
      tests,
      urlComparison,
      recommendations: {
        immediate: workingTests.length > 0 
          ? 'Update DATABASE_URL in Vercel with the correct connection string'
          : 'Check Supabase project status - may be paused or network issues',
        correctConnectionString: correctUrl,
        vercelEnvVarUrl: 'https://vercel.com/zeyadadly445/ai-shop-mate/settings/environment-variables'
      }
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 