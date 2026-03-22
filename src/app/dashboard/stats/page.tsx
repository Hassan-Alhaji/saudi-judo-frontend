"use client";

import { useEffect, useState } from "react";
import { apiGet } from "../../../lib/api";
import JudoLoader from "../../../components/JudoLoader";

export default function AdminStatsPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    apiGet('stats/')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("فشل جلب الإحصائيات");
      })
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        setErrorMsg("لا تملك الصلاحية الكافية أو حدث خطأ في النظام.");
        setLoading(false);
      });
  }, []);



  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <JudoLoader size="md" text="جاري تحليل البيانات..." />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="bg-red-50 text-red-600 p-6 rounded-2xl text-center shadow-sm">
        <p className="font-bold text-lg">{errorMsg}</p>
      </div>
    );
  }

  if (!stats) return null;

  // Max value for progressing bars
  const maxBelts = Math.max(...stats.belts.map((b: any) => b.count), 1);
  const maxRegions = Math.max(...stats.regions.map((r: any) => r.count), 1);
  const totalTickets = stats.tickets.total || 1;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-3xl p-8 shadow-lg text-white flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black mb-2">إحصائيات المنصة</h1>
          <p className="text-green-100 opacity-90">نظرة شاملة لأداء المنصة والبيانات الإحصائية</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-green-100 mb-1">النشاط في آخر 7 أيام</p>
          <div className="flex gap-4">
            <div className="bg-white/20 px-4 py-2 rounded-xl backdrop-blur-sm">
              <span className="block text-2xl font-bold">{stats.recent_activity.new_users_7d}</span>
              <span className="text-xs">تسجيل جديد</span>
            </div>
            <div className="bg-white/20 px-4 py-2 rounded-xl backdrop-blur-sm">
              <span className="block text-2xl font-bold">{stats.recent_activity.new_tickets_7d}</span>
              <span className="text-xs">تذكرة جديدة</span>
            </div>
          </div>
        </div>
      </div>


      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-bold mb-1">إجمالي اللاعبين</p>
            <p className="text-3xl font-black text-gray-800">{stats.users.players}</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-2xl">🥋</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-bold mb-1">إجمالي المدربين</p>
            <p className="text-3xl font-black text-gray-800">{stats.users.coaches}</p>
          </div>
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center text-2xl">👨‍🏫</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-bold mb-1">التذاكر المعلقة</p>
            <p className="text-3xl font-black text-yellow-600">{stats.tickets.pending}</p>
          </div>
          <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-xl flex items-center justify-center text-2xl">⏳</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-bold mb-1">التذاكر المقبولة</p>
            <p className="text-3xl font-black text-green-600">{stats.tickets.approved}</p>
          </div>
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center text-2xl">✅</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-bold mb-1">رسوم الترقيات المدفوعة</p>
            <p className="text-3xl font-black text-emerald-600">{stats.financials?.total_revenue || 0} ر.س</p>
          </div>
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-2xl">💰</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Belt Distribution */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-6">التوزيع الفني (الأحزمة)</h3>
          {stats.belts.length === 0 ? (
            <p className="text-gray-500 text-center">لا توجد بيانات للأحزمة حالياً.</p>
          ) : (
            <div className="space-y-4">
              {stats.belts.map((belt: any, i: number) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1 font-bold">
                    <span className="text-gray-700">{belt.belt_name}</span>
                    <span className="text-gray-900">{belt.count} لاعب</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div 
                      className="bg-green-600 h-3 rounded-full" 
                      style={{ width: `${(belt.count / maxBelts) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Region Distribution */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-6">التوزيع الجغرافي (أعلى 5 مناطق)</h3>
          {stats.regions.length === 0 ? (
            <p className="text-gray-500 text-center">لا توجد بيانات للمناطق حالياً.</p>
          ) : (
            <div className="space-y-4">
              {stats.regions.map((region: any, i: number) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1 font-bold">
                    <span className="text-gray-700">{region.region}</span>
                    <span className="text-gray-900">{region.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full" 
                      style={{ width: `${(region.count / maxRegions) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ticket Status Share */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold text-gray-800 mb-6">حالة التذاكر الشاملة</h3>
        <div className="flex items-center gap-4">
          {stats.tickets.total === 0 ? (
            <p className="text-gray-500 text-center w-full">لا توجد تذاكر حالياً.</p>
          ) : (
            <div className="w-full bg-gray-100 h-6 flex rounded-full overflow-hidden shadow-inner">
              <div 
                className="bg-green-500 h-full flex items-center justify-center text-xs text-white font-bold" 
                style={{ width: `${(stats.tickets.approved / totalTickets) * 100}%` }}
                title="مقبولة"
              >
                {(stats.tickets.approved / totalTickets * 100).toFixed(0)}%
              </div>
              <div 
                className="bg-yellow-400 h-full flex items-center justify-center text-xs text-white font-bold" 
                style={{ width: `${(stats.tickets.pending / totalTickets) * 100}%` }}
                title="معلقة"
              >
                {(stats.tickets.pending / totalTickets * 100).toFixed(0)}%
              </div>
              <div 
                className="bg-red-500 h-full flex items-center justify-center text-xs text-white font-bold" 
                style={{ width: `${(stats.tickets.rejected / totalTickets) * 100}%` }}
                title="مرفوضة"
              >
                {(stats.tickets.rejected / totalTickets * 100).toFixed(0)}%
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-center gap-6 mt-4 text-sm font-bold text-gray-600">
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full"></div> مقبولة ({stats.tickets.approved})</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-400 rounded-full"></div> معلقة ({stats.tickets.pending})</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full"></div> مرفوضة ({stats.tickets.rejected})</div>
        </div>
      </div>
    </div>
  );
}
