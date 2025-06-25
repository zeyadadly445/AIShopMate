'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import { formatGregorianDate, formatGregorianTime } from '@/lib/date-utils';

interface UsageStats {
  merchant: {
    id: string;
    businessName: string;
    isActive: boolean;
  };
  daily: {
    used: number;
    limit: number;
    remaining: number;
    percentage: number;
  };
  monthly: {
    used: number;
    limit: number;
    remaining: number;
    percentage: number;
  };
  subscription: {
    plan: string;
    status: string;
    daysUntilReset: number;
  };
  lastReset: string;
  lastDailyReset: string;
  timestamp: string;
}

interface UsageStatsCardProps {
  merchantId: string;
}

export default function UsageStatsCard({ merchantId }: UsageStatsCardProps) {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/merchant/usage-stats/${merchantId}`);
      if (!response.ok) {
        throw new Error('فشل في تحميل الإحصائيات');
      }
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ غير معروف');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // تحديث الإحصائيات كل دقيقة
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [merchantId]);

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { color: string; text: string } } = {
      'ACTIVE': { color: 'bg-green-100 text-green-800', text: 'نشط' },
      'TRIAL': { color: 'bg-blue-100 text-blue-800', text: 'تجريبي' },
      'CANCELLED': { color: 'bg-red-100 text-red-800', text: 'ملغي' },
      'EXPIRED': { color: 'bg-gray-100 text-gray-800', text: 'منتهي' }
    };
    
    const statusInfo = statusMap[status] || { color: 'bg-gray-100 text-gray-800', text: status };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    );
  };

  const getPlanBadge = (plan: string) => {
    const planMap: { [key: string]: { color: string; text: string } } = {
      'BASIC': { color: 'bg-gray-100 text-gray-800', text: 'أساسية' },
      'STANDARD': { color: 'bg-blue-100 text-blue-800', text: 'قياسية' },
      'PREMIUM': { color: 'bg-purple-100 text-purple-800', text: 'مميزة' },
      'ENTERPRISE': { color: 'bg-yellow-100 text-yellow-800', text: 'مؤسسية' }
    };
    
    const planInfo = planMap[plan] || { color: 'bg-gray-100 text-gray-800', text: plan };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${planInfo.color}`}>
        {planInfo.text}
      </span>
    );
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold">خطأ في تحميل الإحصائيات</p>
          <p className="text-sm mt-1">{error}</p>
          <button 
            onClick={fetchStats}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            إعادة المحاولة
          </button>
        </div>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-600">
          <p>لا توجد بيانات متاحة</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* معلومات الاشتراك */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">معلومات الاشتراك</h3>
          <div className="flex items-center space-x-2 space-x-reverse">
            {getPlanBadge(stats.subscription.plan)}
            {getStatusBadge(stats.subscription.status)}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">اسم المتجر:</span>
            <p className="font-semibold">{stats.merchant.businessName}</p>
          </div>
          <div>
            <span className="text-gray-600">أيام حتى التجديد:</span>
            <p className="font-semibold">{stats.subscription.daysUntilReset} يوم</p>
          </div>
          <div>
            <span className="text-gray-600">آخر تحديث:</span>
            <p className="font-semibold">
              {formatGregorianTime(stats.timestamp)}
            </p>
          </div>
        </div>
      </Card>

      {/* الاستخدام اليومي */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">الاستخدام اليومي</h3>
          <span className="text-sm text-gray-600">
            تاريخ اليوم: {formatGregorianDate(stats.lastDailyReset)}
          </span>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              {stats.daily.used} / {stats.daily.limit} رسالة
            </span>
            <span className="text-sm font-medium text-gray-900">
              {stats.daily.percentage.toFixed(1)}%
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(stats.daily.percentage)}`}
              style={{ width: `${Math.min(stats.daily.percentage, 100)}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-sm text-gray-600">
            <span>متبقي: {stats.daily.remaining} رسالة</span>
            <span>
              {stats.daily.percentage >= 90 ? '⚠️ قريب من النفاد' : 
               stats.daily.percentage >= 75 ? '⚡ استخدام مرتفع' : 
               '✅ استخدام طبيعي'}
            </span>
          </div>
        </div>
      </Card>

      {/* الاستخدام الشهري */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">الاستخدام الشهري</h3>
          <span className="text-sm text-gray-600">
            آخر إعادة تعيين: {formatGregorianDate(stats.lastReset)}
          </span>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              {stats.monthly.used.toLocaleString()} / {stats.monthly.limit.toLocaleString()} رسالة
            </span>
            <span className="text-sm font-medium text-gray-900">
              {stats.monthly.percentage.toFixed(1)}%
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(stats.monthly.percentage)}`}
              style={{ width: `${Math.min(stats.monthly.percentage, 100)}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-sm text-gray-600">
            <span>متبقي: {stats.monthly.remaining.toLocaleString()} رسالة</span>
            <span>
              {stats.monthly.percentage >= 90 ? '🚨 خطر نفاد الحد' : 
               stats.monthly.percentage >= 75 ? '⚠️ استخدام مرتفع' : 
               stats.monthly.percentage >= 50 ? '📊 استخدام متوسط' :
               '✅ استخدام منخفض'}
            </span>
          </div>
        </div>
      </Card>

      {/* تنبيهات */}
      {(stats.daily.percentage >= 80 || stats.monthly.percentage >= 80) && (
        <Card className="p-6 border-l-4 border-orange-500 bg-orange-50">
          <div className="flex items-center">
            <span className="text-2xl mr-3">⚠️</span>
            <div>
              <h4 className="text-lg font-semibold text-orange-800">تنبيه استخدام مرتفع</h4>
              <p className="text-orange-700 text-sm mt-1">
                {stats.daily.percentage >= 90 ? 'اقتربت من نفاد الحد اليومي للرسائل.' : ''}
                {stats.monthly.percentage >= 90 ? 'اقتربت من نفاد الحد الشهري للرسائل.' : ''}
                {stats.daily.percentage >= 80 && stats.daily.percentage < 90 ? 'الاستخدام اليومي مرتفع.' : ''}
                {stats.monthly.percentage >= 80 && stats.monthly.percentage < 90 ? 'الاستخدام الشهري مرتفع.' : ''}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
} 