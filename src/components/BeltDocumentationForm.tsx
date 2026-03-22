"use client";
import { API_URL, HOST_URL } from '@/lib/api';
import JudoLoader from '@/components/JudoLoader';

import { useEffect, useState } from "react";

export default function BeltDocumentationForm({ user, sajId }: { user: any, sajId: string }) {
  const [belts, setBelts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBelt, setSelectedBelt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);

  useEffect(() => {
    // Fetch belts from Django API
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!selectedBelt) {
      setMessage({ text: "الرجاء اختيار الحزام المراد توثيقه.", type: "error" });
      return;
    }

    if (!file) {
      setMessage({ text: "الرجاء إرفاق المستندات المطلوبة (شهادة الحزام السابقة أو إثبات).", type: "error" });
      return;
    }

    try {
      // Setup form data for file upload
      const formData = new FormData();
      formData.append('requested_belt', selectedBelt);
      formData.append('ticket_type', 'documentation');
      formData.append('player_attachment', file);
      
      // In a real application, send the FormData to the Django API:
      // fetch(`${API_URL}/tickets/create/`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${token}` 
      //   },
      //   body: formData
      // })

      setMessage({ text: "عذراً النماذج قيد التطوير للربط مع قاعدة البيانات..", type: "success" });
    } catch (error: any) {
        console.error(error);
        setMessage({ text: error.message || "حدث خطأ غير متوقع", type: "error" });
    }
  };

  if (loading) return <JudoLoader size="md" text="جاري تحميل الأحزمة..." className="py-10" />;

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold mb-2 text-gray-800">خدمة توثيق واعتماد حزام سابق</h2>
      <p className="text-gray-500 mb-6 text-sm border-b border-gray-100 pb-4 leading-relaxed">
        استخدم هذه الخدمة لرفع شهادات الأحزمة السابقة أو إثباتاتك لليتم مراجعتها من قبل خدمة العملاء لاعتماد الحزام في سجلك دون الحاجة لإعادة الاختبار.
      </p>
      
      {message && (
        <div className={`p-3 rounded mb-4 ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-2 font-medium">الحزام المراد توثيقه</label>
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

        <div>
          <label className="block text-gray-700 mb-2 font-medium">المستندات الداعمة (صورة الشهادة أو ملف PDF)</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl bg-gray-50 hover:bg-white transition-colors">
            <div className="space-y-1 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-gray-600 justify-center">
                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500 px-2">
                  <span>اختر ملفاً</span>
                  <input 
                    id="file-upload" 
                    name="file-upload" 
                    type="file" 
                    className="sr-only" 
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                  />
                </label>
                <p className="pl-1">أو اسحب وأفلت هنا</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, PDF حتى 10MB</p>
              {file && (
                <div className="mt-4 p-2 bg-green-50 text-green-800 rounded-lg border border-green-200 text-sm font-semibold truncate animate-in fade-in">
                  ✓ {file.name}
                </div>
              )}
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-4 px-4 rounded-xl transition-all duration-300 shadow-md transform hover:-translate-y-0.5 mt-4"
        >
          رفع طلب التوثيق
        </button>
      </form>
    </div>
  );
}
