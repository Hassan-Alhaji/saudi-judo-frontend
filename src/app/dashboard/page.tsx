"use client";
import { API_URL, HOST_URL } from '@/lib/api';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, getDjangoUser } from "../../lib/api";

export default function DashboardOverview() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ticketCount, setTicketCount] = useState(0);
  const [beltName, setBeltName] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const djangoUser = getDjangoUser();
    if (!djangoUser) {
      router.push("/");
      return;
    }
    setUserData(djangoUser);
    setLoading(false);

    // Fetch belt name if current_belt_id exists
    if (djangoUser.current_belt_id) {
      fetch(`${API_URL}/belts/`)
        .then(res => res.json())
        .then(belts => {
          const beltObj = belts.find((b: any) => b.id === djangoUser.current_belt_id);
          if (beltObj) setBeltName(beltObj.display_name);
        })
        .catch(e => console.error('Error fetching belts', e));
    }
  }, [router]);

  // Fetch ticket count from Django
  useEffect(() => {
    const djangoUser = getDjangoUser();
    apiGet('tickets/my/')
      .then(res => res.json())
      .then(data => {
        const ticketsArray = Array.isArray(data) ? data : (data.results || []);
        if (Array.isArray(ticketsArray)) {
          const role = String(djangoUser?.role || 'player').toLowerCase().trim();
          let count = 0;
          ticketsArray.forEach((t: any) => {
              const lastRole = t.last_message_role;
              const isStaffLast = lastRole && ['customer_service', 'admin', 'superadmin', 'executive_director', 'tech_committee', 'committee_manager', 'regional_supervisor'].includes(lastRole);
              const isPlayerLast = lastRole === 'player' || lastRole === 'coach';

              if (role === 'player' || role === 'coach') {
                  if (t.status === 'returned') count++;
                  else if (t.status === 'open' && isStaffLast) count++;
                  else if (role === 'coach' && t.status === 'pending_coach') count++;
              } else {
                  if (role === 'customer_service') {
                      if (t.status === 'pending_cs' || t.status === 'open') count++;
                  }
                  else if (role === 'regional_supervisor' && t.status === 'pending_supervisor') count++;
                  else if (['tech_committee', 'committee_manager'].includes(role) && t.status === 'pending_committee') count++;
                  else if (['executive_director', 'ceo'].includes(role) && t.status === 'pending_ceo') count++;
                  else if (['admin', 'superadmin', 'superuser'].includes(role) && !['closed', 'approved', 'rejected'].includes(t.status)) count++;
              }
          });
          setTicketCount(count);
        }
      })
      .catch(err => console.error('Error fetching tickets count:', err));
  }, []);

  if (loading) return null;

  const djangoUser = getDjangoUser();

  return (
    <div className="space-y-8">
      
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Player/Coach specific widget: Current Belt */}
        {['player', 'coach'].includes(djangoUser?.role || 'player') && (
            <div className="bg-white rounded-2xl p-5 md:p-8 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
                <span className="text-gray-500 text-xs md:text-base font-medium">الحزام الحالي</span>
                <h3 className="text-xl md:text-3xl font-bold text-gray-800 mt-1 md:mt-3">
                {beltName || userData?.belt || 'أبيض (مبتدئ)'}
                </h3>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-sm">
                <span className={`font-medium ${userData?.is_active_member ? 'text-green-600' : 'text-orange-500'}`}>
                {userData?.is_active_member ? 'حالة اللاعب فعال ✓' : 'غير مفعل بعد'}
                </span>
            </div>
            </div>
        )}

        {/* Roles like Admin/CEO widget: Quick Stats */}
        {['admin', 'superuser', 'superadmin', 'executive_director', 'ceo'].includes(String(djangoUser?.role).toLowerCase().trim()) && (
            <div className="bg-white rounded-2xl p-5 md:p-8 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
                <span className="text-gray-500 text-xs md:text-base font-medium">نظرة سريعة</span>
                <h3 className="text-xl md:text-3xl font-bold text-gray-800 mt-1 md:mt-3">
                الإحصائيات
                </h3>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-sm">
                <Link
                href="/dashboard/stats"
                className="text-gray-500 hover:text-green-600 cursor-pointer transition-colors text-xs font-semibold uppercase tracking-wide"
                >
                عرض لوحة المؤشرات &larr;
                </Link>
            </div>
            </div>
        )}

        {/* Universal widget: Total Tickets */}
        <div className="bg-white rounded-2xl p-5 md:p-8 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-gray-500 text-xs md:text-base font-medium">
              {['admin', 'superadmin', 'superuser', 'ceo', 'executive_director', 'customer_service', 'tech_committee', 'committee_manager', 'regional_supervisor'].includes(djangoUser?.role) ? 'تذاكر تحتاج لمراجعتك' : 'إجمالي التذاكر'}
            </span>
            <h3 className="text-xl md:text-3xl font-bold text-gray-800 mt-1 md:mt-3">
              {ticketCount}
            </h3>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-sm">
            <Link
              href="/dashboard/tickets"
              className="text-gray-500 hover:text-green-600 cursor-pointer transition-colors text-xs font-semibold uppercase tracking-wide"
            >
              عرض السجل كاملاً &larr;
            </Link>
          </div>
        </div>

        {/* Player/Coach specific widget: Create Ticket */}
        {['player', 'coach'].includes(djangoUser?.role || 'player') ? (
            <div className="bg-gradient-to-br from-green-700 to-green-900 rounded-2xl p-5 md:p-8 shadow-lg text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-10 -top-10 opacity-10">
                <img src="/logo.png" alt="شعار" className="w-40 h-40" />
            </div>
            <div className="relative z-10">
                <h3 className="text-lg md:text-2xl font-bold mb-1 md:mb-3">ترقية أو توثيق؟</h3>
                <p className="text-green-100 text-xs md:text-base mb-4 md:mb-8 leading-relaxed">
                يمكنك الآن رفع تذكرة لتوثيق حزامك الحالي أو التقدم بطلب إختبار لترقية حزامك الجديد.
                </p>
            </div>
            <Link
                href="/dashboard/tickets"
                className="w-full relative z-10 bg-white text-green-800 text-center font-bold py-2.5 md:py-4 px-4 rounded-xl hover:bg-green-50 transition-colors shadow-sm text-sm md:text-lg"
            >
                فتح تذكرة جديدة
            </Link>
            </div>
        ) : (
            <div className="bg-gradient-to-br from-blue-700 to-blue-900 rounded-2xl p-5 md:p-8 shadow-lg text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-10 -top-10 opacity-10">
                <img src="/logo.png" alt="شعار" className="w-40 h-40" />
            </div>
            <div className="relative z-10">
                <h3 className="text-lg md:text-2xl font-bold mb-1 md:mb-3">نظام الإدارة</h3>
                <p className="text-blue-100 text-xs md:text-base mb-4 md:mb-8 leading-relaxed">
                 استعرض قائمة منسوبي ولاعبي الاتحاد لتقديم الدعم أو إرسال الإشعارات.
                </p>
            </div>
            <Link
                href="/dashboard/players"
                className="w-full relative z-10 bg-white text-blue-800 text-center font-bold py-2.5 md:py-4 px-4 rounded-xl hover:bg-blue-50 transition-colors shadow-sm text-sm md:text-lg"
            >
                اللاعبين والمدربين
            </Link>
            </div>
        )}

      </div>

    </div>
  );
}
