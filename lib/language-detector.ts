// دالة لاكتشاف لغة النص وإنتاج رسائل الحدود بنفس اللغة

export function detectLanguage(message: string): 'ar' | 'en' {
  // نمط للحروف العربية
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
  
  // إذا كان النص يحتوي على حروف عربية، فهو عربي
  if (arabicPattern.test(message)) {
    return 'ar'
  }
  
  // خلاف ذلك، إنجليزي
  return 'en'
}

export function generateLimitMessage(
  reason: 'daily' | 'monthly', 
  language: 'ar' | 'en',
  businessName?: string
): string {
  const storeName = businessName ? ` for ${businessName}` : ''
  
  if (language === 'ar') {
    if (reason === 'daily') {
      return `تم تجاوز الحد اليومي من الرسائل لهذا المتجر حسب اشتراكه. يمكنك المحاولة مرة أخرى غداً. 🕐`
    } else {
      return `تم تجاوز الحد الشهري من الرسائل لهذا المتجر حسب اشتراكه. يرجى التواصل مع إدارة المتجر. 📞`
    }
  } else {
    if (reason === 'daily') {
      return `Daily message limit reached for this store${storeName} according to its subscription. Please try again tomorrow. 🕐`
    } else {
      return `Monthly message limit reached for this store${storeName} according to its subscription. Please contact the store management. 📞`
    }
  }
}

export function generateWelcomeMessage(language: 'ar' | 'en', businessName: string): string {
  if (language === 'ar') {
    return `مرحباً بك في متجر ${businessName}! كيف يمكنني مساعدتك اليوم؟ 😊`
  } else {
    return `Welcome to ${businessName}! How can I help you today? 😊`
  }
} 