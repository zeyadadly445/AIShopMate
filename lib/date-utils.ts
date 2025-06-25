/**
 * دوال مساعدة للتواريخ والأوقات الميلادية باللغة العربية
 * تضمن عرض التواريخ الميلادية وليس الهجرية
 */

/**
 * تنسيق التاريخ الميلادي باللغة العربية
 */
export function formatGregorianDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleDateString('ar-SA', {
    calendar: 'gregory', // 🔑 إجباري لضمان التقويم الميلادي
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * تنسيق التاريخ المختصر الميلادي باللغة العربية
 */
export function formatGregorianDateShort(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleDateString('ar-SA', {
    calendar: 'gregory', // 🔑 إجباري لضمان التقويم الميلادي
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * تنسيق الوقت باللغة العربية (12 ساعة)
 */
export function formatGregorianTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleTimeString('ar-SA', {
    calendar: 'gregory', // 🔑 إجباري لضمان التقويم الميلادي
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * تنسيق الوقت باللغة العربية (24 ساعة)
 */
export function formatGregorianTime24(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleTimeString('ar-SA', {
    calendar: 'gregory', // 🔑 إجباري لضمان التقويم الميلادي
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

/**
 * تنسيق التاريخ والوقت معاً الميلادي باللغة العربية
 */
export function formatGregorianDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleString('ar-SA', {
    calendar: 'gregory', // 🔑 إجباري لضمان التقويم الميلادي
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * تنسيق التاريخ والوقت المختصر الميلادي باللغة العربية
 */
export function formatGregorianDateTimeShort(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleString('ar-SA', {
    calendar: 'gregory', // 🔑 إجباري لضمان التقويم الميلادي
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * تنسيق التاريخ للمنطقة الزمنية المحددة (ميلادي)
 */
export function formatGregorianDateForTimezone(date: Date | string, timezone: string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleString('ar-SA', {
    calendar: 'gregory', // 🔑 إجباري لضمان التقويم الميلادي
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * تنسيق اليوم والتاريخ فقط (ميلادي)
 */
export function formatGregorianDayDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleDateString('ar-SA', {
    calendar: 'gregory', // 🔑 إجباري لضمان التقويم الميلادي
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * تنسيق الشهر والسنة فقط (ميلادي)
 */
export function formatGregorianMonthYear(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleDateString('ar-SA', {
    calendar: 'gregory', // 🔑 إجباري لضمان التقويم الميلادي
    year: 'numeric',
    month: 'long'
  });
}

/**
 * حساب الفرق بالأيام بين تاريخين
 */
export function daysDifference(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * التحقق من كون التاريخ اليوم
 */
export function isToday(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  
  return dateObj.toDateString() === today.toDateString();
}

/**
 * التحقق من كون التاريخ أمس
 */
export function isYesterday(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  return dateObj.toDateString() === yesterday.toDateString();
}

/**
 * تنسيق نسبي للوقت (منذ كذا، قبل كذا)
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'الآن';
  } else if (diffMinutes < 60) {
    return `منذ ${diffMinutes} دقيقة`;
  } else if (diffHours < 24) {
    return `منذ ${diffHours} ساعة`;
  } else if (diffDays === 1) {
    return 'أمس';
  } else if (diffDays < 7) {
    return `منذ ${diffDays} أيام`;
  } else {
    return formatGregorianDate(dateObj);
  }
} 