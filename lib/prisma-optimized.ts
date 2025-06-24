import { getOptimizedDB } from './database-optimized'

// Efficient database access with connection reuse
export async function getDB() {
  return await getOptimizedDB()
}

// Wrapper for database operations with automatic retry
export async function withDatabase<T>(
  operation: (db: any) => Promise<T>,
  maxRetries: number = 2
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const db = await getDB()
      return await operation(db)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      console.log(`⚠️ Database operation failed (attempt ${attempt}/${maxRetries}):`, lastError.message)
      
      if (attempt === maxRetries) {
        break
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100))
    }
  }
  
  throw lastError || new Error('Database operation failed after retries')
} 