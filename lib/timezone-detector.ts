/**
 * نظام اكتشاف وإدارة المناطق الزمنية للتجار
 * يضمن تجديد الحد اليومي في منتصف الليل المحلي لكل تاجر
 */

import { formatGregorianDateTimeShort } from '@/lib/date-utils'

export interface TimezoneInfo {
  timezone: string;
  offset: number;
  offsetString: string;
  localTime: string;
  isValidTimezone: boolean;
}

/**
 * اكتشاف المنطقة الزمنية للمستخدم باستخدام JavaScript
 */
export function detectUserTimezone(): TimezoneInfo {
  try {
    // الحصول على المنطقة الزمنية من المتصفح
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // الحصول على معلومات الإزاحة
    const now = new Date();
    const offset = -now.getTimezoneOffset(); // بالدقائق
    const offsetHours = Math.floor(offset / 60);
    const offsetMinutes = Math.abs(offset % 60);
    const offsetString = `GMT${offset >= 0 ? '+' : '-'}${Math.abs(offsetHours).toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`;
    
    // تنسيق الوقت المحلي (ميلادي)
    const localTime = formatGregorianDateTimeShort(now);

    return {
      timezone,
      offset,
      offsetString,
      localTime,
      isValidTimezone: isValidTimezone(timezone)
    };
  } catch (error) {
    console.error('فشل في اكتشاف المنطقة الزمنية:', error);
    
    // القيمة الافتراضية عند الفشل
    return {
      timezone: 'UTC',
      offset: 0,
      offsetString: 'GMT+00:00',
      localTime: new Date().toISOString(),
      isValidTimezone: true
    };
  }
}

/**
 * التحقق من صحة المنطقة الزمنية
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    // محاولة إنشاء تاريخ في المنطقة الزمنية المحددة
    new Date().toLocaleString('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * قائمة المناطق الزمنية الشائعة للتجار العرب والدوليين
 */
export const POPULAR_TIMEZONES = [
  // المناطق العربية
  { value: 'Asia/Dubai', label: 'الإمارات العربية المتحدة (Dubai/Abu Dhabi)', region: 'عربية' },
  { value: 'Asia/Riyadh', label: 'المملكة العربية السعودية (Riyadh)', region: 'عربية' },
  { value: 'Asia/Kuwait', label: 'الكويت (Kuwait)', region: 'عربية' },
  { value: 'Asia/Qatar', label: 'قطر (Doha)', region: 'عربية' },
  { value: 'Asia/Bahrain', label: 'البحرين (Manama)', region: 'عربية' },
  { value: 'Asia/Muscat', label: 'عُمان (Muscat)', region: 'عربية' },
  { value: 'Africa/Cairo', label: 'مصر (Cairo)', region: 'عربية' },
  { value: 'Asia/Beirut', label: 'لبنان (Beirut)', region: 'عربية' },
  { value: 'Asia/Damascus', label: 'سوريا (Damascus)', region: 'عربية' },
  { value: 'Asia/Amman', label: 'الأردن (Amman)', region: 'عربية' },
  { value: 'Asia/Baghdad', label: 'العراق (Baghdad)', region: 'عربية' },
  { value: 'Africa/Casablanca', label: 'المغرب (Casablanca)', region: 'عربية' },
  { value: 'Africa/Algiers', label: 'الجزائر (Algiers)', region: 'عربية' },
  { value: 'Africa/Tunis', label: 'تونس (Tunis)', region: 'عربية' },
  { value: 'Africa/Tripoli', label: 'ليبيا (Tripoli)', region: 'عربية' },
  { value: 'Africa/Khartoum', label: 'السودان (Khartoum)', region: 'عربية' },
  
  // أمريكا الشمالية
  { value: 'America/New_York', label: 'نيويورك (Eastern Time)', region: 'أمريكا الشمالية' },
  { value: 'America/Chicago', label: 'شيكاغو (Central Time)', region: 'أمريكا الشمالية' },
  { value: 'America/Denver', label: 'دنفر (Mountain Time)', region: 'أمريكا الشمالية' },
  { value: 'America/Los_Angeles', label: 'لوس أنجلوس (Pacific Time)', region: 'أمريكا الشمالية' },
  { value: 'America/Toronto', label: 'تورونتو (كندا)', region: 'أمريكا الشمالية' },
  
  // أوروبا
  { value: 'Europe/London', label: 'لندن (GMT)', region: 'أوروبا' },
  { value: 'Europe/Paris', label: 'باريس (CET)', region: 'أوروبا' },
  { value: 'Europe/Berlin', label: 'برلين (CET)', region: 'أوروبا' },
  { value: 'Europe/Amsterdam', label: 'أمستردام (CET)', region: 'أوروبا' },
  { value: 'Europe/Brussels', label: 'بروكسل (CET)', region: 'أوروبا' },
  { value: 'Europe/Rome', label: 'روما (CET)', region: 'أوروبا' },
  { value: 'Europe/Madrid', label: 'مدريد (CET)', region: 'أوروبا' },
  { value: 'Europe/Istanbul', label: 'إسطنبول (TRT)', region: 'أوروبا' },
  { value: 'Europe/Warsaw', label: 'وارسو (CET)', region: 'أوروبا' },
  
  // آسيا
  { value: 'Asia/Shanghai', label: 'شنغهاي (الصين)', region: 'آسيا' },
  { value: 'Asia/Tokyo', label: 'طوكيو (اليابان)', region: 'آسيا' },
  { value: 'Asia/Seoul', label: 'سول (كوريا الجنوبية)', region: 'آسيا' },
  { value: 'Asia/Singapore', label: 'سنغافورة', region: 'آسيا' },
  { value: 'Asia/Hong_Kong', label: 'هونغ كونغ', region: 'آسيا' },
  { value: 'Asia/Kolkata', label: 'كولكاتا (الهند)', region: 'آسيا' },
  { value: 'Asia/Jakarta', label: 'جاكرتا (إندونيسيا)', region: 'آسيا' },
  { value: 'Asia/Bangkok', label: 'بانكوك (تايلاند)', region: 'آسيا' },
  { value: 'Asia/Manila', label: 'مانيلا (الفلبين)', region: 'آسيا' },
  
  // أفريقيا
  { value: 'Africa/Johannesburg', label: 'جوهانسبرغ (جنوب أفريقيا)', region: 'أفريقيا' },
  { value: 'Africa/Lagos', label: 'لاغوس (نيجيريا)', region: 'أفريقيا' },
  { value: 'Africa/Nairobi', label: 'نيروبي (كينيا)', region: 'أفريقيا' },
  
  // أوقيانوسيا
  { value: 'Australia/Sydney', label: 'سيدني (أستراليا)', region: 'أوقيانوسيا' },
  { value: 'Australia/Melbourne', label: 'ملبورن (أستراليا)', region: 'أوقيانوسيا' },
  { value: 'Pacific/Auckland', label: 'أوكلاند (نيوزيلندا)', region: 'أوقيانوسيا' },
  
  // UTC كخيار افتراضي
  { value: 'UTC', label: 'التوقيت العالمي المنسق (UTC)', region: 'عام' }
];

/**
 * البحث عن منطقة زمنية حسب الاسم أو المنطقة
 */
export function searchTimezones(query: string): typeof POPULAR_TIMEZONES {
  const normalizedQuery = query.toLowerCase().trim();
  
  return POPULAR_TIMEZONES.filter(tz => 
    tz.label.toLowerCase().includes(normalizedQuery) ||
    tz.value.toLowerCase().includes(normalizedQuery) ||
    tz.region.toLowerCase().includes(normalizedQuery)
  );
}

/**
 * تحويل المنطقة الزمنية إلى معلومات قابلة للقراءة
 */
export function formatTimezoneInfo(timezone: string): string {
  try {
    const now = new Date();
    const timeInZone = formatGregorianDateTimeShort(now.toLocaleString('en-US', { timeZone: timezone }));
    
    const offset = getTimezoneOffset(timezone);
    const offsetString = formatOffset(offset);
    
    return `${timeInZone} (${offsetString})`;
  } catch {
    return `${timezone} (غير صحيح)`;
  }
}

/**
 * الحصول على إزاحة المنطقة الزمنية بالدقائق
 */
export function getTimezoneOffset(timezone: string): number {
  try {
    const now = new Date();
    const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    const local = new Date(utc.toLocaleString('en-US', { timeZone: timezone }));
    return Math.round((local.getTime() - utc.getTime()) / 60000);
  } catch {
    return 0;
  }
}

/**
 * تنسيق الإزاحة الزمنية
 */
export function formatOffset(offsetMinutes: number): string {
  const hours = Math.floor(Math.abs(offsetMinutes) / 60);
  const minutes = Math.abs(offsetMinutes) % 60;
  const sign = offsetMinutes >= 0 ? '+' : '-';
  
  return `GMT${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * التحقق من أن المنطقة الزمنية بحاجة لإعادة تعيين يومية
 * (للاستخدام في العميل)
 */
export function shouldResetDaily(lastResetDate: string, timezone: string): boolean {
  try {
    const now = new Date();
    const lastReset = new Date(lastResetDate);
    
    // تحويل التواريخ للمنطقة الزمنية المحلية
    const currentDateLocal = new Date(now.toLocaleDateString('en-CA', { timeZone: timezone }));
    const lastResetLocal = new Date(lastReset.toLocaleDateString('en-CA', { timeZone: timezone }));
    
    return currentDateLocal > lastResetLocal;
  } catch {
    return false;
  }
}

/**
 * حساب الوقت المتبقي حتى منتصف الليل في المنطقة الزمنية المحددة
 */
export function getTimeUntilMidnight(timezone: string): {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
} {
  try {
    const now = new Date();
    
    // الوقت الحالي في المنطقة الزمنية المحددة
    const currentTimeInZone = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    
    // منتصف الليل التالي في نفس المنطقة الزمنية
    const nextMidnight = new Date(currentTimeInZone);
    nextMidnight.setHours(24, 0, 0, 0);
    
    const diffMs = nextMidnight.getTime() - currentTimeInZone.getTime();
    const totalSeconds = Math.floor(diffMs / 1000);
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return { hours, minutes, seconds, totalSeconds };
  } catch {
    return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 };
  }
} 