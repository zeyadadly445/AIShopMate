import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

// بيانات المدير من متغيرات البيئة
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || 'admin_zeyad',
  // كلمة مرور عادية (أسهل للإدارة)
  password: process.env.ADMIN_PASSWORD || 'Admin@2024!',
  // كلمة مرور مشفرة (للأمان المتقدم - اختياري)
  passwordHash: process.env.ADMIN_PASSWORD_HASH,
  adminId: process.env.ADMIN_ID || 'admin_master_2024'
}

// Debug logging للتشخيص (سيتم إزالته لاحقاً)
console.log('🔍 Admin Credentials Debug:')
console.log('Username:', ADMIN_CREDENTIALS.username)
console.log('Password exists:', !!ADMIN_CREDENTIALS.password)
console.log('Hash exists:', !!ADMIN_CREDENTIALS.passwordHash)
console.log('Admin ID:', ADMIN_CREDENTIALS.adminId)

const JWT_SECRET = process.env.JWT_SECRET || '1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3g4h'

export interface AdminSession {
  adminId: string
  username: string
  loginTime: number
  isAdmin: true
}

export class AdminAuthService {
  
  /**
   * التحقق من بيانات دخول المدير
   */
  static async validateAdmin(username: string, password: string): Promise<boolean> {
    try {
      console.log('🔍 Validating admin login:')
      console.log('Input username:', username)
      console.log('Expected username:', ADMIN_CREDENTIALS.username)
      console.log('Username match:', username === ADMIN_CREDENTIALS.username)
      
      if (username !== ADMIN_CREDENTIALS.username) {
        console.log('❌ Username mismatch')
        return false
      }
      
      // إذا كان هناك hash مشفر، استخدمه (للأمان المتقدم)
      if (ADMIN_CREDENTIALS.passwordHash) {
        console.log('🔐 Using hashed password validation')
        const result = await bcrypt.compare(password, ADMIN_CREDENTIALS.passwordHash)
        console.log('Hash validation result:', result)
        return result
      }
      
      // وإلا، مقارنة مباشرة مع كلمة المرور (للسهولة)
      console.log('🔓 Using plain text password validation')
      console.log('Expected password:', ADMIN_CREDENTIALS.password)
      console.log('Input password length:', password.length)
      console.log('Expected password length:', ADMIN_CREDENTIALS.password.length)
      const result = password === ADMIN_CREDENTIALS.password
      console.log('Password match result:', result)
      return result
    } catch (error) {
      console.error('Error validating admin:', error)
      return false
    }
  }

  /**
   * إنشاء JWT token للمدير
   */
  static generateAdminToken(username: string): string {
    const payload: AdminSession = {
      adminId: ADMIN_CREDENTIALS.adminId,
      username,
      loginTime: Date.now(),
      isAdmin: true
    }

    return jwt.sign(payload, JWT_SECRET, { 
      expiresIn: '24h', // انتهاء الصلاحية خلال 24 ساعة
      issuer: 'ai-shop-mate-admin',
      audience: 'admin-panel'
    })
  }

  /**
   * التحقق من صحة token المدير
   */
  static verifyAdminToken(token: string): AdminSession | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'ai-shop-mate-admin',
        audience: 'admin-panel'
      }) as AdminSession

      // التحقق من أن المستخدم هو مدير حقيقي
      if (decoded.adminId !== ADMIN_CREDENTIALS.adminId || !decoded.isAdmin) {
        return null
      }

      // التحقق من انتهاء الجلسة (24 ساعة)
      const sessionAge = Date.now() - decoded.loginTime
      if (sessionAge > 24 * 60 * 60 * 1000) {
        return null
      }

      return decoded
    } catch (error) {
      console.error('Invalid admin token:', error)
      return null
    }
  }

  /**
   * تشفير كلمة مرور جديدة (لاستخدامها عند تغيير كلمة المرور)
   */
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12)
  }

  /**
   * التحقق من الصلاحيات المتقدمة
   */
  static hasAdminPermission(session: AdminSession | null): boolean {
    if (!session) return false
    
    return session.isAdmin && 
           session.adminId === ADMIN_CREDENTIALS.adminId &&
           session.username === ADMIN_CREDENTIALS.username
  }
}

/**
 * Middleware للحماية من جانب الخادم
 */
export function requireAdminAuth(req: Request): AdminSession | null {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  return AdminAuthService.verifyAdminToken(token)
}

/**
 * دالة للحماية من جانب العميل
 */
export function getAdminSession(): AdminSession | null {
  if (typeof window === 'undefined') return null
  
  const token = localStorage.getItem('admin_token')
  if (!token) return null

  return AdminAuthService.verifyAdminToken(token)
}

export function setAdminSession(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('admin_token', token)
  }
}

export function clearAdminSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('admin_token')
  }
} 