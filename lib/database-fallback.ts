import { PrismaClient } from '@/app/generated/prisma'

// Fallback database connections for Supabase free tier
export async function createDatabaseClient() {
  const originalUrl = process.env.DATABASE_URL
  
  if (!originalUrl) {
    throw new Error('DATABASE_URL not found')
  }

  // Connection options in order of preference
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

  // Try each connection option
  for (const option of connectionOptions) {
    try {
      console.log(`Trying ${option.name} connection...`)
      
      const prisma = new PrismaClient({
        datasources: {
          db: { url: option.url }
        }
      })

      // Test connection
      await prisma.$connect()
      await prisma.$queryRaw`SELECT 1 as test`
      
      console.log(`✅ ${option.name} connection successful!`)
      return prisma
      
    } catch (error) {
      console.log(`❌ ${option.name} failed:`, error instanceof Error ? error.message : 'Unknown')
      continue
    }
  }

  throw new Error('All database connection options failed')
}

// Singleton instance
let dbClient: PrismaClient | null = null

export async function getDatabase() {
  if (!dbClient) {
    dbClient = await createDatabaseClient()
  }
  return dbClient
} 