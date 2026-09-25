import { Button } from '@/src/design-system';
import React, { useState, useEffect } from 'react';
import { mutate } from 'swr';
import { useAuth } from '@/src/modules/iam';
import { Shield, UserCheck, Trash2, Lock, UserPlus, RefreshCw } from 'lucide-react';
import { UserProfileCard } from '../components/UserProfileCard';
import { UserPasswordChangeCard } from '../components/UserPasswordChangeCard';
import { UserCreateModal } from '../components/UserCreateModal';
import { UserPasswordResetModal } from '../components/UserPasswordResetModal';
import { t } from '@/src/i18n/vi';
import { usersRepo, UserAccount } from '@/src/data/repositories';
import { SWR_SYSTEM_RESOURCES_KEY } from '@/src/hooks/useSharedFields';

export default function UsersPage() {
  const { user: currentUser, userData, updateUserData } = useAuth();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // States for account creation modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // States for resetting password modal
  const [resetTargetUser, setResetTargetUser] = useState<UserAccount | null>(null);

  // Realtime subscription to userAccounts collection
  useEffect(() => {
    let isMounted = true;
    const unsub = usersRepo.subscribeAll((dataList) => {
      if (isMounted) {
        setUsers(dataList);
        setLoading(false);
      }
    }, (error) => {
      console.error('Error fetching user accounts:', error);
      if (isMounted) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  // Delete user account
  const handleDeleteUser = async (userAcc: UserAccount) => {
    if (userAcc.username === 'admin') {
      alert('Không thể xoá tài khoản Administrator mặc định!');
      return;
    }

    if (currentUser && userAcc.username === currentUser.uid) {
      alert('Bạn không thể tự xoá tài khoản đang đăng nhập của mình!');
      return;
    }

    if (window.confirm(`Bạn có chắc chắn muốn xoá vĩnh viễn tài khoản "${userAcc.username}" (${userAcc.displayName})?`)) {
      try {
        await usersRepo.deleteUser(userAcc.username);
        mutate(SWR_SYSTEM_RESOURCES_KEY);
      } catch (err) {
        console.error('Error deleting user:', err);
        alert('Có lỗi xảy ra khi xoá người dùng.');
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Người dùng & Phân quyền</h2>
          <p className="text-sm text-slate-500 mt-1">
            Quản trị viên hệ thống. Tạo tài khoản, gán phân quyền phòng ban và cấu hình bảo mật.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-all shadow-sm shadow-blue-100 hover:shadow-md cursor-pointer"
        >
          <UserPlus size={16} />
          Tạo tài khoản mới
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Account List (Left & center) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <span className="font-semibold text-slate-800 text-sm">Danh sách tài khoản hệ thống</span>
              <span className="bg-slate-200 text-slate-700 text-xs px-2.5 py-1 rounded-full font-bold">
                {users.length} tài khoản
              </span>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left max-w-full">
                <thead className="bg-slate-50 border-b border-slate-200 text-2xs uppercase text-slate-500 font-bold tracking-wider">
                  <tr>
                    <th className="px-5 py-3 whitespace-nowrap">Tài khoản (Username)</th>
                    <th className="px-5 py-3 whitespace-nowrap">Thông vị trí cá nhân</th>
                    <th className="px-5 py-3 whitespace-nowrap">Vai trò (Quyền)</th>
                    <th className="px-5 py-3 whitespace-nowrap text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm leading-relaxed">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 font-medium">
                        <RefreshCw className="animate-spin inline mr-2" size={16} /> Đang tải dữ liệu...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 italic">
                        {t('empty.noUsers')}
                      </td>
                    </tr>
                  ) : (
                    users.map((acc) => (
                      <tr key={acc.username} className="hover:bg-slate-50/70 transition-colors group">
                        <td className="px-5 py-3.5">
                          <div className="font-mono font-bold text-slate-800">{acc.username}</div>
                          <div className="text-xs text-slate-400 mt-0.5">Tạo ngày {acc.createdAt ? new Date(acc.createdAt).toLocaleDateString('vi-VN') : 'Kế thừa'}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-900">{acc.displayName}</div>
                          <div className="text-xs text-slate-500 mt-0.5 flex gap-2">
                            <span className="font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{acc.department}</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-550 italic">{acc.position}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {acc.role === 'Administrator' ? (
                            <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-bold uppercase tracking-wider flex items-center w-fit gap-1 border border-red-100">
                              <Shield size={12} strokeWidth={2.5}/> {acc.role}
                            </span>
                          ) : acc.role === 'Ban Giám Đốc' ? (
                            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-wider flex items-center w-fit gap-1 border border-amber-100">
                              <Shield size={12} strokeWidth={2.5}/> {acc.role}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider flex items-center w-fit gap-1 border border-blue-100">
                              <UserCheck size={12} strokeWidth={2.5}/> {acc.role}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              variant="secondary"
                              size="sm"
                              iconOnly
                              onClick={() => {
                                setResetTargetUser(acc);
                              }}
                              title="Đặt lại mật khẩu"
                              className="w-7 h-7 p-0 rounded-lg text-slate-600 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-100 transition-colors cursor-pointer"
                              aria-label="Reset password"
                            >
                              <Lock size={13} />
                            </Button>
                            {acc.username !== 'admin' && (
                              <Button
                                variant="danger"
                                size="sm"
                                iconOnly
                                onClick={() => handleDeleteUser(acc)}
                                title="Xoá tài khoản"
                                className="w-7 h-7 p-0 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors cursor-pointer"
                                aria-label="Xoá tài khoản"
                              >
                                <Trash2 size={13} />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right sidebar: Profile & Password Control */}
        <div className="lg:col-span-1 space-y-6">
          <UserProfileCard 
             currentUser={currentUser} 
             userData={userData} 
             updateUserData={updateUserData} 
          />
          <UserPasswordChangeCard 
             currentUser={currentUser} 
          />
        </div>
      </div>

      {isNewModalOpen && (
        <UserCreateModal 
          onClose={() => setIsNewModalOpen(false)} 
          onSuccess={() => setIsNewModalOpen(false)} 
        />
      )}

      {resetTargetUser && (
        <UserPasswordResetModal 
          user={resetTargetUser} 
          onClose={() => setResetTargetUser(null)} 
          onSuccess={() => setResetTargetUser(null)} 
        />
      )}
    </div>
  );
}
