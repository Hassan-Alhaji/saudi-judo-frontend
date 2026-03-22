"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost, getDjangoUser, API_URL } from "../../../lib/api";
import JudoLoader from "../../../components/JudoLoader";

const TICKET_TYPES = [
  { value: 'inquiry', label: 'استفسار' },
  { value: 'suggestion', label: 'اقتراح' },
  { value: 'complaint', label: 'شكوى' },
  { value: 'promotion', label: 'طلب ترقية حزام' },
  { value: 'documentation', label: 'توثيق حزام سابق' },
  { value: 'other', label: 'أخرى (اكتب في الوصف)' },
];

type TicketSummary = {
  id: number;
  ticket_type: string;
  ticket_type_display: string;
  status: string;
  status_display: string;
  requested_belt_name: string | null;
  player_name: string | null;
  description: string;
  created_at: string;
  updated_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  pending_coach: 'bg-yellow-100 text-yellow-800',
  pending_cs: 'bg-purple-100 text-purple-800',
  pending_supervisor: 'bg-orange-100 text-orange-800',
  pending_committee: 'bg-indigo-100 text-indigo-800',
  pending_ceo: 'bg-amber-100 text-amber-800',
  approved: 'bg-gray-100 text-gray-800',
  returned: 'bg-red-100 text-red-800',
  rejected: 'bg-gray-100 text-red-800',
  closed: 'bg-gray-100 text-gray-800',
};

const getLocalizedStatus = (status: string, ticketType: string, defaultDisplay: string) => {
  if (status === 'approved') {
    return 'مغلقة';
  }
  
  const labels: Record<string, string> = {
    open: 'جديدة',
    pending_coach: 'بانتظار المدرب',
    pending_cs: 'بانتظار خدمة العملاء',
    pending_supervisor: 'بانتظار المشرف',
    pending_committee: 'بانتظار اللجنة الفنية',
    pending_ceo: 'بانتظار الرئيس التنفيذي',
    returned: 'معادة للمراجعة',
    rejected: 'مغلقة (مرفوضة)',
    closed: 'مغلقة',
  };
  return labels[status] || defaultDisplay;
};

export default function UnifiedTicketsPage() {
  const [ticketType, setTicketType] = useState('inquiry');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  
  // Belt Specific State
  const [belts, setBelts] = useState<any[]>([]);
  const [selectedBelt, setSelectedBelt] = useState('');
  const [loadingBelts, setLoadingBelts] = useState(false);
  const [hasPreviousBelt, setHasPreviousBelt] = useState(true);

  // New Validation Fields
  const [personalPhoto, setPersonalPhoto] = useState<File | null>(null);
  const [nationalIdPhoto, setNationalIdPhoto] = useState<File | null>(null);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [videoLink, setVideoLink] = useState('');

  // Coach Verification State
  const [coachSajId, setCoachSajId] = useState('');
  const [verifiedCoach, setVerifiedCoach] = useState<{id: string, name: string} | null>(null);
  const [isVerifyingCoach, setIsVerifyingCoach] = useState(false);
  const [coachVerifyError, setCoachVerifyError] = useState<string | null>(null);
  
  const [statusMsg, setStatusMsg] = useState<{text: string, type: 'error' | 'success'} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // My Tickets State
  const [myTickets, setMyTickets] = useState<TicketSummary[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  // Math Captcha State
  const [captchaQ, setCaptchaQ] = useState({ a: 0, b: 0 });
  const [captchaA, setCaptchaA] = useState('');

  const generateCaptcha = () => {
    setCaptchaQ({
      a: Math.floor(Math.random() * 10) + 1,
      b: Math.floor(Math.random() * 10) + 1,
    });
    setCaptchaA('');
  };

  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  const [prevPageUrl, setPrevPageUrl] = useState<string | null>(null);

  // Fetch user's tickets on mount and generate initial captcha
  useEffect(() => {
    fetchMyTickets();
    generateCaptcha();
    
    // Check if player is new (has no previous belt)
    const user = getDjangoUser();
    if (user && user.role === 'player') {
      if (!user.current_belt_id) {
        setHasPreviousBelt(false);
      } else {
        setHasPreviousBelt(true);
      }
    }
  }, []);

  const fetchMyTickets = async (url: string = 'tickets/my/') => {
    setLoadingTickets(true);
    try {
      // If the URL is absolute (like next/prev URLs from DRF), we use fetch directly with token
      let res;
      if (url.startsWith('http')) {
        const token = localStorage.getItem("access_token");
        res = await fetch(url, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
      } else {
        res = await apiGet(url);
      }
      
      if (res.ok) {
        const data = await res.json();
        if (data.results) {
          setMyTickets(data.results);
          setNextPageUrl(data.next);
          setPrevPageUrl(data.previous);
        } else {
          setMyTickets(data);
          setNextPageUrl(null);
          setPrevPageUrl(null);
        }
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (ticketType === 'promotion' || ticketType === 'documentation') {
      if (belts.length === 0) {
        setLoadingBelts(true);
        fetch(`${API_URL}/belts/`)
          .then(res => res.json())
          .then(data => {
            setBelts(data);
            setLoadingBelts(false);
          })
          .catch(err => {
            console.error(err);
            setStatusMsg({ text: "تعذر تحميل قائمة الأحزمة. الرجاء المحاولة لاحقاً.", type: 'error' });
            setLoadingBelts(false);
          });
      }
    } else {
        setSelectedBelt('');
    }
  }, [ticketType, belts.length]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleVerifyCoach = async () => {
    if (!coachSajId.trim()) {
      setCoachVerifyError('أدخل رقم الـ ID أولاً');
      return;
    }
    setIsVerifyingCoach(true);
    setCoachVerifyError(null);
    setVerifiedCoach(null);

    try {
      const res = await apiGet(`verify-coach/?saj_id=${coachSajId.trim()}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'فشلت عملية التحقق');
      }

      setVerifiedCoach(data.coach);
    } catch (err: any) {
      setCoachVerifyError(err.message);
    } finally {
      setIsVerifyingCoach(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (parseInt(captchaA) !== captchaQ.a + captchaQ.b) {
      setStatusMsg({ text: 'إجابة سؤال الأمان غير صحيحة، يرجى المحاولة مجدداً.', type: 'error' });
      generateCaptcha();
      return;
    }

    setStatusMsg(null);
    setIsSubmitting(true);

    if (!description.trim()) {
      setStatusMsg({ text: 'الرجاء كتابة تفاصيل التذكرة.', type: 'error' });
      setIsSubmitting(false);
      return;
    }

    if ((ticketType === 'promotion' || ticketType === 'documentation') && !selectedBelt) {
      setStatusMsg({ text: 'الرجاء اختيار الحزام لتتمكن من تقديم هذا الطلب.', type: 'error' });
      setIsSubmitting(false);
      return;
    }

    if (ticketType === 'promotion' && !verifiedCoach) {
      setStatusMsg({ text: 'الرجاء التحقق من هاتف/رقم المدرب أولاً للمضي في طلب الترقية.', type: 'error' });
      setIsSubmitting(false);
      return;
    }

    if (ticketType === 'promotion') {
        if (!termsAgreed) {
            setStatusMsg({ text: 'يجب الموافقة على الشروط والأحكام لتقديم الطلب.', type: 'error' });
            setIsSubmitting(false);
            return;
        }
        if (!personalPhoto) {
            setStatusMsg({ text: 'يجب إرفاق الصورة الشخصية.', type: 'error' });
            setIsSubmitting(false);
            return;
        }
        if (!nationalIdPhoto) {
            setStatusMsg({ text: 'يجب إرفاق صورة الهوية الوطنية/الإقامة.', type: 'error' });
            setIsSubmitting(false);
            return;
        }
        if (hasPreviousBelt && !file) {
            setStatusMsg({ text: 'يجب إرفاق شهادة الحزام السابق.', type: 'error' });
            setIsSubmitting(false);
            return;
        }
    }

    try {
      // Create FormData payload
      const formData = new FormData();
      formData.append('ticket_type', ticketType);
      formData.append('description', description);
      if (selectedBelt) formData.append('requested_belt', selectedBelt);
      if (verifiedCoach) formData.append('coach', verifiedCoach.id);
      if (file) formData.append('player_attachment', file);
      
      if (ticketType === 'promotion') {
          if (personalPhoto) formData.append('personal_photo', personalPhoto);
          if (nationalIdPhoto) formData.append('national_id_photo', nationalIdPhoto);
          if (videoLink) formData.append('video_link', videoLink.trim());
          formData.append('terms_agreed', termsAgreed ? 'true' : 'false');
      }

      // Real API call to Django backend
      const res = await apiPost('tickets/create/', formData);
      const data = await res.json();

      if (!res.ok) {
        // Handle validation errors from Django
        let errorMessages = Object.values(data).flat().join('\n');
        
        // Translate specific known Django errors for better UX
        if (errorMessages.includes("Ensure this filename has at most")) {
            errorMessages = "عذراً، اسم الملف المرفق طويل جداً. يرجى إعادة تسمية الملف باسم أقصر (مثال: image.jpg) والمحاولة مرة أخرى.";
        }
        
        setStatusMsg({ text: errorMessages || 'حدث خطأ أثناء إرسال التذكرة.', type: 'error' });
        setIsSubmitting(false);
        return;
      }

      setStatusMsg({ text: 'تم رفع التذكرة بنجاح! يمكنك متابعتها من قائمة التذاكر أدناه.', type: 'success' });
      
      // Reset form
      setTicketType('inquiry');
      setDescription('');
      setFile(null);
      setSelectedBelt('');
      setPersonalPhoto(null);
      setNationalIdPhoto(null);
      setTermsAgreed(false);
      setVerifiedCoach(null);
      setCoachSajId('');
      setVideoLink('');

      // Refresh tickets list
      fetchMyTickets();
      generateCaptcha();

    } catch (err: any) {
        setStatusMsg({ text: err.message || 'حدث خطأ. الرجاء المحاولة لاحقاً.', type: 'error' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const currentSelectedBeltObj = belts.find(b => b.id.toString() === selectedBelt);

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">التذاكر</h1>
        <p className="text-gray-600">
          يمكنك من خلال هذه البوابة رفع استفساراتك، مقترحاتك، الشكاوى، أو تقديم طلبات لترقية وتوثيق الأحزمة.
        </p>
      </div>

      {/* ── My Tickets Section ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">تذاكري السابقة</h2>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">{myTickets.length} تذكرة</span>
        </div>
        <div className="p-4">
          {loadingTickets ? (
            <JudoLoader className="my-10" text="جاري تحميل التذاكر..." />
          ) : myTickets.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">📭</div>
              <p className="font-medium">لا توجد تذاكر سابقة حتى الآن.</p>
              <p className="text-xs mt-1">استخدم النموذج أدناه لرفع أول تذكرة لك.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myTickets.map(ticket => (
                <Link
                  key={ticket.id}
                  href={`/dashboard/tickets/${ticket.id}`}
                  className="flex items-center justify-between p-4 bg-gray-50 hover:bg-green-50 rounded-xl border border-gray-100 hover:border-green-200 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center text-lg shadow-sm">
                      {ticket.ticket_type === 'promotion' ? '🥋' : 
                       ticket.ticket_type === 'documentation' ? '📜' : 
                       ticket.ticket_type === 'complaint' ? '⚠️' : 
                       ticket.ticket_type === 'inquiry' ? '❓' : '📝'}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm group-hover:text-green-800 transition-colors">
                        تذكرة #{ticket.id} — {ticket.ticket_type_display}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">
                        {ticket.description || 'بدون وصف'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {ticket.requested_belt_name && (
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-medium hidden sm:inline-block">
                        {ticket.requested_belt_name}
                      </span>
                    )}
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${STATUS_COLORS[ticket.status] || 'bg-gray-100 text-gray-600'}`}>
                      {getLocalizedStatus(ticket.status, ticket.ticket_type, ticket.status_display)}
                    </span>
                    <span className="text-gray-400 group-hover:text-green-600 transition-colors">←</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
          
          {/* Pagination Controls */}
          {(nextPageUrl || prevPageUrl) && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => prevPageUrl && fetchMyTickets(prevPageUrl)}
                disabled={!prevPageUrl}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
                  prevPageUrl 
                    ? 'bg-white text-green-700 border border-green-200 hover:bg-green-50' 
                    : 'bg-gray-50 text-gray-400 border border-gray-100 cursor-not-allowed'
                }`}
              >
                الصفحة السابقة
              </button>
              
              <button
                onClick={() => nextPageUrl && fetchMyTickets(nextPageUrl)}
                disabled={!nextPageUrl}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
                  nextPageUrl 
                    ? 'bg-white text-green-700 border border-green-200 hover:bg-green-50' 
                    : 'bg-gray-50 text-gray-400 border border-gray-100 cursor-not-allowed'
                }`}
              >
                الصفحة التالية
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── New Ticket Form ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        
        {statusMsg && (
          <div className={`p-4 rounded-xl mb-6 font-semibold flex items-center shadow-sm ${statusMsg.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
            {statusMsg.type === 'success' ? '✓ ' : '⚠ '}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Ticket Type */}
          <div>
            <label className="block text-gray-800 font-bold mb-2">نوع التذكرة <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {TICKET_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setTicketType(type.value)}
                  className={`py-3 px-4 border rounded-xl text-sm font-semibold transition-all duration-200 ${
                    ticketType === type.value
                      ? 'bg-green-600 border-green-600 text-white shadow-md'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-green-500 hover:text-green-700 hover:bg-green-50'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Belt Selection for Promotion/Documentation */}
          {(ticketType === 'promotion' || ticketType === 'documentation') && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <label className="block text-gray-800 font-bold mb-2">
                اختر الحزام المستهدف <span className="text-red-500">*</span>
              </label>
              {loadingBelts ? (
                <JudoLoader size="sm" text="جاري تحميل الأحزمة المعتمدة..." />
              ) : (
                <select
                  value={selectedBelt}
                  onChange={(e) => setSelectedBelt(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                >
                  <option value="">-- يرجى الاختيار --</option>
                  {belts.map(belt => (
                    <option key={belt.id} value={belt.id}>{belt.display_name || belt.name}</option>
                  ))}
                </select>
              )}

              {/* Belt Details Display (Only for promotion to show fees/time) */}
              {ticketType === 'promotion' && currentSelectedBeltObj && (
                <div className="mt-4 bg-green-50 p-4 rounded-xl border border-green-100 text-green-900 shadow-sm animate-in fade-in duration-300">
                  <h4 className="font-bold flex items-center mb-2"><span className="bg-green-200 text-green-800 p-1 rounded ml-2 text-xs">معلومات الترقية</span></h4>
                  <ul className="space-y-1 text-sm">
                    <li className="flex justify-between border-b border-green-200/50 pb-1">
                      <span>الرسوم الإدارية (تدفع للمدرب أو الحكم):</span>
                      <span className="font-bold">{currentSelectedBeltObj.price} ريال</span>
                    </li>
                    <li className="flex justify-between pt-1">
                      <span>الفترة الزمنية بين الحزام المطلوبة هي:</span>
                      <span className="font-bold">{currentSelectedBeltObj.required_months} شهراً</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Coach Verification specifically for Promotion */}
          {ticketType === 'promotion' && (
             <div className="animate-in slide-in-from-top-2 duration-300 bg-gray-50 p-5 rounded-2xl border border-gray-200">
                <label className="block text-gray-800 font-bold mb-2">
                  معرف المدرب (Coach ID) <span className="text-red-500">*</span>
                </label>
                <p className="text-gray-500 text-xs mb-3">
                  أدخل رقم المدرب الذي سيقوم باختبارك.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 flex items-stretch" dir="ltr">
                    <span className="bg-gray-200 border border-r-0 border-gray-300 px-4 flex items-center rounded-l-xl text-gray-600 font-bold tracking-widest">
                      SAJ-
                    </span>
                    <input 
                      type="text" 
                      value={coachSajId}
                      onChange={(e) => setCoachSajId(e.target.value.replace(/\D/g, ''))}
                      className="flex-1 border border-l-0 border-gray-300 rounded-r-xl p-3 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 text-left font-mono"
                      placeholder="12345"
                      disabled={isVerifyingCoach}
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={handleVerifyCoach}
                    disabled={isVerifyingCoach || !coachSajId}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50"
                  >
                    {isVerifyingCoach ? 'جاري التحقق...' : 'تحقق'}
                  </button>
                </div>

                {/* Validation Results */}
                {coachVerifyError && (
                  <p className="text-red-600 text-sm font-bold mt-3 animate-in fade-in">
                    ⚠ {coachVerifyError}
                  </p>
                )}
                {verifiedCoach && (
                  <div className="mt-3 bg-green-100 border border-green-300 p-3 rounded-xl flex items-center justify-between animate-in fade-in">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <span className="text-green-800 font-bold">المدرب المعتمد:</span>
                      <span className="text-green-900 font-extrabold">{verifiedCoach.name}</span>
                    </div>
                    <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full border border-green-700">✓ موثوق</span>
                  </div>
                )}
             </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-gray-800 font-bold mb-2">
              نص يوضح المطلوب / وصف مفصل <span className="text-red-500">*</span>
            </label>
            <p className="text-gray-500 text-xs mb-2">
              {ticketType === 'promotion' ? 'يرجى كتابة أسباب طلب الترقية أو تعليقات لمدربك.' : 
               ticketType === 'documentation' ? 'يرجى كتابة تفاصيل الحزام القديم (تاريخ ومكان الإصدار).' : 
               'اشرح طلبك أو مشكلتك بالتفصيل ليتمكن فريق الدعم من مساعدتك بأسرع وقت.'}
            </p>
            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب هنا..."
              className="w-full border border-gray-200 rounded-xl p-4 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors resize-y shadow-inner"
            ></textarea>
          </div>

          {/* Additional Fields for Promotion */}
          {ticketType === 'promotion' && (
             <div className="space-y-6">
                 {/* Personal Photo */}
                 <div>
                    <label className="block text-gray-800 font-bold mb-2">صورة شخصية حديثة <span className="text-red-500">*</span></label>
                    <input type="file" onChange={(e) => setPersonalPhoto(e.target.files?.[0] || null)} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors" accept="image/*" />
                 </div>
                 
                 {/* National ID Photo */}
                 <div>
                    <label className="block text-gray-800 font-bold mb-2">صورة الهوية الوطنية / الإقامة / بطاقة العائلة <span className="text-red-500">*</span></label>
                     <p className="text-gray-500 text-xs mb-2">لبطاقة العائلة لمن هم دون 15 سنة.</p>
                    <input type="file" onChange={(e) => setNationalIdPhoto(e.target.files?.[0] || null)} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors" accept="image/*,.pdf" />
                 </div>

                 {/* Previous Belt Certificate */}
                 {hasPreviousBelt && (
                  <div>
                      <label className="block text-gray-800 font-bold mb-2">شهادة الحزام السابق <span className="text-red-500">*</span></label>
                      <input type="file" onChange={handleFileChange} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors" accept="image/*,.pdf" />
                  </div>
                 )}

                 {!hasPreviousBelt && (
                   <div className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100 font-bold text-sm">
                     معلومة: بصفتك لاعب جديد، لا يُطلب منك إرفاق شهادة حزام سابق.
                   </div>
                 )}

                 {/* Optional Video Link */}
                 <div>
                    <label className="block text-gray-800 font-bold mb-2">رابط فيديو أداء الاختبار (اختياري)</label>
                    <p className="text-gray-500 text-xs mb-2">يمكنك إرفاق رابط يوتيوب أو جوجل درايف ليتمكن الحكام والمشرفين من الاطلاع عليه.</p>
                    <input 
                      type="url" 
                      value={videoLink}
                      onChange={e => setVideoLink(e.target.value)}
                      placeholder="https://..."
                      className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors" 
                      dir="ltr"
                    />
                 </div>

                 {/* Terms and Conditions */}
                 <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                    <h3 className="font-bold text-lg mb-4 text-gray-900 border-b pb-2">الشروط والأحكام لطلب ترقية الحزام</h3>
                    <ul className="space-y-2 text-sm text-gray-700 list-decimal list-inside mb-6 font-medium">
                      <li>أقر بأن جميع البيانات المدخلة في الطلب صحيحة وكاملة.</li>
                      {hasPreviousBelt && <li>أقر بأنني حاصل على الحزام السابق المطلوب للترقية.</li>}
                      <li>أقر بأنني التزمت بالفترة الزمنية المطلوبة بين الأحزمة حسب أنظمة الاتحاد السعودي للجودو.</li>
                      <li>أوافق على إجراء اختبار الحزام تحت إشراف مدرب أو حكم معتمد من الاتحاد.</li>
                      <li>أقر بأن نتيجة الاختبار وتسجيل الأداء الفني يتم من قبل المختبر.</li>
                      <li>أوافق على دفع رسوم الاختبار ({currentSelectedBeltObj?.price || 0} ريال) وأن يتم رفع إيصال السداد ضمن الإجراءات.</li>
                      <li>طلب الترقية يخضع لمراجعة متسلسلة: (المدرب ➔ خدمة العملاء ➔ المشرف ➔ اللجنة الفنية).</li>
                      <li>اعتماد الترقية وإصدار الشهادة يتم حصرياً بقرار اللجنة الفنية كمرحلة أخيرة، ويحق لها رفض الطلب لعدم الاستيفاء.</li>
                    </ul>
                    
                    <label className="flex items-start space-x-3 space-x-reverse cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={termsAgreed}
                        onChange={(e) => setTermsAgreed(e.target.checked)}
                        className="mt-1 w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500" 
                      />
                      <span className="text-gray-900 font-bold leading-relaxed">
                        قرأت الشروط والأحكام الخاصة بترقية الحزام لدى الاتحاد السعودي للجودو وأوافق عليها تماماً. <span className="text-red-500">*</span>
                      </span>
                    </label>
                 </div>
             </div>
          )}

          {ticketType !== 'promotion' && (
          <div>
            <label className="block text-gray-800 font-bold mb-2">المرفقات الداعمة (اختياري)</label>
            <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl bg-gray-50 hover:bg-white transition-colors">
              <div className="space-y-1 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex text-sm justify-center">
                  <label htmlFor="file-upload" className="relative cursor-pointer font-bold text-green-600 hover:text-green-500 rounded-md">
                    <span>اختر ملفاً أو صورة</span>
                    <input id="file-upload" type="file" className="sr-only" onChange={handleFileChange} />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">امتدادات مدعومة: PDF, JPG, PNG بحجم أقصى 10MB</p>
                {file && (
                  <div className="mt-3 p-2 bg-green-50 text-green-800 rounded-lg inline-block border border-green-200 text-sm font-semibold truncate max-w-xs animate-in fade-in">
                    ✓ {file.name}
                  </div>
                )}
              </div>
            </div>
            {ticketType === 'documentation' && (
              <p className="text-red-500 text-xs mt-2 font-bold flex items-center">
                ⚠ المرفق إلزامي لتذاكر "توثيق الحزام السابقة" (شهادة تثبت الدرجة).
              </p>
            )}
          </div>
          )}

          {/* Math Captcha */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 w-full sm:w-fit">
            <label className="block text-gray-800 font-bold mb-2 text-sm">
              سؤال الأمان (الرجاء إدخال ناتج الجمع للتأكد) <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-gray-700 bg-gray-200 px-3 py-2 rounded-lg border border-gray-300 shadow-inner whitespace-nowrap" dir="ltr">
                {captchaQ.a} + {captchaQ.b} =
              </span>
              <input 
                type="number" 
                value={captchaA}
                onChange={e => setCaptchaA(e.target.value)}
                placeholder="؟"
                className="w-24 border border-gray-300 rounded-lg p-2 text-center font-bold text-lg focus:ring-2 focus:ring-green-500 outline-none"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-4 px-4 rounded-xl shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 disabled:-translate-y-0"
          >
            {isSubmitting ? 'جاري إرسال التذكرة...' : 'رفع التذكرة واعتماد الطلب'}
          </button>
        </form>
      </div>
    </div>
  );
}
