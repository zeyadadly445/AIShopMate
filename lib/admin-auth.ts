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

// JWT Secret منفصل للمدير لتجنب التضارب مع Supabase
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'admin-ai-shop-mate-secret-2024-secure-key-for-admin-panel-authentication'

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
      
      // إذا كان هناك hash مشفر، استخدمه (للأمان المتقدم)
      if (ADMIN_CREDENTIALS.passwordHash) {
        return await bcrypt.compare(password, ADMIN_CREDENTIALS.passwordHash)
      }
      
      // وإلا، مقارنة مباشرة مع كلمة المرور (للسهولة)
      return password === ADMIN_CREDENTIALS.password
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

    return jwt.sign(payload, ADMIN_JWT_SECRET, { 
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
      if (!token) {
        return null
      }

      const decoded = jwt.verify(token, ADMIN_JWT_SECRET, {
        issuer: 'ai-shop-mate-admin',
        audience: 'admin-panel'
      }) as AdminSession

      // التحقق من أن المستخدم هو مدير حقيقي
      if (!decoded || 
          typeof decoded !== 'object' || 
          decoded.adminId !== ADMIN_CREDENTIALS.adminId || 
          !decoded.isAdmin) {
        return null
      }

      // التحقق من انتهاء الجلسة (24 ساعة)
      const sessionAge = Date.now() - decoded.loginTime
      if (sessionAge > 24 * 60 * 60 * 1000) {
        return null
      }

      return decoded
    } catch (error) {
      // تحسين error handling للبيئات المختلفة
      if (typeof window !== 'undefined') {
        // في المتصفح، لا نريد logs مفصلة
        return null
      }
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

  // في العميل، نتحقق فقط من وجود token صالح بشكل أساسي
  try {
    return AdminAuthService.verifyAdminToken(token)
  } catch (error) {
    // إذا فشل التحقق في العميل، نزيل token ونطلب تسجيل دخول جديد
    clearAdminSession()
    return null
  }
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