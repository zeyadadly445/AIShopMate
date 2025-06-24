import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      databaseUrl: process.env.DATABASE_URL ? 'EXISTS' : 'MISSING',
      urlPreview: process.env.DATABASE_URL?.substring(0, 80) + '...',
      nodeEnv: process.env.NODE_ENV
    },
    tests: [] as any[]
  }

  // Test 1: Basic URL parsing
  try {
    const url = new URL(process.env.DATABASE_URL || '')
    results.tests.push({
      name: 'url_parsing',
      status: 'success',
      details: {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port,
        database: url.pathname
      }
    })
  } catch (error) {
    results.tests.push({
      name: 'url_parsing',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown'
    })
  }

  // Test 2: Prisma Client Creation
  try {
    const { PrismaClient } = await import('@/app/generated/prisma')
    const prisma = new PrismaClient()
    
    results.tests.push({
      name: 'prisma_creation',
      status: 'success'
    })

    // Test 3: Connection attempt
    try {
      const connectStart = Date.now()
      await prisma.$connect()
      const connectTime = Date.now() - connectStart
      
      results.tests.push({
        name: 'connection',
        status: 'success',
        connectTime: `${connectTime}ms`
      })

      // Test 4: Query attempt
      try {
        const queryStart = Date.now()
        const result = await prisma.$queryRaw`SELECT version() as db_version, now() as current_time`
        const queryTime = Date.now() - queryStart
        
        results.tests.push({
          name: 'query',
          status: 'success',
          queryTime: `${queryTime}ms`,
          result: Array.isArray(result) ? result[0] : result
        })
      } catch (queryError) {
        results.tests.push({
          name: 'query',
          status: 'failed',
          error: queryError instanceof Error ? queryError.message : 'Unknown',
          errorCode: (queryError as any)?.code,
          errorMeta: (queryError as any)?.meta
        })
      }

      await prisma.$disconnect()
    } catch (connectError) {
      results.tests.push({
        name: 'connection',
        status: 'failed',
        error: connectError instanceof Error ? connectError.message : 'Unknown',
        errorCode: (connectError as any)?.code,
        errorMeta: (connectError as any)?.meta
      })
    }
  } catch (prismaError) {
    results.tests.push({
      name: 'prisma_creation',
      status: 'failed',
      error: prismaError instanceof Error ? prismaError.message : 'Unknown'
    })
  }

  // Test 5: Alternative connection URLs
  const alternatives = [
    {
      name: 'direct_ssl',
      url: (process.env.DATABASE_URL || '') + '?sslmode=require'
    },
    {
      name: 'transaction_pooler',
      url: (process.env.DATABASE_URL || '').replace(
        'db.onjezbflzzkhwztosede.supabase.co:5432',
        'aws-0-eu-north-1.pooler.supabase.com:6543'
      )
    }
  ]

  for (const alt of alternatives) {
    try {
      const { PrismaClient } = await import('@/app/generated/prisma')
      const prisma = new PrismaClient({
        datasources: { db: { url: alt.url } }
      })
      
      await prisma.$connect()
      await prisma.$queryRaw`SELECT 1 as test`
      await prisma.$disconnect()
      
      results.tests.push({
        name: alt.name,
        status: 'success'
      })
    } catch (error) {
      results.tests.push({
        name: alt.name,
        status: 'failed',
        error: error instanceof Error ? error.message.substring(0, 100) : 'Unknown'
      })
    }
  }

  const successfulTests = results.tests.filter(t => t.status === 'success').length
  const totalTests = results.tests.length

  return NextResponse.json({
    ...results,
    summary: {
      successful: successfulTests,
      total: totalTests,
      overallStatus: successfulTests > 0 ? 'partial' : 'failed',
      recommendations: successfulTests === 0 
        ? 'Check Supabase project status - likely paused or offline'
        : 'Some connections work - use successful connection type'
    }
  })
} 