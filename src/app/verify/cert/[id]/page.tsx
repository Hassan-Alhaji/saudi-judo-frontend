"use client";
import { API_URL, HOST_URL } from '@/lib/api';
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import JudoLoader from "@/components/JudoLoader";

interface CertData {
  id: string;
  certificate_number: string;
  issue_date: string;
  player_name: string;
  player_saj_id: string;
  belt_name: string;
  is_active: boolean;
  player_photo?: string | null;
  coach_name?: string;
  video_link?: string | null;
}

export default function CertVerificationPage() {
  const params = useParams();
  const id = params.id as string;

  const [cert, setCert] = useState<CertData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/certificates/${id}/verify/`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "فشل التحقق من الشهادة");
        return data;
      })
      .then((data) => {
        setCert(data.certificate);
        setLoading(false);
      })
      .catch((err) => {
        setErrorMsg(err.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <JudoLoader size="fullscreen" text="جاري توثيق الشهادة..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 font-cairo" dir="rtl">
      
      {/* Header */}
      <div className="mb-8 text-center flex flex-col items-center">
        <img src="/logo.png" alt="Saudi Judo Federation" className="h-24 md:h-32 object-contain mb-4 drop-shadow-md" />
        <h1 className="text-2xl font-black text-gray-800">بوابة توثيق الشهادات</h1>
      </div>

      {errorMsg ? (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 max-w-sm w-full text-center shadow-lg">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
            ❌
          </div>
          <h2 className="text-xl font-bold text-red-800 mb-2">فشل التوثيق</h2>
          <p className="text-red-600 text-sm font-semibold leading-relaxed">{errorMsg}</p>
          <Link href="/" className="mt-6 inline-block bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition">
            العودة للرئيسية
          </Link>
        </div>
      ) : cert ? (
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-2 border-yellow-500 relative overflow-hidden">
          
          <div className="absolute top-4 right-4 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-yellow-300">
            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
            شهادة موثقة
          </div>

          <div className="text-center mt-6">
            <div className="w-24 h-24 mx-auto rounded-full bg-yellow-50 border-4 border-yellow-400 shadow-inner flex items-center justify-center text-4xl mb-4">
               📜
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-1">شهادة اجتياز</h2>
            <p className="text-gray-500 font-mono tracking-wider font-bold text-sm">{cert.certificate_number}</p>
          </div>

          <div className="mt-8 space-y-4">
            
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-4">
               {cert.player_photo ? (
                 <img src={cert.player_photo} alt={cert.player_name} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md shrink-0" />
               ) : (
                 <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xl border-2 border-white shadow-md shrink-0">
                    {cert.player_name.charAt(0)}
                 </div>
               )}
               <div className="flex-1">
                 <span className="block text-gray-500 text-xs font-bold mb-1">اللاعب / اللاعبة</span>
                 <span className="block text-gray-900 text-lg font-black">{cert.player_name}</span>
                 <span className="block text-gray-500 text-xs font-mono mt-1">{cert.player_saj_id}</span>
               </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
              <span className="text-gray-600 text-sm font-bold">الحزام المجتاز</span>
              <span className="px-4 py-1.5 bg-green-100 text-green-800 rounded-lg text-sm font-bold shadow-sm border border-green-200">
                {cert.belt_name}
              </span>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
              <span className="text-gray-600 text-sm font-bold">المدرب المشرف</span>
              <span className="text-gray-800 text-sm font-bold">
                {cert.coach_name || 'غير محدد'}
              </span>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
              <span className="text-gray-600 text-sm font-bold">تاريخ الإصدار</span>
              <span className="text-gray-800 text-sm font-bold">
                {cert.issue_date}
              </span>
            </div>

            {cert.video_link && (
              <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-center justify-between">
                <span className="text-red-800 text-sm font-bold">أداء الاختبار المرئي</span>
                <a href={cert.video_link} target="_blank" rel="noopener noreferrer" className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zm3.886 10.375l-5.625 3.375A.501.501 0 017.5 13.375v-6.75a.5.5 0 01.761-.425l5.625 3.375a.5.5 0 010 .85z"/></svg>
                  مشاهدة
                </a>
              </div>
            )}

          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
             <div className="inline-flex items-center justify-center w-12 h-12 bg-green-50 text-green-600 rounded-full mb-3">
                 🛡️
             </div>
             <p className="text-xs text-gray-500 leading-relaxed max-w-[250px] mx-auto">
               هذه الشهادة رسمية وموثقة في سجلات الاتحاد السعودي للجودو. أي كشط أو تعديل يلغي صحتها.
             </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
