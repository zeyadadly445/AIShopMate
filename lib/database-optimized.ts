import { PrismaClient } from '@/app/generated/prisma'

// Global connection pool for efficiency
const connectionPool = new Map<string, PrismaClient>()
let preferredConnection: string | null = null

// Connection configurations
const connectionConfigs = [
  {
    name: 'direct',
    url: process.env.DATABASE_URL || '',
    priority: 1,
    maxRetries: 2
  },
  {
    name: 'direct_ssl',
    url: (process.env.DATABASE_URL || '').includes('?') 
      ? (process.env.DATABASE_URL || '') + '&sslmode=require'
      : (process.env.DATABASE_URL || '') + '?sslmode=require',
    priority: 2,
    maxRetries: 1
  },
  {
    name: 'transaction_pooler',
    url: (process.env.DATABASE_URL || '').replace(
      'db.onjezbflzzkhwztosede.supabase.co:5432',
      'aws-0-eu-north-1.pooler.supabase.com:6543'
    ),
    priority: 3,
    maxRetries: 1
  }
]

// Test and cache the best connection
async function findBestConnection(): Promise<string> {
  if (preferredConnection && connectionPool.has(preferredConnection)) {
    try {
      const client = connectionPool.get(preferredConnection)!
      await client.$queryRaw`SELECT 1`
      return preferredConnection
    } catch {
      // Preferred connection failed, remove it
      connectionPool.delete(preferredConnection)
      preferredConnection = null
    }
  }

  // Test connections in priority order
  for (const config of connectionConfigs) {
    try {
      console.log(`🔍 Testing ${config.name} connection...`)
      
      const client = new PrismaClient({
        datasources: { db: { url: config.url } }
      })

      await client.$connect()
      await client.$queryRaw`SELECT 1`
      
      // Cache successful connection
      connectionPool.set(config.name, client)
      preferredConnection = config.name
      
      console.log(`✅ ${config.name} connection successful and cached!`)
      return config.name
      
    } catch (error) {
      console.log(`❌ ${config.name} failed:`, error instanceof Error ? error.message.substring(0, 100) : 'Unknown')
      continue
    }
  }

  throw new Error('All database connections failed')
}

// Get or create optimized database client
export async function getOptimizedDB(): Promise<PrismaClient> {
  try {
    const connectionName = await findBestConnection()
    return connectionPool.get(connectionName)!
  } catch (error) {
    console.error('❌ Optimized DB connection failed:', error)
    throw error
  }
}

// Graceful cleanup
export async function cleanupConnections() {
  for (const [name, client] of connectionPool) {
    try {
      await client.$disconnect()
      console.log(`🔌 Disconnected ${name}`)
    } catch (error) {
      console.log(`⚠️ Error disconnecting ${name}:`, error)
    }
  }
  connectionPool.clear()
  preferredConnection = null
}

// Health check for monitoring
export async function getDatabaseHealth() {
  const health = {
    preferredConnection,
    totalConnections: connectionPool.size,
    availableConnections: [] as string[],
    timestamp: new Date().toISOString()
  }

  for (const [name, client] of connectionPool) {
    try {
      await client.$queryRaw`SELECT 1`
      health.availableConnections.push(name)
    } catch {
      // Connection is unhealthy, remove it
      connectionPool.delete(name)
      if (name === preferredConnection) {
        preferredConnection = null
      }
    }
  }

  return health
} 