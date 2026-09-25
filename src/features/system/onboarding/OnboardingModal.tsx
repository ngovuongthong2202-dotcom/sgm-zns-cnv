import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from '@/src/modules/iam';
import {
  PartyPopper,
  Users,
  Database,
  ArrowRight,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from '@/src/design-system/Button';

export function OnboardingModal() {
  const { userData, updateUserData } = useAuth();
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  // If already onboarded or data not loaded, don't show
  if (!userData || userData.onboarded !== false) return null;

  const handleFinish = async () => {
    await updateUserData({ onboarded: true });
  };

  const handleCreateCustomer = async () => {
    await handleFinish();
    navigate("/customers");
    // We could emit an event like 'open-new-customer' here, but navigating is a good start.
    setTimeout(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "n" }));
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col relative"
      >
        <div className="p-8 sm:p-12">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center text-center space-y-6"
              >
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center">
                  <PartyPopper className="w-10 h-10 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-3xl font-display font-bold text-slate-900 mb-4">
                    Chào mừng đến với SGM OS
                  </h2>
                  <p className="text-slate-600 text-lg max-w-md mx-auto leading-relaxed">
                    Hệ sinh thái quản trị tinh gọn. Quản lý Khách hàng, Báo giá, 
                    Hợp đồng, Thanh toán & Giao nhận tập trung tại một nơi, kết hợp gửi tin Zalo ZNS tự động.
                  </p>
                </div>
                <Button aria-label="Bắt đầu thiết lập"
                  onClick={() => setStep(2)}
                  className="mt-8 px-8 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center gap-2"
                >
                  Bắt đầu thiết lập <ArrowRight size={20} />
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col space-y-8"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">
                    Bạn muốn bắt đầu với?
                  </h2>
                  <p className="text-slate-500">
                    Tạo dữ liệu đầu tiên để trải nghiệm hệ thống
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Button aria-label="Tạo khách hàng đầu tiên"
                    onClick={handleCreateCustomer}
                    className="p-6 border-2 border-blue-100 bg-blue-50/50 rounded-2xl text-left hover:border-blue-500 hover:bg-blue-50 transition-all group"
                  >
                    <Users className="w-8 h-8 text-blue-600 mb-4 group-hover:scale-110 transition-transform" />
                    <h3 className="font-bold text-slate-900 mb-1">
                      Tạo khách hàng đầu tiên
                    </h3>
                    <p className="text-sm text-slate-600">
                      Nhập thông tin khách hàng thủ công
                    </p>
                  </Button>

                  <Button aria-label="Import dữ liệu"
                    onClick={() => {
                      setStep(3);
                    }}
                    className="p-6 border-2 border-slate-200 bg-slate-50 rounded-2xl text-left hover:border-slate-300 hover:bg-slate-100 transition-all group"
                  >
                    <Database className="w-8 h-8 text-slate-600 mb-4 group-hover:scale-110 transition-transform" />
                    <h3 className="font-bold text-slate-900 mb-1">
                      Import dữ liệu mẫu
                    </h3>
                    <p className="text-sm text-slate-600">
                      Tải 5 khách hàng mẫu để dùng thử
                    </p>
                  </Button>
                </div>

                <div className="flex justify-center pt-4">
                  <Button aria-label="Nút bấm"
                    onClick={() => setStep(3)}
                    className="text-slate-500 hover:text-slate-800 font-medium"
                  >
                    Khám phá trước →
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col space-y-8"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-[#0088cc]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <MessageSquare className="w-8 h-8 text-[#0088cc]" />
                  </div>
                  <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">
                    Nhận báo cáo qua Telegram?
                  </h2>
                  <p className="text-slate-500">
                    Hệ thống có thể gửi thông báo tự động mỗi ngày vào nhóm của
                    bạn.
                  </p>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-4">
                    Các bước thiết lập:
                  </h4>
                  <ol className="space-y-3 text-sm text-slate-600 list-decimal list-inside marker:text-slate-400 font-medium">
                    <li>
                      Tìm <b>@BotFather</b> trên Telegram để tạo bot.
                    </li>
                    <li>
                      Lấy <b>Bot Token</b> dán vào màn hình Cài đặt.
                    </li>
                    <li>
                      Lấy <b>Chat ID</b> của nhóm bạn muốn nhận tin.
                    </li>
                  </ol>
                </div>

                <div className="flex justify-between items-center pt-4">
                  <Button aria-label="Nút bấm"
                    onClick={() => setStep(4)}
                    className="px-6 py-3 text-slate-500 hover:text-slate-800 font-medium"
                  >
                    Bỏ qua bây giờ
                  </Button>
                  <Button aria-label="Nút bấm"
                    onClick={() => {
                      handleFinish();
                      navigate("/settings");
                    }}
                    className="px-8 py-3 bg-[#0088cc] text-white rounded-xl font-bold hover:bg-[#0088cc]/90 transition-colors"
                  >
                    Cài đặt Telegram
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center text-center space-y-6"
              >
                <CheckCircle2 className="w-20 h-20 text-emerald-700" />
                <div>
                  <h2 className="text-3xl font-display font-bold text-slate-900 mb-2">
                    Bạn đã sẵn sàng!
                  </h2>
                  <p className="text-slate-600 text-lg">
                    Bấm phím{" "}
                    <kbd className="font-mono bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-sm text-slate-700">
                      ?
                    </kbd>{" "}
                    bất kỳ lúc nào để xem hướng dẫn phím tắt.
                  </p>
                </div>
                <Button aria-label="Bắt đầu làm việc"
                  onClick={handleFinish}
                  className="mt-8 px-10 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors text-lg"
                >
                  Bắt đầu làm việc
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress dots */}
        <div className="bg-slate-50 py-4 flex justify-center gap-2 border-t border-slate-100">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${i === step ? "bg-blue-600 w-6" : "bg-slate-300"}`}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
