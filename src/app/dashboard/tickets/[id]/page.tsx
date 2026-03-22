"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost, getDjangoUser } from "../../../../lib/api";
import JudoLoader from "../../../../components/JudoLoader";

// --- Types ---
type TicketHistory = {
  id: number;
  actor_name: string;
  actor_role: string;
  action_type: string;
  notes: string;
  created_at: string;
};

type TicketMessage = {
  id: number;
  sender: number;
  sender_name: string;
  sender_role: string;
  sender_photo: string | null;
  message: string;
  attachment: string | null;
  created_at: string;
  is_internal: boolean;
};

type TicketDetail = {
  id: number;
  status: string;
  ticket_type: string;
  description: string;
  created_at: string;
  updated_at: string;
  
  // Belt info
  current_belt_name: string | null;
  requested_belt_name: string | null;
  
  // Player info
  player_name: string;
  player_name_en: string | null;
  player_id: string;
  player_national_id: string | null;
  player_id_type: string | null;
  player_id_type_raw: string | null;
  player_nationality: string | null;
  player_birth_date: string | null;
  player_phone: string | null;
  player_gender: string;
  player_age?: number;
  player_club: string;
  player_region: string;
  player_city: string;
  player_emergency_number: string | null;
  player_blood_type: string | null;
  player_weight: string | null;
  player_bank_account: string | null;
  player_fursan_number: string | null;
  player_id_expiry_date: string | null;
  player_personal_photo: string | null;
  personal_photo: string | null;
  national_id_photo: string | null;
  player_attachment: string | null;
  video_link?: string | null;
  
  // Coach info
  coach_name: string | null;
  coach_id: string | null;
  coach_region: string | null;
  test_evaluation_form: string | null;
  payment_receipt: string | null;
  
  // Notes
  supervisor_name: string | null;
  supervisor_notes: string;
  committee_notes: string;
  ceo_notes: string;
  coach_notes?: string | null;

  history: TicketHistory[];
  messages: TicketMessage[];
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

export default function TicketReviewPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;
  
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionNotes, setActionNotes] = useState("");
  const [replyMode, setReplyMode] = useState<'reply' | 'forward'>('reply');
  const [actionMsg, setActionMsg] = useState<{text: string, type: 'error' | 'success'} | null>(null);
  
  // Coach specific state
  const [evalForm, setEvalForm] = useState<File | null>(null);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [coachDeclaration, setCoachDeclaration] = useState(false);

  // CS specific state
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [employees, setEmployees] = useState<{id: number, name: string, role?: string}[]>([]);

  // CEO auto-approve state
  const [ceoAutoApprove, setCeoAutoApprove] = useState(false);

  // Admin Edit Profile Modal
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [editProfileData, setEditProfileData] = useState<any>({});
  
  // Dynamic dropdowns state
  const [dropdowns, setDropdowns] = useState<{city: any[], nationality: any[], club: any[]}>({ city: [], nationality: [], club: [] });

  
  const openEditProfileModal = () => {
    setEditProfileData({
      saj_id: ticket?.player_id || '',
      name_ar: ticket?.player_name || '',
      name_en: ticket?.player_name_en || '',
      id_type: ticket?.player_id_type_raw || 'national_id',
      blood_type: ticket?.player_blood_type || '',
      weight: ticket?.player_weight || '',
      phone_number: ticket?.player_phone || '',
      emergency_number: ticket?.player_emergency_number || '',
      bank_account: ticket?.player_bank_account || '',
      fursan_number: ticket?.player_fursan_number || '',
      birth_date: ticket?.player_birth_date ? ticket.player_birth_date.split('T')[0] : '',
      id_expiry_date: ticket?.player_id_expiry_date ? ticket.player_id_expiry_date.split('T')[0] : '',
      national_id: ticket?.player_national_id || '',
      nationality: ticket?.player_nationality || '',
      city: ticket?.player_city || '',
      club_name: ticket?.player_club || '',
    });
    setIsEditProfileModalOpen(true);
  };

  const handleAdminProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionMsg(null);
    try {
      const formData = new FormData();
      Object.keys(editProfileData).forEach((key) => {
         if (editProfileData[key] !== null && editProfileData[key] !== undefined && editProfileData[key] !== "") {
             formData.append(key, editProfileData[key]);
         }
      });
      const res = await apiPost('admin/profile/update/', formData);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تحديث بيانات اللاعب.');
      setActionMsg({type: 'success', text: data.message});
      setIsEditProfileModalOpen(false);
      fetchTicketDetail(); // refresh data
    } catch (err: any) {
      setActionMsg({type: 'error', text: err.message});
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get current user role from stored Django user data
  const djangoUser = getDjangoUser();
  const currentRole = djangoUser?.role || 'player';

  const isPlayer = currentRole === 'player';
  const isCoach = currentRole === 'coach';
  const isCS = currentRole === 'customer_service';
  const isSupervisor = currentRole === 'regional_supervisor';
  const isCommittee = currentRole === 'tech_committee' || currentRole === 'committee_manager';
  const isCEO = currentRole === 'executive_director';
  const isAdmin = currentRole === 'admin';

  useEffect(() => {
    fetchTicketDetail();
    // Load employees list if user is staff
    if (isCS || isAdmin || isSupervisor || isCommittee || isCEO) {
      apiGet('employees/').then(res => res.json()).then(data => setEmployees(data)).catch(() => {});
    }
    // Load dropdowns for profile editing
    if (isAdmin || isCS) {
      apiGet('dropdowns/').then(res => res.json()).then(data => {
        if(data && typeof data === 'object' && data.city) {
            setDropdowns({
              city: data.city || [],
              nationality: data.nationality || [],
              club: data.club || []
            });
        }
      }).catch(() => {});
    }
  }, [ticketId]);

  const fetchTicketDetail = async () => {
    setLoading(true);
    try {
      const res = await apiGet(`tickets/${ticketId}/`);
      if (!res.ok) {
        setErrorMsg("لم يتم العثور على التذكرة أو ليس لديك صلاحية لعرضها.");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setTicket(data);
    } catch (err) {
      setErrorMsg("حدث خطأ في الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (endpoint: string, payload: any, useFormData: boolean = false) => {
    setIsSubmitting(true);
    setActionMsg(null);
    
    try {
      let res: Response;
      
      if (useFormData) {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            formData.append(key, value as any);
          }
        });
        res = await apiPost(`tickets/${ticketId}/${endpoint}/`, formData);
      } else {
        res = await apiPost(`tickets/${ticketId}/${endpoint}/`, payload);
      }
      
      const data = await res.json();
      
      if (!res.ok) {
        setActionMsg({ text: data.error || 'حدث خطأ أثناء تنفيذ الإجراء.', type: 'error' });
        setIsSubmitting(false);
        return;
      }
      
      setActionMsg({ text: data.message || 'تم تنفيذ الإجراء بنجاح.', type: 'success' });
      
      // Refresh ticket data after action
      await fetchTicketDetail();
      setActionNotes("");
    } catch (err: any) {
      setActionMsg({ text: err.message || 'حدث خطأ في الاتصال.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAutoApprove = async () => {
    try {
      const res = await apiPost('users/toggle-ceo-auto-approve/', {});
      const data = await res.json();
      if (res.ok) {
        setCeoAutoApprove(data.auto_approve);
      }
    } catch (err) {
      console.error('toggle auto approve error:', err);
    }
  };

  if (loading) return <JudoLoader size="md" text="جاري تحميل بيانات التذكرة..." className="my-10" />;
  if (errorMsg || !ticket) return (
    <div className="p-10 text-center">
      <div className="text-red-600 font-bold mb-4">{errorMsg || "لم يتم العثور على التذكرة."}</div>
      <Link href="/dashboard/tickets" className="text-green-600 hover:text-green-800 font-bold underline">← العودة للتذاكر</Link>
    </div>
  );

  const isNewPlayer = 
      !ticket.current_belt_name || 
      ticket.current_belt_name.trim() === '' || 
      ticket.current_belt_name === 'null' || 
      ticket.current_belt_name === 'None' ||
      ticket.current_belt_name === 'undefined';
  
  // Dynamic Checklist Logic
  const checklist = {
    isNewPlayer,
    hasTestForm: !!ticket.test_evaluation_form || !!evalForm,
    hasReceipt: !!ticket.payment_receipt || !!receipt,
    hasPrevCert: !!ticket.player_attachment,
    validBeltRequest: true,
    coachSubmitted: ticket.status !== 'open' && ticket.status !== 'pending_coach',
    supervisorReviewed: ticket.status === 'pending_committee' || ticket.status === 'pending_ceo' || ticket.status === 'approved',
    committeeReviewed: ticket.status === 'pending_ceo' || ticket.status === 'approved'
  };

  const isPromotionOrDoc = ticket.ticket_type === 'promotion' || ticket.ticket_type === 'documentation';

  const canActAsCoach = (isCoach || isAdmin) && ticket.status === 'pending_coach' && isPromotionOrDoc;
  const canActAsCS = (isCS || isAdmin) && ticket.status === 'pending_cs';
  const canActAsSupervisor = (isSupervisor || isAdmin) && ticket.status === 'pending_supervisor' && isPromotionOrDoc;
  const canActAsCommittee = (isCommittee || isAdmin) && ticket.status === 'pending_committee' && isPromotionOrDoc;
  const canActAsCEO = (isCEO || isAdmin) && ticket.status === 'pending_ceo' && isPromotionOrDoc;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* Back Navigation */}
      <Link href="/dashboard/tickets" className="inline-flex items-center text-sm text-gray-500 hover:text-green-700 font-medium transition-colors">
        → العودة لقائمة التذاكر
      </Link>

      {/* Action Message */}
      {actionMsg && (
        <div className={`p-4 rounded-xl font-semibold flex items-center shadow-sm ${actionMsg.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
          {actionMsg.type === 'success' ? '✓ ' : '⚠ '}
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* 1. Ticket Summary Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-extrabold text-gray-900">تذكرة #{ticket.id}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              ticket.status === 'approved' ? 'bg-gray-100 text-gray-800' :
              ticket.status === 'rejected' ? 'bg-gray-100 text-red-800' :
              ticket.status === 'returned' ? 'bg-red-100 text-red-800' :
              ticket.status === 'closed' ? 'bg-gray-100 text-gray-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {getLocalizedStatus(ticket.status, ticket.ticket_type, ticket.status.replace(/_/g, ' ').toUpperCase())}
            </span>
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">صاحب التذكرة: <span className="font-bold text-gray-800">{ticket.player_name}</span></p>
          <p className="text-sm text-gray-400 font-medium">نُشرت في: {new Date(ticket.created_at).toLocaleDateString('ar-EG')}</p>
        </div>
        
        {ticket.ticket_type === 'promotion' || ticket.ticket_type === 'documentation' ? (
          <div className="flex gap-4 text-sm font-bold bg-gray-50 p-3 rounded-xl border border-gray-200">
             <div className="flex flex-col">
                <span className="text-gray-500 text-xs">الحزام الحالي</span>
                <span className="text-gray-900">{ticket.current_belt_name || "لاعب جديد"}</span>
             </div>
             <div className="w-px bg-gray-300"></div>
             <div className="flex flex-col">
                <span className="text-gray-500 text-xs">مطلوب الترقية إلى</span>
                <span className="text-green-700">{ticket.requested_belt_name}</span>
             </div>
          </div>
        ) : ticket.ticket_type === 'profile_update' ? (
          <div className="flex gap-4 text-sm font-bold bg-orange-50 p-3 rounded-xl border border-orange-200 text-orange-800">
             ⚠️ طلب تحديث بيانات رئيسية (يطلب إيقاف الحساب مؤقتاً)
          </div>
        ) : null}
      </div>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Profiles */}
        <div className="lg:col-span-3 space-y-6">
          {/* Player Card */}
           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="bg-gray-50 p-4 border-b font-bold text-gray-800 flex items-center justify-between">
               <span>بطاقة اللاعب</span>
               <div className="flex items-center gap-2">
                 {(isAdmin || isCS) && (
                   <button onClick={openEditProfileModal} className="text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-200 px-2 py-1 rounded font-bold transition-colors">
                     تعديل بيانات
                   </button>
                 )}
                 <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">{ticket.player_id}</span>
               </div>
             </div>
             <div className="p-4 flex flex-col items-center">
                <div className="w-20 h-20 bg-gray-200 rounded-full mb-3 overflow-hidden border-2 border-green-500">
                   {/* If it's a profile update, show the newly requested photo if exists, else current */}
                   {(ticket as any).requested_personal_photo || ticket.personal_photo || ticket.player_personal_photo ? (
                       <img src={(ticket as any).requested_personal_photo || ticket.personal_photo || ticket.player_personal_photo} alt="Player" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'data:image/svg+xml;utf8,<svg fill="%239CA3AF" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>'; }} />
                   ) : (
                       <svg className="w-full h-full text-gray-400 p-2" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                   )}
                </div>
                {ticket.ticket_type === 'profile_update' && ((ticket as any).requested_name_ar || (ticket as any).requested_name_en) ? (
                   <>
                     <h3 className="font-bold text-lg text-center mb-1 text-orange-600">{(ticket as any).requested_name_ar || ticket.player_name} (جديد)</h3>
                     <p className="text-xs text-gray-500 line-through mb-1">{ticket.player_name}</p>
                   </>
                ) : (
                   <h3 className="font-bold text-lg text-center mb-1">{ticket.player_name}</h3>
                )}
                
                <p className="text-xs text-gray-500 mb-4">{ticket.player_club || "مستقل"}</p>
                
                <div className="w-full space-y-2 text-sm mt-4">
                   <div className="flex justify-between border-b pb-1"><span className="text-gray-500">الجنسية:</span><span className="font-medium text-left">{ticket.player_nationality || '---'}</span></div>
                   <div className="flex justify-between border-b pb-1"><span className="text-gray-500">رقم الهوية:</span><span className="font-medium text-left" dir="ltr">{ticket.player_national_id || '---'}</span></div>
                   <div className="flex justify-between border-b pb-1"><span className="text-gray-500">تاريخ الانتهاء:</span><span className="font-medium text-left">{ticket.player_id_expiry_date || '---'}</span></div>
                   <div className="flex justify-between border-b pb-1"><span className="text-gray-500">تاريخ الميلاد:</span><span className="font-medium text-left">{ticket.player_birth_date || '---'}</span></div>
                   <div className="flex justify-between border-b pb-1"><span className="text-gray-500">الجنس:</span><span className="font-medium text-left">{ticket.player_gender || '---'}</span></div>
                   <div className="flex justify-between border-b pb-1"><span className="text-gray-500">فصيلة الدم:</span><span className="font-medium text-left" dir="ltr">{ticket.player_blood_type || '---'}</span></div>
                   <div className="flex justify-between border-b pb-1"><span className="text-gray-500">الوزن:</span><span className="font-medium text-left">{ticket.player_weight ? `${ticket.player_weight} كجم` : '---'}</span></div>
                   <div className="flex justify-between border-b pb-1"><span className="text-gray-500">رقم الجوال:</span><span className="font-medium text-left" dir="ltr">{ticket.player_phone || '---'}</span></div>
                   <div className="flex justify-between border-b pb-1"><span className="text-gray-500">رقم طوارئ:</span><span className="font-medium text-left" dir="ltr">{ticket.player_emergency_number || '---'}</span></div>
                   <div className="flex justify-between border-b pb-1"><span className="text-gray-500">الحساب البنكي:</span><span className="font-medium text-left text-xs" dir="ltr">{ticket.player_bank_account || '---'}</span></div>
                   <div className="flex justify-between border-b pb-1"><span className="text-gray-500">رقم الفرسان:</span><span className="font-medium text-left" dir="ltr">{ticket.player_fursan_number || '---'}</span></div>
                   <div className="flex justify-between border-b pb-1">
                     <span className="text-gray-500">المدينة:</span>
                     <span className="font-medium text-left">
                       {ticket.player_city || '---'}
                     </span>
                   </div>
                </div>
             </div>
          </div>

          {/* Coach Card */}
          {ticket.coach_name && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
               <div className="bg-blue-50 p-4 border-b font-bold text-blue-900 flex items-center justify-between">
                 <span>المدرب / الحكم</span>
                 <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">{ticket.coach_id}</span>
               </div>
               <div className="p-4 space-y-2 text-sm">
                  <div className="font-bold text-base mb-2">{ticket.coach_name}</div>
                  <div className="flex justify-between border-b border-gray-100 pb-1">
                    <span className="text-gray-500">المنطقة:</span>
                    <span className="font-medium">
                      {ticket.coach_region ? (
                          {
                            Riyadh: 'الرياض', Makkah: 'مكة المكرمة', Madinah: 'المدينة المنورة', 
                            'Eastern Province': 'الشرقية', Qassim: 'القصيم', Hail: 'حائل',
                            Tabuk: 'تبوك', 'Northern Borders': 'الحدود الشمالية', Jizan: 'جازان',
                            Najran: 'نجران', 'Al Baha': 'الباحة', 'Al Jouf': 'الجوف', Aseer: 'عسير'
                          }[ticket.coach_region] || ticket.coach_region
                      ) : '-'}
                    </span>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* MIDDLE COLUMN: Attachments & Notes */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="p-6">
                <h2 className="text-xl font-bold mb-4 border-b pb-2">تفاصيل الطلب والمرفقات</h2>
                <div className="mb-6 bg-gray-50 p-4 rounded-xl text-gray-800 text-sm leading-relaxed border border-gray-100">
                    <span className="font-bold block mb-1 text-xs text-gray-500">وصف أو تعليق اللاعب:</span>
                    {ticket.description}
                </div>

                <div className="space-y-6">
                    {/* Player Attachments */}
                    <div>
                        <h3 className="font-bold text-gray-700 bg-gray-100 py-1 px-3 rounded text-sm mb-3">مرفقات اللاعب (Player Attachments)</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <AttachmentCard name="صورة الهوية الوطنية" url={ticket.national_id_photo} />
                            
                            {['inquiry', 'suggestion', 'complaint', 'other'].includes(ticket.ticket_type) ? (
                                <AttachmentCard name="المرفق المرفوع" url={ticket.player_attachment} />
                            ) : isNewPlayer ? (
                                <div className="p-3 border border-blue-200 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold flex items-center justify-center text-center">
                                    تنبيه: اللاعب مستجد، لا يوجد شهادة سابقة مطلوبة.
                                </div>
                            ) : (
                                <AttachmentCard name="شهادة الحزام السابق" url={ticket.player_attachment} required />
                            )}
                            
                            {/* Video Link */}
                            {ticket.video_link && (
                                <div className="col-span-1 sm:col-span-2 mt-2 p-4 bg-red-50/50 rounded-xl border border-red-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                       <div className="w-10 h-10 bg-red-100 text-red-500 rounded-full flex items-center justify-center">
                                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zm3.886 10.375l-5.625 3.375A.501.501 0 017.5 13.375v-6.75a.5.5 0 01.761-.425l5.625 3.375a.5.5 0 010 .85z"/></svg>
                                       </div>
                                       <div>
                                          <h4 className="font-bold text-red-900 text-sm">فيديو أداء الاختبار</h4>
                                          <p className="text-xs text-red-600">مرفق اختياري من اللاعب لدعم الطلب</p>
                                       </div>
                                    </div>
                                    <a href={ticket.video_link} target="_blank" rel="noopener noreferrer" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm text-sm">
                                        مشاهدة الفيديو
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Coach Attachments */}
                    {(ticket.ticket_type === 'promotion' || ticket.ticket_type === 'documentation') && (
                        <div>
                            <h3 className="font-bold text-gray-700 bg-gray-100 py-1 px-3 rounded text-sm mb-3">مرفقات المدرب (Coach Attachments)</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <AttachmentCard name="نموذج تقييم الاختبار" url={ticket.test_evaluation_form} required />
                                <AttachmentCard name="إيصال السداد" url={ticket.payment_receipt} required />
                            </div>
                        </div>
                    )}
                </div>
             </div>
          </div>

          {/* Previous Notes */}
          {ticket.coach_notes && (
             <div className="bg-blue-50 rounded-2xl shadow-sm border border-blue-200 p-6">
                <h3 className="font-bold text-blue-900 mb-2">ملاحظات المدرب:</h3>
                <p className="text-sm text-blue-900">{ticket.coach_notes}</p>
             </div>
          )}
          {ticket.supervisor_notes && (
             <div className="bg-yellow-50 rounded-2xl shadow-sm border border-yellow-200 p-6">
                <h3 className="font-bold text-yellow-800 mb-2">ملاحظات مشرف المنطقة:</h3>
                <p className="text-sm text-yellow-900">{ticket.supervisor_notes}</p>
             </div>
          )}
          {ticket.committee_notes && (
             <div className="bg-indigo-50 rounded-2xl shadow-sm border border-indigo-200 p-6">
                <h3 className="font-bold text-indigo-800 mb-2">ملاحظات اللجنة الفنية:</h3>
                <p className="text-sm text-indigo-900">{ticket.committee_notes}</p>
             </div>
          )}
          {ticket.ceo_notes && (
             <div className="bg-amber-50 rounded-2xl shadow-sm border border-amber-200 p-6">
                <h3 className="font-bold text-amber-800 mb-2">ملاحظات الرئيس التنفيذي:</h3>
                <p className="text-sm text-amber-900">{ticket.ceo_notes}</p>
             </div>
          )}




           {/* INTERNAL FORWARDING ACTION MOVED TO CONVERSATION BLOCK */}

           {/* 6. CONVERSATION / REPLIES */}
           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col">
              <h3 className="font-bold text-gray-900 text-sm border-b pb-2 flex items-center justify-between mb-4">
                <span>المحادثة والردود</span>
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{ticket.messages?.length || 0} رسائل</span>
              </h3>

              {/* Messages Container */}
              <div className="space-y-4 max-h-[500px] overflow-y-auto p-2 mb-4">
                 {ticket.messages && ticket.messages.map((msg, idx) => {
                     const isMe = msg.sender === djangoUser?.id;
                     return (
                         <div key={msg.id || idx} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                             <div className="flex-shrink-0 mt-1">
                                 {msg.sender_photo ? (
                                    <img src={msg.sender_photo} alt={msg.sender_name} className="w-8 h-8 rounded-full object-cover border border-gray-200 shadow-sm" onError={(e) => { e.currentTarget.src = 'data:image/svg+xml;utf8,<svg fill="%239CA3AF" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>'; }} />
                                 ) : (
                                    <div className="w-8 h-8 bg-gradient-to-br from-gray-200 to-gray-300 text-gray-600 rounded-full flex items-center justify-center font-bold text-xs shadow-sm">
                                      {msg.sender_name ? msg.sender_name.charAt(0) : '?'}
                                    </div>
                                 )}
                             </div>
                             <div className={`max-w-[85%] sm:max-w-[75%] p-3 text-sm flex flex-col shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-2xl rounded-tl-sm border border-gray-200'}`}>
                                 <div className={`text-[10px] font-bold mb-1.5 opacity-80 ${isMe ? 'text-blue-100' : 'text-gray-500'} flex items-center gap-1.5`}>
                                     <span>{msg.sender_name}</span>
                                     <span className="font-normal">•</span>
                                     <span className="font-normal">{new Date(msg.created_at).toLocaleString('ar-EG', {hour: '2-digit', minute:'2-digit', month: 'short', day: 'numeric'})}</span>
                                 </div>
                                 <div className="leading-relaxed whitespace-pre-wrap">{msg.message}</div>
                             </div>
                         </div>
                     );
                 })}
                 {(!ticket.messages || ticket.messages.length === 0) && (
                     <div className="text-center text-gray-400 text-sm py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                         لا توجد رسائل سابقة. كن أول من يضيف رداً.
                     </div>
                 )}
              </div>

              {/* Reply / Forward Box */}
              {ticket.status !== 'closed' ? (
                 <div className="border-t pt-4 mt-auto">
                     {(isCS || isSupervisor || isCommittee || isAdmin || isCEO) && ticket.ticket_type !== 'profile_update' && (
                         <div className="flex gap-6 mb-4 border-b border-gray-100 pb-0">
                             <button
                                 onClick={() => setReplyMode('reply')}
                                 className={`text-sm font-bold pb-3 border-b-2 transition-colors flex items-center gap-2 ${replyMode === 'reply' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                             >
                                 <span>💬</span>
                                 <span>رد على التذكرة</span>
                             </button>
                             <button
                                 onClick={() => setReplyMode('forward')}
                                 className={`text-sm font-bold pb-3 border-b-2 transition-colors flex items-center gap-2 ${replyMode === 'forward' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                             >
                                 <span>↪️</span>
                                 <span>توجيه داخلي</span>
                             </button>
                         </div>
                     )}

                     {replyMode === 'forward' ? (
                         <div className="space-y-4 animate-in fade-in">
                            <div>
                                <label className="block text-gray-700 font-bold mb-2 text-xs">اختر الموظف أو القسم المشارك لإكمال التذكرة *</label>
                                <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} className="w-full text-sm border border-gray-300 p-3 rounded-xl outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-gray-50">
                                    <option value="">-- القائمة --</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
                                </select>
                            </div>
                            <div>
                                <textarea 
                                    value={actionNotes} 
                                    onChange={e => setActionNotes(e.target.value)} 
                                    rows={3} 
                                    placeholder="ملاحظات توجيه التذكرة (مخفية عن اللاعب)..." 
                                    className="w-full text-sm border border-gray-300 p-3 rounded-xl outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200 bg-purple-50/30 resize-none"></textarea>
                            </div>
                            <div className="flex justify-end mt-2">
                                <button disabled={!selectedEmployee || isSubmitting} onClick={() => handleAction('cs-forward', { assigned_user_id: selectedEmployee, notes: actionNotes })} className="bg-purple-600 text-white text-sm font-bold py-2.5 px-6 rounded-xl hover:bg-purple-700 disabled:opacity-50 transition shadow-md flex items-center gap-2">
                                    <span>توجيه التذكرة</span>
                                    <span>↪️</span>
                                </button>
                            </div>
                         </div>
                     ) : (
                         <div className="animate-in fade-in bg-gray-50 p-4 border border-gray-200 rounded-xl shadow-sm">
                             <h4 className="font-bold text-gray-800 text-sm mb-3">رد أو اتخاذ إجراء</h4>
                             <textarea 
                                value={actionNotes} 
                                onChange={e => setActionNotes(e.target.value)} 
                                rows={3} 
                                placeholder="اكتب ردك أو استفسارك هنا (إلزامي في حال الإرجاع أو الرفض)..." 
                                className="w-full text-sm border border-gray-300 p-3 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white resize-none"
                             ></textarea>
                             
                             <div className="mt-4 flex flex-col gap-3">
                               {canActAsCoach && (
                                   <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 space-y-3">
                                      <h3 className="text-sm font-bold text-blue-900 border-b border-blue-100 pb-2">إجراءات المدرب</h3>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                          <div>
                                              <label className="block text-gray-700 font-bold mb-1 text-xs">ارفع صفحة الاختبار المعتمدة *</label>
                                              <input type="file" onChange={e => setEvalForm(e.target.files?.[0] || null)} className="w-full text-xs border border-gray-300 p-2 rounded-lg bg-white" />
                                          </div>
                                          <div>
                                              <label className="block text-gray-700 font-bold mb-1 text-xs">ارفع إيصال السداد *</label>
                                              <input type="file" onChange={e => setReceipt(e.target.files?.[0] || null)} className="w-full text-xs border border-gray-300 p-2 rounded-lg bg-white" />
                                          </div>
                                      </div>
                                      <label className="flex items-start gap-2 cursor-pointer bg-white p-2.5 rounded-lg border border-blue-100">
                                        <input type="checkbox" checked={coachDeclaration} onChange={e => setCoachDeclaration(e.target.checked)} className="mt-0.5 w-4 h-4 text-green-600 rounded" />
                                        <span className="text-xs text-gray-700 font-bold">أقر بأنني اختبرت اللاعب حسب الأنظمة وأؤكد استلام 20% رسوم الاختبار.</span>
                                      </label>
                                      <div className="flex gap-2">
                                         <button disabled={(!evalForm && !ticket?.test_evaluation_form) || (!receipt && !ticket?.payment_receipt) || !coachDeclaration || isSubmitting} onClick={() => handleAction('coach-submit', { test_evaluation_form: evalForm, payment_receipt: receipt, coach_declaration: 'true', notes: actionNotes }, true)} className="flex-[2] bg-green-600 text-white text-sm font-bold py-2.5 rounded-lg hover:bg-green-700 transition shadow-md">إرسال وتقييم التذكرة</button>
                                         <button disabled={!actionNotes || isSubmitting} onClick={() => handleAction('coach-submit', { action: 'return', notes: actionNotes }, true)} className="flex-1 bg-yellow-100 text-yellow-800 text-sm font-bold py-2.5 rounded-lg hover:bg-yellow-200 border border-yellow-200 transition">إرجاع للاعب</button>
                                      </div>
                                   </div>
                               )}

                               {canActAsSupervisor && (
                                   <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                                      <h3 className="text-sm font-bold text-orange-900 border-b border-orange-100 pb-2 mb-3">مراجعة مشرف المنطقة</h3>
                                      <div className="flex gap-2">
                                         <button disabled={isSubmitting} onClick={() => handleAction('supervisor-action', {action: 'submit', notes: actionNotes})} className="flex-[2] bg-orange-500 text-white text-sm font-bold py-2.5 rounded-lg hover:bg-orange-600 transition shadow-md">رفع للجنة الفنية</button>
                                         <button disabled={!actionNotes || isSubmitting} onClick={() => handleAction('supervisor-action', {action: 'return', notes: actionNotes})} className="flex-1 bg-red-100 text-red-700 text-sm font-bold py-2.5 rounded-lg hover:bg-red-200 border border-red-200 transition disabled:opacity-50">إرجاع لخدمة العملاء</button>
                                      </div>
                                   </div>
                               )}

                               {canActAsCommittee && (
                                   <div className="bg-gray-900 p-4 rounded-xl border border-gray-700 text-white shadow-lg">
                                      <h3 className="text-sm font-bold text-green-400 border-b border-gray-700 pb-2 mb-3 flex justify-between items-center"><span>قرار اللجنة الفنية</span><span className="text-xl">⚖️</span></h3>
                                      <div className="flex gap-2">
                                         <button disabled={isSubmitting} onClick={() => handleAction('committee-action', {action: 'approve', notes: actionNotes})} className="flex-[2] bg-green-600 text-white text-sm font-bold py-2.5 rounded-lg hover:bg-green-500 transition shadow-md">اعتماد ورفع للرئيس</button>
                                         <button disabled={!actionNotes || isSubmitting} onClick={() => handleAction('committee-action', {action: 'return', notes: actionNotes})} className="flex-1 bg-gray-800 text-red-400 text-sm font-bold py-2.5 rounded-lg hover:bg-gray-700 border border-gray-600 transition disabled:opacity-50">إرجاع للمشرف</button>
                                      </div>
                                   </div>
                               )}

                               {canActAsCEO && (
                                   <div className="bg-gradient-to-br from-gray-900 to-black p-4 rounded-xl border border-yellow-600/50 text-white relative shadow-xl overflow-hidden">
                                      <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500 rounded-full blur-3xl opacity-10 pointer-events-none"></div>
                                      <div className="relative z-10">
                                         <h3 className="text-sm font-bold text-yellow-400 border-b border-gray-800 pb-2 mb-3 flex justify-between items-center"><span>اعتماد الرئيس التنفيذي</span><span className="text-xl">👑</span></h3>
                                         <label className="flex items-center gap-3 cursor-pointer mb-5">
                                            <div className="relative">
                                              <input type="checkbox" className="sr-only" checked={ceoAutoApprove} onChange={handleToggleAutoApprove} />
                                              <div className={`block w-12 h-6 rounded-full transition-colors ${ceoAutoApprove ? 'bg-green-500' : 'bg-gray-700'}`}></div>
                                              <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${ceoAutoApprove ? 'transform translate-x-6' : ''}`}></div>
                                            </div>
                                            <span className="text-xs text-gray-300 font-bold">تفعيل (الموافقة التلقائية للطلبات القادمة)</span>
                                         </label>
                                         <div className="flex gap-2">
                                           <button disabled={isSubmitting} onClick={() => handleAction('ceo-action', {action: 'approve', notes: actionNotes})} className="flex-[2] bg-yellow-600 text-black text-sm font-extrabold py-3 rounded-xl hover:bg-yellow-500 transition shadow-lg">✅ اعتماد وإصدار الشهادة</button>
                                           <button disabled={!actionNotes || isSubmitting} onClick={() => handleAction('ceo-action', {action: 'return', notes: actionNotes})} className="flex-1 bg-gray-800 text-red-400 text-sm font-bold py-3 rounded-xl hover:bg-gray-700 border border-gray-700 transition disabled:opacity-50">❌ إرجاع للجنة</button>
                                         </div>
                                      </div>
                                   </div>
                               )}

                               {isPlayer && ticket.status === 'returned' && ticket.ticket_type === 'profile_update' && (
                                   <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                                      <h3 className="text-sm font-bold text-red-700 border-b border-red-100 pb-2 mb-3">إكمال النواقص وإعادة الإرسال</h3>
                                      <div className="mb-3">
                                          <label className="block text-gray-700 font-bold mb-1 text-xs">إرفاق صورة هوية جديدة (إن طُلب منك)</label>
                                          <input type="file" accept="image/*" onChange={e => setEvalForm(e.target.files?.[0] || null)} className="w-full text-xs border border-gray-300 p-2 rounded-lg bg-white" />
                                      </div>
                                      <button disabled={isSubmitting} onClick={() => handleAction('player-resubmit', { notes: actionNotes, national_id_photo_direct: evalForm }, true)} className="w-full bg-red-600 text-white text-sm font-bold py-2.5 rounded-lg hover:bg-red-700 transition shadow-md">إعادة إرسال التذكرة</button>
                                   </div>
                               )}

                               {canActAsCS && ticket.ticket_type === 'profile_update' && (
                                   <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                                      <h3 className="text-sm font-bold text-purple-900 border-b border-purple-100 pb-2 mb-3">مراجعة تحديث البيانات</h3>
                                      <div className="flex flex-col gap-3">
                                         <button disabled={isSubmitting} onClick={() => handleAction('cs-approve-profile', {action: 'approve', notes: actionNotes})} className="w-full bg-green-600 text-white text-sm font-bold py-2.5 rounded-lg hover:bg-green-700 transition shadow-md">قبول التحديث</button>
                                         <div className="flex gap-2 w-full">
                                             <button disabled={!actionNotes || isSubmitting} onClick={() => handleAction('cs-approve-profile', {action: 'return', notes: actionNotes})} className="flex-1 bg-yellow-50 text-yellow-800 text-sm font-bold py-2.5 rounded-lg hover:bg-yellow-100 border border-yellow-200 transition disabled:opacity-50">إرجاع للاعب</button>
                                             <button disabled={!actionNotes || isSubmitting} onClick={() => handleAction('cs-approve-profile', {action: 'reject', notes: actionNotes})} className="flex-1 bg-red-100 text-red-700 text-sm font-bold py-2.5 rounded-lg hover:bg-red-200 border border-red-200 transition disabled:opacity-50">رفض نهائي</button>
                                         </div>
                                      </div>
                                   </div>
                               )}

                               {isAdmin && ['closed', 'approved', 'rejected'].includes(ticket.status) && (
                                   <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                                      <h3 className="text-sm font-bold text-red-900 mb-2">إجراءات مدير النظام</h3>
                                      <button disabled={!actionNotes || isSubmitting} onClick={() => handleAction('admin-reopen', { notes: actionNotes })} className="w-full bg-red-600 text-white text-sm font-bold py-2.5 rounded-lg hover:bg-red-700 transition disabled:opacity-50 shadow-md">⚠️ إعادة فتح التذكرة</button>
                                   </div>
                               )}

                               <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 mt-1 border-t border-gray-200">
                                   <div>
                                     {(canActAsCS || isAdmin || canActAsCEO || canActAsSupervisor || canActAsCommittee) && (
                                         <label className="flex items-center gap-2 cursor-pointer bg-yellow-50/50 p-2 rounded-lg border border-yellow-100 hover:bg-yellow-50 transition-colors w-max">
                                             <input type="checkbox" id="closeTicketCheck" className="w-4 h-4 text-yellow-600 rounded border-yellow-300 focus:ring-yellow-500" />
                                             <span className="text-xs font-bold text-yellow-800">🔒 إغلاق التذكرة بعد الرد</span>
                                         </label>
                                     )}
                                   </div>
                                   <button disabled={!actionNotes || isSubmitting} onClick={() => { const closeCheckbox = document.getElementById('closeTicketCheck') as HTMLInputElement; handleAction('reply', { reply_text: actionNotes, close_ticket: closeCheckbox?.checked || false }) }} className="w-full sm:w-auto bg-blue-600 text-white text-sm font-bold py-2.5 px-6 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2">
                                       <span>إرسال رد (بدون إجراء)</span>
                                       <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                                   </button>
                               </div>

                             </div>
                         </div>
                     )}
                 </div>
              ) : (
                  <div className="border-t pt-4 mt-auto">
                      <div className="bg-red-50 text-red-600 border border-red-100 p-3 rounded-xl text-center text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                          <span>🔒</span> التذكرة مغلقة ولا يمكن إضافة المزيد من الردود
                      </div>
                  </div>
              )}
           </div>

        </div>

        {/* RIGHT COLUMN: Checklist & Actions */}
        <div className="lg:col-span-3 space-y-6">
            
           {/* Requirement Checklist */}
           {(ticket.ticket_type === 'promotion' || ticket.ticket_type === 'documentation' || ticket.ticket_type === 'profile_update') && (
           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                 <h3 className="font-bold text-gray-900 text-sm">قائمة التحقق (Checklist)</h3>
                 <span className={`text-xs px-2 py-1 rounded font-bold ${
                     ticket.status === 'approved' 
                     ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                 }`}>
                     { ticket.status === 'approved' ? 'مكتمل' : 'تحت الإجراء' }
                 </span>
              </div>
              
              <ul className="space-y-3 text-sm">
                 {ticket.ticket_type !== 'profile_update' ? (
                     <>
                        <ChecklistItem checked={checklist.isNewPlayer || checklist.hasPrevCert} text={isNewPlayer ? "لاعب جديد (لا يطلب شهادة)" : "شهادة الحزام السابق مرفقة"} />
                        <ChecklistItem checked={checklist.validBeltRequest} text="طلب الحزام التالي صحيح" />
                        <ChecklistItem checked={checklist.hasTestForm} text="نموذج الاختبار مرفق" />
                        <ChecklistItem checked={checklist.hasReceipt} text="إيصال السداد مرفق" />
                        <ChecklistItem checked={checklist.coachSubmitted} text="اعتماد المدرب المبدئي" />
                        <ChecklistItem checked={checklist.supervisorReviewed} text="اعتماد وتدقيق المشرف" />
                        <ChecklistItem checked={checklist.committeeReviewed} text="موافقة اللجنة الفنية" />
                     </>
                 ) : (
                     <>
                        <ChecklistItem checked={!!ticket.national_id_photo} text="صورة الهوية الوطنية / الإقامة مرفقة" />
                        <ChecklistItem checked={ticket.status === 'approved' || ticket.status === 'pending_ceo'} text="مراجعة ومطابقة خدمة العملاء" />
                        <ChecklistItem checked={ticket.status === 'approved'} text="الموافقة والاعتماد النهائي" />
                     </>
                 )}
              </ul>
           </div>
           )}

           {/* ACTION ENGINES BASED ON ROLES */}





           {/* ADMIN GLOBAL ACTIONS - KEEP THIS IN THE RIGHT COLUMN FOR DISCRETE VISIBILITY, OR MOVE DOWN TOO. WAIT, LET'S LEAVE DEFAULT, ONLY THOSE IN SCREENSHOT WERE REQUESTED */}


        </div>
      </div>

      {/* Ticket Timeline Header */}
      <h2 className="text-xl font-bold mt-12 mb-4 px-2">سجل حركة التذكرة (Timeline)</h2>
      {/* Timeline Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
         <div className="relative border-r-2 border-green-200 pr-6 space-y-8 py-2">
             {ticket.history.map((h, i) => {
                 const actionLabels: Record<string, string> = {
                     'Created Ticket': 'تم رفع التذكرة',
                     'Coach Submitted': 'اعتماد وتسليم المدرب',
                     'Supervisor Approved': 'اعتماد مشرف المنطقة',
                     'Committee Approved': 'موافقة وتدقيق اللجنة الفنية',
                     'CEO Approved': 'اعتماد وإصدار الشهادة',
                     'CS Approved Profile Update': 'اعتماد تحديث البيانات',
                     'Player Resubmitted': 'إعادة رفع من اللاعب',
                     'CS Re-routed': 'إعادة توجيه من الاستقبال',
                     'CS Forwarded': 'توجيه داخلي من المنصة',
                     'Returned to Player': 'إرجاع للاعب',
                     'Returned to Coach': 'إرجاع للمدرب',
                     'Returned to Supervisor': 'إرجاع للمشرف',
                     'Returned to Committee': 'إرجاع للجنة',
                     'Rejected': 'رفض التذكرة',
                     'Ticket Reopened': 'إعادة فتح التذكرة',
                 };
                 const roleLabels: Record<string, string> = {
                     'player': 'اللاعب', 'coach': 'المدرب', 'customer_service': 'خدمة العملاء',
                     'cs_employee': 'خدمة العملاء', 'tech_committee': 'اللجنة الفنية',
                     'regional_supervisor': 'مشرف منطقة', 'committee_manager': 'مدير لجنة',
                     'executive_director': 'الرئيس التنفيذي', 'admin': 'مدير النظام',
                 };
                 return (
                 <div key={h.id} className="relative">
                     <span className="absolute -right-[33px] top-1 w-4 h-4 rounded-full bg-green-500 ring-4 ring-white"></span>
                     <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1">
                         <h4 className="font-bold text-gray-900 text-base">{actionLabels[h.action_type] || h.action_type}</h4>
                         <span className="text-xs text-gray-500 font-medium dir-ltr inline-block bg-gray-100 px-2 py-1 rounded">{new Date(h.created_at).toLocaleString('ar-SA', { hour12: true })}</span>
                     </div>
                     <p className="text-sm text-gray-600 mb-2">{h.notes}</p>
                     <div className="flex items-center gap-2">
                         <span className="text-xs font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{h.actor_name}</span>
                         <span className="text-xs text-gray-500 uppercase tracking-wider">{roleLabels[(h.actor_role || '').toLowerCase()] || h.actor_role}</span>
                     </div>
                 </div>
                 );
             })}
         </div>
      </div>

      {/* Admin Edit Profile Modal */}
      {isEditProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <h2 className="text-lg font-bold text-gray-800">تعديل بيانات اللاعب</h2>
              <button onClick={() => setIsEditProfileModalOpen(false)} className="text-gray-400 hover:text-red-500 font-bold w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm hover:bg-red-50 transition-colors">✕</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 w-full scrollbar-thin scrollbar-thumb-gray-300">
              <form id="edit-profile-form" onSubmit={handleAdminProfileSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">الاسم الكامل (عربي)</label>
                    <input type="text" className="w-full text-sm border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all border outline-none" value={editProfileData.name_ar} onChange={e => setEditProfileData({...editProfileData, name_ar: e.target.value})} required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">الاسم الكامل (إنجليزي)</label>
                    <input type="text" className="w-full text-sm border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all border outline-none" value={editProfileData.name_en} onChange={e => setEditProfileData({...editProfileData, name_en: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">نوع الهوية</label>
                    <select className="w-full text-sm border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all border outline-none" value={editProfileData.id_type} onChange={e => setEditProfileData({...editProfileData, id_type: e.target.value})} required>
                        <option value="national_id">هوية وطنية</option>
                        <option value="iqama">إقامة</option>
                        <option value="passport">جواز سفر</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">رقم الهوية</label>
                    <input type="text" className="w-full text-sm border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all border outline-none" value={editProfileData.national_id} onChange={e => setEditProfileData({...editProfileData, national_id: e.target.value})} required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">تاريخ الميلاد</label>
                    <input type="date" className="w-full text-sm border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all border outline-none" value={editProfileData.birth_date} onChange={e => setEditProfileData({...editProfileData, birth_date: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">تاريخ انتهاء الهوية</label>
                    <input type="date" className="w-full text-sm border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all border outline-none" value={editProfileData.id_expiry_date} onChange={e => setEditProfileData({...editProfileData, id_expiry_date: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">رقم الجوال</label>
                    <input type="tel" className="w-full text-sm border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all border outline-none" value={editProfileData.phone_number} onChange={e => setEditProfileData({...editProfileData, phone_number: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">رقم الطوارئ</label>
                    <input type="tel" className="w-full text-sm border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all border outline-none" value={editProfileData.emergency_number} onChange={e => setEditProfileData({...editProfileData, emergency_number: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">فصيلة الدم</label>
                    <input type="text" className="w-full text-sm border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all border outline-none" value={editProfileData.blood_type} onChange={e => setEditProfileData({...editProfileData, blood_type: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">الوزن</label>
                    <input type="number" step="0.1" className="w-full text-sm border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all border outline-none" value={editProfileData.weight} onChange={e => setEditProfileData({...editProfileData, weight: e.target.value})} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">الجنسية</label>
                    <select className="w-full text-sm border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all border outline-none" value={editProfileData.nationality || ''} onChange={e => setEditProfileData({...editProfileData, nationality: e.target.value})}>
                      <option value="">-- اختر --</option>
                      {dropdowns.nationality.map(item => (
                         <option key={item.id} value={item.name_en}>{item.name_ar}</option>
                      ))}
                      {editProfileData.nationality && !dropdowns.nationality.find(i => i.name_en === editProfileData.nationality) && (
                         <option value={editProfileData.nationality}>{editProfileData.nationality}</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">المدينة</label>
                    <select className="w-full text-sm border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all border outline-none" value={editProfileData.city || ''} onChange={e => setEditProfileData({...editProfileData, city: e.target.value})}>
                      <option value="">-- اختر --</option>
                      {dropdowns.city.map(item => (
                         <option key={item.id} value={item.name_ar}>{item.name_ar}</option>
                      ))}
                      {editProfileData.city && !dropdowns.city.find(i => i.name_ar === editProfileData.city) && (
                         <option value={editProfileData.city}>{editProfileData.city}</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">النادي / المركز</label>
                    <select className="w-full text-sm border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all border outline-none" value={editProfileData.club_name || ''} onChange={e => setEditProfileData({...editProfileData, club_name: e.target.value})}>
                      <option value="">-- اختر --</option>
                      {dropdowns.club.map(item => (
                         <option key={item.id} value={item.name_ar}>{item.name_ar}</option>
                      ))}
                      {editProfileData.club_name && !dropdowns.club.find(i => i.name_ar === editProfileData.club_name) && (
                         <option value={editProfileData.club_name}>{editProfileData.club_name}</option>
                      )}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">الحساب البنكي (الآيبان)</label>
                    <input type="text" className="w-full text-sm border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all border outline-none" value={editProfileData.bank_account} onChange={e => setEditProfileData({...editProfileData, bank_account: e.target.value})} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">تحديث صورة الهوية (إن لزم)</label>
                    <input type="file" accept="image/*" className="w-full text-sm border border-gray-300 rounded-lg file:mr-4 file:py-2.5 file:px-4 file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={e => {
                        if (e.target.files && e.target.files.length > 0) {
                            setEditProfileData({...editProfileData, national_id_photo_direct: e.target.files[0]});
                        }
                    }} />
                  </div>
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3 shrink-0">
              <button type="submit" form="edit-profile-form" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition shadow-sm disabled:opacity-50">
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
              <button type="button" onClick={() => setIsEditProfileModalOpen(false)} className="px-6 bg-white border border-gray-300 text-gray-700 font-bold py-2.5 rounded-xl hover:bg-gray-50 transition shadow-sm">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Helper Components
function AttachmentCard({ name, url, required = false }: { name: string, url: string | null, required?: boolean }) {
    if (!url) {
        return (
            <div className="p-3 border border-red-100 bg-red-50 rounded-xl flex items-center justify-between">
                <span className="text-sm font-medium text-red-800">{name}</span>
                {required && <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded font-bold">مطلوب</span>}
            </div>
        );
    }
    return (
        <div className="p-3 border border-gray-200 hover:border-green-400 hover:shadow-md bg-white rounded-xl flex items-center justify-between transition group cursor-pointer">
            <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                <span className="text-sm font-bold text-gray-800 truncate">{name}</span>
            </div>
            <a href={url} target="_blank" className="text-xs bg-gray-100 hover:bg-green-100 text-gray-600 hover:text-green-700 px-3 py-1 rounded font-bold transition">عرض</a>
        </div>
    );
}

function ChecklistItem({ checked, text }: { checked: boolean, text: string }) {
    return (
        <li className={`flex items-start gap-2 ${checked ? 'text-gray-900' : 'text-gray-400'}`}>
            <span className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white ${checked ? 'bg-green-500' : 'bg-gray-300'}`}>
               {checked ? '✓' : '✗'}
            </span>
            <span className={checked ? 'font-bold' : ''}>{text}</span>
        </li>
    );
}
