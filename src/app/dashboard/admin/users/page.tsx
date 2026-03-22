"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPut, apiDelete } from '@/lib/api';
import JudoLoader from '@/components/JudoLoader';

interface UserPermissions {
    can_manage_tickets_cs?: boolean;
    can_view_reports?: boolean;
    can_manage_users?: boolean;
    can_manage_settings?: boolean;
    can_edit_memberships?: boolean;
    [key: string]: boolean | undefined;
}

interface User {
    id: number;
    name: string;
    email: string;
    saj_id: string;
    role: string;
    phone_number: string;
    is_active: boolean;
    permissions: UserPermissions;
}

const ROLE_OPTIONS = [
    { value: 'player', label: 'لاعب الجودو (Player)' },
    { value: 'coach', label: 'مدرب اللاعبين (Coach)' },
    { value: 'tech_committee', label: 'اللجنة الفنية (Tech Committee)' },
    { value: 'customer_service', label: 'خدمة العملاء (CS)' },
    { value: 'regional_supervisor', label: 'مشرف منطقة (Supervisor)' },
    { value: 'committee_manager', label: 'مدير اللجنة (Committee Manager)' },
    { value: 'executive_director', label: 'المدير التنفيذي (CEO)' },
    { value: 'admin', label: 'مدير النظام (Admin)' },
];

export default function AdminUsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [regions, setRegions] = useState<{id: number, name_ar: string, name_en: string}[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    // Modal state for editing
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [editRole, setEditRole] = useState('');
    const [editPermissions, setEditPermissions] = useState<UserPermissions>({});
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [saving, setSaving] = useState(false);

    // Modal state for adding
    const [showAddModal, setShowAddModal] = useState(false);
    const [addData, setAddData] = useState({
        name_ar: '',
        email: '',
        phone_number: '',
        role: '',
        region: ''
    });

    // Check if current user is admin to hide certain elements
    const [isAdmin, setIsAdmin] = useState(false);
    useEffect(() => {
        const { getDjangoUser } = require('../../../../lib/api');
        const user = getDjangoUser();
        if (user && user.role === 'admin') setIsAdmin(true);
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [search]);

    useEffect(() => {
        const fetchRegions = async () => {
            try {
                const res = await apiGet('dropdowns/');
                if (res.ok) {
                    const data = await res.json();
                    if (data.region) setRegions(data.region);
                }
            } catch (err) {
                console.error("Failed to fetch regions", err);
            }
        };
        fetchRegions();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const query = search ? `&search=${encodeURIComponent(search)}` : '';
            // Only show staff in User Management page (exclude players and coaches)
            const res = await apiGet(`/admin/users/?exclude_roles=player,coach${query}`);
            if (res.ok) {
                const data = await res.json();
                if (data.results) {
                    setUsers(data.results);
                }
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (user: User) => {
        setSelectedUser(user);
        setEditRole(user.role);
        setEditPermissions(user.permissions || {});
        setEditName(user.name || '');
        setEditEmail(user.email || '');
        setEditPhone(user.phone_number || '');
    };

    const handlePermissionToggle = (key: string) => {
        setEditPermissions(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleSave = async () => {
        if (!selectedUser) return;
        setSaving(true);
        try {
            const res = await apiPut(`/admin/users/${selectedUser.id}/update/`, {
                role: editRole,
                permissions: editPermissions,
                name_ar: editName,
                email: editEmail,
                phone_number: editPhone
            });
            if (!res.ok) {
                 throw new Error("Failed to update");
            }
            // Refresh list and close modal
            fetchUsers();
            setSelectedUser(null);
        } catch (error) {
            console.error("Failed to update user", error);
            alert("حدث خطأ أثناء تحديث بيانات المستخدم.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (user: User) => {
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

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">إدارة المستخدمين والصلاحيات</h2>
                        <p className="text-gray-500">تحكم بمنصب كل مستخدم والصلاحيات الدقيقة الممنوحة له (لا يشمل اللاعبين والمدربين).</p>
                    </div>
                    {isAdmin && (
                    <button 
                        onClick={() => setShowAddModal(true)}
                        className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition"
                    >
                        <span>+</span>
                        إضافة مستخدم جديد
                    </button>
                    )}
                </div>

                {/* Search */}
                <div className="mb-6 relative">
                    <input 
                        type="text" 
                        placeholder="ابحث بالاسم، الإيميل، أو رقم SAJ..."
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
                                <th className="px-6 py-4">اللاعب / المستخدم</th>
                                <th className="px-6 py-4">رقم العضوية</th>
                                <th className="px-6 py-4">الإيميل</th>
                                <th className="px-6 py-4">المنصب (Role)</th>
                                <th className="px-6 py-4 text-center">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10"><JudoLoader className="mx-auto" /></td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">لا يوجد مستخدمين.</td>
                                </tr>
                            ) : users.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 font-bold text-gray-900">{user.name || "غير محدد"}</td>
                                    <td className="px-6 py-4 font-mono text-green-700">{user.saj_id || "-"}</td>
                                    <td className="px-6 py-4">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-50 text-blue-800'}`}>
                                            {ROLE_OPTIONS.find(r => r.value === user.role)?.label || user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button 
                                                onClick={() => handleEditClick(user)}
                                                className="text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1 rounded text-xs font-bold transition"
                                            >
                                                تعديل الصلاحيات
                                            </button>
                                            {isAdmin && (
                                            <button 
                                                onClick={() => handleDelete(user)}
                                                className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1 rounded text-xs font-bold transition"
                                            >
                                                حذف
                                            </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl shrink-0">
                            <h3 className="text-xl font-bold text-gray-900">إضافة مستخدم جديد (طاقم العمل)</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none">&times;</button>
                        </div>
                        
                        <div className="p-6 space-y-4 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-300">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">الاسم <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    value={addData.name_ar}
                                    onChange={e => setAddData({...addData, name_ar: e.target.value})}
                                    className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-green-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">البريد الإلكتروني <span className="text-red-500">*</span></label>
                                <input 
                                    type="email" 
                                    value={addData.email}
                                    onChange={e => setAddData({...addData, email: e.target.value})}
                                    className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-green-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">رقم الجوال</label>
                                <input 
                                    type="tel" 
                                    value={addData.phone_number}
                                    onChange={e => setAddData({...addData, phone_number: e.target.value})}
                                    className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-green-500"
                                    dir="ltr"
                                    placeholder="05xxxxxxxx"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">المنصب (Role) <span className="text-red-500">*</span></label>
                                <select 
                                    value={addData.role} 
                                    onChange={e => setAddData({...addData, role: e.target.value})}
                                    className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-green-500"
                                    required
                                >
                                    <option value="">-- اختر المنصب --</option>
                                    <option value="customer_service">خدمة العملاء (CS)</option>
                                    <option value="tech_committee">اللجنة الفنية (Tech Committee)</option>
                                    <option value="regional_supervisor">مشرف منطقة (Supervisor)</option>
                                    <option value="committee_manager">مدير اللجنة (Committee Manager)</option>
                                    <option value="executive_director">المدير التنفيذي (CEO)</option>
                                    {/* Exclude Admin - only manual DB intervention or Superuser should create admin */}
                                </select>
                            </div>
                            
                            {addData.role === 'regional_supervisor' && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">المناطق المشرف عليها <span className="text-red-500">*</span></label>
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 border border-gray-300 rounded-xl p-3 max-h-48 overflow-y-auto bg-white">
                                            {regions.length === 0 ? (
                                                <p className="col-span-full text-xs text-gray-400">لا توجد مناطق مضافة في إعدادات النظام</p>
                                            ) : (
                                                regions.map(rObj => rObj.name_ar).map(r => (
                                                <label key={r} className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                                                    <input 
                                                        type="checkbox"
                                                        value={r}
                                                        checked={addData.region ? addData.region.split(',').map((s: string) => s.trim()).includes(r) : false}
                                                        onChange={(e) => {
                                                            const current = addData.region ? addData.region.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
                                                            if (e.target.checked) {
                                                                setAddData({...addData, region: [...current, r].join(', ')});
                                                            } else {
                                                                setAddData({...addData, region: current.filter((x: string) => x !== r).join(', ')});
                                                            }
                                                        }}
                                                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                                    />
                                                    <span className="text-sm text-gray-700">{r}</span>
                                                </label>
                                            )))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex gap-3 shrink-0">
                            <button 
                                onClick={async () => {
                                    if (!addData.name_ar || !addData.email || !addData.role) {
                                        alert("يرجى تعبئة جميع الحقول المطلوبة.");
                                        return;
                                    }
                                    setSaving(true);
                                    try {
                                        const { apiPost } = require('../../../../lib/api');
                                        const res = await apiPost('/admin/staff/create/', addData);
                                        const data = await res.json();
                                        if (res.ok) {
                                            alert("تم إضافة المستخدم بنجاح.");
                                            setShowAddModal(false);
                                            setAddData({name_ar: '', email: '', phone_number: '', role: '', region: ''});
                                            fetchUsers();
                                        } else {
                                            alert(data.error || "حدث خطأ أثناء الإضافة.");
                                        }
                                    } catch(e) {
                                        alert("حدث خطأ في الاتصال.");
                                    } finally {
                                        setSaving(false);
                                    }
                                }}
                                disabled={saving}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition shadow-sm disabled:opacity-50"
                            >
                                {saving ? "جاري الإضافة..." : "حفظ المستخدم"}
                            </button>
                            <button 
                                onClick={() => setShowAddModal(false)}
                                className="px-6 bg-white hover:bg-gray-100 text-gray-700 font-bold py-3 rounded-xl transition border border-gray-300"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl shrink-0">
                            <h3 className="text-xl font-bold text-gray-900">
                                صلاحيات: <span className="text-green-700">{selectedUser.name || selectedUser.email}</span>
                            </h3>
                            <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none">&times;</button>
                        </div>
                        
                        <div className="p-6 space-y-6 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-300">
                            {/* Basic Info */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">البيانات الأساسية</label>
                                <div className="space-y-3">
                                    <input 
                                        type="text" 
                                        placeholder="الاسم"
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                    />
                                    <input 
                                        type="email" 
                                        placeholder="البريد الإلكتروني"
                                        value={editEmail}
                                        onChange={e => setEditEmail(e.target.value)}
                                        className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                    />
                                    <input 
                                        type="tel" 
                                        placeholder="رقم الجوال"
                                        dir="ltr"
                                        value={editPhone}
                                        onChange={e => setEditPhone(e.target.value)}
                                        className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                    />
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            {/* Role Select */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">المنصب الإداري الأساسي (Role)</label>
                                <select 
                                    value={editRole} 
                                    onChange={e => setEditRole(e.target.value)}
                                    className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                >
                                    {ROLE_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-2">تغيير المنصب سيؤثر على مسار التذاكر الخاص بهذا المستخدم.</p>
                            </div>

                            <hr className="border-gray-100" />

                            {/* Custom Permissions */}
                            {isAdmin && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-4">صلاحيات مخصصة (Custom Permissions)</label>
                                    
                                    <div className="space-y-6">
                                        {/* Category 1: Memberships */}
                                        <div className="bg-white border text-right border-gray-200 rounded-xl overflow-hidden">
                                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                                <h4 className="font-bold text-gray-800 text-sm">صلاحيات إدارة الأعضاء</h4>
                                            </div>
                                            <div className="p-4">
                                            <label className="flex items-start gap-3 cursor-pointer p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-5 h-5 text-green-600 rounded border-gray-300 focus:ring-green-500 mt-0.5"
                                                    checked={!!editPermissions.can_edit_memberships}
                                                    onChange={() => handlePermissionToggle('can_edit_memberships')}
                                                />
                                                <div>
                                                    <span className="block font-bold text-gray-800 text-sm">تعديل الأعضاء وإيقاف/تفعيل العضويات</span>
                                                    <span className="block text-xs text-gray-500 mt-1">يسمح بالتعديل المباشر على بيانات اللاعبين وإيقاف حساباتهم أو تفعيلها.</span>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Category 2: System & Reports */}
                                    <div className="bg-white text-right border border-gray-200 rounded-xl overflow-hidden">
                                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                            <h4 className="font-bold text-gray-800 text-sm">صلاحيات النظام والتذاكر</h4>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <label className="flex items-start gap-3 cursor-pointer p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-5 h-5 text-green-600 rounded border-gray-300 focus:ring-green-500 mt-0.5"
                                                    checked={!!editPermissions.can_manage_tickets_cs}
                                                    onChange={() => handlePermissionToggle('can_manage_tickets_cs')}
                                                />
                                                <div>
                                                    <span className="block font-bold text-gray-800 text-sm">استقبال وتوجيه التذاكر (خدمة العملاء)</span>
                                                    <span className="block text-xs text-gray-500 mt-1">يسمح برؤية التذاكر الموجهة لخدمة العملاء والرد عليها أو تحويلها.</span>
                                                </div>
                                            </label>

                                            <label className="flex items-start gap-3 cursor-pointer p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-5 h-5 text-green-600 rounded border-gray-300 focus:ring-green-500 mt-0.5"
                                                    checked={!!editPermissions.can_view_reports}
                                                    onChange={() => handlePermissionToggle('can_view_reports')}
                                                />
                                                <div>
                                                    <span className="block font-bold text-gray-800 text-sm">عرض وتحميل التقارير والإحصائيات</span>
                                                    <span className="block text-xs text-gray-500 mt-1">يسمح بالدخول لصفحة الإحصائيات الشاملة وتحميل تقارير الإكسل.</span>
                                                </div>
                                            </label>

                                            <label className="flex items-start gap-3 cursor-pointer p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-5 h-5 text-green-600 rounded border-gray-300 focus:ring-green-500 mt-0.5"
                                                    checked={!!editPermissions.can_manage_settings}
                                                    onChange={() => handlePermissionToggle('can_manage_settings')}
                                                />
                                                <div>
                                                    <span className="block font-bold text-gray-800 text-sm">إدارة إعدادات النظام (الأحزمة، المدد الزمنية)</span>
                                                    <span className="block text-xs text-gray-500 mt-1">يسمح بتعديل أسعار ورسوم الأحزمة وفترات الترقية المطلوبة.</span>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex gap-3 shrink-0">
                            <button 
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-green-900/20 disabled:opacity-50"
                            >
                                {saving ? "جاري الحفظ..." : "حفظ الصلاحيات"}
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
        </div>
    );
}
