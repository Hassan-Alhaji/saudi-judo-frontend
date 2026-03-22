"use client";
import { API_URL, HOST_URL } from '@/lib/api';

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import toast, { Toaster } from "react-hot-toast";
import JudoLoader from "../../../components/JudoLoader";

export default function ProfilePage() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Calculate today's date for the min attribute of the date picker
  const todayDate = new Date().toISOString().split('T')[0];

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPendingTicket, setHasPendingTicket] = useState(false);

  // Full-screen card state
  const [showFullScreenCard, setShowFullScreenCard] = useState(false);

  // Dynamic dropdowns state
  const [dropdowns, setDropdowns] = useState<{city: any[], nationality: any[], club: any[]}>({ city: [], nationality: [], club: [] });

  const [editData, setEditData] = useState({
    first_name_ar: '',
    father_name_ar: '',
    last_name_ar: '',
    first_name_en: '',
    father_name_en: '',
    last_name_en: '',
    phone_number: '',
    city: '',
    club: '',
    blood_type: '',
    emergency_number: '',
    id_expiry_date: '',
    weight: '',
    gender: '',
    bank_account: '',
    fursan_number: '',
    id_type: '',
    national_id: '',
    nationality: ''
  });
  const [personalPhoto, setPersonalPhoto] = useState<File | null>(null);
  const [nationalIdPhoto, setNationalIdPhoto] = useState<File | null>(null);
  const [directNationalIdPhoto, setDirectNationalIdPhoto] = useState<File | null>(null);

  // Check if sensitive data is changed to demand ID photo
  const needsApproval =
    (editData.first_name_ar && editData.first_name_ar !== userData?.first_name_ar) ||
    (editData.father_name_ar && editData.father_name_ar !== userData?.father_name_ar) ||
    (editData.last_name_ar && editData.last_name_ar !== userData?.last_name_ar) ||
    (editData.first_name_en && editData.first_name_en !== userData?.first_name_en) ||
    (editData.father_name_en && editData.father_name_en !== userData?.father_name_en) ||
    (editData.last_name_en && editData.last_name_en !== userData?.last_name_en) ||
    (personalPhoto !== null);

  useEffect(() => {
    // TEMPORARY: Bypass Firebase Auth and use Django user from localStorage
    const loadProfile = async () => {
      try {
        const { getDjangoUser } = require("../../../lib/api");
        const djangoUser = getDjangoUser();

        if (!djangoUser) {
          setLoading(false);
          return;
        }

        // We simulate having a docSnap with the data from localStorage
        const data = djangoUser;

        // Match the expected variable names used in render
        data.name_ar = data.name;
        // The backend determines if it's active or has pending ticket
        data.is_active_member = data.is_active_member ?? true; // fallback to true 

        // Check for pending profile update tickets
        try {
          const { apiRequest } = require("../../../lib/api");
          const ticketRes = await apiRequest("/tickets/my/");
          if (ticketRes.ok) {
            const tickets = await ticketRes.json();
            const pendingProfileTicket = tickets.find((t: any) =>
              t.ticket_type === 'profile_update' &&
              ['open', 'pending_coach', 'pending_cs', 'pending_supervisor', 'pending_committee', 'pending_ceo', 'returned'].includes(t.status)
            );
            if (pendingProfileTicket) {
              setHasPendingTicket(true);
            }
          }
        } catch (err) {
          console.error("Failed to fetch tickets status", err);
        }

        // Fetch belt name from backend if current_belt_id exists
        if (data.current_belt_id) {
          try {
            const res = await fetch(`${API_URL}/belts/`);
            const belts = await res.json();
            const beltObj = belts.find((b: any) => String(b.id) === String(data.current_belt_id));
            if (beltObj) {
              data.current_belt_name_ar = beltObj.display_name || beltObj.name_display || beltObj.name;
              data.current_belt_color = beltObj.name;
            }
          } catch (err) {
            console.error("Failed to fetch belts", err);
          }
        }

        // Fetch dynamic dropdowns
        try {
          const { apiGet } = require("../../../lib/api");
          const dropRes = await apiGet("dropdowns/");
          if (dropRes.ok) {
            const dropData = await dropRes.json();
            setDropdowns({
              city: dropData.city || [],
              nationality: dropData.nationality || [],
              club: dropData.club || []
            });
          }
        } catch (err) {
           console.error("Failed to load dropdowns", err);
        }

        setUserData(data);
        setEditData({
          first_name_ar: data.first_name_ar || '',
          father_name_ar: data.father_name_ar || '',
          last_name_ar: data.last_name_ar || '',
          first_name_en: data.first_name_en || '',
          father_name_en: data.father_name_en || '',
          last_name_en: data.last_name_en || '',
          phone_number: data.phone_number || '',
          city: data.city || '',
          club: data.club || '',
          blood_type: data.blood_type || '',
          emergency_number: data.emergency_number || '',
          id_expiry_date: data.id_expiry_date || '',
          weight: data.weight || '',
          gender: data.gender || '',
          bank_account: data.bank_account || '',
          fursan_number: data.fursan_number || '',
          id_type: data.id_type || '',
          national_id: data.national_id || '',
          nationality: data.nationality || ''
        });
      } catch (err) {
        console.error("Error loading profile", err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('first_name_ar', editData.first_name_ar);
    formData.append('father_name_ar', editData.father_name_ar);
    formData.append('last_name_ar', editData.last_name_ar);
    formData.append('first_name_en', editData.first_name_en);
    formData.append('father_name_en', editData.father_name_en);
    formData.append('last_name_en', editData.last_name_en);
    formData.append('phone_number', editData.phone_number);
    formData.append('city', editData.city);
    formData.append('club_name', editData.club); // Map 'club' to 'club_name' on backend
    formData.append('blood_type', editData.blood_type);
    formData.append('emergency_number', editData.emergency_number);
    formData.append('id_expiry_date', editData.id_expiry_date);
    formData.append('weight', editData.weight);
    formData.append('gender', editData.gender);
    formData.append('bank_account', editData.bank_account);
    formData.append('fursan_number', editData.fursan_number);
    formData.append('id_type', editData.id_type);
    formData.append('national_id', editData.national_id);
    formData.append('nationality', editData.nationality);

    if (personalPhoto) formData.append('personal_photo', personalPhoto);
    if (needsApproval && nationalIdPhoto) {
      formData.append('national_id_photo', nationalIdPhoto);
    }

    // Add the direct ID photo from state if selected
    if (directNationalIdPhoto) {
      formData.append('national_id_photo_direct', directNationalIdPhoto);
    }

    try {
      const { apiRequest } = require("../../../lib/api");
      const res = await apiRequest("/profile/update/", {
        method: "POST",
        body: formData,
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || 'حدث خطأ أثناء تحديث البيانات');
      }

      // Update local state with the newly saved data from server
      if (responseData.user) {
        setUserData((prev: any) => ({ ...prev, ...responseData.user }));
        setEditData((prev: any) => ({ ...prev, ...responseData.user }));

        // Update the globally stored user data so it persists across reloads
        const { storeUserData, getDjangoUser } = require("../../../lib/api");
        const currentUserData = getDjangoUser() || {};
        storeUserData({ ...currentUserData, ...responseData.user, name: `${responseData.user.name_ar}` });
      }

      if (responseData.status === 'ticket_created') {
        toast.success('تم تحديث البيانات، حسابك الآن قيد المراجعة بانتظار اعتماد التذكرة.', { duration: 4000 });
        setHasPendingTicket(true);
      } else {
        toast.success('تم تحديث البيانات بنجاح.', { duration: 3000 });
      }

      setIsEditing(false);

      // Reload page to fetch the newly uploaded files reliably since they are URLs, and to clear out the file inputs cleanly
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء تحديث البيانات', { duration: 4000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <JudoLoader size="md" text="جاري تحميل الملف الشخصي..." className="my-10" />;

  const isActiveMember = userData?.is_active_member || false;
  const sajId = userData?.saj_id || "SAJ-0000";
  const verificationData = `موثقة من قبل الاتحاد السعودي للجودو
الاسم: ${userData?.first_name_ar || ''} ${userData?.last_name_ar || ''} - ${userData?.first_name_en || ''} ${userData?.last_name_en || ''}
رقم اللاعب: ${sajId}
`;

  // Mapping belt colors for digital card styling
  const beltColors: Record<string, string> = {
    yellow: "bg-yellow-400 text-black",
    orange: "bg-orange-500 text-white",
    green: "bg-green-600 text-white",
    blue: "bg-blue-600 text-white",
    brown: "bg-yellow-800 text-white",
    black_1: "bg-black text-white outline outline-2 outline-yellow-500 outline-offset-[-4px]",
    black_2: "bg-gray-900 text-white outline outline-2 outline-yellow-500 outline-offset-[-4px]",
    black_3: "bg-gray-900 text-white outline outline-2 outline-yellow-500 outline-offset-[-4px]",
    black_4: "bg-gray-900 text-white outline outline-2 outline-yellow-500 outline-offset-[-4px]",
    black_5: "bg-gray-900 text-white outline outline-2 outline-yellow-500 outline-offset-[-4px]",
    black_6: "bg-gray-900 text-white outline outline-2 outline-yellow-500 outline-offset-[-4px]",
    white: "bg-white text-black border border-gray-300",
  };
  const currentBeltStyle = beltColors[userData?.current_belt_color || "white"] || beltColors.white;

  // Dynamic Avatar border based on belt
  const getBeltBorderColor = (beltName: string) => {
    if (!beltName) return "border-white/20";
    const borders: Record<string, string> = {
      white: "border-gray-200",
      yellow: "border-yellow-400",
      orange: "border-orange-500",
      green: "border-green-600",
      blue: "border-blue-600",
      brown: "border-amber-800",
    };
    if (beltName.startsWith('black')) return "border-black shadow-[0_0_0_2px_#EAB308]"; // Black with gold ring
    return borders[beltName] || "border-white/20";
  };
  const avatarBorderClass = getBeltBorderColor(userData?.current_belt_color);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Toaster position="top-center" />

      {/* Header Removed as requested by user */}

      {isActiveMember && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>البطاقة الرقمية الرسمية</span>
            <span className="text-sm font-normal text-green-600 bg-green-100 px-2 py-0.5 rounded-full border border-green-200">فعالة</span>
          </h2>

          {/* Digital Card Design */}
          <div
            className="relative w-full max-w-lg md:max-w-2xl mx-auto aspect-[1.586/1] rounded-2xl shadow-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-black border border-gray-800 font-cairo cursor-pointer hover:scale-[1.02] transition-transform"
            onClick={() => setShowFullScreenCard(true)}
            title="اضغط لتكبير البطاقة"
          >

            {/* Pattern Background Overlay */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>

            <div className="absolute inset-0 p-4 md:p-5 flex flex-col justify-between" dir="ltr">
              {/* Header */}
              <div className="flex justify-between items-start w-full gap-2 shrink-0">
                {/* Top Left Logo */}
                <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center overflow-hidden p-1 shadow-sm shrink-0">
                  <img src="/logo.png" alt="Saudi Judo" className="w-full h-full object-contain" />
                </div>

                {/* Top Center ID */}
                <div className="flex flex-col items-center justify-center bg-black/40 rounded px-2 md:px-3 py-1 border border-white/10 mt-1 shrink-0">
                  <p className="text-gray-400 text-[8px] md:text-[9px] uppercase tracking-wider">ID / رقم العضوية</p>
                  <p className="text-white font-bold text-[12px] md:text-[14px] font-mono leading-none mt-1">{sajId}</p>
                </div>

                {/* Top Right Title */}
                <div className="flex flex-col items-end text-right shrink-0 mt-1">
                  <span className="text-white font-black text-[12px] md:text-[15px] tracking-widest uppercase font-sans">SAUDI JUDO</span>
                </div>
              </div>

              {/* Body */}
              <div className="flex w-full flex-1 mt-2 overflow-hidden relative">
                {/* Left Side (Grid + QR) */}
                <div className="flex-1 flex flex-col justify-start pr-2 h-full relative z-10 overflow-hidden">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 md:gap-y-2 mt-1">
                    {/* Col 1 */}
                    <div className="flex flex-col gap-y-1 md:gap-y-1.5 items-end text-right">
                      <div>
                        <p className="text-gray-400 text-[10px] md:text-[11px] uppercase tracking-wider mb-0.5">GENDER / الجنس</p>
                        <p className="text-white font-bold text-[14px] md:text-[16px] leading-none">{userData?.gender === 'M' ? 'ذكر - M' : (userData?.gender === 'F' ? 'أنثى - F' : '---')}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-[10px] md:text-[11px] uppercase tracking-wider mb-0.5">CLUB / النادي</p>
                        <p className="text-white font-bold text-[14px] md:text-[16px] leading-none truncate">{userData?.club || '---'}</p>
                      </div>
                    </div>

                    {/* Col 2 */}
                    <div className="flex flex-col gap-y-1 md:gap-y-1.5 items-end text-right pr-2">
                      <div>
                        <p className="text-gray-400 text-[10px] md:text-[11px] uppercase tracking-wider mb-0.5">PLAYER NAME / الاسم</p>
                        <p className="text-white font-bold text-[16px] md:text-[20px] leading-tight truncate">{userData?.name_ar || 'غير مسجل'}</p>
                        <p className="text-gray-300 font-bold text-[12px] md:text-[14px] leading-tight opacity-80 mt-1">{userData?.name_en || ''}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-[10px] md:text-[11px] uppercase tracking-wider mb-0.5">NAT / الجنسية</p>
                        <p className="text-white font-bold text-[14px] md:text-[16px] leading-none truncate">{userData?.nationality || '---'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-[10px] md:text-[11px] uppercase tracking-wider mb-0.5">BLOOD / فصيلة الدم</p>
                        <p className="text-red-400 font-bold text-[15px] md:text-[17px] leading-none">{userData?.blood_type || '---'}</p>
                      </div>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="mt-2 mb-auto shrink-0 self-start bg-white p-2 md:p-2.5 rounded-lg shadow-md">
                    <QRCodeSVG value={verificationData} size={56} className="w-14 h-14 md:w-20 md:h-20" level="H" bgColor="#FFFFFF" fgColor="#000000" />
                  </div>
                </div>

                {/* Right Side (Photo + Belt) */}
                <div className="flex flex-col items-center shrink-0 w-[28%] max-w-[120px] md:max-w-[150px] h-full justify-start relative z-10">
                  <div className={`w-full shrink-0 aspect-[3/4] bg-gray-800 rounded-lg border-2 ${userData?.current_belt_color ? avatarBorderClass : 'border-white/20'} overflow-hidden shadow-inner flex items-center justify-center text-4xl`}>
                    {(userData?.personal_photo_url || userData?.personal_photo) ? (
                        <img
                        src={userData.personal_photo_url || (userData.personal_photo.startsWith('http') ? userData.personal_photo : `${HOST_URL}${userData.personal_photo}`)}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          img.style.display = 'none';
                          img.parentElement!.innerHTML = "👤";
                        }}
                        />
                    ) : "👤"}
                  </div>
                  <div className="w-full mt-2 text-center bg-black/40 py-1.5 rounded-lg border border-white/5 shrink-0">
                    <p className="text-gray-400 text-[10px] md:text-[11px] uppercase tracking-wider mb-1">BELT / الحزام</p>
                    <div className={`mx-auto w-[90%] px-1 py-1.5 rounded-md text-[12px] md:text-[14px] font-bold shadow-sm ${currentBeltStyle}`}>
                        {userData?.current_belt_name_ar || 'أبيض (مبتدئ)'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Text directly inside the card */}
              <div className="w-full shrink-0 text-center border-t border-white/10 mt-1.5 pt-1">
                <p className="text-[7px] md:text-[8px] text-gray-400 font-medium opacity-80" dir="rtl">هذه البطاقة رقمية معتمدة من قبل الاتحاد السعودي للجودو. يرجى مسح رمز الـ QR للتحقق من الصلاحية.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isActiveMember && (
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl shrink-0">⏳</div>
          <div>
            <h3 className="text-blue-800 font-bold text-sm">حسابك قيد المراجعة</h3>
            <p className="text-blue-600 text-xs mt-1 leading-relaxed">جاري التحقق من البيانات والمطابقة من قبل خدمة العملاء. سيتم تفعيل حسابك وإصدار بطاقتك الرقمية الرسمية فور الانتهاء من الاعتماد.</p>
          </div>
        </div>
      )}

      {/* Main Data Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">السجل المدني والبيانات</h2>
          {!isEditing && isActiveMember && (
            <button
              onClick={() => setIsEditing(true)}
              disabled={hasPendingTicket}
              className={`text-sm bg-white border border-gray-200 shadow-sm text-gray-700 px-4 py-1.5 rounded-lg font-medium ${hasPendingTicket ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'hover:bg-gray-50 transition-colors'}`}>
              {hasPendingTicket ? 'تحديث البيانات قيد المراجعة' : 'تعديل البيانات'}
            </button>
          )}
        </div>

        <div className="p-6">
          {!isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex flex-col justify-center space-y-1 hover:shadow-md transition-shadow">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">الاسم الكامل (عربي)</span>
                <span className="text-base font-bold text-gray-900">{userData?.name_ar || '---'}</span>
              </div>

              <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex flex-col justify-center space-y-1 hover:shadow-md transition-shadow">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">الاسم الكامل (إنجليزي)</span>
                <span className="text-base font-bold text-gray-900">{userData?.name_en || '---'}</span>
              </div>

              <div className="bg-white border text-center border-green-100 shadow-sm rounded-xl p-4 flex flex-col justify-center space-y-1 hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute top-0 right-0 w-8 h-8 bg-green-50 rounded-bl-full" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">رقم العضوية (SAJ ID)</span>
                <span className="text-lg font-black text-green-700 tracking-wider font-mono">{userData?.saj_id || '---'}</span>
              </div>

              <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex flex-col justify-center space-y-1 hover:shadow-md transition-shadow">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">نوع الهوية</span>
                <span className="text-base font-bold text-gray-900">
                  {userData?.id_type === 'national_id' ? 'هوية وطنية' :
                    userData?.id_type === 'iqama' ? 'إقامة' :
                      userData?.id_type === 'passport' ? 'جواز سفر' : '---'}
                </span>
              </div>

              <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex flex-col justify-center space-y-1 hover:shadow-md transition-shadow">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">رقم الهوية / الإقامة / الجواز</span>
                <span className="text-base font-bold text-gray-900 tabular-nums">{userData?.national_id || '---'}</span>
              </div>

              <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex flex-col justify-center space-y-1 hover:shadow-md transition-shadow">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">الجنسية</span>
                <span className="text-base font-bold text-gray-900">{userData?.nationality || '---'}</span>
              </div>

              <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex flex-col justify-center space-y-1 hover:shadow-md transition-shadow">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">تاريخ الميلاد</span>
                <span className="text-base font-bold text-gray-900 tabular-nums">{userData?.birth_date || '---'}</span>
              </div>

              <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex flex-col justify-center space-y-1 hover:shadow-md transition-shadow">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">رقم الجوال</span>
                <span className="text-base font-bold text-gray-900 tabular-nums" dir="ltr">{userData?.phone_number || '---'}</span>
              </div>

              <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex flex-col justify-center space-y-1 hover:shadow-md transition-shadow">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">الجنس</span>
                <span className="text-base font-bold text-gray-900">{userData?.gender === 'M' ? 'ذكر' : userData?.gender === 'F' ? 'أنثى' : '---'}</span>
              </div>

              <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex flex-col justify-center space-y-1 hover:shadow-md transition-shadow">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">فصيلة الدم</span>
                <span className="text-base font-bold text-red-600 font-serif flex items-center justify-start gap-1">
                 {userData?.blood_type ? <span dir="ltr">{userData.blood_type}</span> : '---'}
                </span>
              </div>

              <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex flex-col justify-center space-y-1 hover:shadow-md transition-shadow">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">الوزن</span>
                <span className="text-base font-bold text-gray-900 tabular-nums">{userData?.weight ? `${userData.weight} كجم` : '---'}</span>
              </div>

              <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex flex-col justify-center space-y-1 hover:shadow-md transition-shadow">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">الحزام الحالي</span>
                <span className="text-base font-bold text-gray-900">{userData?.current_belt_name_ar || 'أبيض (مبتدئ)'}</span>
              </div>

              <div className="bg-white border border-red-50 shadow-sm rounded-xl p-4 flex flex-col justify-center space-y-1 hover:shadow-md transition-shadow">
                <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">رقم الطوارئ</span>
                <span className="text-base font-bold text-red-700 tabular-nums" dir="ltr">{userData?.emergency_number || '---'}</span>
              </div>

              <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex flex-col justify-center space-y-1 hover:shadow-md transition-shadow">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">تاريخ انتهاء الهوية</span>
                <span className="text-base font-bold text-gray-900 tabular-nums">{userData?.id_expiry_date || '---'}</span>
              </div>

              <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex flex-col justify-center space-y-1 hover:shadow-md transition-shadow">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">المدينة</span>
                <span className="text-base font-bold text-gray-900">{userData?.city || '---'}</span>
              </div>

              <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex flex-col justify-center space-y-1 hover:shadow-md transition-shadow">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">النادي / المركز الحالي</span>
                <span className="text-base font-bold text-gray-900">{userData?.club || '---'}</span>
              </div>

              <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex flex-col justify-center space-y-1 hover:shadow-md transition-shadow">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">رقم الحساب البنكي (IBAN)</span>
                <span className="text-base font-bold text-gray-900 tabular-nums" dir="ltr">{userData?.bank_account || '---'}</span>
              </div>

              <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex flex-col justify-center space-y-1 hover:shadow-md transition-shadow">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">رقم الفرسان</span>
                <span className="text-base font-bold text-gray-900 tabular-nums">{userData?.fursan_number || '---'}</span>
              </div>

              <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex flex-col justify-center space-y-1 hover:shadow-md transition-shadow">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">البريد الإلكتروني المربوط</span>
                <span className="text-sm font-bold text-gray-900 truncate" dir="ltr">{userData?.email || '---'}</span>
              </div>

              <div className="bg-white border border-blue-100 shadow-sm rounded-xl p-4 flex flex-col justify-center space-y-2 hover:shadow-md transition-shadow md:col-span-2 lg:col-span-3">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">مرفق الهوية الوطنية / الجواز</span>
                <span className="text-sm font-bold text-blue-700">
                  {userData?.national_id_photo_url ? (
                    <a href={userData.national_id_photo_url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg w-max">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                      عرض المرفق الحالي للهوية
                    </a>
                  ) : <span className="text-gray-400">لا يوجد مرفق للهوية مسجل حالياً</span>}
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleProfileUpdate} className="space-y-6">

              {/* Photo Update Section at the Top */}
              <div className="flex flex-col items-center border-b pb-6">
                <div className={`relative w-32 h-32 bg-gray-100 rounded-full border-4 ${userData?.current_belt_color ? avatarBorderClass : 'border-white'} shadow-md overflow-hidden flex items-center justify-center text-gray-400 group cursor-pointer shrink-0`} onClick={() => document.getElementById('photo-upload')?.click()}>
                  {personalPhoto ? (
                    <img src={URL.createObjectURL(personalPhoto)} alt="New Profile" className="w-full h-full object-cover" />
                  ) : userData?.personal_photo || userData?.personal_photo_url ? (
                    <img src={userData.personal_photo || userData.personal_photo_url} alt="Current Profile" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  )}

                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2-2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                </div>
                <input id="photo-upload" type="file" accept="image/*" onChange={(e) => setPersonalPhoto(e.target.files?.[0] || null)} className="hidden" />
                <span className="text-xs text-gray-500 font-bold mt-2">انقر لتحديث الصورة الشخصية</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">الاسم الأول (عربي) <span className="text-red-500">*</span></label>
                  <input type="text" name="first_name_ar" value={editData.first_name_ar} onChange={handleInputChange} pattern="^[\u0621-\u064A\s]+$" title="الرجاء إدخال أحرف عربية فقط" required className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">اسم الأب (عربي) <span className="text-red-500">*</span></label>
                  <input type="text" name="father_name_ar" value={editData.father_name_ar} onChange={handleInputChange} pattern="^[\u0621-\u064A\s]+$" title="الرجاء إدخال أحرف عربية فقط" required className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">اسم العائلة (عربي) <span className="text-red-500">*</span></label>
                  <input type="text" name="last_name_ar" value={editData.last_name_ar} onChange={handleInputChange} pattern="^[\u0621-\u064A\s]+$" title="الرجاء إدخال أحرف عربية فقط" required className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">الاسم الأول (إنجليزي) <span className="text-red-500">*</span></label>
                  <input type="text" name="first_name_en" value={editData.first_name_en} onChange={handleInputChange} pattern="^[a-zA-Z\s]+$" title="الرجاء إدخال أحرف إنجليزية فقط" required className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">اسم الأب (إنجليزي) <span className="text-red-500">*</span></label>
                  <input type="text" name="father_name_en" value={editData.father_name_en} onChange={handleInputChange} pattern="^[a-zA-Z\s]+$" title="الرجاء إدخال أحرف إنجليزية فقط" required className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">اسم العائلة (إنجليزي) <span className="text-red-500">*</span></label>
                  <input type="text" name="last_name_en" value={editData.last_name_en} onChange={handleInputChange} pattern="^[a-zA-Z\s]+$" title="الرجاء إدخال أحرف إنجليزية فقط" required className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">نوع الهوية <span className="text-red-500">*</span></label>
                  <select name="id_type" value={editData.id_type} onChange={handleInputChange as any} required className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500">
                    <option value="">-- اختر نوع الهوية --</option>
                    <option value="national_id">هوية وطنية</option>
                    <option value="iqama">إقامة</option>
                    <option value="passport">جواز سفر</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">رقم الهوية / الإقامة / الجواز <span className="text-red-500">*</span></label>
                  <input type="text" name="national_id" value={editData.national_id} onChange={handleInputChange} required className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500" dir="ltr" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">الجنسية <span className="text-red-500">*</span></label>
                  <select name="nationality" value={editData.nationality} onChange={handleInputChange as any} required className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500">
                    <option value="">-- اختر الجنسية --</option>
                    {dropdowns.nationality.map((item: any) => (
                      <option key={item.id} value={item.name_en}>{item.name_ar}</option>
                    ))}
                    {/* Fallback to show the current one even if it was deleted */}
                    {editData.nationality && !dropdowns.nationality.find((i: any) => i.name_en === editData.nationality) && (
                         <option value={editData.nationality}>{editData.nationality}</option>
                    )}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">رقم الجوال <span className="text-red-500">*</span></label>
                  <input type="tel" name="phone_number" value={editData.phone_number} onChange={handleInputChange} pattern="^[0-9]+$" title="أرقام فقط" required className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500" dir="ltr" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">المدينة</label>
                  <select name="city" value={editData.city} onChange={handleInputChange as any} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500">
                    <option value="">-- اختر المدينة --</option>
                    {dropdowns.city.map((item: any) => (
                      <option key={item.id} value={item.name_ar}>{item.name_ar}</option>
                    ))}
                    {editData.city && !dropdowns.city.find((i: any) => i.name_ar === editData.city) && (
                         <option value={editData.city}>{editData.city}</option>
                    )}
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-gray-700">النادي / المركز الحالي</label>
                  <select name="club" value={editData.club} onChange={handleInputChange as any} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500">
                    <option value="">-- اختر النادي --</option>
                    {dropdowns.club.map((item: any) => (
                      <option key={item.id} value={item.name_ar}>{item.name_ar}</option>
                    ))}
                    {editData.club && !dropdowns.club.find((i: any) => i.name_ar === editData.club) && (
                         <option value={editData.club}>{editData.club}</option>
                    )}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">الجنس</label>
                  <select name="gender" value={editData.gender} onChange={handleInputChange as any} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500">
                    <option value="">غير محدد</option>
                    <option value="M">ذكر</option>
                    <option value="F">أنثى</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">فصيلة الدم</label>
                  <select name="blood_type" value={editData.blood_type} onChange={handleInputChange as any} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500" dir="ltr">
                    <option value="">غير محدد</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">رقم الطوارئ</label>
                  <input type="tel" name="emergency_number" value={editData.emergency_number} onChange={handleInputChange} pattern="^[0-9]+$" title="أرقام فقط" className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500" dir="ltr" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">تاريخ انتهاء الهوية</label>
                  <input type="date" name="id_expiry_date" value={editData.id_expiry_date} onChange={handleInputChange} min={todayDate} title="تاريخ الانتهاء يجب ألا يكون في الماضي" className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">الوزن (كجم)</label>
                  <input type="number" step="0.5" name="weight" value={editData.weight} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">رقم الحساب البنكي (IBAN)</label>
                  <input type="text" name="bank_account" value={editData.bank_account} onChange={handleInputChange} minLength={22} title="رقم الحساب البنكي يجب ألا يقل عن ٢٢ خانة" className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500" dir="ltr" placeholder="SA..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">رقم الفرسان (اختياري)</label>
                  <input type="text" name="fursan_number" value={editData.fursan_number} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500" />
                </div>

                <div className="space-y-2 md:col-span-2 mt-2">
                  <label className="text-sm font-bold text-gray-700">إرفاق بطاقة الهوية الوطنية / الإقامة / الجواز (للتحديث) <span className="text-red-500">*</span></label>
                  <input type="file" name="national_id_photo_direct" id="national_id_photo_direct" accept="image/*,.pdf" onChange={(e) => setDirectNationalIdPhoto(e.target.files?.[0] || null)} required={!userData?.national_id_photo_url} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-200 rounded-xl cursor-pointer" />
                  <p className="text-xs text-gray-500">يُرجى إرفاق نسخة محدثة من الهوية لضمان استمرار تنشيط العضوية. {userData?.national_id_photo_url ? '(يوجد لديك مرفق حالياً، يمكنك مراجعته في الأعلى، ارفع ملفاً جديداً لتبديله)' : '(هذا الحقل إلزامي)'}</p>
                </div>
              </div>

              {needsApproval && (
                <div className="mt-6 border border-orange-200 bg-orange-50 rounded-xl p-5 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xl shrink-0">⚠️</div>
                    <div>
                      <h4 className="font-bold text-orange-800">يتطلب مراجعة خدمة العملاء</h4>
                      <p className="text-orange-700 text-sm mt-1">تعديلك للاسم أو الصورة الشخصية يتطلب مراجعة من قبل الإدارة. سيتم إيقاف البطاقة الرقمية مؤقتاً لحين الاعتماد، الرجاء التأكد من إرفاق صورة واضحة للهوية في الحقل أعلاه.</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition shadow-md disabled:opacity-50 flex justify-center items-center gap-2">
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      جاري الحفظ...
                    </>
                  ) : 'حفظ التغييرات'}
                </button>
                <button type="button" onClick={() => setIsEditing(false)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition">
                  إلغاء
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Full Screen Digital Card Modal */}
      {showFullScreenCard && isActiveMember && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity" onClick={() => setShowFullScreenCard(false)}>
          <div className="absolute top-6 right-6 text-white text-4xl cursor-pointer bg-white/10 hover:bg-white/20 w-12 h-12 flex items-center justify-center rounded-full transition-colors z-[110]" onClick={() => setShowFullScreenCard(false)}>
            &times;
          </div>

          <div className="relative w-full aspect-[1.586/1] rounded-2xl shadow-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-black border-2 border-gray-700 font-cairo transform md:scale-100 scale-100 transition-transform duration-300 max-w-[95vw] md:max-w-3xl portrait:-rotate-90 portrait:w-[min(150vw,85vh)] portrait:max-w-none md:portrait:rotate-0 md:portrait:w-full md:portrait:max-w-3xl" onClick={(e) => e.stopPropagation()}>
            {/* Pattern Background Overlay */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>

            <div className="absolute inset-0 p-5 md:p-8 flex flex-col justify-between" dir="ltr">
              {/* Header */}
              <div className="flex justify-between items-start w-full gap-4 shrink-0">
                {/* Top Left Logo */}
                <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center overflow-hidden p-1 shadow-lg shrink-0">
                  <img src="/logo.png" alt="Saudi Judo Federation" className="w-full h-full object-contain" />
                </div>

                {/* Top Center ID */}
                <div className="flex flex-col items-center justify-center bg-black/40 rounded-lg px-3 md:px-5 py-1 border border-white/10 mt-0 md:mt-1 shrink-0">
                  <p className="text-gray-400 text-[10px] md:text-[12px] uppercase tracking-wider shadow-sm">ID / رقم العضوية</p>
                  <p className="text-white font-bold text-[14px] md:text-[17px] font-mono leading-none mt-1 shadow-sm">{sajId}</p>
                </div>

                {/* Top Right Title */}
                <div className="flex flex-col items-end text-right shrink-0 mt-1 md:mt-2">
                  <span className="text-white font-black text-[14px] md:text-[20px] tracking-widest uppercase font-sans">SAUDI JUDO</span>
                </div>
              </div>

              {/* Body */}
              <div className="flex w-full flex-1 mt-1 md:mt-2 overflow-hidden relative">
                {/* Left Side (Grid + QR) */}
                <div className="flex-1 flex flex-col justify-start pr-3 md:pr-6 h-full relative z-10 overflow-hidden">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0 md:gap-y-1 mt-0">
                    {/* Col 1 */}
                    <div className="flex flex-col gap-y-1 md:gap-y-2 items-end text-right">
                      <div>
                        <p className="text-gray-400 text-[12px] md:text-[14px] uppercase tracking-wider mb-0.5 shadow-sm">GENDER / الجنس</p>
                        <p className="text-white font-bold text-[15px] md:text-[18px] leading-none shadow-sm">{userData?.gender === 'M' ? 'ذكر - M' : (userData?.gender === 'F' ? 'أنثى - F' : '---')}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-[12px] md:text-[14px] uppercase tracking-wider mb-0.5 shadow-sm">CLUB / النادي</p>
                        <p className="text-white font-bold text-[15px] md:text-[18px] leading-none truncate shadow-sm">{userData?.club || '---'}</p>
                      </div>
                    </div>

                    {/* Col 2 */}
                    <div className="flex flex-col gap-y-1 md:gap-y-2 items-end text-right pr-3 md:pr-4">
                      <div>
                        <p className="text-gray-400 text-[12px] md:text-[14px] uppercase tracking-wider mb-0.5 shadow-sm">PLAYER NAME / الاسم</p>
                        <p className="text-white font-bold text-[18px] md:text-[25px] leading-tight truncate shadow-sm">{userData?.name_ar || 'غير مسجل'}</p>
                        <p className="text-gray-300 font-bold text-[13px] md:text-[16px] leading-tight opacity-80 mt-0.5 shadow-sm">{userData?.name_en || ''}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-[12px] md:text-[14px] uppercase tracking-wider mb-0.5 shadow-sm">NAT / الجنسية</p>
                        <p className="text-white font-bold text-[15px] md:text-[18px] leading-none truncate shadow-sm">{userData?.nationality || '---'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-[12px] md:text-[14px] uppercase tracking-wider mb-0.5 shadow-sm">BLOOD / فصيلة الدم</p>
                        <p className="text-red-400 font-bold text-[16px] md:text-[19px] leading-none shadow-sm">{userData?.blood_type || '---'}</p>
                      </div>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="mt-0.5 md:mt-1 mb-auto shrink-0 self-start bg-white p-1.5 md:p-2.5 rounded-lg shadow-lg text-black">
                    <QRCodeSVG value={verificationData} size={64} className="w-16 h-16 md:w-24 md:h-24" level="H" bgColor="#FFFFFF" fgColor="#000000" />
                  </div>
                </div>

                {/* Right Side (Photo + Belt) */}
                <div className="flex flex-col items-center shrink-0 w-[24%] max-w-[120px] md:max-w-[150px] h-full justify-start relative z-10">
                  <div className={`w-full shrink-0 aspect-[3/4] bg-gray-800 rounded-lg border-4 ${userData?.current_belt_color ? avatarBorderClass : 'border-white/20'} overflow-hidden shadow-inner flex items-center justify-center text-4xl md:text-5xl`}>
                    {(userData?.personal_photo_url || userData?.personal_photo) ? (
                        <img
                        src={userData.personal_photo_url || (userData.personal_photo.startsWith('http') ? userData.personal_photo : `${HOST_URL}${userData.personal_photo}`)}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          img.style.display = 'none';
                          img.parentElement!.innerHTML = "👤";
                        }}
                        />
                    ) : "👤"}
                  </div>
                  <div className="w-full mt-2 md:mt-3 text-center bg-black/40 py-2 rounded-lg border border-white/5 shrink-0">
                    <p className="text-gray-400 text-[11px] md:text-[13px] uppercase tracking-wider mb-1 shadow-sm">BELT / الحزام</p>
                    <div className={`mx-auto w-[90%] px-2 py-1.5 md:py-2 rounded md:rounded-md text-[13px] md:text-[15px] font-bold shadow-sm ${currentBeltStyle}`}>
                        {userData?.current_belt_name_ar || 'أبيض (مبتدئ)'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Text directly inside the card */}
              <div className="w-full shrink-0 text-center border-t border-white/10 mt-1 md:mt-2 pt-1 md:pt-1.5">
                <p className="text-[10px] md:text-[12px] text-gray-500 font-medium shadow-sm opacity-80" dir="rtl">هذه البطاقة رقمية معتمدة من قبل الاتحاد السعودي للجودو. يرجى مسح رمز الـ QR للتحقق من الصلاحية.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
