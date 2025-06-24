import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

// بيانات المدير المشفرة (يجب تغييرها في الإنتاج)
const ADMIN_CREDENTIALS = {
  username: 'admin_zeyad',
  // كلمة مرور: Admin@2024! (مشفرة)
  passwordHash: '$2a$12$LQv3c1yqBwlFHyO1FTlBxOzT5qHD5.Ke.c5rQHr5zVx3vJ8gK9oAy',
  adminId: 'admin_master_2024'
}

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
      if (username !== ADMIN_CREDENTIALS.username) {
        return false
      }
      
      const isValid = await bcrypt.compare(password, ADMIN_CREDENTIALS.passwordHash)
      return isValid
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