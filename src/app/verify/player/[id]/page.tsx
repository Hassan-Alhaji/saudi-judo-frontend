"use client";
import { API_URL, HOST_URL } from '@/lib/api';
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import JudoLoader from "@/components/JudoLoader";

interface PlayerData {
  saj_id: string;
  name: string;
  club: string;
  region: string;
  belt: string;
  belt_color: string;
  is_active: boolean;
  last_promotion_date: string;
  personal_photo_url?: string;
  blood_type?: string;
  nationality?: string;
  gender?: string;
}

const beltColors: Record<string, string> = {
  yellow: "bg-yellow-400 text-black",
  orange: "bg-orange-500 text-white",
  green: "bg-green-600 text-white",
  blue: "bg-blue-600 text-white",
  brown: "bg-yellow-800 text-white",
  black_1: "bg-black text-white",
  black_2: "bg-black text-white",
  black_3: "bg-black text-white",
  black_4: "bg-black text-white",
  black_5: "bg-black text-white",
  black_6: "bg-black text-white",
  white: "bg-gray-100 text-black border border-gray-300",
};

export default function PlayerVerificationPage() {
  const params = useParams();
  const id = params.id as string;

  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch(`http://localhost:8000/api/users/${id}/verify/`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "فشل التحقق");
        return data;
      })
      .then((data) => {
        setPlayer(data.player);
        setLoading(false);
      })
      .catch((err) => {
        setErrorMsg(err.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <JudoLoader size="fullscreen" text="جاري التوثيق الآمن..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 font-cairo" dir="rtl">
      
      {/* Header */}
      <div className="mb-8 text-center flex flex-col items-center">
        <img src="/logo.png" alt="Saudi Judo Federation" className="h-24 md:h-32 object-contain mb-4 drop-shadow-md" />
        <h1 className="text-2xl font-black text-gray-800">بوابة التوثيق الرسمية</h1>
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
      ) : player ? (
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-100 relative overflow-hidden">
          
          {/* Active Badge */}
          <div className="absolute top-4 right-4 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-green-200">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            عضو نشط وموثق
          </div>

          <div className="text-center mt-6">
            <div className={`w-36 h-36 mx-auto rounded-xl border-4 shadow-lg mb-4 flex items-center justify-center text-5xl bg-gray-50 overflow-hidden ${beltColors[player.belt_color]?.split(' ')[0] || 'border-gray-200'}`}>
               {player.personal_photo_url ? (
                  <img src={player.personal_photo_url.startsWith('http') ? player.personal_photo_url : `${HOST_URL}${player.personal_photo_url}`} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                  "👤"
               )}
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-1">{player.name}</h2>
            <p className="text-gray-500 font-mono tracking-wider font-bold">{player.saj_id}</p>
          </div>

          <div className="mt-8 space-y-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
              <span className="text-gray-500 text-sm font-bold">الحزام الحالي</span>
              <span className={`px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm ${beltColors[player.belt_color] || beltColors.white}`}>
                {player.belt}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
               <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                  <span className="block text-gray-400 text-[10px] font-bold mb-1 uppercase tracking-wider">CLUB / النادي</span>
                  <span className="block text-gray-800 text-sm font-bold truncate">{player.club}</span>
               </div>
               <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                  <span className="block text-gray-400 text-[10px] font-bold mb-1 uppercase tracking-wider">DATE / تاريخ الترقية</span>
                  <span className="block text-gray-800 text-sm font-bold">{player.last_promotion_date}</span>
               </div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-4">
               <div className="bg-gray-50 p-2 rounded-xl border border-gray-100 text-center">
                  <span className="block text-gray-400 text-[9px] uppercase font-bold mb-1">Blood / فصيلة</span>
                  <span className="block text-red-600 text-xs font-bold">{player.blood_type || '---'}</span>
               </div>
               <div className="bg-gray-50 p-2 rounded-xl border border-gray-100 text-center">
                  <span className="block text-gray-400 text-[9px] uppercase font-bold mb-1">Nat / الجنسية</span>
                  <span className="block text-gray-800 text-xs font-bold truncate">{player.nationality || '---'}</span>
               </div>
               <div className="bg-gray-50 p-2 rounded-xl border border-gray-100 text-center">
                  <span className="block text-gray-400 text-[9px] uppercase font-bold mb-1">Gender / الجنس</span>
                  <span className="block text-gray-800 text-xs font-bold">{player.gender === 'M' ? 'ذكر - M' : (player.gender === 'F' ? 'أنثى - F' : '---')}</span>
               </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
             <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 text-blue-600 rounded-full mb-3">
                 🛡️
             </div>
             <p className="text-xs text-gray-500 leading-relaxed max-w-[250px] mx-auto">
               تم التحقق من صحة هذه البيانات من خلال قواعد البيانات الرسمية للاتحاد السعودي للجودو.
             </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
