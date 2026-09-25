import { Button } from '@/src/design-system';
import React, { useState } from 'react';
import { Key, Check } from 'lucide-react';
import { usersRepo } from '@/src/data/repositories';

interface Props {
  currentUser: any;
}

export function UserPasswordChangeCard({ currentUser }: Props) {
  const [myOldPassword, setMyOldPassword] = useState('');
  const [myNewPassword, setMyNewPassword] = useState('');
  const [myConfirmPassword, setMyConfirmPassword] = useState('');
  const [myError, setMyError] = useState('');
  const [mySuccess, setMySuccess] = useState('');

  const handleMyChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMyError('');
    setMySuccess('');

    if (!currentUser) return;
    if (!myOldPassword || !myNewPassword || !myConfirmPassword) {
      setMyError('Vui lòng nhập đầy đủ thông tin để đổi mật khẩu.');
      return;
    }
    if (myNewPassword.length < 4) {
      setMyError('Mật khẩu mới phải có tối thiểu 4 ký tự.');
      return;
    }
    if (myNewPassword !== myConfirmPassword) {
      setMyError('Mật khẩu xác nhận không khớp.');
      return;
    }

    try {
      const userSnap = await usersRepo.getUser(currentUser.uid);
      if (userSnap) {
        const actualOld = userSnap.password;
        if (actualOld !== myOldPassword) {
          setMyError('Mật khẩu hiện tại không chính xác.');
          return;
        }

        // Update password
        await usersRepo.setUser(currentUser.uid, { password: myNewPassword });
        setMySuccess('Đổi mật khẩu thành công!');
        setMyOldPassword('');
        setMyNewPassword('');
        setMyConfirmPassword('');
        setTimeout(() => {
           setMySuccess('');
        }, 3000);
      } else {
        setMyError('Không tìm thấy bản ghi người dùng trên hệ thống.');
      }
    } catch (err) {
      console.error('Error changing password:', err);
      setMyError('Đã xảy ra lỗi khi lưu mật khẩu.');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-100 bg-slate-50/50">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <Key size={16} className="text-blue-600" />
          Thay đổi mật khẩu cá nhân
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Tự bảo vệ tài khoản bằng mật khẩu bảo mật riêng của bạn.
        </p>
      </div>

      <form onSubmit={handleMyChangePassword} className="p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Mật khẩu hiện tại</label>
          <input
            type="password"
            value={myOldPassword}
            onChange={(e) => setMyOldPassword(e.target.value)}
            placeholder="Nhập mật khẩu đang dùng"
            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Mật khẩu mới</label>
          <input
            type="password"
            value={myNewPassword}
            onChange={(e) => setMyNewPassword(e.target.value)}
            placeholder="Mật khẩu tối thiểu 4 ký tự"
            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Nhập lại mật khẩu mới</label>
          <input
            type="password"
            value={myConfirmPassword}
            onChange={(e) => setMyConfirmPassword(e.target.value)}
            placeholder="Nhập lại mật khẩu để xác nhận"
            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {myError && (
          <div className="text-xs font-semibold text-red-650 bg-red-50 border border-red-100 px-3 py-2.5 rounded-lg leading-snug">
            {myError}
          </div>
        )}

        {mySuccess && (
          <div className="text-xs font-semibold text-emerald-750 bg-emerald-50 border border-emerald-100 px-3 py-2.5 rounded-lg leading-snug flex items-center gap-1.5">
            <Check size={14} className="text-emerald-600" />
            {mySuccess}
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-10 bg-slate-900 hover:bg-slate-850 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
         variant="primary" size="sm">
          Cập nhật mật khẩu
        </Button>
      </form>
    </div>
  );
}
