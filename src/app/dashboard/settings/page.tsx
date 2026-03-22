"use client";

import { useState, useEffect } from "react";
import { apiGet, apiPost, apiDelete, apiPut, apiRequest } from "../../../lib/api";
import JudoLoader from "../../../components/JudoLoader";

type DropdownItem = { id: number; name_ar: string; name_en: string };
type DropdownData = { city: DropdownItem[]; nationality: DropdownItem[]; club: DropdownItem[]; region: DropdownItem[] };
export default function AdminSettingsPage() {
  const [data, setData] = useState<DropdownData>({ city: [], nationality: [], club: [], region: [] });
  const [belts, setBelts] = useState<any[]>([]); // New state for belts
  const [systemSettings, setSystemSettings] = useState({ is_maintenance_mode: false, maintenance_message_ar: '', maintenance_message_en: '', terms_and_conditions_ar: '' });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'city' | 'nationality' | 'club' | 'belts' | 'maintenance' | 'terms' | 'region'>('city');
  const [isAdding, setIsAdding] = useState(false);
  const [newItemAR, setNewItemAR] = useState("");
  const [newItemEN, setNewItemEN] = useState("");

  const tabNames = {
      'city': 'المدن',
      'nationality': 'الجنسيات',
      'club': 'الأندية',
      'region': 'المناطق',
      'belts': 'أسعار الأحزمة',
      'terms': 'شروط التسجيل',
      'maintenance': 'وضع الصيانة'
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiGet("dropdowns/");
      const beltsRes = await apiGet("belts/");
      const settingsRes = await apiGet("settings/");
      
      if (res.ok && beltsRes.ok && settingsRes.ok) {
        const json = await res.json();
        const beltsJson = await beltsRes.json();
        const settingsJson = await settingsRes.json();
        setData(json);
        setBelts(beltsJson);
        setSystemSettings(settingsJson);
      } else {
        setErrorMsg("فشل جلب البيانات.");
      }
    } catch (err: any) {
      setErrorMsg("حدث خطأ في الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemAR || !newItemEN) return;
    try {
      let res;
      if (activeTab === 'belts') {
          res = await apiPost("belts/", {
              name: newItemAR, // using AR as name (internal id for now)
              display_name: newItemAR,
              price: parseFloat(newItemEN) || 0,
              required_months: 0, // default
              order: belts.length + 1
          });
      } else {
          res = await apiPost("dropdowns/", {
              category: activeTab,
              name_ar: newItemAR,
              name_en: newItemEN
          });
      }
      if (res.ok) {
          setIsAdding(false);
          setNewItemAR("");

          setNewItemEN("");
          fetchData(); // refresh list
      } else {
          const json = await res.json();
          alert(json.error || "فشل الاضافة");
      }
    } catch (err) {
      alert("حدث خطأ في الاتصال");
    }
  };

  const handleDeleteItem = async (id: number) => {
      if (!confirm("هل أنت متأكد من حذف هذا العنصر؟")) return;
      try {
          const res = await apiDelete(`dropdowns/${id}/`);
          if (res.ok) {
              fetchData();
          } else {
              const json = await res.json();
              alert(json.error || "فشل الحذف");
          }
      } catch (err) {
          alert("خطأ في الاتصال");
      }
  };

  const handleUpdateBeltPrice = async (id: number, currentPrice: string) => {
    const newPriceStr = prompt(`أدخل السعر الجديد للحزام:`, currentPrice);
    if (newPriceStr === null) return;
    
    const newPrice = parseFloat(newPriceStr);
    if (isNaN(newPrice) || newPrice < 0) {
      alert("الرجاء إدخال مبلغ صحيح");
      return;
    }
    
    try {
      const res = await apiRequest(`belts/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ price: newPrice })
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "فشل التحديث");
      }
    } catch (e) {
      console.error(e);
      alert("حدث خطأ");
    }
  };

  const handleDeleteBelt = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا الحزام؟")) return;
    try {
      const res = await apiRequest(`belts/${id}/delete/`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "فشل الحذف");
      }
    } catch (e) {
      alert("حدث خطأ في الاتصال");
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiPut("settings/", systemSettings);
      if (res.ok) {
        alert("تم حفظ إعدادات النظام.");
        fetchData();
      } else {
        alert("فشل الحفظ.");
      }
    } catch (e) {
      alert("حدث خطأ");
    }
  };

  if (loading) return <JudoLoader size="fullscreen" text="جاري تحميل الإعدادات..." />;

  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-6" dir="rtl">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">إعدادات النظام العامة</h2>
        <p className="text-gray-500 text-sm mt-1">يمكنك إدارة القوائم المنسدلة المستخدمة في صفحات التسجيل وتحديث البيانات للتحكم بالقيم المتاحة للمستخدمين.</p>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl font-bold text-sm border border-red-100">
          {errorMsg}
        </div>
      )}

      {/* TABS */}
      <div className="flex border-b border-gray-200 gap-6 overflow-x-auto whitespace-nowrap">
          {(['city', 'nationality', 'club', 'region', 'belts', 'terms', 'maintenance'] as const).map(tab => (
              <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 font-bold text-sm md:text-base border-b-2 transition-colors shrink-0 ${activeTab === tab ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                  {tabNames[tab]}
              </button>
          ))}
      </div>

      {/* TAB CONTENT */}
      <div className="space-y-4">
          <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
              <h3 className="font-bold text-gray-800">إدارة {tabNames[activeTab]}</h3>
              {activeTab !== 'maintenance' && activeTab !== 'terms' && (
                  <button 
                      onClick={() => setIsAdding(!isAdding)}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors shadow-sm"
                  >
                      + إضافة جديد
                  </button>
              )}
          </div>

          {isAdding && (
              <form onSubmit={handleAddItem} className="bg-white border border-green-100 p-4 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 items-end">
                  <div className="w-full md:w-1/3">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                          {activeTab === 'belts' ? 'اسم الحزام' : 'الاسم (بالعربي)'}
                      </label>
                      <input 
                          type="text" 
                          required 
                          placeholder={activeTab === 'belts' ? 'مثال: أسود (Dan 1)' : 'مثال: الرياض'}
                          value={newItemAR} 
                          onChange={(e) => setNewItemAR(e.target.value)} 
                          className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                      />
                  </div>
                  <div className="w-full md:w-1/3">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                          {activeTab === 'belts' ? 'سعر الحزام بالريال' : 'الاسم (بالإنجليزي)'}
                      </label>
                      <input 
                          type={activeTab === 'belts' ? 'number' : 'text'}
                          required 
                          placeholder={activeTab === 'belts' ? 'مثال: 150' : 'Example: Riyadh'}
                          value={newItemEN} 
                          onChange={(e) => setNewItemEN(e.target.value)} 
                          className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                          dir="ltr"
                      />
                  </div>
                  <div className="w-full md:w-auto flex gap-2">
                      <button type="submit" className="flex-1 md:flex-none bg-green-600 text-white font-bold py-2.5 px-6 rounded-lg text-sm hover:bg-green-700 transition">حفظ</button>
                      <button type="button" onClick={() => setIsAdding(false)} className="flex-1 md:flex-none bg-gray-100 text-gray-700 font-bold py-2.5 px-4 rounded-lg text-sm hover:bg-gray-200 transition">إلغاء</button>
                  </div>
              </form>
          )}

          {activeTab === 'terms' ? (
              <form onSubmit={handleUpdateSettings} className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm space-y-6">
                 <div>
                    <h3 className="font-bold text-gray-800 text-lg mb-2">سياسة وشروط التسجيل للاتحاد السعودي للجودو</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        سيتم عرض هذا النص لجميع المستخدمين (لاعبين، مدربين) قبل إتمام عملية التسجيل، ويجب عليهم الموافقة عليه أولاً.
                    </p>
                    <textarea
                        value={systemSettings.terms_and_conditions_ar || ''}
                        onChange={(e) => setSystemSettings({...systemSettings, terms_and_conditions_ar: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg p-4 text-sm focus:ring-2 focus:ring-green-500 outline-none h-[400px] resize-y"
                        placeholder="أدخل نص الشروط والأحكام هنا..."
                    />
                 </div>
                 <div className="flex justify-end pt-4 border-t border-gray-100">
                     <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-sm">
                         حفظ سياسة التسجيل
                     </button>
                 </div>
              </form>
          ) : activeTab === 'maintenance' ? (
              <form onSubmit={handleUpdateSettings} className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm space-y-6">
                 <div>
                    <label className="flex items-center space-x-3 space-x-reverse cursor-pointer">
                        <input
                            type="checkbox"
                            checked={systemSettings.is_maintenance_mode}
                            onChange={(e) => setSystemSettings({...systemSettings, is_maintenance_mode: e.target.checked})}
                            className="form-checkbox h-6 w-6 text-green-600 rounded focus:ring-green-500 border-gray-300"
                        />
                        <span className="font-bold text-gray-800 text-lg">تفعيل وضع الصيانة 🚨</span>
                    </label>
                    <p className="text-sm text-gray-500 mt-2 pr-9">
                        عند تفعيل وضع الصيانة، لن يتمكن أي شخص من الدخول إلى المنصة (سيظهر له رسالة الصيانة) باستثناء مدراء النظام فقط.
                    </p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">رسالة الصيانة (عربي) التي ستظهر للمستخدم</label>
                        <textarea
                           value={systemSettings.maintenance_message_ar}
                           onChange={(e) => setSystemSettings({...systemSettings, maintenance_message_ar: e.target.value})}
                           className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-green-500 outline-none h-32 resize-none"
                           placeholder="مثال: نعتذر لكم الموقع تحت الصيانة يرجى مراجعتنا وقت لاحق"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">رسالة الصيانة (إنجليزي)</label>
                        <textarea
                           value={systemSettings.maintenance_message_en}
                           onChange={(e) => setSystemSettings({...systemSettings, maintenance_message_en: e.target.value})}
                           className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-green-500 outline-none h-32 resize-none text-left"
                           dir="ltr"
                           placeholder="Example: The site is under maintenance. Please try again later."
                        />
                    </div>
                 </div>

                 <div className="flex justify-end pt-4">
                     <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-sm">
                         حفظ الإعدادات
                     </button>
                 </div>
              </form>
          ) : activeTab !== 'belts' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {data[activeTab as 'city' | 'nationality' | 'club' | 'region']?.length === 0 ? (
                    <p className="col-span-full text-center text-gray-500 text-sm py-8">لا يوجد أي عناصر في هذه القائمة بعد.</p>
                ) : (
                    data[activeTab as 'city' | 'nationality' | 'club' | 'region']?.map(item => (
                        <div key={item.id} className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex justify-between items-center hover:border-green-200 transition-colors">
                            <div className="flex flex-col">
                                <span className="font-bold text-gray-800 text-sm">{item.name_ar}</span>
                                <span className="text-gray-500 text-xs font-medium" dir="ltr">{item.name_en}</span>
                            </div>
                            <button 
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                title="حذف"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    ))
                )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {belts.map(belt => (
                    <div key={belt.id} className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex justify-between items-center hover:border-green-200 transition-colors">
                        <div className="flex flex-col">
                            <span className="font-bold text-gray-800 text-sm">{belt.display_name || belt.name}</span>
                            <span className="text-green-600 font-bold text-lg mt-1">{belt.price} ريال</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => handleUpdateBeltPrice(belt.id, belt.price)}
                                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors border border-blue-100"
                            >
                                تحديث السعر
                            </button>
                            <button 
                                onClick={() => handleDeleteBelt(belt.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors border border-red-100"
                                title="حذف الحزام"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
          )}
          
      </div>

    </div>
  );
}
