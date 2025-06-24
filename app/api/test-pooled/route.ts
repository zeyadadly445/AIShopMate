import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Test with pooled connection
    const pooledUrl = process.env.DATABASE_URL?.replace(
      'db.onjezbflzzkhwztosede.supabase.co:5432',
      'aws-0-eu-north-1.pooler.supabase.com:6543'
    )

    if (!pooledUrl) {
      return NextResponse.json({ error: 'No DATABASE_URL found' }, { status: 500 })
    }

    // Try to create a new Prisma client with pooled URL
    const { PrismaClient } = await import('@/app/generated/prisma')
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: pooledUrl
        }
      }
    })

    // Test connection
    await prisma.$connect()
    const result = await prisma.$queryRaw`SELECT 1 as test`
    await prisma.$disconnect()

    return NextResponse.json({
      status: 'success',
      message: 'Pooled connection works!',
      originalUrl: process.env.DATABASE_URL?.substring(0, 50) + '...',
      pooledUrl: pooledUrl.substring(0, 50) + '...',
      testResult: result
    })

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 