import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Test multiple connection scenarios
    const originalUrl = process.env.DATABASE_URL
    
    if (!originalUrl) {
      return NextResponse.json({ error: 'DATABASE_URL not found' }, { status: 500 })
    }

    const tests = []
    
    // Test 1: Original URL
    try {
      const { PrismaClient } = await import('@/app/generated/prisma')
      const prisma = new PrismaClient()
      
      await prisma.$connect()
      await prisma.$queryRaw`SELECT 1 as test`
      await prisma.$disconnect()
      
      tests.push({ type: 'original_direct', status: 'success' })
    } catch (error) {
      tests.push({ 
        type: 'original_direct', 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown' 
      })
    }

    // Test 2: Alternative port (6543 vs 5432)
    const altPortUrl = originalUrl.replace(':5432', ':6543')
    try {
      const { PrismaClient } = await import('@/app/generated/prisma')
      const prisma = new PrismaClient({
        datasources: { db: { url: altPortUrl } }
      })
      
      await prisma.$connect()
      await prisma.$queryRaw`SELECT 1 as test`
      await prisma.$disconnect()
      
      tests.push({ type: 'alt_port_6543', status: 'success' })
    } catch (error) {
      tests.push({ 
        type: 'alt_port_6543', 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown' 
      })
    }

    // Test 3: URL with SSL mode
    const sslUrl = originalUrl.includes('?') 
      ? originalUrl + '&sslmode=require' 
      : originalUrl + '?sslmode=require'
      
    try {
      const { PrismaClient } = await import('@/app/generated/prisma')
      const prisma = new PrismaClient({
        datasources: { db: { url: sslUrl } }
      })
      
      await prisma.$connect()
      await prisma.$queryRaw`SELECT 1 as test`
      await prisma.$disconnect()
      
      tests.push({ type: 'with_ssl', status: 'success' })
    } catch (error) {
      tests.push({ 
        type: 'with_ssl', 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown' 
      })
    }

    return NextResponse.json({
      status: 'completed',
      originalUrl: originalUrl.substring(0, 70) + '...',
      tests,
      recommendations: tests.some(t => t.status === 'success') 
        ? 'Some connections work! Check successful ones.'
        : 'All connections failed. Check Supabase project status.'
    })

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 