"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import JudoLoader from "../../components/JudoLoader";

import { clearAuthData } from "../../lib/api";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unreadTickets, setUnreadTickets] = useState(0);
  const [showNotification, setShowNotification] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [maintenanceData, setMaintenanceData] = useState<any>(null);
  const [randomQuote, setRandomQuote] = useState("");
  const router = useRouter();
  const pathname = usePathname();

  // Idle timeout state
  const [idleWarning, setIdleWarning] = useState(false);
  const [idleCountdown, setIdleCountdown] = useState(30);
  useEffect(() => {
    // TEMPORARY: Bypass Firebase Auth and use Django user from localStorage
    const checkAuth = async () => {
      const { getDjangoUser, apiGet } = require("../../lib/api");
      const djangoUser = getDjangoUser();
      if (!djangoUser) {
        router.push("/");
      } else {
        setUser(djangoUser);
        setUserData(djangoUser);
        setLoading(false);

        // Fetch unread/action-required tickets and settings
        try {
          const [res, settingsRes] = await Promise.all([
             apiGet("tickets/my/"),
             apiGet("settings/")
          ]);

          if (settingsRes.ok) {
             const settingsData = await settingsRes.json();
             setMaintenanceData(settingsData);
          }

          if (res.ok) {
            const data = await res.json();
            const role = String(djangoUser.role).toLowerCase().trim();
            let count = 0;
            data.forEach((t: any) => {
                if (role === 'player' && t.status === 'returned') count++;
                else if (role === 'coach' && t.status === 'pending_coach') count++;
                else if (role === 'customer_service' && (t.status === 'open' || t.status === 'pending_cs')) count++;
                else if (role === 'regional_supervisor' && t.status === 'pending_supervisor') count++;
                else if (['tech_committee', 'committee_manager'].includes(role) && t.status === 'pending_committee') count++;
                else if (['executive_director', 'ceo'].includes(role) && t.status === 'pending_ceo') count++;
                else if (['admin', 'superadmin', 'superuser'].includes(role) && t.status === 'open') count++;
            });
            setUnreadTickets(count);
          }
        } catch(e) {}
      }
    };
    
    checkAuth();

    // Random Quote Generator
    const judoQuotes = [
      "الهدف من الجودو هو بناء شخصية تساهم في خدمة المجتمع - جيغورو كانو",
      "لا يهم أن تكون أفضل من غيرك، بل أفضل مما كنت عليه بالأمس - جيغورو كانو",
      "الجودو ليس مجرد رياضة، بل أسلوب حياة - جيغورو كانو",
      "الكفاءة القصوى والمنفعة المتبادلة - جيغورو كانو",
      "السقوط سبع مرات والنهوض ثمانية - حكمة يابانية",
      "في الرياضات الفردية، منافسك الحقيقي هو نفسك القديمة",
      "الانضباط هو الجسر الذي يربط بين أهدافك وإنجازاتك",
      "لا توجد إختصارات لأي مكان يستحق الذهاب إليه",
      "المستحيل هو مجرد كلمة يستخدمها الضعفاء",
      "القوة الحقيقية ليست في العضلات، بل في الإرادة التي لا تنكسر",
      "النجاح لا يأتي بالصدفة، بل بالعمل الشاق والتحمل",
      "احترام الخصم هو أول دروس الشجاعة",
      "كل يوم تتدرب فيه هو خطوة إضافية نحو منصة التتويج",
      "إذا أردت أن تكون بطلاً، تدرب وكأنك الخاسر",
      "أكبر انتصار هو الفوز على عقبة الاستسلام داخلك",
      "الصبر والمثابرة هما مفتاح كل الأبواب المغلقة",
      "الألم المؤقت في التدريب أهون بكثير من ندم الخسارة",
      "العقل السليم يعطيك أفضلية فوق القوة الجسدية الخالصة",
      "لا تخشَ من البداية من جديد، هذه المرة لست تبدأ من الصفر بل من الخبرة",
      "الخسارة الحقيقية الوحيدة هي التوقف عن المحاولة",
      "التركيز هو فن تجاهل المشتتات في طريقك للهدف",
      "المرونة ليست فقط للجسد، بل للعقل في مواجهة الشدائد",
      "لتبلغ القمة يجب أن تتوقف عن وضع الأعذار",
      "الأبطال لا يصنعون في الصالات الرياضية، الأبطال يصنعون من الإرادة القوية",
      "البطولة لا تعني أنك لن تخسر أبداً، بل تعني أنك ستنهض بعد كل خسارة"
    ];
    setRandomQuote(judoQuotes[Math.floor(Math.random() * judoQuotes.length)]);

  }, [router]);

  const getGreetingText = () => {
     if (!userData) return '';
     const userRole = String(userData.role).toLowerCase().trim();
     const name = userData.name_ar || userData.name || '';
     const firstName = name.split(' ')[0];
     if (userRole === 'player' || userRole === 'coach' || userRole === 'referee') {
         return `أهلاً بك في الدوجو (Dojo) يا كابتن ${firstName} 🥋`;
     }
     return `مرحباً ${firstName}`;
  };

  const handleSignOut = async () => {
    clearAuthData();
    router.push("/");
  };

  // --- IDLE LOGOUT TRACKING ---
  useEffect(() => {
    if (!user) return;

    let timeoutId: NodeJS.Timeout;
    let warningId: NodeJS.Timeout;

    const resetTimer = () => {
      if (idleWarning) return; // Don't auto-reset if warning is already visible
      
      clearTimeout(timeoutId);
      clearTimeout(warningId);

      // Warning after 9 minutes 30 seconds
      warningId = setTimeout(() => {
        setIdleWarning(true);
        setIdleCountdown(30);
      }, (9 * 60 + 30) * 1000);

      // Auto logout after 10 minutes
      timeoutId = setTimeout(() => {
        handleSignOut();
      }, 10 * 60 * 1000);
    };

    const handleActivity = () => {
      resetTimer();
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    resetTimer();

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      clearTimeout(timeoutId);
      clearTimeout(warningId);
    };
  }, [user, idleWarning, router]);

  useEffect(() => {
     let intervalId: NodeJS.Timeout;
     if (idleWarning && idleCountdown > 0) {
        intervalId = setInterval(() => {
            setIdleCountdown(prev => prev - 1);
        }, 1000);
     } else if (idleWarning && idleCountdown <= 0) {
        handleSignOut();
     }
     return () => clearInterval(intervalId);
  }, [idleWarning, idleCountdown]);

  const handleStayLoggedIn = () => {
      setIdleWarning(false);
      setIdleCountdown(30);
  };
  // ----------------------------

  if (loading) {
    return (
      <div className="min-h-screen grid bg-gray-50" dir="rtl">
        <JudoLoader size="fullscreen" text="جاري الدخول للدوجو..." />
      </div>
    );
  }

  // Check Maintenance Mode
  const roleStr = String(userData?.role || 'player').toLowerCase().trim();
  const isAdmin = ['admin', 'superadmin', 'superuser'].includes(roleStr);
  
  if (maintenanceData?.is_maintenance_mode && !isAdmin) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6" dir="rtl">
              <div className="bg-white p-10 rounded-2xl shadow-xl max-w-lg w-full text-center border-t-4 border-yellow-500">
                  <div className="text-6xl mb-6">🚧</div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-4">وضع الصيانة</h1>
                  <p className="text-lg text-gray-600 mb-6 font-medium whitespace-pre-wrap leading-relaxed">
                      {maintenanceData.maintenance_message_ar}
                  </p>
                  <p className="text-md text-gray-500 mb-8 whitespace-pre-wrap" dir="ltr">
                      {maintenanceData.maintenance_message_en}
                  </p>
                  <button
                      onClick={handleSignOut}
                      className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white font-bold py-3 px-8 rounded-xl transition-colors duration-200"
                  >
                      العودة وتسجيل الخروج
                  </button>
              </div>
          </div>
      );
  }

  const playerNavLinks = [
    { name: 'الرئيسية', path: '/dashboard' },
    { name: 'حسابي', path: '/dashboard/profile' },
    { name: 'إنجازاتي', path: '/dashboard/achievements' },
    { name: 'التذاكر', path: '/dashboard/tickets' },
  ];

  const employeeNavLinks = [
    { name: 'الرئيسية', path: '/dashboard' },
    { name: 'اللاعبين والمدربين', path: '/dashboard/players' },
    { name: 'التذاكر', path: '/dashboard/tickets' },
  ];

  const ceoNavLinks = [
    { name: 'الرئيسية', path: '/dashboard' },
    { name: 'الإحصائيات', path: '/dashboard/stats' },
    { name: 'اللاعبين والمدربين', path: '/dashboard/players' },
    { name: 'التذاكر', path: '/dashboard/tickets' },
  ];

  const adminNavLinks = [
    { name: 'الرئيسية', path: '/dashboard' },
    { name: 'الإحصائيات', path: '/dashboard/stats' },
    { name: 'الإعدادات', path: '/dashboard/settings' },
    { name: 'اللاعبين والمدربين', path: '/dashboard/players' },
    { name: 'التذاكر', path: '/dashboard/tickets' },
    { name: 'المستخدمين والصلاحيات', path: '/dashboard/admin/users' },
  ];

  let navLinks = playerNavLinks;
  const role = String(userData?.role || 'player').toLowerCase().trim();
  const permissions = userData?.permissions || {};
  
  if (role === 'admin' || role === 'superuser' || role === 'superadmin') {
      navLinks = adminNavLinks;
  } else if (role === 'executive_director' || role === 'ceo') {
      navLinks = ceoNavLinks;
  } else if (['customer_service', 'tech_committee', 'committee_manager', 'regional_supervisor'].includes(role)) {
      // Build nav dynamically based on custom permissions
      const dynamicLinks = [...employeeNavLinks];
      if (permissions.can_edit_memberships && !dynamicLinks.find(l => l.path === '/dashboard/players')) {
          dynamicLinks.unshift({ name: 'اللاعبين والمدربين', path: '/dashboard/players' });
      }
      if (permissions.can_view_reports) {
          if (!dynamicLinks.find(l => l.path === '/dashboard/players')) {
              dynamicLinks.unshift({ name: 'اللاعبين والمدربين', path: '/dashboard/players' });
          }
          if (!dynamicLinks.find(l => l.path === '/dashboard/stats')) {
              dynamicLinks.unshift({ name: 'الإحصائيات', path: '/dashboard/stats' });
          }
      }
      if (permissions.can_manage_settings && !dynamicLinks.find(l => l.path === '/dashboard/settings')) {
          dynamicLinks.push({ name: 'الإعدادات', path: '/dashboard/settings' });
      }
      navLinks = dynamicLinks;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row relative" dir="rtl">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 md:hidden transition-opacity backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed md:sticky right-0 top-0 h-screen w-[280px] md:w-64 bg-white shadow-2xl md:shadow-xl flex flex-col z-40 transition-transform duration-300 ease-in-out md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col items-center relative">
          <button 
            onClick={() => setIsSidebarOpen(false)} 
            className="md:hidden absolute top-4 left-4 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img src="/logo.png" alt="الاتحاد السعودي للجودو" className="h-24 md:h-32 object-contain mb-2 md:mb-3" />
          <span className="text-[0.65rem] md:text-sm text-gray-500 mt-1 uppercase tracking-widest">{userData?.role || 'لاعب'}</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = pathname === link.path;
            return (
              <Link 
                key={link.path} 
                href={link.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center px-4 py-2.5 md:py-4 rounded-xl transition-all duration-200 text-sm md:text-lg ${
                  isActive 
                  ? 'bg-green-600 text-white shadow-md font-bold' 
                  : 'text-gray-600 hover:bg-green-50 hover:text-green-700 font-semibold'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleSignOut}
            className="w-full flex justify-center items-center gap-2 px-4 py-2.5 md:py-4 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-colors duration-200 font-bold text-sm md:text-lg"
          >
            {/* Dojo Door Leave icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-10 overflow-x-hidden min-w-0 relative">
        {/* Idle Warning Modal */}
        {idleWarning && (
            <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
               <div className="bg-white rounded-2xl p-6 md:p-8 max-w-sm w-full text-center shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">⚠️</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">تنبيه خمول الجلسة</h3>
                  <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                     لقد كنت غير نشط لفترة من الزمن. من أجل حماية أمان حسابك، سيتم تسجيل خروجك تلقائياً بعد:
                  </p>
                  <div className="text-4xl font-extrabold text-red-600 mb-6 drop-shadow-sm border border-red-100 bg-red-50 p-4 rounded-xl" dir="ltr">
                     {idleCountdown} ثانية
                  </div>
                  <button 
                    onClick={handleStayLoggedIn} 
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg active:scale-[0.98]"
                  >
                     البقاء متصلاً
                  </button>
               </div>
            </div>
        )}

        {/* Japanese Calligraphy Watermark */}
        <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden opacity-[0.03]">
          <span className="text-[30vw] font-black text-gray-900 select-none transform -rotate-12">柔道</span>
        </div>

        {/* Top bar for mobile or contextual info */}
        <header className="mb-6 md:mb-10 flex flex-col md:flex-row justify-between md:items-center bg-white/90 backdrop-blur-sm p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 relative z-10 w-full gap-4">
           {/* Mobile Header Top Row */}
           <div className="flex items-center justify-between md:contents">
             <div className="flex items-center gap-4">
                 <button 
                   onClick={() => setIsSidebarOpen(true)} 
                   className="md:hidden p-2 text-gray-700 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors focus:outline-none"
                   aria-label="إظهار القائمة"
                 >
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                   </svg>
                 </button>
                 {/* Greeting and Quote */}
                 <div className="text-right">
                     <h2 className="text-sm md:text-xl font-bold text-gray-800 leading-tight">{getGreetingText()}</h2>
                     <p className="hidden md:block text-sm md:text-base text-gray-600 mt-2 italic font-medium">&quot;{randomQuote}&quot;</p>
                 </div>
             </div>
             
             {/* SAJ ID Box */}
             <div className="flex items-center">
                <Link href="/dashboard/profile" className="bg-green-50 px-3 md:px-4 py-2 md:py-2.5 rounded-lg border border-green-200 hover:bg-green-100 transition-colors cursor-pointer group flex items-center justify-center">
                  <div className="text-right">
                      <span className="text-[9px] md:text-xs text-green-600 block md:group-hover:text-green-700 transition-colors leading-tight">رقم العضوية (SAJ ID)</span>
                      <span className="font-bold text-xs md:text-base text-green-900 group-hover:text-green-950 transition-colors leading-tight">{userData?.saj_id || 'غير متوفر'}</span>
                  </div>
                </Link>
             </div>
           </div>
           {/* Mobile Quote Row */}
           <div className="md:hidden pt-3 mt-1 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-600 italic font-medium">&quot;{randomQuote}&quot;</p>
           </div>
        </header>

        {/* Ticket Notifications Alert */}
        <div className="relative z-10 w-full">
        {unreadTickets > 0 && showNotification && pathname !== '/dashboard/tickets' && (
           <div 
             className="mb-6 animate-in fade-in slide-in-from-top-4 bg-green-50 border-r-4 border-green-600 rounded-xl p-4 shadow-sm flex items-center justify-between cursor-pointer hover:bg-green-100 transition-colors"
             onClick={() => {
                setShowNotification(false);
                router.push('/dashboard/tickets');
             }}
           >
              <div className="flex items-center gap-4">
                 <div className="bg-white p-2 rounded-full shadow-sm text-2xl relative">
                    🔔
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border border-white"></span>
                    </span>
                 </div>
                 <div>
                    <h4 className="text-green-900 font-bold text-sm md:text-base">تنبيه بشأن التذاكر</h4>
                    <p className="text-green-800 text-xs md:text-sm mt-0.5 font-medium">لديك {unreadTickets} تذكرة تحتاج إلى إجراء أو مراجعة منك. اضغط هنا للانتقال إليها.</p>
                 </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowNotification(false); }} 
                className="text-green-600 hover:text-green-900 text-3xl leading-none font-medium px-2 py-1 rounded-lg hover:bg-green-200/50 transition-colors"
                title="إخفاء"
              >
                &times;
              </button>
           </div>
        )}
        </div>

        {/* Page Content */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-in-out relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
