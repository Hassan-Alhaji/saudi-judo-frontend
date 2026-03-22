"use client";
import { API_URL, HOST_URL } from '@/lib/api';
import JudoLoader from '@/components/JudoLoader';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [isTermsOpen, setIsTermsOpen] = useState(false);
    const [termsText, setTermsText] = useState("");
    
    // Form state
    const [formData, setFormData] = useState({
        role: '',
        first_name_ar: '',
        father_name_ar: '',
        last_name_ar: '',
        first_name_en: '',
        father_name_en: '',
        last_name_en: '',
        email: '',
        password: '',
        phone_number: '',
        birth_date: '',
        id_type: '',
        id_number: '',
        nationality: '',
        id_expiry_date: '',
        city: '',
        club_name: '',
        gender: '',
        weight: '',
        blood_type: '',
        current_belt_id: '',
    });

    const [files, setFiles] = useState({
        personal_photo: null as File | null,
        national_id_photo: null as File | null,
        previous_certificates: null as File | null,
    });

    const [dropdowns, setDropdowns] = useState({
        city: [],
        nationality: [],
        club: []
    });
    
    const [belts, setBelts] = useState<any[]>([]);

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                // Fetch dynamic dropdowns (cities, nationalities, clubs)
                const res = await fetch(`${API_URL}/dropdowns/`);
                if (res.ok) {
                    const data = await res.json();
                    setDropdowns(data);
                }
                
                // Fetch Settings
                const settingsRes = await fetch(`${API_URL}/settings/`);
                if (settingsRes.ok) {
                    const settingsData = await settingsRes.json();
                    setTermsText(settingsData.terms_and_conditions_ar || "");
                }
                
                // Fetch belts
                const beltsRes = await fetch(`${API_URL}/belts/`);
                if (beltsRes.ok) {
                    const beltsData = await beltsRes.json();
                    setBelts(beltsData);
                }
            } catch (err) {
                console.error("Failed to fetch dropdown options", err);
            }
        };
        fetchOptions();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
        if (e.target.files && e.target.files[0]) {
            setFiles({ ...files, [fieldName]: e.target.files[0] });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const submitData = new FormData();
        
        // Append text fields
        Object.keys(formData).forEach(key => {
            if (formData[key as keyof typeof formData]) {
                submitData.append(key, formData[key as keyof typeof formData]);
            }
        });
        
        // Ensure a placeholder password is sent to bypass backend requirements since we use OTP
        if (!submitData.has('password')) {
            submitData.append('password', Math.random().toString(36).slice(-8) + 'Aa1@');
        }
        
        // Append files
        if (files.personal_photo) submitData.append('personal_photo', files.personal_photo);
        if (files.national_id_photo) submitData.append('national_id_photo', files.national_id_photo);
        if (files.previous_certificates) submitData.append('previous_certificates', files.previous_certificates);

        try {
            const res = await fetch(`${API_URL}/auth/register/`, {
                method: 'POST',
                body: submitData, // Don't set Content-Type header when sending FormData!
            });
            
            const data = await res.json();
            
            if (res.ok) {
                alert("تم التسجيل بنجاح! يمكنك الآن تسجيل الدخول.");
                router.push('/');
            } else {
                alert(data.error || "حدث خطأ أثناء التسجيل. يرجى التأكد من البيانات.");
            }
        } catch (error) {
            console.error("Registration failed", error);
            alert("فشل الاتصال بالخادم.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
            {loading && <JudoLoader size="fullscreen" text="جاري إنشاء الحساب..." />}
            <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-xl border border-gray-100 animate-in fade-in duration-500">
                <div className="text-center mb-10">
                    <img src="/logo.png" alt="شعار الاتحاد" className="h-24 mx-auto mb-4 object-contain" />
                    <h2 className="text-3xl font-extrabold text-green-800">التسجيل في منصة الجودو</h2>
                    <p className="mt-2 text-gray-500">يرجى تعبئة جميع البيانات المطلوبة بدقة</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Section 1: Account Type */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">نوع الحساب <span className="text-red-500">*</span></h3>
                        <div className="grid grid-cols-2 gap-4">
                            <label className={`cursor-pointer p-4 border rounded-xl flex items-center gap-3 transition ${formData.role === 'player' ? 'border-green-600 bg-green-50 ring-1 ring-green-600' : 'border-gray-300 hover:bg-gray-100'}`}>
                                <input type="radio" name="role" value="player" onChange={handleChange} className="w-5 h-5 text-green-600" required />
                                <span className="font-bold text-gray-800">لاعب (Player)</span>
                            </label>
                            <label className={`cursor-pointer p-4 border rounded-xl flex items-center gap-3 transition ${formData.role === 'coach' ? 'border-green-600 bg-green-50 ring-1 ring-green-600' : 'border-gray-300 hover:bg-gray-100'}`}>
                                <input type="radio" name="role" value="coach" onChange={handleChange} className="w-5 h-5 text-green-600" required />
                                <span className="font-bold text-gray-800">مدرب (Coach)</span>
                            </label>
                        </div>
                    </div>

                    {/* Section 2: Account Details */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">بيانات الدخول <span className="text-red-500">*</span></h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">البريد الإلكتروني</label>
                                <input type="email" name="email" onChange={handleChange} required className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500" dir="ltr" />
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Personal Information */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">البيانات الشخصية <span className="text-red-500">*</span></h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">الاسم الأول (عربي)</label>
                                <input type="text" name="first_name_ar" onChange={handleChange} required className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500 target" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">اسم الأب (عربي)</label>
                                <input type="text" name="father_name_ar" onChange={handleChange} required className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">اسم العائلة (عربي)</label>
                                <input type="text" name="last_name_ar" onChange={handleChange} required className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">الاسم الأول (إنجليزي)</label>
                                <input type="text" name="first_name_en" onChange={handleChange} required className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500" dir="ltr" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">اسم الأب (إنجليزي)</label>
                                <input type="text" name="father_name_en" onChange={handleChange} required className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500" dir="ltr" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">اسم العائلة (إنجليزي)</label>
                                <input type="text" name="last_name_en" onChange={handleChange} required className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500" dir="ltr" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">تاريخ الميلاد</label>
                                <input type="date" name="birth_date" onChange={handleChange} required className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">الجنس</label>
                                <select name="gender" onChange={handleChange} required className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500 bg-white">
                                    <option value="">-- اختر --</option>
                                    <option value="M">ذكر (Male)</option>
                                    <option value="F">أنثى (Female)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">رقم الجوال</label>
                                <input type="tel" name="phone_number" onChange={handleChange} required className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500" dir="ltr" placeholder="05xxxxxxxx" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">الجنسية</label>
                                <select name="nationality" onChange={handleChange} required className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500 bg-white">
                                    <option value="">-- اختر الجنسية --</option>
                                    {dropdowns.nationality?.map((n: any) => (
                                        <option key={n.id} value={n.name_ar} className="text-gray-900">{n.name_ar} ({n.name_en})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Section 4: ID Information */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">بيانات الهوية <span className="text-red-500">*</span></h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">نوع الهوية</label>
                                <select name="id_type" onChange={handleChange} required className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500 bg-white">
                                    <option value="">-- اختر --</option>
                                    <option value="national_id">هوية وطنية</option>
                                    <option value="iqama">إقامة</option>
                                    <option value="passport">جواز سفر</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">رقم الهوية</label>
                                <input type="text" name="id_number" onChange={handleChange} required className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500" dir="ltr" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">تاريخ انتهاء الهوية</label>
                                <input type="date" name="id_expiry_date" onChange={handleChange} required className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                        </div>
                    </div>

                    {/* Section 5: Sports Information */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">البيانات الرياضية <span className="text-red-500">*</span></h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">النادي المعتمد</label>
                                <select name="club_name" onChange={handleChange} required className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500 bg-white">
                                    <option value="">-- اختر النادي --</option>
                                    {dropdowns.club?.map((c: any) => (
                                        <option key={c.id} value={c.name_ar} className="text-gray-900">{c.name_ar} ({c.name_en})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">المدينة</label>
                                <select name="city" onChange={handleChange} required className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500 bg-white">
                                    <option value="">-- اختر المدينة --</option>
                                    {dropdowns.city?.map((c: any) => (
                                        <option key={c.id} value={c.name_ar} className="text-gray-900">{c.name_ar} ({c.name_en})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">الوزن (كجم)</label>
                                <input type="number" step="0.1" name="weight" onChange={handleChange} required className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500" dir="ltr" placeholder="75.5" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">فصيلة الدم</label>
                                <select name="blood_type" onChange={handleChange} required className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500 bg-white" dir="ltr">
                                    <option value="">-- Select --</option>
                                    <option value="O+">O+</option>
                                    <option value="O-">O-</option>
                                    <option value="A+">A+</option>
                                    <option value="A-">A-</option>
                                    <option value="B+">B+</option>
                                    <option value="B-">B-</option>
                                    <option value="AB+">AB+</option>
                                    <option value="AB-">AB-</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    {/* Section 6: Optional Rank */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">التصنيف أو الحزام (اختياري)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">الحزام الحالي المعترف به</label>
                                <select name="current_belt_id" value={formData.current_belt_id} onChange={handleChange} className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500 bg-white">
                                    <option value="" className="text-gray-900">بدون حزام مسجل</option>
                                    {belts?.map((b: any) => (
                                        <option key={b.id} value={b.id} className="text-gray-900">{b.display_name}</option>
                                    ))}
                                </select>
                            </div>
                            {formData.current_belt_id && (
                                <div>
                                    <label className="block text-sm font-bold text-red-600 mb-2 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        إرفاق شهادات الأحزمة السابقة (ملف PDF واحد) <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        type="file" 
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => handleFileChange(e, 'previous_certificates')} 
                                        className="w-full border border-gray-300 rounded-xl p-2 bg-white" 
                                        required 
                                    />
                                    <p className="text-xs text-gray-500 mt-1">يلزم إرفاق جميع شهادات الأحزمة السابقة المذكورة للتوثيق</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section 7: Mandatory Attachments */}
                    <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                        <h3 className="text-lg font-bold text-green-800 mb-4 border-b border-green-200 pb-2">المرفقات الأساسية <span className="text-red-500">*</span></h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">صورة الهوية / الجواز</label>
                                <input 
                                    type="file" 
                                    accept="image/*,.pdf"
                                    onChange={(e) => handleFileChange(e, 'national_id_photo')} 
                                    className="w-full border border-gray-300 rounded-xl p-2 bg-white" 
                                    required 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">الصورة الشخصية (بخلفية بيضاء)</label>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={(e) => handleFileChange(e, 'personal_photo')} 
                                    className="w-full border border-gray-300 rounded-xl p-2 bg-white" 
                                    required 
                                />
                                <p className="text-xs text-gray-500 mt-1">ستُستخدم الصورة في البطاقة الرقمية وملف التعريف.</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start gap-4">
                        <input type="checkbox" id="terms" required className="w-6 h-6 mt-1 cursor-pointer accent-green-600 rounded border-gray-300" />
                        <label htmlFor="terms" className="text-sm md:text-base text-gray-700 leading-relaxed cursor-pointer select-none">
                            أتعهد وأقر بصحة جميع البيانات المدخلة والمرفقات، وأوافق على {' '}
                            <button 
                                type="button" 
                                onClick={(e) => { e.preventDefault(); setIsTermsOpen(true); }}
                                className="text-green-700 font-bold underline hover:text-green-800 mx-1"
                            >
                                سياسة التسجيل
                            </button>
                            التابعة للاتحاد السعودي للجودو. 
                            في حال ثبوت خطأ البيانات العمد أو المخالفة، يحق للاتحاد اتخاذ الإجراءات النظامية واعتبار التسجيل لاغياً.
                        </label>
                    </div>

                    {/* Terms Modal */}
                    {isTermsOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                            <div className="bg-white rounded-2xl p-6 md:p-8 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl relative" dir="rtl">
                                <h2 className="text-2xl font-bold border-b pb-4 mb-4 text-green-800 shrink-0">سياسة وشروط التسجيل</h2>
                                <div className="overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-gray-700 p-2 flex-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                                    {termsText || <JudoLoader size="sm" text="جاري تحميل الشروط..." />}
                                </div>
                                <div className="mt-6 border-t pt-5 flex justify-end shrink-0">
                                    <button 
                                        type="button"
                                        onClick={() => setIsTermsOpen(false)}
                                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg shadow-sm transition-colors"
                                    >
                                        إغلاق
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-4 rounded-xl shadow-lg transition disabled:opacity-50 text-lg flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    جاري إنشاء الحساب...
                                </>
                            ) : "تأكيد والتسجيل"}
                        </button>
                        <Link href="/" className="px-8 py-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition text-center flex items-center justify-center">
                            إلغاء والعودة
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
