import { Button } from '@/src/design-system';
import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { mutate } from 'swr';
import { usersRepo } from '@/src/data/repositories';
import { SWR_SYSTEM_RESOURCES_KEY } from '@/src/hooks/useSharedFields';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function UserCreateModal({ onClose, onSuccess }: Props) {
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newRole, setNewRole] = useState<'Chuyên viên' | 'Ban Giám Đốc' | 'Administrator'>('Chuyên viên');
  const [newError, setNewError] = useState('');

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewError('');

    const pristineUsername = newUsername.trim().toLowerCase();
    if (!pristineUsername || !newPassword || !newDisplayName.trim() || !newDepartment.trim() || !newPosition.trim()) {
      setNewError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    if (pristineUsername.length < 3) {
      setNewError('Tên đăng nhập phải dài ít nhất 3 ký tự.');
      return;
    }

    if (!/^[a-z0-9_.]+$/.test(pristineUsername)) {
      setNewError('Tên đăng nhập chỉ chứa chữ thường không dấu, số, dấu gạch dưới hoặc dấu chấm.');
      return;
    }

    if (newPassword.length < 4) {
      setNewError('Mật khẩu phải dài ít nhất 4 ký tự.');
      return;
    }

    try {
      const targetSnap = await usersRepo.getUser(pristineUsername);

      if (targetSnap) {
        setNewError('Tên đăng nhập đã tồn tại trong hệ thống. Vui lòng chọn tên khác.');
        return;
      }

      await usersRepo.setUser(pristineUsername, {
        username: pristineUsername,
        password: newPassword,
        displayName: newDisplayName.trim(),
        department: newDepartment.trim(),
        position: newPosition.trim(),
        role: newRole,
        createdAt: new Date().toISOString()
      }, false);

      mutate(SWR_SYSTEM_RESOURCES_KEY);
      onSuccess();
    } catch (err) {
      console.error('Error creating user account:', err);
      setNewError('Đã có lỗi xảy ra khi tạo tài khoản.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs transition-opacity [animation-duration:150ms]">
      <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 w-full max-w-lg relative animate-in zoom-in-95 duration-150">
        <h3 className="text-lg font-bold text-slate-900 leading-tight flex items-center gap-2 mb-1.5">
          <UserPlus className="text-blue-600" size={20} />
          Thêm tài khoản người dùng mới
        </h3>
        <p className="text-sm text-slate-500 mb-5">
          Cấp quyền truy cập hệ thống CRM/ERP SGM cho nhân sự/phòng ban.
        </p>

        <form onSubmit={handleCreateAccount} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-705 uppercase tracking-wider mb-1">Tên đăng nhập *</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="ví dụ: hung.nm"
                className="w-full h-10 px-3 border border-slate-200 bg-slate-50 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-705 uppercase tracking-wider mb-1">Mật khẩu ban đầu *</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="tối thiểu 4 ký tự"
                className="w-full h-10 px-3 border border-slate-200 bg-slate-50 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-705 uppercase tracking-wider mb-1">Họ & Tên *</label>
            <input
              type="text"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Mạnh Hùng"
              className="w-full h-10 px-3 border border-slate-200 bg-slate-50 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-705 uppercase tracking-wider mb-1">Phòng ban *</label>
              <input
                type="text"
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                placeholder="Kinh doanh / Ban Giám Đốc..."
                className="w-full h-10 px-3 border border-slate-200 bg-slate-50 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-705 uppercase tracking-wider mb-1">Vị trí chức vụ *</label>
              <input
                type="text"
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value)}
                placeholder="Chuyên viên / Giám đốc..."
                className="w-full h-10 px-3 border border-slate-200 bg-slate-50 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-705 uppercase tracking-wider mb-1.5">Phân vai trò hệ thống *</label>
            <div className="grid grid-cols-3 gap-2.5">
              {(['Chuyên viên', 'Ban Giám Đốc', 'Administrator'] as const).map((r) => (
                <Button
                  key={r}
                  type="button"
                  variant="ghost"
                  onClick={() => setNewRole(r)}
                  className={`h-11 px-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex flex-col justify-center items-center ${
                    newRole === r
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm shadow-blue-50'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span>{r}</span>
                </Button>
              ))}
            </div>
          </div>

          {newError && (
            <div className="text-xs font-semibold text-red-650 bg-red-50 border border-red-100 px-3 py-2.5 rounded-lg leading-snug">
              {newError}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="h-10 px-4 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Huỷ bỏ
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-100 cursor-pointer"
            >
              Tạo người dùng
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
