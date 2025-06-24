import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/app/generated/prisma'

export async function GET(request: NextRequest) {
  const originalUrl = process.env.DATABASE_URL
  
  if (!originalUrl) {
    return NextResponse.json({
      error: 'DATABASE_URL not found',
      status: 'error'
    }, { status: 500 })
  }

  // Connection options to test
  const connectionOptions = [
    // 1. Original direct connection
    { name: 'direct', url: originalUrl },
    
    // 2. With SSL mode
    { 
      name: 'direct_ssl', 
      url: originalUrl.includes('?') 
        ? originalUrl + '&sslmode=require' 
        : originalUrl + '?sslmode=require'
    },
    
    // 3. Transaction pooler (port 6543)
    { 
      name: 'transaction_pooler', 
      url: originalUrl.replace('db.onjezbflzzkhwztosede.supabase.co:5432', 'aws-0-eu-north-1.pooler.supabase.com:6543')
    },
    
    // 4. Session pooler (port 5432 but different host)
    { 
      name: 'session_pooler', 
      url: originalUrl.replace('db.onjezbflzzkhwztosede.supabase.co:5432', 'aws-0-eu-north-1.pooler.supabase.com:5432')
    }
  ]

  const results = []
  let workingConnection = null

  // Test each connection
  for (const option of connectionOptions) {
    const result = {
      name: option.name,
      status: 'unknown',
      error: null as string | null,
      timing: 0,
      details: null as string | null
    }

    const startTime = Date.now()

    try {
      console.log(`Testing ${option.name}...`)
      
      const prisma = new PrismaClient({
        datasources: {
          db: { url: option.url }
        }
      })

      // Test connection with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout (10s)')), 10000)
      })

      await Promise.race([
        prisma.$connect(),
        timeoutPromise
      ])

      // Test query
      await Promise.race([
        prisma.$queryRaw`SELECT 1 as test`,
        timeoutPromise
      ])

      result.timing = Date.now() - startTime
      result.status = 'success'
      result.details = 'Connection and query successful'
      
      if (!workingConnection) {
        workingConnection = option.name
      }

      await prisma.$disconnect()
      
    } catch (error) {
      result.timing = Date.now() - startTime
      result.status = 'failed'
      result.error = error instanceof Error ? error.message : 'Unknown error'
      result.details = error instanceof Error ? (error.stack || null) : null
    }

    results.push(result)
  }

  // Test merchant lookup with working connection
  let merchantTest = null
  if (workingConnection) {
    try {
      const workingOption = connectionOptions.find(opt => opt.name === workingConnection)
      if (workingOption) {
        const prisma = new PrismaClient({
          datasources: {
            db: { url: workingOption.url }
          }
        })

        const merchantCount = await prisma.merchant.count()
        merchantTest = {
          status: 'success',
          merchantCount,
          error: null
        }

        await prisma.$disconnect()
      }
    } catch (error) {
      merchantTest = {
        status: 'failed',
        merchantCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  return NextResponse.json({
    status: 'complete',
    summary: {
      originalUrl: originalUrl.substring(0, 50) + '...',
      workingConnection,
      totalTested: results.length,
      successCount: results.filter(r => r.status === 'success').length,
      failedCount: results.filter(r => r.status === 'failed').length
    },
    results,
    merchantTest,
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      timestamp: new Date().toISOString()
    }
  })
} 