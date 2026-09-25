import { Button } from '@/src/design-system';
import React, { useState } from 'react';
import { Lock, Check } from 'lucide-react';
import { usersRepo } from '@/src/data/repositories';

interface Props {
  user: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function UserPasswordResetModal({ user, onClose, onSuccess }: Props) {
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');

  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccessMsg('');

    if (!resetNewPassword || !resetConfirmPassword) {
      setResetError('Vui lòng nhập mật khẩu mới và xác nhận.');
      return;
    }

    if (resetNewPassword.length < 4) {
      setResetError('Mật khẩu mới phải có tối thiểu 4 ký tự.');
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setResetError('Mật khẩu nhập lại không khớp.');
      return;
    }

    try {
      await usersRepo.setUser(user.username, { password: resetNewPassword });
      
      setResetSuccessMsg(`Đặt lại mật khẩu cho tài khoản "${user.username}" thành công!`);
      setResetNewPassword('');
      setResetConfirmPassword('');
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      console.error('Reset password error:', err);
      setResetError('Lỗi hệ thống khi lưu mật khẩu mới.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs transition-opacity [animation-duration:150ms]">
      <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 w-full max-w-md relative animate-in zoom-in-95 duration-150">
        <h3 className="text-md font-bold text-slate-900 leading-tight flex items-center gap-2 mb-1.5">
          <Lock className="text-red-500" size={16} />
          Quản trị viên đặt lại mật khẩu
        </h3>
        <p className="text-sm text-slate-500 mb-5">
          Bạn đang thiết lập mật khẩu mới cho tài khoản: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-slate-800">{user.username}</code> ({user.displayName})
        </p>

        <form onSubmit={handleAdminResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-705 uppercase tracking-wider mb-1">Mật khẩu mới *</label>
            <input
              type="password"
              value={resetNewPassword}
              onChange={(e) => setResetNewPassword(e.target.value)}
              placeholder="Điền mật khẩu mới (tối thiểu 4 ký tự)"
              className="w-full h-10 px-3 border border-slate-200 bg-slate-50 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-705 uppercase tracking-wider mb-1">Xác nhận mật khẩu *</label>
            <input
              type="password"
              value={resetConfirmPassword}
              onChange={(e) => setResetConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              className="w-full h-10 px-3 border border-slate-200 bg-slate-50 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all"
            />
          </div>

          {resetError && (
            <div className="text-xs font-semibold text-red-650 bg-red-50 border border-red-100 px-3 py-2.5 rounded-lg leading-snug">
              {resetError}
            </div>
          )}

          {resetSuccessMsg && (
            <div className="text-xs font-semibold text-emerald-750 bg-emerald-50 border border-emerald-100 px-3 py-2.5 rounded-lg leading-snug flex items-center gap-1.5">
              <Check size={14} className="text-emerald-600" />
              {resetSuccessMsg}
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
              className="h-10 px-5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer border border-red-700"
            >
              Xác nhận lưu
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
