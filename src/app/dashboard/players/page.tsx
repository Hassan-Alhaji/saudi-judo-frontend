"use client";

import { useState, useEffect } from 'react';
import { apiGet, apiDelete, apiPut } from '@/lib/api';
import JudoLoader from '@/components/JudoLoader';

interface User {
    id: number;
    name: string;
    email: string;
    saj_id: string;
    role: string;
    phone_number: string;
    is_active: boolean;
    is_active_member: boolean;
    current_belt?: string;
}

const ROLE_OPTIONS = [
    { value: 'player', label: 'لاعب الجودو (Player)' },
    { value: 'coach', label: 'مدرب اللاعبين (Coach)' },
];

export default function PlayersAndCoachesPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isAdminOrCanEdit, setIsAdminOrCanEdit] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isCS, setIsCS] = useState(false);
    
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [saving, setSaving] = useState(false);

    // Messaging states
    const [messageUser, setMessageUser] = useState<User | null>(null);
    const [messageText, setMessageText] = useState('');
    const [messageType, setMessageType] = useState('other');
    const [sendingMessage, setSendingMessage] = useState(false);

    // Export Modal States
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportStartDate, setExportStartDate] = useState("");
    const [exportEndDate, setExportEndDate] = useState("");

    useEffect(() => {
        const { getDjangoUser } = require('@/lib/api');
        const user = getDjangoUser();
        if (user && (user.role === 'admin' || user.permissions?.can_edit_memberships)) {
            setIsAdminOrCanEdit(true);
        }
        if (user && user.role === 'admin') {
            setIsAdmin(true);
        }
        if (user && user.role === 'customer_service') {
            setIsCS(true);
        }
        fetchUsers();
    }, [search]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const query = search ? `&search=${encodeURIComponent(search)}` : '';
            // Only fetch players and coaches
            const res = await apiGet(`/admin/users/?role=player,coach${query}`);
            if (res.ok) {
                const data = await res.json();
                if (data.results) {
                    setUsers(data.results);
                }
            }
        } catch (error) {
            console.error("Failed to fetch players and coaches", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadExcel = async () => {
        try {
            let url = 'admin/users/export/';
            const queryParams = [];
            if (exportStartDate) queryParams.push(`start_date=${exportStartDate}`);
            if (exportEndDate) queryParams.push(`end_date=${exportEndDate}`);
            
            if (queryParams.length > 0) {
                url += `?${queryParams.join('&')}`;
            }

            const res = await apiGet(url);
            if (!res.ok) {
                alert("حدث خطأ أثناء تحميل التقرير.");
                return;
            }
            
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `players_report_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(blobUrl);
            
            setShowExportModal(false); // Close modal on success
            setExportStartDate(""); // Reset fields
            setExportEndDate("");
        } catch (err) {
            console.error(err);
            alert("تعذر الاتصال بالخادم لتحميل التقرير.");
        }
    };

    const toggleMembershipStatus = async (user: User, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!confirm(`هل أنت متأكد من ${user.is_active_member ? 'إيقاف' : 'تفعيل'} عضوية ${user.name}؟`)) return;
        
        try {
            const { apiPost } = require('@/lib/api');
            const res = await apiPost('/admin/profile/update/', {
                saj_id: user.saj_id,
                is_active_member: !user.is_active_member
            });
            
            if (res.ok) {
                setUsers(users.map(u => 
                    u.id === user.id ? { ...u, is_active_member: !u.is_active_member } : u
                ));
            } else {
                alert("حدث خطأ أثناء تغيير حالة العضوية.");
            }
        } catch (error) {
            console.error("Failed to update membership status", error);
            alert("حدث خطأ في الاتصال.");
        }
    };

    const handleDelete = async (user: User, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!confirm(`هل أنت متأكد من حذف ${user.name}؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
        try {
            const res = await apiDelete(`/admin/users/${user.id}/delete/`);
            if (res.ok) {
                alert("تم الحذف بنجاح");
                fetchUsers();
            } else {
                const data = await res.json();
                alert(data.error || "حدث خطأ أثناء الحذف");
            }
        } catch(e) {
            alert("خطأ في الاتصال");
        }
    };

    const handleEditClick = (user: User, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setSelectedUser(user);
        setEditName(user.name || '');
        setEditEmail(user.email || '');
        setEditPhone(user.phone_number || '');
    };

    const handleEditSave = async () => {
        if (!selectedUser) return;
        setSaving(true);
        try {
            const res = await apiPut(`/admin/users/${selectedUser.id}/update/`, {
                name_ar: editName,
                email: editEmail,
                phone_number: editPhone
            });
            if (res.ok) {
                setSelectedUser(null);
                fetchUsers();
            } else {
                const data = await res.json();
                alert(data.error || "حدث خطأ أثناء التحديث");
            }
        } catch(e) {
            alert("خطأ في الاتصال");
        } finally {
            setSaving(false);
        }
    };

    const handleSendTicket = async () => {
        if (!messageUser || !messageText) return;
        setSendingMessage(true);
        try {
            const { apiPost } = require('@/lib/api');
            const res = await apiPost('tickets/create-for-user/', {
                target_user_id: messageUser.id,
                description: messageText,
                ticket_type: messageType
            });
            if (res.ok) {
                alert("تم إرسال الرسالة وإنشاء التذكرة بنجاح.");
                setMessageUser(null);
                setMessageText('');
            } else {
                const data = await res.json();
                alert(data.error || "حدث خطأ أثناء الإرسال.");
            }
        } catch(e) {
            alert("خطأ في الاتصال");
        } finally {
            setSendingMessage(false);
        }
    };

    const hasActions = isAdminOrCanEdit || isCS;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">اللاعبين والمدربين</h2>
                        <p className="text-gray-500">عرض قائمة مسجلين لعبة الجودو من اللاعبين والمدربين فقط.</p>
                    </div>
                    {isAdmin && (
                        <button 
                            onClick={() => setShowExportModal(true)}
                            className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-sm transition flex justify-center items-center gap-2"
                        >
                            <span>📥</span>
                            <span>تحميل تقرير الأعضاء (Excel)</span>
                        </button>
                    )}
                </div>

                {/* Search */}
                <div className="mb-6 relative">
                    <input 
                        type="text" 
                        placeholder="ابحث بالاسم، الإيميل، أو رقم العضوية..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full md:w-1/2 p-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-sm outline-none"
                    />
                    <span className="absolute right-3 top-3.5 text-gray-400">🔍</span>
                </div>

                {/* Table */}
                <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl">
                    <table className="w-full text-right text-sm text-gray-700">
                        <thead className="bg-gray-50 text-gray-900 font-bold border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4">اللاعب / المدرب</th>
                                <th className="px-6 py-4">رقم العضوية</th>
                                <th className="px-6 py-4">الحزام</th>
                                <th className="px-6 py-4">الإيميل</th>
                                <th className="px-6 py-4">رقم الجوال</th>
                                <th className="px-6 py-4">التصنيف</th>
                                {hasActions && <th className="px-6 py-4 text-center">الإجراءات</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10"><JudoLoader className="mx-auto" /></td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500 font-bold">لا توجد بيانات مطابقة.</td>
                                </tr>
                            ) : users.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 font-bold text-gray-900">{user.name || "غير محدد"}</td>
                                    <td className="px-6 py-4 font-mono text-green-700">{user.saj_id || "-"}</td>
                                    <td className="px-6 py-4">
                                        {user.current_belt ? (
                                            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-bold border border-gray-200">
                                                {user.current_belt}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 text-xs">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4" dir="ltr">{user.email}</td>
                                    <td className="px-6 py-4" dir="ltr">{user.phone_number || "-"}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'coach' ? 'bg-orange-50 text-orange-800' : 'bg-blue-50 text-blue-800'}`}>
                                            {ROLE_OPTIONS.find(r => r.value === user.role)?.label || user.role}
                                        </span>
                                    </td>
                                    {hasActions && (
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col gap-2 items-center justify-center">
                                                {isAdminOrCanEdit && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => toggleMembershipStatus(user, e)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center w-full max-w-[130px] ${
                                                            user.is_active_member 
                                                            ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200' 
                                                            : 'bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200'
                                                        }`}
                                                    >
                                                        <div className={`w-2 h-2 rounded-full ml-1.5 ${user.is_active_member ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                                                        {user.is_active_member ? 'عضوية فعّالة' : 'عضوية موقوفة'}
                                                    </button>
                                                )}
                                                
                                                <div className="flex gap-2 w-full max-w-[130px] justify-center flex-wrap">
                                                    {(isAdmin || isCS) && (
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMessageUser(user); }}
                                                            className="flex-1 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1.5 rounded text-xs font-bold transition"
                                                            title="إرسال رسالة"
                                                        >
                                                            ✉️ مراسلة
                                                        </button>
                                                    )}
                                                    {isAdminOrCanEdit && (
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => handleEditClick(user, e)}
                                                            className="flex-1 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1.5 rounded text-xs font-bold transition"
                                                        >
                                                            تعديل
                                                        </button>
                                                    )}
                                                    {isAdmin && (
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => handleDelete(user, e)}
                                                            className="flex-1 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2 py-1.5 rounded text-xs font-bold transition"
                                                        >
                                                            حذف
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl shrink-0">
                            <h3 className="text-xl font-bold text-gray-900">تعديل بيانات {selectedUser.name}</h3>
                            <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none">&times;</button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-300">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">الاسم</label>
                                <input 
                                    type="text" 
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">البريد الإلكتروني</label>
                                <input 
                                    type="email" 
                                    value={editEmail}
                                    onChange={e => setEditEmail(e.target.value)}
                                    className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                    dir="ltr"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">رقم الجوال</label>
                                <input 
                                    type="tel" 
                                    value={editPhone}
                                    onChange={e => setEditPhone(e.target.value)}
                                    className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                    dir="ltr"
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex gap-3 shrink-0">
                            <button 
                                onClick={handleEditSave}
                                disabled={saving}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition shadow-sm disabled:opacity-50"
                            >
                                {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
                            </button>
                            <button 
                                onClick={() => setSelectedUser(null)}
                                className="px-6 bg-white hover:bg-gray-100 text-gray-700 font-bold py-3 rounded-xl transition border border-gray-300"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Message Modal */}
            {messageUser && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl shrink-0">
                            <h3 className="text-lg font-bold text-blue-900">مراسلة {messageUser.name}</h3>
                            <button onClick={() => setMessageUser(null)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none">&times;</button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-300">
                            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-xs text-blue-800 font-medium">
                                سيتم إنشاء تذكرة جديدة باسم اللاعب تحتوي على رسالتك ليتمكن من الرد عليها.
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">تصنيف الرسالة</label>
                                <select 
                                    value={messageType}
                                    onChange={e => setMessageType(e.target.value)}
                                    className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-sm"
                                >
                                    <option value="inquiry">استفسار</option>
                                    <option value="suggestion">اقتراح</option>
                                    <option value="complaint">شکوى</option>
                                    <option value="other">رسالة (أخرى)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">محتوى الرسالة *</label>
                                <textarea 
                                    value={messageText}
                                    onChange={e => setMessageText(e.target.value)}
                                    rows={4}
                                    placeholder="اكتب رسالتك أو استفسارك هنا..."
                                    className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm resize-none"
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex gap-3 shrink-0">
                            <button 
                                onClick={handleSendTicket}
                                disabled={!messageText || sendingMessage}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <span>{sendingMessage ? "جاري الإرسال..." : "إرسال الرسالة"}</span>
                                {!sendingMessage && <span>✉️</span>}
                            </button>
                            <button 
                                onClick={() => setMessageUser(null)}
                                className="px-6 bg-white hover:bg-gray-100 text-gray-700 font-bold py-3 rounded-xl transition border border-gray-300"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Export Range Modal */}
            {showExportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
                    <button 
                    onClick={() => setShowExportModal(false)}
                    className="absolute top-4 left-4 text-gray-400 hover:text-gray-700 transition"
                    >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">تصدير تقرير الأعضاء</h2>
                    <p className="text-sm text-gray-500 mb-6 text-center">
                    يمكنك تحديد فترة زمنية لتصدير الأعضاء الذين تم تسجيلهم خلالها. اترك الحقول فارغة لتصدير الكل.
                    </p>

                    <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">من تاريخ</label>
                        <input 
                        type="date"
                        value={exportStartDate}
                        onChange={(e) => setExportStartDate(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-left"
                        dir="ltr"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">إلى تاريخ</label>
                        <input 
                        type="date"
                        value={exportEndDate}
                        onChange={(e) => setExportEndDate(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-left"
                        dir="ltr"
                        />
                    </div>
                    </div>

                    <div className="mt-8 flex gap-3">
                    <button 
                        onClick={handleDownloadExcel}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition shadow-md flex justify-center items-center gap-2"
                    >
                        <span>📥</span> تحميل التقرير
                    </button>
                    <button 
                        onClick={() => setShowExportModal(false)}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 rounded-xl transition"
                    >
                        إلغاء
                    </button>
                    </div>
                </div>
                </div>
            )}
        </div>
    );
}
