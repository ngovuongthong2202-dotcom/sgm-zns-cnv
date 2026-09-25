import { Button } from '@/src/design-system';
import React, { useState, useEffect } from 'react';
import { UserCheck, Check } from 'lucide-react';

interface Props {
  currentUser: any;
  userData: any;
  updateUserData: (data: any) => Promise<void>;
}

export function UserProfileCard({ currentUser, userData, updateUserData }: Props) {
  const [myDisplayName, setMyDisplayName] = useState('');
  const [myDepartment, setMyDepartment] = useState('');
  const [myPosition, setMyPosition] = useState('');
  const [myProfileSuccess, setMyProfileSuccess] = useState('');
  const [myProfileError, setMyProfileError] = useState('');

  useEffect(() => {
    if (userData) {
      setMyDisplayName(userData.displayName || '');
      setMyDepartment(userData.department || '');
      setMyPosition(userData.position || '');
    }
  }, [userData]);

  const handleUpdateMyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMyProfileError('');
    setMyProfileSuccess('');

    if (!myDisplayName.trim() || !myDepartment.trim() || !myPosition.trim()) {
      setMyProfileError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    try {
      await updateUserData({
        displayName: myDisplayName.trim(),
        department: myDepartment.trim(),
        position: myPosition.trim()
      });
      setMyProfileSuccess('Cập nhật hồ sơ cá nhân thành công!');
      setTimeout(() => {
        setMyProfileSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Error updating personal profile info:', err);
      setMyProfileError('Lỗi hệ thống khi cập nhật thông tin.');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-100 bg-slate-50/50">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <UserCheck size={16} className="text-blue-600" />
          Hồ sơ cá nhân
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Xem và cập nhật thông tin họ tên, bộ phận hay vị trí làm việc của bạn.
        </p>
      </div>

      <form onSubmit={handleUpdateMyProfile} className="p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Tên đăng nhập (Username)</label>
          <input
            type="text"
            value={currentUser?.username || currentUser?.uid || ''}
            disabled
            className="w-full h-10 px-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium text-slate-500 cursor-not-allowed outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Họ & Tên *</label>
          <input
            type="text"
            value={myDisplayName}
            onChange={(e) => setMyDisplayName(e.target.value)}
            placeholder="Nhập họ và tên đầy đủ"
            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Bộ phận / Phòng ban *</label>
          <input
            type="text"
            value={myDepartment}
            onChange={(e) => setMyDepartment(e.target.value)}
            placeholder="Ví dụ: Kinh doanh, Kỹ thuật..."
            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Vị trí / Chức vụ *</label>
          <input
            type="text"
            value={myPosition}
            onChange={(e) => setMyPosition(e.target.value)}
            placeholder="Ví dụ: Trưởng nhóm, Chuyên viên..."
            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {myProfileError && (
          <div className="text-xs font-semibold text-red-650 bg-red-50 border border-red-100 px-3 py-2.5 rounded-lg leading-snug">
            {myProfileError}
          </div>
        )}

        {myProfileSuccess && (
          <div className="text-xs font-semibold text-emerald-750 bg-emerald-50 border border-emerald-100 px-3 py-2.5 rounded-lg leading-snug flex items-center gap-1.5 animate-pulse">
            <Check size={14} className="text-emerald-600" />
            {myProfileSuccess}
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer hover:shadow"
         variant="accent" size="sm">
          Cập nhật thông tin
        </Button>
      </form>
    </div>
  );
}
