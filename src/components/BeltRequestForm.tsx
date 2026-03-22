"use client";
import { API_URL, HOST_URL } from '@/lib/api';
import JudoLoader from '@/components/JudoLoader';

import { useEffect, useState } from "react";

export default function BeltRequestForm({ user, sajId }: { user: any, sajId: string }) {
  const [belts, setBelts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBelt, setSelectedBelt] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);

  useEffect(() => {
    // Fetch belts from Django API
    // Ensure you have CORS configured in Django if frontend is on a different port
    fetch(`${API_URL}/belts/`)
      .then((res) => res.json())
      .then((data) => {
        setBelts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setMessage({ text: "فشل تحميل قائمة الأحزمة من الخادم.", type: "error" });
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!selectedBelt) {
      setMessage({ text: "الرجاء اختيار الحزام المطلوب.", type: "error" });
      return;
    }

    try {
      setMessage({ text: "عذراً النماذج قيد التطوير للربط مع قاعدة البيانات..", type: "error" });
    } catch (error: any) {
        console.error(error);
        setMessage({ text: error.message || "حدث خطأ غير متوقع", type: "error" });
    }
  };

  if (loading) return <JudoLoader size="md" text="جاري تحميل الأحزمة..." className="py-10" />;

  const currentSelectedBeltObj = belts.find(b => b.id.toString() === selectedBelt);

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold mb-6 text-gray-800 border-b border-gray-100 pb-4">الإعداد لطلب ترقية حزام</h2>
      
      {message && (
        <div className={`p-3 rounded mb-4 ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-2 font-medium">اختر الحزام الذي ترغب باختباره</label>
          <select 
            value={selectedBelt} 
            onChange={(e) => setSelectedBelt(e.target.value)}
            className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
          >
            <option value="">-- اختر الحزام --</option>
            {belts.map(belt => (
              <option key={belt.id} value={belt.id}>
                {belt.name}
              </option>
            ))}
          </select>
        </div>

        {currentSelectedBeltObj && (
          <div className="bg-green-50 p-5 rounded-xl border border-green-100 text-green-900 shadow-sm animate-in fade-in duration-300">
            <h3 className="font-bold mb-3 flex items-center">
              <span className="bg-green-200 text-green-800 p-1 rounded-md ml-2 text-xs">معلومات</span>
              تفاصيل ورسوم الترقية:
            </h3>
            <ul className="space-y-2 text-sm">
               <li className="flex justify-between border-b border-green-200/50 pb-2">
                 <span className="font-semibold">رسوم إصدار التذكرة واختبار الحزام:</span> 
                 <span className="font-black">{currentSelectedBeltObj.price} ريال سعودي</span>
               </li>
               <li className="flex justify-between pt-1">
                 <span className="font-semibold">المدة الزمنية الإلزامية المطلوبة للترقية:</span> 
                 <span className="font-black">{currentSelectedBeltObj.required_months} أشهر</span>
               </li>
            </ul>
          </div>
        )}

        <button 
          type="submit" 
          className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-4 px-4 rounded-xl transition-all duration-300 shadow-md transform hover:-translate-y-0.5 mt-4"
        >
          تقديم الطلب
        </button>
      </form>
    </div>
  );
}
