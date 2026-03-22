"use client";

import { useEffect, useState } from "react";
import { apiGet } from "../../../lib/api";
import JudoLoader from "../../../components/JudoLoader";

type Certificate = {
  id: string;
  certificate_number: string;
  issue_date: string;
  belt_name: string;
  belt_color: string;
  player_name_ar: string;
  player_name_en: string;
  pdf_file: string | null;
  video_link: string | null;
};

export default function AchievementsPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        const response = await apiGet("certificates/my/");
        if (!response.ok) {
          throw new Error("حدث خطأ أثناء جلب الشهادات");
        }
        const data = await response.json();
        setCertificates(data);
      } catch (err: any) {
        setError(err.message || "فشل الاتصال بالخادم");
      } finally {
        setLoading(false);
      }
    };
    fetchCertificates();
  }, []);

  const getBeltBgColor = (colorName: string) => {
    const map: Record<string, string> = {
      yellow: "bg-yellow-400 text-yellow-900",
      orange: "bg-orange-500 text-orange-950",
      green: "bg-green-600 text-white",
      blue: "bg-blue-600 text-white",
      brown: "bg-amber-800 text-white",
      white: "bg-white text-gray-800 border-gray-200",
    };
    if (colorName.startsWith("black")) return "bg-black text-white";
    return map[colorName] || "bg-gray-100 text-gray-800";
  };

  const getBeltBorderColor = (colorName: string) => {
    const map: Record<string, string> = {
      yellow: "border-yellow-500",
      orange: "border-orange-600",
      green: "border-green-700",
      blue: "border-blue-700",
      brown: "border-amber-900",
      white: "border-gray-300",
    };
    if (colorName.startsWith("black")) return "border-gray-800";
    return map[colorName] || "border-gray-200";
  };

  if (loading) {
    return <JudoLoader size="md" text="جاري تحميل إنجازاتك..." className="my-20" />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl text-center">
        <svg className="w-12 h-12 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <p className="font-bold text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-l from-green-700 to-green-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-extrabold mb-2 text-shadow-sm">إنجازاتي وشهاداتي</h2>
            <p className="text-green-100 font-medium text-sm md:text-base max-w-xl leading-relaxed">
              هنا تجد جميع شهادات اجتياز الأحزمة المعتمدة الخاصة بك من الاتحاد السعودي للجودو.
              يمكنك استعراضها وتحميلها بصيغة PDF وتوثيق مسيرتك الرياضية.
            </p>
          </div>
          <div className="shrink-0 bg-white/20 p-4 rounded-2xl backdrop-blur-sm border border-white/30 hidden md:block">
            <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path></svg>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6 relative overflow-hidden hidden sm:block">
        <h3 className="text-lg font-bold text-gray-800 mb-6 text-center">مسار أحزمة الجودو وتدرج الإنجازات</h3>
        
        <div className="flex items-center justify-between w-full max-w-4xl mx-auto relative px-4">
           {/* Background line */}
           <div className="absolute top-1/2 right-10 left-10 h-1 bg-gray-200 -translate-y-1/2 z-0 rounded-full"></div>

           {[
             {c: 'white', label: 'أبيض'}, 
             {c: 'yellow', label: 'أصفر'}, 
             {c: 'orange', label: 'برتقالي'}, 
             {c: 'green', label: 'أخضر'}, 
             {c: 'blue', label: 'أزرق'}, 
             {c: 'brown', label: 'بني'}, 
             {c: 'black_1', label: 'أسود'}
           ].map((belt) => {
             const achieved = certificates.some(cert => cert.belt_color === belt.c || (belt.c === 'black_1' && cert.belt_color?.startsWith('black')));
             return (
               <div key={belt.c} className="flex flex-col items-center relative z-10 w-16 group">
                 <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 ${achieved ? getBeltBorderColor(belt.c) + ' ' + getBeltBgColor(belt.c) : 'bg-gray-100 border-gray-200 text-transparent'}`}>
                     {achieved ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                     ) : (
                        <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                     )}
                 </div>
                 <span className={`text-xs md:text-sm font-bold mt-2 ${achieved ? 'text-gray-800' : 'text-gray-400'}`}>{belt.label}</span>
               </div>
             )
           })}
        </div>
      </div>

      {certificates.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100 flex flex-col items-center">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">لا توجد شهادات معتمدة بعد</h3>
          <p className="text-gray-500 max-w-sm">يبدو أنه لم يتم إصدار أي شهادات اجتياز أحزمة لك حتى الآن. استمر في التدريب لتحقيق المزيد من الإنجازات!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {certificates.map((cert) => (
            <div key={cert.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col">
              
              <div className={`p-8 border-b-4 flex flex-col items-center text-center relative ${getBeltBgColor(cert.belt_color)} ${getBeltBorderColor(cert.belt_color)}`}>
                {/* Visual Belt lines pattern overlay for aesthetics */}
                <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAiLz4KPHBhdGggZD0iTTAgMEg0djRIMHoiIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4yNSIvPgo8L3N2Zz4=')]"></div>
                
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg mb-4 shrink-0 p-1 relative z-10">
                   <img src="/logo.png" alt="Saudi Judo Federation" className="w-full h-full object-contain" />
                </div>
                
                <div className="relative z-10 w-full space-y-1 mb-4">
                  <h4 className="text-xl font-black tracking-wide">الاتحاد السعودي للجودو</h4>
                  <h5 className="text-sm font-bold tracking-widest font-sans uppercase">Saudi Judo Federation</h5>
                </div>
                
                <div className="relative z-10 bg-black/20 px-6 py-2 rounded-xl mb-4 backdrop-blur-sm border border-black/10">
                  <p className="text-xs font-medium uppercase tracking-wider opacity-80 mb-0.5">Belt Promotion Certificate</p>
                  <p className="text-sm font-bold opacity-90">شهادة اجتياز ترقية حزام</p>
                </div>

                <div className="relative z-10 mt-1 mb-6">
                  <p className="text-2xl font-black mb-1">{cert.player_name_ar}</p>
                  {cert.player_name_en && (
                    <p className="text-sm font-bold font-sans tracking-wider uppercase opacity-90">{cert.player_name_en}</p>
                  )}
                </div>

                <div className="relative z-10 mt-2 bg-white/20 px-5 py-2 rounded-xl backdrop-blur-sm shadow-sm border border-white/20 w-[90%] mx-auto">
                    <p className="text-[11px] uppercase tracking-wider opacity-90 font-sans mb-1 font-bold">Awarded Belt</p>
                    <h3 className="text-2xl font-black">{cert.belt_name}</h3>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/30"></div>
              </div>
              
              <div className="p-6 flex-1 flex flex-col justify-between space-y-5 bg-gradient-to-b from-white to-gray-50">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-semibold">تاريخ الإصدار</span>
                    <span className="text-gray-900 font-bold bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">{cert.issue_date}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-semibold">حالة الشهادة</span>
                    <span className="text-green-700 font-bold flex items-center gap-1.5 bg-green-50 px-3 py-1 rounded-lg border border-green-100">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      معتمدة
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 mt-auto flex flex-col gap-2">
                  {cert.pdf_file ? (
                    <a href={cert.pdf_file} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white hover:bg-black py-3 rounded-xl font-bold transition-colors shadow-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                      تحميل الشهادة (PDF)
                    </a>
                  ) : (
                    <button disabled className="w-full bg-gray-100 text-gray-400 py-3 rounded-xl font-bold cursor-not-allowed">
                      الشهادة غير متوفرة بعد
                    </button>
                  )}
                  
                  {cert.video_link && (
                    <a href={cert.video_link} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-700 hover:bg-red-100 py-3 rounded-xl font-bold transition-colors border border-red-200">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zm3.886 10.375l-5.625 3.375A.501.501 0 017.5 13.375v-6.75a.5.5 0 01.761-.425l5.625 3.375a.5.5 0 010 .85z"/></svg>
                      مشاهدة فيديو الاختبار
                    </a>
                  )}

                  <a href={`/verify/cert/${cert.id}`} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 bg-white text-gray-700 hover:bg-gray-50 py-3 rounded-xl font-bold transition-colors border border-gray-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    صفحة التحقق
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
