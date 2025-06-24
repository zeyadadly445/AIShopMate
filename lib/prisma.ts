import { getDatabase } from './database-fallback'

// Use the smart fallback system instead of direct PrismaClient
export const prisma = {
  // Lazy initialization to support fallback
  async $connect() {
    const db = await getDatabase()
    return db.$connect()
  },
  
  async $disconnect() {
    const db = await getDatabase()
    return db.$disconnect()
  },
  
  get merchant() {
    return this._getModel('merchant')
  },
  
  get subscription() {
    return this._getModel('subscription')
  },
  
  get merchantDataSource() {
    return this._getModel('merchantDataSource')
  },
  
  get conversation() {
    return this._getModel('conversation')
  },
  
  get message() {
    return this._getModel('message')
  },
  
  // Helper to get models dynamically
  _getModel(modelName: string) {
    return {
      async findUnique(args: any) {
        const db = await getDatabase()
        return (db as any)[modelName].findUnique(args)
      },
      
      async findFirst(args: any) {
        const db = await getDatabase()
        return (db as any)[modelName].findFirst(args)
      },
      
      async findMany(args: any) {
        const db = await getDatabase()
        return (db as any)[modelName].findMany(args)
      },
      
      async create(args: any) {
        const db = await getDatabase()
        return (db as any)[modelName].create(args)
      },
      
      async update(args: any) {
        const db = await getDatabase()
        return (db as any)[modelName].update(args)
      },
      
      async delete(args: any) {
        const db = await getDatabase()
        return (db as any)[modelName].delete(args)
      },
      
      async count(args: any) {
        const db = await getDatabase()
        return (db as any)[modelName].count(args)
      }
    }
  }
} 