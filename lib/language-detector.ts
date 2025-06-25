// دالة لاكتشاف لغة النص وإنتاج رسائل الحدود بنفس اللغة

export type SupportedLanguage = 'ar' | 'en' | 'fr' | 'de' | 'hi' | 'tr' | 'nl' | 'pl' | 'zh' | 'ja' | 'id'

export function detectLanguage(message: string): SupportedLanguage {
  // أنماط للغات المختلفة
  const patterns = {
    // العربية
    ar: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/,
    
    // الصينية (المبسطة والتقليدية)
    zh: /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/,
    
    // اليابانية (هيراغانا، كاتاكانا، كانجي)
    ja: /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/,
    
    // الهندية (ديفاناغاري)
    hi: /[\u0900-\u097F]/,
    
    // التركية (حروف خاصة)
    tr: /[çğıöşüÇĞIİÖŞÜ]/,
    
    // البولندية (حروف خاصة)
    pl: /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/,
    
    // الفرنسية (حروف خاصة)
    fr: /[àâäéèêëïîôöùûüÿçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ]/,
    
    // الألمانية (حروف خاصة)
    de: /[äöüßÄÖÜ]/,
    
    // الهولندية (حروف خاصة)
    nl: /[áéíóúàèìòùâêîôûäëïöüÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÄËÏÖÜ]/,
    
    // الإندونيسية (كلمات شائعة)
    id: /\b(dan|atau|yang|untuk|dengan|dari|ke|di|pada|adalah|akan|sudah|belum|bisa|tidak|ya|iya)\b/i
  }
  
  // كلمات مميزة لكل لغة
  const keyWords = {
    fr: /\b(le|la|les|de|du|des|et|ou|un|une|avec|pour|dans|sur|par|est|sont|avoir|être|bonjour|merci|salut)\b/i,
    de: /\b(der|die|das|und|oder|ist|sind|haben|sein|mit|für|in|auf|von|zu|hallo|danke|guten)\b/i,
    nl: /\b(de|het|een|en|of|is|zijn|hebben|met|voor|in|op|van|naar|hallo|dank|goed)\b/i,
    tr: /\b(ve|veya|ile|için|içinde|üzerinde|den|dan|bir|bu|şu|merhaba|teşekkür|iyi)\b/i,
    pl: /\b(i|lub|z|ze|dla|w|na|od|do|jest|są|mieć|być|cześć|dziękuję|dzień)\b/i,
    hi: /\b(और|या|के|से|में|पर|को|है|हैं|होना|नमस्ते|धन्यवाद|अच्छा)\b/i,
    id: /\b(halo|terima|kasih|selamat|baik|bagus|hari|pagi|siang|malam)\b/i
  }
  
  // فحص الأنماط أولاً (أكثر دقة للغات ذات الأحرف الخاصة)
  for (const [lang, pattern] of Object.entries(patterns)) {
    if (pattern.test(message)) {
      return lang as SupportedLanguage
    }
  }
  
  // فحص الكلمات المميزة
  for (const [lang, pattern] of Object.entries(keyWords)) {
    if (pattern.test(message)) {
      return lang as SupportedLanguage
    }
  }
  
  // الافتراضي: إنجليزي
  return 'en'
}

/**
 * حساب الوقت المتبقي حتى منتصف الليل في المنطقة الزمنية المحددة
 */
export function getTimeUntilMidnight(timezone: string): {
  hours: number;
  minutes: number;
  totalHours: number;
} {
  try {
    const now = new Date();
    
    // الوقت الحالي في المنطقة الزمنية المحددة
    const currentTimeInZone = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    
    // منتصف الليل التالي في نفس المنطقة الزمنية
    const nextMidnight = new Date(currentTimeInZone);
    nextMidnight.setHours(24, 0, 0, 0);
    
    const diffMs = nextMidnight.getTime() - currentTimeInZone.getTime();
    const totalHours = Math.ceil(diffMs / (1000 * 60 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes, totalHours };
  } catch {
    return { hours: 0, minutes: 0, totalHours: 0 };
  }
}

export function generateLimitMessage(
  reason: 'daily' | 'monthly', 
  language: SupportedLanguage,
  businessName?: string,
  hoursUntilReset?: number,
  timezone?: string
): string {
  // حساب الوقت المتبقي إذا تم توفير المنطقة الزمنية
  let timeInfo = '';
  if (reason === 'daily' && timezone) {
    const { totalHours } = getTimeUntilMidnight(timezone);
    timeInfo = totalHours > 0 ? ` (سيتم التجديد خلال ${totalHours} ساعة تقريباً)` : '';
  }
  
  const messages = {
    ar: {
      daily: `تم تجاوز الحد اليومي من الرسائل لهذا المتجر حسب اشتراكه${timeInfo}. يمكنك المحاولة مرة أخرى غداً. 🕐`,
      monthly: `تم تجاوز الحد الشهري من الرسائل لهذا المتجر حسب اشتراكه. يرجى التواصل مع إدارة المتجر. 📞`
    },
    en: {
      daily: `Daily message limit reached for this store according to its subscription${timezone ? ` (resets in ~${getTimeUntilMidnight(timezone).totalHours} hours)` : ''}. Please try again tomorrow. 🕐`,
      monthly: `Monthly message limit reached for this store according to its subscription. Please contact the store management. 📞`
    },
    fr: {
      daily: `Limite de messages quotidiens atteinte pour ce magasin selon son abonnement${timezone ? ` (réinitialisation dans ~${getTimeUntilMidnight(timezone).totalHours} heures)` : ''}. Veuillez réessayer demain. 🕐`,
      monthly: `Limite de messages mensuels atteinte pour ce magasin selon son abonnement. Veuillez contacter la direction du magasin. 📞`
    },
    de: {
      daily: `Tägliches Nachrichtenlimit für diesen Shop gemäß seinem Abonnement erreicht${timezone ? ` (Reset in ~${getTimeUntilMidnight(timezone).totalHours} Stunden)` : ''}. Bitte versuchen Sie es morgen erneut. 🕐`,
      monthly: `Monatliches Nachrichtenlimit für diesen Shop gemäß seinem Abonnement erreicht. Bitte kontaktieren Sie die Shop-Verwaltung. 📞`
    },
    hi: {
      daily: `इस स्टोर के लिए दैनिक संदेश सीमा उसकी सदस्यता के अनुसार पहुंच गई है${timezone ? ` (~${getTimeUntilMidnight(timezone).totalHours} घंटों में रीसेट)` : ''}। कृपया कल फिर से कोशिश करें। 🕐`,
      monthly: `इस स्टोर के लिए मासिक संदेश सीमा उसकी सदस्यता के अनुसार पहुंच गई है। कृपया स्टोर प्रबंधन से संपर्क करें। 📞`
    },
    tr: {
      daily: `Bu mağaza için günlük mesaj limiti aboneliğine göre ulaşıldı${timezone ? ` (~${getTimeUntilMidnight(timezone).totalHours} saat içinde sıfırlanır)` : ''}. Lütfen yarın tekrar deneyin. 🕐`,
      monthly: `Bu mağaza için aylık mesaj limiti aboneliğine göre ulaşıldı. Lütfen mağaza yönetimi ile iletişime geçin. 📞`
    },
    nl: {
      daily: `Dagelijkse berichtenlimiet voor deze winkel volgens het abonnement bereikt${timezone ? ` (reset over ~${getTimeUntilMidnight(timezone).totalHours} uur)` : ''}. Probeer het morgen opnieuw. 🕐`,
      monthly: `Maandelijkse berichtenlimiet voor deze winkel volgens het abonnement bereikt. Neem contact op met winkelbeheer. 📞`
    },
    pl: {
      daily: `Dzienny limit wiadomości dla tego sklepu zgodnie z subskrypcją został osiągnięty${timezone ? ` (reset za ~${getTimeUntilMidnight(timezone).totalHours} godzin)` : ''}. Spróbuj ponownie jutro. 🕐`,
      monthly: `Miesięczny limit wiadomości dla tego sklepu zgodnie z subskrypcją został osiągnięty. Skontaktuj się z zarządzaniem sklepu. 📞`
    },
    zh: {
      daily: `根据订阅计划，此商店的每日消息限制已达到${timezone ? `（约${getTimeUntilMidnight(timezone).totalHours}小时后重置）` : ''}。请明天再试。🕐`,
      monthly: `根据订阅计划，此商店的每月消息限制已达到。请联系商店管理人员。📞`
    },
    ja: {
      daily: `サブスクリプションに従って、このストアの1日のメッセージ制限に達しました${timezone ? `（約${getTimeUntilMidnight(timezone).totalHours}時間後にリセット）` : ''}。明日再度お試しください。🕐`,
      monthly: `サブスクリプションに従って、このストアの月間メッセージ制限に達しました。ストア管理者にお問い合わせください。📞`
    },
    id: {
      daily: `Batas pesan harian untuk toko ini sesuai langganan telah tercapai${timezone ? ` (reset dalam ~${getTimeUntilMidnight(timezone).totalHours} jam)` : ''}. Silakan coba lagi besok. 🕐`,
      monthly: `Batas pesan bulanan untuk toko ini sesuai langganan telah tercapai. Silakan hubungi manajemen toko. 📞`
    }
  }
  
  return messages[language][reason]
}

export function generateWelcomeMessage(language: SupportedLanguage, businessName: string): string {
  const welcomeMessages = {
    ar: `مرحباً بك في متجر ${businessName}! كيف يمكنني مساعدتك اليوم؟ 😊`,
    en: `Welcome to ${businessName}! How can I help you today? 😊`,
    fr: `Bienvenue chez ${businessName}! Comment puis-je vous aider aujourd'hui? 😊`,
    de: `Willkommen bei ${businessName}! Wie kann ich Ihnen heute helfen? 😊`,
    hi: `${businessName} में आपका स्वागत है! आज मैं आपकी कैसे सहायता कर सकता हूं? 😊`,
    tr: `${businessName}'a hoş geldiniz! Bugün size nasıl yardımcı olabilirim? 😊`,
    nl: `Welkom bij ${businessName}! Hoe kan ik u vandaag helpen? 😊`,
    pl: `Witamy w ${businessName}! Jak mogę Ci dzisiaj pomóc? 😊`,
    zh: `欢迎来到${businessName}！今天我可以为您做些什么？😊`,
    ja: `${businessName}へようこそ！今日はどのようにお手伝いできますか？😊`,
    id: `Selamat datang di ${businessName}! Bagaimana saya bisa membantu Anda hari ini? 😊`
  }
  
  return welcomeMessages[language]
} 