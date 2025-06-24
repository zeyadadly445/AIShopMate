import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Get current DATABASE_URL
    const currentUrl = process.env.DATABASE_URL
    
    if (!currentUrl) {
      return NextResponse.json({
        error: 'DATABASE_URL not found in environment variables',
        solution: 'Add DATABASE_URL to Vercel environment variables'
      }, { status: 500 })
    }

    // Parse current URL to extract components
    const url = new URL(currentUrl)
    const urlInfo = {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port,
      username: url.username,
      database: url.pathname,
      preview: currentUrl.substring(0, 70) + '...'
    }

    // Test different connection scenarios
    const tests = []

    // Test 1: Original URL
    try {
      const { PrismaClient } = await import('@/app/generated/prisma')
      const prisma = new PrismaClient()
      
      await prisma.$connect()
      const result = await prisma.$queryRaw`SELECT current_database(), version()`
      await prisma.$disconnect()
      
      tests.push({
        type: 'original',
        status: 'success',
        result: 'Connection works!'
      })
    } catch (error) {
      tests.push({
        type: 'original',
        status: 'failed',
        error: error instanceof Error ? error.message.substring(0, 150) : 'Unknown',
        code: (error as any)?.code
      })
    }

    // Test 2: With SSL mode
    const sslUrl = currentUrl.includes('?sslmode=') 
      ? currentUrl 
      : currentUrl + (currentUrl.includes('?') ? '&' : '?') + 'sslmode=require'
      
    try {
      const { PrismaClient } = await import('@/app/generated/prisma')
      const prisma = new PrismaClient({
        datasources: { db: { url: sslUrl } }
      })
      
      await prisma.$connect()
      await prisma.$queryRaw`SELECT 1 as test`
      await prisma.$disconnect()
      
      tests.push({
        type: 'ssl_mode',
        status: 'success'
      })
    } catch (error) {
      tests.push({
        type: 'ssl_mode',
        status: 'failed',
        error: error instanceof Error ? error.message.substring(0, 150) : 'Unknown'
      })
    }

    // Test 3: Pooled connection
    const pooledUrl = currentUrl.replace(
      'db.onjezbflzzkhwztosede.supabase.co:5432',
      'aws-0-eu-north-1.pooler.supabase.com:6543'
    )
    
    if (pooledUrl !== currentUrl) {
      try {
        const { PrismaClient } = await import('@/app/generated/prisma')
        const prisma = new PrismaClient({
          datasources: { db: { url: pooledUrl } }
        })
        
        await prisma.$connect()
        await prisma.$queryRaw`SELECT 1 as test`
        await prisma.$disconnect()
        
        tests.push({
          type: 'pooled',
          status: 'success'
        })
      } catch (error) {
        tests.push({
          type: 'pooled',
          status: 'failed',
          error: error instanceof Error ? error.message.substring(0, 150) : 'Unknown'
        })
      }
    }

    const workingConnections = tests.filter(t => t.status === 'success')

    return NextResponse.json({
      status: workingConnections.length > 0 ? 'partial_success' : 'all_failed',
      currentUrl: urlInfo,
      tests,
      recommendations: {
        immediate: workingConnections.length > 0 
          ? `Use ${workingConnections[0].type} connection type`
          : 'Check Supabase database password and reset if needed',
        longTerm: workingConnections.length === 0 
          ? [
              'Go to Supabase Settings > Database',
              'Click "Reset database password"',
              'Copy new connection string',
              'Update DATABASE_URL in Vercel environment variables',
              'Redeploy the application'
            ]
          : ['Current setup working - no action needed']
      },
      troubleshooting: {
        passwordReset: 'https://app.supabase.com/project/onjezbflzzkhwztosede/settings/database',
        vercelEnvVars: 'https://vercel.com/zeyadadly445/ai-shop-mate/settings/environment-variables'
      }
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to test connections',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 