import { getDatabase } from './database-fallback'

// Simplified prisma wrapper that always uses fallback
export async function getPrismaClient() {
  return await getDatabase()
}

// Simple shortcut
export async function getDB() {
  return await getPrismaClient()
} 